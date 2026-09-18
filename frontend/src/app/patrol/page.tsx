"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LewaNav from "@/components/LewaNav";
import { useLanguage } from "@/lib/i18n/LanguageContext";
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

// Priority-level presentation mapped to Lewa tokens — replaces the backend's
// raw badge hex/emoji fields with theme colors (CRITICAL also has a solid form
// for its header chip). MODERATE/LOW reuse the amber/forest severity tokens.
const PATROL_LEVEL_STYLE: Record<string, { bg: string; ink: string; solid?: string }> = {
  CRITICAL: {
    bg: "var(--lewa-pat-critical-bg)",
    ink: "var(--lewa-pat-critical-ink)",
    solid: "var(--lewa-pat-critical-solid)",
  },
  HIGH: { bg: "var(--lewa-pat-high-bg)", ink: "var(--lewa-pat-high-ink)" },
  MODERATE: { bg: "var(--lewa-sev-medium-bg)", ink: "var(--lewa-sev-medium-ink)" },
  LOW: { bg: "var(--lewa-sev-low-bg)", ink: "var(--lewa-sev-low-ink)" },
};

const levelStyle = (level: string) => PATROL_LEVEL_STYLE[level] ?? PATROL_LEVEL_STYLE.MODERATE;

// Display labels for the backend's raw priority_level strings ("CRITICAL" etc.)
// localized per language. The API value itself is never mutated — this only
// controls what the user sees.
const LEVEL_LABEL: Record<string, Record<string, string>> = {
  CRITICAL: { en: "Critical", hi: "गंभीर", mr: "गंभीर" },
  HIGH: { en: "High", hi: "उच्च", mr: "उच्च" },
  MODERATE: { en: "Moderate", hi: "मध्यम", mr: "मध्यम" },
  LOW: { en: "Low", hi: "कम", mr: "कमी" },
};

const levelLabel = (level: string, language: string) =>
  LEVEL_LABEL[level]?.[language] ?? LEVEL_LABEL[level]?.en ?? level;

