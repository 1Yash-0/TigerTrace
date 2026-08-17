"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import LewaNav from "@/components/LewaNav";
import { getSummary, listTigers } from "@/lib/api";
import { setNavigatedFromHome } from "@/lib/navigationTracker";
import {
  Volume2,
  VolumeX,
  Play,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Compass,
  Layers,
  ArrowRight,
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

interface TigerProfile {
  tiger_id: string;
  name: string;
  sex: string;
  total_captures: number;
  last_seen: string | null;
  last_station: string | null;
}

const TIGER_DATA: Record<
  string,
  { name: string; territory: string; status: string; role: string; zone: string; img: string }
> = {
  "PTR-T01": {
    name: "Choti Tara",
    territory: "Core Plains Basin",
    status: "Resident Dominant",
    role: "Alpha Female",
    zone: "Core Zone",
    img: "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=600&q=80",
  },
  "PTR-T02": {
    name: "Baagh Raja",
    territory: "Northern Teak Ridge",
    status: "Territorial Male",
    role: "Dominant Male",
    zone: "Core Zone",
    img: "https://images.unsplash.com/photo-1549480017-d76466a4b7e8?auto=format&fit=crop&w=600&q=80",
  },
  "PTR-T03": {
    name: "Kanha",
    territory: "Khursapar Basin",
    status: "Active Patrol",
    role: "Territorial Male",
    zone: "Core / Buffer",
    img: "https://images.unsplash.com/photo-1508873696983-2df57046475a?auto=format&fit=crop&w=600&q=80",
  },
  "PTR-T04": {
    name: "Sundari",
    territory: "Southern Springs",
    status: "Breeding Female",
    role: "Resident Female",
    zone: "Buffer Zone",
    img: "https://images.unsplash.com/photo-1574063413132-355dbfd83e25?auto=format&fit=crop&w=600&q=80",
  },
  "PTR-T05": {
    name: "Shiv",
    territory: "Buffer Perimeter Corridor",
    status: "Monitored Sub-adult",
    role: "Sub-adult Male",
    zone: "Buffer Interface",
    img: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80",
  },
  "PTR-T06": {
    name: "Pari",
    territory: "Eastern Pench River",
    status: "Resident Matriarch",
    role: "Matriarch Female",
    zone: "Eastern River",
    img: "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=600&q=80",
  },
};

const PANEL_LABELS = [
  { id: "hero", label: "Hero", num: "01" },
  { id: "wildlife", label: "Habitat", num: "02" },
  { id: "prides", label: "Tigers", num: "03" },
  { id: "science", label: "Sanctuary", num: "04" },
];

export default function HomePage() {
  const [isMuted, setIsMuted] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tigers, setTigers] = useState<TigerProfile[]>([]);
  const [selectedTiger, setSelectedTiger] = useState<string>("PTR-T01");
  const [activePanel, setActivePanel] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isLockedRef = useRef<boolean>(false);
  const activePanelRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  activePanelRef.current = activePanel;

  // Check mobile screens
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setNavigatedFromHome(true);
    getSummary().then(setSummary).catch(console.error);
    listTigers().then(setTigers).catch(console.error);
  }, []);

  const navigateToPanel = useCallback((index: number) => {
    if (index < 0 || index >= PANEL_LABELS.length) return;
    if (isLockedRef.current) return;

    isLockedRef.current = true;
    setActivePanel(index);

    // Update location hash silently
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${PANEL_LABELS[index].id}`);
    }

    // Lock duration matches CSS transition (900ms)
    setTimeout(() => {
      isLockedRef.current = false;
    }, 950);
  }, []);

  // Listen to hash on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      const foundIndex = PANEL_LABELS.findIndex((p) => p.id === hash);
      if (foundIndex !== -1) {
        setActivePanel(foundIndex);
      }
    }
  }, []);

  // Intercept Wheel Event
  useEffect(() => {
    if (isMobile) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isLockedRef.current) return;

      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 15) return;

      if (delta > 0 && activePanelRef.current < PANEL_LABELS.length - 1) {
        navigateToPanel(activePanelRef.current + 1);
      } else if (delta < 0 && activePanelRef.current > 0) {
        navigateToPanel(activePanelRef.current - 1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isMobile, navigateToPanel]);

  // Intercept Touch Events
  useEffect(() => {
    if (isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || isLockedRef.current) return;

      const diffX = touchStartRef.current.x - e.touches[0].clientX;
      const diffY = touchStartRef.current.y - e.touches[0].clientY;
      const primaryDiff = Math.abs(diffY) >= Math.abs(diffX) ? diffY : diffX;

      if (Math.abs(primaryDiff) > 35) {
        e.preventDefault();
        if (primaryDiff > 0 && activePanelRef.current < PANEL_LABELS.length - 1) {
          navigateToPanel(activePanelRef.current + 1);
        } else if (primaryDiff < 0 && activePanelRef.current > 0) {
          navigateToPanel(activePanelRef.current - 1);
        }
        touchStartRef.current = null;
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isMobile, navigateToPanel]);

  // Intercept Keyboard Navigation
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLockedRef.current) return;

      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        if (activePanelRef.current < PANEL_LABELS.length - 1) {
          e.preventDefault();
          navigateToPanel(activePanelRef.current + 1);
        }
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        if (activePanelRef.current > 0) {
          e.preventDefault();
          navigateToPanel(activePanelRef.current - 1);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        navigateToPanel(0);
      } else if (e.key === "End") {
        e.preventDefault();
        navigateToPanel(PANEL_LABELS.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, navigateToPanel]);

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="slideshow-viewport">
      {/* Top Navbar: Automatically switches between transparent-white on Hero and solid cream on Panels 1-3 */}
      <LewaNav forceScrolled={activePanel > 0} />

      {/* Sliding Track */}
      <div
        className="slideshow-track"
        style={{
          transform: isMobile ? "none" : `translateX(-${activePanel * 100}vw)`,
        }}
      >
        {/* PANEL 0: HERO */}
        <div className="slideshow-panel" id="hero">
          <section className="lewa-hero" style={{ height: "100%" }}>
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
                Their land, <br />
                <span className="font-italic">your adventure.</span>
              </h1>
            </div>

            {/* Watch Film Button (Bottom Left) */}
            <div
              style={{
                position: "absolute",
                bottom: "36px",
                left: "5vw",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--lewa-terracotta)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <Play size={14} fill="#fff" />
              </div>
              <span
                style={{
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                WATCH THE FILM
              </span>
            </div>

            {/* Center Scroll to Explore Indicator (Bottom Center) */}
            <button
              onClick={() => navigateToPanel(1)}
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
                SCROLL TO EXPLORE ↓
              </span>
            </button>
          </section>
        </div>

        {/* PANEL 1: WILDLIFE AT PENCH */}
        <div className="slideshow-panel" id="wildlife">
          <section
            className="lewa-split-section"
            style={{ background: "var(--lewa-cream)" }}
          >
            {/* Left Column */}
            <div className="lewa-split-left">
              <div className="lewa-split-content">
                <h2 className="lewa-title-section" style={{ marginBottom: "20px" }}>
                  Wildlife <br />
                  <span className="font-italic">at </span>
                  <span className="text-outline brush-underline">Pench Reserve</span>
                </h2>

                <blockquote
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "18px",
                    lineHeight: "1.45",
                    color: "var(--lewa-charcoal)",
                    marginBottom: "18px",
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;Always leave space for the tiger&rdquo; is our founding
                  mantra. That philosophy guides the Pench Tiger Reserve
                  intelligence platform.
                </blockquote>

                <p
                  style={{
                    color: "var(--lewa-body)",
                    fontSize: "14px",
                    lineHeight: "1.65",
                    marginBottom: "24px",
                  }}
                >
                  We are a dedicated haven for the Royal Bengal Tiger (<em>Panthera tigris</em>).
                  Powered by computer vision and deep stripe flank biometric embeddings,
                  we track, identify, and monitor individual tigers non-invasively
                  across dense teak and bamboo canopies.
                </p>

                <Link
                  href="/identification"
                  className="btn-brush"
                  style={{ width: "fit-content" }}
                >
                  START IDENTIFYING TIGERS →
                </Link>
              </div>
            </div>

            {/* Right Column (Deckle-framed Tiger Photo) */}
            <div className="lewa-split-right" style={{ alignItems: "center" }}>
              <div className="deckle-frame" style={{ maxWidth: "520px", width: "100%" }}>
                <img
                  src="https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=1200&q=80"
                  alt="Royal Bengal Tiger at Pench Reserve"
                  style={{ height: "420px", objectFit: "cover" }}
                />
              </div>
            </div>
          </section>
        </div>

        {/* PANEL 2: ROYAL BENGAL TIGERS & TERRITORIES (FITS CLEANLY IN 100VH WITHOUT SCROLLING) */}
        <div className="slideshow-panel" id="prides">
          <section
            className="lewa-split-section"
            style={{ background: "var(--lewa-ivory)" }}
          >
            {/* Left Column (Tiger Portrait Photo) */}
            <div className="lewa-split-left" style={{ alignItems: "center", justifyContent: "center" }}>
              <div className="deckle-frame" style={{ maxWidth: "460px", width: "100%" }}>
                <img
                  src="https://images.unsplash.com/photo-1549480017-d76466a4b7e8?auto=format&fit=crop&w=1200&q=80"
                  alt="Royal Bengal Tiger in Pench Forest"
                  style={{ height: "380px", objectFit: "cover" }}
                />
              </div>
            </div>

            {/* Right Column (Individual Tiger Cards - Fitted within viewport) */}
            <div className="lewa-split-right" style={{ justifyContent: "center" }}>
              <div className="lewa-split-content" style={{ maxWidth: "540px" }}>
                <h2
                  className="lewa-title-md"
                  style={{ fontSize: "clamp(24px, 2.8vw, 36px)", marginBottom: "10px", lineHeight: 1.15 }}
                >
                  <span className="brush-underline">Royal Bengal</span> Corridors
                </h2>

                <p
                  style={{
                    color: "var(--lewa-body)",
                    fontSize: "13.5px",
                    lineHeight: "1.5",
                    marginBottom: "16px",
                  }}
                >
                  While Pench harbors rich biodiversity, our AI pipeline focuses
                  on individual Bengal tiger flank stripe patterns, minimum convex polygon
                  home ranges, and community interface alerts.
                </p>

                {/* Circular Profile Chips */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                  {Object.entries(TIGER_DATA)
                    .slice(0, 3)
                    .map(([id, tiger]) => (
                      <div
                        key={id}
                        className="pride-chip-item"
                        onClick={() => setSelectedTiger(id)}
                        style={{
                          cursor: "pointer",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          background: selectedTiger === id ? "#ffffff" : "rgba(255,255,255,0.6)",
                          border: selectedTiger === id ? "1.5px solid var(--lewa-terracotta)" : "1px solid rgba(21,17,13,0.08)",
                          boxShadow: selectedTiger === id ? "0 4px 14px rgba(200,82,32,0.15)" : "none",
                          transition: "all 0.25s ease",
                        }}
                      >
                        <div className="pride-chip-avatar" style={{ width: "46px", height: "46px" }}>
                          <img
                            src={tiger.img}
                            alt={tiger.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>

                        <div className="pride-chip-info">
                          <h4 style={{ fontSize: "15px", margin: "0 0 2px", fontWeight: 700 }}>
                            {tiger.name}{" "}
                            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--lewa-muted)" }}>
                              ({id})
                            </span>
                          </h4>
                          <div className="pride-chip-stats" style={{ fontSize: "11px", display: "flex", gap: "12px" }}>
                            <div>
                              <span style={{ fontWeight: 700, color: "var(--lewa-muted)" }}>TERRITORY:</span> {tiger.territory}
                            </div>
                            <div>
                              <span style={{ fontWeight: 700, color: "var(--lewa-terracotta)" }}>ZONE:</span> {tiger.zone}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link href="/map" className="btn-pill-light" style={{ padding: "8px 16px", fontSize: "11px" }}>
                    EXPLORE ON MAP →
                  </Link>
                  <Link href="/patrol" className="btn-brush" style={{ padding: "8px 16px", fontSize: "11px" }}>
                    PATROL PRIORITIES →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* PANEL 3: SANCTUARY & LIVE STATS WITH EMBEDDED PENCH NATIONAL PARK MAP */}
        <div className="slideshow-panel" id="science">
          <section
            className="lewa-split-section"
            style={{ background: "var(--lewa-cream)" }}
          >
            {/* Left Column: Sanctuary Info & Telemetry Grid */}
            <div className="lewa-split-left" style={{ justifyContent: "center" }}>
              <div className="lewa-split-content" style={{ maxWidth: "520px" }}>
                <h2
                  className="lewa-title-md"
                  style={{ fontSize: "clamp(24px, 2.8vw, 36px)", marginBottom: "12px", lineHeight: 1.15 }}
                >
                  Pench Tiger Reserve, a premier territory recognized for{" "}
                  <span className="font-italic">biodiversity.</span>
                </h2>

                <p
                  style={{
                    color: "var(--lewa-body)",
                    fontSize: "13.5px",
                    lineHeight: "1.55",
                    marginBottom: "12px",
                  }}
                >
                  Spanning 758 sq km of rich teak and mixed deciduous forest along the Pench
                  River in Central India. From core river valleys to buffer fringe corridors,
                  Pench harbors thriving tiger populations and rich wildlife corridors.
                </p>

                <p
                  style={{
                    color: "var(--lewa-muted)",
                    fontSize: "12.5px",
                    lineHeight: "1.5",
                    marginBottom: "16px",
                  }}
                >
                  Supports 20 camera trap stations, automated blank triage, stripe biometric
                  re-identification, and intelligent patrol priority recommendation scoring.
                </p>

                {/* Live Stats 2x2 Grid */}
                {summary && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      background: "#ffffff",
                      padding: "16px 20px",
                      borderRadius: "12px",
                      boxShadow: "0 6px 24px rgba(21,17,13,0.06)",
                      border: "1px solid rgba(21,17,13,0.06)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "26px",
                          fontWeight: 700,
                          color: "var(--lewa-terracotta)",
                          lineHeight: 1,
                        }}
                      >
                        {summary.tigers_identified}
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          color: "var(--lewa-muted)",
                          fontWeight: 700,
                          marginTop: "3px",
                        }}
                      >
                        Resident Tigers Tracked
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "26px",
                          fontWeight: 700,
                          color: "var(--lewa-charcoal)",
                          lineHeight: 1,
                        }}
                      >
                        {summary.total_captures.toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          color: "var(--lewa-muted)",
                          fontWeight: 700,
                          marginTop: "3px",
                        }}
                      >
                        Camera Trap Captures
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "26px",
                          fontWeight: 700,
                          color: "var(--lewa-amber)",
                          lineHeight: 1,
                        }}
                      >
                        {summary.blanks_filtered}
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          color: "var(--lewa-muted)",
                          fontWeight: 700,
                          marginTop: "3px",
                        }}
                      >
                        Empty Blanks Filtered
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "26px",
                          fontWeight: 700,
                          color: "var(--lewa-charcoal)",
                          lineHeight: 1,
                        }}
                      >
                        {summary.saved_mb} MB
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          color: "var(--lewa-muted)",
                          fontWeight: 700,
                          marginTop: "3px",
                        }}
                      >
                        Storage Saved (Offline)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Custom Pench National Park Zonal & Corridor Map */}
            <div className="lewa-split-right" style={{ justifyContent: "center", alignItems: "center" }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 12px 36px rgba(21,17,13,0.1)",
                  border: "1px solid var(--lewa-border)",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Compass size={18} color="var(--lewa-terracotta)" />
                    <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--lewa-charcoal)" }}>
                      PENCH NATIONAL PARK MAP
                    </span>
                  </div>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--lewa-forest-light)", background: "rgba(42,90,66,0.1)", padding: "3px 8px", borderRadius: "12px" }}>
                    758 SQ KM PROTECTED
                  </span>
                </div>

                {/* Stylized SVG Map of Pench Tiger Reserve with Core, Buffer, Pench River, and Stations */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "250px",
                    background: "linear-gradient(135deg, #1C3829 0%, #152A1E 100%)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <svg viewBox="0 0 400 240" style={{ width: "100%", height: "100%" }}>
                    <defs>
                      <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
                      </linearGradient>
                      <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      </pattern>
                    </defs>

                    {/* Background Grid */}
                    <rect width="400" height="240" fill="url(#gridPattern)" />

                    {/* Buffer Zone Boundary Polygon */}
                    <polygon
                      points="30,30 370,25 380,215 25,220"
                      fill="rgba(226, 136, 22, 0.12)"
                      stroke="#E28816"
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                    />

                    {/* Core Tiger Reserve Zone Polygon */}
                    <polygon
                      points="70,55 330,50 340,185 60,190"
                      fill="rgba(34, 197, 94, 0.18)"
                      stroke="#22c55e"
                      strokeWidth="2"
                    />

                    {/* Pench River Meander */}
                    <path
                      d="M 180,20 Q 220,70 190,120 T 210,180 T 170,230"
                      fill="none"
                      stroke="url(#riverGrad)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <text x="215" y="105" fill="#93C5FD" fontSize="9" fontWeight="700" letterSpacing="1">
                      PENCH RIVER
                    </text>

                    {/* Totladoh Reservoir Area */}
                    <ellipse cx="190" cy="40" rx="22" ry="12" fill="#3B82F6" fillOpacity="0.4" />
                    <text x="145" y="44" fill="#BFDBFE" fontSize="7.5" fontWeight="600">
                      Totladoh Lake
                    </text>

                    {/* Zone Labels */}
                    <text x="80" y="80" fill="#86EFAC" fontSize="10" fontWeight="800" letterSpacing="1">
                      CORE ZONE (411 km²)
                    </text>
                    <text x="40" y="210" fill="#FDBA74" fontSize="9" fontWeight="700" letterSpacing="0.8">
                      BUFFER ECO-CORRIDOR (347 km²)
                    </text>

                    {/* Key Gates */}
                    <circle cx="85" cy="180" r="4" fill="#F59E0B" />
                    <text x="93" y="183" fill="#ffffff" fontSize="8" fontWeight="600">
                      Touria Gate
                    </text>

                    <circle cx="315" cy="70" r="4" fill="#F59E0B" />
                    <text x="245" y="73" fill="#ffffff" fontSize="8" fontWeight="600">
                      Khursapar Gate
                    </text>

                    {/* Camera Trap Station Markers */}
                    {[
                      { x: 110, y: 100, id: "ST-01" },
                      { x: 140, y: 130, id: "ST-03" },
                      { x: 260, y: 90, id: "ST-07" },
                      { x: 280, y: 140, id: "ST-09" },
                      { x: 160, y: 160, id: "ST-14" },
                      { x: 310, y: 160, id: "ST-17" },
                    ].map((st, i) => (
                      <g key={st.id}>
                        <circle cx={st.x} cy={st.y} r="5" fill="#EF4444" stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx={st.x} cy={st.y} r="8" fill="#EF4444" fillOpacity="0.3">
                          <animate attributeName="r" values="5;10;5" dur="2.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                        <text x={st.x + 8} y={st.y + 3} fill="#ffffff" fontSize="7.5" fontWeight="700">
                          {st.id}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>

                {/* Zonal Key Badges */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "12px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--lewa-body)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
                    Core Protected Forest
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--lewa-body)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#E28816" }} />
                    Buffer Eco-Corridor
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--lewa-body)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }} />
                    20 Active Stations
                  </div>
                </div>

                {/* Action Link to Full Interactive Map */}
                <Link
                  href="/map"
                  className="btn-brush"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "9px",
                    fontSize: "11px",
                    textDecoration: "none",
                    textAlign: "center",
                  }}
                >
                  OPEN INTERACTIVE TERRITORY MAP <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Floating Navigation Dots (Panel Selectors) */}
      {!isMobile && (
        <div className="slideshow-nav-dots">
          {PANEL_LABELS.map((panel, idx) => (
            <button
              key={panel.id}
              onClick={() => navigateToPanel(idx)}
              className={`slideshow-dot ${activePanel === idx ? "active" : ""}`}
              title={`Jump to ${panel.label}`}
            >
              <span className="slideshow-dot-number">{panel.num}</span>
              <span>{panel.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}

      {/* Floating Side Arrows */}
      {!isMobile && activePanel > 0 && (
        <button
          onClick={() => navigateToPanel(activePanel - 1)}
          className="slideshow-arrow slideshow-arrow-left"
          title="Previous Panel"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {!isMobile && activePanel < PANEL_LABELS.length - 1 && (
        <button
          onClick={() => navigateToPanel(activePanel + 1)}
          className="slideshow-arrow slideshow-arrow-right"
          title="Next Panel"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Bottom Left Social Icons */}
      <div className="lewa-socials">
        <span style={{ cursor: "pointer", fontWeight: 700 }}>FB</span>
        <span style={{ cursor: "pointer", fontWeight: 700 }}>IG</span>
        <span style={{ cursor: "pointer", fontWeight: 700 }}>X</span>
        <span style={{ cursor: "pointer", fontWeight: 700 }}>YT</span>
      </div>

      {/* Bottom Right Audio Toggle */}
      <button
        onClick={toggleSound}
        className="lewa-sound-toggle"
        title={isMuted ? "Unmute Ambient Sound" : "Mute Sound"}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
}
