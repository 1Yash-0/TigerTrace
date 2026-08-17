"""
Entity Extractor — Pulls tiger IDs, station IDs, time ranges, and severity
filters from natural language queries using regex + database validation.
"""
import re
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session


# ── Tiger ID patterns ──────────────────────────────────────────────────────────
# Matches: "PTR-T01", "T-01", "T01", "tiger 1", "tiger 01", "t1", "tiger T01"
_TIGER_ID_PATTERNS = [
    re.compile(r'\b(PTR-T\d{1,2})\b', re.IGNORECASE),
    re.compile(r'\bT-?(\d{1,2})\b', re.IGNORECASE),
    re.compile(r'\btiger\s*(?:#?\s*)?(\d{1,2})\b', re.IGNORECASE),
]

# Tiger names → IDs (loaded from DB on first call)
_TIGER_NAME_MAP: dict = {}

# ── Station ID patterns ───────────────────────────────────────────────────────
_STATION_PATTERNS = [
    re.compile(r'\b(ST-\d{1,2})\b', re.IGNORECASE),
    re.compile(r'\bstation\s*(?:#?\s*)?(\d{1,2})\b', re.IGNORECASE),
]

# ── Time range patterns ──────────────────────────────────────────────────────
_TIME_PATTERNS = {
    'today':      re.compile(r'\btoday\b', re.IGNORECASE),
    'yesterday':  re.compile(r'\byesterday\b', re.IGNORECASE),
    'this_week':  re.compile(r'\bthis\s+week\b', re.IGNORECASE),
    'last_week':  re.compile(r'\blast\s+week\b', re.IGNORECASE),
    'this_month': re.compile(r'\bthis\s+month\b', re.IGNORECASE),
    'last_month': re.compile(r'\blast\s+month\b', re.IGNORECASE),
    'last_n_days': re.compile(r'\blast\s+(\d+)\s+days?\b', re.IGNORECASE),
    'recent':     re.compile(r'\brecent(?:ly)?\b', re.IGNORECASE),
}

# ── Severity patterns ────────────────────────────────────────────────────────
_SEVERITY_PATTERNS = {
    'high':   re.compile(r'\b(?:high|critical|urgent|severe|dangerous)\b', re.IGNORECASE),
    'medium': re.compile(r'\b(?:medium|moderate|warning)\b', re.IGNORECASE),
    'low':    re.compile(r'\b(?:low|minor|info)\b', re.IGNORECASE),
}

# ── Zone patterns ─────────────────────────────────────────────────────────────
_ZONE_PATTERNS = {
    'core':              re.compile(r'\bcore\b', re.IGNORECASE),
    'buffer':            re.compile(r'\bbuffer\b', re.IGNORECASE),
    'village_adjacent':  re.compile(r'\bvillage\b', re.IGNORECASE),
}


def _load_tiger_names(db: Session):
    """Load tiger name → ID map from DB (cached globally)."""
    global _TIGER_NAME_MAP
    if _TIGER_NAME_MAP:
        return
    try:
        from database import Tiger
        tigers = db.query(Tiger).all()
        for t in tigers:
            if t.name:
                _TIGER_NAME_MAP[t.name.lower()] = t.tiger_id
    except Exception:
        pass


def _validate_tiger_id(tiger_id: str, db: Session) -> Optional[str]:
    """Validate and normalize a tiger ID against the database."""
    from database import Tiger
    # Direct match
    tiger = db.query(Tiger).filter(Tiger.tiger_id == tiger_id).first()
    if tiger:
        return tiger.tiger_id
    # Try with PTR- prefix
    padded = f"PTR-T{tiger_id.replace('PTR-T','').replace('T','').replace('t','').lstrip('0') or '0':>02s}"
    tiger = db.query(Tiger).filter(Tiger.tiger_id == padded).first()
    if tiger:
        return tiger.tiger_id
    return None


def _validate_station_id(station_id: str, db: Session) -> Optional[str]:
    """Validate and normalize a station ID against the database."""
    from database import Capture
    # Direct match
    cap = db.query(Capture).filter(Capture.station_id == station_id).first()
    if cap:
        return cap.station_id
    # Try with ST- prefix
    num = station_id.replace('ST-', '').replace('st-', '').lstrip('0') or '0'
    padded = f"ST-{int(num):02d}"
    cap = db.query(Capture).filter(Capture.station_id == padded).first()
    if cap:
        return padded
    return None


