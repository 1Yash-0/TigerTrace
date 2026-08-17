export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
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

// Identification
export async function identifyTiger(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/identify`, {
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

export async function uploadVideo(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload-video`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Video upload error: ${res.statusText}`);
  return res.json();
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

export async function sendChatMessage(message: string): Promise<ChatResponseData> {
  return fetchAPI<ChatResponseData>("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
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



