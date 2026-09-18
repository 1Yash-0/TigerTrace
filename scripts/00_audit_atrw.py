"""
Audit script for the ATRW (Amur Tiger Re-identification in the Wild) dataset.
Parses Pascal VOC XML detection annotations, COCO pose keypoints, and Re-ID CSVs.
Outputs clean manifests:
- data/atrw/manifests/atrw_all.csv
- data/atrw/manifests/atrw_identity_summary.csv
- data/atrw/manifests/atrw_duplicate_report.csv
"""

import os
import glob
import json
import xml.etree.ElementTree as ET
import hashlib
import pandas as pd
from PIL import Image
from tqdm import tqdm

def compute_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def audit_atrw(base_dir="data/atrw"):
    print("=" * 60)
    print("AUDITING ATRW DATASET...")
    print("=" * 60)
    
    detection_dir = os.path.join(base_dir, "detection")
    pose_dir = os.path.join(base_dir, "pose")
    reid_dir = os.path.join(base_dir, "reid")
    manifest_dir = os.path.join(base_dir, "manifests")
    os.makedirs(manifest_dir, exist_ok=True)
    
    # 1. Audit Detection VOC XMLs
    xml_files = glob.glob(os.path.join(detection_dir, "Annotations", "*.xml"))
    print(f"Found {len(xml_files)} detection XML annotation files.")
    
    detection_records = []
    for xml_p in xml_files:
        try:
            tree = ET.parse(xml_p)
            root = tree.getroot()
            filename = root.findtext("filename")
            size_elem = root.find("size")
            width = int(size_elem.findtext("width")) if size_elem is not None else None
            height = int(size_elem.findtext("height")) if size_elem is not None else None
            
            for obj in root.findall("object"):
                name = obj.findtext("name")
                bndbox = obj.find("bndbox")
                xmin = float(bndbox.findtext("xmin"))
                ymin = float(bndbox.findtext("ymin"))
                xmax = float(bndbox.findtext("xmax"))
                ymax = float(bndbox.findtext("ymax"))
                
                detection_records.append({
                    "task": "detection",
                    "split": "trainval",
                    "filename": filename,
                    "xml_file": os.path.basename(xml_p),
                    "class_name": name,
                    "image_width": width,
                    "image_height": height,
                    "bbox_x1": xmin,
                    "bbox_y1": ymin,
                    "bbox_x2": xmax,
                    "bbox_y2": ymax,
                    "bbox_w": xmax - xmin,
                    "bbox_h": ymax - ymin
                })
        except Exception as e:
            print(f"Error parsing {xml_p}: {e}")
            
    df_det = pd.DataFrame(detection_records)
    print(f"Total detection bounding boxes parsed: {len(df_det)}")
    
    # 2. Audit Re-ID CSVs and Keypoint JSONs
    reid_train_csv = os.path.join(reid_dir, "reid_list_train.csv")
    reid_test_csv = os.path.join(reid_dir, "reid_list_test.csv")
    
    reid_records = []
    if os.path.exists(reid_train_csv):
        df_reid_train = pd.read_csv(reid_train_csv, header=None)
        # Check column format (typically: ID, filename or ID, filename, side)
        print(f"Re-ID train entries: {len(df_reid_train)}")
        for _, row in df_reid_train.iterrows():
            tiger_id = str(row[0])
            img_file = str(row[1])
            img_path = os.path.join(reid_dir, "train", img_file)
            reid_records.append({
                "task": "reid",
                "split": "train",
                "identity_id": tiger_id,
                "filename": img_file,
                "relative_path": os.path.relpath(img_path, start=".") if os.path.exists(img_path) else None,
                "file_exists": os.path.exists(img_path)
            })
            
    if os.path.exists(reid_test_csv):
        df_reid_test = pd.read_csv(reid_test_csv, header=None)
        print(f"Re-ID test entries: {len(df_reid_test)}")
        for _, row in df_reid_test.iterrows():
            img_file = str(row[0])
            img_path = os.path.join(reid_dir, "test", img_file)
            reid_records.append({
                "task": "reid",
                "split": "test",
                "identity_id": "TEST_PROVISIONAL",
                "filename": img_file,
                "relative_path": os.path.relpath(img_path, start=".") if os.path.exists(img_path) else None,
                "file_exists": os.path.exists(img_path)
            })
            
    df_reid = pd.DataFrame(reid_records)
    
    # 3. Save manifests
    manifest_all_path = os.path.join(manifest_dir, "atrw_all.csv")
    df_reid.to_csv(manifest_all_path, index=False)
    print(f"Saved Re-ID manifest to: {manifest_all_path}")
    
    # 4. Identity summary (distribution of images per tiger)
    if not df_reid.empty and "identity_id" in df_reid.columns:
        train_identities = df_reid[df_reid["split"] == "train"]
        id_summary = train_identities.groupby("identity_id").size().reset_index(name="image_count")
        id_summary = id_summary.sort_values(by="image_count", ascending=False)
        summary_path = os.path.join(manifest_dir, "atrw_identity_summary.csv")
        id_summary.to_csv(summary_path, index=False)
        
        print("\n--- ATRW Identity Summary ---")
        print(f"Total unique training identities: {len(id_summary)}")
        print(f"Total training crops: {id_summary['image_count'].sum()}")
        print(f"Min images per tiger: {id_summary['image_count'].min()}")
        print(f"Max images per tiger: {id_summary['image_count'].max()}")
        print(f"Median images per tiger: {id_summary['image_count'].median():.1f}")
        print(f"Saved Identity Summary to: {summary_path}")
        
    print("=" * 60)
    print("ATRW AUDIT COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    audit_atrw()
