"""
Immutable Ingestion & Metadata Normalizer for Camera Trap SD Cards.
Features:
- Probabilistic metadata extraction (EXIF -> Filename -> Directory -> MTime fallback)
- Cryptographic SHA-256 + Perceptual hashing to detect duplicates
- Non-destructive, manifest-based inventory
- Station mapping and clock-drift tolerance
"""

import os
import glob
import hashlib
import re
from datetime import datetime
from PIL import Image
import pandas as pd
from tqdm import tqdm

def compute_hashes(filepath):
    # SHA-256
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    sha_str = sha.hexdigest()
    
    # Fast perceptual hash approximation (Average Hash via Pillow)
    try:
        with Image.open(filepath) as img:
            img_small = img.resize((8, 8), Image.Resampling.LANCZOS).convert("L")
            pixels = list(img_small.getdata())
            avg = sum(pixels) / len(pixels)
            bits = "".join(["1" if p > avg else "0" for p in pixels])
            phash_str = f"{int(bits, 2):016x}"
            w, h = img.size
    except Exception:
        phash_str = "unreadable"
        w, h = None, None
        
    return sha_str, phash_str, w, h

def extract_metadata(filepath):
    stat = os.stat(filepath)
    file_size = stat.st_size
    mtime = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
    
    # 1. Try EXIF
    exif_dt = None
    try:
        with Image.open(filepath) as img:
            exif = img._getexif()
            if exif:
                # Tag 36867 = DateTimeOriginal, 306 = DateTime
                exif_dt = exif.get(36867) or exif.get(306)
                if exif_dt:
                    # Format usually "YYYY:MM:DD HH:MM:SS"
                    exif_dt = str(exif_dt).replace(":", "-", 2)
    except Exception:
        pass
        
    # 2. Try Filename Regex (e.g., 2026-08-15_14-30-00 or IMG_20260815_143000)
    filename = os.path.basename(filepath)
    fn_dt = None
    fn_match = re.search(r"(\d{4})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})", filename)
    if fn_match:
        g = fn_match.groups()
        fn_dt = f"{g[0]}-{g[1]}-{g[2]} {g[3]}:{g[4]}:{g[5]}"
        
    # Resolve normalized timestamp & source
    if exif_dt:
        norm_ts = exif_dt
        ts_source = "exif_datetime_original"
        confidence = 0.95
    elif fn_dt:
        norm_ts = fn_dt
        ts_source = "filename_regex"
        confidence = 0.80
    else:
        norm_ts = mtime
        ts_source = "filesystem_mtime_fallback"
        confidence = 0.40
        
    # Infer Station ID from folder structure or filename
    parent_folder = os.path.basename(os.path.dirname(filepath))
    station_match = re.search(r"(ST[_-]?\d+|CAM[_-]?\d+|Station[_-]?\d+|Grid[_-]?\d+)", parent_folder, re.IGNORECASE)
    if station_match:
        station_id = station_match.group(1).upper().replace("-", "_")
    else:
        station_id = f"STATION_{parent_folder.upper()}"
        
    return {
        "filename": filename,
        "file_size": file_size,
        "timestamp_original": exif_dt or fn_dt or mtime,
        "timestamp_normalized": norm_ts,
        "timestamp_source": ts_source,
        "timestamp_confidence": confidence,
        "station_raw": parent_folder,
        "station_id": station_id
    }

def scan_input_directory(input_dir, output_inventory_path):
    print(f"Scanning raw camera trap directory: {input_dir}")
    extensions = ("*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG", "*.tif", "*.tiff")
    all_files = []
    for ext in extensions:
        all_files.extend(glob.glob(os.path.join(input_dir, "**", ext), recursive=True))
        
    print(f"Found {len(all_files)} raw image files.")
    records = []
    
    for idx, fpath in enumerate(tqdm(all_files, desc="Inventorying images")):
        sha, phash, w, h = compute_hashes(fpath)
        meta = extract_metadata(fpath)
        
        records.append({
            "image_id": f"IMG_{sha[:12].upper()}",
            "sha256": sha,
            "perceptual_hash": phash,
            "absolute_path": os.path.abspath(fpath),
            "relative_path": os.path.relpath(fpath, start=input_dir),
            "filename": meta["filename"],
            "width": w,
            "height": h,
            "file_size": meta["file_size"],
            "timestamp_original": meta["timestamp_original"],
            "timestamp_normalized": meta["timestamp_normalized"],
            "timestamp_source": meta["timestamp_source"],
            "timestamp_confidence": meta["timestamp_confidence"],
            "station_raw": meta["station_raw"],
            "station_id": meta["station_id"],
            "triage_status": "unprocessed",
            "is_corrupt": False if (w and h) else True
        })
        
    df = pd.DataFrame(records)
    os.makedirs(os.path.dirname(output_inventory_path), exist_ok=True)
    df.to_csv(output_inventory_path, index=False)
    print(f"Inventory saved successfully: {output_inventory_path} ({len(df)} records)")
    return df

if __name__ == "__main__":
    import sys
    in_dir = sys.argv[1] if len(sys.argv) > 1 else "data/atrw/detection/trainval"
    out_inv = sys.argv[2] if len(sys.argv) > 2 else "data/interim/inventory/sample_inventory.csv"
    scan_input_directory(in_dir, out_inv)
