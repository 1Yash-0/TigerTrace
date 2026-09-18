export type Language = "en" | "hi" | "mr";

export interface TranslationDict {
  // Navigation & Branding
  nav_brand_title: string;
  nav_brand_subtitle: string;
  nav_identify_tiger: string;
  nav_upload_video: string;
  nav_tiger_habitat: string;
  nav_patrol_priority: string;
  nav_ai_assistant: string;
  nav_territory: string;
  nav_alerts: string;
  nav_triage: string;
  nav_insights: string;

  // Insights / Analytics page
  insights_title: string;
  insights_subtitle: string;
  insights_kpi_tigers: string;
  insights_kpi_captures: string;
  insights_kpi_alerts: string;
  insights_kpi_area: string;
  insights_kpi_area_unit: string;
  insights_sex_title: string;
  insights_sex_female: string;
  insights_sex_male: string;
  insights_sex_unknown: string;
  insights_home_range_title: string;
  insights_home_range_hint: string;
  insights_overlap_title: string;
  insights_overlap_hint: string;
  insights_activity_title: string;
  insights_activity_hint: string;
  insights_stations_title: string;
  insights_stations_hint: string;
  insights_priority_title: string;
  insights_zone_title: string;
  insights_zone_hint: string;
  insights_open_map: string;

  // Map date filter
  map_date_from: string;
  map_date_to: string;
  map_date_filter_label: string;
  map_date_all_time: string;
  map_date_clear: string;

  // Hero Section
  hero_title_1: string;
  hero_title_2: string;
  hero_scroll_explore: string;

  // Wildlife / Habitat Section
  habitat_title_1: string;
  habitat_title_2: string;
  habitat_quote: string;
  habitat_desc: string;
  habitat_cta: string;

  // Corridors / Tigers Section
  corridors_title: string;
  corridors_desc: string;
  corridors_territory_label: string;
  corridors_zone_label: string;
  corridors_status_label: string;
  corridors_explore_map_cta: string;
  corridors_patrol_cta: string;

  // Sanctuary & Statistics Section
  sanctuary_title_1: string;
  sanctuary_title_2: string;
  sanctuary_desc_1: string;
  sanctuary_desc_2: string;
  stat_tigers_tracked: string;
  stat_captures: string;
  stat_blanks_filtered: string;
  stat_storage_saved: string;

  // Map Card on Sanctuary Panel
  map_card_title: string;
  map_card_badge: string;
  map_card_core_label: string;
  map_card_buffer_label: string;
  map_card_river_label: string;
  map_card_stations_label: string;
  map_card_cta: string;

  // Patrol Dashboard
  patrol_title: string;
  patrol_subtitle: string;
  patrol_critical: string;
  patrol_high: string;
  patrol_moderate: string;
  patrol_low: string;
  patrol_summary_heading: string;
  patrol_station_list_heading: string;
  patrol_inspect_factors: string;
  patrol_sequence_heading: string;
  patrol_export_csv: string;
  patrol_heading_1: string;
  patrol_heading_2: string;
  patrol_range_critical: string;
  patrol_range_high: string;
  patrol_range_moderate: string;
  patrol_range_low: string;
  patrol_note_critical: string;
  patrol_note_high: string;
  patrol_note_moderate: string;
  patrol_note_low: string;
  patrol_filter_all: string;
  patrol_filter_village: string;
  patrol_view_territory_map: string;
  patrol_export_priorities_csv: string;
  patrol_ranked_stations: string;
  patrol_click_inspect: string;
  patrol_calculating: string;
  patrol_no_match: string;
  patrol_captures_unit: string;
  patrol_tigers_unit: string;
  patrol_zone_word: string;
  patrol_zone_label: string;
  patrol_confidence_label: string;
  patrol_station_prefix: string;
  patrol_priority_word: string;
  patrol_coordinates_label: string;
  patrol_village_boundary: string;
  patrol_evidence_confidence: string;
  patrol_rationale_heading: string;
  patrol_factor_breakdown: string;
  patrol_factor_movement: string;
  patrol_factor_conflict: string;
  patrol_factor_anomaly: string;
  patrol_pts: string;
  patrol_contributing_tigers: string;
  patrol_captures_at_station: string;
  patrol_trajectory_heading: string;
  patrol_ask_assistant: string;
  patrol_select_station_empty: string;
  patrol_sequence_badge: string;
  patrol_trace_on_map: string;
  patrol_objective_label: string;
  patrol_village_fringe: string;

  // Chatbot
  chat_title: string;
  chat_subtitle: string;
  chat_placeholder: string;
  chat_suggest_1: string;
  chat_suggest_2: string;
  chat_suggest_3: string;
  chat_suggest_4: string;
  chat_clear: string;
  chat_welcome: string;
  chat_quick_cat_1: string;
  chat_quick_cat_2: string;
  chat_quick_cat_3: string;
  chat_quick_cat_4: string;
  chat_quick_q1: string;
  chat_quick_q2: string;
  chat_quick_q3: string;
  chat_quick_q4: string;
  chat_quick_q5: string;
  chat_quick_q6: string;
  chat_quick_q7: string;
  chat_quick_q8: string;
  chat_quick_q9: string;
  chat_quick_q10: string;
  chat_quick_q11: string;
  chat_quick_q12: string;
  chat_quick_q13: string;
  chat_quick_q14: string;
  chat_quick_q15: string;
  chat_quick_q16: string;
  chat_offline_badge: string;
  chat_local_badge: string;
  chat_welcome_short: string;
  chat_act_dashboard: string;
  chat_act_map: string;
  chat_act_alerts: string;
  chat_send: string;
  chat_footer_ro: string;
  chat_footer_zc: string;
  chat_footer_pt: string;

  // Map Page
  map_loading: string;
  map_layer_patrol: string;
  map_layer_ranges: string;
  map_filter_label: string;
  map_filter_all: string;
  map_filter_critical: string;
  map_filter_high: string;
  map_filter_village: string;
  map_patrol_board: string;
  map_evidence_confidence: string;
  map_zone: string;
  map_captures: string;
  map_tigers: string;
  map_full_breakdown: string;
  map_ask_ai: string;
  map_territory_area: string;
  map_total_captures: string;
  map_stations_visited: string;
  map_ask_about: string;
  map_popup_priority: string;
  map_popup_village: string;
  map_popup_zone: string;
  map_popup_confidence: string;
  map_popup_captures: string;
  map_popup_tigers: string;
  map_sq_km: string;
  map_paths_layer: string;
  map_select_hint: string;
  map_tigers_title: string;
  map_search_ph: string;
  map_all: string;
  map_none: string;
  map_female: string;
  map_male: string;
  map_unknown_sex: string;
  map_date: string;
  map_journey: string;
  map_captures_word: string;
  map_stations_word: string;
  map_period: string;
  map_distance: string;
  map_paths_shown: string;
  map_heatmap_layer: string;
  map_heatmap_hint: string;

  // Alerts
  alerts_badge: string;
  alerts_title: string;
  alerts_title_1: string;
  alerts_title_2: string;
  alerts_subtitle: string;
  alerts_run_engine: string;
  alerts_export_csv: string;
  alerts_filter_all: string;
  alerts_filter_active: string;
  alerts_filter_resolved: string;
  alerts_scanning: string;
  alerts_loading: string;
  alerts_empty_title: string;
  alerts_empty_desc: string;
  alerts_resolved_badge: string;
  alerts_resolve: string;
  alerts_confidence: string;
  alerts_severity_high: string;
  alerts_severity_medium: string;
  alerts_severity_low: string;
  alerts_type_absence: string;
  alerts_type_range_shift: string;
  alerts_type_new_station: string;
  alerts_type_village_proximity: string;
  alerts_type_zone_transition: string;

  // Triage
  triage_badge: string;
  triage_title: string;
  triage_subtitle: string;

  // SD-Card Import
  ingest_panel_title: string;
  ingest_panel_desc: string;
  ingest_no_cards: string;
  ingest_card_detected: string;
  ingest_card_label: string;
  ingest_images_found: string;
  ingest_videos_found: string;
  ingest_choose_station: string;
  ingest_start_button: string;
  ingest_stage_copying: string;
  ingest_stage_triaging: string;
  ingest_stage_done: string;
  ingest_stage_error: string;
  ingest_progress_files: string;
  ingest_duplicates_skipped: string;
  ingest_result_blanks: string;
  ingest_result_retained: string;
  ingest_result_saved: string;
  ingest_import_history: string;
  ingest_history_empty: string;
  ingest_importing_note: string;

  // Dashboard Home
  dash_welcome: string;
  dash_subtitle: string;
  dash_open_alerts: string;
  dash_pending_review: string;
  dash_quick_actions: string;
  dash_act_identify: string;
  dash_act_identify_desc: string;
  dash_act_sdcard: string;
  dash_act_sdcard_desc: string;
  dash_act_map_desc: string;
  dash_act_patrol_desc: string;
  dash_act_alerts_desc: string;
  dash_act_chat_desc: string;
  dash_top_stations: string;
  dash_view_all_stations: string;
  dash_server_settings: string;
  dash_server_desc: string;
  dash_server_save: string;
  dash_server_saved: string;

  // Unified Demo Pipeline
  unified_badge: string;
  unified_title: string;
  unified_subtitle: string;
  unified_upload_title: string;
  unified_upload_desc: string;
  unified_upload_hint: string;
  unified_confirm_button: string;
  unified_analyzing: string;
  unified_step_blank: string;
  unified_step_species: string;
  unified_step_reid: string;
  unified_step_result: string;
  unified_step_blank_desc: string;
  unified_step_species_desc: string;
  unified_step_reid_desc: string;
  unified_step_result_desc: string;
  unified_outcome_matched: string;
  unified_outcome_review: string;
  unified_outcome_new_tiger: string;
  unified_outcome_blank: string;
  unified_outcome_not_a_tiger: string;
  unified_result_confidence: string;
  unified_result_go_to_review: string;
  unified_analyze_another: string;
  unified_registered_tigers: string;
  unified_review_queue: string;
  unified_view_all: string;
  unified_hide: string;
  unified_captures_label: string;
  unified_last_seen: string;
  unified_top_match: string;
  unified_alt_match: string;

