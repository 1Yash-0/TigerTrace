"""
Part 2 - Tiger Identification Service
Integrated with TigerTrace Swin-Transformer ArcFace Side-Aware Re-ID (tigertrace_ptr_v2_side_aware.onnx)
and MobileNetV3 Species Gate.

Inference runs on exported ONNX models via onnxruntime (see services/onnx_models.py).
512-D L2-normalized stripe embeddings with side-aware flank orientation classification
and flank-routed similarity scoring.
"""
import json
import os
import threading
from typing import Dict, Any, List, Tuple, Optional

import numpy as np

from services.onnx_models import classifier_probs, reid_extract, reid_embedding

_models_ready = False
_models_lock = threading.Lock()
_pench_gallery: Dict[str, List[Dict[str, Any]]] = {}

# Decision Thresholds per Technical Specifications
MATCH_THRESHOLD_HIGH = 0.70     # >= 0.70: High-confidence match (auto_matched)
MATCH_THRESHOLD_AMBIGUOUS = 0.55 # 0.55 - 0.70: Possible match (ambiguous / review)
FLANK_MISMATCH_PENALTY = 0.22   # 0.20 - 0.25 penalty for cross-flank or unclassified comparison


def _normalize_flank(flank: Optional[str]) -> str:
    """Normalize flank identifiers to 'Left' ('A'), 'Right' ('B'), or 'Unknown'."""
    if not flank:
        return "Unknown"
    f = str(flank).strip().upper()
    if f in ("A", "LEFT", "L"):
        return "Left"
    if f in ("B", "RIGHT", "R"):
        return "Right"
    return "Unknown"


def load_models():
    """Warm the ONNX sessions and gallery once, thread-safely. Never raises."""
    global _models_ready, _pench_gallery
    if _models_ready:
        return
    with _models_lock:
        if _models_ready:
            return
        _build_pench_gallery()
        _models_ready = True


def _build_pench_gallery():
    global _pench_gallery
    _pench_gallery = {}

    # Real embeddings stored in SQLite.
    # Each tiger may carry centroids: embedding_json (full-image average)
    # and embedding2_json (MegaDetector-crop average) along with associated flank tags.
    try:
        from database import SessionLocal, Tiger, Capture

        db_session = SessionLocal()
        try:
            # Map tiger_id -> known dominant flank sides from historical captures
            flank_map: Dict[str, List[str]] = {}
            for cap in db_session.query(Capture).all():
                if cap.tiger_id and cap.flank_side:
                    flank_map.setdefault(cap.tiger_id, []).append(_normalize_flank(cap.flank_side))

            for t in db_session.query(Tiger).all():
                centroids = []
                known_flanks = flank_map.get(t.tiger_id, [])
                primary_flank = known_flanks[0] if known_flanks else "Unknown"

                for col in (t.embedding_json, t.embedding2_json):
                    if not col:
                        continue
                    try:
                        vec = np.array(json.loads(col), dtype=np.float32)
                        norm = np.linalg.norm(vec)
                        if norm > 1e-8:
                            centroids.append({
                                "vec": vec / norm,
                                "flank": primary_flank,
                                "flanks": set(known_flanks) if known_flanks else {"Unknown"},
                            })
                    except Exception:
                        continue
                if centroids:
                    _pench_gallery[t.tiger_id] = centroids
        finally:
            db_session.close()
    except Exception as e_db:
        print(f"[WARN] Unable to load DB tiger embeddings: {e_db}")

    total_centroids = sum(len(v) for v in _pench_gallery.values())
    print(f"[INFO] Pench Gallery populated with {len(_pench_gallery)} registered individuals "
          f"({total_centroids} centroids).")