export default function PatrolPriorityPage() {
  const { t, language } = useLanguage();
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
          <h1 className="lewa-title-section" style={{ fontSize: "clamp(32px, 4.5vw, 56px)" }}>
            {t.patrol_heading_1} <span className="font-italic">{t.patrol_heading_2}</span>
          </h1>

          <p
            style={{
              color: "var(--lewa-muted)",
              fontSize: "14.5px",
              maxWidth: "680px",
              margin: "8px auto 0",
            }}
          >
            {t.patrol_subtitle}
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
          {(
            [
              { key: "critical", label: t.patrol_critical, count: counts.critical, range: t.patrol_range_critical, note: t.patrol_note_critical },
              { key: "high", label: t.patrol_high, count: counts.high, range: t.patrol_range_high, note: t.patrol_note_high },
              { key: "moderate", label: t.patrol_moderate, count: counts.moderate, range: t.patrol_range_moderate, note: t.patrol_note_moderate },
              { key: "low", label: t.patrol_low, count: counts.low, range: t.patrol_range_low, note: t.patrol_note_low },
            ] as const
          ).map((card) => {
            const style = levelStyle(card.key.toUpperCase());
            return (
              <div
                key={card.key}
                style={{
                  background: "var(--lewa-ivory)",
                  border: "1px solid var(--lewa-border)",
                  borderRadius: "14px",
                  padding: "18px 20px",
                }}
              >
                <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)", display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: style.ink, flexShrink: 0 }} />
                  {card.label}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "32px", fontWeight: 700, color: style.ink, fontVariantNumeric: "tabular-nums" }}>{card.count}</span>
                  <span style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>{card.range}</span>
                </div>
                <p style={{ fontSize: "11px", color: style.ink, marginTop: "4px" }}>
                  {card.note}
                </p>
              </div>
            );
          })}
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
              {t.patrol_filter_all} ({stations.length})
            </button>
            <button
              onClick={() => setFilter("CRITICAL")}
              className={filter === "CRITICAL" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              🔴 {levelLabel("CRITICAL", language)} ({counts.critical})
            </button>
            <button
              onClick={() => setFilter("HIGH")}
              className={filter === "HIGH" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              🟠 {levelLabel("HIGH", language)} ({counts.high})
            </button>
            <button
              onClick={() => setFilter("MODERATE")}
              className={filter === "MODERATE" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              🟡 {levelLabel("MODERATE", language)} ({counts.moderate})
            </button>
            <button
              onClick={() => setFilter("village")}
              className={filter === "village" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              {t.patrol_filter_village}
            </button>
            <button
              onClick={() => setFilter("buffer")}
              className={filter === "buffer" ? "btn-brush" : "btn-pill-light"}
              style={{ padding: "5px 14px", fontSize: "11px" }}
            >
              {t.zone_buffer}
            </button>
          </div>

          {/* Action Links */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link
              href="/map"
              className="btn-pill-light"
              style={{ padding: "6px 14px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
            >
              <MapPin size={13} /> {t.patrol_view_territory_map}
            </Link>

            <a
              href={getExportPatrolUrl()}
              target="_blank"
              className="btn-pill-light"
              style={{ padding: "6px 14px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
            >
              <Download size={13} /> {t.patrol_export_priorities_csv}
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
                {t.patrol_ranked_stations} ({filteredStations.length})
              </p>
              <span style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>
                {t.patrol_click_inspect}
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--lewa-muted)" }}>
                {t.patrol_calculating}
              </div>
            ) : filteredStations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--lewa-muted)" }}>
                {t.patrol_no_match}
              </div>
            ) : (
              filteredStations.map((st, index) => {
                const isSelected = selectedStation?.station_id === st.station_id;
                const stStyle = levelStyle(st.priority_level);
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
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "100px",
                            background: stStyle.bg,
                            color: stStyle.ink,
                            fontSize: "9px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {levelLabel(st.priority_level, language)}
                        </span>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>
                          {st.station_id}
                        </span>
                        {st.is_village_adjacent && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "var(--lewa-sev-high-bg)",
                              color: "var(--lewa-sev-high-ink)",
                              fontWeight: 600,
                            }}
                          >
                            {t.zone_interface}
                          </span>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "18px", fontWeight: 800, color: stStyle.ink, fontVariantNumeric: "tabular-nums" }}>
                          {st.priority_score}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>/100</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11.5px", color: "var(--lewa-muted)" }}>
                      <span>
                        {st.total_captures} {t.patrol_captures_unit} • {st.unique_tigers_count} {t.patrol_tigers_unit} • {st.zone} {t.patrol_zone_word}
                      </span>
                      <span>{t.patrol_confidence_label} {st.evidence_confidence}%</span>
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
                          background: stStyle.ink,
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
                {(() => {
                  const selStyle = levelStyle(selectedStation.priority_level);
                  const isCritical = selectedStation.priority_level === "CRITICAL" && selStyle.solid;
                  return (
                    <>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "var(--lewa-charcoal)", margin: 0 }}>
                            {t.patrol_station_prefix} {selectedStation.station_id}
                          </h2>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "100px",
                              background: isCritical ? selStyle.solid : selStyle.bg,
                              color: isCritical ? "var(--lewa-cream)" : selStyle.ink,
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.5px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isCritical ? "var(--lewa-cream)" : selStyle.ink }} />
                            {selectedStation.badge_icon} {levelLabel(selectedStation.priority_level, language)} {t.patrol_priority_word}
                          </span>
                        </div>

                        <p style={{ color: "var(--lewa-muted)", fontSize: "13px", marginTop: "4px" }}>
                          {t.patrol_coordinates_label} {selectedStation.latitude.toFixed(4)}°N, {selectedStation.longitude.toFixed(4)}°E • {t.patrol_zone_label}{" "}
                          <strong>{selectedStation.zone.toUpperCase()}</strong>
                          {selectedStation.is_village_adjacent ? ` • ${t.patrol_village_boundary}` : ""}
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "38px", fontWeight: 800, color: selStyle.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                          {selectedStation.priority_score}
                          <span style={{ fontSize: "16px", color: "var(--lewa-muted)", fontWeight: 500 }}>/100</span>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>
                          {t.patrol_evidence_confidence} <strong>{selectedStation.evidence_confidence}%</strong>
                        </span>
                      </div>
                    </>
                  );
                })()}
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
                  {t.patrol_rationale_heading}
                </p>
                <p style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--lewa-body)" }}>
                  {selectedStation.why_explanation}
                </p>
              </div>

              {/* Factor Breakdown Contributions */}
              <div>
                <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-charcoal)", marginBottom: "14px" }}>
                  {t.patrol_factor_breakdown}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Movement Component */}
                  <div style={{ background: "var(--lewa-ivory)", padding: "14px 16px", borderRadius: "10px", border: "1px solid var(--lewa-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--lewa-charcoal)" }}>
                        {t.patrol_factor_movement}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>
                        {selectedStation.components.movement.score}/100{" "}
                        <span style={{ color: "var(--lewa-terracotta)", fontSize: "12px" }}>
                          (+{selectedStation.components.movement.contribution} {t.patrol_pts})
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
                        {t.patrol_factor_conflict}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>
                        {selectedStation.components.conflict.score}/100{" "}
                        <span style={{ color: "var(--lewa-terracotta)", fontSize: "12px" }}>
                          (+{selectedStation.components.conflict.contribution} {t.patrol_pts})
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
                        {t.patrol_factor_anomaly}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>
                        {selectedStation.components.anomaly.score}/100{" "}
                        <span style={{ color: "var(--lewa-terracotta)", fontSize: "12px" }}>
                          (+{selectedStation.components.anomaly.contribution} {t.patrol_pts})
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
                    {t.patrol_contributing_tigers} ({selectedStation.contributing_tigers.length})
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                    {selectedStation.contributing_tigers.map((tiger) => (
                      <div
                        key={tiger.tiger_id}
                        style={{
                          padding: "10px 14px",
                          background: "var(--lewa-paper)",
                          borderRadius: "8px",
                          border: "1px solid var(--lewa-border)",
                          fontSize: "12px",
                        }}
                      >
                        <strong style={{ color: "var(--lewa-charcoal)" }}>{tiger.name}</strong> ({tiger.tiger_id})
                        <div style={{ color: "var(--lewa-muted)", marginTop: "2px" }}>
                          {tiger.captures_at_station} {t.patrol_captures_at_station}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Cycle Trajectory Trend */}
              <div>
                <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-charcoal)", marginBottom: "10px" }}>
                  {t.patrol_trajectory_heading}
                </p>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "80px", padding: "10px 0" }}>
                  {selectedStation.cycle_trend.map((c, idx) => (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>{c.score}</span>
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(12, (c.score / 100) * 50)}px`,
                          background: idx === 4 ? levelStyle(selectedStation.priority_level).ink : "rgba(0,0,0,0.15)",
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
                  <MapPin size={13} /> {t.patrol_view_territory_map}
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
                  <MessageSquare size={13} /> {t.patrol_ask_assistant} {selectedStation.station_id}
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--lewa-muted)" }}>
              {t.patrol_select_station_empty}
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
                {t.patrol_sequence_badge}
              </p>
              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--lewa-charcoal)", margin: "4px 0 0" }}>
                {t.patrol_sequence_heading}
              </h2>
            </div>
            <Link
              href="/map"
              className="btn-pill-light"
              style={{ padding: "6px 14px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
            >
              <Compass size={13} /> {t.patrol_trace_on_map}
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

                  <span style={{ fontSize: "12px", fontWeight: 700, color: levelStyle(item.priority_level).ink, fontVariantNumeric: "tabular-nums" }}>
                    {item.badge_icon} {item.priority_score}/100
                  </span>
                </div>

                <p style={{ fontSize: "12px", color: "var(--lewa-muted)", margin: 0, lineHeight: 1.4 }}>
                  <strong>{t.patrol_objective_label}</strong> {item.tactical_objective}
                </p>

                <div style={{ fontSize: "11px", color: "var(--lewa-light)", marginTop: "4px" }}>
                  {t.patrol_zone_label} {item.zone.toUpperCase()}{item.is_village_adjacent ? ` (${t.patrol_village_fringe})` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
