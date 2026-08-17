"""
Intent Router — Classifies user messages into one of 23 supported intents
using keyword/phrase pattern matching. Fully offline, no LLM required.
"""
import re
from .schemas import Intent


# ── Pattern definitions ──────────────────────────────────────────────────────
# Each intent has a list of compiled regex patterns. First match wins.
# Patterns are checked in PRIORITY ORDER (most specific first).

_INTENT_PATTERNS: list[tuple[Intent, list[re.Pattern]]] = [

    # ── Patrol Priority Engine ───────────────────────────────────────────
    (Intent.GET_SUGGESTED_PATROL_SEQUENCE, [
        re.compile(r'\b(?:suggested\s+)?patrol\s+(?:sequence|route|order|plan|path|loop)\b', re.I),
        re.compile(r'\b(?:where\s+should\s+we\s+patrol|which\s+stations\s+to\s+visit)\b', re.I),
        re.compile(r'\bpatrol\s+sequence\b', re.I),
    ]),

    (Intent.GET_PATROL_TREND, [
        re.compile(r'\bpatrol\s+(?:trend|history|trajectory|change)\b', re.I),
        re.compile(r'\bhow\s+has\s+.*(?:priority|score)\s+changed\b', re.I),
        re.compile(r'\bpriority\s+trend\b', re.I),
    ]),

    (Intent.GET_STATION_PATROL_PRIORITY, [
        re.compile(r'\bwhy\b.*\b(?:ST-?\d|station)\b.*\b(?:priorit|patrol|score|high|attention)\b', re.I),
        re.compile(r'\bwhy\b.*\b(?:priorit|patrol|score|high|attention)\b.*\b(?:ST-?\d|station)\b', re.I),
        re.compile(r'\b(?:ST-?\d|station\s*#?\s*\d+)\b.*\b(?:why|priorit|patrol\s+score|contribut)\b', re.I),
        re.compile(r'\bpatrol\s+(?:score|priority|detail)\s+(?:for|of)\s+(?:ST-?\d|station)\b', re.I),
    ]),

    (Intent.GET_PATROL_PRIORITY, [
        re.compile(r'\b(?:which|what)\s+stations?\s+should\s+we\s+(?:prioritize|visit|patrol|inspect)\b', re.I),
        re.compile(r'\b(?:top|high(?:est)?)\s+patrol\s+stations?\b', re.I),
        re.compile(r'\bpatrol\s+(?:priority|priorities|board|ranking|recommendation)\b', re.I),
        re.compile(r'\bmanagement\s+attention\s+(?:priority|stations?)\b', re.I),
        re.compile(r'\btoday.?s\s+patrol\b', re.I),
    ]),

    # ── Help / Meta ────────────────────────────────────────────────────────
    (Intent.GET_HELP, [
        re.compile(r'\b(?:help|what can you|what do you|capabilities|how to use|commands|features)\b', re.I),
        re.compile(r'\b(?:guide|tutorial|instructions)\b', re.I),
    ]),

    (Intent.GET_SYSTEM_STATUS, [
        re.compile(r'\b(?:system|status|health|working|operational|running|uptime)\b.*\b(?:check|status|ok|working|running)\b', re.I),
        re.compile(r'\b(?:is the system|is everything|is it) (?:working|ok|running|up)\b', re.I),
        re.compile(r'\bsystem\s+status\b', re.I),
    ]),

    # ── Village / Buffer (specific → before general alerts) ───────────────
    (Intent.GET_VILLAGE_PROXIMITY, [
        re.compile(r'\bvillage\b.*\b(?:tiger|detection|movement|proximity|near|close|station)s?\b', re.I),
        re.compile(r'\b(?:tiger|detection|movement)s?\b.*\bvillage\b', re.I),
        re.compile(r'\bhuman.?wildlife\s+conflict\b', re.I),
    ]),

    (Intent.GET_BUFFER_MOVEMENT, [
        re.compile(r'\bbuffer\b.*\b(?:movement|enter|cross|tiger|zone)s?\b', re.I),
        re.compile(r'\b(?:tiger|movement)s?\b.*\bbuffer\b', re.I),
        re.compile(r'\b(?:entered|moved\s+(?:to|into))\s+(?:the\s+)?buffer\b', re.I),
    ]),

    # ── Movement Deviations ──────────────────────────────────────────────
    (Intent.GET_MOVEMENT_DEVIATIONS, [
        re.compile(r'\b(?:abnormal|unusual|deviation|deviated|anomal|irregular|unexpected)\b.*\b(?:movement|behavior|pattern|range)s?\b', re.I),
        re.compile(r'\b(?:movement|behavior|pattern|range)s?\b.*\b(?:abnormal|unusual|deviation|anomal|irregular)\b', re.I),
        re.compile(r'\brange\s+shift\b', re.I),
    ]),

    # ── Absent tigers ────────────────────────────────────────────────────
    (Intent.GET_ABSENT_TIGERS, [
        re.compile(r'\b(?:absent|missing|not\s+seen|haven.?t\s+been\s+seen|disappeared|gone|inactive)\b', re.I),
        re.compile(r'\b(?:haven.?t|has\s+not|wasn.?t)\s+(?:been\s+)?(?:captured|detected|seen|spotted)\b', re.I),
        re.compile(r'\bprolonged\s+absence\b', re.I),
        re.compile(r'\bnot\s+been\s+(?:seen|detected|captured)\b', re.I),
    ]),

    # ── Territory Overlaps ───────────────────────────────────────────────
    (Intent.GET_TERRITORY_OVERLAPS, [
        re.compile(r'\boverlap\b', re.I),
        re.compile(r'\b(?:territory|territories)\b.*\b(?:share|shared|common|intersect)\b', re.I),
        re.compile(r'\b(?:share|shared|common)\b.*\b(?:territory|area|range)\b', re.I),
    ]),

    # ── Home Range (specific tiger or "largest/smallest") ────────────────
    (Intent.GET_TIGER_HOME_RANGE, [
        re.compile(r'\b(?:home\s+range|territory|territories|range\s+area|MCP|convex\s+hull)\b', re.I),
        re.compile(r'\b(?:largest|smallest|biggest)\s+(?:range|territory|area)\b', re.I),
        re.compile(r'\b(?:range|territory|area)\b.*\b(?:sq\s*km|square|size)\b', re.I),
        re.compile(r'\bhow\s+(?:big|large|small)\b.*\b(?:range|territory)\b', re.I),
    ]),

    # ── Tiger Movement ───────────────────────────────────────────────────
    (Intent.GET_TIGER_MOVEMENT, [
        re.compile(r'\b(?:movement|movements|moving|moved|travel|traveled|path|track|route)\b', re.I),
        re.compile(r'\bwhere\s+(?:has|did|does)\b.*\b(?:go|gone|move|travel|been)\b', re.I),
        re.compile(r'\bmovement\s+history\b', re.I),
    ]),

    # ── Tiger Detections ─────────────────────────────────────────────────
    (Intent.GET_TIGER_DETECTIONS, [
        re.compile(r'\b(?:where|when)\b.*\b(?:detect|capture|seen|spot|photograph|sighting)s?\b', re.I),
        re.compile(r'\b(?:detect|capture|seen|spotted|sighting)s?\b.*\b(?:where|when|station|location)\b', re.I),
        re.compile(r'\blast\s+(?:seen|detected|captured|spotted)\b', re.I),
        re.compile(r'\b(?:detection|capture|sighting)s?\s+(?:history|record|log)\b', re.I),
    ]),

    # ── Tiger Alerts (specific tiger) ────────────────────────────────────
    (Intent.GET_TIGER_ALERTS, [
        re.compile(r'\balerts?\b.*\b(?:T-?\d|PTR|tiger)\b', re.I),
        re.compile(r'\b(?:T-?\d|PTR|tiger)\b.*\balerts?\b', re.I),
        re.compile(r'\bwhy\b.*\b(?:flag|alert|warning)\b', re.I),
        re.compile(r'\b(?:flag|alert|warning)\b.*\bwhy\b', re.I),
    ]),

    # ── High Risk Stations ───────────────────────────────────────────────
    (Intent.GET_HIGH_RISK_STATIONS, [
        re.compile(r'\b(?:high\s+risk|risky|dangerous)\b.*\bstations?\b', re.I),
        re.compile(r'\bstations?\b.*\b(?:high\s+risk|risky|dangerous)\b', re.I),
        re.compile(r'\b(?:hotspot|hot\s+spot)s?\b', re.I),
    ]),

    # ── Station Activity ─────────────────────────────────────────────────
    (Intent.GET_STATION_ACTIVITY, [
        re.compile(r'\bstations?\b.*\b(?:activity|active|busy|capture|detection|count)s?\b', re.I),
        re.compile(r'\b(?:activity|active|busy|highest|most)\b.*\bstations?\b', re.I),
        re.compile(r'\b(?:which|what)\s+stations?\b', re.I),
        re.compile(r'\bcamera\s+stations?\b', re.I),
    ]),

    # ── Recent Alerts (general) ──────────────────────────────────────────
    (Intent.GET_RECENT_ALERTS, [
        re.compile(r'\balerts?\b', re.I),
        re.compile(r'\bwarnings?\b', re.I),
        re.compile(r'\b(?:open|active|pending|unresolved)\s+(?:alerts?|warnings?|issues?)\b', re.I),
    ]),

    # ── Processing / Triage ──────────────────────────────────────────────
    (Intent.GET_BLANK_FILTERING, [
        re.compile(r'\bblanks?\b.*\b(?:image|photo|filter|remove)s?\b', re.I),
        re.compile(r'\b(?:filter|remove)\b.*\bblanks?\b', re.I),
    ]),

    (Intent.GET_PROCESSING_STATS, [
        re.compile(r'\b(?:process|processed|triage|triaged)\b.*\b(?:image|photo|total|count|how\s+many)s?\b', re.I),
        re.compile(r'\b(?:how\s+many|total)\b.*\b(?:image|photo|process|triage)s?\b', re.I),
        re.compile(r'\bimage\s+(?:processing|triage)\b', re.I),
    ]),

    (Intent.GET_CYCLE_SUMMARY, [
        re.compile(r'\b(?:summary|overview|report|brief|briefing|dashboard)\b', re.I),
        re.compile(r'\b(?:monitoring|survey)\s+(?:cycle|period|summary)\b', re.I),
        re.compile(r'\bgive\s+me\s+a\s+summary\b', re.I),
    ]),

    # ── Review Queue ─────────────────────────────────────────────────────
    (Intent.GET_REVIEW_STATUS, [
        re.compile(r'\breview\b', re.I),
        re.compile(r'\bambiguous\b', re.I),
        re.compile(r'\bpending\b.*\b(?:review|identification|match)\b', re.I),
        re.compile(r'\b(?:need|needs)\b.*\b(?:human|manual|review)\b', re.I),
    ]),

    # ── New Tigers ───────────────────────────────────────────────────────
    (Intent.GET_NEW_TIGERS, [
        re.compile(r'\b(?:new|newly|recent)\b.*\b(?:tiger|individual|enrolled|identified|discover)s?\b', re.I),
        re.compile(r'\b(?:tiger|individual)s?\b.*\b(?:new|newly|recent)\b', re.I),
    ]),

    # ── Camera Health ────────────────────────────────────────────────────
    (Intent.GET_CAMERA_HEALTH, [
        re.compile(r'\bcameras?\b.*\b(?:health|issue|problem|malfunction|broken|working|offline)s?\b', re.I),
        re.compile(r'\b(?:issue|problem|malfunction|broken)s?\b.*\bcameras?\b', re.I),
        re.compile(r'\bcamera\s+(?:trap|station)s?\s+(?:status|health|check)\b', re.I),
    ]),

    # ── Tiger Profile ────────────────────────────────────────────────────
    (Intent.GET_TIGER_PROFILE, [
        re.compile(r'\b(?:tell|info|about|profile|detail|describe|who\s+is)\b.*\b(?:T-?\d|PTR|tiger)s?\b', re.I),
        re.compile(r'\b(?:T-?\d|PTR)\b.*\b(?:profile|info|detail|about)\b', re.I),
    ]),

    # ── Tiger List (least specific — last) ───────────────────────────────
    (Intent.GET_TIGER_LIST, [
        re.compile(r'\b(?:all|list|show|every|each|registered|known)\b.*\b(?:tiger|individual|animal)s?\b', re.I),
        re.compile(r'\b(?:tiger|individual|animal)s?\b.*\b(?:all|list|show|every|catalog|database|registered|known)\b', re.I),
        re.compile(r'\bhow\s+many\s+tigers?\b', re.I),
    ]),
]


