"""
Response Generator — Converts structured query results into
natural-language responses with contextual action links.

All template strings are localized (en/hi/mr) via response_translations.T;
data values (names, IDs, numbers, dates) stay as-is. The chatbot service
passes the request language through generate_response.
"""
from .schemas import Intent, ActionLink
from .response_translations import T


def generate_response(intent: Intent, entities: dict, data: dict, lang: str = "en") -> tuple[str, list[ActionLink]]:
    """
    Generate a human-readable answer and action links from query results.

    Args:
        intent: The classified intent
        entities: Extracted entities
        data: Raw query results from query_engine
        lang: Response language ("en" | "hi" | "mr")

    Returns:
        Tuple of (answer_text, action_links)
    """
    handler = _RESPONSE_HANDLERS.get(intent)
    if handler:
        return handler(entities, data, lang)
    return _unknown_response(entities, data, lang)


# ══════════════════════════════════════════════════════════════════════════════
# RESPONSE HANDLERS
# ══════════════════════════════════════════════════════════════════════════════

def _sex_label(lang: str, sex) -> str:
    if sex == "Male":
        return T(lang, "male")
    if sex == "Female":
        return T(lang, "female")
    return sex or "—"


def _tiger_list_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    tigers = data.get("tigers", [])
    if not tigers:
        return T(lang, "no_tigers_registered"), []

    lines = [f"📋 **{data['count']} {T(lang, 'tigers')}** {T(lang, 'registered_in_db')}\n"]
    for t in tigers:
        last_info = f"{T(lang, 'last_seen_at')} {t['last_station']}" if t['last_station'] else T(lang, "no_captures")
        lines.append(f"• **{t['name']}** ({t['tiger_id']}) — {_sex_label(lang, t['sex'])}, {t['total_captures']} {T(lang, 'captures')}, {last_info}")

    actions = [
        ActionLink(label=T(lang, "view_territory_map"), route="/map", icon="MapPin"),
        ActionLink(label=T(lang, "view_identification"), route="/identification", icon="Fingerprint"),
    ]
    return "\n".join(lines), actions


