# Operational Runbook: Pench Tiger Reserve Intelligence System

## 1. Quick Start

### 1.1 Ingest & Process Field SD Card Images
Run the master end-to-end pipeline on any raw folder of camera trap images:
```powershell
python -m src.pipeline.run_pipeline "data/raw/pench_runs/run_001" "pench_run_001"
```

### 1.2 Launch Offline Operator Dashboard
Start the local review and mapping UI:
```powershell
streamlit run app/dashboard.py
```

---

## 2. Pipeline Execution Stages

```
Raw SD-Card Folder
      ↓
[Stage 1] Inventory & Metadata Normalization (`src.ingest.inventory`)
      ↓
[Stage 2] MegaDetector V6 Blank Triage & Privacy Blur (`src.detection.mdv6_inference`)
      ↓
[Stage 3] MobileNetV3-Large Tiger Species Verification (`src.classification.tiger_classifier`)
      ↓
[Stage 4] ResNet-18 Flank Stripe Re-ID Embedding (`src.reid.backbone`)
      ↓
[Stage 5] Offline SQLite Persistence (`src.database.db`)
      ↓
[Stage 6] Movement Intelligence, Centroid Shift & Effort Alerts (`src.analytics.movement_engine`)
      ↓
[Stage 7] Streamlit Operator Review & Audit Interface (`app/dashboard.py`)
```

---

## 3. Retraining & Adaptation on Local Pench Data

### 3.1 Retrain Tiger Species Classifier
```powershell
python -m src.classification.train_classifier
```

### 3.2 Retrain Stripe Re-ID Metric Learning Model
```powershell
python -m src.reid.train_reid
```

---

## 4. Operational Safety Invariants
1. **Zero Data Deletion:** Raw images are never altered or deleted. Blanks are quarantined purely via manifest flags.
2. **Human Privacy:** Any person detected (Class 1) is automatically blurred before review displays.
3. **Open-Set Protection:** Ambiguous or low-quality flank matches are routed to the Human Review Queue instead of guessing IDs.
