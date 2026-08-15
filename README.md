# Pench Tiger Reserve — Camera Trap Intelligence System

> **Hackathon Project** | VNIT | AI-powered tiger monitoring pipeline for Pench Tiger Reserve, Madhya Pradesh.

## What This Does

Processes raw SD-card camera trap image dumps from Pench Tiger Reserve through a 6-stage AI pipeline:

1. **Image Ingestion** — SHA-256 deduplication, EXIF extraction, perceptual hashing  
2. **Blank Triage** — MegaDetector V6 (YOLOv9-c) filters blanks, blurs humans for privacy  
3. **Species Gate** — MobileNetV3 classifier confirms tiger vs. other fauna (leopard/deer/boar/bear)  
4. **Stripe Re-ID** — ResNet-18 + BNNeck generates 256-dim stripe embeddings; matched against persistent gallery  
5. **Database** — All results logged to SQLite with full audit trail  
6. **Movement Analytics** — MCP home range, centroid tracking, alert generation

## Model Performance

| Model | Architecture | Metric | Score |
|---|---|---|---|
| Tiger Classifier | MobileNetV3-Large | Tiger Recall | **100%** |
| Tiger Classifier | MobileNetV3-Large | Other Fauna Recall | **100%** |
| Tiger Re-ID | ResNet-18 + BNNeck | Rank-1 (disjoint eval) | **99.2%** |
| Tiger Re-ID | ResNet-18 + BNNeck | mAP (107 identities) | **99.1%** |

> Classifier trained on ATRW tiger crops + 1,500 iNaturalist images of Indian Leopard, Sambar, Chital, Wild Boar, Sloth Bear, Gaur.  
> Re-ID evaluated with strict disjoint gallery/query split — no self-matching.

## Project Structure

```
VNIT/
├── app/
│   └── dashboard.py          # Streamlit monitoring dashboard
├── configs/
│   └── default.yaml          # All pipeline thresholds (edit here, not code)
├── scripts/
│   ├── 00_audit_atrw.py           # Audit/prepare ATRW dataset
│   ├── 01_download_inaturalist_negatives.py  # Download real confuser species
│   ├── 02_evaluate_models.py      # Run full evaluation → evaluation_report.json
│   └── export_onnx.py             # Export trained .pth checkpoints to ONNX
├── src/
│   ├── analytics/            # Movement engine, MCP home range, alerts
│   ├── classification/       # Tiger classifier model + training
│   ├── database/             # SQLite schema and connection management
│   ├── detection/            # MDV6 ONNX inference wrapper
│   ├── ingest/               # Image inventory, EXIF, hashing
│   ├── maps/                 # GPS/GeoJSON utilities
│   ├── pipeline/
│   │   └── run_pipeline.py   # MASTER end-to-end pipeline entry point
│   └── reid/
│       ├── backbone.py       # ResNet-18 + BNNeck Re-ID model
│       ├── gallery.py        # Persistent centroid-based embedding gallery
│       └── train_reid.py     # Re-ID training script
├── data/                     # [NOT committed — see setup below]
├── models/                   # [NOT committed — download separately]
├── .gitignore
├── requirements.txt
├── PROJECT_CONFIG.md         # Technical decisions and design rationale
└── RUNBOOK.md                # Step-by-step operational commands
```

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
# CUDA 12.6 build of PyTorch is required for training:
pip install torch==2.13.0+cu126 torchvision==0.28.0+cu126 --extra-index-url https://download.pytorch.org/whl/cu126
```

### 2. Download Model Weights
Models are too large for git. Get from the shared drive link (ask team):
```
models/pretrained/MDV6-yolov9-c.onnx          (101 MB) — MegaDetector V6
models/checkpoints/classifier/best_tiger_classifier.pth  (14 MB)
models/checkpoints/reid/best_atrw_reid.pth    (45 MB)
models/exported/classifier/tiger_classifier.onnx  (14 MB)
models/exported/reid/tiger_reid.onnx              (45 MB)
```

### 3. Download Training Data (optional — for retraining only)
```bash
# ATRW Dataset (~2.5 GB)
# Download from: https://cvwc2019.github.io/challenge.html
# Expected layout: data/atrw/reid/train/*.jpg, data/atrw/manifests/atrw_all.csv

# Confuser species negatives (iNaturalist — ~1,500 images)
python scripts/01_download_inaturalist_negatives.py
```

### 4. Initialise the Database
```bash
python -c "from src.database.db import WildlifeDB; WildlifeDB()"
```

## Running the Pipeline

```bash
# Process a folder of camera trap images
python -m src.pipeline.run_pipeline "path/to/sd_card_images" "run_id_001"

# Launch the monitoring dashboard
streamlit run app/dashboard.py
```

## Retraining

```bash
# Retrain species classifier (needs data/negatives/ downloaded first)
python -m src.classification.train_classifier

# Retrain Re-ID model
python -m src.reid.train_reid

# Export updated checkpoints to ONNX
python scripts/export_onnx.py

# Full evaluation suite → models/checkpoints/evaluation_report.json
python scripts/02_evaluate_models.py
```

## Database Schema

The SQLite database (`data/pench_wildlife.db`) has 8 tables:

| Table | Purpose |
|---|---|
| `images` | Every ingested image with SHA-256, perceptual hash, triage status |
| `stations` | Camera trap station metadata, GPS coordinates, zone (core/buffer) |
| `detections` | MDV6 bounding boxes with class + confidence |
| `crops` | Tiger-confirmed crops with quality score |
| `individuals` | Tiger identity registry (provisional + confirmed) |
| `identity_matches` | Re-ID decision per crop: `AUTO_MATCH` / `REVIEW_AMBIGUOUS` / `AUTO_ENROLL_NEW` |
| `movement_records` | Per-individual spatial analytics, MCP area, centroid |
| `alerts` | Automated alerts (boundary crossing, high movement, etc.) |
| `runs` | Pipeline run metadata |

## For Teammates

**Our deliverables (detection + Re-ID team):**
- ✅ Trained ONNX models — drop into `models/exported/`
- ✅ `pench_wildlife.db` — fully populated after a pipeline run
- ✅ `identity_matches` table — your primary data source for behavioral analysis
- ✅ `movement_records` table — MCP home range already computed per individual
- ✅ `alerts` table — triggers you can hook to notifications

**Pipeline output format for behavioral algorithms:**  
Each tiger sighting is stored as a row in `identity_matches` with:
- `individual_id` — tiger ID (e.g. `TIGER_042`, `PENCH_UNK_a1b2c3`)
- `decision` — `AUTO_MATCH` (high confidence), `REVIEW_AMBIGUOUS` (needs human), `AUTO_ENROLL_NEW`
- `top_1_dist` — cosine distance (0 = identical, 1 = completely different)
- `decision_confidence` — 1 - top_1_dist

**Frontend note:** Dashboard is at `app/dashboard.py`. DB path is `data/pench_wildlife.db`.

## Key Configuration

Edit `configs/default.yaml` to tune thresholds without touching code:
```yaml
classification:
  tiger_conf_threshold: 0.50   # Lower = more sensitive, more false positives
reid:
  auto_match_distance_threshold: 0.35  # Lower = stricter matching
  ambiguity_margin_threshold: 0.08     # Min gap between top-1 and top-2 for auto-match
```