def gallery_best_cosines(q_norm: np.ndarray, q_flank: str = "Unknown", penalty: float = FLANK_MISMATCH_PENALTY) -> Tuple[np.ndarray, list]:
    """
    Compute flank-routed cosine similarity per registered tiger across all its centroids.
    
    Flank Routing Strategy:
      - Full cosine dot product when query and gallery match on flank side (Left <-> Left, Right <-> Right).
      - Soft confidence penalty applied for cross-flank or unclassified comparisons to prevent visual false positives.
    """
    ids = list(_pench_gallery.keys())
    q_norm_flank = _normalize_flank(q_flank)
    best_scores = []

    for tid in ids:
        centroids = _pench_gallery[tid]
        tiger_best = -1.0
        for item in centroids:
            vec = item["vec"] if isinstance(item, dict) else item
            g_flank = item.get("flank", "Unknown") if isinstance(item, dict) else "Unknown"
            g_flanks = item.get("flanks", {g_flank}) if isinstance(item, dict) else {g_flank}

            sim = float(np.dot(vec, q_norm))

            # Flank routing penalty
            if q_norm_flank != "Unknown" and g_flanks and "Unknown" not in g_flanks:
                if q_norm_flank in g_flanks:
                    # Same flank match: no penalty
                    routed_sim = sim
                else:
                    # Opposite flank: apply soft penalty
                    routed_sim = sim - penalty
            elif q_norm_flank == "Unknown" or "Unknown" in g_flanks:
                # Mild uncertainty penalty for unclassified flank
                routed_sim = sim - (penalty * 0.5)
            else:
                routed_sim = sim

            if routed_sim > tiger_best:
                tiger_best = routed_sim

        best_scores.append(tiger_best)

    return np.array(best_scores, dtype=np.float32), ids


def enroll_tiger_embedding(tiger_id: str, vec, flank_side: str = "Unknown") -> bool:
    """Register/update a tiger's embedding in the in-memory gallery (used by review queue)."""
    try:
        v = np.asarray(vec, dtype=np.float32).flatten()
        norm = np.linalg.norm(v)
        if norm > 1e-8:
            entry = {
                "vec": v / norm,
                "flank": _normalize_flank(flank_side),
                "flanks": {_normalize_flank(flank_side)},
            }
            if tiger_id in _pench_gallery:
                _pench_gallery[tiger_id].append(entry)
            else:
                _pench_gallery[tiger_id] = [entry]
            return True
    except Exception:
        pass
    return False


