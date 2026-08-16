"""
Part 1 — Triage Engine (Blank Image Filtering)
Integrated with TigerTrace MDV6 YOLOv9-c Detector
"""
import os, shutil, random, time
from pathlib import Path
import sys

# Ensure TigerTrace is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'TigerTrace')))
from src.detection.mdv6_inference import MDV6Detector

QUARANTINE_DIR = Path("data/quarantined_blanks")
RETAINED_DIR   = Path("data/retained_images")
QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
RETAINED_DIR.mkdir(parents=True, exist_ok=True)

_mdv6_model = None

def get_mdv6():
    global _mdv6_model
    if _mdv6_model is None:
        model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "TigerTrace", "models", "pretrained", "MDV6-yolov9-c.onnx"))
        if os.path.exists(model_path):
            _mdv6_model = MDV6Detector(model_path=model_path, input_size=640, device="cpu")
        else:
            print(f"[WARN] MDV6 model not found at {model_path}. Using mock inference.")
            return None
    return _mdv6_model

def mock_detect(image_path: str) -> tuple[bool, float]:
    time.sleep(0.01)
    confidence = round(random.uniform(0.1, 0.99), 3)
    has_animal = confidence >= 0.40
    return has_animal, confidence

def detect_animal(image_path: str) -> tuple[bool, float]:
    mdv6 = get_mdv6()
    if mdv6:
        detections, inf_ms, img_bgr = mdv6.detect_image(str(image_path), conf_thresh=0.20)
        animal_detections = [d for d in detections if d["class_name"] == "animal"]
        if animal_detections:
            top_conf = max(d["confidence"] for d in animal_detections)
            return True, top_conf
        return False, 0.0
    return mock_detect(image_path)

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