  // Folder Upload
  folder_pick: string;
  folder_pick_desc: string;
  folder_selected: string;
  folder_process_btn: string;
  folder_processing: string;
  folder_done: string;
  folder_cancel: string;
  folder_auto_station: string;
  folder_pick_station: string;
  folder_errors: string;
  folder_another: string;
  folder_photos_word: string;

  // Common
  select_language: string;
  zone_core: string;
  zone_buffer: string;
  zone_interface: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    nav_brand_title: "TigerTrace",
    nav_brand_subtitle: "PENCH TIGER RESERVE",
    nav_identify_tiger: "IDENTIFY TIGER",
    nav_upload_video: "UPLOAD VIDEO",
    nav_tiger_habitat: "TIGER HABITAT",
    nav_patrol_priority: "PATROL PRIORITY",
    nav_ai_assistant: "AI ASSISTANT",
    nav_territory: "TERRITORY",
    nav_alerts: "ALERTS",
    nav_triage: "TRIAGE",
    nav_insights: "INSIGHTS",

    // Insights / Analytics page
    insights_title: "Reserve Insights",
    insights_subtitle: "The whole reserve in one view — population, territories, activity and patrol needs, drawn from every camera-trap capture.",
    insights_kpi_tigers: "Tigers tracked",
    insights_kpi_captures: "Camera captures",
    insights_kpi_alerts: "Open alerts",
    insights_kpi_area: "Monitored area",
    insights_kpi_area_unit: "sq km",
    insights_sex_title: "Population by sex",
    insights_sex_female: "Female",
    insights_sex_male: "Male",
    insights_sex_unknown: "Unknown",
    insights_home_range_title: "Territory size by tiger",
    insights_home_range_hint: "Minimum Convex Polygon home range — who roams the largest ground",
    insights_overlap_title: "Shared territories — top overlaps",
    insights_overlap_hint: "Tiger pairs whose home ranges overlap the most (sq km of shared ground)",
    insights_activity_title: "Camera-trap activity by month",
    insights_activity_hint: "Confirmed tiger captures per month across all stations",
    insights_stations_title: "Busiest camera stations",
    insights_stations_hint: "Total captures per station — where tigers pass most often",
    insights_priority_title: "Patrol priority mix",
    insights_zone_title: "Core vs Buffer zone",
    insights_zone_hint: "Where capture activity concentrates",
    insights_open_map: "Open interactive map",

    map_date_from: "From",
    map_date_to: "To",
    map_date_filter_label: "CAPTURE DATE",
    map_date_all_time: "All time",
    map_date_clear: "Clear date filter",

    hero_title_1: "Every Tiger Counted,",
    hero_title_2: "Is a Tiger Protected.",
    hero_scroll_explore: "SCROLL TO EXPLORE ↓",

    habitat_title_1: "Wildlife",
    habitat_title_2: "at Pench Reserve",
    habitat_quote: "“Always leave space for the tiger” is our founding mantra. That philosophy guides the Pench Tiger Reserve intelligence platform.",
    habitat_desc: "A safe home for the Royal Bengal Tiger. We identify and monitor each tiger by its unique stripe pattern — no collars, no touching, just camera photos.",
    habitat_cta: "START IDENTIFYING TIGERS →",

    corridors_title: "Royal Bengal Corridors",
    corridors_desc: "Every tiger's stripe pattern is unique — like a fingerprint. Our system uses these patterns to recognise each tiger, map where it roams, and raise alerts when it comes near villages.",
    corridors_territory_label: "TERRITORY:",
    corridors_zone_label: "ZONE:",
    corridors_status_label: "STATUS:",
    corridors_explore_map_cta: "EXPLORE ON MAP →",
    corridors_patrol_cta: "PATROL PRIORITIES →",

    sanctuary_title_1: "Pench Tiger Reserve, a premier territory recognized for",
    sanctuary_title_2: "biodiversity.",
    sanctuary_desc_1: "Spanning 758 sq km of rich teak and mixed deciduous forest along the Pench River in Central India. From core river valleys to buffer fringe corridors, Pench harbors thriving tiger populations and rich wildlife corridors.",
    sanctuary_desc_2: "Supports 20 camera trap stations, automated blank triage, stripe biometric re-identification, and intelligent patrol priority recommendation scoring.",
    stat_tigers_tracked: "Resident Tigers Tracked",
    stat_captures: "Camera Trap Captures",
    stat_blanks_filtered: "Empty Blanks Filtered",
    stat_storage_saved: "Storage Saved (Offline)",

    map_card_title: "PENCH NATIONAL PARK MAP",
    map_card_badge: "758 SQ KM PROTECTED",
    map_card_core_label: "Core Protected Forest",
    map_card_buffer_label: "Buffer Eco-Corridor",
    map_card_river_label: "Pench River Basin",
    map_card_stations_label: "20 Active Stations",
    map_card_cta: "OPEN INTERACTIVE TERRITORY MAP →",

    patrol_title: "Patrol Priority Intelligence Board",
    patrol_subtitle: "Which camera stations should be patrolled first — ranked simply, with reasons you can check.",
    patrol_critical: "CRITICAL PRIORITY",
    patrol_high: "HIGH PRIORITY",
    patrol_moderate: "MODERATE PRIORITY",
    patrol_low: "LOW PRIORITY",
    patrol_summary_heading: "Reserve Patrol Summary",
    patrol_station_list_heading: "Station Priority Ranking",
    patrol_inspect_factors: "Score Factor Contributions",
    patrol_sequence_heading: "Suggested Tactical Patrol Sequence",
    patrol_export_csv: "EXPORT PATROL CSV",
    patrol_heading_1: "Patrol",
    patrol_heading_2: "Priorities",
    patrol_range_critical: "stations (≥75)",
    patrol_range_high: "stations (50–74)",
    patrol_range_moderate: "stations (25–49)",
    patrol_range_low: "stations (<25)",
    patrol_note_critical: "Immediate inspection recommended",
    patrol_note_high: "Elevated movement corridor",
    patrol_note_moderate: "Periodic monitoring sweep",
    patrol_note_low: "Standard baseline coverage",
    patrol_filter_all: "All Stations",
    patrol_filter_village: "Village Adjacent",
    patrol_view_territory_map: "View on Territory Map",
    patrol_export_priorities_csv: "Export Priorities CSV",
    patrol_ranked_stations: "Ranked Patrol Stations",
    patrol_click_inspect: "Click to inspect factor evidence",
    patrol_calculating: "Calculating station patrol scores...",
    patrol_no_match: "No stations match selected filter.",
    patrol_captures_unit: "captures",
    patrol_tigers_unit: "tiger(s)",
    patrol_zone_word: "zone",
    patrol_zone_label: "Zone:",
    patrol_confidence_label: "Confidence:",
    patrol_station_prefix: "Station",
    patrol_priority_word: "PRIORITY",
    patrol_coordinates_label: "Coordinates:",
    patrol_village_boundary: "Village Boundary Interface",
    patrol_evidence_confidence: "Evidence Confidence:",
    patrol_rationale_heading: "Deterministic Priority Rationale",
    patrol_factor_breakdown: "Transparent Scoring Breakdown",
    patrol_factor_movement: "Tiger Movement Activity",
    patrol_factor_conflict: "Conflict & Buffer Proximity",
    patrol_factor_anomaly: "Spatial Anomalies & Alerts",
    patrol_pts: "pts",
    patrol_contributing_tigers: "Contributing Individual Tigers",
    patrol_captures_at_station: "capture(s) at this station",
    patrol_trajectory_heading: "Multi-Cycle Priority Trajectory",
    patrol_ask_assistant: "Ask Assistant About",
    patrol_select_station_empty: "Select a station from the left column to inspect its scoring factors.",
    patrol_sequence_badge: "Operational Deployment Itinerary",
    patrol_trace_on_map: "Trace On Map",
    patrol_objective_label: "Objective:",
    patrol_village_fringe: "Village Fringe",

    chat_title: "Pench Conservation Intelligence Assistant",
    chat_subtitle: "Ask simple questions about tigers, cameras and alerts — answered from the reserve's own records.",
    chat_placeholder: "Ask about tigers, camera stations, alerts, patrol priorities...",
    chat_suggest_1: "Which stations should we prioritize today?",
    chat_suggest_2: "Where was Choti Tara (PTR-T01) last seen?",
    chat_suggest_3: "Show suggested patrol sequence",
    chat_suggest_4: "Are there any village boundary alerts?",
    chat_clear: "Clear",
    chat_welcome: "I am the Pench conservation assistant. Ask me about tigers, camera stations, alerts, or patrol priorities — I answer from the local database.",
    chat_quick_cat_1: "Tigers & Profiles",
    chat_quick_cat_2: "Territory & Movement",
    chat_quick_cat_3: "Safety & Conflict Alerts",
    chat_quick_cat_4: "Monitoring & Triage",
    chat_quick_q1: "How many tigers are registered?",
    chat_quick_q2: "Tell me about Tiger T112",
    chat_quick_q3: "Show newly identified tigers",
    chat_quick_q4: "Which tiger has the largest home range?",
    chat_quick_q5: "Where was T112 last seen?",
    chat_quick_q6: "Show movement history of T112",
    chat_quick_q7: "Which tiger territories overlap?",
    chat_quick_q8: "Which tigers entered the buffer zone?",
    chat_quick_q9: "Show high severity alerts",
    chat_quick_q10: "Which tigers have not been seen recently?",
    chat_quick_q11: "Which stations have high risk?",
    chat_quick_q12: "Suggest a patrol sequence for today",
    chat_quick_q13: "Give me a summary of this monitoring cycle",
    chat_quick_q14: "Are there any images pending review?",
    chat_quick_q15: "Are all cameras working properly?",
    chat_quick_q16: "Which station has the most tiger activity?",
    chat_offline_badge: "Offline Mode",
    chat_local_badge: "Local Database",
    chat_welcome_short: "Searching the local Pench database…",
    chat_act_dashboard: "Dashboard",
    chat_act_map: "Territory Map",
    chat_act_alerts: "Alerts",
    chat_send: "ASK",
    chat_footer_ro: "Read-Only Safe Execution",
    chat_footer_zc: "Zero Cloud Transmissions",
    chat_footer_pt: "Pench Tiger Reserve Camera Trap Intelligence",

