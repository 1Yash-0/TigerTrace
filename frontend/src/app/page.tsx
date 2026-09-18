"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LewaNav from "@/components/LewaNav";
import { getSummary, listTigers, getPatrolSummary, getApiBase, setApiBase } from "@/lib/api";
import { tigerColor } from "@/lib/tigerColor";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Search, HardDriveDownload, MapPin, ShieldAlert, AlertTriangle, MessageSquare,
  ArrowRight, Camera, Settings, Check, ChevronDown, Volume2, VolumeX,
} from "lucide-react";

interface Summary {
  tigers_identified: number;
  total_captures: number;
  open_alerts: number;
  pending_review: number;
  blanks_filtered: number;
  saved_mb: number;
  saved_minutes: number;
}

interface Tiger {
  tiger_id: string;
  name: string;
  sex: string;
  total_captures: number;
  last_seen: string | null;
  last_station: string | null;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tigers, setTigers] = useState<Tiger[]>([]);
  const [topStations, setTopStations] = useState<Array<{ station_id: string; priority_level: string; priority_score: number }>>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [savedFlag, setSavedFlag] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setServerUrl(getApiBase());
    getSummary().then(setSummary).catch(console.error);
    listTigers().then(setTigers).catch(console.error);
    getPatrolSummary()
      .then((p) => setTopStations(p.top_priority_stations.slice(0, 4)))
      .catch(console.error);
  }, []);

  const saveServerUrl = () => {
    setApiBase(serverUrl);
    setSavedFlag(true);
    setTimeout(() => window.location.reload(), 600);
  };

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const stats = summary
    ? [
        { value: summary.tigers_identified, label: t.stat_tigers_tracked, color: "var(--lewa-terracotta)" },
        { value: summary.total_captures.toLocaleString(), label: t.stat_captures, color: "var(--lewa-charcoal)" },
        { value: summary.open_alerts, label: t.dash_open_alerts, color: "#B87140" },
        { value: summary.pending_review, label: t.dash_pending_review, color: "var(--lewa-amber)" },
      ]
    : [];

  const actions = [
    { href: "/identification", icon: <Search size={20} />, title: t.dash_act_identify, desc: t.dash_act_identify_desc },
    { href: "/identification", icon: <HardDriveDownload size={20} />, title: t.dash_act_sdcard, desc: t.dash_act_sdcard_desc },
    { href: "/map", icon: <MapPin size={20} />, title: t.nav_territory, desc: t.dash_act_map_desc },
    { href: "/patrol", icon: <ShieldAlert size={20} />, title: t.nav_patrol_priority, desc: t.dash_act_patrol_desc },
    { href: "/alerts", icon: <AlertTriangle size={20} />, title: t.nav_alerts, desc: t.dash_act_alerts_desc },
    { href: "/chat", icon: <MessageSquare size={20} />, title: t.nav_ai_assistant, desc: t.dash_act_chat_desc },
  ];

  return (
    <>
      <LewaNav />
      {/* Full-screen video hero — same film as the showcase home, guiding
          visitors down into the live intelligence dashboard. */}
      <section className="lewa-hero">
        <video
          ref={videoRef}
          src="/hero.mp4"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="lewa-hero-video"
        />
        <div className="lewa-hero-overlay" />
        <div className="lewa-hero-content">
          <h1 className="lewa-title-hero">
            {t.hero_title_1} <br />
            <span className="font-italic">{t.hero_title_2}</span>
          </h1>
        </div>
        <button
          onClick={() => document.getElementById("dash-anchor")?.scrollIntoView({ behavior: "smooth" })}
          className="lewa-hero-stamp-wrap"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <div
            className="scroll-indicator-bounce"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(4px)",
            }}
          >
            <ChevronDown size={24} style={{ color: "#fff" }} />
          </div>
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              borderBottom: "1px solid rgba(255,255,255,0.5)",
              paddingBottom: "2px",
            }}
          >
            {t.hero_scroll_explore}
          </span>
        </button>
      </section>

      <main id="dash-anchor" style={{ marginTop: "0", background: "var(--lewa-cream)", minHeight: "calc(100vh - 90px)" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "56px 6vw 80px" }}>
          {/* Welcome */}
          <div style={{ marginBottom: "40px" }}>
            <p style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: "var(--lewa-terracotta)", fontWeight: 700, marginBottom: "10px" }}>
              {t.nav_brand_subtitle}
            </p>
            <h1 className="lewa-title-section" style={{ fontSize: "clamp(34px, 5vw, 52px)" }}>
              {t.dash_welcome}
            </h1>
            <p style={{ color: "var(--lewa-muted)", fontSize: "15px", maxWidth: "640px", marginTop: "14px" }}>
              {t.dash_subtitle}
            </p>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "44px" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 20px rgba(28,23,18,0.06)" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "34px", fontWeight: 700, color: s.color, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "10.5px", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--lewa-muted)", fontWeight: 700, marginTop: "6px" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", marginBottom: "18px" }}>
            {t.dash_quick_actions}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px", marginBottom: "48px" }}>
            {actions.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                style={{
                  display: "flex", gap: "14px", alignItems: "flex-start",
                  background: "#fff", borderRadius: "12px", padding: "20px",
                  boxShadow: "0 4px 20px rgba(28,23,18,0.06)", textDecoration: "none",
                  border: "1px solid transparent", transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--lewa-terracotta)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
              >
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--lewa-cream)", color: "var(--lewa-terracotta)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {a.icon}
                </div>
                <div>
                  <div style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--lewa-charcoal)", marginBottom: "4px" }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--lewa-muted)", lineHeight: 1.5 }}>
                    {a.desc}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Registered tigers row */}
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", marginBottom: "18px" }}>
            {t.unified_registered_tigers}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "14px", marginBottom: "48px" }}>
            {tigers.map((tg) => (
              <Link
                key={tg.tiger_id}
                href="/identification"
                style={{
                  display: "block", background: "#fff", borderRadius: "12px", padding: "18px",
                  boxShadow: "0 4px 20px rgba(28,23,18,0.06)", textDecoration: "none",
                  borderTop: `3px solid ${tigerColor(tg.tiger_id)}`,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--lewa-charcoal)", marginBottom: "6px" }}>
                  {tg.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--lewa-muted)", lineHeight: 1.6 }}>
                  {tg.tiger_id} · {tg.total_captures} {t.unified_captures_label}
                  <br />
                  {t.unified_last_seen}: {tg.last_station || "—"}
                </div>
              </Link>
            ))}
          </div>

          {/* Top patrol stations */}
          {topStations.length > 0 && (
            <>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", marginBottom: "18px" }}>
                {t.dash_top_stations}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "14px" }}>
                {topStations.map((st) => (
                  <Link
                    key={st.station_id}
                    href="/patrol"
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: "#fff", borderRadius: "12px", padding: "18px",
                      boxShadow: "0 4px 20px rgba(28,23,18,0.06)", textDecoration: "none",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--lewa-charcoal)" }}>
                      <Camera size={14} style={{ verticalAlign: "-2px", marginRight: "6px", color: "var(--lewa-terracotta)" }} />
                      {st.station_id}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>
                      {st.priority_score}/100
                    </span>
                  </Link>
                ))}
                <Link
                  href="/patrol"
                  className="btn-pill-light"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 18px", fontSize: "12px", textDecoration: "none", justifySelf: "start" }}
                >
                  {t.dash_view_all_stations} <ArrowRight size={12} />
                </Link>
              </div>
            </>
          )}
          {/* Server settings (for the Android app / deployed machine) */}
          <div style={{ marginTop: "56px", background: "#fff", borderRadius: "12px", padding: "24px 28px", boxShadow: "0 4px 20px rgba(28,23,18,0.06)" }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
            >
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "18px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <Settings size={16} /> {t.dash_server_settings}
              </span>
              <span style={{ fontSize: "12px", color: "var(--lewa-muted)", fontFamily: "monospace" }}>{serverUrl}</span>
            </button>
            {showSettings && (
              <div style={{ marginTop: "16px" }}>
                <p style={{ fontSize: "12.5px", color: "var(--lewa-muted)", marginBottom: "10px" }}>
                  {t.dash_server_desc}
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://192.168.1.50:8000"
                    style={{ flex: 1, minWidth: "220px", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d8cfc4", fontSize: "14px", fontFamily: "monospace" }}
                  />
                  <button className="btn-brush" onClick={saveServerUrl} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {savedFlag ? <><Check size={13} /> {t.dash_server_saved}</> : t.dash_server_save}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Ambient film sound toggle (fixed, bottom-right) */}
      <button
        onClick={toggleSound}
        className="lewa-sound-toggle"
        title={isMuted ? "Unmute Ambient Sound" : "Mute Sound"}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </>
  );
}
