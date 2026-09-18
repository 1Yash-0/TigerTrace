"""
Production Re-Identification Extractor for TigerTrace.
Model: tigertrace_ptr_v2_side_aware.onnx
Architecture: Swin-Transformer (MegaDescriptor-B) with ArcFace + Flank Router head.
Task: Biometric tiger stripe feature extraction & flank orientation classification.
"""

import os
from pathlib import Path
from typing import Union, Optional, Dict, Any
import numpy as np
import onnxruntime as ort
from PIL import Image


def _resolve_model_path(model_path: Optional[str] = None) -> str:
    """Resolve path to tigertrace_ptr_v2_side_aware.onnx across workspace locations."""
    if model_path and os.path.exists(model_path):
        return os.path.abspath(model_path)

    # Search candidates
    here = Path(__file__).resolve().parent
    workspace_root = here.parent.parent
    candidates = [
        model_path,
        str(workspace_root / "models" / "tigertrace_ptr_v2_side_aware" / "tigertrace_ptr_v2_side_aware.onnx"),
        str(workspace_root / "models" / "exported" / "reid" / "tigertrace_ptr_v2_side_aware.onnx"),
        str(workspace_root / "backend" / "TigerTrace" / "models" / "exported" / "reid" / "tigertrace_ptr_v2_side_aware.onnx"),
        str(workspace_root / "tigertrace_ptr_v2_side_aware.onnx"),
        "tigertrace_ptr_v2_side_aware.onnx",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return os.path.abspath(c)

    # Return default or original if none exist yet
    return model_path or "models/tigertrace_ptr_v2_side_aware/tigertrace_ptr_v2_side_aware.onnx"


class TigerReIDExtractor:
    """
    Biometric tiger stripe feature extractor and flank orientation classifier.
    Powered by Swin-Transformer ONNX model (tigertrace_ptr_v2_side_aware.onnx).
    """

    def __init__(self, onnx_model_path: str = "tigertrace_ptr_v2_side_aware.onnx"):
        resolved_path = _resolve_model_path(onnx_model_path)
        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if "CUDAExecutionProvider" in ort.get_available_providers()
            else ["CPUExecutionProvider"]
        )
        
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        opts.inter_op_num_threads = 1
        opts.log_severity_level = 3
        
        self.model_path = resolved_path
        self.session = ort.InferenceSession(resolved_path, sess_options=opts, providers=providers)
        self.input_name = self.session.get_inputs()[0].name
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def preprocess(self, crop: Union[Image.Image, str, Path, np.ndarray]) -> np.ndarray:
        """
        Preprocess input image to normalized float32 tensor of shape (1, 3, 224, 224).
        """
        if isinstance(crop, (str, Path)):
            crop = Image.open(str(crop))
        elif isinstance(crop, np.ndarray):
            # Handle OpenCV BGR or RGB array
            if crop.ndim == 3 and crop.shape[2] == 3:
                crop = Image.fromarray(crop)
            elif crop.ndim == 2:
                crop = Image.fromarray(crop).convert("RGB")

        resized = crop.convert("RGB").resize((224, 224), Image.Resampling.BICUBIC)
        norm = (np.array(resized, dtype=np.float32) / 255.0 - self.mean) / self.std
        chw = norm.transpose(2, 0, 1)[np.newaxis, ...]
        return chw.astype(np.float32)

    def extract(self, crop: Union[Image.Image, str, Path, np.ndarray]) -> Dict[str, Any]:
        """
        Extract 512-D L2-normalized embedding and classify flank orientation (Side A/Left vs Side B/Right).
        """
        tensor = self.preprocess(crop)
        emb, flank_logits = self.session.run(None, {self.input_name: tensor})

        # Ensure unit L2 normalization
        emb = emb[0].astype(np.float32)
        norm = np.linalg.norm(emb)
        emb = emb / np.maximum(norm, 1e-12)

        # Softmax for flank orientation: Index 0 = Side A (Left), Index 1 = Side B (Right)
        logits = flank_logits[0].astype(np.float32)
        exp_l = np.exp(logits - np.max(logits))
        probs = exp_l / exp_l.sum()
        side = "A" if probs[0] > probs[1] else "B"
        flank_name = "Left" if side == "A" else "Right"
        confidence = float(probs[0] if side == "A" else probs[1])

        return {
            "embedding": emb.tolist(),
            "flank_side": side,
            "flank_name": flank_name,
            "flank_confidence": confidence,
            "flank_probabilities": {
                "A": float(probs[0]),
                "B": float(probs[1]),
                "Left": float(probs[0]),
                "Right": float(probs[1]),
            },
        }

    def get_embedding(self, crop: Union[Image.Image, str, Path, np.ndarray]) -> np.ndarray:
        """Convenience method returning unit L2-normalized 512-D numpy array."""
        res = self.extract(crop)
        return np.array(res["embedding"], dtype=np.float32)