    dash_welcome: "Pench Tiger Reserve, at a glance",
    dash_subtitle: "The home of tiger monitoring at Pench. Everything starts here — check a photo, import a camera card, or see where the tigers are.",
    dash_open_alerts: "Open Alerts",
    dash_pending_review: "Photos to Review",
    dash_quick_actions: "What would you like to do?",
    dash_act_identify: "Identify a Tiger",
    dash_act_identify_desc: "Upload one photo — we check it for animals, confirm it is a tiger, and match its stripes.",
    dash_act_sdcard: "Import from SD Card",
    dash_act_sdcard_desc: "Insert a camera trap memory card — photos are copied, filtered and identified automatically.",
    dash_act_map_desc: "See tiger territories, camera stations and patrol priorities on the map.",
    dash_act_patrol_desc: "See which stations need patrolling first, and why.",
    dash_act_alerts_desc: "Read alerts about tigers near villages or missing for too long.",
    dash_act_chat_desc: "Ask simple questions and get answers from the reserve database.",
    dash_top_stations: "Patrol these stations first",
    dash_view_all_stations: "View all stations",
    dash_server_settings: "Server Settings",
    dash_server_desc: "If you use the Android app or another computer, enter the address of the main TigerTrace machine here (for example http://192.168.1.50:8000).",
    dash_server_save: "Save",
    dash_server_saved: "Saved",

    map_loading: "Loading territory & patrol coordinates…",
    map_layer_patrol: "PATROL PRIORITIES",
    map_layer_ranges: "TIGER HOME RANGES",
    map_filter_label: "STATIONS:",
    map_filter_all: "All",
    map_filter_critical: "Critical",
    map_filter_high: "High",
    map_filter_village: "Village Interface",
    map_patrol_board: "PATROL BOARD",
    map_evidence_confidence: "Evidence Confidence:",
    map_zone: "Zone:",
    map_captures: "Captures:",
    map_tigers: "Tigers:",
    map_full_breakdown: "Full Patrol Breakdown ↗",
    map_ask_ai: "Ask AI",
    map_territory_area: "Territory Area:",
    map_total_captures: "Total Captures:",
    map_stations_visited: "Stations Visited:",
    map_ask_about: "Ask AI About",
    map_popup_priority: "PRIORITY",
    map_popup_village: "VILLAGE INTERFACE",
    map_popup_zone: "Zone:",
    map_popup_confidence: "Confidence:",
    map_popup_captures: "Captures:",
    map_popup_tigers: "Tigers:",
    map_sq_km: "sq km",
    map_paths_layer: "TIGER PATHS",
    map_heatmap_layer: "TIGER HEATMAP",
    map_heatmap_hint: "Final locations — brighter where tigers concentrate",
    map_select_hint: "Select tigers from the list to plot their movement paths",
    map_tigers_title: "Tigers",
    map_search_ph: "Search tiger…",
    map_all: "All",
    map_none: "None",
    map_female: "Female",
    map_male: "Male",
    map_unknown_sex: "Unknown sex",
    map_date: "Date",
    map_journey: "Journey",
    map_captures_word: "captures",
    map_stations_word: "stations",
    map_period: "Period",
    map_distance: "Distance travelled",
    map_paths_shown: "paths shown",

    alerts_badge: "Real-time Territory Surveillance",
    alerts_title: "Behavioral Alerts",
    alerts_title_1: "Behavioral",
    alerts_title_2: "Alerts",
    alerts_subtitle: "Automated anomaly detection monitoring boundary drift, nomadic expansions, and individual absence durations across Pench Tiger Reserve.",
    alerts_run_engine: "Run Alert Engine",
    alerts_export_csv: "Export CSV",
    alerts_filter_all: "All",
    alerts_filter_active: "Active",
    alerts_filter_resolved: "Resolved",
    alerts_scanning: "Scanning…",
    alerts_loading: "Loading active alerts…",
    alerts_empty_title: "No active behavioral deviations",
    alerts_empty_desc: "All resident tigers are within expected home range parameters.",
    alerts_resolved_badge: "Resolved",
    alerts_resolve: "Resolve",
    alerts_confidence: "Confidence:",
    alerts_severity_high: "High",
    alerts_severity_medium: "Medium",
    alerts_severity_low: "Low",
    alerts_type_absence: "Prolonged Absence",
    alerts_type_range_shift: "Range Shift",
    alerts_type_new_station: "New Territory",
    alerts_type_village_proximity: "Community Proximity",
    alerts_type_zone_transition: "Zone Transition",

    triage_badge: "MegaDetector V6 Computer Vision",
    triage_title: "Camera Trap Triage",
    triage_subtitle: "Automated blank image filtering quarantining empty frames triggered by wind or grasses, retaining valid predator captures.",

    ingest_panel_title: "Import from SD Card",
    ingest_panel_desc: "Insert a camera trap memory card into this computer. TigerTrace copies it safely, removes empty photos, and identifies tigers automatically.",
    ingest_no_cards: "No memory card detected. Insert a camera card — it will appear here within a few seconds.",
    ingest_card_detected: "Memory Card Detected",
    ingest_card_label: "Card",
    ingest_images_found: "photos",
    ingest_videos_found: "videos",
    ingest_choose_station: "Which camera station is this card from?",
    ingest_start_button: "Start Import",
    ingest_stage_copying: "Copying photos from card…",
    ingest_stage_triaging: "Filtering empty photos…",
    ingest_stage_done: "Import complete",
    ingest_stage_error: "Import failed",
    ingest_progress_files: "photos processed",
    ingest_duplicates_skipped: "duplicates skipped",
    ingest_result_blanks: "Empty photos removed",
    ingest_result_retained: "Tiger photos kept",
    ingest_result_saved: "Storage saved",
    ingest_import_history: "Previous Imports",
    ingest_history_empty: "No imports yet.",
    ingest_importing_note: "You can remove the card once copying finishes. Nothing is ever deleted from the card.",

    unified_badge: "AI Pipeline Demo",
    unified_title: "Identify a Tiger",
    unified_subtitle: "Upload a camera trap photo — TigerTrace checks it for animals, confirms it is a tiger, reads its stripe pattern, and matches it to a registered tiger. One photo, one answer.",
    unified_upload_title: "Upload a photo",
    unified_upload_desc: "Drag & drop a camera trap photo, or click to browse files.",
    unified_upload_hint: "JPG · PNG · WebP",
    unified_confirm_button: "Check this photo",
    unified_analyzing: "Analyzing…",
    unified_step_blank: "Checking for animals",
    unified_step_species: "Confirming it is a tiger",
    unified_step_reid: "Reading stripe pattern",
    unified_step_result: "Final answer",
    unified_step_blank_desc: "Empty photos are removed instantly",
    unified_step_species_desc: "The species classifier runs on the detected animal",
    unified_step_reid_desc: "A 512-point side-aware stripe fingerprint is matched against all registered tigers",
    unified_step_result_desc: "The tiger's identity and confidence",
    unified_outcome_matched: "Tiger identified",
    unified_outcome_review: "Needs ranger confirmation",
    unified_outcome_new_tiger: "Possible new tiger!",
    unified_outcome_blank: "No animal in this photo",
    unified_outcome_not_a_tiger: "Not a tiger",
    unified_result_confidence: "Match confidence",
    unified_result_go_to_review: "Open Review Queue",
    unified_analyze_another: "Check another photo",
    unified_registered_tigers: "Registered Tigers",
    unified_review_queue: "Photos waiting for ranger confirmation",
    unified_view_all: "View all",
    unified_hide: "Hide",
    unified_captures_label: "captures",
    unified_last_seen: "last seen",
    unified_top_match: "Best match",
    unified_alt_match: "Second best",
    folder_pick: "Upload a whole folder",
    folder_pick_desc: "Pick a folder of camera trap photos — every photo is checked, filtered and identified automatically.",
    folder_selected: "photos selected",
    folder_process_btn: "Process photos",
    folder_processing: "Processing photos…",
    folder_done: "Folder processed",
    folder_cancel: "Cancel",
    folder_auto_station: "Camera station and time are read automatically from the PTR photo filenames",
    folder_pick_station: "Or assign all photos to one station:",
    folder_errors: "failed",
    folder_another: "Process another folder",
    folder_photos_word: "photos",