def detect_crop(image_path: str):
    """
    MegaDetector animal check + crop. Returns (has_animal, confidence, cropped_path).
    The crop is written next to the uploads so the species gate and Re-ID see the
    same tightened region the detector found.
    """
    from services.triage_service import detect_animal

    has_animal, confidence = detect_animal(image_path)
    if not has_animal:
        return False, confidence, None

    cropped_path = image_path
    try:
        from src.detection.mdv6_inference import MDV6Detector  # noqa: F401
        from services.triage_service import get_mdv6

        mdv6 = get_mdv6()
        if mdv6 is not None:
            import cv2

            detections, _inf_ms, img_bgr = mdv6.detect_image(image_path, conf_thresh=0.20)
            animals = [d for d in detections if d["class_name"] == "animal"]
            if animals:
                best = max(animals, key=lambda d: d["confidence"])
                x1, y1, x2, y2 = [int(v) for v in best["bbox"]]
                h, w = img_bgr.shape[:2]
                crop = img_bgr[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
                if crop.size:
                    root, ext = os.path.splitext(image_path)
                    cropped_path = f"{root}_crop{ext or '.jpg'}"
                    cv2.imwrite(cropped_path, crop)
    except Exception as e:
        print(f"[WARN] detect_crop falling back to full image: {e}")

    return True, confidence, cropped_path


def identify_tiger(image_path: str, db=None) -> dict:
    """
    Complete computer vision pipeline (ONNX, thread-safe, blocking — call via threadpool):
    1. MobileNetV3 species gate (filters blanks and non-tiger animals)
    2. Swin-Transformer 512-D feature extraction & flank orientation classification
    3. Flank-routed cosine similarity matching against the Pench registered gallery

    Raises RuntimeError when the image cannot be embedded — failures are never
    converted into fabricated match scores.
    """
    load_models()

    if not _pench_gallery:
        # No registered tigers yet — truthfully report a new individual.
        return {
            "status": "new_individual",
            "top_match": {"tiger_id": "None", "confidence": 0, "similarity": 0.0},
            "alt_match": {"tiger_id": "None", "confidence": 0, "similarity": 0.0},
            "flank_side": "Unknown",
            "flank_code": "U",
            "flank_confidence": 0.5,
            "all_scores": [],
        }

    probs = classifier_probs(image_path)
    reid_res = reid_extract(image_path)
    if reid_res is None:
        raise RuntimeError(
            f"Re-ID extraction failed for '{image_path}' — the image could not be embedded."
        )

    q_flank = reid_res.get("flank_name", "Unknown")
    q_flank_code = reid_res.get("flank_side", "A")
    flank_conf = float(reid_res.get("flank_confidence", 0.90))

    # 2+3. Flank-routed cosine similarity against all registered Pench tigers.
    best_cos, gallery_ids = gallery_best_cosines(reid_res["embedding"], q_flank=q_flank)

    # Dual-view query: embed the MDV6-tightened crop as well and take the
    # element-wise best per tiger — the same strategy /api/pipeline/analyze
    # uses. Measured on held-out PTR captures: 69.4% top-1 (dual) vs 61.9%
    # (full frame alone).
    has_animal, _detect_conf, cropped = detect_crop(image_path)
    if has_animal and cropped and cropped != image_path:
        crop_res = reid_extract(cropped)
        try:
            os.remove(cropped)  # temp crop — keep the uploads dir clean
        except OSError:
            pass
        if crop_res is not None:
            crop_cos, _crop_ids = gallery_best_cosines(
                crop_res["embedding"], q_flank=crop_res.get("flank_name", "Unknown")
            )
            if len(crop_cos) == len(best_cos):
                best_cos = np.maximum(best_cos, crop_cos)
                # A tight crop is the more reliable orientation signal
                q_flank = crop_res.get("flank_name", q_flank)
                q_flank_code = crop_res.get("flank_side", q_flank_code)
                flank_conf = float(crop_res.get("flank_confidence", flank_conf))

    # Softmax temperature calibration for human confidence display
    temperature = 18.0
    exp_sims = np.exp(best_cos * temperature)
    conf_probs = exp_sims / np.sum(exp_sims)

    scores = {
        tid: {
            "confidence": round(float(prob), 3),
            "similarity": round(float(sim), 3),
        }
        for tid, prob, sim in zip(gallery_ids, conf_probs, best_cos)
    }
    sorted_matches = sorted(scores.items(), key=lambda x: x[1]["similarity"], reverse=True)

    top_id, top_data = sorted_matches[0]
    top_sim = top_data["similarity"]
    top_conf = top_data["confidence"]

    if len(sorted_matches) > 1:
        alt_id, alt_data = sorted_matches[1]
        alt_sim = alt_data["similarity"]
        alt_conf = alt_data["confidence"]
    else:
        alt_id, alt_sim, alt_conf = "None", 0.0, 0.0

    # Species gate — the flank-trained MobileNetV3 misclassifies partial tiger
    # views (head/tail shots common in PTR's curated folders), so — as in
    # /api/pipeline/analyze — it may only reject when it is very confident the
    # subject is not a tiger AND the Re-ID similarity is also low.
    tiger_prob = float(probs[0]) if probs is not None else None
    if tiger_prob is not None and tiger_prob < 0.02 and top_sim < MATCH_THRESHOLD_AMBIGUOUS:
        return {
            "status": "not_a_tiger",
            "top_match": {"tiger_id": "None", "confidence": 0, "similarity": 0.0},
            "alt_match": {"tiger_id": "None", "confidence": 0, "similarity": 0.0},
            "flank_side": q_flank,
            "flank_code": q_flank_code,
            "flank_confidence": flank_conf,
            "all_scores": [],
        }

    # Decision Thresholds per Specification:
    # >= 0.70: High-confidence match (auto_matched)
    # 0.55 - 0.70: Possible match (ambiguous / human review)
    # < 0.55: Unmatched / new individual
    if top_sim >= MATCH_THRESHOLD_HIGH:
        status = "auto_matched"
    elif top_sim >= MATCH_THRESHOLD_AMBIGUOUS:
        status = "ambiguous"
    else:
        status = "new_individual"

    # Ambiguous matches are queued for human ranger review
    if status == "ambiguous" and db is not None:
        try:
            from datetime import datetime
            from database import ReviewQueue

            existing = (
                db.query(ReviewQueue)
                .filter(ReviewQueue.image_path == image_path, ReviewQueue.status == "pending")
                .first()
            )
            if not existing:
                db.add(ReviewQueue(
                    image_path=image_path,
                    station_id="ST-ONLINE",
                    timestamp=datetime.utcnow(),
                    top_match_id=top_id,
                    top_match_confidence=top_conf,
                    alt_match_id=alt_id,
                    alt_match_confidence=alt_conf,
                    status="pending",
                ))
                db.commit()
        except Exception as rq_err:
            print(f"[WARN] Failed to insert into review_queue: {rq_err}")

    return {
        "status": status,
        "top_match": {"tiger_id": top_id, "confidence": top_conf, "similarity": top_sim},
        "alt_match": {"tiger_id": alt_id, "confidence": alt_conf, "similarity": alt_sim},
        "flank_side": q_flank,
        "flank_code": q_flank_code,
        "flank_confidence": flank_conf,
        "all_scores": [
            {"tiger_id": t, "confidence": d["confidence"], "similarity": d["similarity"]}
            for t, d in sorted_matches
        ],
    }

