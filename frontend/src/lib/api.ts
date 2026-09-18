// Backend base URL resolution:
// 1. localStorage override (set from the app's Server Settings screen — lets the
//    Android APK point at the deployed machine even if its LAN IP changes)
// 2. NEXT_PUBLIC_API_URL build-time override
// 3. http://localhost:8000 default (dev on the same machine)
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem("tigertrace_server_url");
      if (saved && saved.trim()) return saved.trim().replace(/\/+$/, "");
    } catch { /* storage unavailable */ }
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

export function setApiBase(url: string): void {
  if (typeof window === "undefined") return;
  const clean = url.trim().replace(/\/+$/, "");
  if (clean) window.localStorage.setItem("tigertrace_server_url", clean);
  else window.localStorage.removeItem("tigertrace_server_url");
}

export const API_BASE = getApiBase();

export function getPublicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Dashboard
export async function getSummary() {
  return fetchAPI<{
    tigers_identified: number;
    total_captures: number;
    open_alerts: number;
    pending_review: number;
    blanks_filtered: number;
    saved_mb: number;
    saved_minutes: number;
    registered_stations?: number;
    data_source?: string;
    capture_start?: string | null;
    capture_end?: string | null;
  }>("/api/summary");
}

// Triage
export async function runTriage() {
  return fetchAPI<{
    total_images: number;
    blanks_removed: number;
    retained: number;
    saved_mb: number;
    saved_minutes: number;
    log: Array<{ file: string; status: string; confidence: number }>;
    alert_summary?: unknown;
  }>("/api/triage/run", { method: "POST" });
}

export async function getTriageHistory() {
  return fetchAPI<
    Array<{
      id: number;
      run_at: string;
      total_images: number;
      blanks_removed: number;
      retained: number;
      saved_mb: number;
      saved_minutes: number;
    }>
  >("/api/triage/history");
}

// SD-Card Ingestion
export interface PendingCard {
  mount: string;
  label: string;
  fs_type: string;
  image_count: number;
  video_count: number;
  total_mb: number;
  detected_at: string;
}

export interface IngestJobProgress {
  job_id: string;
  station_id: string;
  mount: string;
  started_at: string;
  finished_at: string | null;
  stage: "copying" | "triaging" | "done" | "error";
  total_files: number;
  copied_files: number;
  skipped_files: number;
  blank_files: number;
  retained_files: number;
  saved_mb: number;
  error: string | null;
}

export interface IngestBatchRecord {
  id: number;
  job_id: string;
  station_id: string;
  started_at: string;
  total_files: number;
  copied_files: number;
  skipped_duplicates: number;
  blanks: number;
  retained: number;
  saved_mb: number;
}

export interface IngestStatus {
  pending_cards: PendingCard[];
  active_job: IngestJobProgress | null;
  recent_batches: IngestBatchRecord[];
}

export interface CameraStationInfo {
  station_id: string;
  grid_id: number;
  block: string;
  beat: string;
  range: string;
  latitude: number;
  longitude: number;
  zone?: string;
}

export async function getCameraStations(): Promise<CameraStationInfo[]> {
  return fetchAPI<CameraStationInfo[]>("/api/stations");
}

export async function getIngestStatus(): Promise<IngestStatus> {
  return fetchAPI<IngestStatus>("/api/ingest/status");
}

export async function getIngestStations(): Promise<{ stations: string[] }> {
  return fetchAPI<{ stations: string[] }>("/api/ingest/stations");
}

export async function startIngest(mount: string, stationId: string): Promise<IngestJobProgress> {
  const params = new URLSearchParams({ mount, station_id: stationId });
  return fetchAPI<IngestJobProgress>(`/api/ingest/start?${params}`, { method: "POST" });
}

