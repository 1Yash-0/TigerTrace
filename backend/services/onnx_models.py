"""
Shared ONNX model registry for TigerTrace API services.

All inference in the API process goes through ONNX Runtime here. Importing
PyTorch in a request path adds ~600MB RSS, which OOM-kills the process on
small hosting instances (Render free tier = 512MB); onnxruntime sessions
cost ~1-2% of that for these small models.
"""
import os
import threading

import numpy as np

_TIGER_TRACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "TigerTrace"))
CLASSIFIER_ONNX = os.path.join(_TIGER_TRACE_DIR, "models", "exported", "classifier", "tiger_classifier.onnx")
REID_ONNX = os.path.join(_TIGER_TRACE_DIR, "models", "exported", "reid", "tiger_reid.onnx")

_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

_lock = threading.Lock()
_sessions = {}


def _get_session(path: str):
    """Thread-safe lazy session singleton; None when the model file is absent."""
    if path not in _sessions:
        with _lock:
            if path not in _sessions:
                if not os.path.exists(path):
                    _sessions[path] = None
                else:
                    import onnxruntime as ort

                    opts = ort.SessionOptions()
                    opts.intra_op_num_threads = 2
                    opts.inter_op_num_threads = 1
                    opts.log_severity_level = 3
                    _sessions[path] = ort.InferenceSession(
                        path, sess_options=opts, providers=["CPUExecutionProvider"]
                    )
    return _sessions[path]


def preprocess_image(image_path: str, width: int, height: int):
    """Load and normalize an image to a (1, 3, H, W) float32 tensor; None on failure."""
    try:
        from PIL import Image

        im = Image.open(image_path).convert("RGB").resize((width, height), Image.BILINEAR)
        arr = np.asarray(im).astype(np.float32) / 255.0
        arr = (arr - _MEAN) / _STD
        return np.transpose(arr, (2, 0, 1))[None].astype(np.float32)
    except Exception:
        return None


def classifier_probs(image_path: str):
    """Species gate: softmax over [tiger, non_tiger]; None when unavailable."""
    sess = _get_session(CLASSIFIER_ONNX)
    if sess is None:
        return None
    tensor = preprocess_image(image_path, 224, 224)
    if tensor is None:
        return None
    try:
        logits = sess.run(None, {"x": tensor})[0][0]
        exp = np.exp(logits - logits.max())
        return (exp / exp.sum()).tolist()
    except Exception:
        return None


def reid_embedding(image_path: str):
    """256-D L2-normalized stripe embedding; None when unavailable."""
    sess = _get_session(REID_ONNX)
    if sess is None:
        return None
    tensor = preprocess_image(image_path, 128, 256)
    if tensor is None:
        return None
    try:
        emb = sess.run(None, {"x": tensor})[0][0].astype(np.float32)
        norm = np.linalg.norm(emb)
        return emb / norm if norm > 1e-8 else None
    except Exception:
        return None


def deterministic_embedding(seed_index: int = 1):
    """Stable fallback embedding when no model/image is available (no torch needed)."""
    rng = np.random.default_rng(100 + seed_index)
    vec = rng.standard_normal(256).astype(np.float32)
    return [round(float(x), 6) for x in (vec / np.linalg.norm(vec)).tolist()]
