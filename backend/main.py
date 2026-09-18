import os, json, io, csv
import numpy as np
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import Base, engine, get_db, seed_database, ensure_schema, BACKEND_DIR, Tiger, Capture, TriageRun, ReviewQueue, Alert, ChatMessage, CameraStation
from services.triage_service        import run_triage
from services.identification_service import identify_tiger
from services.geospatial_service    import get_tiger_home_ranges, get_territory_overlaps
from services.alert_service         import run_alert_engine
from services.chatbot               import ChatbotService, ChatRequest
from services.ingest_service         import start_watcher, get_pending_cards, get_active_job, start_ingest
from database import SessionLocal, IngestBatch

# ── Bootstrap ──────────────────────────────────────────────────────────────────

ensure_schema()
seed_database()

app = FastAPI(title="TigerTrace — Camera Trap Intelligence API")


@app.on_event("startup")
def warm_models_background():
    """
    Load the ONNX sessions in a background thread at boot. Without this, the
    FIRST identify request pays session creation + graph optimization (tens of
    seconds on a 0.1-CPU instance) — which looks exactly like the backend
    hanging. The port binds immediately; models stream in behind it.
    """
    import threading

    def _warm():
        from services.onnx_models import warmup_sessions
        try:
            warmup_sessions()
            print("[startup] ONNX sessions warmed (species classifier + Re-ID).")
        except Exception as e:
            print(f"[startup] WARNING: model warm-up failed: {e} — "
                  f"the first request will be slower, and inference may 503.")
        if os.environ.get("TIGERTRACE_NO_DETECTOR", "") not in ("1", "true", "True"):
            try:
                from services.triage_service import get_mdv6
                get_mdv6()
                print("[startup] MDV6 detector warmed.")
            except Exception as e:
                print(f"[startup] WARNING: MDV6 warm-up failed: {e}")

    threading.Thread(target=_warm, name="model-warmup", daemon=True).start()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root_status():
    return {
        "status": "online",
        "service": "TigerTrace — Camera Trap Intelligence API",
        "docs": "/docs",
        "endpoints": ["/api/summary", "/api/tigers", "/api/geospatial/home-ranges", "/api/alerts"]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/health")
def api_health():
    """
    Deployment health probe: reports which ONNX weights are present on the
    instance WITHOUT loading them. A backend whose models are missing will
    boot but every inference endpoint will return 503 — this endpoint makes
    that state visible to orchestration (and to you) immediately.
    """
    from database import DATABASE_PATH
    from services.onnx_models import REID_ONNX, CLASSIFIER_ONNX

    def _exists(p) -> bool:
        try:
            return bool(p) and os.path.exists(str(p))
        except Exception:
            return False

    mdv6_candidates = [
        BACKEND_DIR / "TigerTrace" / "models" / "pretrained" / "MDV6-yolov9-c.onnx",
        BACKEND_DIR.parent / "models" / "pretrained" / "MDV6-yolov9-c.onnx",
    ]
    detector_disabled = os.environ.get("TIGERTRACE_NO_DETECTOR", "") in ("1", "true", "True")
    return {
        "status": "ok",
        "database_present": _exists(DATABASE_PATH),
        "detector_disabled_by_config": detector_disabled,
        "models_present": {
            "reid_side_aware": _exists(REID_ONNX),
            "species_classifier": _exists(CLASSIFIER_ONNX),
            "mdv6_detector": (not detector_disabled) and any(_exists(p) for p in mdv6_candidates),
        },
    }

IMAGE_DIR = Path(os.environ.get("IMAGE_DIR", str(BACKEND_DIR / "data" / "images")))
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(BACKEND_DIR / "data" / "quarantined_blanks", exist_ok=True)
app.mount("/images", StaticFiles(directory=str(IMAGE_DIR)), name="images")
INGEST_DIR = BACKEND_DIR / "data" / "ingest"
INGEST_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/ingest-images", StaticFiles(directory=str(INGEST_DIR)), name="ingest-images")


def public_image_url(path: str | None) -> str | None:
    """Convert stored provenance paths into URLs consumed by the frontend."""
    if not path:
        return None
    normalized = str(path).replace("\\", "/")
    if normalized.startswith("real-images/"):
        return "/" + normalized
    try:
        resolved = Path(path).resolve()
        for root, prefix in ((IMAGE_DIR.resolve(), "/images/"), (INGEST_DIR.resolve(), "/ingest-images/")):
            try:
                rel = resolved.relative_to(root).as_posix()
                return prefix + rel
            except ValueError:
                continue
    except (OSError, ValueError):
        pass
    return normalized if normalized.startswith("/") else None

# Real PTR dataset (repo_root/data/PTR_Tiger_IDs_2025) served unmodified.
# Tolerates the double-nested unzip layout (data/PTR_Tiger_IDs_2025/PTR_Tiger_IDs_2025/…)
_REAL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "PTR_Tiger_IDs_2025"))
if os.path.isdir(_REAL_DIR) and not any(
    os.path.isdir(os.path.join(_REAL_DIR, n)) and n.startswith("T") for n in os.listdir(_REAL_DIR)
):
    _NESTED = os.path.join(_REAL_DIR, "PTR_Tiger_IDs_2025")
    if os.path.isdir(_NESTED):
        _REAL_DIR = _NESTED
