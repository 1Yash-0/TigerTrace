"""
Part 4 — Deviation & Trend Alerting Service

PS Requirements:
  • Range shifts beyond defined thresholds (15–20 sq km in core, 5 km in buffer)
  • First capture at a previously unused station
  • Movement into or toward buffer or village-adjacent stations
  • Prolonged absence of a previously regular individual
  • Alerts must distinguish genuine behavioural deviations from survey artefacts
  • Each alert must include: detected change, supporting evidence, confidence level
"""
import json
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import Capture, Tiger, Alert

# ── Thresholds (PS-defined) ───────────────────────────────────────────────────
CORE_AREA_SHIFT_SQ_KM = 15.0   # alert if home range area shifts by ≥15 sq km (core)
BUFFER_CENTROID_KM     = 5.0    # alert if centroid shifts ≥5 km (buffer)
VILLAGE_PROX_KM        = 5.0    # critical proximity to village boundary
MIN_CAPTURES_FOR_ALERT = 3      # minimum historical captures to avoid survey artefacts
RECENT_WINDOW_DAYS     = 30     # sliding window for "recent" captures

# ── Pench Reserve zone boundaries (approx) ────────────────────────────────────
CORE_LAT_MIN, CORE_LAT_MAX = 21.72, 21.88
CORE_LON_MIN, CORE_LON_MAX = 79.35, 79.52

# Known village-adjacent stations (stations near human settlements)
VILLAGE_ADJACENT_STATIONS = {"ST-03", "ST-04", "ST-06", "ST-07", "ST-08", "ST-09"}


# ══════════════════════════════════════════════════════════════════════════════
# MATH UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two GPS points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def _centroid(captures) -> tuple:
    """Arithmetic mean of lat/lon for a set of captures."""
    if not captures:
        return None, None
    lats = [c.latitude for c in captures]
    lons = [c.longitude for c in captures]
    return round(sum(lats) / len(lats), 5), round(sum(lons) / len(lons), 5)


def _mcp_area_sq_km(captures) -> float:
    """
    Minimum Convex Polygon area in sq km using the Shoelace formula.
    Uses a local flat-Earth approximation (valid for small reserves).
    """
    if len(captures) < 3:
        return 0.0

    points = [(c.latitude, c.longitude) for c in captures]

    # Convex hull via Graham scan
    def cross(O, A, B):
        return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0])

    points = sorted(set(points))
    if len(points) < 3:
        return 0.0

    lower = []
    for p in points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    hull = lower[:-1] + upper[:-1]

    if len(hull) < 3:
        return 0.0

    # Shoelace formula in lat/lon, then scale to km²
    # 1° lat ≈ 111.0 km, 1° lon ≈ 111.0 × cos(mean_lat) km
    mean_lat = sum(p[0] for p in hull) / len(hull)
    km_per_lat = 111.0
    km_per_lon = 111.0 * math.cos(math.radians(mean_lat))

    n = len(hull)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        xi = hull[i][1] * km_per_lon
        yi = hull[i][0] * km_per_lat
        xj = hull[j][1] * km_per_lon
        yj = hull[j][0] * km_per_lat
        area += xi * yj
        area -= xj * yi
    return round(abs(area) / 2.0, 2)


def _classify_zone(lat: float, lon: float) -> str:
    """Classify a coordinate as core, buffer, or village_adjacent."""
    if CORE_LAT_MIN <= lat <= CORE_LAT_MAX and CORE_LON_MIN <= lon <= CORE_LON_MAX:
        return "core"
    return "buffer"


def _compass_direction(lat1, lon1, lat2, lon2) -> str:
    """Determine the cardinal direction of movement."""
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    if abs(dlat) < 0.001 and abs(dlon) < 0.001:
        return "stationary"
    angle = math.degrees(math.atan2(dlon, dlat))
    if angle < 0:
        angle += 360
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = int((angle + 22.5) / 45) % 8
    return dirs[idx]


# ══════════════════════════════════════════════════════════════════════════════
# SURVEY ARTEFACT FILTER
# ══════════════════════════════════════════════════════════════════════════════

