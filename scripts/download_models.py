"""
Download and verify the external model weights TigerTrace requires but does
not vendor in git.

Currently managed:
  - MDV6-yolov9-c.onnx  (MegaDetector V6, Microsoft AI for Good Lab)
    Zenodo record 15398270 — ~101 MB, md5-verified after download.

The detector is mandatory: blank filtering and person privacy-blurring depend
on real MDV6 detections, so the pipeline refuses to run (no heuristic fallback)
when the weights are missing.

Usage:
    python scripts/download_models.py
"""
import hashlib
import sys
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODELS = [
    {
        "name": "MDV6-yolov9-c.onnx",
        "url": "https://zenodo.org/api/records/15398270/files/MDV6-yolov9-c.onnx/content",
        "dest": PROJECT_ROOT / "models" / "pretrained" / "MDV6-yolov9-c.onnx",
        "size": 101_437_043,
        "md5": "3db7988385714066c1515dde6ab56e4c",
    },
]


def md5_of(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    failed = False
    for spec in MODELS:
        dest = spec["dest"]
        if dest.exists() and md5_of(dest) == spec["md5"]:
            print(f"[OK]      {dest.name}: present and verified ({dest.stat().st_size} bytes)")
            continue
        if dest.exists():
            print(f"[RETRY]   {dest.name}: found but md5 mismatch — re-downloading")
            dest.unlink()
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"[DOWNLOAD]{dest.name} ({spec['size'] / 1e6:.1f} MB) from {spec['url']}")
        try:
            urllib.request.urlretrieve(spec["url"], dest)
        except Exception as e:
            print(f"[FAIL]    {dest.name}: download error: {e}")
            failed = True
            continue
        digest = md5_of(dest)
        if digest != spec["md5"]:
            dest.unlink()
            print(f"[FAIL]    {dest.name}: md5 mismatch (got {digest}, expected {spec['md5']}) — file deleted")
            failed = True
            continue
        print(f"[OK]      {dest.name}: downloaded and verified")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
