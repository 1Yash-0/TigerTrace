# 🐅 Pench AI — Camera Trap Intelligence Platform

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%20%7C%20React%20%7C%20Tailwind-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.10+-green)
![ML](https://img.shields.io/badge/ML-PyTorch%20%7C%20ONNX%20%7C%20MegaDetector-orange)

An end-to-end, locally runnable prototype designed specifically for the **Pench Tiger Reserve**. This platform solves the heavy manual burden of processing automated camera trap data by providing automated triage, individual tiger identification, geospatial tracking, and behavioral anomaly detection.

---

## 🌟 Core Features & Pipelines

This prototype directly addresses the four key requirements of the hackathon problem statement using real machine learning models integrated from the **TigerTrace** pipeline.

### Part 1: Automated Triage (Blank Image Filtering)
Camera traps are often triggered by wind or moving grass, filling up SD cards with empty images.
*   **Function:** Automatically scans bulk folders of camera trap images.
*   **Logic:** Uses **MegaDetector V6 (YOLOv9-c)** running via ONNX Runtime to detect animals with >95% recall.
*   **Outcome:** Empty images are securely staged in a quarantine folder, while valid images are passed forward, saving hundreds of hours of manual review.

### Part 2: Individual Tiger Identification
Once an animal is detected, we determine if it is a tiger, and *which* individual it is.
*   **Function:** Uses a **MobileNetV3** species gate to filter out non-tigers, and a **ResNet-18** Re-ID network to extract 256-dimensional embeddings of tiger flank stripes.
*   **Human-in-the-Loop:** If the model's confidence indicates ambiguity between two known tigers, the image is sent to a Human Review Queue on the dashboard for a ranger to make the final call.

### Part 3: Geospatial Intelligence (Home Ranges)
Understanding where tigers live, hunt, and overlap.
*   **Function:** Calculates and maps the exact territorial boundaries of each tiger.
*   **Logic:** Uses the **Minimum Convex Polygon (MCP)** method combined with the Shoelace formula on historical capture coordinates.
*   **Outcome:** Renders interactive polygons on a Leaflet map, calculates centroids, and detects exact overlapping areas between rival tigers.

### Part 4: Deviation & Trend Alerting
Moving beyond passive data into proactive intelligence.
*   **Function:** A rule-based engine that monitors historical data against real-time captures.
*   **Alert Rules:**
    1.  **Prolonged Absence:** Alerts if a tiger hasn't been seen in X days.
    2.  **Range Shift:** Alerts if a tiger's central activity point shifts by more than 15km.
    3.  **Village Proximity:** Critical alerts if a tiger is captured at a camera station adjacent to human settlements.
    4.  **New Territory:** Alerts if a tiger is captured in a zone it has never visited before.

---

## 🏗️ System Architecture & Tech Stack

This project uses a decoupled web stack to separate heavy ML inference from the user interface.

*   **Frontend UI:** Next.js 14, React, Tailwind CSS, Leaflet Maps, Lucide Icons.
*   **Backend API:** FastAPI, Uvicorn, SQLAlchemy.
*   **Database:** SQLite (Stores tiger profiles, capture logs, home ranges, and generated alerts).
*   **ML Engine:** PyTorch, Torchvision, ONNXRuntime, OpenCV, scikit-learn.

---

## 🚀 Setup & Installation Guide

### 1. Prerequisites
Ensure you have **Python 3.10+** and **Node.js 18+** installed on your system.

### 2. Backend Setup
The backend runs the FastAPI server and the AI models.
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Download the required MegaDetector V6 ONNX Model (~101MB)
python -c "import urllib.request; import os; os.makedirs('TigerTrace/models/pretrained', exist_ok=True); urllib.request.urlretrieve('https://zenodo.org/api/records/15398270/files/MDV6-yolov9-c.onnx/content', 'TigerTrace/models/pretrained/MDV6-yolov9-c.onnx')"

# Start the server
python -m uvicorn main:app --reload
```
*The backend API will be live at `http://localhost:8000`. You can test endpoints via Swagger UI at `http://localhost:8000/docs`.*

### 3. Frontend Setup
The frontend runs the interactive user dashboard.
```bash
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```
*The dashboard will be live at `http://localhost:3000`.*

---

## 📁 Directory Structure
```text
Viksit4Nagpur/
├── backend/
│   ├── data/                 # SQLite Database and historical images
│   ├── models/               # Extracted AI model weights
│   ├── services/             # Core Python API Logic (Triage, Alerts, Geo)
│   ├── TigerTrace/           # The PyTorch/ONNX ML Computer Vision Pipeline
│   ├── main.py               # FastAPI application entrypoint
│   └── database.py           # Database schema & initialization
└── frontend/
    ├── app/                  # Next.js Pages (Triage, Identification, Map, Alerts)
    ├── components/           # Reusable React UI Components
    └── public/               # Static assets & map markers
```

---

## ✅ Development Roadmap
- [x] Integrate the trained Part 1 YOLO/MDV6 model into `triage_service.py`.
- [x] Map the Part 2 model's integer outputs to the exact dataset class names using TigerTrace Re-ID.
- [x] Add Left-Flank and Right-Flank logic (handled natively via persistent gallery embeddings).
- [x] Implement CSV import for real forest department camera trap logs (via SQLite seed script).
