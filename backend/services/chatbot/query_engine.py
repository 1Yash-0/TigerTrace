"""
Query Engine — Safe, read-only database queries for the chatbot.
All queries use the existing SQLAlchemy ORM models. No raw SQL.
No INSERT, UPDATE, or DELETE operations permitted.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database import Tiger, Capture, TriageRun, ReviewQueue, Alert
from .schemas import Intent


# ── Village-adjacent stations (same as alert_service.py) ──────────────────────
VILLAGE_ADJACENT_STATIONS = {"ST-03", "ST-04", "ST-06", "ST-07", "ST-08", "ST-09"}


def execute_query(intent: Intent, entities: dict, db: Session) -> dict:
    """
    Execute the appropriate read-only query for the given intent.
    
    Args:
        intent: The classified Intent
        entities: Extracted entities dict
        db: SQLAlchemy session
    
    Returns:
        dict with structured query results
    """
    handler = _QUERY_HANDLERS.get(intent)
    if handler:
        return handler(entities, db)
    return {"error": "No handler for this intent"}


# ══════════════════════════════════════════════════════════════════════════════
# QUERY HANDLERS
# ══════════════════════════════════════════════════════════════════════════════

def _get_tiger_list(entities: dict, db: Session) -> dict:
    tigers = db.query(Tiger).all()
    result = []
    for t in tigers:
        latest = db.query(Capture).filter(Capture.tiger_id == t.tiger_id)\
                   .order_by(Capture.timestamp.desc()).first()
        result.append({
            "tiger_id": t.tiger_id,
            "name": t.name,
            "sex": t.sex,
            "total_captures": t.total_captures,
            "last_seen": latest.timestamp.isoformat() if latest else None,
            "last_station": latest.station_id if latest else None,
        })
    return {"tigers": result, "count": len(result)}


def _get_tiger_profile(entities: dict, db: Session) -> dict:
    tiger_id = entities.get("tiger_id")
    if not tiger_id:
        return {"error": "No tiger specified"}
    
    tiger = db.query(Tiger).filter(Tiger.tiger_id == tiger_id).first()
    if not tiger:
        return {"error": f"Tiger {tiger_id} not found in database"}
    
    captures = db.query(Capture).filter(Capture.tiger_id == tiger_id)\
                 .order_by(Capture.timestamp.desc()).all()
    
    stations = list({c.station_id for c in captures})
    zones = {}
    for c in captures:
        zones[c.zone] = zones.get(c.zone, 0) + 1
    
    first_seen = min(c.timestamp for c in captures) if captures else None
    last_seen = max(c.timestamp for c in captures) if captures else None
    
    # Open alerts for this tiger
    open_alerts = db.query(Alert).filter(
        Alert.tiger_id == tiger_id,
        Alert.resolved == False
    ).count()
    
    return {
        "tiger_id": tiger.tiger_id,
        "name": tiger.name,
        "sex": tiger.sex,
        "total_captures": tiger.total_captures,
        "stations_visited": stations,
        "station_count": len(stations),
        "zone_breakdown": zones,
        "first_seen": first_seen.isoformat() if first_seen else None,
        "last_seen": last_seen.isoformat() if last_seen else None,
        "open_alerts": open_alerts,
        "enrolled_at": tiger.enrolled_at.isoformat() if tiger.enrolled_at else None,
    }


def _get_tiger_detections(entities: dict, db: Session) -> dict:
    tiger_id = entities.get("tiger_id")
    if not tiger_id:
        return {"error": "No tiger specified"}
    
    tiger = db.query(Tiger).filter(Tiger.tiger_id == tiger_id).first()
    if not tiger:
        return {"error": f"Tiger {tiger_id} not found"}
    
    query = db.query(Capture).filter(Capture.tiger_id == tiger_id)
    
    # Apply time filter if present
    time_range = entities.get("time_range")
    if time_range:
        start = datetime.fromisoformat(time_range["start"])
        end = datetime.fromisoformat(time_range["end"])
        query = query.filter(Capture.timestamp >= start, Capture.timestamp <= end)
    
    captures = query.order_by(Capture.timestamp.desc()).limit(20).all()
    
    return {
        "tiger_id": tiger_id,
        "tiger_name": tiger.name,
        "detections": [{
            "station_id": c.station_id,
            "timestamp": c.timestamp.isoformat(),
            "latitude": c.latitude,
            "longitude": c.longitude,
            "zone": c.zone,
            "confidence": c.confidence,
            "flank_side": c.flank_side,
        } for c in captures],
        "count": len(captures),
        "time_filter": time_range.get("label") if time_range else "all time",
    }


def _get_tiger_movement(entities: dict, db: Session) -> dict:
    tiger_id = entities.get("tiger_id")
    if not tiger_id:
        # Show movement summary for all tigers
        tigers = db.query(Tiger).all()
        summaries = []
        for t in tigers:
            caps = db.query(Capture).filter(Capture.tiger_id == t.tiger_id)\
                     .order_by(Capture.timestamp).all()
            if len(caps) < 2:
                continue
            stations = list(dict.fromkeys(c.station_id for c in caps))  # ordered unique
            zones = list(dict.fromkeys(c.zone for c in caps))
            summaries.append({
                "tiger_id": t.tiger_id,
                "name": t.name,
                "station_sequence": stations,
                "zones_visited": zones,
                "total_captures": len(caps),
            })
        return {"movements": summaries, "count": len(summaries)}
    
    tiger = db.query(Tiger).filter(Tiger.tiger_id == tiger_id).first()
    if not tiger:
        return {"error": f"Tiger {tiger_id} not found"}
    
    captures = db.query(Capture).filter(Capture.tiger_id == tiger_id)\
                 .order_by(Capture.timestamp).all()
    
    # Build movement timeline
    timeline = []
    for i, c in enumerate(captures):
        entry = {
            "station_id": c.station_id,
            "timestamp": c.timestamp.isoformat(),
            "zone": c.zone,
            "lat": c.latitude,
            "lon": c.longitude,
        }
        if i > 0:
            from services.alert_service import _haversine
            prev = captures[i - 1]
            entry["distance_from_prev_km"] = _haversine(
                prev.latitude, prev.longitude, c.latitude, c.longitude
            )
            entry["days_since_prev"] = (c.timestamp - prev.timestamp).days
        timeline.append(entry)
    
    return {
        "tiger_id": tiger_id,
        "tiger_name": tiger.name,
        "timeline": timeline,
        "total_moves": len(timeline),
        "unique_stations": len({c.station_id for c in captures}),
    }


def _get_tiger_home_range(entities: dict, db: Session) -> dict:
    from services.geospatial_service import get_tiger_home_ranges
    ranges = get_tiger_home_ranges(db)
    
    tiger_id = entities.get("tiger_id")
    if tiger_id:
        for r in ranges:
            if r["tiger_id"] == tiger_id:
                return {"home_range": r, "found": True}
        return {"error": f"No home range data for {tiger_id}", "found": False}
    
    # Return all, sorted by area
    sorted_ranges = sorted(ranges, key=lambda x: x["area_sq_km"], reverse=True)
    return {
        "home_ranges": [{
            "tiger_id": r["tiger_id"],
            "name": r["name"],
            "area_sq_km": r["area_sq_km"],
            "centroid": r["centroid"],
            "stations_visited": r["stations_visited"],
        } for r in sorted_ranges],
        "largest": sorted_ranges[0] if sorted_ranges else None,
        "smallest": sorted_ranges[-1] if sorted_ranges else None,
        "count": len(sorted_ranges),
    }


def _get_territory_overlaps(entities: dict, db: Session) -> dict:
    from services.geospatial_service import get_territory_overlaps
    overlaps = get_territory_overlaps(db)
    
    tiger_id = entities.get("tiger_id")
    if tiger_id:
        relevant = [o for o in overlaps if tiger_id in (o["tiger_a"], o["tiger_b"])]
        return {"overlaps": relevant, "count": len(relevant), "tiger_id": tiger_id}
    
    return {"overlaps": overlaps, "count": len(overlaps)}


def _get_tiger_alerts(entities: dict, db: Session) -> dict:
    tiger_id = entities.get("tiger_id")
    if not tiger_id:
        return _get_recent_alerts(entities, db)
    
    alerts = db.query(Alert).filter(Alert.tiger_id == tiger_id)\
               .order_by(Alert.created_at.desc()).all()
    
    return {
        "tiger_id": tiger_id,
        "alerts": [{
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "confidence": a.confidence,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "resolved": a.resolved,
        } for a in alerts],
        "open_count": sum(1 for a in alerts if not a.resolved),
        "total_count": len(alerts),
    }


def _get_buffer_movement(entities: dict, db: Session) -> dict:
    buffer_captures = db.query(Capture).filter(
        Capture.zone.in_(["buffer", "village_adjacent"])
    ).order_by(Capture.timestamp.desc()).all()
    
    # Group by tiger
    tiger_map = {}
    for c in buffer_captures:
        if c.tiger_id not in tiger_map:
            tiger_map[c.tiger_id] = []
        tiger_map[c.tiger_id].append({
            "station_id": c.station_id,
            "timestamp": c.timestamp.isoformat(),
            "zone": c.zone,
            "lat": c.latitude,
            "lon": c.longitude,
        })
    
    # Get tiger names
    result = []
    for tid, caps in tiger_map.items():
        tiger = db.query(Tiger).filter(Tiger.tiger_id == tid).first()
        result.append({
            "tiger_id": tid,
            "name": tiger.name if tiger else tid,
            "buffer_captures": caps,
            "count": len(caps),
        })
    
    return {"tigers_in_buffer": result, "total_tigers": len(result)}


def _get_absent_tigers(entities: dict, db: Session) -> dict:
    now = datetime.utcnow()
    tigers = db.query(Tiger).all()
    absent = []
    
    for t in tigers:
        latest = db.query(Capture).filter(Capture.tiger_id == t.tiger_id)\
                   .order_by(Capture.timestamp.desc()).first()
        if latest:
            days = (now - latest.timestamp).days
            if days >= 30:
                absent.append({
                    "tiger_id": t.tiger_id,
                    "name": t.name,
                    "days_absent": days,
                    "last_station": latest.station_id,
                    "last_seen": latest.timestamp.isoformat(),
                })
    
    absent.sort(key=lambda x: x["days_absent"], reverse=True)
    return {"absent_tigers": absent, "count": len(absent)}


def _get_station_activity(entities: dict, db: Session) -> dict:
    station_id = entities.get("station_id")
    
    if station_id:
        captures = db.query(Capture).filter(Capture.station_id == station_id)\
                     .order_by(Capture.timestamp.desc()).all()
        tigers_seen = list({c.tiger_id for c in captures})
        return {
            "station_id": station_id,
            "total_captures": len(captures),
            "tigers_seen": tigers_seen,
            "tiger_count": len(tigers_seen),
            "latest_capture": captures[0].timestamp.isoformat() if captures else None,
            "zone": captures[0].zone if captures else None,
            "is_village_adjacent": station_id in VILLAGE_ADJACENT_STATIONS,
        }
    
    # All stations ranked by activity
    station_counts = db.query(
        Capture.station_id,
        func.count(Capture.id).label("count")
    ).group_by(Capture.station_id).order_by(desc("count")).all()
    
    result = []
    for sid, count in station_counts:
        tigers = db.query(Capture.tiger_id).filter(
            Capture.station_id == sid
        ).distinct().all()
        result.append({
            "station_id": sid,
            "total_captures": count,
            "tiger_count": len(tigers),
            "is_village_adjacent": sid in VILLAGE_ADJACENT_STATIONS,
        })
    
    return {"stations": result, "count": len(result)}


def _get_recent_alerts(entities: dict, db: Session) -> dict:
    query = db.query(Alert).order_by(Alert.created_at.desc())
    
    severity = entities.get("severity")
    if severity:
        query = query.filter(Alert.severity == severity)
    
    # Default: show unresolved
    alerts = query.limit(20).all()
    
    open_count = sum(1 for a in alerts if not a.resolved)
    
    return {
        "alerts": [{
            "id": a.id,
            "tiger_id": a.tiger_id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "confidence": a.confidence,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "resolved": a.resolved,
        } for a in alerts],
        "open_count": open_count,
        "total_count": len(alerts),
        "severity_filter": severity,
    }


def _get_movement_deviations(entities: dict, db: Session) -> dict:
    alerts = db.query(Alert).filter(
        Alert.alert_type.in_(["range_shift", "zone_transition", "new_station"]),
        Alert.resolved == False
    ).order_by(Alert.created_at.desc()).all()
    
    return {
        "deviations": [{
            "tiger_id": a.tiger_id,
            "type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "confidence": a.confidence,
        } for a in alerts],
        "count": len(alerts),
    }


def _get_high_risk_stations(entities: dict, db: Session) -> dict:
    # Stations with alerts or village-adjacent with recent activity
    alert_stations = set()
    alerts = db.query(Alert).filter(Alert.resolved == False).all()
    import json as _json
    for a in alerts:
        try:
            ev = _json.loads(a.evidence) if a.evidence else {}
            if "station" in ev:
                alert_stations.add(ev["station"])
        except Exception:
            pass
    
    result = []
    for sid in VILLAGE_ADJACENT_STATIONS | alert_stations:
        cap_count = db.query(Capture).filter(Capture.station_id == sid).count()
        alert_count = 0
        for a in alerts:
            try:
                ev = _json.loads(a.evidence) if a.evidence else {}
                if ev.get("station") == sid:
                    alert_count += 1
            except Exception:
                pass
        result.append({
            "station_id": sid,
            "is_village_adjacent": sid in VILLAGE_ADJACENT_STATIONS,
            "total_captures": cap_count,
            "associated_alerts": alert_count,
            "risk_level": "high" if sid in VILLAGE_ADJACENT_STATIONS and alert_count > 0 else
                          "medium" if sid in VILLAGE_ADJACENT_STATIONS or alert_count > 0 else "low",
        })
    
    result.sort(key=lambda x: ("high", "medium", "low").index(x["risk_level"]))
    return {"high_risk_stations": result, "count": len(result)}


def _get_village_proximity(entities: dict, db: Session) -> dict:
    result = []
    for sid in VILLAGE_ADJACENT_STATIONS:
        captures = db.query(Capture).filter(Capture.station_id == sid)\
                     .order_by(Capture.timestamp.desc()).all()
        tigers = list({c.tiger_id for c in captures})
        if captures:
            result.append({
                "station_id": sid,
                "tigers_detected": tigers,
                "total_captures": len(captures),
                "last_activity": captures[0].timestamp.isoformat(),
            })
    return {"village_stations": result, "count": len(result)}


def _get_processing_stats(entities: dict, db: Session) -> dict:
    runs = db.query(TriageRun).order_by(TriageRun.run_at.desc()).limit(5).all()
    if not runs:
        return {"error": "No triage runs found", "runs": []}
    
    latest = runs[0]
    total_processed = sum(r.total_images for r in runs)
    total_blanks = sum(r.blanks_removed for r in runs)
    
    return {
        "latest_run": {
            "run_at": latest.run_at.isoformat() if latest.run_at else None,
            "total_images": latest.total_images,
            "blanks_removed": latest.blanks_removed,
            "retained": latest.retained,
            "saved_mb": latest.saved_mb,
            "saved_minutes": latest.saved_minutes,
        },
        "historical": {
            "total_runs": len(runs),
            "total_processed": total_processed,
            "total_blanks_removed": total_blanks,
        },
    }


def _get_blank_filtering(entities: dict, db: Session) -> dict:
    runs = db.query(TriageRun).order_by(TriageRun.run_at.desc()).limit(5).all()
    if not runs:
        return {"message": "No triage runs recorded yet"}
    
    latest = runs[0]
    return {
        "latest": {
            "blanks_removed": latest.blanks_removed,
            "total_images": latest.total_images,
            "retained": latest.retained,
            "filter_rate_pct": round((latest.blanks_removed / max(latest.total_images, 1)) * 100, 1),
            "saved_mb": latest.saved_mb,
            "saved_minutes": latest.saved_minutes,
            "run_at": latest.run_at.isoformat() if latest.run_at else None,
        },
        "total_runs": len(runs),
    }


def _get_cycle_summary(entities: dict, db: Session) -> dict:
    tigers = db.query(Tiger).all()
    total_captures = db.query(Capture).count()
    open_alerts = db.query(Alert).filter(Alert.resolved == False).count()
    pending_review = db.query(ReviewQueue).filter(ReviewQueue.status == "pending").count()
    latest_triage = db.query(TriageRun).order_by(TriageRun.run_at.desc()).first()
    
    # Most active tiger
    most_active = max(tigers, key=lambda t: t.total_captures) if tigers else None
    
    # Recent alerts by type
    alert_types = db.query(Alert.alert_type, func.count(Alert.id))\
                    .filter(Alert.resolved == False)\
                    .group_by(Alert.alert_type).all()
    
    return {
        "total_tigers": len(tigers),
        "total_captures": total_captures,
        "open_alerts": open_alerts,
        "pending_review": pending_review,
        "most_active_tiger": {
            "tiger_id": most_active.tiger_id,
            "name": most_active.name,
            "captures": most_active.total_captures,
        } if most_active else None,
        "alert_breakdown": {at: count for at, count in alert_types},
        "latest_triage": {
            "blanks_removed": latest_triage.blanks_removed,
            "saved_mb": latest_triage.saved_mb,
            "run_at": latest_triage.run_at.isoformat() if latest_triage and latest_triage.run_at else None,
        } if latest_triage else None,
    }


def _get_review_status(entities: dict, db: Session) -> dict:
    pending = db.query(ReviewQueue).filter(ReviewQueue.status == "pending").all()
    confirmed = db.query(ReviewQueue).filter(ReviewQueue.status == "confirmed").count()
    new_ind = db.query(ReviewQueue).filter(ReviewQueue.status == "new_individual").count()
    
    return {
        "pending_items": [{
            "id": i.id,
            "image_path": i.image_path,
            "station_id": i.station_id,
            "top_match_id": i.top_match_id,
            "top_match_confidence": i.top_match_confidence,
            "alt_match_id": i.alt_match_id,
            "alt_match_confidence": i.alt_match_confidence,
        } for i in pending],
        "pending_count": len(pending),
        "confirmed_count": confirmed,
        "new_individual_count": new_ind,
    }


def _get_new_tigers(entities: dict, db: Session) -> dict:
    # Tigers enrolled most recently
    tigers = db.query(Tiger).order_by(Tiger.enrolled_at.desc()).all()
    result = []
    for t in tigers:
        result.append({
            "tiger_id": t.tiger_id,
            "name": t.name,
            "sex": t.sex,
            "enrolled_at": t.enrolled_at.isoformat() if t.enrolled_at else None,
            "total_captures": t.total_captures,
        })
    return {"tigers": result, "count": len(result)}


def _get_camera_health(entities: dict, db: Session) -> dict:
    now = datetime.utcnow()
    # Get all stations and their last activity
    all_stations = db.query(
        Capture.station_id,
        func.max(Capture.timestamp).label("last_active"),
        func.count(Capture.id).label("total")
    ).group_by(Capture.station_id).all()
    
    issues = []
    healthy = []
    for sid, last_active, total in all_stations:
        days_inactive = (now - last_active).days if last_active else 9999
        status = "inactive" if days_inactive > 90 else "low_activity" if total < 5 else "healthy"
        entry = {
            "station_id": sid,
            "last_active": last_active.isoformat() if last_active else None,
            "days_inactive": days_inactive,
            "total_captures": total,
            "status": status,
        }
        if status != "healthy":
            issues.append(entry)
        else:
            healthy.append(entry)
    
    return {
        "issues": issues,
        "healthy_count": len(healthy),
        "issue_count": len(issues),
        "total_stations": len(all_stations),
    }


def _get_system_status(entities: dict, db: Session) -> dict:
    tiger_count = db.query(Tiger).count()
    capture_count = db.query(Capture).count()
    alert_count = db.query(Alert).filter(Alert.resolved == False).count()
    review_count = db.query(ReviewQueue).filter(ReviewQueue.status == "pending").count()
    latest_triage = db.query(TriageRun).order_by(TriageRun.run_at.desc()).first()
    
    return {
        "status": "operational",
        "database": "connected",
        "tigers_in_db": tiger_count,
        "captures_in_db": capture_count,
        "open_alerts": alert_count,
        "pending_reviews": review_count,
        "last_triage": latest_triage.run_at.isoformat() if latest_triage and latest_triage.run_at else "never",
        "mode": "OFFLINE",
    }


def _get_patrol_priority(entities: dict, db: Session) -> dict:
    station_id = entities.get("station_id")
    if station_id:
        return _get_station_patrol_priority(entities, db)
    
    from services.patrol_service import get_patrol_summary, get_station_patrol_priorities
    summary = get_patrol_summary(db)
    all_stations = get_station_patrol_priorities(db)
    return {
        "summary": summary,
        "stations": all_stations[:10],
        "total_stations": len(all_stations),
    }


def _get_station_patrol_priority(entities: dict, db: Session) -> dict:
    station_id = entities.get("station_id")
    if not station_id:
        from services.patrol_service import get_station_patrol_priorities
        top = get_station_patrol_priorities(db)
        if top:
            station_id = top[0]["station_id"]
        else:
            return {"error": "No station specified or available."}

    from services.patrol_service import get_station_patrol_detail
    detail = get_station_patrol_detail(station_id, db)
    if not detail:
        return {"error": f"No data found for station {station_id}"}
    return {"detail": detail}


def _get_suggested_patrol_sequence(entities: dict, db: Session) -> dict:
    from services.patrol_service import get_suggested_patrol_sequence
    sequence = get_suggested_patrol_sequence(db, limit=6)
    return {"sequence": sequence, "count": len(sequence)}


def _get_patrol_trend(entities: dict, db: Session) -> dict:
    station_id = entities.get("station_id")
    from services.patrol_service import get_station_patrol_detail, get_station_patrol_priorities
    if not station_id:
        top = get_station_patrol_priorities(db)
        station_id = top[0]["station_id"] if top else "ST-17"

    detail = get_station_patrol_detail(station_id, db)
    if not detail:
        return {"error": f"No trend data found for station {station_id}"}
    return {
        "station_id": station_id,
        "current_score": detail["priority_score"],
        "priority_level": detail["priority_level"],
        "cycle_trend": detail.get("cycle_trend", []),
        "why_explanation": detail.get("why_explanation", ""),
    }


# ── Handler registry ──────────────────────────────────────────────────────────
_QUERY_HANDLERS = {
    Intent.GET_TIGER_LIST:          _get_tiger_list,
    Intent.GET_TIGER_PROFILE:       _get_tiger_profile,
    Intent.GET_TIGER_DETECTIONS:    _get_tiger_detections,
    Intent.GET_TIGER_MOVEMENT:      _get_tiger_movement,
    Intent.GET_TIGER_HOME_RANGE:    _get_tiger_home_range,
    Intent.GET_TERRITORY_OVERLAPS:  _get_territory_overlaps,
    Intent.GET_TIGER_ALERTS:        _get_tiger_alerts,
    Intent.GET_BUFFER_MOVEMENT:     _get_buffer_movement,
    Intent.GET_ABSENT_TIGERS:       _get_absent_tigers,
    Intent.GET_STATION_ACTIVITY:    _get_station_activity,
    Intent.GET_RECENT_ALERTS:       _get_recent_alerts,
    Intent.GET_MOVEMENT_DEVIATIONS: _get_movement_deviations,
    Intent.GET_HIGH_RISK_STATIONS:  _get_high_risk_stations,
    Intent.GET_VILLAGE_PROXIMITY:   _get_village_proximity,
    Intent.GET_PROCESSING_STATS:    _get_processing_stats,
    Intent.GET_BLANK_FILTERING:     _get_blank_filtering,
    Intent.GET_CYCLE_SUMMARY:       _get_cycle_summary,
    Intent.GET_REVIEW_STATUS:       _get_review_status,
    Intent.GET_NEW_TIGERS:          _get_new_tigers,
    Intent.GET_CAMERA_HEALTH:       _get_camera_health,
    Intent.GET_SYSTEM_STATUS:       _get_system_status,
    Intent.GET_PATROL_PRIORITY:     _get_patrol_priority,
    Intent.GET_STATION_PATROL_PRIORITY: _get_station_patrol_priority,
    Intent.GET_SUGGESTED_PATROL_SEQUENCE: _get_suggested_patrol_sequence,
    Intent.GET_PATROL_TREND:        _get_patrol_trend,
}