def _is_survey_artefact(tiger: Tiger, historical: list, recent: list) -> bool:
    """
    PS: "Alerts must distinguish genuine behavioural deviations from survey artefacts."

    A change is likely a survey artefact (not a real behavioural shift) when:
      - The tiger has very few historical captures (insufficient baseline)
      - The recent captures are all from a single survey burst (< 3 days span)
        while the historical record spans months → could just be a new survey area
    """
    if len(historical) < MIN_CAPTURES_FOR_ALERT:
        return True  # not enough history to judge

    if len(recent) >= 2:
        dates = sorted(c.timestamp for c in recent)
        span_days = (dates[-1] - dates[0]).days
        # If all recent captures are within a 2-day burst, it's likely a single
        # survey event, not a sustained behavioural change.
        if span_days <= 2 and len(recent) <= 3:
            return True

    return False


# ══════════════════════════════════════════════════════════════════════════════
# ALERT ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def run_alert_engine(db: Session) -> dict:
    """
    Compare each tiger's recent captures against its established history and
    raise alerts for meaningful deviations.  Returns a structured summary.
    """
    new_alerts       = []
    skipped_artefact = 0
    now              = datetime.utcnow()
    tigers           = db.query(Tiger).all()

    for tiger in tigers:
        all_captures = (
            db.query(Capture)
            .filter(Capture.tiger_id == tiger.tiger_id)
            .order_by(Capture.timestamp)
            .all()
        )
        if not all_captures:
            continue

        recent     = [c for c in all_captures if c.timestamp >= now - timedelta(days=RECENT_WINDOW_DAYS)]
        historical = [c for c in all_captures if c.timestamp <  now - timedelta(days=RECENT_WINDOW_DAYS)]

        # ── Rule 1: Prolonged Absence ─────────────────────────────────────
        # PS: "prolonged absence of a previously regular individual"
        # Calibrate threshold to the individual's own capture frequency.
        last_capture = all_captures[-1]
        days_absent  = (now - last_capture.timestamp).days

        if historical:
            # Calculate the individual's average inter-capture interval
            hist_dates = sorted(c.timestamp for c in all_captures)
            if len(hist_dates) >= 2:
                total_span = (hist_dates[-1] - hist_dates[0]).days
                avg_interval = total_span / (len(hist_dates) - 1) if len(hist_dates) > 1 else 30
                # Alert if absent for ≥ 3× their typical interval, minimum 30 days
                absence_threshold = max(30, int(avg_interval * 3))
            else:
                absence_threshold = 30
        else:
            absence_threshold = 30

        if days_absent >= absence_threshold:
            existing = db.query(Alert).filter(
                Alert.tiger_id   == tiger.tiger_id,
                Alert.alert_type == "absence",
                Alert.resolved   == False
            ).first()
            if not existing:
                # Confidence scales with how far past threshold we are
                conf = round(min(0.99, 0.60 + (days_absent - absence_threshold) * 0.008), 2)
                a = Alert(
                    tiger_id   = tiger.tiger_id,
                    alert_type = "absence",
                    severity   = "high" if days_absent >= absence_threshold * 2 else "medium",
                    message    = (
                        f"{tiger.name} ({tiger.tiger_id}) has not been captured for "
                        f"{days_absent} days (threshold: {absence_threshold} days based on "
                        f"individual capture frequency). Last seen at {last_capture.station_id}."
                    ),
                    evidence   = json.dumps({
                        "detected_change": "prolonged_absence",
                        "days_absent":     days_absent,
                        "threshold_days":  absence_threshold,
                        "last_station":    last_capture.station_id,
                        "last_seen_date":  last_capture.timestamp.isoformat(),
                        "total_historical_captures": len(all_captures),
                    }),
                    confidence = conf
                )
                db.add(a)
                new_alerts.append({
                    "tiger_id": tiger.tiger_id, "name": tiger.name,
                    "type": "absence", "severity": a.severity,
                    "confidence": conf, "message": a.message,
                })

        # ── Survey artefact gate ──────────────────────────────────────────
        if _is_survey_artefact(tiger, historical, recent):
            skipped_artefact += 1
            continue  # skip spatial rules — not enough data for genuine alert

        # ── Rule 2: Range Shift (Area-based for core, distance for buffer) ─
        # PS: "range shifts beyond defined thresholds
        #      (15–20 sq km in the core and 5 km in the buffer region)"
        if recent and historical:
            curr_lat, curr_lon = _centroid(recent)
            hist_lat, hist_lon = _centroid(historical)
            if curr_lat and hist_lat:
                # Determine the zone of the tiger's recent activity
                recent_zone = _classify_zone(curr_lat, curr_lon)
                direction   = _compass_direction(hist_lat, hist_lon, curr_lat, curr_lon)

                triggered    = False
                shift_detail = {}

                if recent_zone == "core":
                    # Area-based comparison: compare MCP area change
                    hist_area = _mcp_area_sq_km(historical)
                    curr_area = _mcp_area_sq_km(recent)
                    # Also calculate centroid displacement
                    centroid_shift_km = _haversine(hist_lat, hist_lon, curr_lat, curr_lon)

                    # The PS says "range shifts beyond 15-20 sq km".
                    # We check if: (a) the MCP area expanded/contracted by ≥15 sq km, OR
                    #               (b) the centroid moved far enough that the new area
                    #                   no longer overlaps meaningfully.
                    area_change = abs(curr_area - hist_area)
                    if area_change >= CORE_AREA_SHIFT_SQ_KM or centroid_shift_km >= 15.0:
                        triggered = True
                        shift_detail = {
                            "method":            "area_comparison (MCP)",
                            "historical_area_sq_km": hist_area,
                            "recent_area_sq_km":     curr_area,
                            "area_change_sq_km":     round(area_change, 2),
                            "centroid_shift_km":     centroid_shift_km,
                            "threshold_sq_km":       CORE_AREA_SHIFT_SQ_KM,
                            "zone":                  "core",
                        }
                else:
                    # Buffer region: linear centroid displacement ≥ 5 km
                    centroid_shift_km = _haversine(hist_lat, hist_lon, curr_lat, curr_lon)
                    if centroid_shift_km >= BUFFER_CENTROID_KM:
                        triggered = True
                        shift_detail = {
                            "method":            "centroid_displacement",
                            "centroid_shift_km": centroid_shift_km,
                            "threshold_km":      BUFFER_CENTROID_KM,
                            "zone":              "buffer",
                        }

                if triggered:
                    existing = db.query(Alert).filter(
                        Alert.tiger_id   == tiger.tiger_id,
                        Alert.alert_type == "range_shift",
                        Alert.resolved   == False
                    ).first()
                    if not existing:
                        sev = "high" if shift_detail.get("area_change_sq_km", 0) >= 20 or \
                                        shift_detail.get("centroid_shift_km", 0) >= 10 else "medium"
                        conf = round(min(0.99, 0.70 + len(recent) * 0.02), 2)
                        a = Alert(
                            tiger_id   = tiger.tiger_id,
                            alert_type = "range_shift",
                            severity   = sev,
                            message    = (
                                f"{tiger.name} ({tiger.tiger_id}) — range shift detected "
                                f"in {recent_zone} zone, direction {direction}. "
                                + (f"Home range area changed by {shift_detail.get('area_change_sq_km', 'N/A')} sq km. "
                                   if recent_zone == "core" else
                                   f"Centroid displaced by {shift_detail.get('centroid_shift_km', 'N/A')} km. ")
                                + f"Based on {len(recent)} recent vs {len(historical)} historical captures."
                            ),
                            evidence   = json.dumps({
                                "detected_change":  "range_shift",
                                "direction":        direction,
                                "prev_centroid":    [round(hist_lat, 5), round(hist_lon, 5)],
                                "new_centroid":     [round(curr_lat, 5), round(curr_lon, 5)],
                                **shift_detail,
                                "recent_captures":  len(recent),
                                "historical_captures": len(historical),
                            }),
                            confidence = conf
                        )
                        db.add(a)
                        new_alerts.append({
                            "tiger_id": tiger.tiger_id, "name": tiger.name,
                            "type": "range_shift", "severity": sev,
                            "confidence": conf, "message": a.message,
                        })

        # ── Rule 3: First capture at a previously unused station ──────────
        # PS: "first capture at a previously unused station"
        historical_stations = {c.station_id for c in historical}
        for capture in recent:
            if capture.station_id not in historical_stations:
                # Check if this is movement toward village-adjacent area
                is_village = (
                    capture.station_id in VILLAGE_ADJACENT_STATIONS or
                    capture.zone == "village_adjacent"
                )
                alert_type = "village_proximity" if is_village else "new_station"
                sev        = "high" if is_village else "low"

                existing = db.query(Alert).filter(
                    Alert.tiger_id   == tiger.tiger_id,
                    Alert.alert_type == alert_type,
                    Alert.evidence.contains(capture.station_id),
                    Alert.resolved   == False
                ).first()
                if not existing:
                    conf = 0.95 if is_village else 0.80
                    a = Alert(
                        tiger_id   = tiger.tiger_id,
                        alert_type = alert_type,
                        severity   = sev,
                        message    = (
                            f"{tiger.name} ({tiger.tiger_id}) detected at "
                            f"{capture.station_id} for the FIRST TIME. "
                            + (f"⚠ This station is near human settlements — potential "
                               f"human-wildlife conflict risk." if is_village else
                               f"This is a new territory expansion.")
                        ),
                        evidence   = json.dumps({
                            "detected_change":    "new_station" if not is_village else "village_proximity",
                            "station":            capture.station_id,
                            "zone":               capture.zone or _classify_zone(capture.latitude, capture.longitude),
                            "lat":                capture.latitude,
                            "lon":                capture.longitude,
                            "capture_date":       capture.timestamp.isoformat(),
                            "village_adjacent":   is_village,
                            "known_stations":     list(historical_stations),
                            "total_known_stations": len(historical_stations),
                        }),
                        confidence = conf
                    )
                    db.add(a)
                    new_alerts.append({
                        "tiger_id": tiger.tiger_id, "name": tiger.name,
                        "type": alert_type, "severity": sev,
                        "confidence": conf, "message": a.message,
                    })

        # ── Rule 4: Movement toward buffer/village-adjacent stations ──────
        # PS: "movement into or toward buffer or village-adjacent stations"
        # This catches tigers whose historical captures were all core-zone but
        # are now appearing in buffer or village zones.
        if historical and recent:
            hist_zones = {c.zone or _classify_zone(c.latitude, c.longitude) for c in historical}
            for capture in recent:
                cap_zone = capture.zone or _classify_zone(capture.latitude, capture.longitude)
                if cap_zone in ("buffer", "village_adjacent") and "buffer" not in hist_zones and "village_adjacent" not in hist_zones:
                    existing = db.query(Alert).filter(
                        Alert.tiger_id   == tiger.tiger_id,
                        Alert.alert_type == "zone_transition",
                        Alert.resolved   == False
                    ).first()
                    if not existing:
                        sev  = "high" if cap_zone == "village_adjacent" else "medium"
                        conf = 0.90
                        a = Alert(
                            tiger_id   = tiger.tiger_id,
                            alert_type = "zone_transition",
                            severity   = sev,
                            message    = (
                                f"{tiger.name} ({tiger.tiger_id}) has moved from core zone "
                                f"into {cap_zone} zone. Historically seen only in: "
                                f"{', '.join(hist_zones)}. Captured at {capture.station_id}."
                            ),
                            evidence   = json.dumps({
                                "detected_change":   "zone_transition",
                                "from_zones":        list(hist_zones),
                                "to_zone":           cap_zone,
                                "station":           capture.station_id,
                                "lat":               capture.latitude,
                                "lon":               capture.longitude,
                                "capture_date":      capture.timestamp.isoformat(),
                            }),
                            confidence = conf
                        )
                        db.add(a)
                        new_alerts.append({
                            "tiger_id": tiger.tiger_id, "name": tiger.name,
                            "type": "zone_transition", "severity": sev,
                            "confidence": conf, "message": a.message,
                        })
                    break  # one alert per tiger per run

    db.commit()

    return {
        "status":              "completed",
        "tigers_analysed":     len(tigers),
        "new_alerts_raised":   len(new_alerts),
        "skipped_as_artefact": skipped_artefact,
        "alerts":              new_alerts,
    }
