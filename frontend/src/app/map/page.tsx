"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import LewaNav from "@/components/LewaNav";
import {
  getMovementPaths,
  getPatrolStations,
  TigerPath,
  PatrolStation,
  PathPoint,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { tigerColor } from "@/lib/tigerColor";
import {
  Layers,
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Route,
  Flame,
  CalendarRange,
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
      <LoadingText />
    </div>
  ),
});

function LoadingText() {
  const { t } = useLanguage();
  return (
    <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "18px" }}>
      {t.map_loading}
    </p>
  );
}

function distanceKm(points: PathPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [lat1, lon1] = [points[i - 1].lat, points[i - 1].lon];
    const [lat2, lon2] = [points[i].lat, points[i].lon];
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(a));
  }
  return total;
}

export default function MapPage() {
  const { t } = useLanguage();
  const [paths, setPaths] = useState<TigerPath[]>([]);
  const [patrolStations, setPatrolStations] = useState<PatrolStation[]>([]);
  const [showPaths, setShowPaths] = useState(true);
  const [showPatrol, setShowPatrol] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [patrolFilter, setPatrolFilter] = useState<"all" | "CRITICAL" | "HIGH" | "village">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedTigerIds, setSelectedTigerIds] = useState<string[]>([]);
  const [journeyTigerId, setJourneyTigerId] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<PatrolStation | null>(null);
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Female: true, Male: true, Unknown: false });

  useEffect(() => {
    Promise.all([getMovementPaths(), getPatrolStations()])
      .then(([p, s]) => {
        setPaths(p);
        // Start focused on the most-mobile tiger: arrows + auto-zoom tell
        // the story immediately, and the map stays decluttered.
        const top = [...p].sort((a, b) => b.points.length - a.points.length)[0];
        if (top) {
          setSelectedTigerIds([top.tiger_id]);
          setJourneyTigerId(top.tiger_id);
        }
        setPatrolStations(s);
      })
      .catch(console.error);
  }, []);

  // Date-windowed paths: keep only captures inside the chosen range. A
  // capture on the boundary day counts (FROM/TO are inclusive), and a tiger
  // with no captures in the window disappears from the map and sidebar.
  const dateWindowed = useMemo(() => {
    if (!dateFrom && !dateTo) return paths;
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    return paths
      .map((p) => ({
        ...p,
        points: p.points.filter((pt) => {
          if (!pt.timestamp) return false;
          const ts = new Date(pt.timestamp);
          if (isNaN(ts.getTime())) return false;
          if (from && ts < from) return false;
          if (to && ts > to) return false;
          return true;
        }),
      }))
      .filter((p) => p.points.length > 0);
  }, [paths, dateFrom, dateTo]);

  const filteredPaths = dateWindowed;

  const displayedStations = patrolStations.filter((s) => {
    if (patrolFilter === "all") return true;
    if (patrolFilter === "CRITICAL" || patrolFilter === "HIGH") {
      return s.priority_level === patrolFilter;
    }
    if (patrolFilter === "village") return s.is_village_adjacent;
    return true;
  });

  // When the date window changes, keep the view coherent: drop tigers that
  // fell out of the window, and if the focused tiger vanished, refocus the
  // most-mobile survivor (selecting it when nothing remains). A window that
  // briefly goes empty (e.g. FROM after TO) must also recover once valid.
  useEffect(() => {
    const alive = selectedTigerIds.filter((id) => dateWindowed.some((p) => p.tiger_id === id));
    const focusedAlive = journeyTigerId != null && dateWindowed.some((p) => p.tiger_id === journeyTigerId);

    if (dateWindowed.length === 0) {
      if (selectedTigerIds.length > 0) setSelectedTigerIds([]);
      if (journeyTigerId !== null) setJourneyTigerId(null);
      return;
    }
    if (focusedAlive) {
      if (alive.length !== selectedTigerIds.length) setSelectedTigerIds(alive);
      return;
    }
    if (journeyTigerId !== null) {
      // Focused tiger fell out of the window — refocus the most-mobile
      // survivor among the still-selected tigers (or of the whole window
      // when the selection died with it).
      const pool = alive.length > 0 ? dateWindowed.filter((p) => alive.includes(p.tiger_id)) : dateWindowed;
      const top = [...pool].sort((a, b) => b.points.length - a.points.length)[0];
      if (top) {
        setJourneyTigerId(top.tiger_id);
        if (alive.length === 0) setSelectedTigerIds([top.tiger_id]);
      }
    } else if (selectedTigerIds.length === 0) {
      // Total reset (empty window recovered) — focus the best tiger, like
      // initial load, so the map never sits empty while data exists.
      const top = [...dateWindowed].sort((a, b) => b.points.length - a.points.length)[0];
      if (top) {
        setSelectedTigerIds([top.tiger_id]);
        setJourneyTigerId(top.tiger_id);
      }
    } else if (alive.length !== selectedTigerIds.length) {
      // Panel was deliberately closed; keep the user's selection, just prune.
      setSelectedTigerIds(alive);
    }
  }, [dateWindowed]);

  const toggleTiger = (id: string) => {
    if (selectedTigerIds.includes(id)) {
      // Uncheck: drop it; if exactly one remains, keep it focused
      const next = selectedTigerIds.filter((x) => x !== id);
      setSelectedTigerIds(next);
      setJourneyTigerId(next.length === 1 ? next[0] : null);
    } else {
      // Checking a tiger is an exclusive filter — show only its journey,
      // clear every other tiger's points, and zoom the camera onto it.
      setSelectedTigerIds([id]);
      setJourneyTigerId(id);
    }
  };

  // Sidebar grouping with search — built from the date-windowed paths so
  // counts and ordering reflect the chosen capture window
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (p: TigerPath) => !q || p.name.toLowerCase().includes(q) || p.tiger_id.toLowerCase().includes(q);
    const bySex: Record<string, TigerPath[]> = { Female: [], Male: [], Unknown: [] };
    dateWindowed.forEach((p) => {
      if (!match(p)) return;
      const key = p.sex === "Female" ? "Female" : p.sex === "Male" ? "Male" : "Unknown";
      bySex[key].push(p);
    });
    // biggest movers first inside each group
    Object.values(bySex).forEach((arr) => arr.sort((a, b) => b.points.length - a.points.length));
    return bySex;
  }, [dateWindowed, search]);

  const sexLabel = (key: string) =>
    key === "Female" ? t.map_female : key === "Male" ? t.map_male : t.map_unknown_sex;

  const journey = dateWindowed.find((p) => p.tiger_id === journeyTigerId) || null;

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
        {/* Slim top control bar */}
        <div
          style={{
            background: "linear-gradient(135deg, #1C1712 0%, #2A231C 100%)",
            color: "#EFEAE1",
            padding: "10px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            borderBottom: "1px solid rgba(239, 234, 225, 0.12)",
            zIndex: 1100,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setShowPaths(!showPaths)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px",
                borderRadius: "20px",
                background: showPaths ? "rgba(249, 115, 22, 0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${showPaths ? "#f97316" : "rgba(255,255,255,0.15)"}`,
                color: showPaths ? "#fff" : "#A3998E", fontSize: "11px", fontWeight: 700, cursor: "pointer",
              }}
            >
              <Route size={13} color={showPaths ? "#f97316" : "#A3998E"} />
              {t.map_paths_layer}
            </button>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px",
                borderRadius: "20px",
                background: showHeatmap ? "rgba(251, 191, 36, 0.22)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${showHeatmap ? "#fbbf24" : "rgba(255,255,255,0.15)"}`,
                color: showHeatmap ? "#fff" : "#A3998E", fontSize: "11px", fontWeight: 700, cursor: "pointer",
              }}
              title={t.map_heatmap_hint}
            >
              <Flame size={13} color={showHeatmap ? "#fbbf24" : "#A3998E"} />
              {t.map_heatmap_layer}
            </button>
            <button
              onClick={() => setShowPatrol(!showPatrol)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px",
                borderRadius: "20px",
                background: showPatrol ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${showPatrol ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
                color: showPatrol ? "#fff" : "#A3998E", fontSize: "11px", fontWeight: 700, cursor: "pointer",
              }}
            >
              <ShieldAlert size={13} color={showPatrol ? "#ef4444" : "#A3998E"} />
              {t.map_layer_patrol}
            </button>

            {showPatrol && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "6px" }}>
                <span style={{ fontSize: "10px", color: "var(--lewa-amber)", fontWeight: 700 }}>{t.map_filter_label}</span>
                {(["all", "CRITICAL", "HIGH", "village"] as const).map((pf) => (
                  <button
                    key={pf}
                    onClick={() => setPatrolFilter(pf)}
                    style={{
                      padding: "3px 10px", borderRadius: "14px",
                      background: patrolFilter === pf ? "rgba(255,255,255,0.2)" : "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: patrolFilter === pf ? "#fff" : "#A3998E",
                      fontSize: "10.5px", cursor: "pointer",
                    }}
                  >
                    {pf === "all" ? t.map_filter_all : pf === "CRITICAL" ? t.map_filter_critical : pf === "HIGH" ? t.map_filter_high : t.map_filter_village}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Date window filter — trims every journey to captures inside
                the chosen range so the map shows movement in that period. */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "4px 10px", borderRadius: "20px",
                background: dateFrom || dateTo ? "rgba(201, 162, 39, 0.18)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${dateFrom || dateTo ? "#c9a227" : "rgba(255,255,255,0.15)"}`,
              }}
            >
              <CalendarRange size={13} color={dateFrom || dateTo ? "#c9a227" : "#A3998E"} />
              <span style={{ fontSize: "9.5px", letterSpacing: "1px", fontWeight: 700, color: "var(--lewa-amber)" }}>
                {t.map_date_filter_label}
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10.5px", color: "#A3998E" }}>
                {t.map_date_from}
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => { setDateFrom(e.target.value); if (e.target.value && !dateTo) setDateTo(e.target.value); }}
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    color: "#EFEAE1", fontSize: "11px", fontFamily: "monospace",
                    width: "112px", cursor: "pointer",
                  }}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10.5px", color: "#A3998E" }}>
                {t.map_date_to}
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => { setDateTo(e.target.value); if (e.target.value && !dateFrom) setDateFrom(e.target.value); }}
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    color: "#EFEAE1", fontSize: "11px", fontFamily: "monospace",
                    width: "112px", cursor: "pointer",
                  }}
                />
              </label>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  title={t.map_date_clear}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)", border: "none",
                    color: "#EFEAE1", cursor: "pointer", flexShrink: 0,
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <span style={{ fontSize: "11px", color: "#A3998E" }}>
              {selectedTigerIds.length} {t.map_paths_shown}
            </span>
            <Link
              href="/patrol"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px",
                borderRadius: "20px", background: "var(--lewa-terracotta)", color: "#fff",
                fontSize: "11px", fontWeight: 700, textDecoration: "none",
              }}
            >
              <ShieldAlert size={13} />
              {t.map_patrol_board}
            </Link>
          </div>
        </div>

        {/* Map View Frame */}
        <div style={{ position: "relative", flex: 1, width: "100%" }}>
          <MapView
            paths={filteredPaths}
            patrolStations={displayedStations}
            showPaths={showPaths}
            showPatrol={showPatrol}
            showHeatmap={showHeatmap}
            selectedTigerIds={selectedTigerIds}
            focusedTigerId={journeyTigerId}
            labels={{
              sqKm: t.map_sq_km,
              priority: t.map_popup_priority,
              village: t.map_popup_village,
              zone: t.map_popup_zone,
              confidence: t.map_popup_confidence,
              captures: t.map_popup_captures,
              tigers: t.map_popup_tigers,
              date: t.map_date,
              station: t.map_popup_zone === t.map_zone ? "Station" : "Station",
            }}
            onSelectTiger={(id) => {
              // Clicking a tiger's path on the map filters the view down to
              // that tiger alone and zooms the camera onto its journey.
              setSelectedTigerIds([id]);
              setJourneyTigerId(id);
            }}
            onSelectStation={(st) => setSelectedStation(st)}
          />

          {/* ── Tiger selection sidebar ─────────────────────────────────── */}
          <div
            style={{
              position: "absolute", top: "16px", left: "16px", width: "270px",
              maxHeight: "calc(100% - 32px)", background: "#fff", borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)", zIndex: 1000,
              display: "flex", flexDirection: "column", overflow: "hidden",
              border: "1px solid var(--lewa-border)",
            }}
          >
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f0ebe3" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "17px", fontWeight: 700 }}>
                  {t.map_tigers_title} <span style={{ color: "var(--lewa-muted)", fontSize: "13px" }}>({paths.length})</span>
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => { setSelectedTigerIds(dateWindowed.map((p) => p.tiger_id)); setJourneyTigerId(null); }}
                    style={{ fontSize: "10.5px", padding: "2px 8px", borderRadius: "10px", border: "1px solid #e0d8cc", background: "#fff", cursor: "pointer", color: "var(--lewa-muted)" }}>
                    {t.map_all}
                  </button>
                  <button onClick={() => { setSelectedTigerIds([]); setJourneyTigerId(null); }}
                    style={{ fontSize: "10.5px", padding: "2px 8px", borderRadius: "10px", border: "1px solid #e0d8cc", background: "#fff", cursor: "pointer", color: "var(--lewa-muted)" }}>
                    {t.map_none}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--lewa-cream)", borderRadius: "8px", padding: "6px 10px" }}>
                <Search size={13} color="var(--lewa-muted)" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.map_search_ph}
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: "12.5px", flex: 1, color: "var(--lewa-charcoal)" }}
                />
              </div>
              {selectedTigerIds.length === 0 && (
                <p style={{ fontSize: "10.5px", color: "var(--lewa-muted)", margin: "8px 0 0", lineHeight: 1.4 }}>
                  {t.map_select_hint}
                </p>
              )}
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {(["Female", "Male", "Unknown"] as const).map((sexKey) => {
                const list = groups[sexKey];
                if (list.length === 0) return null;
                const open = openGroups[sexKey] !== false;
                return (
                  <div key={sexKey}>
                    <button
                      onClick={() => setOpenGroups({ ...openGroups, [sexKey]: !open })}
                      style={{
                        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "9px 16px", background: "var(--lewa-paper)", border: "none", cursor: "pointer",
                        fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase",
                        color: "var(--lewa-muted)", textAlign: "left",
                      }}
                    >
                      <span>{sexLabel(sexKey)} ({list.length})</span>
                      {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {open && list.map((p) => {
                      const isSel = selectedTigerIds.includes(p.tiger_id);
                      return (
                        <label
                          key={p.tiger_id}
                          style={{
                            display: "flex", alignItems: "center", gap: "8px", padding: "7px 16px",
                            cursor: "pointer", fontSize: "12.5px", borderBottom: "1px solid #faf7f2",
                            background: isSel ? "rgba(184, 71, 40, 0.05)" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleTiger(p.tiger_id)}
                            style={{ accentColor: tigerColor(p.tiger_id), cursor: "pointer" }}
                          />
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: tigerColor(p.tiger_id), flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: "var(--lewa-charcoal)", flex: 1 }}>
                            {p.name.replace("Tiger ", "")}
                          </span>
                          <span style={{ fontSize: "10.5px", color: "var(--lewa-muted)" }}>
                            {p.points.length}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Journey inspector ─────────────────────────────────────────── */}
          {journey && (
            <div
              style={{
                position: "absolute", top: "16px", right: "16px", width: "330px",
                background: "#ffffff", borderRadius: "16px", padding: "20px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)", zIndex: 1000,
                border: "1px solid var(--lewa-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: tigerColor(journey.tiger_id) }} />
                  <h3 style={{ fontSize: "19px", fontWeight: 700, color: "var(--lewa-charcoal)", margin: 0 }}>
                    {journey.name}
                  </h3>
                </div>
                <button
                  onClick={() => setJourneyTigerId(null)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--lewa-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: "12px", color: "var(--lewa-muted)", margin: "0 0 12px" }}>
                <code>{journey.tiger_id}</code>
                {journey.sex ? ` • ${journey.sex === "Female" ? t.map_female : journey.sex === "Male" ? t.map_male : t.map_unknown_sex}` : ""}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <div style={{ background: "var(--lewa-cream)", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px" }}>{journey.points.length}</div>
                  <div style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>
                    {t.map_captures_word}
                  </div>
                </div>
                <div style={{ background: "var(--lewa-cream)", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px" }}>
                    {new Set(journey.points.map((p) => p.station_id)).size}
                  </div>
                  <div style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>
                    {t.map_stations_word}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "var(--lewa-body)", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
                <div>
                  {t.map_period}:{" "}
                  <strong>
                    {journey.points.length > 0 ? new Date(journey.points[0].timestamp!).toLocaleDateString() : "—"}
                    {" → "}
                    {journey.points.length > 0 ? new Date(journey.points[journey.points.length - 1].timestamp!).toLocaleDateString() : "—"}
                  </strong>
                </div>
                <div>
                  {t.map_distance}: <strong>{distanceKm(journey.points).toFixed(1)} {t.map_sq_km.replace("sq km", "km").replace("किमी", "km")}</strong>
                </div>
              </div>

              {/* Station sequence — unique stations in visiting order, compact */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {(() => {
                  const seen = new Map<string, number>();
                  journey.points.forEach((p) => seen.set(p.station_id, (seen.get(p.station_id) || 0) + 1));
                  return Array.from(seen.entries()).map(([station, visits]) => (
                    <span key={station} style={{ fontSize: "10.5px", padding: "3px 8px", background: "var(--lewa-cream)", borderRadius: "10px", color: "var(--lewa-muted)" }}>
                      {station}{visits > 1 ? ` ×${visits}` : ""}
                    </span>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ── Station inspector ─────────────────────────────────────────── */}
          {selectedStation && (
            <div
              style={{
                position: "absolute", bottom: "24px", right: "16px", width: "330px",
                background: "#ffffff", borderRadius: "16px", padding: "20px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)", zIndex: 1000,
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
                      padding: "2px 8px", borderRadius: "100px", background: selectedStation.badge_bg,
                      color: selectedStation.badge_color, fontSize: "10.5px", fontWeight: 700,
                    }}
                  >
                    {selectedStation.badge_icon} {selectedStation.priority_level}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStation(null)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--lewa-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800, color: selectedStation.badge_color }}>
                  {selectedStation.priority_score}
                  <span style={{ fontSize: "13px", color: "var(--lewa-muted)", fontWeight: 500 }}>/100</span>
                </span>
                <span style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>
                  {t.map_evidence_confidence} <strong>{selectedStation.evidence_confidence}%</strong>
                </span>
              </div>

              <p style={{ fontSize: "12px", color: "var(--lewa-body)", lineHeight: 1.4, margin: "0 0 10px" }}>
                {selectedStation.top_reasons[0] || selectedStation.why_explanation}
              </p>

              <div style={{ fontSize: "11px", color: "var(--lewa-muted)", background: "var(--lewa-paper)", padding: "8px 10px", borderRadius: "8px", marginBottom: "12px" }}>
                {t.map_zone} <strong>{selectedStation.zone.toUpperCase()}</strong> • {t.map_captures} <strong>{selectedStation.total_captures}</strong> • {t.map_tigers} <strong>{selectedStation.unique_tigers_count}</strong>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <Link href="/patrol" className="btn-brush" style={{ flex: 1, textAlign: "center", padding: "6px 12px", fontSize: "11px", textDecoration: "none" }}>
                  {t.map_full_breakdown}
                </Link>
                <Link href="/chat" className="btn-pill-light" style={{ padding: "6px 12px", fontSize: "11px", textDecoration: "none" }}>
                  {t.map_ask_ai}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