def _tiger_profile_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []

    d = data
    lines = [
        f"🐅 **{T(lang, 'tiger_profile')}: {d['name']}** ({d['tiger_id']})\n",
        f"• **{T(lang, 'sex')}:** {_sex_label(lang, d['sex'])}",
        f"• **{T(lang, 'total_captures')}:** {d['total_captures']}",
        f"• **{T(lang, 'stations_visited')}:** {d['station_count']} {T(lang, 'stations')} ({', '.join(d['stations_visited'][:6])}{'...' if d['station_count'] > 6 else ''})",
        f"• **{T(lang, 'zone_breakdown')}:** {', '.join(f'{z}: {c}' for z, c in d['zone_breakdown'].items())}",
        f"• **{T(lang, 'first_seen')}:** {d['first_seen'][:10] if d['first_seen'] else 'N/A'}",
        f"• **{T(lang, 'last_seen_hdr')}:** {d['last_seen'][:10] if d['last_seen'] else 'N/A'}",
        f"• **{T(lang, 'open_alerts')}:** {d['open_alerts']}",
    ]

    actions = [ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin")]
    if d['open_alerts'] > 0:
        actions.append(ActionLink(label=T(lang, "view_alerts"), route="/alerts", icon="AlertTriangle"))

    return "\n".join(lines), actions


def _tiger_detections_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []

    dets = data.get("detections", [])
    name = data.get("tiger_name", data.get("tiger_id"))
    time_label = data.get("time_filter", T(lang, "all_time"))

    if not dets:
        return f"{T(lang, 'no_detections')} **{name}** {T(lang, 'during')} {time_label}.", []

    lines = [f"📍 **{data['count']} {T(lang, 'detections_for')} {name}** ({data['tiger_id']}) — {time_label}:\n"]
    for d in dets[:8]:
        lines.append(f"• {d['timestamp'][:10]} {T(lang, 'at_station')} **{d['station_id']}** ({d['zone']}) — {T(lang, 'confidence')} {d['confidence']:.0%}")

    if data['count'] > 8:
        lines.append(f"\n_...+{data['count'] - 8}_")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin")]


def _tiger_movement_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []

    if "movements" in data:
        lines = [f"🗺️ **{T(lang, 'movement_summary')} {data['count']} {T(lang, 'tigers')}:**\n"]
        for m in data["movements"]:
            lines.append(f"• **{m['name']}** ({m['tiger_id']}) — {m['total_captures']} {T(lang, 'captures')} / {len(m['station_sequence'])} {T(lang, 'stations')}")
            lines.append(f"  {T(lang, 'route')}: {' → '.join(m['station_sequence'][:6])}{'...' if len(m['station_sequence']) > 6 else ''}")
        return "\n".join(lines), [ActionLink(label=T(lang, "view_territory_map"), route="/map", icon="MapPin")]

    timeline = data.get("timeline", [])
    name = data.get("tiger_name", data.get("tiger_id"))

    lines = [f"🗺️ **{T(lang, 'movement_timeline')} {name}** ({data['tiger_id']}) — {data['total_moves']} {T(lang, 'records')}, {data['unique_stations']} {T(lang, 'unique_stations')}:\n"]
    for t in timeline[:10]:
        dist = f", {T(lang, 'moved_km')} {t['distance_from_prev_km']} {T(lang, 'km')}" if 'distance_from_prev_km' in t else ""
        lines.append(f"• {t['timestamp'][:10]} — **{t['station_id']}** ({t['zone']}){dist}")

    if len(timeline) > 10:
        lines.append(f"\n_...+{len(timeline) - 10}_")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin")]


def _home_range_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []

    if "home_range" in data:
        r = data["home_range"]
        lines = [
            f"🏔️ **{T(lang, 'home_range')}: {r['name']}** ({r['tiger_id']})\n",
            f"• **{T(lang, 'area')}:** {r['area_sq_km']} {T(lang, 'sq_km')} (MCP)",
            f"• **{T(lang, 'centroid')}:** {r['centroid'][0]:.5f}°N, {r['centroid'][1]:.5f}°E",
            f"• **{T(lang, 'stations')}:** {', '.join(r['stations_visited'])}",
        ]
        return "\n".join(lines), [ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin")]

    ranges = data.get("home_ranges", [])
    largest = data.get("largest")
    lines = [f"🏔️ **{T(lang, 'home_ranges_for')} {data['count']} {T(lang, 'tigers')}**\n"]
    for r in ranges:
        lines.append(f"• **{r['name']}** ({r['tiger_id']}) — **{r['area_sq_km']} {T(lang, 'sq_km')}**, {len(r['stations_visited'])} {T(lang, 'stations')}")

    if largest:
        lines.append(f"\n🏆 {T(lang, 'largest_territory')}: **{largest['name']}** — {largest['area_sq_km']} {T(lang, 'sq_km')}")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_territory_map"), route="/map", icon="MapPin")]


def _territory_overlaps_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    overlaps = data.get("overlaps", [])
    if not overlaps:
        return T(lang, "no_overlaps"), []

    lines = [f"🔄 **{data['count']} {T(lang, 'overlaps_detected')}**\n"]
    for o in overlaps:
        lines.append(f"• **{o['tiger_a']}** ↔ **{o['tiger_b']}** — {o['overlap_area_sq_km']} {T(lang, 'sq_km')} {T(lang, 'overlap')}")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin")]


def _tiger_alerts_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    alerts = data.get("alerts", [])
    tiger_id = data.get("tiger_id", "")

    if not alerts:
        return f"✅ {T(lang, 'no_alerts_on_record')} **{tiger_id}**.", []

    lines = [f"⚠️ **{data['total_count']} {T(lang, 'alerts_for')} {tiger_id}** ({data['open_count']} {T(lang, 'open')}):\n"]
    for a in alerts[:6]:
        icon = "🔴" if a["severity"] == "high" else "🟡" if a["severity"] == "medium" else "🟢"
        status = T(lang, "OPEN") if not a["resolved"] else T(lang, "RESOLVED")
        lines.append(f"{icon} [{status}] **{a['alert_type']}** — {a['message'][:120]}")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_all_alerts"), route="/alerts", icon="AlertTriangle")]


def _buffer_movement_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    tigers = data.get("tigers_in_buffer", [])
    if not tigers:
        return T(lang, "no_buffer_tigers"), []

    lines = [f"⚠️ **{data['total_tigers']} {T(lang, 'tigers_in_buffer')}**\n"]
    for t in tigers:
        lines.append(f"• **{t['name']}** ({t['tiger_id']}) — {t['count']} {T(lang, 'in_buffer_zone')}")

    return "\n".join(lines), [
        ActionLink(label=T(lang, "view_alerts"), route="/alerts", icon="AlertTriangle"),
        ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin"),
    ]


def _absent_tigers_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    absent = data.get("absent_tigers", [])
    if not absent:
        return T(lang, "all_seen_recently"), []

    lines = [f"🔍 **{data['count']} {T(lang, 'prolonged_absence')}**\n"]
    for t in absent:
        lines.append(f"• **{t['name']}** ({t['tiger_id']}) — **{t['days_absent']} {T(lang, 'days')} {T(lang, 'days_absent')}** {t['last_station']} {T(lang, 'on_date')} {t['last_seen'][:10]}")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_alerts"), route="/alerts", icon="AlertTriangle")]


def _station_activity_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "station_id" in data:
        d = data
        village = f"⚠️ {T(lang, 'village_adjacent')}" if d.get("is_village_adjacent") else ""
        lines = [
            f"📡 **{T(lang, 'station')} {d['station_id']}** {village}\n",
            f"• **{T(lang, 'total_captures_lbl')}:** {d['total_captures']}",
            f"• **{T(lang, 'tigers_detected')}:** {d['tiger_count']} ({', '.join(d['tigers_seen'])})",
            f"• **{T(lang, 'zone')}:** {d.get('zone', '—')}",
            f"• **{T(lang, 'latest_activity')}:** {d['latest_capture'][:10] if d.get('latest_capture') else 'N/A'}",
        ]
        return "\n".join(lines), [ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin")]

    stations = data.get("stations", [])
    lines = [f"📡 **{data['count']} {T(lang, 'camera_stations_ranked')}**\n"]
    for s in stations[:10]:
        village = " ⚠️" if s["is_village_adjacent"] else ""
        lines.append(f"• **{s['station_id']}** — {s['total_captures']} {T(lang, 'captures')}, {s['tiger_count']} {T(lang, 'tigers')}{village}")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_territory_map"), route="/map", icon="MapPin")]


def _recent_alerts_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    alerts = data.get("alerts", [])
    sev_filter = data.get("severity_filter")

    if not alerts:
        return f"✅ {T(lang, 'no_alerts_found')}", []

    filt = f" — {T(lang, 'filtered_by_severity')} {sev_filter} {T(lang, 'severity')}" if sev_filter else ""
    lines = [f"⚠️ **{data['total_count']}** ({data['open_count']} {T(lang, 'open')}){filt}:\n"]
    for a in alerts[:8]:
        icon = "🔴" if a["severity"] == "high" else "🟡" if a["severity"] == "medium" else "🟢"
        status = T(lang, "OPEN") if not a["resolved"] else T(lang, "RESOLVED")
        lines.append(f"{icon} [{status}] **{a['tiger_id']}** — {a['alert_type']}: {a['message'][:100]}")

    if data['total_count'] > 8:
        lines.append(f"\n_...+{data['total_count'] - 8}_")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_all_alerts"), route="/alerts", icon="AlertTriangle")]


def _movement_deviations_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    devs = data.get("deviations", [])
    if not devs:
        return T(lang, "no_deviations"), []

    lines = [f"🚨 **{data['count']} {T(lang, 'movement_deviations')}**\n"]
    for d in devs:
        icon = "🔴" if d["severity"] == "high" else "🟡"
        lines.append(f"{icon} **{d['tiger_id']}** — {d['type']}: {d['message'][:120]}")

    return "\n".join(lines), [
        ActionLink(label=T(lang, "view_alerts"), route="/alerts", icon="AlertTriangle"),
        ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin"),
    ]


def _high_risk_stations_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    stations = data.get("high_risk_stations", [])
    if not stations:
        return T(lang, "no_high_risk"), []

    lines = [f"🚨 **{data['count']} {T(lang, 'stations_elevated_risk')}**\n"]
    for s in stations:
        icon = "🔴" if s["risk_level"] == "high" else "🟡" if s["risk_level"] == "medium" else "🟢"
        village = f" ({T(lang, 'village_adjacent')})" if s["is_village_adjacent"] else ""
        lines.append(f"{icon} **{s['station_id']}**{village} — {s['total_captures']} {T(lang, 'captures')}, {s['associated_alerts']} {T(lang, 'open_alerts')}")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin")]


def _village_proximity_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    stations = data.get("village_stations", [])
    if not stations:
        return T(lang, "no_village_detections"), []

    lines = [f"🏘️ **{data['count']} {T(lang, 'village_stations_activity')}**\n"]
    for s in stations:
        lines.append(f"• **{s['station_id']}** — {T(lang, 'tigers')}: {', '.join(s['tigers_detected'])}, {s['total_captures']} {T(lang, 'captures')}")

    return "\n".join(lines), [
        ActionLink(label=T(lang, "view_alerts"), route="/alerts", icon="AlertTriangle"),
        ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin"),
    ]


def _processing_stats_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"ℹ️ {data['error']}", [ActionLink(label=T(lang, "run_triage"), route="/identification", icon="ScanSearch")]

    latest = data["latest_run"]
    hist = data["historical"]

    lines = [
        f"📊 **{T(lang, 'image_processing_stats')}**\n",
        f"**{T(lang, 'latest_run')}** ({latest['run_at'][:10] if latest.get('run_at') else 'N/A'}):",
        f"• {T(lang, 'total_images')}: {latest['total_images']}",
        f"• {T(lang, 'blanks_removed')}: {latest['blanks_removed']}",
        f"• {T(lang, 'retained')}: {latest['retained']}",
        f"• {T(lang, 'storage_saved')}: {latest['saved_mb']} MB",
        f"• {T(lang, 'time_saved')}: {latest['saved_minutes']} {T(lang, 'minutes')}\n",
        f"**{T(lang, 'cumulative')}** ({hist['total_runs']} {T(lang, 'runs')}):",
        f"• {T(lang, 'total_processed')}: {hist['total_processed']} {T(lang, 'images')}",
        f"• {T(lang, 'blanks_removed')}: {hist['total_blanks_removed']}",
    ]

    return "\n".join(lines), [ActionLink(label=T(lang, "run_triage"), route="/identification", icon="ScanSearch")]


def _blank_filtering_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "message" in data:
        return f"ℹ️ {data['message']}", [ActionLink(label=T(lang, "run_triage"), route="/identification", icon="ScanSearch")]

    latest = data["latest"]
    lines = [
        f"🗑️ **{T(lang, 'blank_filtering_results')}**\n",
        f"• {T(lang, 'blanks_removed')}: **{latest['blanks_removed']}** {T(lang, 'out_of')} {latest['total_images']} ({latest['filter_rate_pct']}%)",
        f"• {T(lang, 'images_retained')}: {latest['retained']}",
        f"• {T(lang, 'storage_saved')}: {latest['saved_mb']} MB",
        f"• {T(lang, 'time_saved')}: {latest['saved_minutes']} {T(lang, 'minutes')}",
        f"• {T(lang, 'last_run')}: {latest['run_at'][:10] if latest.get('run_at') else 'N/A'}",
    ]

    return "\n".join(lines), [ActionLink(label=T(lang, "view_triage"), route="/identification", icon="ScanSearch")]


def _cycle_summary_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    d = data
    lines = [
        f"📋 **{T(lang, 'cycle_summary')}**\n",
        f"🐅 **{T(lang, 'tigers')}:** {d['total_tigers']} {T(lang, 'identified_individuals')}",
        f"📸 {T(lang, 'total_detections')}: {d['total_captures']}",
        f"⚠️ {T(lang, 'open_alerts')}: {d['open_alerts']}",
        f"🔍 {T(lang, 'pending_review')}: {d['pending_review']}",
    ]

    if d.get("most_active_tiger"):
        t = d["most_active_tiger"]
        lines.append(f"🏆 **{T(lang, 'most_active')}:** {t['name']} ({t['tiger_id']}) — {t['captures']} {T(lang, 'captures')}")

    if d.get("alert_breakdown"):
        ab = d["alert_breakdown"]
        lines.append(f"\n**{T(lang, 'alert_breakdown')}:** {', '.join(f'{k}: {v}' for k, v in ab.items())}")

    if d.get("latest_triage"):
        lt = d["latest_triage"]
        lines.append(f"\n**{T(lang, 'latest_triage')}:** {lt['blanks_removed']} {T(lang, 'blanks_removed_saved')}, {lt['saved_mb']} MB {T(lang, 'saved')}")

    return "\n".join(lines), [
        ActionLink(label=T(lang, "dashboard"), route="/", icon="LayoutDashboard"),
        ActionLink(label=T(lang, "view_alerts"), route="/alerts", icon="AlertTriangle"),
        ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin"),
    ]


def _review_status_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    lines = [
        f"🔍 **{T(lang, 'review_queue_status')}**\n",
        f"• **{T(lang, 'pending_review')}:** {data['pending_count']} {T(lang, 'awaiting_review')}",
        f"• ✅ {data['confirmed_count']} {T(lang, 'confirmed_matches')}",
        f"• 🆕 {data['new_individual_count']} {T(lang, 'new_individuals_registered')}",
    ]

    if data["pending_items"]:
        lines.append(f"\n**{T(lang, 'pending_items')}:**")
        for item in data["pending_items"][:4]:
            lines.append(f"• #{item['id']} — {T(lang, 'top_match')}: {item['top_match_id']} ({item['top_match_confidence']:.0%}), {T(lang, 'alt')}: {item['alt_match_id']} ({item['alt_match_confidence']:.0%})")

    return "\n".join(lines), [ActionLink(label=T(lang, "review_queue_link"), route="/identification", icon="Fingerprint")]


def _new_tigers_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    tigers = data.get("tigers", [])
    if not tigers:
        return T(lang, "no_tigers_yet"), []

    lines = [f"🆕 **{data['count']} {T(lang, 'tigers_in_db')}**\n"]
    for t in tigers[:6]:
        lines.append(f"• **{t['name']}** ({t['tiger_id']}) — {_sex_label(lang, t['sex'])}, {T(lang, 'enrolled')} {t['enrolled_at'][:10] if t.get('enrolled_at') else 'N/A'}, {t['total_captures']} {T(lang, 'captures')}")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_identification"), route="/identification", icon="Fingerprint")]


def _camera_health_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    issues = data.get("issues", [])

    if not issues:
        return f"✅ {data['total_stations']} {T(lang, 'all_stations_healthy')}", []

    lines = [f"📡 **{T(lang, 'camera_health_report')}** — {data['issue_count']} {T(lang, 'issues')}, {data['healthy_count']} {T(lang, 'healthy')}:\n"]
    for s in issues:
        icon = "🔴" if s["status"] == "inactive" else "🟡"
        lines.append(f"{icon} **{s['station_id']}** — {s['status']}, {T(lang, 'inactive_for')} {s['days_inactive']} {T(lang, 'days')}, {s['total_captures']} {T(lang, 'captures')}")

    return "\n".join(lines), [ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin")]


def _system_status_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    lines = [
        f"🟢 **{T(lang, 'system_status')}**\n",
        f"• **{T(lang, 'mode')}:** {data['mode']}",
        f"• **{T(lang, 'database')}:** {data['database']}",
        f"• **{T(lang, 'tigers')}:** {data['tigers_in_db']}",
        f"• {T(lang, 'total_detections')}: {data['captures_in_db']}",
        f"• **{T(lang, 'open_alerts')}:** {data['open_alerts']}",
        f"• **{T(lang, 'pending_review')}:** {data['pending_reviews']}",
        f"• **{T(lang, 'last_triage')}:** {data['last_triage'][:10] if data['last_triage'] != 'never' else T(lang, 'never')}",
    ]

    return "\n".join(lines), [ActionLink(label=T(lang, "dashboard"), route="/", icon="LayoutDashboard")]


def _help_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    lines = [
        f"🤖 **{T(lang, 'help_title')}**\n",
        f"{T(lang, 'help_intro')}\n",
        f"**🐅 {T(lang, 'help_tigers')}**",
        f'• "Show all tigers" — {T(lang, "tigers")}',
        f'• "Tell me about T103" — {T(lang, "tiger_profile")}',
        f'• "Where was T103 detected?" — {T(lang, "detections_for")}',
        f'• "Show movement history of T108" — {T(lang, "movement_timeline")}\n',
        f"**🗺️ {T(lang, 'help_territory')}**",
        f'• "What is T103\'s home range?" — {T(lang, "home_range")}',
        f'• "Which tigers overlap?" — {T(lang, "overlap")}',
        f'• "Which tigers entered the buffer zone?" — {T(lang, "buffer_movement")}',
        f'• "Which tigers show abnormal movement?" — {T(lang, "movement_deviations")}\n',
        f"**⚠️ {T(lang, 'help_alerts')}**",
        f'• "Show high severity alerts" — {T(lang, "severity")}',
        f'• "Which stations are near villages?" — {T(lang, "village_adjacent")}',
        f'• "Which tigers haven\'t been seen recently?" — {T(lang, "prolonged_absence")}',
        f'• "Which stations are high risk?" — {T(lang, "stations_elevated_risk")}\n',
        f"**📊 {T(lang, 'help_monitoring')}**",
        f'• "Give me a summary" — {T(lang, "cycle_summary")}',
        f'• "How many images were processed?" — {T(lang, "image_processing_stats")}',
        f'• "How many images need review?" — {T(lang, "review_queue_status")}',
        f'• "Camera health check" — {T(lang, "camera_health_report")}',
        f'• "System status" — {T(lang, "system_status")}\n',
        f"_{T(lang, 'help_footer')}_ 🔒",
    ]
    return "\n".join(lines), [
        ActionLink(label=T(lang, "dashboard"), route="/", icon="LayoutDashboard"),
        ActionLink(label=T(lang, "view_territory_map"), route="/map", icon="MapPin"),
        ActionLink(label=T(lang, "view_alerts"), route="/alerts", icon="AlertTriangle"),
    ]


def _unknown_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    tiger_id = entities.get("tiger_id")
    station_id = entities.get("station_id")

    msg = f"🤔 {T(lang, 'not_sure')} "

    if tiger_id:
        msg += f"{T(lang, 'you_mentioned')} **{tiger_id}**. "
        msg += f'{T(lang, "try_asking_like")} "Tell me about {tiger_id}" / "Where was {tiger_id} detected?"'
    elif station_id:
        msg += f"{T(lang, 'you_mentioned')} **{station_id}**. "
        msg += f'"What\'s the activity at {station_id}?"'
    else:
        msg += f'{T(lang, "try_asking_questions")}\n'
        msg += '• "Show all tigers"\n'
        msg += '• "Give me a summary"\n'
        msg += '• "Show high severity alerts"\n\n'
        msg += T(lang, "type_help")

    return msg, [ActionLink(label=T(lang, "see_all_commands"), route="/chat", icon="MessageSquare")]


def _patrol_priority_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "detail" in data:
        return _station_patrol_priority_response(entities, data, lang)

    summary = data.get("summary", {})
    stations = data.get("stations", [])
    counts = summary.get("summary_counts", {})

    lines = [
        f"🎯 **{T(lang, 'patrol_board')}**\n",
        f"• **{T(lang, 'critical')}:** {counts.get('critical', 0)} (🔴 ≥75)",
        f"• **{T(lang, 'high')}:** {counts.get('high', 0)} (🟠 50–74)",
        f"• **{T(lang, 'medium')}:** {counts.get('moderate', 0)} (🟡 25–49)",
        f"• **{T(lang, 'low')}:** {counts.get('low', 0)} (🟢 <25)\n",
        f"**{T(lang, 'top_recommended')}:**",
    ]

    for st in stations[:6]:
        v_tag = f" [{T(lang, 'village_adjacent')}]" if st.get("is_village_adjacent") else ""
        lines.append(
            f"{st['badge_icon']} **{st['station_id']}** — **{st['priority_score']}/100** ({st['priority_level']}){v_tag} • {T(lang, 'confidence')} {st['evidence_confidence']}%\n"
            f"   {T(lang, 'drivers')}: {st['top_reasons'][0] if st.get('top_reasons') else T(lang, 'routine')}"
        )

    return "\n".join(lines), [
        ActionLink(label=T(lang, "patrol_intelligence"), route="/patrol", icon="ShieldAlert"),
        ActionLink(label=T(lang, "view_territory_map"), route="/map", icon="MapPin"),
    ]


def _station_patrol_priority_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []

    st = data.get("detail", {})
    comps = st.get("components", {})
    mvt = comps.get("movement", {})
    conf = comps.get("conflict", {})
    anom = comps.get("anomaly", {})

    lines = [
        f"🎯 **{T(lang, 'station')} {st['station_id']} — {T(lang, 'patrol_priority')}: {st['priority_score']}/100** ({st['badge_icon']} {st['priority_level']})\n",
        f"• **{T(lang, 'evidence_confidence')}:** {st['evidence_confidence']}%",
        f"• **{T(lang, 'reserve_zone')}:** {st['zone'].title()}{' — ⚠️ ' + T(lang, 'village_adjacent') if st['is_village_adjacent'] else ''}",
        f"• **{T(lang, 'tiger_activity')}:** {st['total_captures']} / {st['unique_tigers_count']}\n",
        f"**{T(lang, 'factor_breakdown')}:**",
        f"• 🐅 **{T(lang, 'movement_activity')}:** {mvt.get('score', 0)}/100 (+{mvt.get('contribution', 0)}) — {mvt.get('evidence', [''])[0]}",
        f"• 🏘️ **{T(lang, 'conflict_proximity')}:** {conf.get('score', 0)}/100 (+{conf.get('contribution', 0)}) — {conf.get('evidence', [''])[0]}",
        f"• ⚠️ **{T(lang, 'recent_anomalies')}:** {anom.get('score', 0)}/100 (+{anom.get('contribution', 0)}) — {anom.get('evidence', [''])[0]}\n",
        f"**{T(lang, 'why_prioritized')}:**",
        f"_{st.get('why_explanation', '')}_",
    ]

    tigers = st.get("contributing_tigers", [])
    if tigers:
        t_summary = ", ".join(f"{t['name']} ({t['captures_at_station']})" for t in tigers[:3])
        lines.append(f"\n**{T(lang, 'contributing_individuals')}:** {t_summary}")

    return "\n".join(lines), [
        ActionLink(label=T(lang, "view_map"), route="/map", icon="MapPin"),
        ActionLink(label=T(lang, "patrol_board_link"), route="/patrol", icon="ShieldAlert"),
    ]


def _suggested_patrol_sequence_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    sequence = data.get("sequence", [])
    if not sequence:
        return T(lang, "no_sequence"), []

    lines = [
        f"🧭 **{T(lang, 'tactical_sequence')}**\n",
        f"{T(lang, 'prioritized_order')}\n",
    ]

    for item in sequence:
        v_tag = f" ⚠️ {T(lang, 'village_adjacent')}" if item.get("is_village_adjacent") else ""
        lines.append(
            f"**{item['order']}. {item['badge_icon']} {item['station_id']}** ({item['priority_score']}/100 - {item['priority_level']}){v_tag}\n"
            f"   {T(lang, 'objective')}: _{item['tactical_objective']}_"
        )

    return "\n".join(lines), [
        ActionLink(label=T(lang, "patrol_intelligence"), route="/patrol", icon="ShieldAlert"),
        ActionLink(label=T(lang, "view_territory_map"), route="/map", icon="MapPin"),
    ]


def _patrol_trend_response(entities: dict, data: dict, lang: str) -> tuple[str, list[ActionLink]]:
    if "error" in data:
        return f"❌ {data['error']}", []

    sid = data.get("station_id", "")
    score = data.get("current_score", 0)
    level = data.get("priority_level", "")
    trend = data.get("cycle_trend", [])

    lines = [
        f"📈 **{T(lang, 'priority_trend')} {sid}**\n",
        f"• **{T(lang, 'current_score')}:** {score}/100 ({level})",
        f"• **{T(lang, 'trajectory')}:**\n",
    ]

    for c in trend:
        lines.append(f"• {c['cycle']}: **{c['score']}/100**")

    if data.get("why_explanation"):
        lines.append(f"\n_{data['why_explanation']}_")

    return "\n".join(lines), [
        ActionLink(label=T(lang, "patrol_board_link"), route="/patrol", icon="ShieldAlert"),
        ActionLink(label=T(lang, "view_territory_map"), route="/map", icon="MapPin"),
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