// Identification
export async function identifyTiger(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const base = getApiBase();
  const res = await fetch(`${base}/api/identify`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Unified demo pipeline — one upload, all four stages in one response
export interface PipelineStages {
  blank_filter?: { has_animal: boolean; confidence: number };
  species_gate?: { tiger_probability: number; is_tiger: boolean };
  stripe_reid?: {
    embedding_dim: number;
    top_similarity: number;
    margin?: number;
    flank_side?: string;
    flank_code?: string;
    flank_confidence?: number;
  };
  classification?: { category: string; tiger_id: string | null; confidence: number };
}

export interface PipelineResult {
  filename: string;
  image_url: string;
  stages: PipelineStages;
  final: {
    outcome: "matched" | "review" | "new_tiger" | "blank" | "not_a_tiger";
    tiger_id: string | null;
    name: string | null;
    sex: string | null;
    confidence: number | null;
    review_item_id: number | null;
    all_scores: Array<{ tiger_id: string; confidence: number }>;
    station_id?: string;
    capture_time?: string | null;
  };
}

export async function analyzePipeline(file: File, stationId = "ST-01"): Promise<PipelineResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("station_id", stationId);
  const base = getApiBase();
  const res = await fetch(`${base}/api/pipeline/analyze`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function listTigers() {
  return fetchAPI<
    Array<{
      tiger_id: string;
      name: string;
      sex: string;
      total_captures: number;
      last_seen: string | null;
      last_station: string | null;
    }>
  >("/api/tigers");
}

export async function getTiger(tigerId: string) {
  return fetchAPI<{
    tiger_id: string;
    name: string;
    sex: string;
    total_captures: number;
    captures: Array<{
      station_id: string;
      timestamp: string;
      zone: string;
      image: string;
      image_url?: string | null;
      source_dataset?: string | null;
      source_filename?: string | null;
      lat: number;
      lon: number;
      confidence: number;
    }>;
  }>(`/api/tigers/${tigerId}`);
}

export async function getReviewQueue() {
  return fetchAPI<
    Array<{
      id: number;
      image_path: string;
      image_url?: string | null;
      station_id: string;
      timestamp: string;
      top_match_id: string;
      top_match_confidence: number;
      alt_match_id: string;
      alt_match_confidence: number;
    }>
  >("/api/review-queue");
}

export async function resolveReview(itemId: number, action: string, tigerId?: string) {
  const params = new URLSearchParams({ action });
  if (tigerId) params.append("tiger_id", tigerId);
  return fetchAPI(`/api/review-queue/${itemId}/resolve?${params}`, { method: "POST" });
}

// Geospatial
export async function getHomeRanges() {
  return fetchAPI<
    Array<{
      tiger_id: string;
      name: string;
      sex: string;
      total_captures: number;
      centroid: [number, number];
      polygon: Array<[number, number]>;
      area_sq_km: number;
      area_method: string;
      stations_visited: string[];
      zone_breakdown: Record<string, number>;
      last_seen: string;
    }>
  >("/api/geospatial/home-ranges");
}

export async function getOverlaps() {
  return fetchAPI<
    Array<{
      tiger_a: string;
      tiger_b: string;
      overlap_area_sq_km: number;
    }>
  >("/api/geospatial/overlaps");
}

// Movement paths — time-ordered capture waypoints per tiger
export interface PathPoint {
  lat: number;
  lon: number;
  timestamp: string | null;
  station_id: string;
  confidence: number;
}

export interface TigerPath {
  tiger_id: string;
  name: string;
  sex: string | null;
  points: PathPoint[];
}

export async function getMovementPaths(): Promise<TigerPath[]> {
  return fetchAPI<TigerPath[]>("/api/geospatial/paths");
}

// Alerts
export async function getAlerts() {
  return fetchAPI<
    Array<{
      id: number;
      tiger_id: string;
      alert_type: string;
      severity: string;
      message: string;
      evidence: Record<string, unknown>;
      confidence: number;
      created_at: string;
      resolved: boolean;
    }>
  >("/api/alerts");
}

export async function resolveAlert(alertId: number) {
  return fetchAPI(`/api/alerts/${alertId}/resolve`, { method: "POST" });
}

export async function runAlertEngine() {
  return fetchAPI("/api/alerts/run", { method: "POST" });
}

export function getExportAlertsUrl() {
  return `${API_BASE}/api/export/alerts`;
}

export function getExportGeospatialUrl() {
  return `${API_BASE}/api/export/geospatial`;
}

// Chatbot
export interface ChatActionLink {
  label: string;
  route: string;
  icon?: string;
}

export interface ChatResponseData {
  success: boolean;
  intent: string;
  answer: string;
  entities: Record<string, any>;
  data?: any;
  actions: ChatActionLink[];
  mode: string;
}

export interface ChatHistoryMessage {
  id: number;
  message: string;
  intent: string;
  entities: Record<string, any>;
  response: string;
  mode: string;
  created_at: string;
}

export async function sendChatMessage(message: string, language = "en"): Promise<ChatResponseData> {
  return fetchAPI<ChatResponseData>("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, language }),
  });
}

export async function getChatHistory(limit = 50): Promise<ChatHistoryMessage[]> {
  return fetchAPI<ChatHistoryMessage[]>(`/api/chat/history?limit=${limit}`);
}

export async function clearChatHistory(): Promise<{ status: string }> {
  return fetchAPI<{ status: string }>("/api/chat/history", { method: "DELETE" });
}

// ══════════════════════════════════════════════════════════════════════════════
// Patrol Priority Engine
// ══════════════════════════════════════════════════════════════════════════════

export interface ContributingTiger {
  tiger_id: string;
  name: string;
  captures_at_station: number;
  last_sighting: string | null;
}

export interface PatrolComponentScore {
  score: number;
  weight?: number;
  contribution?: number;
  evidence: string[];
}

export interface CycleTrendItem {
  cycle: string;
  score: number;
}

export interface PatrolStation {
  station_id: string;
  priority_score: number;
  evidence_confidence: number;
  priority_level: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  badge_icon: string;
  badge_color: string;
  badge_bg: string;
  zone: string;
  is_village_adjacent: boolean;
  latitude: number;
  longitude: number;
  total_captures: number;
  unique_tigers_count: number;
  contributing_tigers: ContributingTiger[];
  components: {
    movement: PatrolComponentScore;
    conflict: PatrolComponentScore;
    anomaly: PatrolComponentScore;
    confidence: PatrolComponentScore;
  };
  top_reasons: string[];
  why_explanation: string;
  active_alerts_count: number;
  cycle_trend: CycleTrendItem[];
}

export interface PatrolSummaryData {
  summary_counts: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    total_stations: number;
  };
  top_priority_stations: PatrolStation[];
  suggested_patrol_sequence: PatrolSequenceItem[];
  configured_weights: {
    movement: number;
    conflict: number;
    anomaly: number;
  };
  thresholds: Record<string, number>;
}

export interface PatrolSequenceItem {
  order: number;
  station_id: string;
  priority_score: number;
  priority_level: string;
  badge_icon: string;
  zone: string;
  is_village_adjacent: boolean;
  latitude: number;
  longitude: number;
  tactical_objective: string;
}

export async function getPatrolStations(): Promise<PatrolStation[]> {
  return fetchAPI<PatrolStation[]>("/api/patrol/stations");
}

export async function getPatrolStationDetail(stationId: string): Promise<PatrolStation> {
  return fetchAPI<PatrolStation>(`/api/patrol/stations/${stationId}`);
}

export async function getPatrolSummary(): Promise<PatrolSummaryData> {
  return fetchAPI<PatrolSummaryData>("/api/patrol/summary");
}

export async function getPatrolSequence(limit = 6): Promise<PatrolSequenceItem[]> {
  return fetchAPI<PatrolSequenceItem[]>(`/api/patrol/sequence?limit=${limit}`);
}

export function getExportPatrolUrl(): string {
  return `${API_BASE}/api/export/patrol`;
}
