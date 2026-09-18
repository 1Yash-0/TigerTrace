"""
Gallery verification: closed-set self-retrieval on HELD-OUT captures.

For every tiger whose capture count exceeds the 8 used for centroid building,
the remaining captures are embedded with tigertrace_ptr_v2_side_aware.onnx and
queried against the SQLite gallery exactly the way the API does it
(flank-routed cosine via services.identification_service.gallery_best_cosines).

A correct integration scores high top-1 accuracy on same-flank queries; a
gallery built from the wrong model, wrong preprocessing, or fake vectors
collapses to chance.

Usage:
    python scripts/verify_gallery.py [--max-per-tiger 3]
"""
import json
import os
import sys
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

MAX_CENTROID_IMAGES = 8  # must mirror scripts/reembed_all_tigers.py


def resolve_capture_path(rel_path: str):
    rel = rel_path.replace("real-images/", "")
    candidates = [
        PROJECT_ROOT / "data" / "PTR_Tiger_IDs_2025" / rel,
        PROJECT_ROOT / "data" / "PTR_Tiger_IDs_2025" / "PTR_Tiger_IDs_2025" / rel,
        BACKEND_DIR / rel_path,
        PROJECT_ROOT / rel_path,
    ]
    return next((c for c in candidates if c.exists()), None)


def main() -> int:
    max_per_tiger = 3
    if "--max-per-tiger" in sys.argv:
        max_per_tiger = int(sys.argv[sys.argv.index("--max-per-tiger") + 1])

    from database import SessionLocal, Capture
    from services.onnx_models import reid_extract
    from services.identification_service import load_models, gallery_best_cosines

    load_models()
    db = SessionLocal()
    try:
        tigers = [t.tiger_id for t in db.query(Capture.tiger_id).distinct()]
        top1 = top1_same_flank = total = total_same_flank = 0
        confused = []

        for tid in sorted(set(tigers)):
            caps = (
                db.query(Capture)
                .filter(Capture.tiger_id == tid)
                .order_by(Capture.confidence.desc())
                .all()
            )
            # Held-out = captures beyond the top-8 used for the centroids
            held_out = caps[MAX_CENTROID_IMAGES:]
            if not held_out:
                continue

            tested = 0
            for cap in held_out:
                if tested >= max_per_tiger:
                    break
                src = resolve_capture_path(cap.image_path)
                if src is None:
                    continue
                res = reid_extract(str(src))
                if res is None:
                    continue
                tested += 1
                total += 1
                same_flank = (
                    cap.flank_side is not None
                    and cap.flank_side != "Unknown"
                    and cap.flank_side == res["flank_name"]
                )
                total_same_flank += 1 if same_flank else 0

                sims, ids = gallery_best_cosines(res["embedding"], q_flank=res["flank_name"])
                pred = ids[int(np.argmax(sims))]
                if pred == tid:
                    top1 += 1
                    if same_flank:
                        top1_same_flank += 1
                elif len(confused) < 10:
                    confused.append((tid, cap.flank_side, res["flank_name"], pred,
                                     round(float(np.max(sims)), 3)))

            if tested:
                print(f"  {tid}: tested {tested} held-out capture(s)")

        print()
        if total == 0:
            print("[WARN] No held-out captures available (every tiger has <= 8 captures).")
            return 0
        print(f"Top-1 accuracy (held-out captures): {top1}/{total} = {top1 / total:.1%}")
        if total_same_flank:
            print(f"Top-1 accuracy (model-agreed flank): {top1_same_flank}/{total_same_flank} "
                  f"= {top1_same_flank / total_same_flank:.1%}")
        for c in confused:
            print(f"  miss: true={c[0]} cap_flank={c[1]} model_flank={c[2]} -> predicted={c[3]} (sim={c[4]})")
        return 0 if top1 / total >= 0.7 else 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
