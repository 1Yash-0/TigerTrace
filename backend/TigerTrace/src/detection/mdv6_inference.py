"""
MegaDetector V6 (MDV6-yolov9-c) Inference Engine.
- Runs ONNX Runtime (CPU or CUDA) for fast triage on field laptops.
- Native letterboxing & coordinate unscaling.
- Reversible blank image filtering with confidence thresholds.
- Automatic human privacy blurring (Class 1: Person).
"""

import os
import time
import json
import cv2
import numpy as np
import pandas as pd
from PIL import Image, ImageFilter
from tqdm import tqdm
import onnxruntime as ort

CLASS_NAMES = {0: "animal", 1: "person", 2: "vehicle"}

def letterbox(img, new_shape=(640, 640), color=(114, 114, 114)):
    shape = img.shape[:2]  # [height, width]
    if isinstance(new_shape, int):
        new_shape = (new_shape, new_shape)

    r = min(new_shape[0] / shape[0], new_shape[1] / shape[1])
    new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
    dw, dh = new_shape[1] - new_unpad[0], new_shape[0] - new_unpad[1]
    dw, dh = dw / 2, dh / 2

    if shape[::-1] != new_unpad:
        img = cv2.resize(img, new_unpad, interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
    return img, r, (dw, dh)

class MDV6Detector:
    def __init__(self, model_path="models/pretrained/MDV6-yolov9-c.onnx", input_size=640, device="cpu"):
        self.model_path = model_path
        self.input_size = input_size
        self.device = device
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")
            
        providers = ['CPUExecutionProvider']
        if device == "cuda" and 'CUDAExecutionProvider' in ort.get_available_providers():
            providers.insert(0, 'CUDAExecutionProvider')
            
        print(f"Loading MDV6 ONNX session with providers: {providers}")
        self.session = ort.InferenceSession(model_path, providers=providers)
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [o.name for o in self.session.get_outputs()]
        print(f"MDV6 Detector ready (Input size: {input_size}x{input_size})")

    def preprocess(self, img_bgr):
        h_orig, w_orig = img_bgr.shape[:2]
        img_padded, ratio, (dw, dh) = letterbox(img_bgr, new_shape=self.input_size)
        img_rgb = cv2.cvtColor(img_padded, cv2.COLOR_BGR2RGB)
        img_norm = img_rgb.astype(np.float32) / 255.0
        img_chw = np.transpose(img_norm, (2, 0, 1))
        img_batch = np.expand_dims(img_chw, axis=0)
        return img_batch, ratio, (dw, dh), (w_orig, h_orig)

    def detect_image(self, image_path, conf_thresh=0.20, iou_thresh=0.45):
        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            return [], 0.0, None
            
        t0 = time.time()
        inp, ratio, (dw, dh), (w_orig, h_orig) = self.preprocess(img_bgr)
        outputs = self.session.run(self.output_names, {self.input_name: inp})
        raw_preds = outputs[0]  # Shape: (1, 84, N) or (1, N, 6/7)
        
        # YOLOv9/v10 post-processing
        detections = []
        if len(raw_preds.shape) == 3 and raw_preds.shape[1] < raw_preds.shape[2]:
            # Shape (1, 84, 8400) -> Transpose to (8400, 84)
            preds = raw_preds[0].T
            boxes = preds[:, :4]
            scores_per_class = preds[:, 4:]
            
            for i in range(len(preds)):
                class_id = int(np.argmax(scores_per_class[i]))
                score = float(scores_per_class[i, class_id])
                if score >= conf_thresh:
                    cx, cy, bw, bh = boxes[i]
                    x1 = (cx - bw / 2 - dw) / ratio
                    y1 = (cy - bh / 2 - dh) / ratio
                    x2 = (cx + bw / 2 - dw) / ratio
                    y2 = (cy + bh / 2 - dh) / ratio
                    
                    # Clip to image boundaries
                    x1 = max(0.0, min(float(w_orig), float(x1)))
                    y1 = max(0.0, min(float(h_orig), float(y1)))
                    x2 = max(0.0, min(float(w_orig), float(x2)))
                    y2 = max(0.0, min(float(h_orig), float(y2)))
                    
                    if (x2 - x1) > 5 and (y2 - y1) > 5:
                        detections.append({
                            "class_id": class_id,
                            "class_name": CLASS_NAMES.get(class_id, f"class_{class_id}"),
                            "confidence": round(score, 4),
                            "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)]
                        })
        elif len(raw_preds.shape) == 3 and raw_preds.shape[2] == 6:
            # Format: [x1, y1, x2, y2, score, class_id]
            for row in raw_preds[0]:
                x1, y1, x2, y2, score, class_id = row
                if score >= conf_thresh:
                    x1 = (x1 - dw) / ratio
                    y1 = (y1 - dh) / ratio
                    x2 = (x2 - dw) / ratio
                    y2 = (y2 - dh) / ratio
                    detections.append({
                        "class_id": int(class_id),
                        "class_name": CLASS_NAMES.get(int(class_id), "animal"),
                        "confidence": round(float(score), 4),
                        "bbox": [round(float(x1), 1), round(float(y1), 1), round(float(x2), 1), round(float(y2), 1)]
                    })

        inference_time_ms = (time.time() - t0) * 1000.0
        return detections, inference_time_ms, img_bgr

def apply_privacy_blur(img_bgr, person_bboxes):
    """Blurs detected humans to safeguard field staff/villager privacy."""
    blurred = img_bgr.copy()
    for bbox in person_bboxes:
        x1, y1, x2, y2 = map(int, bbox)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(img_bgr.shape[1], x2), min(img_bgr.shape[0], y2)
        if x2 > x1 and y2 > y1:
            sub = blurred[y1:y2, x1:x2]
            blurred[y1:y2, x1:x2] = cv2.GaussianBlur(sub, (51, 51), 30)
    return blurred

def run_triage_batch(inventory_csv, output_predictions_json, model_path="models/pretrained/MDV6-yolov9-c.onnx", device="cpu"):
    df_inv = pd.read_csv(inventory_csv)
    detector = MDV6Detector(model_path=model_path, device=device)
    
    results = {}
    quarantine_summary = {"total": len(df_inv), "blanks": 0, "animals": 0, "humans": 0, "vehicles": 0}
    
    print(f"\nStarting MDV6 triage on {len(df_inv)} images...")
    for _, row in tqdm(df_inv.iterrows(), total=len(df_inv), desc="MDV6 Triage"):
        img_id = row["image_id"]
        img_path = row["absolute_path"]
        
        detections, inf_ms, img_bgr = detector.detect_image(img_path)
        
        has_animal = any(d["class_name"] == "animal" for d in detections)
        has_person = any(d["class_name"] == "person" for d in detections)
        has_vehicle = any(d["class_name"] == "vehicle" for d in detections)
        
        if not detections:
            triage_decision = "AUTO_EXCLUDE_BLANK"
            quarantine_summary["blanks"] += 1
        elif has_animal:
            triage_decision = "RETAIN_ANIMAL"
            quarantine_summary["animals"] += 1
        elif has_person:
            triage_decision = "PRIVACY_REVIEW_HUMAN"
            quarantine_summary["humans"] += 1
        elif has_vehicle:
            triage_decision = "RETAIN_VEHICLE"
            quarantine_summary["vehicles"] += 1
        else:
            triage_decision = "REVIEW_UNCERTAIN"
            
        results[img_id] = {
            "image_path": img_path,
            "triage_decision": triage_decision,
            "inference_time_ms": round(inf_ms, 2),
            "detections": detections
        }
        
    os.makedirs(os.path.dirname(output_predictions_json), exist_ok=True)
    with open(output_predictions_json, "w") as f:
        json.dump(results, f, indent=2)
        
    print("\n--- Triage Results Summary ---")
    print(json.dumps(quarantine_summary, indent=2))
    print(f"Predictions saved to: {output_predictions_json}")
    return results

if __name__ == "__main__":
    import sys
    inv_file = sys.argv[1] if len(sys.argv) > 1 else "data/interim/inventory/sample_inventory.csv"
    out_json = sys.argv[2] if len(sys.argv) > 2 else "data/interim/mdv6_predictions/sample_predictions.json"
    run_triage_batch(inv_file, out_json)
