"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import LewaNav from "@/components/LewaNav";
import {
  getHomeRanges,
  getOverlaps,
  getPatrolStations,
  getExportGeospatialUrl,
  getExportPatrolUrl,
  PatrolStation,
} from "@/lib/api";
import {
  Download,
  Layers,
  ShieldAlert,
  MapPin,
  ChevronRight,
  Info,
} from "lucide-react";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "calc(100vh - 90px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--lewa-cream)",
        color: "var(--lewa-muted)",
        gap: 16,
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "3px solid var(--lewa-border)",
          borderTopColor: "var(--lewa-terracotta)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "18px" }}>
        Loading territory & patrol coordinates…
      </p>
    </div>
  ),
});

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

interface Overlap {
  tiger_a: string;
  tiger_b: string;
  overlap_area_sq_km: number;
}

const TIGER_CLASSIFICATIONS: Array<{ id: string; name: string; color: string }> = [
  { id: "PTR-T01", name: "Choti Tara", color: "#F97316" },
  { id: "PTR-T02", name: "Baagh Raja", color: "#3B82F6" },
  { id: "PTR-T03", name: "Kanha", color: "#10B981" },
  { id: "PTR-T04", name: "Sundari", color: "#A855F7" },
  { id: "PTR-T05", name: "Shiv", color: "#F59E0B" },
  { id: "PTR-T06", name: "Pari", color: "#EF4444" },
];

