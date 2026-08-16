# Pench AI — Camera Trap Intelligence Platform

An end-to-end prototype designed for the **Pench Tiger Reserve**, addressing the problem of automated camera trap processing, individual tiger identification, geospatial tracking, and behavioral anomaly detection.

---

## 🏗️ System Architecture

This project is split into a modern web stack to separate the heavy machine learning inference from the user interface.

*   **Backend:** Python 3 (FastAPI) — Handles ML model loading, SQLite database connections, and geospatial calculations.
*   **Frontend:** Next.js (React / TypeScript) — A beautiful, dark-themed dashboard built with Tailwind CSS and Leaflet for mapping.
*   **Database:** SQLite — Stores tiger profiles, capture logs, home ranges, and generated alerts.

---

## 🎯 The Four Pipelines

This prototype directly solves the four key requirements of the hackathon problem statement:

### Part 1: Automated Triage (Blank Image Filtering)
Camera traps are often triggered by wind or moving grass, filling up SD cards with empty images.
*   **Function:** Automatically scans bulk folders of camera trap images.
*   **Logic:** Uses an Object Detection model (e.g., YOLOv8 / MegaDetector) to detect if an animal is present.
*   **Outcome:** Empty images are securely staged in a quarantine folder, while valid images are passed to Part 2, saving hundreds of hours of manual review.

### Part 2: Individual Tiger Identification
Once a valid tiger is detected, we need to know *which* tiger it is.
*   **Function:** Uses a custom-trained **EfficientNetB3** model trained on the ATRW (Amur Tiger Re-identification in the Wild) Kaggle dataset.
*   **Logic:** Analyzes the unique stripe patterns on the tiger's flanks.
*   **Human-in-the-Loop:** If the model's confidence is between 70% and 90%, the image is flagged as "Ambiguous" and sent to a Human Review Queue on the dashboard for a ranger to make the final call.

### Part 3: Geospatial Intelligence (Home Ranges)
Understanding where tigers live and overlap.
*   **Function:** Calculates and maps the exact territorial boundaries of each tiger.
*   **Logic:** Uses the **Minimum Convex Polygon (MCP)** method combined with the Shoelace formula on historical capture coordinates.
*   **Outcome:** Renders interactive polygons on a map, calculates centroids, and detects exact overlapping areas between rival tigers.

### Part 4: Deviation & Trend Alerting
Moving beyond passive data into proactive intelligence.
*   **Function:** A rule-based engine that monitors historical data against real-time captures.
*   **Alert Rules:**
    1.  **Prolonged Absence:** Alerts if a tiger hasn't been seen in X days (based on their own historical average).
    2.  **Range Shift:** Alerts if a tiger's central activity point shifts by more than 15km.
    3.  **Village Proximity:** Critical alerts if a tiger is captured at a camera station adjacent to human settlements.
    4.  **New Territory:** Alerts if a tiger is captured in a zone it has never visited before.

---

## 🚀 How to Run Locally

### 1. Start the Backend
The backend runs the FastAPI server and the AI models.
```bash
cd backend
python -m uvicorn main:app --reload
```
*The backend will be live at `http://localhost:8000`. You can test endpoints directly at `http://localhost:8000/docs`.*

### 2. Start the Frontend
The frontend runs the beautiful user interface dashboard.
```bash
cd frontend
npm run dev
```
*The dashboard will be live at `http://localhost:3000`.*

---

## 🛠️ Next Steps / Roadmap
- [x] Integrate the trained Part 1 YOLO/MDV6 model into `triage_service.py`.
- [x] Map the Part 2 model's integer outputs to the exact dataset class names using TigerTrace Re-ID.
- [x] Add Left-Flank and Right-Flank logic (handled natively via persistent gallery embeddings).
- [x] Implement CSV import for real forest department camera trap logs (via SQLite seed script).
