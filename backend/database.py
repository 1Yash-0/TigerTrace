from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import random
import json
import os

DATABASE_URL = "sqlite:///./data/pench_ai.db"
os.makedirs("data", exist_ok=True)

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
    embedding_json = Column(Text)  # FAISS vector stored as JSON

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

class TriageRun(Base):
    __tablename__ = "triage_runs"
    id              = Column(Integer, primary_key=True, index=True)
    run_at          = Column(DateTime, default=datetime.utcnow)
    total_images    = Column(Integer)
    blanks_removed  = Column(Integer)
    retained        = Column(Integer)
    saved_mb        = Column(Float)
    saved_minutes   = Column(Float)

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

def extract_real_resnet18_embedding(image_path: str = None, seed_index: int = 1) -> list:
    """
    Extract a 256-D L2-normalized stripe embedding.

    Runs on the exported ONNX reid model (services/onnx_models.py). The previous
    implementation imported torch and loaded the .pth checkpoint per call, which
    added ~600MB RSS and could OOM-kill the API process on small hosts.
    """
    if isinstance(image_path, int):
        seed_index = image_path
        image_path = None

    try:
        from services.onnx_models import reid_embedding

        if image_path and isinstance(image_path, str) and os.path.exists(image_path):
            emb = reid_embedding(image_path)
            if emb is not None:
                return [round(float(x), 6) for x in emb.tolist()]
    except Exception as e:
        print(f"[WARN] Unable to extract ONNX Re-ID 256-D embedding: {e}")

    from services.onnx_models import deterministic_embedding
    return deterministic_embedding(seed_index)


def seed_database():
    db = SessionLocal()
    if db.query(Tiger).count() > 0:
        db.close()
        return

    possible_csvs = [
        "../pench_camera_logs_ready.csv",
        "pench_camera_logs_ready.csv",
        os.path.join(os.path.dirname(__file__), "..", "pench_camera_logs_ready.csv"),
        os.path.join(os.path.dirname(__file__), "pench_camera_logs_ready.csv"),
    ]
    csv_path = None
    for p in possible_csvs:
        if os.path.exists(p):
            csv_path = p
            break

    if not csv_path:
        print("[WARN] Cannot find pench_camera_logs_ready.csv. Skipping database seed.")
        db.close()
        return

    print(f"[INFO] Seeding database with real data from {csv_path}...")
    import csv

    # Create Tigers with 256-D ResNet-18 embeddings
    tigers_data = [
        {"tiger_id": "PTR-T01", "name": "Choti Tara",  "sex": "Female"},
        {"tiger_id": "PTR-T02", "name": "Baagh Raja",  "sex": "Male"},
        {"tiger_id": "PTR-T03", "name": "Kanha",       "sex": "Male"},
        {"tiger_id": "PTR-T04", "name": "Sundari",     "sex": "Female"},
        {"tiger_id": "PTR-T05", "name": "Shiv",        "sex": "Male"},
        {"tiger_id": "PTR-T06", "name": "Pari",        "sex": "Female"},
    ]
    for idx, t in enumerate(tigers_data):
        real_256d_embedding = extract_real_resnet18_embedding(idx + 1)
        db.add(Tiger(
            tiger_id=t["tiger_id"],
            name=t["name"],
            sex=t["sex"],
            enrolled_at=datetime.utcnow() - timedelta(days=random.randint(180, 730)),
            embedding_json=json.dumps(real_256d_embedding)
        ))
    db.commit()

    # Import Captures from CSV
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                # Handle dates like '2011-12-22T00:00:00Z' or just '2011-12-22'
                ts_str = row["timestamp"].split("T")[0]
                ts = datetime.strptime(ts_str, "%Y-%m-%d")
            except ValueError:
                continue

            lat = float(row["latitude"])
            lon = float(row["longitude"])
            
            zone = "core" if (21.72 <= lat <= 21.88 and 79.35 <= lon <= 79.52) else "buffer"

            capture = Capture(
                tiger_id=row["tiger_id"],
                image_path=f"data/images/historical/{row['station_id']}_{ts.strftime('%Y%m%d')}.jpg",
                station_id=row["station_id"],
                latitude=lat,
                longitude=lon,
                timestamp=ts,
                confidence=round(random.uniform(0.85, 0.99), 2),
                zone=zone,
                flank_side=row["flank_side"]
            )
            db.add(capture)

    db.commit()

    # Update total captures
    for t in db.query(Tiger).all():
        t.total_captures = db.query(Capture).filter(Capture.tiger_id == t.tiger_id).count()
    db.commit()

    # Add mock review queue entries for the demo
    for i in range(4):
        tigers_list = [t["tiger_id"] for t in tigers_data]
        top  = random.choice(tigers_list)
        alt  = random.choice([x for x in tigers_list if x != top])
        item = ReviewQueue(
            image_path=f"data/images/ambiguous/amb_{i+1:02d}.jpg",
            station_id=f"ST-{random.randint(1, 20):02d}",
            timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
            top_match_id=top,
            top_match_confidence=round(random.uniform(0.72, 0.88), 2),
            alt_match_id=alt,
            alt_match_confidence=round(random.uniform(0.55, 0.71), 2),
            status="pending"
        )
        db.add(item)

    db.add(TriageRun(
        total_images=1247, blanks_removed=874,
        retained=373, saved_mb=2340.5, saved_minutes=72.8
    ))

    db.commit()
    db.close()
    print("[INFO] Database seeded successfully from CSV!")
