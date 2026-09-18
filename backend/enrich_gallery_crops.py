"""
Gallery enrichment: adds MegaDetector-crop centroids to every tiger.

Real PTR curated photos match the Re-ID model best as FULL frames, while
SD-card scene photos match best as detector CROPS. The importer already
stored full-image centroids (embedding_json); this pass adds crop centroids
(embedding2_json) from up to 8 images per tiger so queries of either style
find their tiger.

Run once after import_real_data.py:
    .venv/Scripts/python.exe enrich_gallery_crops.py
"""
import json
import os
import sqlite3
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

MAX_IMAGES_PER_TIGER = 8


def main():
    import numpy as np

    from database import Capture, SessionLocal, Tiger, DATABASE_PATH, ensure_schema
    from services.identification_service import detect_crop
    from services.onnx_models import reid_embedding

    # SQLite: add the column if this is the first enrichment run
    ensure_schema()
    con = sqlite3.connect(str(DATABASE_PATH))
    cols = [r[1] for r in con.execute("PRAGMA table_info(tigers)").fetchall()]
    if "embedding2_json" not in cols:
        con.execute("ALTER TABLE tigers ADD COLUMN embedding2_json TEXT")
        con.commit()
        print("[INFO] added tigers.embedding2_json column")
    con.close()

    db = SessionLocal()
    try:
        tigers = db.query(Tiger).all()
        print(f"[INFO] enriching {len(tigers)} tigers with crop centroids...")
        for i, tiger in enumerate(tigers, 1):
            existing = []
            if tiger.embedding2_json:
                try:
                    existing = json.loads(tiger.embedding2_json)
                except Exception:
                    existing = []
            if existing:
                print(f"  [{i}/{len(tigers)}] {tiger.tiger_id}: already enriched")
                continue

            embs = []
            # Use the CLEAREST flank views for the centroid (highest species-gate
            # confidence), not the first N alphabetically — partial shots would
            # blur the centroid and hurt discrimination.
            caps = (
                db.query(Capture)
                .filter(Capture.tiger_id == tiger.tiger_id)
                .order_by(Capture.confidence.desc())
                .limit(MAX_IMAGES_PER_TIGER)
                .all()
            )
            for cap in caps:
                p = cap.image_path
                # capture paths are either "real-images/<folder>/<file>" (served
                # straight from the dataset) or backend-relative uploads
                rel = p.replace("real-images/", "")
                candidates = [
                    BACKEND_DIR.parent / "data" / "PTR_Tiger_IDs_2025" / rel,
                    # Tolerate the double-nested unzip layout
                    # (data/PTR_Tiger_IDs_2025/PTR_Tiger_IDs_2025/…), as main.py does
                    BACKEND_DIR.parent / "data" / "PTR_Tiger_IDs_2025" / "PTR_Tiger_IDs_2025" / rel,
                    BACKEND_DIR / p,
                ]
                src = next((c for c in candidates if c.exists()), None)
                if src is None:
                    continue
                has, _conf, cropped = detect_crop(str(src))
                if has and cropped:
                    e = reid_embedding(cropped)
                    if cropped != str(src):
                        try:
                            os.remove(cropped)  # temp crop — keep the dataset dir pristine
                        except OSError:
                            pass
                    if e is not None:
                        embs.append(e)

            if embs:
                centroid = np.mean(embs, axis=0)
                centroid = centroid / np.linalg.norm(centroid)
                tiger.embedding2_json = json.dumps([round(float(x), 6) for x in centroid.tolist()])
                db.commit()
                print(f"  [{i}/{len(tigers)}] {tiger.tiger_id}: crop centroid from {len(embs)} images")
            else:
                print(f"  [{i}/{len(tigers)}] {tiger.tiger_id}: no crops available, skipped")
    finally:
        db.close()
    print("[DONE]")


if __name__ == "__main__":
    main()