export default function MapPage() {
  const [ranges, setRanges] = useState<HomeRange[]>([]);
  const [overlaps, setOverlaps] = useState<Overlap[]>([]);
  const [patrolStations, setPatrolStations] = useState<PatrolStation[]>([]);
  const [showRanges, setShowRanges] = useState(true);
  const [showPatrol, setShowPatrol] = useState(true);
  const [patrolFilter, setPatrolFilter] = useState<"all" | "CRITICAL" | "HIGH" | "village">("all");

  const [selectedTigerIds, setSelectedTigerIds] = useState<string[]>([
    "PTR-T01",
    "PTR-T02",
    "PTR-T03",
    "PTR-T04",
    "PTR-T05",
    "PTR-T06",
  ]);

  const [selectedRange, setSelectedRange] = useState<HomeRange | null>(null);
  const [selectedStation, setSelectedStation] = useState<PatrolStation | null>(null);

  useEffect(() => {
    Promise.all([getHomeRanges(), getOverlaps(), getPatrolStations()])
      .then(([r, o, p]) => {
        setRanges(r);
        setOverlaps(o);
        setPatrolStations(p);
      })
      .catch(console.error);
  }, []);

  const toggleTiger = (id: string) => {
    if (selectedTigerIds.includes(id)) {
      if (selectedTigerIds.length === 1) return;
      setSelectedTigerIds(selectedTigerIds.filter((tId) => tId !== id));
    } else {
      setSelectedTigerIds([...selectedTigerIds, id]);
    }
  };

  const displayedRanges = ranges.filter((r) => selectedTigerIds.includes(r.tiger_id));

  const displayedPatrolStations = patrolStations.filter((s) => {
    if (patrolFilter === "all") return true;
    if (patrolFilter === "CRITICAL" || patrolFilter === "HIGH") {
      return s.priority_level === patrolFilter;
    }
    if (patrolFilter === "village") return s.is_village_adjacent;
    return true;
  });

  return (
    <>
      <LewaNav />

      <main
        style={{
          position: "relative",
          width: "100%",
          height: "calc(100vh - 90px)",
          marginTop: "90px",
          background: "var(--lewa-cream)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            background: "linear-gradient(135deg, #1C1712 0%, #2A231C 100%)",
            color: "#EFEAE1",
            padding: "12px 24px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            borderBottom: "1px solid rgba(239, 234, 225, 0.12)",
            zIndex: 30,
          }}
        >
          {/* Layer Toggles & Tiger Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
            {/* Layer Switches */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setShowPatrol(!showPatrol)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  background: showPatrol ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${showPatrol ? "#ef4444" : "rgba(255, 255, 255, 0.15)"}`,
                  color: showPatrol ? "#ffffff" : "#A3998E",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <ShieldAlert size={13} color={showPatrol ? "#ef4444" : "#A3998E"} />
                PATROL PRIORITIES
              </button>

              <button
                onClick={() => setShowRanges(!showRanges)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  background: showRanges ? "rgba(249, 115, 22, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${showRanges ? "#f97316" : "rgba(255, 255, 255, 0.15)"}`,
                  color: showRanges ? "#ffffff" : "#A3998E",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Layers size={13} color={showRanges ? "#f97316" : "#A3998E"} />
                TIGER HOME RANGES
              </button>
            </div>

            {/* If Patrol layer active, show patrol filter pills */}
            {showPatrol && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "10px", color: "var(--lewa-amber)", fontWeight: 700 }}>STATIONS:</span>
                {(["all", "CRITICAL", "HIGH", "village"] as const).map((pf) => (
                  <button
                    key={pf}
                    onClick={() => setPatrolFilter(pf)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: "14px",
                      background: patrolFilter === pf ? "rgba(255, 255, 255, 0.2)" : "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: patrolFilter === pf ? "#ffffff" : "#A3998E",
                      fontSize: "10.5px",
                      cursor: "pointer",
                    }}
                  >
                    {pf === "all" ? "All" : pf === "CRITICAL" ? "Critical" : pf === "HIGH" ? "High" : "Village Interface"}
                  </button>
                ))}
              </div>
            )}

            {/* Tiger Pills if Home Ranges active */}
            {showRanges && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                {TIGER_CLASSIFICATIONS.map((t) => {
                  const isSelected = selectedTigerIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTiger(t.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "3px 10px",
                        borderRadius: "14px",
                        background: isSelected ? "rgba(255, 255, 255, 0.1)" : "transparent",
                        border: `1px solid ${isSelected ? t.color : "rgba(255, 255, 255, 0.1)"}`,
                        color: isSelected ? "#FFFFFF" : "#7A7067",
                        fontSize: "10.5px",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.color }} />
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Direct Link to Patrol Dashboard */}
          <div style={{ display: "flex", gap: "10px" }}>
            <Link
              href="/patrol"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "20px",
                background: "var(--lewa-terracotta)",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <ShieldAlert size={13} />
              PATROL BOARD
            </Link>
          </div>
        </div>

        {/* Map View Frame */}
        <div style={{ position: "relative", flex: 1, width: "100%" }}>
          <MapView
            ranges={displayedRanges}
            patrolStations={displayedPatrolStations}
            showRanges={showRanges}
            showPatrol={showPatrol}
            onSelect={(range) => {
              setSelectedRange(range);
              setSelectedStation(null);
            }}
            onSelectStation={(station) => {
              setSelectedStation(station);
              setSelectedRange(null);
            }}
          />

          {/* Floating Selected Station Inspector Panel */}
          {selectedStation && (
            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                width: "340px",
                background: "#ffffff",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                zIndex: 1000,
                border: "1px solid var(--lewa-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--lewa-charcoal)", margin: 0 }}>
                    {selectedStation.station_id}
                  </h3>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "100px",
                      background: selectedStation.badge_bg,
                      color: selectedStation.badge_color,
                      fontSize: "10.5px",
                      fontWeight: 700,
                    }}
                  >
                    {selectedStation.badge_icon} {selectedStation.priority_level}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStation(null)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--lewa-muted)" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800, color: selectedStation.badge_color }}>
                  {selectedStation.priority_score}
                  <span style={{ fontSize: "13px", color: "var(--lewa-muted)", fontWeight: 500 }}>/100</span>
                </span>
                <span style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>
                  Evidence Confidence: <strong>{selectedStation.evidence_confidence}%</strong>
                </span>
              </div>

              <p style={{ fontSize: "12px", color: "var(--lewa-body)", lineHeight: 1.4, margin: "0 0 10px" }}>
                {selectedStation.top_reasons[0] || selectedStation.why_explanation}
              </p>

              <div style={{ fontSize: "11px", color: "var(--lewa-muted)", background: "var(--lewa-paper)", padding: "8px 10px", borderRadius: "8px", marginBottom: "12px" }}>
                Zone: <strong>{selectedStation.zone.toUpperCase()}</strong> • Captures: <strong>{selectedStation.total_captures}</strong> • Tigers: <strong>{selectedStation.unique_tigers_count}</strong>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <Link
                  href="/patrol"
                  className="btn-brush"
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 12px",
                    fontSize: "11px",
                    textDecoration: "none",
                  }}
                >
                  Full Patrol Breakdown ↗
                </Link>
                <Link
                  href="/chat"
                  className="btn-pill-light"
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    textDecoration: "none",
                  }}
                >
                  Ask AI
                </Link>
              </div>
            </div>
          )}

          {/* Floating Selected Tiger Range Panel */}
          {selectedRange && (
            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                width: "320px",
                background: "#ffffff",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                zIndex: 1000,
                border: "1px solid var(--lewa-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--lewa-charcoal)", margin: 0 }}>
                  {selectedRange.name}
                </h3>
                <button
                  onClick={() => setSelectedRange(null)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--lewa-muted)" }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: "12px", color: "var(--lewa-muted)", margin: "0 0 10px" }}>
                <code>{selectedRange.tiger_id}</code> • {selectedRange.sex}
              </p>

              <div style={{ fontSize: "12px", color: "var(--lewa-body)", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                <div>Territory Area: <strong>{selectedRange.area_sq_km} sq km</strong> (MCP)</div>
                <div>Total Captures: <strong>{selectedRange.total_captures}</strong></div>
                <div>Stations Visited: <strong>{selectedRange.stations_visited.length}</strong></div>
              </div>

              <Link
                href="/chat"
                className="btn-brush"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "6px 12px",
                  fontSize: "11px",
                  textDecoration: "none",
                }}
              >
                Ask AI About {selectedRange.name} ↗
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
