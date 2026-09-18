// Deterministic color for any tiger ID (works for 6 synthetic or 62 real tigers).
// Real PTR IDs (T103...) and legacy IDs (PTR-T01...) hash to a stable, distinct hue.
const PALETTE = [
  "#F97316", "#3B82F6", "#10B981", "#A855F7", "#F59E0B", "#EF4444",
  "#14B8A6", "#EC4899", "#8B5CF6", "#06B6D4", "#84CC16", "#F43F5E",
  "#E97316", "#22C55E", "#6366F1", "#D946EF", "#0EA5E9", "#CA8A04",
];

export function tigerColor(tigerId: string): string {
  let hash = 0;
  for (let i = 0; i < tigerId.length; i++) {
    hash = (hash * 31 + tigerId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
