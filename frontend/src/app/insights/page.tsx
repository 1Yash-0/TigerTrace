"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import LewaNav from "@/components/LewaNav";
import {
  getSummary, listTigers, getHomeRanges, getOverlaps, getMovementPaths, getPatrolStations,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { tigerColor } from "@/lib/tigerColor";
import { ArrowRight, MapPin } from "lucide-react";

interface SummaryData {
  tigers_identified: number;
  total_captures: number;
  open_alerts: number;
}

interface TigerRow {
  tiger_id: string;
  name: string;
  sex: string;
  total_captures: number;
}

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

interface PathPoint {
  lat: number;
  lon: number;
  timestamp: string | null;
  station_id: string;
  confidence: number;
}

interface TigerPathData {
  tiger_id: string;
  name: string;
  sex: string | null;
  points: PathPoint[];
}

interface PatrolStationRow {
  station_id: string;
  priority_level: string;
  zone: string;
  total_captures: number;
}

const SEX_COLORS = {
  Female: "#B87140", // terracotta
  Male: "#2A5A42",    // forest
  Unknown: "#C9A227", // amber
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MODERATE: "#eab308",
  LOW: "#10b981",
};

const ZONE_COLORS: Record<string, string> = {
  core: "#2A5A42",
  buffer: "#E28816",
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function InsightsPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [tigers, setTigers] = useState<TigerRow[]>([]);
  const [ranges, setRanges] = useState<HomeRange[]>([]);
  const [overlaps, setOverlaps] = useState<Overlap[]>([]);
  const [paths, setPaths] = useState<TigerPathData[]>([]);
  const [stations, setStations] = useState<PatrolStationRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      getSummary().catch(() => null),
      listTigers().catch(() => []),
      getHomeRanges().catch(() => []),
      getOverlaps().catch(() => []),
      getMovementPaths().catch(() => []),
      getPatrolStations().catch(() => []),
    ])
      .then(([s, tg, hr, ov, p, st]) => {
        setSummary(s as SummaryData | null);
        setTigers(tg as TigerRow[]);
        setRanges(hr as HomeRange[]);
        setOverlaps(ov as Overlap[]);
        setPaths(p as TigerPathData[]);
        setStations(st as PatrolStationRow[]);
        setLoaded(true);
      });
  }, []);

  // 1. Population by sex
  const sexData = useMemo(() => {
    const counts = { Female: 0, Male: 0, Unknown: 0 };
    (tigers.length > 0 ? tigers : ranges).forEach((x) => {
      const sex = (x as TigerRow).sex || (x as HomeRange).sex || "Unknown";
      const key = sex === "Female" ? "Female" : sex === "Male" ? "Male" : "Unknown";
      counts[key as keyof typeof counts]++;
    });
    return [
      { name: t.insights_sex_female, value: counts.Female, color: SEX_COLORS.Female },
      { name: t.insights_sex_male, value: counts.Male, color: SEX_COLORS.Male },
      { name: t.insights_sex_unknown, value: counts.Unknown, color: SEX_COLORS.Unknown },
    ].filter((d) => d.value > 0);
  }, [tigers, ranges, t]);

  // 2. Territory sizes — top 15 largest home ranges
  const rangeData = useMemo(
    () =>
      [...ranges]
        .sort((a, b) => b.area_sq_km - a.area_sq_km)
        .slice(0, 15)
        .map((r) => ({
          name: r.tiger_id,
          full: r.name,
          sex: r.sex,
          area: r.area_sq_km,
          fill: r.sex === "Female" ? SEX_COLORS.Female : r.sex === "Male" ? SEX_COLORS.Male : SEX_COLORS.Unknown,
        })),
    [ranges]
  );

  // 3. Top territory overlaps
  const overlapData = useMemo(
    () =>
      [...overlaps]
        .filter((o) => o.overlap_area_sq_km > 0)
        .sort((a, b) => b.overlap_area_sq_km - a.overlap_area_sq_km)
        .slice(0, 12)
        .map((o) => ({
          name: `${o.tiger_a} × ${o.tiger_b}`,
          area: o.overlap_area_sq_km,
        })),
    [overlaps]
  );

  // 4. Monthly capture activity from movement paths
  const monthlyData = useMemo(() => {
    const byMonth = new Map<string, number>();
    paths.forEach((p) =>
      p.points.forEach((pt) => {
        if (!pt.timestamp) return;
        const d = new Date(pt.timestamp);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonth.set(key, (byMonth.get(key) || 0) + 1);
      })
    );
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [y, m] = key.split("-");
        return { month: `${MONTH_SHORT[Number(m) - 1]} ${y.slice(2)}`, captures: count };
      });
  }, [paths]);

  // 5. Busiest stations — top 12
  const stationData = useMemo(
    () =>
      [...stations]
        .sort((a, b) => b.total_captures - a.total_captures)
        .slice(0, 12)
        .map((s) => ({
          name: s.station_id,
          captures: s.total_captures,
          level: s.priority_level,
          fill: PRIORITY_COLORS[s.priority_level] ?? "#B87140",
        })),
    [stations]
  );

  // 6. Patrol priority mix
  const priorityData = useMemo(() => {
    const counts = new Map<string, number>();
    stations.forEach((s) => counts.set(s.priority_level, (counts.get(s.priority_level) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => {
        const order = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      })
      .map(([level, count]) => ({
        name: level,
        value: count,
        color: PRIORITY_COLORS[level] ?? "#C9A227",
      }));
  }, [stations]);

  // 7. Core vs Buffer captures — bar form handles any zone mix, including
  // a zone with zero captures, which a donut would render invisibly.
  const zoneBars = useMemo(() => {
    let core = 0;
    let buffer = 0;
    ranges.forEach((r) => {
      core += r.zone_breakdown?.core || 0;
      buffer += r.zone_breakdown?.buffer || 0;
    });
    // Fall back to patrol-station zones when home-range zones are missing
    if (core === 0 && buffer === 0) {
      stations.forEach((s) => {
        if (s.zone === "core") core += s.total_captures;
        else buffer += s.total_captures;
      });
    }
    return [
      { name: "Core", value: core, color: ZONE_COLORS.core },
      { name: "Buffer", value: buffer, color: ZONE_COLORS.buffer },
    ];
  }, [ranges, stations]);

  const totalArea = useMemo(
    () => ranges.reduce((sum, r) => sum + r.area_sq_km, 0),
    [ranges]
  );

  const kpis = [
    { value: summary?.tigers_identified ?? tigers.length, label: t.insights_kpi_tigers, color: "var(--lewa-terracotta)" },
    { value: (summary?.total_captures ?? 0).toLocaleString(), label: t.insights_kpi_captures, color: "var(--lewa-charcoal)" },
    { value: summary?.open_alerts ?? 0, label: t.insights_kpi_alerts, color: "#B87140" },
    { value: `${Math.round(totalArea).toLocaleString()} ${t.insights_kpi_area_unit}`, label: t.insights_kpi_area, color: "var(--lewa-forest-light, #2A5A42)" },
  ];

  const cardStyle = {
    background: "#fff",
    borderRadius: "14px",
    padding: "22px",
    boxShadow: "0 4px 20px rgba(28,23,18,0.06)",
    border: "1px solid var(--lewa-border)",
  } as const;

  const chartTitle = (title: string, hint?: string) => (
    <div style={{ marginBottom: "14px" }}>
      <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 700, color: "var(--lewa-charcoal)", margin: 0 }}>
        {title}
      </h3>
      {hint && (
        <p style={{ fontSize: "11.5px", color: "var(--lewa-muted)", margin: "4px 0 0", lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
    </div>
  );

  const tooltipStyle = {
    background: "#fff",
    border: "1px solid #e0d8cc",
    borderRadius: "10px",
    fontSize: "12px",
    fontFamily: "Inter, sans-serif",
    color: "#1c1712",
  } as const;

  return (
    <>
      <LewaNav forceScrolled />
      <main style={{ marginTop: "90px", background: "var(--lewa-cream)", minHeight: "calc(100vh - 90px)" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "48px 6vw 80px" }}>
          {/* Page header */}
          <div style={{ marginBottom: "36px" }}>
            <p style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: "var(--lewa-terracotta)", fontWeight: 700, marginBottom: "10px" }}>
              {t.nav_brand_subtitle}
            </p>
            <h1 className="lewa-title-section" style={{ fontSize: "clamp(30px, 4.5vw, 44px)" }}>
              {t.insights_title}
            </h1>
            <p style={{ color: "var(--lewa-muted)", fontSize: "15px", maxWidth: "640px", marginTop: "14px", lineHeight: 1.5 }}>
              {t.insights_subtitle}
            </p>
          </div>

          {!loaded && (
            <div style={{ ...cardStyle, textAlign: "center", color: "var(--lewa-muted)", fontSize: "14px", marginBottom: "24px" }}>
              Loading reserve data…
            </div>
          )}

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            {kpis.map((k, i) => (
              <div key={i} style={cardStyle}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "32px", fontWeight: 700, color: k.color, lineHeight: 1 }}>
                  {k.value}
                </div>
                <div style={{ fontSize: "10.5px", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--lewa-muted)", fontWeight: 700, marginTop: "6px" }}>
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {/* Row 1: sex donut + territory bars */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div style={cardStyle}>
              {chartTitle(t.insights_sex_title)}
              {sexData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={sexData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={0} isAnimationActive={false}>
                      {sexData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      formatter={(value) => <span style={{ fontSize: "12px", color: "var(--lewa-body)" }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: "var(--lewa-muted)", fontSize: "13px" }}>—</div>
              )}
            </div>

            <div style={{ ...cardStyle, gridColumn: "span 2" }}>
              {chartTitle(t.insights_home_range_title, t.insights_home_range_hint)}
              {rangeData.length > 0 && (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={rangeData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d5" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#8a7f72" }}
                      tickLine={false}
                      axisLine={{ stroke: "#d8cfc4" }}
                      unit=" km²"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={70}
                      tick={{ fontSize: 11.5, fill: "#5c5348" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, _name, props) => [
                        `${value} km²`,
                        props?.payload?.full,
                      ]}
                    />
                    <Bar dataKey="area" radius={[0, 5, 5, 0]} barSize={16} isAnimationActive={false}>
                      {rangeData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 2: overlaps + activity */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div style={cardStyle}>
              {chartTitle(t.insights_overlap_title, t.insights_overlap_hint)}
              {overlapData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overlapData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#8a7f72" }} tickLine={false} axisLine={{ stroke: "#d8cfc4" }} unit=" km²" />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#5c5348" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} km²`, "Shared"]} />
                    <Bar dataKey="area" radius={[0, 5, 5, 0]} fill="var(--lewa-terracotta, #B87140)" barSize={14} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={cardStyle}>
              {chartTitle(t.insights_activity_title, t.insights_activity_hint)}
              {monthlyData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData} margin={{ top: 8, right: 10, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="actGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#B87140" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#B87140" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d5" />
                    <XAxis dataKey="month" tick={{ fontSize: 10.5, fill: "#8a7f72" }} tickLine={false} axisLine={{ stroke: "#d8cfc4" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#8a7f72" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="captures" stroke="#B87140" strokeWidth={2.5} fill="url(#actGradient)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 3: busiest stations (wide) */}
          <div style={{ ...cardStyle, marginBottom: "20px" }}>
            {chartTitle(t.insights_stations_title, t.insights_stations_hint)}
            {stationData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stationData} margin={{ top: 8, right: 10, left: -14, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#8a7f72" }} tickLine={false} axisLine={{ stroke: "#d8cfc4" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a7f72" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, props) => [value, props?.payload?.level]}
                  />
                  <Bar dataKey="captures" radius={[5, 5, 0, 0]} barSize={26} isAnimationActive={false}>
                    {stationData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Row 4: priority mix + zones */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "28px" }}>
            <div style={cardStyle}>
              {chartTitle(t.insights_priority_title)}
              {priorityData.length > 0 && (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0} isAnimationActive={false}>
                      {priorityData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend formatter={(value) => <span style={{ fontSize: "11.5px", color: "var(--lewa-body)" }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={cardStyle}>
              {chartTitle(t.insights_zone_title, t.insights_zone_hint)}
              {zoneBars.length > 0 && (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={zoneBars} margin={{ top: 8, right: 10, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: "#8a7f72" }} tickLine={false} axisLine={{ stroke: "#d8cfc4" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#8a7f72" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={44} isAnimationActive={false}>
                      {zoneBars.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* CTA to the map */}
          <Link
            href="/map"
            className="btn-brush"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <MapPin size={14} />
            {t.insights_open_map} <ArrowRight size={13} />
          </Link>
        </div>
      </main>
    </>
  );
}