def classify_intent(message: str, entities: dict) -> Intent:
    """
    Classify a user message into one of the supported intents.
    Uses entity context to disambiguate where needed.
    
    Args:
        message: The user's raw message text
        entities: Pre-extracted entities dict from entity_extractor
    
    Returns:
        The classified Intent enum value
    """
    # Sanitize: strip and collapse whitespace
    clean = re.sub(r'\s+', ' ', message.strip())

    if not clean or len(clean) < 2:
        return Intent.GET_HELP

    # Check each intent's patterns in priority order
    for intent, patterns in _INTENT_PATTERNS:
        for pattern in patterns:
            if pattern.search(clean):
                # Context-based disambiguation:
                # If we matched a tiger-specific intent but no tiger entity,
                # some intents should still work (they show all tigers).
                # But if it's GET_TIGER_PROFILE with no entity, fallback to list.
                if intent == Intent.GET_TIGER_PROFILE and not entities.get("tiger_id"):
                    return Intent.GET_TIGER_LIST
                if intent == Intent.GET_TIGER_ALERTS and not entities.get("tiger_id"):
                    return Intent.GET_RECENT_ALERTS
                return intent

    # ── Fallback: if a tiger ID/name was mentioned but no intent matched ──
    if entities.get("tiger_id"):
        return Intent.GET_TIGER_PROFILE

    if entities.get("station_id"):
        return Intent.GET_STATION_ACTIVITY

    return Intent.UNKNOWN
