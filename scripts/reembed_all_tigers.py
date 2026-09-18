"""
Re-embed all registered tigers in SQLite database using the tigertrace_ptr_v2_side_aware.onnx model.
Computes 512-D L2-normalized centroids for full image and crop image views.

Strict mode: every tiger must be embedded from at least one resolvable image.
If any tiger fails, the run exits non-zero and that tiger's embedding is left
unchanged — synthetic fallback vectors are never written.
"""

import json
import os
import sys
from pathlib import Path
import numpy as np

# Ensure paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(PROJECT_ROOT))
os.chdir(BACKEND_DIR)

from database import SessionLocal, Tiger, Capture
from services.onnx_models import reid_extract, reid_embedding
from services.identification_service import detect_crop


def reembed_database():
    db = SessionLocal()
    failures = []
    try:
        tigers = db.query(Tiger).all()
        print(f"[INFO] Re-embedding {len(tigers)} tigers with 512-D side-aware model (tigertrace_ptr_v2_side_aware.onnx)...")

        for idx, tiger in enumerate(tigers, 1):
            captures = (
                db.query(Capture)
                .filter(Capture.tiger_id == tiger.tiger_id)
                .order_by(Capture.confidence.desc())
                .limit(8)
                .all()
            )

            full_embs = []
            crop_embs = []
            detected_flanks = []

            for cap in captures:
                p = cap.image_path
                rel = p.replace("real-images/", "")
                candidates = [
                    PROJECT_ROOT / "data" / "PTR_Tiger_IDs_2025" / rel,
                    # Tolerate the double-nested unzip layout
                    # (data/PTR_Tiger_IDs_2025/PTR_Tiger_IDs_2025/…), as main.py does
                    PROJECT_ROOT / "data" / "PTR_Tiger_IDs_2025" / "PTR_Tiger_IDs_2025" / rel,
                    BACKEND_DIR / p,
                    PROJECT_ROOT / p,
                ]
                src = next((c for c in candidates if c.exists()), None)
                if src is None:
                    continue

                # Full image embedding
                full_res = reid_extract(str(src))
                if full_res is not None:
                    full_embs.append(full_res["embedding"])
                    detected_flanks.append(full_res["flank_name"])
                    if cap.flank_side in (None, "Unknown", ""):
                        cap.flank_side = full_res["flank_name"]

                # Crop image embedding
                has_animal, _conf, cropped = detect_crop(str(src))
                if has_animal and cropped:
                    crop_res = reid_extract(cropped)
                    if crop_res is not None:
                        crop_embs.append(crop_res["embedding"])
                    if cropped != str(src):
                        try:
                            os.remove(cropped)  # temp crop — keep the dataset dir pristine
                        except OSError:
                            pass

            # 1. Full image centroid (embedding_json) — required. No synthetic
            # fallback: a seeded-random vector would poison the match gallery.
            if not full_embs:
                failures.append(tiger.tiger_id)
                print(f"  [{idx}/{len(tigers)}] {tiger.tiger_id}: FAILED — no resolvable images; embedding left unchanged")
                continue

            full_centroid = np.mean(full_embs, axis=0)
            full_centroid = full_centroid / np.linalg.norm(full_centroid)
            tiger.embedding_json = json.dumps([round(float(x), 6) for x in full_centroid.tolist()])

            # 2. Crop image centroid (embedding2_json)
            if crop_embs:
                crop_centroid = np.mean(crop_embs, axis=0)
                crop_centroid = crop_centroid / np.linalg.norm(crop_centroid)
                tiger.embedding2_json = json.dumps([round(float(x), 6) for x in crop_centroid.tolist()])
            else:
                tiger.embedding2_json = tiger.embedding_json

            db.commit()
            flank_summary = detected_flanks[0] if detected_flanks else "Unknown"
            print(f"  [{idx}/{len(tigers)}] {tiger.tiger_id}: 512-D centroids updated (from {len(full_embs)} full, {len(crop_embs)} crop imgs, flank={flank_summary})")

        if failures:
            print(f"[FAILURE] {len(failures)} tiger(s) could not be re-embedded: {failures}")
            raise SystemExit(1)
        print("[SUCCESS] All database tigers re-embedded with 512-D representations.")
    finally:
        db.close()


if __name__ == "__main__":
    reembed_database()