    select_language: "Language",
    zone_core: "Core Zone",
    zone_buffer: "Buffer Zone",
    zone_interface: "Village Interface",
  },

  hi: {
    nav_brand_title: "टाइगरट्रेस",
    nav_brand_subtitle: "पेंच टाइगर रिजर्व",
    nav_identify_tiger: "बाघ पहचानें",
    nav_upload_video: "वीडियो अपलोड",
    nav_tiger_habitat: "बाघ पर्यावास",
    nav_patrol_priority: "गश्त प्राथमिकता",
    nav_ai_assistant: "एआई सहायक",
    nav_territory: "क्षेत्रीय मानचित्र",
    nav_alerts: "सतर्कता अलर्ट",
    nav_triage: "कैमरा ट्राइएज",
    nav_insights: "इनसाइट्स",

    // Insights / Analytics page
    insights_title: "रिजर्व में रणनीतिक विश्लेषण",
    insights_subtitle: "पूरा रिजर्व एक नज़र में — जनसंख्या, क्षेत्र, गतिविधि और गश्त की ज़रूरतें, हर कैमरा-ट्रैप तस्वीर से तैयार।",
    insights_kpi_tigers: "ट्रैक किए गए बाघ",
    insights_kpi_captures: "कैमरा तस्वीरें",
    insights_kpi_alerts: "खुले अलर्ट",
    insights_kpi_area: "निगरानी क्षेत्र",
    insights_kpi_area_unit: "वर्ग किमी",
    insights_sex_title: "लिंग अनुसार जनसंख्या",
    insights_sex_female: "मादा",
    insights_sex_male: "नर",
    insights_sex_unknown: "अज्ञात",
    insights_home_range_title: "बाघ अनुसार क्षेत्र का आकार",
    insights_home_range_hint: "मिनिमम कन्वेक्स पॉलीगॉन होम रेंज — सबसे बड़ा इलाका किसका है",
    insights_overlap_title: "साझा क्षेत्र — प्रमुख ओवरलैप",
    insights_overlap_hint: "जिन बाघों के इलाके सबसे ज़्यादा मिलते हैं (वर्ग किमी में साझा ज़मीन)",
    insights_activity_title: "महीने अनुसार कैमरा गतिविधि",
    insights_activity_hint: "सभी स्टेशनों से पुष्ट बाघ-तस्वीरें प्रति माह",
    insights_stations_title: "सबसे व्यस्त कैमरा स्टेशन",
    insights_stations_hint: "प्रति स्टेशन कुल तस्वीरें — बाघ सबसे ज़्यादा कहाँ गुज़रते हैं",
    insights_priority_title: "गश्त प्राथमिकता मिश्रण",
    insights_zone_title: "कोर बनाम बफर ज़ोन",
    insights_zone_hint: "गतिविधि कहाँ केंद्रित है",
    insights_open_map: "इंटरैक्टिव नकाशा खोलें",

    map_date_from: "से",
    map_date_to: "तक",
    map_date_filter_label: "तस्वीर तिथि",
    map_date_all_time: "पूरी अवधि",
    map_date_clear: "तारीख फ़िल्टर हटाएँ",

    hero_title_1: "हर बाघ की गिनती,",
    hero_title_2: "हर बाघ की सुरक्षा।",
    hero_scroll_explore: "खोजने के लिए स्क्रॉल करें ↓",

    habitat_title_1: "वन्यजीव संपदा",
    habitat_title_2: "पेंच टाइगर रिजर्व में",
    habitat_quote: "“बाघ के लिए सदैव स्थान छोड़ें” — यही हमारा मूल मंत्र है। यही दर्शन पेंच टाइगर रिजर्व के एआई निगरानी मंच का मार्गदर्शन करता है।",
    habitat_desc: "हम रॉयल बंगाल टाइगर (पैंथेरा टाइग्रिस) के संरक्षण के लिए समर्पित हैं। कंप्यूटर विज़न और गहरी धारियों (स्ट्राइप बायोमेट्रिक्स) के माध्यम से हम घने सागौन और बांस के वनों में बिना किसी कॉलर के व्यक्तिगत बाघों की पहचान और निगरानी करते हैं।",
    habitat_cta: "बाघों की पहचान शुरू करें →",

    corridors_title: "रॉयल बंगाल टाइगर गलियारे",
    corridors_desc: "पेंच में तेंदुओं से लेकर जंगली कुत्तों तक समृद्ध जैव विविधता है, लेकिन हमारी एआई प्रणाली विशेष रूप से व्यक्तिगत बाघों की धारियों के पैटर्न, होम रेंज और गांव सीमा सुरक्षा पर केंद्रित है।",
    corridors_territory_label: "क्षेत्र (टेरिटरी):",
    corridors_zone_label: "ज़ोन:",
    corridors_status_label: "स्थिति:",
    corridors_explore_map_cta: "नक्शे पर देखें →",
    corridors_patrol_cta: "गश्त प्राथमिकताएं →",

    sanctuary_title_1: "पेंच टाइगर रिजर्व, अद्वितीय",
    sanctuary_title_2: "जैव विविधता के लिए प्रसिद्ध।",
    sanctuary_desc_1: "मध्य भारत में पेंच नदी के किनारे 758 वर्ग किमी में फैला सागौन और मिश्रित पर्णपाती वन। मुख्य नदी घाटियों से लेकर बफर गलियारों तक, पेंच समृद्ध बाघ आबादी का प्राकृतिक आश्रय है।",
    sanctuary_desc_2: "20 कैमरा ट्रैप स्टेशनों, स्वचालित खाली फोटो छंटाई, बायोमेट्रिक पहचान और बुद्धिमान गश्त सिफारिश प्रणाली द्वारा संचालित।",
    stat_tigers_tracked: "निगरानी में कुल बाघ",
    stat_captures: "कैमरा ट्रैप कैप्चर",
    stat_blanks_filtered: "खाली फोटो फिल्टर किए",
    stat_storage_saved: "बचाया गया स्टोरेज (ऑफलाइन)",

    map_card_title: "पेंच राष्ट्रीय उद्यान मानचित्र",
    map_card_badge: "758 वर्ग किमी संरक्षित",
    map_card_core_label: "कोर संरक्षित वन क्षेत्र",
    map_card_buffer_label: "बफर पर्यावरण गलियारा",
    map_card_river_label: "पेंच नदी बेसिन",
    map_card_stations_label: "20 सक्रिय कैमरा स्टेशन",
    map_card_cta: "इंटरैक्टिव नक्शा खोलें →",

    patrol_title: "गश्त प्राथमिकता एवं प्रबंधन बोर्ड",
    patrol_subtitle: "किन कैमरा स्टेशनों पर पहले गश्त करनी चाहिए — सरल क्रम में, कारणों के साथ।",
    patrol_critical: "अति महत्वपूर्ण (क्रिटिकल)",
    patrol_high: "उच्च प्राथमिकता (हाई)",
    patrol_moderate: "मध्यम प्राथमिकता",
    patrol_low: "सामान्य प्राथमिकता",
    patrol_summary_heading: "रिजर्व गश्त सारांश",
    patrol_station_list_heading: "स्टेशन प्राथमिकता रैंकिंग",
    patrol_inspect_factors: "स्कोर घटक विश्लेषण",
    patrol_sequence_heading: "सुझाया गया रणनीतिक गश्ती क्रम",
    patrol_export_csv: "गश्त डेटा CSV डाउनलोड",
    patrol_heading_1: "गश्त",
    patrol_heading_2: "प्राथमिकताएं",
    patrol_range_critical: "स्टेशन (≥75)",
    patrol_range_high: "स्टेशन (50–74)",
    patrol_range_moderate: "स्टेशन (25–49)",
    patrol_range_low: "स्टेशन (<25)",
    patrol_note_critical: "तत्काल निरीक्षण अनुशंसित",
    patrol_note_high: "तीव्र गतिविधि वाला गलियारा",
    patrol_note_moderate: "आवधिक निगरानी गश्त",
    patrol_note_low: "सामान्य आधारभूत निगरानी",
    patrol_filter_all: "सभी स्टेशन",
    patrol_filter_village: "गांव के समीप",
    patrol_view_territory_map: "क्षेत्रीय मानचित्र पर देखें",
    patrol_export_priorities_csv: "प्राथमिकताएं CSV डाउनलोड करें",
    patrol_ranked_stations: "गश्त स्टेशन रैंकिंग",
    patrol_click_inspect: "घटक साक्ष्य देखने के लिए क्लिक करें",
    patrol_calculating: "स्टेशन गश्त स्कोर की गणना हो रही है...",
    patrol_no_match: "चुने गए फ़िल्टर से कोई स्टेशन मेल नहीं खाता।",
    patrol_captures_unit: "कैप्चर",
    patrol_tigers_unit: "बाघ",
    patrol_zone_word: "ज़ोन",
    patrol_zone_label: "ज़ोन:",
    patrol_confidence_label: "विश्वसनीयता:",
    patrol_station_prefix: "स्टेशन",
    patrol_priority_word: "प्राथमिकता",
    patrol_coordinates_label: "निर्देशांक:",
    patrol_village_boundary: "गांव–वन सीमा क्षेत्र",
    patrol_evidence_confidence: "साक्ष्य विश्वसनीयता:",
    patrol_rationale_heading: "प्राथमिकता निर्धारण का आधार",
    patrol_factor_breakdown: "पारदर्शी स्कोर विश्लेषण",
    patrol_factor_movement: "बाघों की गतिविधि",
    patrol_factor_conflict: "संघर्ष एवं बफर निकटता",
    patrol_factor_anomaly: "स्थानिक विसंगतियां एवं अलर्ट",
    patrol_pts: "अंक",
    patrol_contributing_tigers: "योगदान देने वाले बाघ",
    patrol_captures_at_station: "कैप्चर (इस स्टेशन पर)",
    patrol_trajectory_heading: "बहु-चक्रीय प्राथमिकता प्रवृत्ति",
    patrol_ask_assistant: "सहायक से पूछें:",
    patrol_select_station_empty: "स्कोरिंग घटक देखने के लिए बाएं कॉलम से कोई स्टेशन चुनें।",
    patrol_sequence_badge: "परिचालन गश्त कार्यक्रम",
    patrol_trace_on_map: "मार्ग नक्शे पर देखें",
    patrol_objective_label: "उद्देश्य:",
    patrol_village_fringe: "गांव सीमा",

    chat_title: "पेंच वन्यजीव संरक्षण एआई सहायक",
    chat_subtitle: "बाघों, कैमरों और अलर्ट के बारे में सरल प्रश्न पूछें — उत्तर रिजर्व के अपने रिकॉर्ड से मिलते हैं।",
    chat_placeholder: "बाघों, कैमरा स्टेशनों, अलर्ट या गश्त प्राथमिकताओं के बारे में पूछें...",
    chat_suggest_1: "आज किन स्टेशनों पर प्राथमिकता से गश्त करनी चाहिए?",
    chat_suggest_2: "छोटी तारा (PTR-T01) को अंतिम बार कहाँ देखा गया?",
    chat_suggest_3: "सुझाई गई गश्त क्रम सूची दिखाएं",
    chat_suggest_4: "क्या कोई गांव सीमा अलर्ट सक्रिय है?",
    chat_clear: "साफ़ करें",
    chat_welcome: "मैं पेंच संरक्षण सहायक हूँ। बाघों, कैमरा स्टेशनों, अलर्ट या गश्त प्राथमिकताओं के बारे में पूछें — मैं स्थानीय डेटाबेस से उत्तर देता हूँ।",
    chat_quick_cat_1: "बाघ और प्रोफ़ाइल",
    chat_quick_cat_2: "क्षेत्र और आंदोलन",
    chat_quick_cat_3: "सुरक्षा और संघर्ष अलर्ट",
    chat_quick_cat_4: "निगरानी और ट्रायेज",
    chat_quick_q1: "कितने बाघ पंजीकृत हैं?",
    chat_quick_q2: "बाघ T112 के बारे में बताएँ",
    chat_quick_q3: "नए पहचाने गए बाघ दिखाएँ",
    chat_quick_q4: "किस बाघ की होम रेंज सबसे बड़ी है?",
    chat_quick_q5: "T112 अंतिम बार कहाँ दिखा?",
    chat_quick_q6: "T112 का आंदोलन इतिहास दिखाएँ",
    chat_quick_q7: "किन बाघों के क्षेत्र ओवरलैप हैं?",
    chat_quick_q8: "कौन से बाघ बफर क्षेत्र में आए?",
    chat_quick_q9: "उच्च गंभीरता वाले अलर्ट दिखाएँ",
    chat_quick_q10: "हाल में कौन से बाघ नहीं दिखे?",
    chat_quick_q11: "कौन से स्टेशन उच्च जोखिम में हैं?",
    chat_quick_q12: "आज के लिए गश्त क्रम सुझाएँ",
    chat_quick_q13: "इस निगरानी चक्र का सारांश दें",
    chat_quick_q14: "क्या कोई तस्वीरें समीक्षा लंबित हैं?",
    chat_quick_q15: "क्या सभी कैमरे ठीक काम कर रहे हैं?",
    chat_quick_q16: "किस स्टेशन पर सबसे ज़्यादा बाघ गतिविधि है?",
    chat_offline_badge: "ऑफलाइन मोड",
    chat_local_badge: "स्थानीय डेटाबेस",
    chat_welcome_short: "स्थानीय पेंच डेटाबेस खोजा जा रहा है…",
    chat_act_dashboard: "डैशबोर्ड",
    chat_act_map: "क्षेत्र नक्शा",
    chat_act_alerts: "अलर्ट",
    chat_send: "पूछें",
    chat_footer_ro: "केवल-पढ़ने योग्य सुरक्षित निष्पादन",
    chat_footer_zc: "शून्य क्लाउड संचरण",
    chat_footer_pt: "पेंच टाइगर रिजर्व कैमरा ट्रैप बुद्धिमत्ता",

    dash_welcome: "पेंच टाइगर रिजर्व — एक नज़र में",
    dash_subtitle: "पेंच में बाघ निगरानी का मुख्य पृष्ठ। सब यहीं से शुरू होता है — फोटो जाँचें, कैमरा कार्ड आयात करें, या देखें बाघ कहाँ हैं।",
    dash_open_alerts: "खुले अलर्ट",
    dash_pending_review: "समीक्षा की प्रतीक्षा में फोटो",
    dash_quick_actions: "आप क्या करना चाहेंगे?",
    dash_act_identify: "बाघ की पहचान करें",
    dash_act_identify_desc: "एक फोटो अपलोड करें — हम जाँचते हैं कि जानवर है, बाघ है, और धारियों से मिलान करते हैं।",
    dash_act_sdcard: "SD कार्ड से आयात करें",
    dash_act_sdcard_desc: "कैमरा ट्रैप की मेमोरी कार्ड लगाएँ — फोटो स्वचालित रूप से कॉपी, छँटी और पहचानी जाती हैं।",
    dash_act_map_desc: "नक्शे पर बाघों के क्षेत्र, कैमरा स्टेशन और गश्ती प्राथमिकताएँ देखें।",
    dash_act_patrol_desc: "देखें किन स्टेशनों पर पहले गश्त करनी चाहिए, और क्यों।",
    dash_act_alerts_desc: "गांवों के पास या लंबे समय से गायब बाघों के अलर्ट पढ़ें।",
    dash_act_chat_desc: "सरल प्रश्न पूछें और रिजर्व डेटाबेस से उत्तर पाएँ।",
    dash_top_stations: "इन स्टेशनों पर पहले गश्त करें",
    dash_view_all_stations: "सभी स्टेशन देखें",
    dash_server_settings: "सर्वर सेटिंग्स",
    dash_server_desc: "यदि आप एंड्रॉइड ऐप या किसी अन्य कंप्यूटर का उपयोग करते हैं, तो यहाँ मुख्य टाइगरट्रेस मशीन का पता दर्ज करें (जैसे http://192.168.1.50:8000)।",
    dash_server_save: "सहेजें",
    dash_server_saved: "सहेजा गया",

    map_loading: "क्षेत्र और गश्ती निर्देशांक लोड हो रहे हैं…",
    map_layer_patrol: "गश्ती प्राथमिकताएँ",
    map_layer_ranges: "बाघ होम रेंज",
    map_filter_label: "स्टेशन:",
    map_filter_all: "सभी",
    map_filter_critical: "गंभीर",
    map_filter_high: "उच्च",
    map_filter_village: "ग्राम-सन्निकट",
    map_patrol_board: "गश्ती बोर्ड",
    map_evidence_confidence: "साक्ष्य विश्वसनीयता:",
    map_zone: "क्षेत्र:",
    map_captures: "कैप्चर:",
    map_tigers: "बाघ:",
    map_full_breakdown: "पूर्ण गश्ती विवरण ↗",
    map_ask_ai: "एआई से पूछें",
    map_territory_area: "क्षेत्रफल:",
    map_total_captures: "कुल कैप्चर:",
    map_stations_visited: "देखे गए स्टेशन:",
    map_ask_about: "एआई से पूछें",
    map_popup_priority: "प्राथमिकता",
    map_popup_village: "ग्राम-सन्निकट",
    map_popup_zone: "क्षेत्र:",
    map_popup_confidence: "विश्वसनीयता:",
    map_popup_captures: "कैप्चर:",
    map_popup_tigers: "बाघ:",
    map_sq_km: "वर्ग किमी",
    map_paths_layer: "बाघ आंदोलन पथ",
    map_heatmap_layer: "बाघ हीटमैप",
    map_heatmap_hint: "अंतिम स्थान — जहाँ बाघ अधिक केंद्रित हैं वहाँ अधिक चमकीला",
    map_select_hint: "बाघों के आंदोलन पथ देखने के लिए सूची से चुनें",
    map_tigers_title: "बाघ",
    map_search_ph: "बाघ खोजें…",
    map_all: "सभी",
    map_none: "कोई नहीं",
    map_female: "मादा",
    map_male: "नर",
    map_unknown_sex: "अज्ञात लिंग",
    map_date: "तारीख",
    map_journey: "यात्रा",
    map_captures_word: "कैप्चर",
    map_stations_word: "स्टेशन",
    map_period: "अवधि",
    map_distance: "तय दूरी",
    map_paths_shown: "पथ दिखाए गए",

    alerts_badge: "रियल-टाइम क्षेत्र निगरानी",
    alerts_title: "व्यवहार सतर्कता",
    alerts_title_1: "व्यवहार",
    alerts_title_2: "सतर्कता",
    alerts_subtitle: "सीमा बदलाव, खानाबदोश विस्तार और व्यक्तिगत बाघों की अनुपस्थिति अवधियों की स्वचालित विसंगति पहचान।",
    alerts_run_engine: "अलर्ट इंजन चलाएं",
    alerts_export_csv: "CSV डाउनलोड",
    alerts_filter_all: "सभी",
    alerts_filter_active: "सक्रिय",
    alerts_filter_resolved: "हल किए गए",
    alerts_scanning: "स्कैन हो रहा है…",
    alerts_loading: "सक्रिय अलर्ट लोड हो रहे हैं…",
    alerts_empty_title: "कोई सक्रिय व्यवहारिक विचलन नहीं",
    alerts_empty_desc: "सभी निवासी बाघ अपेक्षित होम रेंज सीमाओं के भीतर हैं।",
    alerts_resolved_badge: "हल किया गया",
    alerts_resolve: "हल करें",
    alerts_confidence: "विश्वसनीयता:",
    alerts_severity_high: "उच्च",
    alerts_severity_medium: "मध्यम",
    alerts_severity_low: "कम",
    alerts_type_absence: "लंबी अनुपस्थिति",
    alerts_type_range_shift: "क्षेत्र बदलाव",
    alerts_type_new_station: "नया क्षेत्र",
    alerts_type_village_proximity: "ग्रामीण निकटता",
    alerts_type_zone_transition: "ज़ोन संक्रमण",

    triage_badge: "मेगाडिटेक्टर V6 कंप्यूटर दृष्टि",
    triage_title: "कैमरा ट्रैप ट्रायेज",
    triage_subtitle: "वायु या घास से ट्रिगर हुई खाली फ्रेम हटाने की स्वचालित प्रणाली, वैध शिकारी चित्र सुरक्षित रखती है।",

    ingest_panel_title: "SD कार्ड से आयात करें",
    ingest_panel_desc: "कैमरा ट्रैप की मेमोरी कार्ड इस कंप्यूटर में लगाएँ। टाइगरट्रेस कार्ड को सुरक्षित रूप से कॉपी करता है, खाली फोटो हटाता है, और बाघों की पहचान स्वचालित रूप से करता है।",
    ingest_no_cards: "कोई मेमोरी कार्ड नहीं मिला। कैमरा कार्ड लगाएँ — कुछ ही सेकंड में यहाँ दिखाई देगा।",
    ingest_card_detected: "मेमोरी कार्ड मिला",
    ingest_card_label: "कार्ड",
    ingest_images_found: "फोटो",
    ingest_videos_found: "वीडियो",
    ingest_choose_station: "यह कार्ड किस कैमरा स्टेशन का है?",
    ingest_start_button: "आयात शुरू करें",
    ingest_stage_copying: "कार्ड से फोटो कॉपी हो रही हैं…",
    ingest_stage_triaging: "खाली फोटो छँटाई हो रही है…",
    ingest_stage_done: "आयात पूर्ण",
    ingest_stage_error: "आयात विफल",
    ingest_progress_files: "फोटो प्रोसेस हुईं",
    ingest_duplicates_skipped: "डुप्लिकेट छोड़े गए",
    ingest_result_blanks: "खाली फोटो हटाईं",
    ingest_result_retained: "बाघ की फोटो रखीं",
    ingest_result_saved: "स्टोरेज बचाया",
    ingest_import_history: "पिछले आयात",
    ingest_history_empty: "अभी तक कोई आयात नहीं।",
    ingest_importing_note: "कॉपी पूरा होने पर आप कार्ड हटा सकते हैं। कार्ड से कुछ भी कभी नहीं मिटाया जाता।",

    unified_badge: "एआई पाइपलाइन डेमो",
    unified_title: "बाघ की पहचान करें",
    unified_subtitle: "कैमरा ट्रैप की फोटो अपलोड करें — टाइगरट्रेस जाँचता है कि फोटो में जानवर है, पुष्टि करता है कि बाघ है, उसकी धारी-पैटर्न पढ़ता है, और पंजीकृत बाघ से मिलाता है। एक फोटो, एक उत्तर।",
    unified_upload_title: "फोटो अपलोड करें",
    unified_upload_desc: "कैमरा ट्रैप की फोटो यहाँ खींचें, या ब्राउज़ करने के लिए क्लिक करें।",
    unified_upload_hint: "JPG · PNG · WebP",
    unified_confirm_button: "फोटो जाँचें",
    unified_analyzing: "जाँच हो रही है…",
    unified_step_blank: "जानवर की जाँच",
    unified_step_species: "बाघ की पुष्टि",
    unified_step_reid: "धारी-पैटर्न पढ़ना",
    unified_step_result: "अंतिम उत्तर",
    unified_step_blank_desc: "खाली फोटो तुरंत हट जाती हैं",
    unified_step_species_desc: "पाये गए जानवर पर प्रजाति-वर्गीकरण चलता है",
    unified_step_reid_desc: "512-बिंदु की धारी-फिंगरप्रिंट सभी पंजीकृत बाघों से मिलाई जाती है",
    unified_step_result_desc: "बाघ की पहचान और विश्वसनीयता",
    unified_outcome_matched: "बाघ की पहचान हुई",
    unified_outcome_review: "रेंजर की पुष्टि चाहिए",
    unified_outcome_new_tiger: "संभावित नया बाघ!",
    unified_outcome_blank: "इस फोटो में कोई जानवर नहीं",
    unified_outcome_not_a_tiger: "बाघ नहीं है",
    unified_result_confidence: "मिलान विश्वसनीयता",
    unified_result_go_to_review: "समीक्षा कतार खोलें",
    unified_analyze_another: "दूसरी फोटो जाँचें",
    unified_registered_tigers: "पंजीकृत बाघ",
    unified_review_queue: "रेंजर-पुष्टि की प्रतीक्षा में फोटो",
    unified_view_all: "सभी देखें",
    unified_hide: "छिपाएँ",
    unified_captures_label: "कैप्चर",
    unified_last_seen: "अंतिम बार देखा",
    unified_top_match: "सर्वोत्तम मिलान",
    unified_alt_match: "दूसरा सर्वोत्तम",
    folder_pick: "पूरा फ़ोल्डर अपलोड करें",
    folder_pick_desc: "कैमरा ट्रैप फोटो का फ़ोल्डर चुनें — हर फोटो स्वचालित रूप से जाँची, छँटी और पहचानी जाती है।",
    folder_selected: "फोटो चुनी गईं",
    folder_process_btn: "फोटो प्रोसेस करें",
    folder_processing: "फोटो प्रोसेस हो रही हैं…",
    folder_done: "फ़ोल्डर प्रोसेस पूर्ण",
    folder_cancel: "रद्द करें",
    folder_auto_station: "कैमरा स्टेशन और समय PTR फोटो फ़ाइल-नामों से स्वतः पढ़ा जाता है",
    folder_pick_station: "या सभी फोटो एक स्टेशन को दें:",
    folder_errors: "विफल",
    folder_another: "दूसरा फ़ोल्डर प्रोसेस करें",
    folder_photos_word: "फोटो",

    select_language: "भाषा",
    zone_core: "कोर ज़ोन",
    zone_buffer: "बफर ज़ोन",
    zone_interface: "गांव सीमा क्षेत्र",
  },

  mr: {
    nav_brand_title: "टायगरट्रेस",
    nav_brand_subtitle: "पेंच व्याघ्र प्रकल्प",
    nav_identify_tiger: "वाघ ओळखा",
    nav_upload_video: "व्हिडिओ अपलोड",
    nav_tiger_habitat: "वाघांचे अधिवास",
    nav_patrol_priority: "गस्त प्राथमिकता",
    nav_ai_assistant: "एआय सहाय्यक",
    nav_territory: "प्रादेशिक नकाशा",
    nav_alerts: "सुरक्षा अलर्ट",
    nav_triage: "कॅमेरा ट्रायज",
    nav_insights: "अंतर्दृष्टी",

    // Insights / Analytics page
    insights_title: "अभयारण्याची सर्वसमावेशक माहिती",
    insights_subtitle: "संपूर्ण अभयारण्य एका दृष्टिक्षेपात — व्याघ्र संख्या, प्रदेश, चालचाल आणि गस्तीची गरज, प्रत्येक कॅमेरा-ट्रॅप फोटोमधून.",
    insights_kpi_tigers: "ट्रॅक केलेले वाघ",
    insights_kpi_captures: "कॅमेरा फोटो",
    insights_kpi_alerts: "खुल्या सूचना",
    insights_kpi_area: "निगराणी क्षेत्र",
    insights_kpi_area_unit: "चौ.किमी",
    insights_sex_title: "लिंगानुसार संख्या",
    insights_sex_female: "मादी",
    insights_sex_male: "नर",
    insights_sex_unknown: "अज्ञात",
    insights_home_range_title: "वाघानुसार प्रदेशाचा आकार",
    insights_home_range_hint: "मिनिमम कन्व्हेक्स पॉलीगॉन होम रेंज — सर्वात मोठा प्रदेश कोणाचा",
    insights_overlap_title: "सामायिक प्रदेश — प्रमुख ओव्हरलॅप",
    insights_overlap_hint: "ज्या वाघांचे प्रदेश सर्वाधिक जुळतात (चौ.किमी सामायिक जमीन)",
    insights_activity_title: "महिन्यानुसार कॅमेरा चालचाल",
    insights_activity_hint: "सर्व स्थानकांमधून दर महिन्याला नोंदवलेल्या वाघांच्या फोटो",
    insights_stations_title: "सर्वात व्यस्त कॅमेरा स्थानके",
    insights_stations_hint: "प्रति स्थानक एकूण फोटो — वाघ कुठे सर्वात जास्त वावरतात",
    insights_priority_title: "गस्त प्राधान्य संयोजन",
    insights_zone_title: "कोर वि बफर झोन",
    insights_zone_hint: "चालचाल कुठे केंद्रित आहे",
    insights_open_map: "संवादी नकाशा उघडा",

    map_date_from: "पासून",
    map_date_to: "पर्यंत",
    map_date_filter_label: "फोटो दिनांक",
    map_date_all_time: "संपूर्ण कालावधी",
    map_date_clear: "दिनांक फिल्टर काढा",

    hero_title_1: "प्रत्येक वाघाची नोंद,",
    hero_title_2: "हीच वाघांची सुरक्षा.",
    hero_scroll_explore: "पाहण्यासाठी खाली स्क्रोल करा ↓",

    habitat_title_1: "वन्यजीव संपदा",
    habitat_title_2: "पेंच व्याघ्र प्रकल्पात",
    habitat_quote: "“वाघासाठी नेहमी जागा सोडा” — हाच आमचा मूळ विचार आहे. हाच दृष्टिकोन पेंच व्याघ्र प्रकल्पाच्या एआय देखरेख प्रणालीला दिशा देतो.",
    habitat_desc: "आम्ही रॉयल बंगाल वाघ (पँथेरा टायग्रीस) संवर्धनासाठी कटिबद्ध आहोत. संगणक दृष्टी (Computer Vision) आणि पट्ट्यांच्या बायोमेट्रिक्सच्या साहाय्याने आम्ही कोणत्याही कॉलरशिवाय वैयक्तिक वाघांची अचूक नोंद ठेवतो.",
    habitat_cta: "वाघ ओळखण्यास सुरुवात करा →",

    corridors_title: "रॉयल बंगाल वाघ भ्रमणमार्ग",
    corridors_desc: "पेंचमध्ये बिबट्यांपासून ते रानकुत्र्यांपर्यंत समृद्ध जैवविविधता आहे, परंतु आमची एआय प्रणाली विशेषतः वाघांच्या पट्ट्यांचे नमुने, संचार क्षेत्र आणि गाव सीमा सुरक्षेवर लक्ष केंद्रित करते.",
    corridors_territory_label: "क्षेत्र (टेरिटरी):",
    corridors_zone_label: "झोन:",
    corridors_status_label: "स्थिती:",
    corridors_explore_map_cta: "नकाशावर पहा →",
    corridors_patrol_cta: "गस्त प्राधान्यक्रम →",

    sanctuary_title_1: "पेंच व्याघ्र प्रकल्प, समृद्ध",
    sanctuary_title_2: "जैवविविधतेसाठी जगप्रसिद्ध.",
    sanctuary_desc_1: "मध्य भारतात पेंच नदीच्या काठावर ७५८ चौ.किमी. पसरलेले सागवान व मिश्र पानगळ जंगल. मुख्य नदीच्या खोऱ्यांपासून ते बफर कॉरिडोअरपर्यंत, पेंच हे वाघांचे सुरक्षित माहेरघर आहे.",
    sanctuary_desc_2: "२० कॅमेरा ट्रॅप स्टेशन्स, स्वयंचलित रिकाम्या फोटोंची वर्गवारी, बायोमेट्रिक ओळख आणि गस्त शिफारस प्रणालीने सुसज्ज.",
    stat_tigers_tracked: "नोंद असलेले निवासी वाघ",
    stat_captures: "कॅमेरा ट्रॅप कॅप्चर्स",
    stat_blanks_filtered: "रिकामे फोटो फिल्टर केले",
    stat_storage_saved: "वाचवलेला डेटा (ऑफलाइन)",

    map_card_title: "पेंच राष्ट्रीय उद्यान नकाशा",
    map_card_badge: "७५८ चौ.किमी. संरक्षित क्षेत्र",
    map_card_core_label: "गाभा (Core) संरक्षित जंगल",
    map_card_buffer_label: "बफर पर्यावरण कॉरिडोअर",
    map_card_river_label: "पेंच नदी खोरे",
    map_card_stations_label: "२० सक्रिय कॅमेरा स्टेशन्स",
    map_card_cta: "संपूर्ण नकाशा उघडा →",

    patrol_title: "गस्त प्राथमिकता आणि व्यवस्थापन फलक",
    patrol_subtitle: "कोणत्या कॅमेरा स्थानकांवर आधी गस्त घालावी — सोप्या क्रमाने, कारणांसह.",
    patrol_critical: "अतिसंवेदनशील (क्रिटिकल)",
    patrol_high: "उच्च प्राथमिकता (हाय)",
    patrol_moderate: "मध्यम प्राथमिकता",
    patrol_low: "सामान्य प्राथमिकता",
    patrol_summary_heading: "प्रकल्प गस्त सारांश",
    patrol_station_list_heading: "स्टेशन प्राधान्य क्रमवारी",
    patrol_inspect_factors: "गुण घटक विश्लेषण",
    patrol_sequence_heading: "सुचवलेला रणनीतिक गस्त क्रम",
    patrol_export_csv: "गस्त डेटा CSV डाउनलोड",
    patrol_heading_1: "गस्त",
    patrol_heading_2: "प्राधान्यक्रम",
    patrol_range_critical: "स्टेशन्स (≥75)",
    patrol_range_high: "स्टेशन्स (50–74)",
    patrol_range_moderate: "स्टेशन्स (25–49)",
    patrol_range_low: "स्टेशन्स (<25)",
    patrol_note_critical: "तत्काळ तपासणीची शिफारस",
    patrol_note_high: "वाढलेल्या हालचालीचा मार्ग",
    patrol_note_moderate: "नियमित देखरेख फेरी",
    patrol_note_low: "मानक पायाभूत देखरेख",
    patrol_filter_all: "सर्व स्टेशन्स",
    patrol_filter_village: "गावालगत",
    patrol_view_territory_map: "प्रादेशिक नकाशावर पहा",
    patrol_export_priorities_csv: "प्राधान्यक्रम CSV डाउनलोड करा",
    patrol_ranked_stations: "गस्त स्टेशन क्रमवारी",
    patrol_click_inspect: "घटक पुरावे पाहण्यासाठी क्लिक करा",
    patrol_calculating: "स्टेशन गस्त गुणांची गणना सुरू आहे…",
    patrol_no_match: "निवडलेल्या फिल्टरशी जुळणारे स्टेशन नाही.",
    patrol_captures_unit: "कॅप्चर",
    patrol_tigers_unit: "वाघ",
    patrol_zone_word: "झोन",
    patrol_zone_label: "झोन:",
    patrol_confidence_label: "विश्वासार्हता:",
    patrol_station_prefix: "स्टेशन",
    patrol_priority_word: "प्राधान्य",
    patrol_coordinates_label: "गुणदंड:",
    patrol_village_boundary: "गाव–वन सीमा भाग",
    patrol_evidence_confidence: "पुरावा विश्वासार्हता:",
    patrol_rationale_heading: "प्राधान्य निर्धारणाचा आधार",
    patrol_factor_breakdown: "पारदर्शक गुण विश्लेषण",
    patrol_factor_movement: "वाघांची हालचाल",
    patrol_factor_conflict: "संघर्ष व बफर जवळीक",
    patrol_factor_anomaly: "स्थानिक विसंगती व अलर्ट",
    patrol_pts: "गुण",
    patrol_contributing_tigers: "योगदान देणारे वाघ",
    patrol_captures_at_station: "कॅप्चर (या स्टेशनवर)",
    patrol_trajectory_heading: "बहुचक्रीय प्राधान्य प्रवृत्ती",
    patrol_ask_assistant: "सहाय्यकाला विचारा:",
    patrol_select_station_empty: "गुण घटक पाहण्यासाठी डाव्या स्तंभातील एक स्टेशन निवडा.",
    patrol_sequence_badge: "कार्यरत गस्त कार्यक्रम",
    patrol_trace_on_map: "मार्ग नकाशावर पहा",
    patrol_objective_label: "उद्दिष्ट:",
    patrol_village_fringe: "गाव सीमा",

    chat_title: "पेंच वन्यजीव संवर्धन एआय सहाय्यक",
    chat_subtitle: "वाघ, कॅमेरे आणि सूचनांबद्दल सोपे प्रश्न विचारा — उत्तरे रिझर्व्हच्या स्वतःच्या नोंदींवरून मिळतात.",
    chat_placeholder: "वाघ, कॅमेरा स्टेशन्स, अलर्ट किंवा गस्त प्राधान्यांबद्दल विचारा...",
    chat_suggest_1: "आज कोणत्या स्टेशन्सवर प्राधान्याने गस्त घालावी?",
    chat_suggest_2: "छोटी तारा (PTR-T01) शेवटी कुठे दिसली होती?",
    chat_suggest_3: "सुचवलेला गस्त क्रम दाखवा",
    chat_suggest_4: "काही गाव सीमा अलर्ट आहेत का?",
    chat_clear: "पुसा",
    chat_welcome: "मी पेंच संवर्धन सहाय्यक आहे. वाघ, कॅमेरा स्थानके, सूचना किंवा गस्त प्राधान्यांबद्दल विचारा — मी स्थानिक डेटाबेसवरून उत्तर देतो.",
    chat_quick_cat_1: "वाघ आणि प्रोफाइल",
    chat_quick_cat_2: "क्षेत्र आणि हालचाल",
    chat_quick_cat_3: "सुरक्षा आणि संघर्ष सूचना",
    chat_quick_cat_4: "निगराणी आणि चाळणी",
    chat_quick_q1: "किती वाघ नोंदणीकृत आहेत?",
    chat_quick_q2: "वाघ T112 बद्दल सांगा",
    chat_quick_q3: "नव्याने ओळखलेले वाघ दाखवा",
    chat_quick_q4: "कोणत्या वाघाचे अधिवास क्षेत्र सर्वात मोठे आहे?",
    chat_quick_q5: "T112 शेवटचे कुठे दिसला?",
    chat_quick_q6: "T112 ची हालचाल माहिती दाखवा",
    chat_quick_q7: "कोणत्या वाघांची क्षेत्रे ओव्हरलॅप आहेत?",
    chat_quick_q8: "कोणते वाघ बफर विभागात आले?",
    chat_quick_q9: "उच्च तीव्रतेच्या सूचना दाखवा",
    chat_quick_q10: "अलीकडे कोणते वाघ दिसले नाहीत?",
    chat_quick_q11: "कोणती स्थानके उच्च धोक्यात आहेत?",
    chat_quick_q12: "आजची गस्त रचना सुचवा",
    chat_quick_q13: "या निगराणी चक्राचा सारांश द्या",
    chat_quick_q14: "कोणतीही चित्रे पुनरावलोकनात प्रलंबित आहेत का?",
    chat_quick_q15: "सर्व कॅमेरे व्यवस्थित चालू आहेत का?",
    chat_quick_q16: "कोणत्या स्थानकात सर्वाधिक वाघ हालचाल आहे?",
    chat_offline_badge: "ऑफलाइन मोड",
    chat_local_badge: "स्थानिक डेटाबेस",
    chat_welcome_short: "स्थानिक पेंच डेटाबेस शोधला जात आहे…",
    chat_act_dashboard: "डॅशबोर्ड",
    chat_act_map: "क्षेत्र नकाशा",
    chat_act_alerts: "सूचना",
    chat_send: "विचारा",
    chat_footer_ro: "फक्त-वाचनीय सुरक्षित कार्यान्विती",
    chat_footer_zc: "शून्य क्लाउड प्रसारण",
    chat_footer_pt: "पेंच टायगर रिझर्व्ह कॅमेरा ट्रॅप बुद्धिमत्ता",

    dash_welcome: "पेंच टायगर रिझर्व्ह — एका दृष्टिक्षेपात",
    dash_subtitle: "पेंचमधील वाघ निगराणीचे मुख्य पृष्ठ. सर्व इथूनच सुरू होते — फोटो तपासा, कॅमेरा कार्ड आयात करा, किंवा पहा वाघ कुठे आहेत.",
    dash_open_alerts: "उघडे सूचना",
    dash_pending_review: "पुनरावलोकनाची वाट पाहणारे फोटो",
    dash_quick_actions: "तुम्हाला काय करायचे आहे?",
    dash_act_identify: "वाघाची ओळख करा",
    dash_act_identify_desc: "एक फोटो अपलोड करा — आम्ही तपासतो की प्राणी आहे, वाघ आहे, आणि पट्ट्यांनी जुळवणी करतो.",
    dash_act_sdcard: "SD कार्डवरून आयात करा",
    dash_act_sdcard_desc: "कॅमेरा ट्रॅपची मेमरी कार्ड घाला — फोटो आपोआप कॉपी, चाळणी आणि ओळखल्या जातात.",
    dash_act_map_desc: "नकाशावर वाघांची क्षेत्रे, कॅमेरा स्थानके आणि गस्त प्राधान्ये पहा.",
    dash_act_patrol_desc: "पहा कोणत्या स्थानकांवर आधी गस्त घालावी, आणि का.",
    dash_act_alerts_desc: "गावांजवळ किंवा बराच काळ न दिसणाऱ्या वाघांच्या सूचना वाचा.",
    dash_act_chat_desc: "सोपे प्रश्न विचारा आणि रिझर्व्ह डेटाबेसवरून उत्तरे मिळवा.",
    dash_top_stations: "या स्थानकांवर आधी गस्त घाला",
    dash_view_all_stations: "सर्व स्थानके पहा",
    dash_server_settings: "सर्व्हर सेटिंग्ज",
    dash_server_desc: "तुम्ही अँड्रॉइड ॲप किंवा दुसरा संगणक वापरत असाल, तर येथे मुख्य टायगरट्रेस मशीनचा पत्ता टाका (उदा. http://192.168.1.50:8000).",
    dash_server_save: "जतन करा",
    dash_server_saved: "जतन झाले",

    map_loading: "क्षेत्र व गस्त निर्देशांक लोड होत आहेत…",
    map_layer_patrol: "गस्त प्राधान्ये",
    map_layer_ranges: "वाघ अधिवास क्षेत्र",
    map_filter_label: "स्थानके:",
    map_filter_all: "सर्व",
    map_filter_critical: "गंभीर",
    map_filter_high: "उच्च",
    map_filter_village: "गाव-लगत",
    map_patrol_board: "गस्त मंडळ",
    map_evidence_confidence: "पुरावा खात्री:",
    map_zone: "विभाग:",
    map_captures: "कॅप्चर:",
    map_tigers: "वाघ:",
    map_full_breakdown: "संपूर्ण गस्त तपशील ↗",
    map_ask_ai: "एआयला विचारा",
    map_territory_area: "क्षेत्रफळ:",
    map_total_captures: "एकूण कॅप्चर:",
    map_stations_visited: "पाहिलेली स्थानके:",
    map_ask_about: "एआयला विचारा",
    map_popup_priority: "प्राधान्य",
    map_popup_village: "गाव-लगत",
    map_popup_zone: "विभाग:",
    map_popup_confidence: "खात्री:",
    map_popup_captures: "कॅप्चर:",
    map_popup_tigers: "वाघ:",
    map_sq_km: "चौ.किमी",
    map_paths_layer: "वाघ हालचाल मार्ग",
    map_heatmap_layer: "वाघ हीटमॅप",
    map_heatmap_hint: "शेवटची स्थाने — जिथे वाघ जास्त केंद्रित आहेत तिथे जास्त तेजस्वी",
    map_select_hint: "वाघांचे हालचाल मार्ग पाहण्यासाठी यादीतून निवडा",
    map_tigers_title: "वाघ",
    map_search_ph: "वाघ शोधा…",
    map_all: "सर्व",
    map_none: "काही नाही",
    map_female: "मादी",
    map_male: "नर",
    map_unknown_sex: "अज्ञात लिंग",
    map_date: "दिनांक",
    map_journey: "प्रवास",
    map_captures_word: "कॅप्चर",
    map_stations_word: "स्थानके",
    map_period: "कालावधी",
    map_distance: "केलेले अंतर",
    map_paths_shown: "मार्ग दाखवले",

    alerts_badge: "रिअल-टाइम प्रादेशिक देखरेख",
    alerts_title: "वर्तणूक अलर्ट",
    alerts_title_1: "वर्तणूक",
    alerts_title_2: "अलर्ट",
    alerts_subtitle: "सीमा बदल, भटकंती आणि वाघांच्या अनुपस्थितीचे स्वयंचलित शोध.",
    alerts_run_engine: "अलर्ट इंजिन चालवा",
    alerts_export_csv: "CSV डाउनलोड",
    alerts_filter_all: "सर्व",
    alerts_filter_active: "सक्रिय",
    alerts_filter_resolved: "निकाली",
    alerts_scanning: "स्कॅन सुरू आहे…",
    alerts_loading: "सक्रिय अलर्ट लोड होत आहेत…",
    alerts_empty_title: "कोणतेही सक्रिय वर्तणूक विचलन नाही",
    alerts_empty_desc: "सर्व स्थानिक वाघ अपेक्षित होम रेंज मर्यादेत आहेत.",
    alerts_resolved_badge: "निकाली",
    alerts_resolve: "निकाली करा",
    alerts_confidence: "विश्वासार्हता:",
    alerts_severity_high: "उच्च",
    alerts_severity_medium: "मध्यम",
    alerts_severity_low: "कमी",
    alerts_type_absence: "दीर्घ अनुपस्थिती",
    alerts_type_range_shift: "प्रादेशिक बदल",
    alerts_type_new_station: "नवीन प्रदेश",
    alerts_type_village_proximity: "गावजवळील सान्निध्य",
    alerts_type_zone_transition: "विभाग संक्रमण",

    triage_badge: "मेगाडिटेक्टर V6 संगणक दृष्टी",
    triage_title: "कॅमेरा ट्रॅप ट्रायज",
    triage_subtitle: "वारा वा गवताने ट्रिगर झालेले रिकामे फ्रेम काढून टाकणे, योग्य शिकारी चित्रे जपले जातात.",

    ingest_panel_title: "SD कार्डवरून आयात करा",
    ingest_panel_desc: "कॅमेरा ट्रॅपची मेमरी कार्ड या संगणकात घाला. टायगरट्रेस कार्ड सुरक्षितपणे कॉपी करते, रिकाम्या फोटो काढते, आणि वाघांची ओळख आपोआप करते.",
    ingest_no_cards: "मेमरी कार्ड सापडली नाही. कॅमेरा कार्ड घाला — काही सेकंदांत इथे दिसेल.",
    ingest_card_detected: "मेमरी कार्ड सापडली",
    ingest_card_label: "कार्ड",
    ingest_images_found: "फोटो",
    ingest_videos_found: "व्हिडिओ",
    ingest_choose_station: "ही कार्ड कोणत्या कॅमेरा स्टेशनची आहे?",
    ingest_start_button: "आयात सुरू करा",
    ingest_stage_copying: "कार्डवरून फोटो कॉपी होत आहेत…",
    ingest_stage_triaging: "रिकाम्या फोटो चाळणी होत आहे…",
    ingest_stage_done: "आयात पूर्ण",
    ingest_stage_error: "आयात अयशस्वी",
    ingest_progress_files: "फोटो प्रोसेस झाल्या",
    ingest_duplicates_skipped: "डुप्लिकेट वगळले",
    ingest_result_blanks: "रिकाम्या फोटो काढल्या",
    ingest_result_retained: "वाघांच्या फोटो ठेवल्या",
    ingest_result_saved: "स्टोरेज वाचले",
    ingest_import_history: "मागील आयात",
    ingest_history_empty: "अजून आयात नाही.",
    ingest_importing_note: "कॉपी पूर्ण झाल्यावर तुम्ही कार्ड काढू शकता. कार्डवरून कधीही काहीही डिलीट केले जात नाही.",

    unified_badge: "एआय पाइपलाइन डेमो",
    unified_title: "वाघाची ओळख करा",
    unified_subtitle: "कॅमेरा ट्रॅपचा फोटो अपलोड करा — टायगरट्रेस तपासते की फोटोमध्ये प्राणी आहे, वाघ आहे याची खात्री करते, त्याची पट्टी-रचना वाचते, आणि नोंदणीकृत वाघाशी जुळवते. एक फोटो, एक उत्तर.",
    unified_upload_title: "फोटो अपलोड करा",
    unified_upload_desc: "कॅमेरा ट्रॅपचा फोटो येथे ओढा, किंवा ब्राउझ करण्यासाठी क्लिक करा.",
    unified_upload_hint: "JPG · PNG · WebP",
    unified_confirm_button: "फोटो तपासा",
    unified_analyzing: "तपासणी सुरू आहे…",
    unified_step_blank: "प्राणी तपासणे",
    unified_step_species: "वाघ आहे याची खात्री",
    unified_step_reid: "पट्टी-रचना वाचणे",
    unified_step_result: "अंतिम उत्तर",
    unified_step_blank_desc: "रिकाम्या फोटो त्वरित काढल्या जातात",
    unified_step_species_desc: "सापडलेल्या प्राण्यावर प्रजाति-वर्गीकरण चालते",
    unified_step_reid_desc: "२५६-बिंदूंची पट्टी-फिंगरप्रिंट सर्व नोंदणीकृत वाघांशी जुळवली जाते",
    unified_step_result_desc: "वाघाची ओळख आणि खात्री",
    unified_outcome_matched: "वाघाची ओळख झाली",
    unified_outcome_review: "रेंजरची खात्री हवी",
    unified_outcome_new_tiger: "संभाव्य नवा वाघ!",
    unified_outcome_blank: "या फोटोमध्ये प्राणी नाही",
    unified_outcome_not_a_tiger: "वाघ नाही",
    unified_result_confidence: "जुळवणीची खात्री",
    unified_result_go_to_review: "पुनरावलोकन रांग उघडा",
    unified_analyze_another: "दुसरा फोटो तपासा",
    unified_registered_tigers: "नोंदणीकृत वाघ",
    unified_review_queue: "रेंजर-खात्रीची वाट पाहणारे फोटो",
    unified_view_all: "सर्व पहा",
    unified_hide: "लपवा",
    unified_captures_label: "कॅप्चर",
    unified_last_seen: "शेवटचे दिसले",
    unified_top_match: "सर्वोत्तम जुळणी",
    unified_alt_match: "दुसरी सर्वोत्तम",
    folder_pick: "संपूर्ण फोल्डर अपलोड करा",
    folder_pick_desc: "कॅमेरा ट्रॅप फोटोंचा फोल्डर निवडा — प्रत्येक फोटो आपोआप तपासली, चाळली आणि ओळखली जाते.",
    folder_selected: "फोटो निवडल्या",
    folder_process_btn: "फोटो प्रोसेस करा",
    folder_processing: "फोटो प्रोसेस होत आहेत…",
    folder_done: "फोल्डर प्रोसेस पूर्ण",
    folder_cancel: "रद्द करा",
    folder_auto_station: "कॅमेरा स्थानक आणि वेळ PTR फोटो फाइल-नावांमधून आपोआप वाचले जातात",
    folder_pick_station: "किंवा सर्व फोटो एका स्थानकाला द्या:",
    folder_errors: "अयशस्वी",
    folder_another: "दुसरा फोल्डर प्रोसेस करा",
    folder_photos_word: "फोटो",

    select_language: "भाषा",
    zone_core: "गाभा (Core) झोन",
    zone_buffer: "बफर झोन",
    zone_interface: "गाव सीमा भाग",
  },
};
