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
    tiger_id    = Column(String)
    alert_type  = Column(String)   # range_shift | new_station | village_proximity | absence | zone_transition
    severity    = Column(String)   # high | medium | low
    message     = Column(Text)
    evidence    = Column(Text)
    confidence  = Column(Float)
    created_at  = Column(DateTime, default=datetime.utcnow)
    resolved    = Column(Boolean, default=False)

# ─── Create tables ──────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_database():
    db = SessionLocal()
    if db.query(Tiger).count() > 0:
        db.close()
        return

    csv_path = "../pench_camera_logs_ready.csv"
    if not os.path.exists(csv_path):
        print(f"[WARN] Cannot find {csv_path}. Skipping database seed.")
        db.close()
        return

    print(f"[INFO] Seeding database with real data from {csv_path}...")
    import csv

    # Create Tigers
    tigers_data = [
        {"tiger_id": "PTR-T01", "name": "Choti Tara",  "sex": "Female"},
        {"tiger_id": "PTR-T02", "name": "Baagh Raja",  "sex": "Male"},
        {"tiger_id": "PTR-T03", "name": "Kanha",       "sex": "Male"},
        {"tiger_id": "PTR-T04", "name": "Sundari",     "sex": "Female"},
        {"tiger_id": "PTR-T05", "name": "Shiv",        "sex": "Male"},
        {"tiger_id": "PTR-T06", "name": "Pari",        "sex": "Female"},
    ]
    for t in tigers_data:
        fake_embedding = [round(random.uniform(-1, 1), 4) for _ in range(128)]
        db.add(Tiger(
            tiger_id=t["tiger_id"],
            name=t["name"],
            sex=t["sex"],
            enrolled_at=datetime.utcnow() - timedelta(days=random.randint(180, 730)),
            embedding_json=json.dumps(fake_embedding)
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