if os.path.isdir(_REAL_DIR):
    app.mount("/real-images", StaticFiles(directory=_REAL_DIR), name="real-images")

# SD-card watcher starts with the app; detection only — imports need UI confirmation
start_watcher()

# ══════════════════════════════════════════════════════════════════════════════
# PART 0 — SD-CARD INGESTION
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/ingest/status")
def ingest_status(db: Session = Depends(get_db)):
    """Cards waiting for confirmation + current import progress + past batches."""
    batches = db.query(IngestBatch).order_by(IngestBatch.started_at.desc()).limit(10).all()
    return {
        "pending_cards": get_pending_cards(),
        "active_job": get_active_job(),
        "recent_batches": [{
            "id": b.id, "job_id": b.job_id, "station_id": b.station_id,
            "started_at": b.started_at, "total_files": b.total_files,
            "copied_files": b.copied_files, "skipped_duplicates": b.skipped_duplicates,
            "blanks": b.blanks, "retained": b.retained, "saved_mb": b.saved_mb,
        } for b in batches],
    }

@app.get("/api/ingest/stations")
def ingest_station_list(db: Session = Depends(get_db)):
    """Camera station dropdown for import confirmation."""
    stations = [s.station_id for s in db.query(CameraStation).order_by(CameraStation.grid_id).all()]
    if not stations:
        rows = db.query(Capture.station_id).distinct().all()
        stations = sorted({r[0] for r in rows if r[0]})
    return {"stations": stations}

@app.get("/api/stations")
def list_camera_stations(db: Session = Depends(get_db)):
    """Real PTR camera locations (GRID survey) for station dropdowns and maps."""
    stations = db.query(CameraStation).order_by(CameraStation.grid_id).all()
    return [{
        "station_id": s.station_id, "grid_id": s.grid_id,
        "block": s.block, "beat": s.beat, "range": s.range_name,
        "latitude": s.latitude, "longitude": s.longitude, "zone": s.zone or "survey",
    } for s in stations]

@app.post("/api/ingest/start")
def ingest_start(mount: str, station_id: str, db: Session = Depends(get_db)):
    """Operator confirmed the card: copy -> triage -> identify in the background."""
    try:
        snapshot = start_ingest(mount, station_id, SessionLocal)
        return snapshot
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))

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
    capture_start = db.query(Capture.timestamp).order_by(Capture.timestamp.asc()).first()
    capture_end = db.query(Capture.timestamp).order_by(Capture.timestamp.desc()).first()

    return {
        "tigers_identified": t_tigers,
        "total_captures":    t_captures,
        "open_alerts":       t_alerts,
        "pending_review":    t_review,
        "blanks_filtered":   blanks,
        "saved_mb":          saved_mb,
        "saved_minutes":     saved_min,
        "registered_stations": db.query(CameraStation).count(),
        "data_source": "PTR_Tiger_IDs_2025",
        "capture_start": capture_start[0] if capture_start else None,
        "capture_end": capture_end[0] if capture_end else None,
    }

