"""
Shared ONNX model registry for TigerTrace API services.

All inference in the API process goes through ONNX Runtime here.
Upgraded to tigertrace_ptr_v2_side_aware.onnx (Swin-Transformer MegaDescriptor-B with
ArcFace + Flank Router head) for 512-D biometric stripe extraction and flank orientation.
"""
import os
import threading
from typing import Optional, Union, Dict, Any

import numpy as np

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_TIGER_TRACE_DIR = os.path.abspath(os.path.join(_BACKEND_DIR, "TigerTrace"))
_WORKSPACE_DIR = os.path.abspath(os.path.join(_BACKEND_DIR, ".."))

CLASSIFIER_ONNX_CANDIDATES = [
    os.path.join(_TIGER_TRACE_DIR, "models", "exported", "classifier", "tiger_classifier.onnx"),
    os.path.join(_WORKSPACE_DIR, "models", "exported", "classifier", "tiger_classifier.onnx"),
]
CLASSIFIER_ONNX = next((p for p in CLASSIFIER_ONNX_CANDIDATES if os.path.exists(p)), CLASSIFIER_ONNX_CANDIDATES[0])

# The Re-ID weights to use can be swapped per deployment via env var, e.g.
# REID_ONNX_FILENAME=tigertrace_ptr_v2_side_aware_int8.onnx on 512 MB hosts
# (INT8: 94.7 MB file / ~170 MB resident, measured equal accuracy, 1.7x faster).
REID_ONNX_FILENAME = os.environ.get("REID_ONNX_FILENAME", "tigertrace_ptr_v2_side_aware.onnx")

REID_ONNX_CANDIDATES = [
    os.path.join(_WORKSPACE_DIR, "models", "tigertrace_ptr_v2_side_aware", REID_ONNX_FILENAME),
    os.path.join(_TIGER_TRACE_DIR, "models", "tigertrace_ptr_v2_side_aware", REID_ONNX_FILENAME),
    os.path.join(_WORKSPACE_DIR, "models", "exported", "reid", REID_ONNX_FILENAME),
    os.path.join(_TIGER_TRACE_DIR, "models", "exported", "reid", REID_ONNX_FILENAME),
    os.path.join(_TIGER_TRACE_DIR, "models", "exported", "reid", "tiger_reid.onnx"),
]
REID_ONNX = next((p for p in REID_ONNX_CANDIDATES if os.path.exists(p)), REID_ONNX_CANDIDATES[0])

_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

_lock = threading.Lock()
_sessions = {}


def _get_session(path: str):
    """Thread-safe lazy session singleton. Raises FileNotFoundError when the
    model file is absent — inference must never silently degrade."""
    if path not in _sessions:
        with _lock:
            if path not in _sessions:
                if not os.path.exists(path):
                    raise FileNotFoundError(
                        f"Required ONNX model not found: {path}. "
                        f"Download it with: python scripts/download_models.py"
                    )
                import onnxruntime as ort

                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                opts.inter_op_num_threads = 1
                opts.log_severity_level = 3
                providers = (
                    ["CUDAExecutionProvider", "CPUExecutionProvider"]
                    if "CUDAExecutionProvider" in ort.get_available_providers()
                    else ["CPUExecutionProvider"]
                )
                _sessions[path] = ort.InferenceSession(
                    path, sess_options=opts, providers=providers
                )
    return _sessions[path]


def preprocess_image(image_input: Union[str, Any], width: int = 224, height: int = 224, bicubic: bool = False):
    """Load and normalize an image to a (1, 3, H, W) float32 tensor; None on failure."""
    try:
        from PIL import Image

        if isinstance(image_input, str):
            im = Image.open(image_input)
        elif isinstance(image_input, np.ndarray):
            im = Image.fromarray(image_input)
        else:
            im = image_input

        resample = Image.Resampling.BICUBIC if bicubic else Image.BILINEAR
        im = im.convert("RGB").resize((width, height), resample)
        arr = np.asarray(im).astype(np.float32) / 255.0
        arr = (arr - _MEAN) / _STD
        return np.transpose(arr, (2, 0, 1))[None].astype(np.float32)
    except Exception:
        return None


def warmup_sessions():
    """
    Create both ONNX sessions and run one dummy inference each, so the first
    real request does not pay session creation + graph optimization (which on
    a 0.1-CPU instance adds tens of seconds to the first click after boot).
    Raises if weights are missing — callers decide how to surface that.
    """
    sess = _get_session(CLASSIFIER_ONNX)
    dummy = np.zeros((1, 3, 224, 224), dtype=np.float32)
    sess.run(None, {sess.get_inputs()[0].name: dummy})

    sess = _get_session(REID_ONNX)
    sess.run(None, {sess.get_inputs()[0].name: dummy})
    return True


def classifier_probs(image_path: str):
    """Species gate: softmax over [tiger, non_tiger]; None only when the
    specific image cannot be processed (a missing model raises instead)."""
    sess = _get_session(CLASSIFIER_ONNX)
    tensor = preprocess_image(image_path, 224, 224, bicubic=False)
    if tensor is None:
        return None
    try:
        input_name = sess.get_inputs()[0].name
        logits = sess.run(None, {input_name: tensor})[0][0]
        exp = np.exp(logits - logits.max())
        return (exp / exp.sum()).tolist()
    except Exception:
        return None


def reid_extract(image_input: Union[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract 512-D L2-normalized embedding and flank orientation from cropped tiger image.
    Uses tigertrace_ptr_v2_side_aware.onnx. Returns None only when the specific
    image cannot be processed; a missing model raises FileNotFoundError.
    """
    sess = _get_session(REID_ONNX)
    tensor = preprocess_image(image_input, 224, 224, bicubic=True)
    if tensor is None:
        return None
    try:
        input_name = sess.get_inputs()[0].name
        outputs = sess.run(None, {input_name: tensor})
        
        emb = outputs[0][0].astype(np.float32)
        norm = np.linalg.norm(emb)
        emb = emb / np.maximum(norm, 1e-12)

        # If model provides flank_logits as second output
        if len(outputs) > 1:
            flank_logits = outputs[1][0].astype(np.float32)
            exp_l = np.exp(flank_logits - np.max(flank_logits))
            probs = exp_l / exp_l.sum()
            side = "A" if probs[0] > probs[1] else "B"
            flank_name = "Left" if side == "A" else "Right"
            confidence = float(probs[0] if side == "A" else probs[1])
            probs_dict = {"A": float(probs[0]), "B": float(probs[1]), "Left": float(probs[0]), "Right": float(probs[1])}
        else:
            side = "Unknown"
            flank_name = "Unknown"
            confidence = 1.0
            probs_dict = {}

        return {
            "embedding": emb,
            "flank_side": side,
            "flank_name": flank_name,
            "flank_confidence": confidence,
            "flank_probabilities": probs_dict,
        }
    except Exception:
        return None


def reid_embedding(image_input: Union[str, Any]):
    """512-D L2-normalized stripe embedding; None only when the specific image
    cannot be processed (a missing model raises instead)."""
    res = reid_extract(image_input)
    if res is not None:
        return res["embedding"]
    return None
