"""
Part 1 — Triage Engine (Blank Image Filtering)
Integrated with TigerTrace MDV6 YOLOv9-c Detector

The real MDV6-yolov9-c.onnx weights are REQUIRED. There is deliberately no
heuristic fallback: blank filtering and person privacy-blurring both depend on
genuine detector output, and a classifier-based stand-in would silently let
humans through unblurred and declare blanks "animals" at fabricated confidence.
"""
import os, shutil
from pathlib import Path
import sys

from database import BACKEND_DIR

# Ensure TigerTrace is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'TigerTrace')))
from src.detection.mdv6_inference import MDV6Detector

QUARANTINE_DIR = BACKEND_DIR / "data" / "quarantined_blanks"
RETAINED_DIR   = BACKEND_DIR / "data" / "retained_images"
QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
RETAINED_DIR.mkdir(parents=True, exist_ok=True)

_MDV6_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "..", "TigerTrace", "models", "pretrained", "MDV6-yolov9-c.onnx"),
    os.path.join(os.path.dirname(__file__), "..", "..", "models", "pretrained", "MDV6-yolov9-c.onnx"),
]

_mdv6_model = None

def get_mdv6() -> MDV6Detector:
    """Shared MDV6 detector singleton. Raises FileNotFoundError if the weights
    are missing — triage must never degrade to a heuristic."""
    global _mdv6_model
    if _mdv6_model is None:
        model_path = next((p for p in _MDV6_CANDIDATES if os.path.exists(p)), None)
        if model_path is None:
            raise FileNotFoundError(
                "MDV6-yolov9-c.onnx not found. Searched:\n  "
                + "\n  ".join(_MDV6_CANDIDATES)
                + "\nDownload it with: python scripts/download_models.py"
            )
        _mdv6_model = MDV6Detector(model_path=model_path, input_size=640, device="cpu")
    return _mdv6_model

def detect_animal(image_path: str) -> tuple[bool, float]:
    """Real MDV6 detection only. Raises when the detector cannot run so callers
    never act on fabricated confidences."""
    mdv6 = get_mdv6()
    detections, _inf_ms, _img_bgr = mdv6.detect_image(str(image_path), conf_thresh=0.20)
    animal_detections = [d for d in detections if d["class_name"] == "animal"]
    if animal_detections:
        return True, max(d["confidence"] for d in animal_detections)
    return False, 0.0

def run_triage(image_dir: str) -> dict:
    """Run the full triage pipeline on a directory of raw camera trap images."""
    image_dir = Path(image_dir)
    if not image_dir.exists():
        raise FileNotFoundError(f"Directory {image_dir} not found.")

    valid_exts = {".jpg", ".jpeg", ".png", ".bmp"}
    all_images = [f for f in image_dir.iterdir() if f.suffix.lower() in valid_exts]

    total       = len(all_images)
    blanks      = 0
    retained    = 0
    saved_bytes = 0
    log         = []

    for img_path in all_images:
        file_size = img_path.stat().st_size
        has_animal, confidence = detect_animal(str(img_path))

        if has_animal:
            shutil.copy(img_path, RETAINED_DIR / img_path.name)
            retained += 1
            log.append({"file": img_path.name, "status": "retained", "confidence": confidence})
        else:
            shutil.copy(img_path, QUARANTINE_DIR / img_path.name)
            blanks      += 1
            saved_bytes += file_size
            log.append({"file": img_path.name, "status": "quarantined", "confidence": confidence})

    saved_mb      = round(saved_bytes / (1024 * 1024), 2)
    saved_minutes = round((blanks * 5) / 60, 1)

    return {
        "total_images":   total,
        "blanks_removed": blanks,
        "retained":       retained,
        "saved_mb":       saved_mb,
        "saved_minutes":  saved_minutes,
        "log":            log,
    }