# ══════════════════════════════════════════════════════════════════════════════
# PART 1 — TRIAGE
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/triage/run")
def trigger_triage(db: Session = Depends(get_db)):
    result = run_triage(str(IMAGE_DIR))
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
    from uuid import uuid4

    from fastapi.concurrency import run_in_threadpool

    MAX_UPLOAD_MB = 20
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file")
        if len(contents) > MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"Image larger than {MAX_UPLOAD_MB}MB")

        # Reject non-images before they reach the pipeline
        try:
            from PIL import Image
            import io as _io
            probe = Image.open(_io.BytesIO(contents))
            probe.verify()
        except Exception:
            raise HTTPException(status_code=400, detail="File is not a valid image")

        # Safe filename: never trust client-provided names (path traversal, collisions)
        suffix = Path(file.filename or "upload.jpg").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
            suffix = ".jpg"
        upload_dir = IMAGE_DIR / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        temp_path = str(upload_dir / f"{uuid4().hex}{suffix}")
        with open(temp_path, "wb") as f:
            f.write(contents)

        # Blocking ONNX inference runs in the threadpool so the event loop
        # (and every other endpoint) stays responsive during uploads.
        result = await run_in_threadpool(identify_tiger, temp_path, db)

        # Increment total_captures for identified tiger
        if result.get("status") == "auto_matched":
            top_id = result.get("top_match", {}).get("tiger_id")
            conf = result.get("top_match", {}).get("confidence", 0.95)
            detected_flank = result.get("flank_side", "Unknown")
            tiger = db.query(Tiger).filter(Tiger.tiger_id == top_id).first()
            if tiger:
                new_cap = Capture(
                    tiger_id=top_id,
                    image_path=temp_path,
                    station_id="ST-ONLINE",
                    latitude=21.78,
                    longitude=79.44,
                    timestamp=datetime.utcnow(),
                    confidence=conf,
                    zone="unclassified",
                    flank_side=detected_flank,
                    source_dataset="online_identify",
                    source_filename=Path(file.filename or temp_path).name,
                )
                db.add(new_cap)
                tiger.total_captures = db.query(Capture).filter(Capture.tiger_id == top_id).count() + 1
                db.commit()
        elif result.get("status") == "not_a_tiger":
            # Nothing references the file — remove it
            try:
                os.remove(temp_path)
            except OSError:
                pass

        return result
    except HTTPException:
        raise
    except (FileNotFoundError, RuntimeError) as e:
        # Model/extraction failures must surface as 503, not as a 500 that
        # hides which stage broke.
        print(f"[ERROR] /api/identify failed: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"[ERROR] /api/identify failed: {e}")
        raise HTTPException(status_code=500, detail="Identification failed. Please retry.")

# ══════════════════════════════════════════════════════════════════════════════
# UNIFIED DEMO PIPELINE — one upload, every stage, one response
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/pipeline/analyze")
async def pipeline_analyze(file: UploadFile = File(...), station_id: str = Form("ST-01"), db: Session = Depends(get_db)):
    """
    Full chain in one call for the unified demo page:
    blank filter (MegaDetector) -> species gate (MobileNetV3) ->
    stripe Re-ID (ResNet-18) -> classification into registered category.
    Each stage's result is reported so the UI stepper mirrors real progress.
    """
    from uuid import uuid4
    from fastapi.concurrency import run_in_threadpool
    from services.identification_service import detect_crop, identify_tiger, load_models
    from services.onnx_models import classifier_probs

    MAX_UPLOAD_MB = 20
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file")
        if len(contents) > MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"Image larger than {MAX_UPLOAD_MB}MB")
        try:
            from PIL import Image
            import io as _io
            probe = Image.open(_io.BytesIO(contents))
            probe.verify()
        except Exception:
            raise HTTPException(status_code=400, detail="File is not a valid image")

        suffix = Path(file.filename or "upload.jpg").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
            suffix = ".jpg"
        upload_dir = IMAGE_DIR / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        image_path = str(upload_dir / f"{uuid4().hex}{suffix}")
        with open(image_path, "wb") as f:
            f.write(contents)

        def _run_stages():
            stages = {}
            # Stage 1: blank filter
            has_animal, detect_conf, cropped_path = detect_crop(image_path)
            stages["blank_filter"] = {"has_animal": has_animal, "confidence": round(float(detect_conf), 3)}
            if not has_animal:
                final = {"outcome": "blank", "tiger_id": None, "name": None, "confidence": None, "review_item_id": None,
                         "station_id": station_id, "capture_time": None}
                return stages, final, image_path

            # Stage 2: species gate — reported as INFORMATION only in this
            # endpoint. The flank-trained MobileNetV3 misclassifies partial
            # tiger views (head/tail shots common in PTR's curated folders),
            # so it must not hard-reject here; MegaDetector already confirmed
            # an animal at stage 1 and the Re-ID stage decides the outcome.
            probs = classifier_probs(cropped_path)
            tiger_prob = float(probs[0]) if probs else 0.0
            stages["species_gate"] = {"tiger_probability": round(tiger_prob, 3), "is_tiger": tiger_prob >= 0.05}

            # Stage 3+4: stripe Re-ID + category classification.
            # Upgraded to Swin-Transformer 512-D ArcFace side-aware extractor (tigertrace_ptr_v2_side_aware.onnx).
            from services.identification_service import gallery_best_cosines
            from services.onnx_models import reid_extract, reid_embedding

            extract_res = reid_extract(cropped_path) or reid_extract(image_path)
            q_flank = extract_res.get("flank_name", "Unknown") if extract_res else "Unknown"
            q_flank_code = extract_res.get("flank_side", "A") if extract_res else "A"
            flank_conf = float(extract_res.get("flank_confidence", 0.90)) if extract_res else 0.5

            q_full = reid_embedding(image_path)
            q_crop = reid_embedding(cropped_path)
            queries = [q for q in (q_full, q_crop) if q is not None]
            if not queries:
                # A verified upload that cannot be embedded is a service
                # failure, not a "new tiger" outcome.
                raise RuntimeError(
                    "Re-ID extraction failed for the uploaded image (both crop and full frame)."
                )

            best_cos = None
            gallery_ids = None
            for q in queries:
                cos, gallery_ids = gallery_best_cosines(q, q_flank=q_flank)
                best_cos = cos if best_cos is None else np.maximum(best_cos, cos)

            order = np.argsort(-best_cos)
            top_i = int(order[0])
            top_cos = float(best_cos[top_i])
            second_cos = float(best_cos[order[1]]) if len(order) > 1 else 0.0
            margin = top_cos - second_cos

            temperature = 18.0
            exp_sims = np.exp(best_cos * temperature)
            conf_probs = exp_sims / np.sum(exp_sims)
            prob_order = np.argsort(-conf_probs)[:6]
            ranked = [{"tiger_id": gallery_ids[i], "confidence": round(float(conf_probs[i]), 3), "similarity": round(float(best_cos[i]), 3)} for i in prob_order]

            top_id = gallery_ids[top_i]
            # Calibrated Decision Boundaries:
            # >= 0.70: High-confidence match (auto_matched)
            # 0.55 - 0.70: Possible match (ambiguous / review)
            # < 0.55: Unmatched / new individual
            if tiger_prob < 0.02 and top_cos < 0.55:
                status = "not_a_tiger"
            elif top_cos >= 0.70:
                status = "auto_matched"
            elif top_cos >= 0.55:
                status = "ambiguous"
            else:
                status = "new_individual"
            top_conf = round(float(conf_probs[top_i]), 3)
            alt_id = ranked[1]["tiger_id"] if len(ranked) > 1 else None
            alt_conf = ranked[1]["confidence"] if len(ranked) > 1 else 0.0
            result = {
                "status": status,
                "top_match": {"tiger_id": top_id, "confidence": top_conf, "similarity": round(top_cos, 3)},
                "alt_match": {"tiger_id": alt_id, "confidence": alt_conf, "similarity": round(second_cos, 3)},
                "flank_side": q_flank,
                "flank_code": q_flank_code,
                "flank_confidence": flank_conf,
                "all_scores": ranked,
            }
            stages["stripe_reid"] = {
                "embedding_dim": 512,
                "top_similarity": round(top_cos, 3),
                "margin": round(margin, 3),
                "flank_side": q_flank,
                "flank_code": q_flank_code,
                "flank_confidence": round(flank_conf, 3),
            }

            outcome_map = {"auto_matched": "matched", "ambiguous": "review",
                           "new_individual": "new_tiger", "not_a_tiger": "not_a_tiger"}
            top = result.get("top_match") or {}
            tiger = db.query(Tiger).filter(Tiger.tiger_id == top.get("tiger_id")).first() if top.get("tiger_id") else None

            review_item_id = None
            if status == "ambiguous":
                from database import ReviewQueue
                existing = db.query(ReviewQueue).filter(ReviewQueue.image_path == image_path,
                                                         ReviewQueue.status == "pending").first()
                if not existing:
                    rq = ReviewQueue(
                        image_path=image_path,
                        station_id=station_id,
                        timestamp=datetime.utcnow(),
                        top_match_id=top_id,
                        top_match_confidence=top_conf,
                        alt_match_id=alt_id,
                        alt_match_confidence=alt_conf,
                        status="pending",
                    )
                    db.add(rq)
                    db.flush()
                    review_item_id = rq.id
                else:
                    review_item_id = existing.id

            stages["classification"] = {"category": outcome_map.get(status, "new_tiger"),
                                        "tiger_id": top.get("tiger_id"),
                                        "confidence": round(float(top.get("confidence", 0)), 3)}

            final = {
                "outcome": outcome_map.get(status, "new_tiger"),
                "tiger_id": top.get("tiger_id"),
                "name": tiger.name if tiger else None,
                "sex": tiger.sex if tiger else None,
                "confidence": round(float(top.get("confidence", 0)), 3),
                "review_item_id": review_item_id,
                "all_scores": result.get("all_scores", []),
            }

            # PTR real-data filenames carry the camera GRID + EXIF timestamp:
            # "<grid>_<flank>_<seq>__<frame>.JPG" -> auto-assign station/coords/time.
            capture_station, capture_lat, capture_lon, capture_zone, capture_ts, grid_parsed = station_id, 21.78, 79.44, "unclassified", None, None
            try:
                import re as _re
                from PIL import Image as _Image
                _m = _re.match(r"^(\d+)_[A-Za-z]+_", os.path.basename(file.filename or ""))
                if _m:
                    _grid = int(_m.group(1))
                    _st = db.query(CameraStation).filter(CameraStation.grid_id == _grid).first()
                    if _st is not None:
                        capture_station, capture_lat, capture_lon, capture_zone, grid_parsed = _st.station_id, _st.latitude, _st.longitude, _st.zone or "survey", _grid
                _exif = _Image.open(image_path).getexif()
                _raw = _exif.get(306)
                if _raw:
                    capture_ts = datetime.strptime(str(_raw), "%Y:%m:%d %H:%M:%S")
            except Exception:
                pass
            if grid_parsed is not None:
                stages["camera_match"] = {"grid_id": grid_parsed, "station_id": capture_station}
            final["station_id"] = capture_station
            final["capture_time"] = capture_ts.isoformat() if capture_ts else None

            if status == "auto_matched" and tiger:
                db.add(Capture(
                    tiger_id=top["tiger_id"],
                    image_path=image_path,
                    station_id=capture_station,
                    latitude=capture_lat, longitude=capture_lon,
                    timestamp=capture_ts or datetime.utcnow(),
                    confidence=top.get("confidence", 0.9),
                    zone=capture_zone,
                    flank_side="Unknown",
                ))
                tiger.total_captures = db.query(Capture).filter(Capture.tiger_id == top["tiger_id"]).count() + 1
                db.commit()
            else:
                # Ambiguous results must survive the request so the ranger
                # review queue reflects what the pipeline actually processed.
                db.commit()
            return stages, final, cropped_path

        load_models()
        stages, final, kept_path = await run_in_threadpool(_run_stages)

        # Clean up the original upload when a crop superseded it
        if kept_path != image_path:
            try:
                os.remove(image_path)
            except OSError:
                pass

        return {
            "filename": file.filename,
            "image_url": f"/images/{os.path.relpath(kept_path, IMAGE_DIR).replace(os.sep, '/')}",
            "stages": stages,
            "final": final,
        }
    except HTTPException:
        raise
    except (FileNotFoundError, RuntimeError) as e:
        # A detector/embedding stage failing loudly is a service problem: 503.
        print(f"[ERROR] /api/pipeline/analyze failed: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"[ERROR] /api/pipeline/analyze failed: {e}")
        raise HTTPException(status_code=500, detail="Pipeline analysis failed. Please retry.")

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
        "captures": [{"station_id": c.station_id, "timestamp": c.timestamp,
                      "zone": c.zone, "image": c.image_path,
                      "image_url": public_image_url(c.image_path),
                      "source_dataset": c.source_dataset,
                      "source_filename": c.source_filename,
                      "lat": c.latitude, "lon": c.longitude,
                      "confidence": c.confidence} for c in caps]
    }

