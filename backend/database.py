from pathlib import Path
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import random
import json
import os

# Keep the live database anchored to the backend directory.  The old relative
# URL silently selected a different (stale) database when uvicorn was started
# from the repository root instead of from ``backend/``.
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"
DATABASE_PATH = DATA_DIR / "pench_ai.db"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ─── ORM Models ────────────────────────────────────────────────────────────────

class Tiger(Base):
    __tablename__ = "tigers"
    id          = Column(Integer, primary_key=True, index=True)
    tiger_id    = Column(String, unique=True, index=True)  # e.g. "PTR-T01"
    name        = Column(String)
    sex         = Column(String)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    total_captures = Column(Integer, default=0)
    embedding_json = Column(Text)  # FAISS vector stored as JSON (full-image centroid)
    embedding2_json = Column(Text)  # MegaDetector-crop centroid (see enrich_gallery_crops.py)

class Capture(Base):
    __tablename__ = "captures"
    id          = Column(Integer, primary_key=True, index=True)
    tiger_id    = Column(String, index=True)
    image_path  = Column(String)
    station_id  = Column(String)
    latitude    = Column(Float)
    longitude   = Column(Float)
    timestamp   = Column(DateTime)
    confidence  = Column(Float)
    zone        = Column(String)   # "core" | "buffer" | "village_adjacent"
    flank_side  = Column(String)   # "Left" | "Right"
    source_dataset = Column(String, default="PTR_Tiger_IDs_2025", index=True)
    source_filename = Column(String)
    source_grid_id = Column(Integer, index=True)

class CameraStation(Base):
    """Real camera-trap location from the PTR survey (PTR Camera Locations 24-25.xlsx)."""
    __tablename__ = "camera_stations"
    id          = Column(Integer, primary_key=True, index=True)
    station_id  = Column(String, unique=True, index=True)  # "C090" (camera GRID id)
    grid_id     = Column(Integer, index=True)
    block       = Column(String)
    beat        = Column(String)
    range_name  = Column(String)
    latitude    = Column(Float)
    longitude   = Column(Float)
    # The PTR workbook does not provide a core/buffer boundary.  Keep the
    # source classification explicit instead of forcing every camera into the
    # legacy demo bounding box.
    zone        = Column(String, default="survey")

class TriageRun(Base):
    __tablename__ = "triage_runs"
    id              = Column(Integer, primary_key=True, index=True)
    run_at          = Column(DateTime, default=datetime.utcnow)
    total_images    = Column(Integer)
    blanks_removed  = Column(Integer)
    retained        = Column(Integer)
    saved_mb        = Column(Float)
    saved_minutes   = Column(Float)

class IngestBatch(Base):
    """One confirmed SD-card import (see services/ingest_service.py)."""
    __tablename__ = "ingest_batches"
    id                = Column(Integer, primary_key=True, index=True)
    job_id            = Column(String, unique=True, index=True)
    station_id        = Column(String, index=True)
    started_at        = Column(DateTime, default=datetime.utcnow)
    total_files       = Column(Integer)
    copied_files      = Column(Integer)
    skipped_duplicates = Column(Integer)
    blanks            = Column(Integer)
    retained          = Column(Integer)
    saved_mb          = Column(Float)

class ReviewQueue(Base):
    __tablename__ = "review_queue"
    id           = Column(Integer, primary_key=True, index=True)
    image_path   = Column(String)
    station_id   = Column(String)
    timestamp    = Column(DateTime)
    top_match_id = Column(String)
    top_match_confidence = Column(Float)
    alt_match_id = Column(String)
    alt_match_confidence = Column(Float)
    status       = Column(String, default="pending")  # pending | confirmed | new_individual

