"""
Offline SQLite Database & Persistence Engine for Pench Tiger Reserve.
Provides atomic transactions, indexed schemas, and full audit trails.
"""

import os
import sqlite3
from datetime import datetime

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    start_time TEXT,
    end_time TEXT,
    total_images INTEGER DEFAULT 0,
    blanks_quarantined INTEGER DEFAULT 0,
    animals_detected INTEGER DEFAULT 0,
    humans_blurred INTEGER DEFAULT 0,
    tigers_identified INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS stations (
    station_id TEXT PRIMARY KEY,
    station_raw TEXT,
    gps_lat REAL,
    gps_lon REAL,
    zone TEXT DEFAULT 'core',
    is_active INTEGER DEFAULT 1,
    trap_nights INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS images (
    image_id TEXT PRIMARY KEY,
    sha256 TEXT UNIQUE,
    perceptual_hash TEXT,
    filename TEXT,
    absolute_path TEXT,
    relative_path TEXT,
    timestamp_normalized TEXT,
    timestamp_source TEXT,
    station_id TEXT,
    run_id TEXT,
    sequence_id TEXT,
    triage_status TEXT,
    is_corrupt INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY(station_id) REFERENCES stations(station_id),
    FOREIGN KEY(run_id) REFERENCES runs(run_id)
);

CREATE TABLE IF NOT EXISTS detections (
    detection_id TEXT PRIMARY KEY,
    image_id TEXT,
    class_name TEXT,
    confidence REAL,
    x1 REAL,
    y1 REAL,
    x2 REAL,
    y2 REAL,
    model_version TEXT,
    created_at TEXT,
    FOREIGN KEY(image_id) REFERENCES images(image_id)
);

CREATE TABLE IF NOT EXISTS crops (
    crop_id TEXT PRIMARY KEY,
    detection_id TEXT,
    image_id TEXT,
    crop_path TEXT,
    flank_side TEXT DEFAULT 'unknown',
    quality_score REAL,
    is_tiger INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY(detection_id) REFERENCES detections(detection_id),
    FOREIGN KEY(image_id) REFERENCES images(image_id)
);

CREATE TABLE IF NOT EXISTS individuals (
    individual_id TEXT PRIMARY KEY,
    provisional_id TEXT,
    first_seen TEXT,
    last_seen TEXT,
    total_sightings INTEGER DEFAULT 1,
    home_range_sq_km REAL DEFAULT 0.0,
    status TEXT DEFAULT 'confirmed',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS identity_matches (
    match_id TEXT PRIMARY KEY,
    crop_id TEXT,
    image_id TEXT,
    individual_id TEXT,
    top_1_dist REAL,
    top_2_dist REAL,
    margin REAL,
    decision TEXT,
    decision_confidence REAL,
    review_status TEXT DEFAULT 'auto_approved',
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT,
    FOREIGN KEY(crop_id) REFERENCES crops(crop_id),
    FOREIGN KEY(individual_id) REFERENCES individuals(individual_id)
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id TEXT PRIMARY KEY,
    individual_id TEXT,
    alert_type TEXT,
    station_id TEXT,
    event_timestamp TEXT,
    description TEXT,
    distance_km REAL,
    confidence REAL,
    is_acknowledged INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY(individual_id) REFERENCES individuals(individual_id),
    FOREIGN KEY(station_id) REFERENCES stations(station_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    target_type TEXT,
    target_id TEXT,
    old_value TEXT,
    new_value TEXT,
    operator TEXT DEFAULT 'system',
    timestamp TEXT
);

CREATE INDEX IF NOT EXISTS idx_images_station ON images(station_id);
CREATE INDEX IF NOT EXISTS idx_images_timestamp ON images(timestamp_normalized);
CREATE INDEX IF NOT EXISTS idx_matches_individual ON identity_matches(individual_id);
CREATE INDEX IF NOT EXISTS idx_alerts_individual ON alerts(individual_id);
"""

class WildlifeDB:
    def __init__(self, db_path="data/pench_wildlife.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.init_schema()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_schema(self):
        with self.get_connection() as conn:
            conn.executescript(SCHEMA_SQL)
            conn.commit()

    def log_audit(self, action, target_type, target_id, old_val, new_val, operator="system"):
        with self.get_connection() as conn:
            conn.execute(
                "INSERT INTO audit_log (action, target_type, target_id, old_value, new_value, operator, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (action, target_type, target_id, str(old_val), str(new_val), operator, datetime.now().isoformat())
            )
            conn.commit()

if __name__ == "__main__":
    db = WildlifeDB()
    print("Database schema successfully initialized at:", db.db_path)
