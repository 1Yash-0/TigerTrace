"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LewaNav from "@/components/LewaNav";
import {
  getPatrolSummary,
  getPatrolStations,
  getPatrolSequence,
  getExportPatrolUrl,
  PatrolStation,
  PatrolSummaryData,
  PatrolSequenceItem,
} from "@/lib/api";
import {
  ShieldAlert,
  Download,
  MapPin,
  MessageSquare,
  Activity,
  AlertTriangle,
  Radio,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Compass,
  CheckCircle2,
  Eye,
  Info,
  Layers,
} from "lucide-react";

export default function PatrolPriorityPage() {
  const [summary, setSummary] = useState<PatrolSummaryData | null>(null);
  const [stations, setStations] = useState<PatrolStation[]>([]);
  const [sequence, setSequence] = useState<PatrolSequenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<PatrolStation | null>(null);
  const [filter, setFilter] = useState<"all" | "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "village" | "buffer">("all");
  const [sortBy, setSortBy] = useState<"priority" | "confidence" | "movement" | "conflict" | "anomaly">("priority");

  useEffect(() => {
    Promise.all([getPatrolSummary(), getPatrolStations(), getPatrolSequence(6)])
      .then(([sumData, stData, seqData]) => {
        setSummary(sumData);
        setStations(stData);
        setSequence(seqData);
        if (stData.length > 0) {
          setSelectedStation(stData[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filtered & Sorted stations
  const filteredStations = stations
    .filter((s) => {
      if (filter === "all") return true;
      if (filter === "CRITICAL" || filter === "HIGH" || filter === "MODERATE" || filter === "LOW") {
        return s.priority_level === filter;
      }
      if (filter === "village") return s.is_village_adjacent;
      if (filter === "buffer") return s.zone === "buffer";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") return b.priority_score - a.priority_score;
      if (sortBy === "confidence") return b.evidence_confidence - a.evidence_confidence;
      if (sortBy === "movement") return b.components.movement.score - a.components.movement.score;
      if (sortBy === "conflict") return b.components.conflict.score - a.components.conflict.score;
      if (sortBy === "anomaly") return b.components.anomaly.score - a.components.anomaly.score;
      return 0;
    });

  const counts = summary?.summary_counts || {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    total_stations: stations.length,
  };

  return (
    <>
      <LewaNav />

      <main
        style={{
          marginTop: "85px",
          padding: "40px 5vw 80px",
          maxWidth: "1280px",
          marginRight: "auto",
          marginLeft: "auto",
          minHeight: "calc(100vh - 120px)",
        }}
      >
        {/* Header Title */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 14px",
              borderRadius: "100px",
              background: "rgba(184, 71, 40, 0.08)",
              border: "1px solid rgba(184, 71, 40, 0.2)",
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                display: "inline-block",
                boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "var(--lewa-terracotta)",
              }}
            >
              Field Patrol Intelligence & Deployment Prioritization
            </span>
          </div>

          <h1 className="lewa-title-section" style={{ fontSize: "clamp(32px, 4.5vw, 56px)" }}>
            Patrol <span className="font-italic">Priorities</span>
          </h1>

          <p
            style={{
              color: "var(--lewa-muted)",
              fontSize: "14.5px",
              maxWidth: "680px",
              margin: "8px auto 0",
            }}
          >
            Transparent, evidence-based prioritization scoring camera stations (0–100) using
            recent tiger movement intensity, community conflict proximity, and spatial anomaly alerts.
          </p>
        </div>

        {/* Executive Summary Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              background: "var(--lewa-ivory)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderLeft: "4px solid #ef4444",
              borderRadius: "14px",
              padding: "18px 20px",
            }}
          >
            <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>
              Critical Priority
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#ef4444" }}>{counts.critical}</span>
              <span style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>stations (≥75)</span>
            </div>
            <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>
              Immediate inspection recommended
            </p>
          </div>

          <div
            style={{
              background: "var(--lewa-ivory)",
              border: "1px solid rgba(249, 115, 22, 0.3)",
              borderLeft: "4px solid #f97316",
              borderRadius: "14px",
              padding: "18px 20px",
            }}
          >
            <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>
              High Priority
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#f97316" }}>{counts.high}</span>
              <span style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>stations (50–74)</span>
            </div>
            <p style={{ fontSize: "11px", color: "#f97316", marginTop: "4px" }}>
              Elevated movement corridor
            </p>
          </div>

          <div
            style={{
              background: "var(--lewa-ivory)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              borderLeft: "4px solid #eab308",
              borderRadius: "14px",
              padding: "18px 20px",
            }}
          >
            <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>
              Moderate Priority
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#eab308" }}>{counts.moderate}</span>
              <span style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>stations (25–49)</span>
            </div>
            <p style={{ fontSize: "11px", color: "#ca8a04", marginTop: "4px" }}>
              Periodic monitoring sweep
            </p>
          </div>

          <div
            style={{
              background: "var(--lewa-ivory)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderLeft: "4px solid #10b981",
              borderRadius: "14px",
              padding: "18px 20px",
            }}
          >
            <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>
              Low Priority
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#10b981" }}>{counts.low}</span>
              <span style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>stations (&lt;25)</span>
            </div>
            <p style={{ fontSize: "11px", color: "#059669", marginTop: "4px" }}>
              Standard baseline coverage
            </p>
          </div>
        </div>

        {/* Action Controls & Filters Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              onClick={() => setFilter("all")}
              className={filter === "all" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              All Stations ({stations.length})
            </button>
            <button
              onClick={() => setFilter("CRITICAL")}
              className={filter === "CRITICAL" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              🔴 Critical ({counts.critical})
            </button>
            <button
              onClick={() => setFilter("HIGH")}
              className={filter === "HIGH" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              🟠 High ({counts.high})
            </button>
            <button
              onClick={() => setFilter("MODERATE")}
              className={filter === "MODERATE" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              🟡 Moderate ({counts.moderate})
            </button>
            <button
              onClick={() => setFilter("village")}
              className={filter === "village" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              ⚠️ Village Adjacent
            </button>
            <button
              onClick={() => setFilter("buffer")}
              className={filter === "buffer" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              Buffer Zone
            </button>
          </div>

          {/* Action Links */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link
              href="/map"
              className="btn-pill-light"
              style={{ padding: "6px 14px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
            >
              <MapPin size={13} /> View On Territory Map
            </Link>

            <a
              href={getExportPatrolUrl()}
              target="_blank"
              className="btn-pill-light"
              style={{ padding: "6px 14px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
            >
              <Download size={13} /> Export Priorities CSV
            </a>
          </div>
        </div>

        {/* Main Split Layout: Station List & Detail Inspector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.25fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Left Column: Ranked Station List */}
          <div
            style={{
              background: "var(--lewa-ivory)",
              border: "1px solid var(--lewa-border)",
              borderRadius: "18px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxHeight: "780px",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-charcoal)" }}>
                Ranked Patrol Stations ({filteredStations.length})
              </p>
              <span style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>
                Click to inspect factor evidence
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--lewa-muted)" }}>
                Calculating station patrol scores...
              </div>
            ) : filteredStations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--lewa-muted)" }}>
                No stations match selected filter.
              </div>
            ) : (
              filteredStations.map((st, index) => {
                const isSelected = selectedStation?.station_id === st.station_id;
                return (
                  <div
                    key={st.station_id}
                    onClick={() => setSelectedStation(st)}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: isSelected ? "#ffffff" : "var(--lewa-paper)",
                      border: isSelected
                        ? `2px solid var(--lewa-terracotta)`
                        : "1px solid var(--lewa-border)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 4px 12px rgba(184, 71, 40, 0.1)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--lewa-muted)", minWidth: "18px" }}>
                          #{index + 1}
                        </span>
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: st.badge_color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>
                          {st.station_id}
                        </span>
                        {st.is_village_adjacent && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                              fontWeight: 600,
                            }}
                          >
                            Village Interface
                          </span>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "18px", fontWeight: 800, color: st.badge_color }}>
                          {st.priority_score}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>/100</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11.5px", color: "var(--lewa-muted)" }}>
                      <span>
                        {st.total_captures} captures • {st.unique_tigers_count} tiger(s) • {st.zone} zone
                      </span>
                      <span>Confidence: {st.evidence_confidence}%</span>
                    </div>

                    {/* Progress score bar */}
                    <div
                      style={{
                        width: "100%",
                        height: "4px",
                        background: "rgba(0,0,0,0.06)",
                        borderRadius: "100px",
                        marginTop: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${st.priority_score}%`,
                          height: "100%",
                          background: st.badge_color,
                          borderRadius: "100px",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Deep-Dive Factor & Evidence Inspector */}
          {selectedStation ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--lewa-border)",
                borderRadius: "18px",
                padding: "26px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "22px",
              }}
            >
              {/* Station Detail Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "1px solid var(--lewa-border)",
                  paddingBottom: "18px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={{ fontSize: "28px", fontWeight: 700, color: "var(--lewa-charcoal)", margin: 0 }}>
                      Station {selectedStation.station_id}
                    </h2>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "100px",
                        background: selectedStation.badge_bg,
                        color: selectedStation.badge_color,
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {selectedStation.badge_icon} {selectedStation.priority_level} PRIORITY
                    </span>
                  </div>

                  <p style={{ color: "var(--lewa-muted)", fontSize: "13px", marginTop: "4px" }}>
                    Coordinates: {selectedStation.latitude.toFixed(4)}°N, {selectedStation.longitude.toFixed(4)}°E • Zone:{" "}
                    <strong>{selectedStation.zone.toUpperCase()}</strong>
                    {selectedStation.is_village_adjacent ? " • ⚠️ Village Boundary Interface" : ""}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "38px", fontWeight: 800, color: selectedStation.badge_color, lineHeight: 1 }}>
                    {selectedStation.priority_score}
                    <span style={{ fontSize: "16px", color: "var(--lewa-muted)", fontWeight: 500 }}>/100</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>
                    Evidence Confidence: <strong>{selectedStation.evidence_confidence}%</strong>
                  </span>
                </div>
              </div>

              {/* Deterministic Explanation Box */}
              <div
                style={{
                  background: "var(--lewa-paper)",
                  border: "1px solid var(--lewa-border)",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-terracotta)", marginBottom: "6px" }}>
                  Deterministic Priority Rationale
                </p>
                <p style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--lewa-body)" }}>
                  {selectedStation.why_explanation}
                </p>
              </div>

              {/* Factor Breakdown Contributions */}
              <div>
                <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-charcoal)", marginBottom: "14px" }}>
                  Transparent Scoring Breakdown
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Movement Component */}
                  <div style={{ background: "var(--lewa-ivory)", padding: "14px 16px", borderRadius: "10px", border: "1px solid var(--lewa-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--lewa-charcoal)" }}>
                        🐅 Tiger Movement Activity
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>
                        {selectedStation.components.movement.score}/100{" "}
                        <span style={{ color: "var(--lewa-terracotta)", fontSize: "12px" }}>
                          (+{selectedStation.components.movement.contribution} pts)
                        </span>
                      </span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "var(--lewa-muted)" }}>
                      {selectedStation.components.movement.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Conflict Component */}
                  <div style={{ background: "var(--lewa-ivory)", padding: "14px 16px", borderRadius: "10px", border: "1px solid var(--lewa-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--lewa-charcoal)" }}>
                        🏘️ Conflict & Buffer Proximity
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>
                        {selectedStation.components.conflict.score}/100{" "}
                        <span style={{ color: "var(--lewa-terracotta)", fontSize: "12px" }}>
                          (+{selectedStation.components.conflict.contribution} pts)
                        </span>
                      </span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "var(--lewa-muted)" }}>
                      {selectedStation.components.conflict.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Anomaly Component */}
                  <div style={{ background: "var(--lewa-ivory)", padding: "14px 16px", borderRadius: "10px", border: "1px solid var(--lewa-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--lewa-charcoal)" }}>
                        ⚠️ Spatial Anomalies & Alerts
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>
                        {selectedStation.components.anomaly.score}/100{" "}
                        <span style={{ color: "var(--lewa-terracotta)", fontSize: "12px" }}>
                          (+{selectedStation.components.anomaly.contribution} pts)
                        </span>
                      </span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "var(--lewa-muted)" }}>
                      {selectedStation.components.anomaly.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contributing Individual Tigers */}
              {selectedStation.contributing_tigers.length > 0 && (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-charcoal)", marginBottom: "10px" }}>
                    Contributing Individual Tigers ({selectedStation.contributing_tigers.length})
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                    {selectedStation.contributing_tigers.map((t) => (
                      <div
                        key={t.tiger_id}
                        style={{
                          padding: "10px 14px",
                          background: "var(--lewa-paper)",
                          borderRadius: "8px",
                          border: "1px solid var(--lewa-border)",
                          fontSize: "12px",
                        }}
                      >
                        <strong style={{ color: "var(--lewa-charcoal)" }}>{t.name}</strong> ({t.tiger_id})
                        <div style={{ color: "var(--lewa-muted)", marginTop: "2px" }}>
                          {t.captures_at_station} capture(s) at this station
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Cycle Trajectory Trend */}
              <div>
                <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-charcoal)", marginBottom: "10px" }}>
                  Multi-Cycle Priority Trajectory
                </p>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "80px", padding: "10px 0" }}>
                  {selectedStation.cycle_trend.map((c, idx) => (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>{c.score}</span>
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(12, (c.score / 100) * 50)}px`,
                          background: idx === 4 ? selectedStation.badge_color : "rgba(0,0,0,0.15)",
                          borderRadius: "4px",
                        }}
                      />
                      <span style={{ fontSize: "10px", color: "var(--lewa-muted)" }}>{c.cycle.replace(" (Cycle 5)", "")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Quick Action Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "10px", paddingTop: "16px", borderTop: "1px solid var(--lewa-border)" }}>
                <Link
                  href={`/map`}
                  className="btn-brush"
                  style={{
                    padding: "8px 18px",
                    fontSize: "11px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    textDecoration: "none",
                  }}
                >
                  <MapPin size={13} /> View on Territory Map
                </Link>

                <Link
                  href={`/chat`}
                  className="btn-pill-light"
                  style={{
                    padding: "8px 18px",
                    fontSize: "11px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    textDecoration: "none",
                  }}
                >
                  <MessageSquare size={13} /> Ask Assistant About {selectedStation.station_id}
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--lewa-muted)" }}>
              Select a station from the left column to inspect its scoring factors.
            </div>
          )}
        </div>

        {/* Suggested Tactical Patrol Sequence Section */}
        <div
          style={{
            marginTop: "48px",
            background: "var(--lewa-ivory)",
            border: "1px solid var(--lewa-border)",
            borderRadius: "18px",
            padding: "26px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--lewa-terracotta)" }}>
                Operational Deployment Itinerary
              </p>
              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--lewa-charcoal)", margin: "4px 0 0" }}>
                Suggested Tactical Patrol Sequence
              </h2>
            </div>
            <Link
              href="/map"
              className="btn-pill-light"
              style={{ padding: "6px 14px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
            >
              <Compass size={13} /> Trace On Map
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
            }}
          >
            {sequence.map((item) => (
              <div
                key={item.station_id}
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--lewa-border)",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "var(--lewa-charcoal)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {item.order}
                    </span>
                    <strong style={{ fontSize: "16px", color: "var(--lewa-charcoal)" }}>{item.station_id}</strong>
                  </div>

                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    {item.badge_icon} {item.priority_score}/100
                  </span>
                </div>

                <p style={{ fontSize: "12px", color: "var(--lewa-muted)", margin: 0, lineHeight: 1.4 }}>
                  <strong>Objective:</strong> {item.tactical_objective}
                </p>

                <div style={{ fontSize: "11px", color: "var(--lewa-light)", marginTop: "4px" }}>
                  Zone: {item.zone.toUpperCase()}{item.is_village_adjacent ? " (Village Fringe)" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
