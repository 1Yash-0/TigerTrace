"""
One-time importer for the REAL Pench Tiger Reserve dataset (PTR_Tiger_IDs_2025).

Source layout (repo_root/data/PTR_Tiger_IDs_2025/):
  - "PTR Camera Locations 24-25.xlsx"  -> 295 camera GRID locations
        (GRID ID, Block, Beat, Range, Latitude, Longitude)
  - T103_F/ T108_M/ ... T158_U/        -> 62 tiger folders (sex in suffix)
        files named "<cameraGRID>_<flank>_<seq>__<frame>.JPG"
        EXIF DateTime (tag 306) holds the real capture timestamp.

What it does (run once, from backend/):
    .venv/Scripts/python.exe import_real_data.py [--fresh]

  1. --fresh wipes synthetic seed data (tigers, captures, alerts, review queue...)
  2. Excel  -> CameraStation table (station_id "C090", block/beat/range, lat/lon)
  3. Folders-> Tiger rows, embedding = L2-normalised average of real ResNet-18
     Re-ID embeddings from up to 8 images per tiger (feeds the match gallery)
  4. Images -> Capture rows: station/coords from camera GRID, timestamp from
     EXIF, flank side from the A/B segment, confidence from the MobileNetV3
     species gate. MegaDetector is deliberately skipped: the reserve already
     curated these as tiger photographs.

Images themselves are NOT copied — the backend serves the folder directly at
/real-images (mounted in main.py).
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).parent
DATA_DIR = BACKEND_DIR.parent / "data" / "PTR_Tiger_IDs_2025"
XLSX_NAME = "PTR Camera Locations 24-25.xlsx"

# Tolerate the double-nested layout produced by unzipping
# "PTR_Tiger_IDs_2025.zip" in place (data/PTR_Tiger_IDs_2025/PTR_Tiger_IDs_2025/…)
if DATA_DIR.exists() and not any(DATA_DIR.glob("T*_M")) and not any(DATA_DIR.glob("T*_F")) \
        and not any(DATA_DIR.glob("T*_U")):
    nested = DATA_DIR / "PTR_Tiger_IDs_2025"
    if nested.is_dir():
        DATA_DIR = nested

# e.g. "229_A_I__00010.JPG", "294_B_Cdy00075.JPG", "275_B_I__00032 (2).JPG"
FILENAME_RE = re.compile(
    r"^(\d+)_([A-Za-z]+)_(.*?)(?:__)?(\d+)(?:\s*\(\d+\))?\.jpe?g$", re.IGNORECASE
)

sys.path.insert(0, str(BACKEND_DIR))


def clean(s) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fresh", action="store_true", help="wipe existing data first")
    args = ap.parse_args()

    if not DATA_DIR.exists():
        print(f"[ERROR] dataset not found: {DATA_DIR}")
        sys.exit(1)

    os.chdir(BACKEND_DIR)

    from database import (
        Alert, Base, CameraStation, Capture, ReviewQueue, SessionLocal, TriageRun,
        Tiger, ChatMessage, engine, ensure_schema,
    )

    # Ensure all tables (incl. the new camera_stations) exist before wiping
    ensure_schema()

    db = SessionLocal()
    try:
        # ── 0. Optional wipe ────────────────────────────────────────────────
        if args.fresh:
            print("[INFO] --fresh: wiping existing tigers/captures/stations/alerts/review/triage/chat...")
            for model in (Capture, ReviewQueue, Alert, TriageRun, ChatMessage, Tiger, CameraStation):
                n = db.query(model).delete()
                print(f"   {model.__tablename__}: {n} rows deleted")
            db.commit()

        # ── 1. Camera stations from Excel ───────────────────────────────────
        import openpyxl

        wb = openpyxl.load_workbook(DATA_DIR / XLSX_NAME)
        ws = wb["Sheet1"]
        stations: dict[int, CameraStation] = {}
        skipped = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            grid_raw, block, beat, rng, lat, lon = row[:6]
            if grid_raw is None or lat is None or lon is None:
                continue
            try:
                grid = int(str(grid_raw).strip())
            except ValueError:
                skipped.append(str(grid_raw))  # e.g. "258_Removed_Not Accessible"
                continue
            station_id = f"C{grid:03d}"
            st = db.query(CameraStation).filter(CameraStation.station_id == station_id).first()
            if st is None:
                st = CameraStation(station_id=station_id)
                db.add(st)
            st.grid_id = grid
            st.block = clean(block)
            st.beat = clean(beat)
            st.range_name = clean(rng)
            st.latitude = float(lat)
            st.longitude = float(lon)
            st.zone = "survey"
            stations[grid] = st
        db.commit()
        print(f"[INFO] imported {len(stations)} camera stations (skipped non-numeric: {skipped})")
        if db.query(CameraStation).count() != len(stations):
            # re-run without --fresh: clear then re-add to stay idempotent
            print("[WARN] stations already existed; skipping duplicate import")

        # ── 2+3. Tigers + captures ──────────────────────────────────────────
        from services.onnx_models import classifier_probs, reid_embedding
        import numpy as np

        tiger_folders = sorted(d for d in DATA_DIR.iterdir() if d.is_dir())
        print(f"[INFO] {len(tiger_folders)} tiger folders found")

        total_caps = 0
        skipped_imgs = 0

        for t_idx, folder in enumerate(tiger_folders, 1):
            m = re.match(r"^(T\d+)_(M|F|U)$", folder.name)
            if not m:
                print(f"[WARN] skipping odd folder {folder.name}")
                continue
            tiger_id, sex = m.group(1), m.group(2)

            images = [
                f for f in sorted(folder.iterdir())
                if f.suffix.lower() in (".jpg", ".jpeg", ".png") and FILENAME_RE.match(f.name)
            ]
            if not images:
                print(f"[WARN] {folder.name}: no parseable images")
                continue

            # Species-gate confidence per image (single pass, reused for both
            # the capture rows and the "clearest views" centroid selection)
            probs_map = {}
            for f in images:
                p = classifier_probs(str(f))
                probs_map[f] = float(p[0]) if p else 0.90

            # Real embedding: average the CLEAREST images -> robust centroid
            embs = []
            for f in sorted(images, key=lambda x: -probs_map[x])[:8]:
                e = reid_embedding(str(f))
                if e is not None:
                    embs.append(e)
            if embs:
                centroid = np.mean(embs, axis=0)
                centroid = centroid / np.linalg.norm(centroid)
                embedding_json = json.dumps([round(float(x), 6) for x in centroid.tolist()])
            else:
                embedding_json = None

            tiger = db.query(Tiger).filter(Tiger.tiger_id == tiger_id).first()
            if tiger is None:
                tiger = Tiger(tiger_id=tiger_id)
                db.add(tiger)
            tiger.name = f"Tiger {tiger_id}"
            tiger.sex = {"M": "Male", "F": "Female", "U": "Unknown"}[sex]
            tiger.embedding_json = embedding_json

            # earliest EXIF timestamp = enrollment proxy
            first_ts = None
            caps_batch = []

            for f in images:
                fm = FILENAME_RE.match(f.name)
                grid = int(fm.group(1))
                flank = fm.group(2).upper()  # A / B per PTR convention

                st = stations.get(grid)
                if st is None:
                    skipped_imgs += 1
                    continue

                # EXIF capture timestamp (tag 306 DateTime), fallback None
                ts = None
                try:
                    from PIL import Image
                    exif = Image.open(f).getexif()
                    raw = exif.get(306)
                    if raw:
                        ts = datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S")
                except Exception:
                    pass
                if ts is None:
                    skipped_imgs += 1
                    continue
                if first_ts is None or ts < first_ts:
                    first_ts = ts

                # species gate as capture confidence (cheap; no MDV6 on curated data)
                conf = round(probs_map.get(f, 0.90), 3)

                image_path = f"real-images/{folder.name}/{f.name}"
                existing = db.query(Capture).filter(
                    Capture.image_path == image_path,
                    Capture.tiger_id == tiger_id,
                ).first()
                if existing is None:
                    caps_batch.append(Capture(
                        tiger_id=tiger_id,
                        image_path=image_path,
                        station_id=st.station_id,
                        latitude=st.latitude,
                        longitude=st.longitude,
                        timestamp=ts,
                        confidence=conf,
                        zone=st.zone or "survey",
                        flank_side="Left" if flank == "A" else "Right" if flank == "B" else "Unknown",
                        source_dataset="PTR_Tiger_IDs_2025",
                        source_filename=f.name,
                        source_grid_id=grid,
                    ))
                else:
                    # Reconcile metadata when an existing source file was
                    # imported before the current schema fields were added.
                    existing.station_id = st.station_id
                    existing.latitude = st.latitude
                    existing.longitude = st.longitude
                    existing.timestamp = ts
                    existing.confidence = conf
                    existing.zone = st.zone or "survey"
                    existing.flank_side = "Left" if flank == "A" else "Right" if flank == "B" else "Unknown"
                    existing.source_dataset = "PTR_Tiger_IDs_2025"
                    existing.source_filename = f.name
                    existing.source_grid_id = grid

            if caps_batch:
                db.add_all(caps_batch)
                tiger.enrolled_at = first_ts or tiger.enrolled_at or datetime.utcnow()
            tiger.total_captures = db.query(Capture).filter(Capture.tiger_id == tiger_id).count() + len(caps_batch)
            total_caps += len(caps_batch)

            db.commit()
            print(f"  [{t_idx}/{len(tiger_folders)}] {tiger_id} ({sex}): {len(caps_batch)} captures, "
                  f"embedding from {len(embs)} imgs")

        # ── 4. Regenerate alerts from the real timeline ─────────────────────
        print("[INFO] running alert engine on real data...")
        from services.alert_service import run_alert_engine
        run_alert_engine(db)

        print(f"\n[DONE] tigers={db.query(Tiger).count()} captures={db.query(Capture).count()} "
              f"stations={db.query(CameraStation).count()} (skipped imgs: {skipped_imgs})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