@app.get("/api/review-queue")
def get_review_queue(db: Session = Depends(get_db)):
    items = db.query(ReviewQueue).filter(ReviewQueue.status == "pending").all()
    return [{"id": i.id, "image_path": i.image_path, "image_url": public_image_url(i.image_path), "station_id": i.station_id,
             "timestamp": i.timestamp, "top_match_id": i.top_match_id,
             "top_match_confidence": i.top_match_confidence,
             "alt_match_id": i.alt_match_id, "alt_match_confidence": i.alt_match_confidence} 
             for i in items]

@app.post("/api/review-queue/{item_id}/resolve")
def resolve_review(item_id: int, action: str, tiger_id: str = None, db: Session = Depends(get_db)):
    item = db.query(ReviewQueue).filter(ReviewQueue.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")
    
    from database import extract_real_resnet18_embedding

    if action in ("confirm", "confirmed"):
        item.status = "confirmed"
        target_id = tiger_id or item.top_match_id
        tiger = db.query(Tiger).filter(Tiger.tiger_id == target_id).first()
        if tiger:
            station = db.query(CameraStation).filter(CameraStation.station_id == (item.station_id or "")).first()
            lat = station.latitude if station else 21.78
            lon = station.longitude if station else 79.44
            new_cap = Capture(
                tiger_id=target_id,
                image_path=item.image_path,
                station_id=item.station_id or "ST-ONLINE",
                latitude=lat,
                longitude=lon,
                timestamp=item.timestamp or datetime.utcnow(),
                confidence=item.top_match_confidence or 0.90,
                zone=station.zone if station and station.zone else "unclassified",
                flank_side="Unknown",
                source_dataset="review_queue",
                source_filename=Path(item.image_path).name if item.image_path else None,
                source_grid_id=station.grid_id if station else None,
            )
            db.add(new_cap)
            tiger.total_captures = db.query(Capture).filter(Capture.tiger_id == target_id).count() + 1
            
            if os.path.exists(item.image_path):
                emb_512d = extract_real_resnet18_embedding(image_path=item.image_path)
                if emb_512d:
                    tiger.embedding_json = json.dumps(emb_512d)

    elif action in ("new", "new_individual"):
        item.status = "new_individual"
        new_id = tiger_id
        if not new_id:
            # Next free numeric ID in the PTR convention (T103...T159)
            existing = {t.tiger_id for t in db.query(Tiger.tiger_id).all()}
            n = 100
            while f"T{n}" in existing:
                n += 1
            new_id = f"T{n}"
        
        emb_512d = None
        if os.path.exists(item.image_path):
            emb_512d = extract_real_resnet18_embedding(image_path=item.image_path)
        if not emb_512d:
            # Never register a tiger on a fabricated embedding — the match
            # gallery would be poisoned with garbage similarities.
            raise HTTPException(
                status_code=400,
                detail=f"Source image for review item {item_id} is missing or could not be "
                       f"embedded ({item.image_path}); cannot register a new tiger without a real embedding.",
            )

        new_tiger = Tiger(
            tiger_id=new_id,
            name=f"Tiger {new_id.replace('PTR-T', '')}",
            sex="Unknown",
            enrolled_at=datetime.utcnow(),
            total_captures=1,
            embedding_json=json.dumps(emb_512d)
        )
        db.add(new_tiger)
        
        station = db.query(CameraStation).filter(CameraStation.station_id == (item.station_id or "")).first()
        lat = station.latitude if station else 21.78
        lon = station.longitude if station else 79.44
        new_cap = Capture(
            tiger_id=new_id,
            image_path=item.image_path,
            station_id=item.station_id or "ST-ONLINE",
            latitude=lat,
            longitude=lon,
            timestamp=item.timestamp or datetime.utcnow(),
            confidence=1.0,
            zone=station.zone if station and station.zone else "unclassified",
            flank_side="Unknown",
            source_dataset="review_queue",
            source_filename=Path(item.image_path).name if item.image_path else None,
            source_grid_id=station.grid_id if station else None,
        )
        db.add(new_cap)

        try:
            from services.identification_service import enroll_tiger_embedding
            if emb_512d:
                enroll_tiger_embedding(new_id, emb_512d)
        except Exception as g_err:
            print(f"[WARN] Unable to update gallery: {g_err}")

    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    db.commit()
    return {"status": "success", "review_status": item.status}

# ══════════════════════════════════════════════════════════════════════════════
# PART 3 — GEOSPATIAL
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/geospatial/home-ranges")
def home_ranges(db: Session = Depends(get_db)):
    return get_tiger_home_ranges(db)

@app.get("/api/geospatial/paths")
def movement_paths(db: Session = Depends(get_db)):
    """
    Time-ordered movement path per tiger: every capture as a waypoint
    (lat, lon, timestamp, station), sorted chronologically — the sequence
    the tiger actually moved between camera stations.
    """
    tigers = {t.tiger_id: t for t in db.query(Tiger).all()}
    captures = db.query(Capture).order_by(Capture.tiger_id, Capture.timestamp).all()

    paths: dict[str, dict] = {}
    for c in captures:
        t = tigers.get(c.tiger_id)
        if c.latitude is None or c.longitude is None:
            continue
        p = paths.setdefault(c.tiger_id, {
            "tiger_id": c.tiger_id,
            "name": t.name if t else c.tiger_id,
            "sex": t.sex if t else None,
            "points": [],
        })
        p["points"].append({
            "lat": c.latitude,
            "lon": c.longitude,
            "timestamp": c.timestamp.isoformat() if c.timestamp else None,
            "station_id": c.station_id,
            "confidence": c.confidence,
        })
    return list(paths.values())

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
                     "Total Captures", "Stations Visited", "Last Seen"])
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

