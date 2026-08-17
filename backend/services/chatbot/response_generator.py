"""
Response Generator — Converts structured query results into
natural-language responses with contextual action links.
"""
from .schemas import Intent, ActionLink


def generate_response(intent: Intent, entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    """
    Generate a human-readable answer and action links from query results.
    
    Args:
        intent: The classified intent
        entities: Extracted entities
        data: Raw query results from query_engine
    
    Returns:
        Tuple of (answer_text, action_links)
    """
    handler = _RESPONSE_HANDLERS.get(intent)
    if handler:
        return handler(entities, data)
    return _unknown_response(entities, data)


# ══════════════════════════════════════════════════════════════════════════════
# RESPONSE HANDLERS
# ══════════════════════════════════════════════════════════════════════════════

def _tiger_list_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    tigers = data.get("tigers", [])
    if not tigers:
        return "No tigers are currently registered in the database.", []
    
    lines = [f"📋 **{data['count']} tigers** are currently registered in the Pench Tiger Reserve database:\n"]
    for t in tigers:
        last_info = f"last seen at {t['last_station']}" if t['last_station'] else "no captures recorded"
        lines.append(f"• **{t['name']}** ({t['tiger_id']}) — {t['sex']}, {t['total_captures']} captures, {last_info}")
    
    actions = [
        ActionLink(label="View Territory Map", route="/map", icon="MapPin"),
        ActionLink(label="View Identification", route="/identification", icon="Fingerprint"),
    ]
    return "\n".join(lines), actions


def _tiger_profile_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []
    
    d = data
    lines = [
        f"🐅 **Tiger Profile: {d['name']}** ({d['tiger_id']})\n",
        f"• **Sex:** {d['sex']}",
        f"• **Total Captures:** {d['total_captures']}",
        f"• **Stations Visited:** {d['station_count']} stations ({', '.join(d['stations_visited'][:6])}{'...' if d['station_count'] > 6 else ''})",
        f"• **Zone Breakdown:** {', '.join(f'{z}: {c}' for z, c in d['zone_breakdown'].items())}",
        f"• **First Seen:** {d['first_seen'][:10] if d['first_seen'] else 'N/A'}",
        f"• **Last Seen:** {d['last_seen'][:10] if d['last_seen'] else 'N/A'}",
        f"• **Open Alerts:** {d['open_alerts']}",
    ]
    
    actions = [ActionLink(label="View on Map", route="/map", icon="MapPin")]
    if d['open_alerts'] > 0:
        actions.append(ActionLink(label="View Alerts", route="/alerts", icon="AlertTriangle"))
    
    return "\n".join(lines), actions


def _tiger_detections_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []
    
    dets = data.get("detections", [])
    name = data.get("tiger_name", data.get("tiger_id"))
    time_label = data.get("time_filter", "all time")
    
    if not dets:
        return f"No detections found for **{name}** during {time_label}.", []
    
    lines = [f"📍 **{data['count']} detections** for **{name}** ({data['tiger_id']}) — {time_label}:\n"]
    for d in dets[:8]:
        lines.append(f"• {d['timestamp'][:10]} at **{d['station_id']}** ({d['zone']}) — confidence {d['confidence']:.0%}")
    
    if data['count'] > 8:
        lines.append(f"\n_...and {data['count'] - 8} more detections_")
    
    return "\n".join(lines), [ActionLink(label="View on Map", route="/map", icon="MapPin")]


def _tiger_movement_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []
    
    if "movements" in data:
        # All tigers summary
        lines = [f"🗺️ **Movement summary for {data['count']} tigers:**\n"]
        for m in data["movements"]:
            lines.append(f"• **{m['name']}** ({m['tiger_id']}) — {m['total_captures']} captures across {len(m['station_sequence'])} stations")
            lines.append(f"  Route: {' → '.join(m['station_sequence'][:6])}{'...' if len(m['station_sequence']) > 6 else ''}")
        return "\n".join(lines), [ActionLink(label="View Territory Map", route="/map", icon="MapPin")]
    
    timeline = data.get("timeline", [])
    name = data.get("tiger_name", data.get("tiger_id"))
    
    lines = [f"🗺️ **Movement timeline for {name}** ({data['tiger_id']}) — {data['total_moves']} records, {data['unique_stations']} unique stations:\n"]
    for t in timeline[:10]:
        dist = f", moved {t['distance_from_prev_km']} km" if 'distance_from_prev_km' in t else ""
        lines.append(f"• {t['timestamp'][:10]} — **{t['station_id']}** ({t['zone']}){dist}")
    
    if len(timeline) > 10:
        lines.append(f"\n_...and {len(timeline) - 10} more movements_")
    
    return "\n".join(lines), [ActionLink(label="View on Map", route="/map", icon="MapPin")]


def _home_range_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []
    
    if "home_range" in data:
        r = data["home_range"]
        lines = [
            f"🏔️ **Home Range: {r['name']}** ({r['tiger_id']})\n",
            f"• **Area:** {r['area_sq_km']} sq km (MCP method)",
            f"• **Centroid:** {r['centroid'][0]:.5f}°N, {r['centroid'][1]:.5f}°E",
            f"• **Stations:** {', '.join(r['stations_visited'])}",
        ]
        return "\n".join(lines), [ActionLink(label="View on Map", route="/map", icon="MapPin")]
    
    ranges = data.get("home_ranges", [])
    largest = data.get("largest")
    lines = [f"🏔️ **Home ranges for {data['count']} tigers** (sorted by area):\n"]
    for r in ranges:
        lines.append(f"• **{r['name']}** ({r['tiger_id']}) — **{r['area_sq_km']} sq km**, {len(r['stations_visited'])} stations")
    
    if largest:
        lines.append(f"\n🏆 Largest territory: **{largest['name']}** at {largest['area_sq_km']} sq km")
    
    return "\n".join(lines), [ActionLink(label="View Territory Map", route="/map", icon="MapPin")]


def _territory_overlaps_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    overlaps = data.get("overlaps", [])
    if not overlaps:
        return "No territory overlaps detected between any tiger pairs.", []
    
    lines = [f"🔄 **{data['count']} territory overlaps** detected:\n"]
    for o in overlaps:
        lines.append(f"• **{o['tiger_a']}** ↔ **{o['tiger_b']}** — {o['overlap_area_sq_km']} sq km overlap")
    
    return "\n".join(lines), [ActionLink(label="View on Map", route="/map", icon="MapPin")]


def _tiger_alerts_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    alerts = data.get("alerts", [])
    tiger_id = data.get("tiger_id", "")
    
    if not alerts:
        return f"✅ No alerts on record for **{tiger_id}**.", []
    
    lines = [f"⚠️ **{data['total_count']} alerts** for **{tiger_id}** ({data['open_count']} open):\n"]
    for a in alerts[:6]:
        icon = "🔴" if a["severity"] == "high" else "🟡" if a["severity"] == "medium" else "🟢"
        status = "OPEN" if not a["resolved"] else "RESOLVED"
        lines.append(f"{icon} [{status}] **{a['alert_type']}** — {a['message'][:120]}")
    
    return "\n".join(lines), [ActionLink(label="View All Alerts", route="/alerts", icon="AlertTriangle")]


def _buffer_movement_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    tigers = data.get("tigers_in_buffer", [])
    if not tigers:
        return "✅ No tigers have been detected in buffer or village-adjacent zones.", []
    
    lines = [f"⚠️ **{data['total_tigers']} tigers** detected in buffer/village zones:\n"]
    for t in tigers:
        lines.append(f"• **{t['name']}** ({t['tiger_id']}) — {t['count']} captures in buffer zone")
    
    return "\n".join(lines), [
        ActionLink(label="View Alerts", route="/alerts", icon="AlertTriangle"),
        ActionLink(label="View on Map", route="/map", icon="MapPin"),
    ]


def _absent_tigers_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    absent = data.get("absent_tigers", [])
    if not absent:
        return "✅ All tigers have been seen within the last 30 days.", []
    
    lines = [f"🔍 **{data['count']} tigers** with prolonged absence (≥30 days):\n"]
    for t in absent:
        lines.append(f"• **{t['name']}** ({t['tiger_id']}) — **{t['days_absent']} days** absent, last at {t['last_station']} on {t['last_seen'][:10]}")
    
    return "\n".join(lines), [ActionLink(label="View Alerts", route="/alerts", icon="AlertTriangle")]


def _station_activity_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "station_id" in data:
        d = data
        village = "⚠️ village-adjacent" if d.get("is_village_adjacent") else ""
        lines = [
            f"📡 **Station {d['station_id']}** {village}\n",
            f"• **Total Captures:** {d['total_captures']}",
            f"• **Tigers Detected:** {d['tiger_count']} ({', '.join(d['tigers_seen'])})",
            f"• **Zone:** {d.get('zone', 'unknown')}",
            f"• **Latest Activity:** {d['latest_capture'][:10] if d.get('latest_capture') else 'N/A'}",
        ]
        return "\n".join(lines), [ActionLink(label="View on Map", route="/map", icon="MapPin")]
    
    stations = data.get("stations", [])
    lines = [f"📡 **{data['count']} camera stations** ranked by activity:\n"]
    for s in stations[:10]:
        village = " ⚠️" if s["is_village_adjacent"] else ""
        lines.append(f"• **{s['station_id']}** — {s['total_captures']} captures, {s['tiger_count']} tigers{village}")
    
    return "\n".join(lines), [ActionLink(label="View Territory Map", route="/map", icon="MapPin")]


def _recent_alerts_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    alerts = data.get("alerts", [])
    sev_filter = data.get("severity_filter")
    
    if not alerts:
        msg = f"✅ No {sev_filter + ' ' if sev_filter else ''}alerts found."
        return msg, []
    
    lines = [f"⚠️ **{data['total_count']} alerts** ({data['open_count']} open){f' — filtered by {sev_filter} severity' if sev_filter else ''}:\n"]
    for a in alerts[:8]:
        icon = "🔴" if a["severity"] == "high" else "🟡" if a["severity"] == "medium" else "🟢"
        status = "OPEN" if not a["resolved"] else "RESOLVED"
        lines.append(f"{icon} [{status}] **{a['tiger_id']}** — {a['alert_type']}: {a['message'][:100]}")
    
    if data['total_count'] > 8:
        lines.append(f"\n_...and {data['total_count'] - 8} more alerts_")
    
    return "\n".join(lines), [ActionLink(label="View All Alerts", route="/alerts", icon="AlertTriangle")]


def _movement_deviations_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    devs = data.get("deviations", [])
    if not devs:
        return "✅ No abnormal movement deviations currently detected.", []
    
    lines = [f"🚨 **{data['count']} movement deviations** detected:\n"]
    for d in devs:
        icon = "🔴" if d["severity"] == "high" else "🟡"
        lines.append(f"{icon} **{d['tiger_id']}** — {d['type']}: {d['message'][:120]}")
    
    return "\n".join(lines), [
        ActionLink(label="View Alerts", route="/alerts", icon="AlertTriangle"),
        ActionLink(label="View on Map", route="/map", icon="MapPin"),
    ]


def _high_risk_stations_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    stations = data.get("high_risk_stations", [])
    if not stations:
        return "✅ No high-risk stations identified.", []
    
    lines = [f"🚨 **{data['count']} stations** with elevated risk:\n"]
    for s in stations:
        icon = "🔴" if s["risk_level"] == "high" else "🟡" if s["risk_level"] == "medium" else "🟢"
        village = " (village-adjacent)" if s["is_village_adjacent"] else ""
        lines.append(f"{icon} **{s['station_id']}**{village} — {s['total_captures']} captures, {s['associated_alerts']} alerts")
    
    return "\n".join(lines), [ActionLink(label="View on Map", route="/map", icon="MapPin")]


def _village_proximity_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    stations = data.get("village_stations", [])
    if not stations:
        return "No tiger detections at village-adjacent stations.", []
    
    lines = [f"🏘️ **{data['count']} village-adjacent stations** with tiger activity:\n"]
    for s in stations:
        lines.append(f"• **{s['station_id']}** — Tigers: {', '.join(s['tigers_detected'])}, {s['total_captures']} captures, last: {s['last_activity'][:10]}")
    
    return "\n".join(lines), [
        ActionLink(label="View Alerts", route="/alerts", icon="AlertTriangle"),
        ActionLink(label="View on Map", route="/map", icon="MapPin"),
    ]


def _processing_stats_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"ℹ️ {data['error']}", [ActionLink(label="Run Triage", route="/triage", icon="ScanSearch")]
    
    latest = data["latest_run"]
    hist = data["historical"]
    
    lines = [
        f"📊 **Image Processing Statistics**\n",
        f"**Latest Run** ({latest['run_at'][:10] if latest.get('run_at') else 'N/A'}):",
        f"• Total Images: {latest['total_images']}",
        f"• Blanks Removed: {latest['blanks_removed']}",
        f"• Retained: {latest['retained']}",
        f"• Storage Saved: {latest['saved_mb']} MB",
        f"• Time Saved: {latest['saved_minutes']} min\n",
        f"**Cumulative** ({hist['total_runs']} runs):",
        f"• Total Processed: {hist['total_processed']} images",
        f"• Total Blanks Removed: {hist['total_blanks_removed']}",
    ]
    
    return "\n".join(lines), [ActionLink(label="Run Triage", route="/triage", icon="ScanSearch")]


def _blank_filtering_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "message" in data:
        return f"ℹ️ {data['message']}", [ActionLink(label="Run Triage", route="/triage", icon="ScanSearch")]
    
    latest = data["latest"]
    lines = [
        f"🗑️ **Blank Image Filtering Results**\n",
        f"• Blanks Removed: **{latest['blanks_removed']}** out of {latest['total_images']} images ({latest['filter_rate_pct']}%)",
        f"• Images Retained: {latest['retained']}",
        f"• Storage Saved: {latest['saved_mb']} MB",
        f"• Time Saved: {latest['saved_minutes']} minutes",
        f"• Last Run: {latest['run_at'][:10] if latest.get('run_at') else 'N/A'}",
    ]
    
    return "\n".join(lines), [ActionLink(label="View Triage", route="/triage", icon="ScanSearch")]


def _cycle_summary_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    d = data
    lines = [
        f"📋 **Monitoring Cycle Summary — Pench Tiger Reserve**\n",
        f"🐅 **Tigers:** {d['total_tigers']} identified individuals",
        f"📸 **Captures:** {d['total_captures']} total detections",
        f"⚠️ **Open Alerts:** {d['open_alerts']}",
        f"🔍 **Pending Review:** {d['pending_review']} images",
    ]
    
    if d.get("most_active_tiger"):
        t = d["most_active_tiger"]
        lines.append(f"🏆 **Most Active:** {t['name']} ({t['tiger_id']}) with {t['captures']} captures")
    
    if d.get("alert_breakdown"):
        ab = d["alert_breakdown"]
        lines.append(f"\n**Alert Breakdown:** {', '.join(f'{k}: {v}' for k, v in ab.items())}")
    
    if d.get("latest_triage"):
        lt = d["latest_triage"]
        lines.append(f"\n**Latest Triage:** {lt['blanks_removed']} blanks removed, {lt['saved_mb']} MB saved")
    
    return "\n".join(lines), [
        ActionLink(label="Dashboard", route="/", icon="LayoutDashboard"),
        ActionLink(label="View Alerts", route="/alerts", icon="AlertTriangle"),
        ActionLink(label="View Map", route="/map", icon="MapPin"),
    ]


def _review_status_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    lines = [
        f"🔍 **Review Queue Status**\n",
        f"• **Pending:** {data['pending_count']} images awaiting review",
        f"• **Confirmed:** {data['confirmed_count']} matches confirmed",
        f"• **New Individuals:** {data['new_individual_count']} registered",
    ]
    
    if data["pending_items"]:
        lines.append(f"\n**Pending Items:**")
        for item in data["pending_items"][:4]:
            lines.append(f"• #{item['id']} — Top match: {item['top_match_id']} ({item['top_match_confidence']:.0%}), Alt: {item['alt_match_id']} ({item['alt_match_confidence']:.0%})")
    
    return "\n".join(lines), [ActionLink(label="Review Queue", route="/identification", icon="Fingerprint")]


def _new_tigers_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    tigers = data.get("tigers", [])
    if not tigers:
        return "No tigers in the database yet.", []
    
    lines = [f"🆕 **{data['count']} tigers** in database (most recently enrolled first):\n"]
    for t in tigers[:6]:
        lines.append(f"• **{t['name']}** ({t['tiger_id']}) — {t['sex']}, enrolled {t['enrolled_at'][:10] if t.get('enrolled_at') else 'N/A'}, {t['total_captures']} captures")
    
    return "\n".join(lines), [ActionLink(label="View Identification", route="/identification", icon="Fingerprint")]


def _camera_health_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    issues = data.get("issues", [])
    
    if not issues:
        return f"✅ All {data['total_stations']} camera stations appear healthy.", []
    
    lines = [f"📡 **Camera Health Report** — {data['issue_count']} issues, {data['healthy_count']} healthy:\n"]
    for s in issues:
        icon = "🔴" if s["status"] == "inactive" else "🟡"
        lines.append(f"{icon} **{s['station_id']}** — {s['status']}, inactive for {s['days_inactive']} days, {s['total_captures']} total captures")
    
    return "\n".join(lines), [ActionLink(label="View Map", route="/map", icon="MapPin")]


def _system_status_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    lines = [
        f"🟢 **System Status: OPERATIONAL**\n",
        f"• **Mode:** {data['mode']}",
        f"• **Database:** {data['database']}",
        f"• **Tigers:** {data['tigers_in_db']}",
        f"• **Captures:** {data['captures_in_db']}",
        f"• **Open Alerts:** {data['open_alerts']}",
        f"• **Pending Reviews:** {data['pending_reviews']}",
        f"• **Last Triage:** {data['last_triage'][:10] if data['last_triage'] != 'never' else 'never'}",
    ]
    
    return "\n".join(lines), [ActionLink(label="Dashboard", route="/", icon="LayoutDashboard")]


def _help_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    lines = [
        "🤖 **Pench AI Conservation Intelligence Assistant**\n",
        "I can answer questions about the Pench Tiger Reserve using our local database. Here's what I know about:\n",
        "**🐅 Tigers**",
        '• "Show all tigers" — list all identified individuals',
        '• "Tell me about T-01" — detailed tiger profile',
        '• "Where was Choti Tara detected?" — detection history',
        '• "Show movement history of T-03" — movement timeline\n',
        "**🗺️ Territory & Movement**",
        '• "What is T-01\'s home range?" — territory analysis',
        '• "Which tigers overlap?" — territory overlap analysis',
        '• "Which tigers entered the buffer zone?" — buffer zone activity',
        '• "Which tigers show abnormal movement?" — deviation alerts\n',
        "**⚠️ Alerts & Safety**",
        '• "Show high severity alerts" — filtered alert view',
        '• "Which stations are near villages?" — human-wildlife conflict',
        '• "Which tigers haven\'t been seen recently?" — absence monitoring',
        '• "Which stations are high risk?" — risk assessment\n',
        "**📊 Monitoring**",
        '• "Give me a summary" — full monitoring cycle overview',
        '• "How many images were processed?" — triage statistics',
        '• "How many images need review?" — review queue status',
        '• "Camera health check" — station status report',
        '• "System status" — system health check\n',
        "_All responses are generated from local data. No internet required._ 🔒",
    ]
    return "\n".join(lines), [
        ActionLink(label="Dashboard", route="/", icon="LayoutDashboard"),
        ActionLink(label="Territory Map", route="/map", icon="MapPin"),
        ActionLink(label="Alerts", route="/alerts", icon="AlertTriangle"),
    ]


def _unknown_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    tiger_id = entities.get("tiger_id")
    station_id = entities.get("station_id")
    
    msg = "🤔 I'm not sure I understand that question. "
    
    if tiger_id:
        msg += f"I noticed you mentioned **{tiger_id}**. "
        msg += 'Try asking something like "Tell me about ' + tiger_id + '" or "Where was ' + tiger_id + ' detected?"'
    elif station_id:
        msg += f"I noticed you mentioned **{station_id}**. "
        msg += 'Try asking "What\'s the activity at ' + station_id + '?"'
    else:
        msg += 'Try asking questions like:\n'
        msg += '• "Show all tigers"\n'
        msg += '• "Give me a summary"\n'
        msg += '• "Show high severity alerts"\n'
        msg += '• "Which tigers entered the buffer zone?"\n\n'
        msg += 'Type "help" for a full list of what I can do.'
    
    return msg, [ActionLink(label="See All Commands", route="/chat", icon="MessageSquare")]


def _patrol_priority_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "detail" in data:
        return _station_patrol_priority_response(entities, data)

    summary = data.get("summary", {})
    stations = data.get("stations", [])
    counts = summary.get("summary_counts", {})

    lines = [
        f"🎯 **Today's Station Patrol Priority Board — Pench Tiger Reserve**\n",
        f"• **Critical:** {counts.get('critical', 0)} stations (🔴 score ≥75)",
        f"• **High:** {counts.get('high', 0)} stations (🟠 score 50–74)",
        f"• **Moderate:** {counts.get('moderate', 0)} stations (🟡 score 25–49)",
        f"• **Low:** {counts.get('low', 0)} stations (🟢 score <25)\n",
        f"**Top Recommended Patrol Stations:**",
    ]

    for st in stations[:6]:
        v_tag = " [Village Adjacent]" if st.get("is_village_adjacent") else ""
        lines.append(
            f"{st['badge_icon']} **{st['station_id']}** — **{st['priority_score']}/100** ({st['priority_level']}){v_tag} • Confidence {st['evidence_confidence']}%\n"
            f"   Drivers: {st['top_reasons'][0] if st.get('top_reasons') else 'Routine'}"
        )

    return "\n".join(lines), [
        ActionLink(label="Patrol Intelligence", route="/patrol", icon="ShieldAlert"),
        ActionLink(label="Territory Map", route="/map", icon="MapPin"),
    ]


def _station_patrol_priority_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []

    st = data.get("detail", {})
    comps = st.get("components", {})
    mvt = comps.get("movement", {})
    conf = comps.get("conflict", {})
    anom = comps.get("anomaly", {})
    ev_conf = comps.get("confidence", {})

    lines = [
        f"🎯 **Station {st['station_id']} Patrol Priority: {st['priority_score']}/100** ({st['badge_icon']} {st['priority_level']})\n",
        f"• **Evidence Confidence:** {st['evidence_confidence']}% (Survey quality rating)",
        f"• **Reserve Zone:** {st['zone'].title()}{' — ⚠️ Village Interface Corridor' if st['is_village_adjacent'] else ''}",
        f"• **Tiger Activity:** {st['total_captures']} total captures across {st['unique_tigers_count']} individual(s)\n",
        f"**Factor Breakdown & Score Contributions:**",
        f"• 🐅 **Movement Activity:** {mvt.get('score', 0)}/100 (+{mvt.get('contribution', 0)} pts) — {mvt.get('evidence', [''])[0]}",
        f"• 🏘️ **Conflict Proximity:** {conf.get('score', 0)}/100 (+{conf.get('contribution', 0)} pts) — {conf.get('evidence', [''])[0]}",
        f"• ⚠️ **Recent Anomalies:** {anom.get('score', 0)}/100 (+{anom.get('contribution', 0)} pts) — {anom.get('evidence', [''])[0]}\n",
        f"**Why Prioritized:**",
        f"_{st.get('why_explanation', '')}_",
    ]

    # Add contributing tigers if any
    tigers = st.get("contributing_tigers", [])
    if tigers:
        t_summary = ", ".join(f"{t['name']} ({t['captures_at_station']} caps)" for t in tigers[:3])
        lines.append(f"\n**Contributing Individuals:** {t_summary}")

    return "\n".join(lines), [
        ActionLink(label="View on Map", route="/map", icon="MapPin"),
        ActionLink(label="Patrol Board", route="/patrol", icon="ShieldAlert"),
    ]


def _suggested_patrol_sequence_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    sequence = data.get("sequence", [])
    if not sequence:
        return "No suggested patrol sequence available.", []

    lines = [
        f"🧭 **Suggested Tactical Patrol Sequence**\n",
        f"Prioritized deployment order based on active tiger movements and risk signals:\n",
    ]

    for item in sequence:
        v_tag = " ⚠️ Village Boundary" if item.get("is_village_adjacent") else ""
        lines.append(
            f"**{item['order']}. {item['badge_icon']} {item['station_id']}** ({item['priority_score']}/100 - {item['priority_level']}){v_tag}\n"
            f"   Objective: _{item['tactical_objective']}_"
        )

    return "\n".join(lines), [
        ActionLink(label="Patrol Intelligence", route="/patrol", icon="ShieldAlert"),
        ActionLink(label="Territory Map", route="/map", icon="MapPin"),
    ]


def _patrol_trend_response(entities: dict, data: dict) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []

    sid = data.get("station_id", "")
    score = data.get("current_score", 0)
    level = data.get("priority_level", "")
    trend = data.get("cycle_trend", [])

    lines = [
        f"📈 **Patrol Priority Trend: Station {sid}**\n",
        f"• **Current Score:** {score}/100 ({level})",
        f"• **Trajectory:**\n",
    ]

    for c in trend:
        lines.append(f"• {c['cycle']}: **{c['score']}/100**")

    if data.get("why_explanation"):
        lines.append(f"\n_{data['why_explanation']}_")

    return "\n".join(lines), [
        ActionLink(label="Patrol Board", route="/patrol", icon="ShieldAlert"),
        ActionLink(label="Territory Map", route="/map", icon="MapPin"),
    ]


# ── Handler registry ──────────────────────────────────────────────────────────
_RESPONSE_HANDLERS = {
    Intent.GET_TIGER_LIST:          _tiger_list_response,
    Intent.GET_TIGER_PROFILE:       _tiger_profile_response,
    Intent.GET_TIGER_DETECTIONS:    _tiger_detections_response,
    Intent.GET_TIGER_MOVEMENT:      _tiger_movement_response,
    Intent.GET_TIGER_HOME_RANGE:    _home_range_response,
    Intent.GET_TERRITORY_OVERLAPS:  _territory_overlaps_response,
    Intent.GET_TIGER_ALERTS:        _tiger_alerts_response,
    Intent.GET_BUFFER_MOVEMENT:     _buffer_movement_response,
    Intent.GET_ABSENT_TIGERS:       _absent_tigers_response,
    Intent.GET_STATION_ACTIVITY:    _station_activity_response,
    Intent.GET_RECENT_ALERTS:       _recent_alerts_response,
    Intent.GET_MOVEMENT_DEVIATIONS: _movement_deviations_response,
    Intent.GET_HIGH_RISK_STATIONS:  _high_risk_stations_response,
    Intent.GET_VILLAGE_PROXIMITY:   _village_proximity_response,
    Intent.GET_PROCESSING_STATS:    _processing_stats_response,
    Intent.GET_BLANK_FILTERING:     _blank_filtering_response,
    Intent.GET_CYCLE_SUMMARY:       _cycle_summary_response,
    Intent.GET_REVIEW_STATUS:       _review_status_response,
    Intent.GET_NEW_TIGERS:          _new_tigers_response,
    Intent.GET_CAMERA_HEALTH:       _camera_health_response,
    Intent.GET_SYSTEM_STATUS:       _system_status_response,
    Intent.GET_PATROL_PRIORITY:     _patrol_priority_response,
    Intent.GET_STATION_PATROL_PRIORITY: _station_patrol_priority_response,
    Intent.GET_SUGGESTED_PATROL_SEQUENCE: _suggested_patrol_sequence_response,
    Intent.GET_PATROL_TREND:        _patrol_trend_response,
    Intent.GET_HELP:                _help_response,
    Intent.UNKNOWN:                 _unknown_response,
}