class Alert(Base):
    __tablename__ = "alerts"
    id          = Column(Integer, primary_key=True, index=True)
    tiger_id    = Column(String, index=True)
    alert_type  = Column(String, index=True)   # range_shift | new_station | village_proximity | absence | zone_transition
    severity    = Column(String, index=True)   # high | medium | low
    message     = Column(Text)
    evidence    = Column(Text)
    confidence  = Column(Float)
    created_at  = Column(DateTime, default=datetime.utcnow)
    resolved    = Column(Boolean, default=False)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id            = Column(Integer, primary_key=True, index=True)
    message       = Column(Text)       # User's question
    intent        = Column(String)     # Resolved intent
    entities_json = Column(Text)       # JSON of extracted entities
    response      = Column(Text)       # Generated response
    mode          = Column(String)     # "OFFLINE" or "LOCAL_AI"
    created_at    = Column(DateTime, default=datetime.utcnow)

# ─── Create tables ──────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema():
    """Apply additive SQLite migrations used by the current data contract.

    ``create_all`` does not alter existing SQLite tables.  These explicit,
    additive migrations keep an existing real-data database usable without
    deleting captures or regenerating model outputs.
    """
    Base.metadata.create_all(bind=engine)
    columns = {c["name"] for c in inspect(engine).get_columns("captures")}
    with engine.begin() as conn:
        if "source_dataset" not in columns:
            conn.execute(text("ALTER TABLE captures ADD COLUMN source_dataset VARCHAR"))
            conn.execute(text("UPDATE captures SET source_dataset = 'PTR_Tiger_IDs_2025' WHERE source_dataset IS NULL"))
        if "source_filename" not in columns:
            conn.execute(text("ALTER TABLE captures ADD COLUMN source_filename VARCHAR"))
        if "source_grid_id" not in columns:
            conn.execute(text("ALTER TABLE captures ADD COLUMN source_grid_id INTEGER"))
        station_columns = {c["name"] for c in inspect(engine).get_columns("camera_stations")}
        if "zone" not in station_columns:
            conn.execute(text("ALTER TABLE camera_stations ADD COLUMN zone VARCHAR"))
            conn.execute(text("UPDATE camera_stations SET zone = 'survey' WHERE zone IS NULL"))
        tiger_columns = {c["name"] for c in inspect(engine).get_columns("tigers")}
        if "embedding2_json" not in tiger_columns:
            conn.execute(text("ALTER TABLE tigers ADD COLUMN embedding2_json TEXT"))

def extract_real_reid_embedding(image_path: str = None, seed_index: int = 1) -> list:
    """
    Extract a 512-D L2-normalized stripe embedding using tigertrace_ptr_v2_side_aware.onnx.

    Raises RuntimeError when no real embedding can be produced. There is no
    synthetic fallback on purpose: gallery vectors fabricated from a seed would
    poison the match index with garbage similarities.
    """
    if isinstance(image_path, int):
        seed_index = image_path
        image_path = None

    from services.onnx_models import reid_embedding

    if not (image_path and isinstance(image_path, str) and os.path.exists(image_path)):
        raise RuntimeError(f"Cannot embed: image file not found: {image_path!r}")
    emb = reid_embedding(image_path)
    if emb is None:
        raise RuntimeError(f"Re-ID extraction failed for: {image_path}")
    return [round(float(x), 6) for x in emb.tolist()]

# Backward compatibility alias
extract_real_resnet18_embedding = extract_real_reid_embedding


def seed_database():
    """
    Startup hook. The database is populated ONLY with the real PTR dataset via
    import_real_data.py (camera-locations xlsx + PTR_Tiger_IDs_2025 folders).
    No synthetic demo data is ever fabricated here — if the DB is empty the
    operator runs:  python import_real_data.py --fresh
    """
    ensure_schema()
    db = SessionLocal()
    try:
        n_tigers = db.query(Tiger).count()
        n_caps = db.query(Capture).count()
        if n_tigers == 0:
            print("[INFO] Database is empty — run `python import_real_data.py --fresh` "
                  "to load the real PTR 2025 dataset (tigers, captures, camera stations).")
        else:
            print(f"[INFO] Database present: {n_tigers} tigers, {n_caps} captures. Skipping seed.")
    finally:
        db.close()