def extract_entities(message: str, db: Session) -> dict:
    """
    Extract all entities from a natural language message.
    
    Returns dict with keys:
      - tiger_id: str | None
      - tiger_name: str | None  (the original name if matched by name)
      - station_id: str | None
      - time_range: dict | None  (with 'start', 'end', 'label')
      - severity: str | None
      - zone: str | None
    """
    _load_tiger_names(db)
    entities: dict = {
        "tiger_id": None,
        "tiger_name": None,
        "station_id": None,
        "time_range": None,
        "severity": None,
        "zone": None,
    }

    msg_lower = message.lower()

    # ── Extract tiger ID ─────────────────────────────────────────────────
    for pattern in _TIGER_ID_PATTERNS:
        match = pattern.search(message)
        if match:
            raw = match.group(1) if match.group(1).upper().startswith('PTR') else match.group(1)
            # Normalize to PTR-TXX format
            if raw.upper().startswith('PTR'):
                candidate = raw.upper()
            else:
                num = re.sub(r'[^0-9]', '', raw)
                candidate = f"PTR-T{int(num):02d}"
            validated = _validate_tiger_id(candidate, db)
            if validated:
                entities["tiger_id"] = validated
                break

    # Try name-based match if no ID found
    if not entities["tiger_id"]:
        for name, tid in _TIGER_NAME_MAP.items():
            if name in msg_lower:
                entities["tiger_id"] = tid
                entities["tiger_name"] = name.title()
                break

    # ── Extract station ID ───────────────────────────────────────────────
    for pattern in _STATION_PATTERNS:
        match = pattern.search(message)
        if match:
            raw = match.group(1)
            if raw.upper().startswith('ST'):
                candidate = raw.upper()
            else:
                num = re.sub(r'[^0-9]', '', raw)
                candidate = f"ST-{int(num):02d}"
            validated = _validate_station_id(candidate, db)
            if validated:
                entities["station_id"] = validated
                break

    # ── Extract time range ───────────────────────────────────────────────
    now = datetime.utcnow()
    for label, pattern in _TIME_PATTERNS.items():
        match = pattern.search(message)
        if match:
            if label == 'today':
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                entities["time_range"] = {"start": start.isoformat(), "end": now.isoformat(), "label": "today"}
            elif label == 'yesterday':
                start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                end = now.replace(hour=0, minute=0, second=0, microsecond=0)
                entities["time_range"] = {"start": start.isoformat(), "end": end.isoformat(), "label": "yesterday"}
            elif label == 'this_week':
                start = now - timedelta(days=now.weekday())
                start = start.replace(hour=0, minute=0, second=0, microsecond=0)
                entities["time_range"] = {"start": start.isoformat(), "end": now.isoformat(), "label": "this week"}
            elif label == 'last_week':
                end = now - timedelta(days=now.weekday())
                start = end - timedelta(days=7)
                entities["time_range"] = {"start": start.isoformat(), "end": end.isoformat(), "label": "last week"}
            elif label == 'this_month':
                start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                entities["time_range"] = {"start": start.isoformat(), "end": now.isoformat(), "label": "this month"}
            elif label == 'last_month':
                first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                end = first_this_month
                start = (first_this_month - timedelta(days=1)).replace(day=1)
                entities["time_range"] = {"start": start.isoformat(), "end": end.isoformat(), "label": "last month"}
            elif label == 'last_n_days':
                n = int(match.group(1))
                start = now - timedelta(days=n)
                entities["time_range"] = {"start": start.isoformat(), "end": now.isoformat(), "label": f"last {n} days"}
            elif label == 'recent':
                start = now - timedelta(days=30)
                entities["time_range"] = {"start": start.isoformat(), "end": now.isoformat(), "label": "recent (30 days)"}
            break

    # ── Extract severity ─────────────────────────────────────────────────
    for sev, pattern in _SEVERITY_PATTERNS.items():
        if pattern.search(message):
            entities["severity"] = sev
            break

    # ── Extract zone ─────────────────────────────────────────────────────
    for zone, pattern in _ZONE_PATTERNS.items():
        if pattern.search(message):
            entities["zone"] = zone
            break

    return entities
