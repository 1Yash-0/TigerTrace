"""
TigerTrace Stress Test — /api/identify resilience benchmark.

Measures the failure modes seen on Render (512MB free tier):
  1. Cold-start latency: first /api/identify after boot (model import + load)
  2. Event-loop blocking: /health probe latency WHILE identify is running
  3. Memory footprint: RSS of the uvicorn process across the run
  4. Connection failures: resets/timeouts ("fetch failed" on the frontend)

Usage:
    python stress_test.py --url http://127.0.0.1:8000 --pid <UVICORN_PID> --image data/atrw/detection/test/0001.jpg
"""
import argparse
import statistics
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx
import psutil

PROBE_INTERVAL = 0.2


class LivenessProbe(threading.Thread):
    """Continuously GET /health and record probe latencies to detect a frozen event loop."""

    def __init__(self, base_url: str):
        super().__init__(daemon=True)
        self.base_url = base_url
        self.stop_flag = threading.Event()
        self.latencies: list[float] = []
        self.errors = 0
        self._client = httpx.Client(timeout=30.0)

    def run(self):
        while not self.stop_flag.is_set():
            t0 = time.perf_counter()
            try:
                r = self._client.get(f"{self.base_url}/health")
                if r.status_code == 200:
                    self.latencies.append(time.perf_counter() - t0)
                else:
                    self.errors += 1
            except Exception:
                self.errors += 1
            self.stop_flag.wait(PROBE_INTERVAL)

    def stop(self):
        self.stop_flag.set()
        self.join(timeout=5)
        self._client.close()

    def snapshot(self):
        lat = self.latencies
        return {
            "samples": len(lat),
            "errors": self.errors,
            "p50_ms": round(statistics.median(lat) * 1000, 1) if lat else None,
            "max_ms": round(max(lat) * 1000, 1) if lat else None,
        }


def upload_once(client: httpx.Client, url: str, image_path: str) -> tuple[bool, float, str]:
    """One /api/identify upload. Returns (ok, latency_s, detail)."""
    t0 = time.perf_counter()
    try:
        with open(image_path, "rb") as f:
            files = {"file": ("stress_tiger.jpg", f, "image/jpeg")}
            r = client.post(f"{url}/api/identify", files=files, timeout=120.0)
        lat = time.perf_counter() - t0
        if r.status_code == 200:
            body = r.json()
            return True, lat, body.get("status", "?")
        return False, lat, f"HTTP {r.status_code}: {r.text[:120]}"
    except Exception as e:
        return False, time.perf_counter() - t0, f"{type(e).__name__}: {e}"


def run_phase(name: str, client: httpx.Client, url: str, image: str, n: int, workers: int):
    print(f"\n── {name} ({n} requests, {workers} workers) " + "─" * 30)
    results = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(upload_once, client, url, image) for _ in range(n)]
        for fut in as_completed(futures):
            results.append(fut.result())

    ok = [r for r in results if r[0]]
    fail = [r for r in results if not r[0]]
    lats = sorted(r[1] for r in results)

    def pct(p):
        return round(lats[min(int(len(lats) * p), len(lats) - 1)], 2) if lats else None

    statuses = {}
    for r in ok:
        statuses[r[2]] = statuses.get(r[2], 0) + 1

    print(f"   success {len(ok)}/{n}   latency p50={pct(0.5)}s  p95={pct(0.95)}s  max={lats[-1] if lats else None}s")
    if statuses:
        print(f"   match statuses: {statuses}")
    for r in fail[:5]:
        print(f"   FAIL ({r[1]:.1f}s): {r[2]}")
    return results


def mem_mb(proc: psutil.Process):
    try:
        return round(proc.memory_info().rss / 1024 / 1024, 1)
    except psutil.Error:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    ap.add_argument("--pid", type=int, required=True, help="uvicorn process id")
    ap.add_argument("--image", default="../data/atrw/detection/test/0001.jpg")
    ap.add_argument("--skip-concurrent", action="store_true")
    args = ap.parse_args()

    proc = psutil.Process(args.pid)
    probe = LivenessProbe(args.url)
    client = httpx.Client(timeout=120.0)

    print("=" * 78)
    print(f"TIGERTRACE STRESS TEST  →  {args.url}")
    print(f"uvicorn pid={args.pid}   image={args.image}")
    print("=" * 78)

    # Baseline: server idle
    probe.start()
    time.sleep(2)
    rss0 = mem_mb(proc)
    base = probe.snapshot()
    print(f"\n[baseline] RSS={rss0}MB   health p50={base['p50_ms']}ms max={base['max_ms']}ms errors={base['errors']}")

    # Phase 1 — cold single upload (first request triggers model import/load)
    run_phase("PHASE 1 cold-start identify", client, args.url, args.image, 1, 1)
    rss1 = mem_mb(proc)
    p1 = probe.snapshot()
    print(f"   [mem] RSS {rss0}MB → {rss1}MB  (Δ{round(rss1 - rss0, 1)}MB)")
    print(f"   [health during load] p50={p1['p50_ms']}ms  max={p1['max_ms']}ms  errors={p1['errors']}")

    # Phase 2 — warm sequential
    run_phase("PHASE 2 warm sequential x8", client, args.url, args.image, 8, 1)

    # Phase 3 — concurrent burst (what kills a single blocked worker)
    if not args.skip_concurrent:
        run_phase("PHASE 3 concurrent burst x10", client, args.url, args.image, 10, 10)

    # Phase 4 — mixed load: identify burst + liveness (already probing throughout)
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(upload_once, client, args.url, args.image) for _ in range(6)]
        mixed = [f.result() for f in as_completed(futures)]
    ok_m = sum(1 for m in mixed if m[0])
    print(f"\n── PHASE 4 mixed load x6 ──────────────────────────────")
    print(f"   success {ok_m}/6  max_latency={max(m[1] for m in mixed):.2f}s")

    time.sleep(1)
    rss_end = mem_mb(proc)
    final = probe.snapshot()
    probe.stop()
    client.close()

    print("\n" + "=" * 78)
    print("VERDICT")
    print("=" * 78)
    print(f"  memory:            {rss0}MB idle → peak/end {rss_end}MB  (Render free tier budget: 512MB)")
    print(f"  health worst case: {final['max_ms']}ms  (blocked event loop shows >1000ms)")
    print(f"  health errors:     {final['errors']}  (>0 means service was unreachable — 'fetch failed')")
    peak = max(l for l in probe.latencies) if probe.latencies else 0
    if peak > 1.0:
        print("  ⚠ EVENT LOOP BLOCKED: /health took >1s during inference — every endpoint froze")
    if rss_end and rss_end > 450:
        print("  ⚠ MEMORY: RSS near/above 512MB — OOM kill risk on Render free tier")
    if final["errors"] > 0:
        print("  ⚕ UNREACHABLE: liveness probes failed — this is the 'fetch failed / pipeline destroyed' symptom")
    return 0


if __name__ == "__main__":
    sys.exit(main())
