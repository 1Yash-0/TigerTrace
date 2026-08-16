import os, json, io, csv
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import Base, engine, get_db, seed_database, \
                     Tiger, Capture, TriageRun, ReviewQueue, Alert
from services.triage_service        import run_triage
from services.identification_service import identify_tiger
from services.geospatial_service    import get_tiger_home_ranges, get_territory_overlaps
from services.alert_service         import run_alert_engine

# ── Bootstrap ──────────────────────────────────────────────────────────────────

Base.metadata.create_all(bind=engine)
seed_database()

app = FastAPI(title="Pench AI — Camera Trap Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("data/images", exist_ok=True)
os.makedirs("data/quarantined_blanks", exist_ok=True)
app.mount("/images", StaticFiles(directory="data/images"), name="images")

# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/summary")
def get_summary(db: Session = Depends(get_db)):
    t_tigers    = db.query(Tiger).count()
    t_captures  = db.query(Capture).count()
    t_alerts    = db.query(Alert).filter(Alert.resolved == False).count()
    t_review    = db.query(ReviewQueue).filter(ReviewQueue.status == "pending").count()
    
    last_triage = db.query(TriageRun).order_by(TriageRun.run_at.desc()).first()
    blanks      = last_triage.blanks_removed if last_triage else 0
    saved_mb    = last_triage.saved_mb if last_triage else 0.0
    saved_min   = last_triage.saved_minutes if last_triage else 0.0

    return {
        "tigers_identified": t_tigers,
        "total_captures":    t_captures,
        "open_alerts":       t_alerts,
        "pending_review":    t_review,
        "blanks_filtered":   blanks,
        "saved_mb":          saved_mb,
        "saved_minutes":     saved_min
    }

# ══════════════════════════════════════════════════════════════════════════════
# PART 1 — TRIAGE
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/triage/run")
def trigger_triage(db: Session = Depends(get_db)):
    result = run_triage("data/images")
    run_record = TriageRun(
        total_images=result["total_images"],
        blanks_removed=result["blanks_removed"],
        retained=result["retained"],
        saved_mb=result["saved_mb"],
        saved_minutes=result["saved_minutes"]
    )
    db.add(run_record)
    db.commit()

    # PS: Alert engine must be regenerated on every processing run
    alert_summary = run_alert_engine(db)
    result["alert_summary"] = alert_summary
    return result

@app.get("/api/triage/history")
def triage_history(db: Session = Depends(get_db)):
    runs = db.query(TriageRun).order_by(TriageRun.run_at.desc()).limit(10).all()
    return [{"id": r.id, "run_at": r.run_at, "total_images": r.total_images,
             "blanks_removed": r.blanks_removed, "retained": r.retained,
             "saved_mb": r.saved_mb, "saved_minutes": r.saved_minutes} for r in runs]

# ══════════════════════════════════════════════════════════════════════════════
# PART 2 — IDENTIFICATION
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/identify")
async def identify_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a cropped tiger flank image for identification."""
    contents = await file.read()
    temp_path = f"data/images/temp_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(contents)
    
    result = identify_tiger(temp_path, db)
    # Don't delete temp_path here if it's meant to be kept, 
    # but for prototype we just return the result.
    return result

@app.get("/api/tigers")
def list_tigers(db: Session = Depends(get_db)):
    tigers = db.query(Tiger).all()
    res = []
    for t in tigers:
        recent = db.query(Capture).filter(Capture.tiger_id == t.tiger_id)\
                   .order_by(Capture.timestamp.desc()).first()
        res.append({
            "tiger_id": t.tiger_id, "name": t.name, "sex": t.sex,
            "total_captures": t.total_captures,
            "last_seen": recent.timestamp if recent else None,
            "last_station": recent.station_id if recent else None
        })
    return res

@app.get("/api/tigers/{tiger_id}")
def get_tiger(tiger_id: str, db: Session = Depends(get_db)):
    t = db.query(Tiger).filter(Tiger.tiger_id == tiger_id).first()
    if not t: raise HTTPException(status_code=404)
    caps = db.query(Capture).filter(Capture.tiger_id == tiger_id)\
             .order_by(Capture.timestamp.desc()).all()
    return {
        "tiger_id": t.tiger_id, "name": t.name, "sex": t.sex,
        "total_captures": t.total_captures,
        "captures": [{"station": c.station_id, "timestamp": c.timestamp, 
                      "zone": c.zone, "image": c.image_path} for c in caps]
    }

@app.get("/api/review-queue")
def get_review_queue(db: Session = Depends(get_db)):
    items = db.query(ReviewQueue).filter(ReviewQueue.status == "pending").all()
    return [{"id": i.id, "image_path": i.image_path, "station_id": i.station_id,
             "timestamp": i.timestamp, "top_match_id": i.top_match_id,
             "top_match_confidence": i.top_match_confidence,
             "alt_match_id": i.alt_match_id, "alt_match_confidence": i.alt_match_confidence} 
             for i in items]

@app.post("/api/review-queue/{item_id}/resolve")
def resolve_review(item_id: int, action: str, tiger_id: str = None, db: Session = Depends(get_db)):
    item = db.query(ReviewQueue).filter(ReviewQueue.id == item_id).first()
    if not item: raise HTTPException(status_code=404)
    
    if action == "confirm":
        item.status = "confirmed"
        # would add capture to db here
    elif action == "new":
        item.status = "new_individual"
        # would enroll new tiger here
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    db.commit()
    return {"status": "success"}

# ══════════════════════════════════════════════════════════════════════════════
# PART 3 — GEOSPATIAL
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/geospatial/home-ranges")
def home_ranges(db: Session = Depends(get_db)):
    return get_tiger_home_ranges(db)

@app.get("/api/geospatial/overlaps")
def territory_overlaps(db: Session = Depends(get_db)):
    return get_territory_overlaps(db)

# ══════════════════════════════════════════════════════════════════════════════
# PART 4 — ALERTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    return [{"id": a.id, "tiger_id": a.tiger_id, "alert_type": a.alert_type,
             "severity": a.severity, "message": a.message,
             "evidence": json.loads(a.evidence) if a.evidence else {},
             "confidence": a.confidence, "created_at": a.created_at,
             "resolved": a.resolved} for a in alerts]

@app.api_route("/api/alerts/{alert_id}/resolve", methods=["POST", "PATCH"])
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a: raise HTTPException(status_code=404)
    a.resolved = True
    db.commit()
    return {"status": "resolved"}

@app.post("/api/alerts/run")
def trigger_alert_engine(db: Session = Depends(get_db)):
    return run_alert_engine(db)

# ══════════════════════════════════════════════════════════════════════════════
# EXPORT — CSV report for forest department
# ══════════════════════════════════════════════════════════════════════════════

from fastapi.responses import StreamingResponse

@app.get("/api/export/alerts")
def export_alerts_csv(db: Session = Depends(get_db)):
    """Export all alerts as a CSV file usable by forest department staff."""
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Tiger ID", "Alert Type", "Severity", "Confidence",
                     "Message", "Evidence", "Created At", "Resolved"])
    for a in alerts:
        writer.writerow([
            a.id, a.tiger_id, a.alert_type, a.severity,
            f"{(a.confidence or 0)*100:.0f}%", a.message,
            a.evidence, a.created_at.isoformat() if a.created_at else "",
            "Yes" if a.resolved else "No"
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pench_alerts_report.csv"}
    )

@app.get("/api/export/geospatial")
def export_geospatial_csv(db: Session = Depends(get_db)):
    """Export home ranges as a CSV file usable by forest department staff."""
    ranges = get_tiger_home_ranges(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Tiger ID", "Name", "Sex", "Area (sq km)", "Centroid Lat", "Centroid Lon",
                     "Total Captures", "Stations Visited Count", "Last Seen"])
    for r in ranges:
        writer.writerow([
            r["tiger_id"], r["name"], r["sex"], r["area_sq_km"],
            r["centroid"][0] if r.get("centroid") else "",
            r["centroid"][1] if r.get("centroid") else "",
            r["total_captures"],
            len(r.get("stations_visited", [])),
            r.get("last_seen", "")
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pench_homeranges_report.csv"}
    )
