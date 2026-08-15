# Pench Tiger Reserve Camera-Trap Intelligence System
## Project Configuration & Architectural Assumptions

### 1. Core Principles & Assumptions
* **Project Name:** Automated Camera Trap Triage and Individual Tiger Movement Intelligence System for Pench Tiger Reserve
* **Primary Target Species:** Bengal Tiger (*Panthera tigris tigris*)
* **Training & Transfer Dataset:** ATRW (Amur Tiger Re-identification in the Wild, ICCV 2019 CVWC)
* **Pretrained Animal Detector:** MegaDetector V6 MIT YOLOv9-compact (`MDV6-mit-yolov9-c` / `MDV6-yolov9-c.onnx`)
* **Inference Hardware Target:** 100% Offline Standard Laptop CPU (without dedicated GPU, without internet)
* **Training / Fine-Tuning Hardware:** NVIDIA GeForce RTX 4060 Laptop GPU (CUDA 12.6, PyTorch 2.13)
* **Data Integrity Invariant:** Raw camera-trap images off field SD cards are **NEVER modified or deleted**. All blank quarantining is purely metadata/manifest-driven and 100% reversible.
* **Open-Set Decision Safety:** Ambiguous tiger identities or low-quality crops are routed to a Human Review Queue rather than blindly guessed.

### 2. Environment Freeze
* **Python Version:** 3.11.9
* **PyTorch Version:** 2.13.0+cu126 (CUDA enabled)
* **Torchvision Version:** 0.28.0+cu126
* **ONNX Runtime:** 1.20+ (CPU & GPU execution providers)
* **Core Libraries:** OpenCV 4.12, Pillow 10.4, Pandas 2.3, Scikit-Learn 1.7, Shapely 2.1, Streamlit 1.50, SQLite3

### 3. Model Architecture Stack
1. **Stage 1 (Blank Triage & Localization):** MDV6 YOLOv9-c (~9.7M params, ONNX CPU). Outputs: `0: animal`, `1: person`, `2: vehicle`.
2. **Stage 2 (Human Privacy Shield):** Automatic bounding-box blurring on Class 1 (`person`) prior to database storage or review display.
3. **Stage 3 (Tiger Species Classification):** MobileNetV3-Large (224×224, ~4.2M params) to filter non-tiger fauna.
4. **Stage 4 (Flank Isolation & Quality Gate):** Padded bounding box + keypoint-guided flank region extraction + image sharpness/brightness quality scoring.
5. **Stage 5 (Stripe Re-ID Metric Embedding):** ResNet-18 (256×128 flank input, 256-dimensional L2-normalized embedding, batch-hard triplet + ArcFace/CE loss).
6. **Stage 6 (Open-Set Identity Retrieval):** Nearest-neighbor cosine distance with top-1/top-2 margin thresholds and new individual auto-enrollment (`PENCH_UNK_XXXX`).
7. **Stage 7 (Spatial Intelligence & Effort Alerts):** Minimum Convex Polygon (MCP), activity centroid tracking, and trap-night survey-effort corrected movement alerts.