# ══════════════════════════════════════════════════════════════════════════════
# PART 5 — CONSERVATION INTELLIGENCE CHATBOT
# ══════════════════════════════════════════════════════════════════════════════

_chatbot = ChatbotService()

@app.post("/api/chat")
def chat_message(req: ChatRequest, db: Session = Depends(get_db)):
    """Process a natural language question about Pench Tiger Reserve data."""
    response = _chatbot.process_message(req, db)
    return response.model_dump()

@app.get("/api/chat/history")
def chat_history(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve recent chat history."""
    return _chatbot.get_history(db, limit=limit)

@app.delete("/api/chat/history")
def clear_chat_history(db: Session = Depends(get_db)):
    """Clear all chat history."""
    success = _chatbot.clear_history(db)
    return {"status": "cleared" if success else "error"}

# ══════════════════════════════════════════════════════════════════════════════
# PART 6 — PATROL PRIORITY & MANAGEMENT RECOMMENDATION ENGINE
# ══════════════════════════════════════════════════════════════════════════════

from services.patrol_service import (
    get_station_patrol_priorities,
    get_station_patrol_detail,
    get_patrol_summary,
    get_suggested_patrol_sequence,
)

@app.get("/api/patrol/stations")
def list_patrol_stations(db: Session = Depends(get_db)):
    """Get all camera stations ranked by transparent patrol priority."""
    return get_station_patrol_priorities(db)

@app.get("/api/patrol/stations/{station_id}")
def station_patrol_detail(station_id: str, db: Session = Depends(get_db)):
    """Get exhaustive factor breakdown, evidence, and historical trend for a specific station."""
    detail = get_station_patrol_detail(station_id, db)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
    return detail

@app.get("/api/patrol/summary")
def patrol_summary(db: Session = Depends(get_db)):
    """Get executive priority counts, top 5 stations, and suggested patrol sequence."""
    return get_patrol_summary(db)

@app.get("/api/patrol/sequence")
def patrol_sequence(limit: int = 6, db: Session = Depends(get_db)):
    """Get suggested tactical patrol sequence based on priority rankings."""
    return get_suggested_patrol_sequence(db, limit=limit)

@app.get("/api/export/patrol")
def export_patrol_csv(db: Session = Depends(get_db)):
    """Export station patrol priorities as a CSV report for forest department operations."""
    stations = get_station_patrol_priorities(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Station ID", "Priority Level", "Priority Score", "Evidence Confidence",
        "Zone", "Village Adjacent", "Total Captures", "Unique Tigers",
        "Movement Score", "Conflict Score", "Anomaly Score", "Top Reason"
    ])
    for s in stations:
        writer.writerow([
            s["station_id"],
            s["priority_level"],
            s["priority_score"],
            f"{s['evidence_confidence']}%",
            s["zone"],
            "Yes" if s["is_village_adjacent"] else "No",
            s["total_captures"],
            s["unique_tigers_count"],
            s["components"]["movement"]["score"],
            s["components"]["conflict"]["score"],
            s["components"]["anomaly"]["score"],
            s["top_reasons"][0] if s["top_reasons"] else "Routine",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pench_patrol_priorities.csv"}
    )
