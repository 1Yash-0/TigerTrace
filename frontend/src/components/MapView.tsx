"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import { PatrolStation, TigerPath } from "@/lib/api";
import { tigerColor } from "@/lib/tigerColor";

interface MapViewProps {
  paths?: TigerPath[];
  patrolStations?: PatrolStation[];
  showPaths?: boolean;
  showPatrol?: boolean;
  showHeatmap?: boolean;
  selectedTigerIds?: string[];
  focusedTigerId?: string | null;
  onSelectTiger?: (tigerId: string) => void;
  onSelectStation?: (station: PatrolStation | null) => void;
  labels?: {
    sqKm: string;
    priority: string;
    village: string;
    zone: string;
    confidence: string;
    captures: string;
    tigers: string;
    date: string;
    station: string;
  };
}

const DEFAULT_LABELS = {
  sqKm: "sq km",
  priority: "PRIORITY",
  village: "VILLAGE INTERFACE",
  zone: "Zone:",
  confidence: "Confidence:",
  captures: "Captures:",
  tigers: "Tigers:",
  date: "Date",
  station: "Station",
};

function fmtDate(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts.slice(0, 10) : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Bearing (degrees clockwise from north) from point a to point b. */
function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δλ = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** L.divIcon arrow rotated to point along the segment direction. */
function arrowIcon(deg: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<svg width="14" height="14" viewBox="0 0 14 14" style="transform:rotate(${deg}deg);filter:drop-shadow(0 0 1.5px rgba(0,0,0,0.65));">
      <path d="M7 1 L11.5 12 L7 9.6 L2.5 12 Z" fill="${color}" stroke="rgba(255,255,255,0.85)" stroke-width="0.7"/>
    </svg>`,
  });
}

export default function MapView({
  paths = [],
  patrolStations = [],
  showPaths = true,
  showPatrol = true,
  showHeatmap = false,
  selectedTigerIds = [],
  focusedTigerId = null,
  onSelectTiger,
  onSelectStation,
  labels = DEFAULT_LABELS,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // last focused journey signature — "tiger:points" — so a re-windowed
  // journey (same tiger, different date range) re-triggers the camera fly
  const lastFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [21.70, 79.25],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const bounds: L.LatLng[] = [];
    const visible = paths.filter((p) => selectedTigerIds.includes(p.tiger_id));
    const focused = visible.find((p) => p.tiger_id === focusedTigerId) || null;

    // ── 1. Movement paths ─────────────────────────────────────────────
    if (showPaths) {
      paths.forEach((path) => {
        if (!selectedTigerIds.includes(path.tiger_id)) return;
        const pts = path.points.filter((p) => p.lat != null && p.lon != null);
        if (pts.length === 0) return;
        const color = tigerColor(path.tiger_id);
        const isFocused = path.tiger_id === focusedTigerId;
        const latlngs: L.LatLngExpression[] = pts.map((p) => [p.lat, p.lon]);

        // Path line — thicker + opaque when focused
        if (pts.length >= 2) {
          const line = L.polyline(latlngs, {
            color,
            weight: isFocused ? 5 : 2.5,
            opacity: isFocused ? 0.95 : 0.45,
            smoothFactor: 1.2,
          }).addTo(map);

          line.bindTooltip(
            `<strong>${path.name}</strong> (${path.tiger_id})<br/>${pts.length} ${labels.captures.toLowerCase()} · ${fmtDate(pts[0].timestamp)} → ${fmtDate(pts[pts.length - 1].timestamp)}`,
            { sticky: true }
          );
          if (onSelectTiger) {
            line.on("click", () => onSelectTiger(path.tiger_id));
          }

          // Direction arrows only on the focused tiger's path — one per
          // segment, rotated to the direction of travel.
          if (isFocused) {
            for (let i = 1; i < pts.length; i++) {
              const deg = bearing(pts[i - 1], pts[i]);
              const midLat = (pts[i - 1].lat + pts[i].lat) / 2;
              const midLon = (pts[i - 1].lon + pts[i].lon) / 2;
              L.marker([midLat, midLon], {
                icon: arrowIcon(deg, color),
                interactive: false,
                keyboard: false,
              }).addTo(map);
            }
          }
        }

        // Waypoints — decluttered: non-focused tigers show only first/last
        // stop; the focused tiger gets every ordered stop (start ring →
        // numbered middle stops → solid end dot).
        const stops = isFocused ? pts : [pts[0], pts[pts.length - 1]];
        stops.forEach((p) => {
          const i = pts.indexOf(p);
          const isStart = i === 0;
          const isEnd = i === pts.length - 1;
          const marker = L.circleMarker([p.lat, p.lon], {
            radius: isFocused ? (isStart || isEnd ? 8 : 5) : isStart || isEnd ? 7 : 4,
            fillColor: isEnd ? color : isStart ? "#ffffff" : color,
            color,
            weight: 2,
            fillOpacity: isStart ? 0.95 : 0.85,
          }).addTo(map);

          marker.bindPopup(
            `<div style="font-family:Inter,sans-serif;font-size:12.5px;min-width:180px;color:#1c1712;">
              <strong style="font-size:14px;">${path.name}</strong> <span style="color:#64748b;">(${path.tiger_id})</span>
              <div style="margin-top:4px;">
                <b>${labels.date}:</b> ${fmtDate(p.timestamp)}<br/>
                <b>${labels.station}:</b> ${p.station_id}
                ${p.confidence != null ? `<br/><b>${labels.confidence}</b> ${Math.round(p.confidence * 100)}%` : ""}
                ${isStart ? '<div style="margin-top:3px;font-size:10.5px;color:#10b981;font-weight:700;">► FIRST SEEN</div>' : ""}
                ${isEnd && pts.length > 1 ? '<div style="margin-top:3px;font-size:10.5px;font-weight:700;">● LAST SEEN</div>' : ""}
              </div>
            </div>`
          );

          if (onSelectTiger) {
            marker.on("click", () => onSelectTiger(path.tiger_id));
          }
        });

        // Bounds: full detail for the focused tiger, endpoints otherwise
        const boundsPts = isFocused ? pts : [pts[0], pts[pts.length - 1]];
        boundsPts.forEach((p) => bounds.push(L.latLng(p.lat, p.lon)));
      });
    }

    // ── 2. Heatmap — final location of every selected tiger ────────────
    // One heat point per tiger at its LAST capture position: bright cells
    // reveal where the population concentrates at the end of the day.
    if (showHeatmap && visible.length > 0) {
      const heatData: [number, number, number][] = visible
        .map((p) => p.points.filter((q) => q.lat != null && q.lon != null))
        .filter((q) => q.length > 0)
        .map((q) => [q[q.length - 1].lat, q[q.length - 1].lon, 1]);
      if (heatData.length > 0) {
        const heat = (L as any).heatLayer(heatData, {
          radius: 28,
          blur: 20,
          maxZoom: 12,
          minOpacity: 0.45,
          gradient: {
            0.2: "#08c8ff",
            0.45: "#31d35c",
            0.65: "#f7e04b",
            0.85: "#ff9c33",
            1.0: "#ff2d2d",
          },
        });
        heat.addTo(map);
        visible.forEach((p) => {
          const q = p.points.filter((x) => x.lat != null && x.lon != null);
          if (q.length === 0) return;
          const last = q[q.length - 1];
          bounds.push(L.latLng(last.lat, last.lon));
        });
      }
    }

    // ── 3. Patrol Priority Stations Layer ──────────────────────────────
    if (showPatrol && patrolStations.length > 0) {
      patrolStations.forEach((st) => {
        const pScore = st.priority_score;
        const color = st.badge_color || (pScore >= 75 ? "#ef4444" : pScore >= 50 ? "#f97316" : pScore >= 25 ? "#eab308" : "#10b981");
        const radius = pScore >= 75 ? 12 : pScore >= 50 ? 10 : 8;

        const marker = L.circleMarker([st.latitude, st.longitude], {
          radius,
          fillColor: color,
          color: "#ffffff",
          weight: 2.5,
          fillOpacity: 0.95,
        }).addTo(map);

        const villageTag = st.is_village_adjacent
          ? `<span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700;">${labels.village}</span>`
          : "";

        const tigerList = st.contributing_tigers.slice(0, 3).map(t => `${t.name} (${t.captures_at_station}c)`).join(", ");

        const popupContent = `
          <div style="font-family:Inter,sans-serif;font-size:12.5px;min-width:210px;color:#1c1712;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <strong style="font-size:16px;">${st.station_id}</strong>
              <span style="font-size:14px;font-weight:800;color:${color};">${pScore}/100</span>
            </div>
            <div>${st.badge_icon} <strong>${st.priority_level} ${labels.priority}</strong> ${villageTag}</div>
            <hr style="margin:6px 0;border:0;border-top:1px solid #e2e8f0;"/>
            <div style="font-size:11.5px;color:#64748b;margin-bottom:4px;">
              <b>${labels.zone}</b> ${st.zone.toUpperCase()} • <b>${labels.confidence}</b> ${st.evidence_confidence}%<br/>
              <b>${labels.captures}</b> ${st.total_captures} (${st.unique_tigers_count} ${labels.tigers.toLowerCase()})
            </div>
            ${tigerList ? `<div style="font-size:11px;color:#334155;margin-bottom:6px;"><b>${labels.tigers}</b> ${tigerList}</div>` : ""}
            <div style="font-size:11px;font-style:italic;color:#475569;background:#f8fafc;padding:5px 8px;border-radius:6px;">
              ${st.top_reasons[0] || 'Routine territory survey'}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        if (onSelectStation) {
          marker.on("click", () => onSelectStation(st));
        }

        if (!showHeatmap) bounds.push(L.latLng(st.latitude, st.longitude));
      });
    }

    // ── Camera: fit to what's on screen ────────────────────────────────
    if (focused) {
      // Focused tiger: the camera ignores everything else on screen and
      // glides tightly onto just this journey. Re-fly when the focus
      // signature changed — different tiger, or the same tiger with a
      // different number of points (date window moved).
      const fb = focused.points.filter((p) => p.lat != null && p.lon != null);
      const focusSignature = `${focused.tiger_id}:${fb.length}`;
      const wantFly = focusSignature !== lastFocusRef.current;
      if (fb.length > 0 && wantFly) {
        const b = L.latLngBounds(fb.map((p) => L.latLng(p.lat, p.lon)));
        map.flyToBounds(b, { padding: [70, 70], maxZoom: 15, duration: 1.2 });
      }
      if (fb.length > 0) lastFocusRef.current = focusSignature;
    } else if (bounds.length > 0) {
      const b = L.latLngBounds(bounds);
      if (lastFocusRef.current !== null) {
        // Coming back from a focused view — animate out to the full scene
        map.flyToBounds(b, { padding: [30, 30], duration: 1.2 });
        lastFocusRef.current = null;
      } else {
        map.fitBounds(b, { padding: [30, 30] });
      }
    }
  }, [paths, patrolStations, showPaths, showPatrol, showHeatmap, selectedTigerIds, focusedTigerId, onSelectTiger, onSelectStation, labels]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 520, borderRadius: "16px" }}
    />
  );
}
