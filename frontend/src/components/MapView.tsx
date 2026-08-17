"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { PatrolStation } from "@/lib/api";

interface HomeRange {
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
}

const TIGER_COLORS: Record<string, string> = {
  "PTR-T01": "#f97316",
  "PTR-T02": "#3b82f6",
  "PTR-T03": "#10b981",
  "PTR-T04": "#8b5cf6",
  "PTR-T05": "#ef4444",
  "PTR-T06": "#f59e0b",
};

function getColor(tigerId: string): string {
  return TIGER_COLORS[tigerId] || "#94a3b8";
}

interface MapViewProps {
  ranges?: HomeRange[];
  patrolStations?: PatrolStation[];
  showRanges?: boolean;
  showPatrol?: boolean;
  onSelect?: (range: HomeRange | null) => void;
  onSelectStation?: (station: PatrolStation | null) => void;
}

export default function MapView({
  ranges = [],
  patrolStations = [],
  showRanges = true,
  showPatrol = true,
  onSelect,
  onSelectStation,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [21.80, 79.45],
      zoom: 11,
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

    // ── 1. Render Tiger Home Ranges ──────────────────────────────────────────
    if (showRanges && ranges.length > 0) {
      ranges.forEach((range) => {
        const color = getColor(range.tiger_id);

        if (range.polygon && range.polygon.length >= 3) {
          const latLngs: L.LatLngExpression[] = range.polygon.map(
            (p) => [p[0], p[1]] as L.LatLngExpression
          );

          const polygon = L.polygon(latLngs, {
            color: color,
            fillColor: color,
            fillOpacity: 0.12,
            weight: 2,
            opacity: 0.7,
            dashArray: "4, 4",
          }).addTo(map);

          if (onSelect) {
            polygon.on("click", () => onSelect(range));
          }

          polygon.bindTooltip(
            `<strong>${range.name}</strong> (${range.tiger_id})<br/>${range.area_sq_km} sq km (MCP)`,
            { sticky: true }
          );

          latLngs.forEach((ll) => {
            bounds.push(L.latLng(ll as [number, number]));
          });
        }

        // Draw centroid marker
        if (range.centroid) {
          const marker = L.circleMarker(
            [range.centroid[0], range.centroid[1]],
            {
              radius: 6,
              fillColor: color,
              color: "#fff",
              weight: 2,
              fillOpacity: 0.9,
            }
          ).addTo(map);

          if (onSelect) {
            marker.on("click", () => onSelect(range));
          }

          bounds.push(L.latLng(range.centroid[0], range.centroid[1]));
        }
      });
    }

    // ── 2. Render Patrol Priority Stations Layer ─────────────────────────────
    if (showPatrol && patrolStations.length > 0) {
      patrolStations.forEach((st) => {
        const pScore = st.priority_score;
        const color = st.badge_color || (pScore >= 75 ? "#ef4444" : pScore >= 50 ? "#f97316" : pScore >= 25 ? "#eab308" : "#10b981");
        const radius = pScore >= 75 ? 12 : pScore >= 50 ? 10 : 8;

        const marker = L.circleMarker([st.latitude, st.longitude], {
          radius: radius,
          fillColor: color,
          color: "#ffffff",
          weight: 2.5,
          fillOpacity: 0.95,
        }).addTo(map);

        // Rich Interactive Popup
        const villageTag = st.is_village_adjacent
          ? `<span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700;">VILLAGE INTERFACE</span>`
          : "";

        const tigerList = st.contributing_tigers.slice(0, 3).map(t => `${t.name} (${t.captures_at_station}c)`).join(", ");

        const popupContent = `
          <div style="font-family:Inter,sans-serif;font-size:12.5px;min-width:210px;color:#1c1712;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <strong style="font-size:16px;">${st.station_id}</strong>
              <span style="font-size:14px;font-weight:800;color:${color};">${pScore}/100</span>
            </div>
            <div>${st.badge_icon} <strong>${st.priority_level} PRIORITY</strong> ${villageTag}</div>
            <hr style="margin:6px 0;border:0;border-top:1px solid #e2e8f0;"/>
            <div style="font-size:11.5px;color:#64748b;margin-bottom:4px;">
              <b>Zone:</b> ${st.zone.toUpperCase()} • <b>Confidence:</b> ${st.evidence_confidence}%<br/>
              <b>Captures:</b> ${st.total_captures} (${st.unique_tigers_count} tigers)
            </div>
            ${tigerList ? `<div style="font-size:11px;color:#334155;margin-bottom:6px;"><b>Tigers:</b> ${tigerList}</div>` : ""}
            <div style="font-size:11px;font-style:italic;color:#475569;background:#f8fafc;padding:5px 8px;border-radius:6px;">
              ${st.top_reasons[0] || 'Routine territory survey'}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        if (onSelectStation) {
          marker.on("click", () => onSelectStation(st));
        }

        bounds.push(L.latLng(st.latitude, st.longitude));
      });
    }

    // Fit map bounds
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
    }
  }, [ranges, patrolStations, showRanges, showPatrol, onSelect, onSelectStation]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 520, borderRadius: "16px" }}
    />
  );
}
