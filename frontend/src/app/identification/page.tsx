"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import LewaNav from "@/components/LewaNav";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PawPrint,
  Sparkles,
  ShieldCheck,
  MapPin,
  Clock,
  Activity,
  Film,
  Video,
  AlertTriangle,
} from "lucide-react";
import {
  identifyTiger,
  listTigers,
  getTiger,
  getReviewQueue,
  resolveReview,
  uploadVideo,
} from "@/lib/api";

interface Tiger {
  tiger_id: string;
  name: string;
  sex: string;
  total_captures: number;
  last_seen: string | null;
  last_station: string | null;
}

interface TigerDetail {
  tiger_id: string;
  name: string;
  sex: string;
  total_captures: number;
  captures: Array<{
    station_id: string;
    timestamp: string;
    zone: string;
    image: string;
    lat: number;
    lon: number;
    confidence: number;
  }>;
}

interface ReviewItem {
  id: number;
  image_path: string;
  station_id: string;
  timestamp: string;
  top_match_id: string;
  top_match_confidence: number;
  alt_match_id: string;
  alt_match_confidence: number;
}

interface IDResult {
  status: string;
  top_match: { tiger_id: string; confidence: number };
  alt_match: { tiger_id: string; confidence: number };
  all_scores: Array<{ tiger_id: string; confidence: number }>;
}

const TIGER_CLASSIFICATION_NAMES: Record<string, string> = {
  "PTR-T01": "Choti Tara",
  "PTR-T02": "Baagh Raja",
  "PTR-T03": "Kanha",
  "PTR-T04": "Sundari",
  "PTR-T05": "Shiv",
  "PTR-T06": "Pari",
};

const TIGER_COLORS: Record<string, string> = {
  "PTR-T01": "#F97316",
  "PTR-T02": "#3B82F6",
  "PTR-T03": "#10B981",
  "PTR-T04": "#A855F7",
  "PTR-T05": "#F59E0B",
  "PTR-T06": "#EF4444",
};

const TIGER_IMAGES: Record<string, string> = {
  "PTR-T03": "/kanha-avatar.jpg",
};

export default function IdentificationPage() {
  const [tigers, setTigers] = useState<Tiger[]>([]);
  const [selectedTigerId, setSelectedTigerId] = useState<string>("PTR-T01");
  const [tigerDetail, setTigerDetail] = useState<TigerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [idResult, setIdResult] = useState<IDResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<"identify" | "tigers" | "review" | "video">("identify");

  // Video Manager State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoSuccessMsg, setVideoSuccessMsg] = useState<string | null>(null);
  const [videoErrorMsg, setVideoErrorMsg] = useState<string | null>(null);
  const [videoDragOver, setVideoDragOver] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setVideoErrorMsg("Please select a valid video file (.mp4, .webm, .mov)");
      return;
    }
    setVideoErrorMsg(null);
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setVideoDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleVideoSelect(file);
  };

  const handleVideoUpload = async () => {
    if (!videoFile) return;
    setVideoUploading(true);
    setVideoErrorMsg(null);
    setVideoSuccessMsg(null);

    try {
      const res = await uploadVideo(videoFile);
      setVideoSuccessMsg(`Video "${res.filename}" (${res.size_mb} MB) uploaded successfully and applied to background!`);
    } catch (err: unknown) {
      setVideoErrorMsg(err instanceof Error ? err.message : "Failed to upload video");
    } finally {
      setVideoUploading(false);
    }
  };

  useEffect(() => {
    listTigers().then(setTigers).catch(console.error);
    getReviewQueue().then(setQueue).catch(console.error);
  }, []);

  // Fetch capture log for selected tiger
  useEffect(() => {
    if (selectedTigerId) {
      setLoadingDetail(true);
      getTiger(selectedTigerId)
        .then(setTigerDetail)
        .catch(console.error)
        .finally(() => setLoadingDetail(false));
    }
  }, [selectedTigerId]);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setIdResult(null);
    try {
      const res = await identifyTiger(file);
      setIdResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleResolve = async (id: number, action: string) => {
    await resolveReview(id, action);
    setQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    auto_matched: {
      color: "var(--lewa-terracotta)",
      icon: <CheckCircle2 size={20} />,
      label: "Auto-Matched (High Confidence)",
    },
    ambiguous: {
      color: "var(--lewa-amber)",
      icon: <HelpCircle size={20} />,
      label: "Ambiguous — Queued for Ranger Review",
    },
    new_individual: {
      color: "var(--lewa-gold)",
      icon: <Sparkles size={20} />,
      label: "Potential New Individual Discovered",
    },
    not_a_tiger: {
      color: "var(--lewa-muted)",
      icon: <AlertCircle size={20} />,
      label: "Non-Tiger Species Filtered",
    },
  };

  return (
    <>
      <LewaNav forceScrolled={true} />

      <main
        style={{
          marginTop: "90px",
          padding: "48px 6vw",
          minHeight: "calc(100vh - 90px)",
          background: "var(--lewa-cream)",
          color: "var(--lewa-charcoal)",
        }}
      >
        {/* Page Title Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "36px",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "var(--lewa-terracotta)",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Part 2 · Computer Vision Pipeline
            </div>
            <h1 className="lewa-title-section" style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
              Tiger <span className="font-italic">Identification</span> &amp; Re-ID
            </h1>
            <p style={{ color: "var(--lewa-body)", fontSize: "15px", marginTop: "8px", maxWidth: "700px" }}>
              MobileNetV3 species gating combined with ResNet-18 256-dimensional flank stripe embedding vectors for high-precision individual recognition.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "36px", flexWrap: "wrap" }}>
          {(["identify", "tigers", "review", "video"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "10px 24px",
                borderRadius: "40px",
                border: "1px solid",
                borderColor: tab === t ? "var(--lewa-terracotta)" : "var(--lewa-border)",
                background: tab === t ? "var(--lewa-terracotta)" : "transparent",
                color: tab === t ? "#fff" : "var(--lewa-charcoal)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: tab === t ? "0 4px 14px rgba(184, 71, 40, 0.3)" : "none",
              }}
            >
              {t === "identify" && "Flank Image Re-ID"}
              {t === "tigers" && `Registered Tigers (${tigers.length})`}
              {t === "review" && `Review Queue (${queue.length})`}
              {t === "video" && "Video Manager"}
            </button>
          ))}
        </div>

        {/* TAB 1: IDENTIFY FLANK IMAGE */}
        {tab === "identify" && (
          <div style={{ maxWidth: "900px" }}>
            <div
              className={`lewa-dropzone ${dragOver ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) handleFile(f);
                };
                input.click();
              }}
              style={{
                background: "#ffffff",
                border: dragOver ? "2px dashed var(--lewa-terracotta)" : "2px dashed rgba(200, 82, 32, 0.35)",
                borderRadius: "20px",
                padding: "64px 32px",
                textAlign: "center",
                cursor: "pointer",
                boxShadow: dragOver ? "0 12px 36px rgba(200, 82, 32, 0.12)" : "0 8px 30px rgba(28,23,18,0.04)",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {uploading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      border: "3px solid var(--lewa-border)",
                      borderTopColor: "var(--lewa-terracotta)",
                      animation: "spin 0.8s linear infinite",
                      margin: "0 auto 20px",
                    }}
                  />
                  <p style={{ color: "var(--lewa-charcoal)", fontWeight: 700, fontSize: "17px", margin: "0 0 6px" }}>
                    Extracting Flank Stripe Biometrics...
                  </p>
                  <p style={{ color: "var(--lewa-muted)", fontSize: "13px", margin: 0 }}>
                    Generating 256-dimensional embedding vector via ResNet-18
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  {/* Glowing Circular Icon Container */}
                  <div
                    style={{
                      width: "76px",
                      height: "76px",
                      borderRadius: "50%",
                      background: "rgba(200, 82, 32, 0.08)",
                      border: "1.5px solid rgba(200, 82, 32, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "20px",
                      boxShadow: "0 6px 20px rgba(200, 82, 32, 0.08)",
                    }}
                  >
                    <Upload
                      size={32}
                      style={{ color: "var(--lewa-terracotta)", display: "block" }}
                    />
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "24px",
                      fontWeight: 600,
                      color: "var(--lewa-charcoal)",
                      margin: "0 0 8px",
                    }}
                  >
                    Upload a tiger flank image
                  </h3>
                  <p
                    style={{
                      color: "var(--lewa-muted)",
                      fontSize: "14px",
                      maxWidth: "480px",
                      margin: "0 auto 16px",
                      lineHeight: "1.6",
                    }}
                  >
                    Drag &amp; drop a cropped flank capture, or click to browse files from your computer.
                  </p>

                  <div
                    style={{
                      display: "inline-flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        background: "var(--lewa-paper)",
                        border: "1px solid var(--lewa-border)",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        color: "var(--lewa-muted)",
                      }}
                    >
                      JPG · PNG · WebP
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        background: "rgba(16, 185, 129, 0.08)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        color: "#10b981",
                      }}
                    >
                      Automated Stripe Matching
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Inference Results Card */}
            {idResult && (
              <div
                style={{
                  marginTop: "32px",
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "32px",
                  boxShadow: "0 8px 30px rgba(28,23,18,0.06)",
                  border: "1px solid var(--lewa-border)",
                }}
              >
                {/* Result Header Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "24px",
                    paddingBottom: "16px",
                    borderBottom: "1px solid var(--lewa-border-subtle)",
                    color: statusConfig[idResult.status]?.color || "var(--lewa-charcoal)",
                  }}
                >
                  {statusConfig[idResult.status]?.icon}
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600 }}>
                    {statusConfig[idResult.status]?.label}
                  </span>
                </div>

                {/* Top Match & Alt Match Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "32px",
                  }}
                >
                  {/* Top Match Card */}
                  <div
                    style={{
                      background: "var(--lewa-ivory)",
                      borderRadius: "12px",
                      padding: "24px",
                      border: "1px solid var(--lewa-border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: "var(--lewa-terracotta)",
                        fontWeight: 700,
                        marginBottom: "8px",
                      }}
                    >
                      Top Match Class
                    </div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: "26px", fontWeight: 700 }}>
                      {TIGER_CLASSIFICATION_NAMES[idResult.top_match.tiger_id] || idResult.top_match.tiger_id}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--lewa-muted)", marginBottom: "12px" }}>
                      ID: <code>{idResult.top_match.tiger_id}</code>
                    </div>

                    <div
                      style={{
                        height: "8px",
                        background: "rgba(28,23,18,0.1)",
                        borderRadius: "4px",
                        overflow: "hidden",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: `${idResult.top_match.confidence * 100}%`,
                          height: "100%",
                          background: "var(--lewa-terracotta)",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--lewa-charcoal)" }}>
                      {(idResult.top_match.confidence * 100).toFixed(1)}% Cosine Similarity
                    </div>
                  </div>

                  {/* Alt Match Card */}
                  <div
                    style={{
                      background: "var(--lewa-ivory)",
                      borderRadius: "12px",
                      padding: "24px",
                      border: "1px solid var(--lewa-border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: "var(--lewa-amber)",
                        fontWeight: 700,
                        marginBottom: "8px",
                      }}
                    >
                      Runner-up Match
                    </div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: "26px", fontWeight: 700 }}>
                      {TIGER_CLASSIFICATION_NAMES[idResult.alt_match.tiger_id] || idResult.alt_match.tiger_id}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--lewa-muted)", marginBottom: "12px" }}>
                      ID: <code>{idResult.alt_match.tiger_id}</code>
                    </div>

                    <div
                      style={{
                        height: "8px",
                        background: "rgba(28,23,18,0.1)",
                        borderRadius: "4px",
                        overflow: "hidden",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: `${idResult.alt_match.confidence * 100}%`,
                          height: "100%",
                          background: "var(--lewa-amber)",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--lewa-charcoal)" }}>
                      {(idResult.alt_match.confidence * 100).toFixed(1)}% Cosine Similarity
                    </div>
                  </div>
                </div>

                {/* All Gallery Embeddings Scores */}
                {idResult.all_scores && idResult.all_scores.length > 0 && (
                  <div>
                    <h4
                      style={{
                        fontSize: "13px",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "var(--lewa-muted)",
                        marginBottom: "16px",
                        fontWeight: 700,
                      }}
                    >
                      Cosine Similarity Across Registered Gallery Classes
                    </h4>

                    {idResult.all_scores.map((s) => (
                      <div
                        key={s.tiger_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          marginBottom: "10px",
                        }}
                      >
                        <div style={{ width: "160px", fontSize: "13px", fontWeight: 600 }}>
                          {TIGER_CLASSIFICATION_NAMES[s.tiger_id] || s.tiger_id}{" "}
                          <span style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>({s.tiger_id})</span>
                        </div>

                        <div
                          style={{
                            flex: 1,
                            height: "6px",
                            background: "rgba(28,23,18,0.08)",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${s.confidence * 100}%`,
                              height: "100%",
                              background:
                                s.tiger_id === idResult.top_match.tiger_id
                                  ? "var(--lewa-terracotta)"
                                  : "var(--lewa-light)",
                              borderRadius: "3px",
                            }}
                          />
                        </div>

                        <span style={{ fontSize: "12px", fontWeight: 600, width: "60px", textAlign: "right" }}>
                          {(s.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REGISTERED TIGERS & DETAILED CAPTURE LOGS */}
        {tab === "tigers" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "320px 1fr",
              gap: "28px",
              alignItems: "start",
            }}
          >
            {/* Left Column: Identified Individuals Selection List */}
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 8px 30px rgba(28,23,18,0.05)",
                border: "1px solid var(--lewa-border)",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "var(--lewa-muted)",
                  fontWeight: 700,
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <PawPrint size={14} style={{ color: "var(--lewa-terracotta)" }} />
                Identified Individuals ({tigers.length})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {tigers.map((t) => {
                  const isSelected = t.tiger_id === selectedTigerId;
                  const color = TIGER_COLORS[t.tiger_id] || "var(--lewa-terracotta)";
                  return (
                    <div
                      key={t.tiger_id}
                      onClick={() => setSelectedTigerId(t.tiger_id)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: isSelected ? "var(--lewa-paper)" : "transparent",
                        border: `1px solid ${isSelected ? color : "var(--lewa-border-subtle)"}`,
                        cursor: "pointer",
                        transition: "all 0.25s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        boxShadow: isSelected ? `0 4px 16px ${color}20` : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: `${color}18`,
                            border: `1px solid ${color}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          {TIGER_IMAGES[t.tiger_id] ? (
                            <Image
                              src={TIGER_IMAGES[t.tiger_id]}
                              alt={t.name}
                              width={36}
                              height={36}
                              style={{ objectFit: "cover", borderRadius: "50%" }}
                            />
                          ) : (
                            <PawPrint size={18} style={{ color: color }} />
                          )}
                        </div>

                        <div>
                          <div
                            style={{
                              fontFamily: "var(--font-serif)",
                              fontSize: "16px",
                              fontWeight: 700,
                              color: isSelected ? "var(--lewa-charcoal)" : "var(--lewa-body)",
                            }}
                          >
                            {t.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>
                            <code>{t.tiger_id}</code> • {t.sex}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--lewa-charcoal)" }}>
                          {t.total_captures} caps
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "var(--lewa-terracotta)",
                            textTransform: "uppercase",
                          }}
                        >
                          Active
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Selected Individual Profile Header & Capture Log Table */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Selected Tiger Header Card */}
              {tigerDetail && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    padding: "28px 32px",
                    boxShadow: "0 8px 30px rgba(28,23,18,0.06)",
                    border: "1px solid var(--lewa-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          background: `${TIGER_COLORS[tigerDetail.tiger_id] || "var(--lewa-terracotta)"}20`,
                          border: `2px solid ${TIGER_COLORS[tigerDetail.tiger_id] || "var(--lewa-terracotta)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "26px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          overflow: "hidden",
                        }}
                      >
                        {TIGER_IMAGES[tigerDetail.tiger_id] ? (
                          <Image
                            src={TIGER_IMAGES[tigerDetail.tiger_id]}
                            alt={tigerDetail.name}
                            width={56}
                            height={56}
                            style={{ objectFit: "cover", borderRadius: "50%" }}
                          />
                        ) : (
                          <PawPrint size={26} style={{ color: TIGER_COLORS[tigerDetail.tiger_id] || "var(--lewa-terracotta)" }} />
                        )}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", margin: 0 }}>
                            {tigerDetail.name}
                          </h2>
                          <span
                            style={{
                              background: "var(--lewa-paper)",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--lewa-terracotta)",
                              border: "1px solid var(--lewa-border)",
                            }}
                          >
                            ID: {tigerDetail.tiger_id}
                          </span>
                        </div>

                        <div style={{ fontSize: "14px", color: "var(--lewa-muted)", marginTop: "4px" }}>
                          Sex: <strong>{tigerDetail.sex}</strong> &bull; Total Captures:{" "}
                          <strong>{tigerDetail.total_captures}</strong>
                        </div>
                      </div>
                    </div>

                    {tigerDetail.captures && tigerDetail.captures.length > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>
                          Last Seen
                        </div>
                        <div style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 700, color: "var(--lewa-terracotta)" }}>
                          {new Date(tigerDetail.captures[0].timestamp).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>
                          Station: <code>{tigerDetail.captures[0].station_id}</code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Detailed Capture Log Table */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "28px 32px",
                  boxShadow: "0 8px 30px rgba(28,23,18,0.05)",
                  border: "1px solid var(--lewa-border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Activity size={18} style={{ color: "var(--lewa-terracotta)" }} />
                    <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", margin: 0 }}>
                      Capture Log ({tigerDetail?.captures?.length || 0})
                    </h3>
                  </div>
                </div>

                {loadingDetail ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "var(--lewa-muted)" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        border: "3px solid var(--lewa-border)",
                        borderTopColor: "var(--lewa-terracotta)",
                        animation: "spin 0.8s linear infinite",
                        margin: "0 auto 12px",
                      }}
                    />
                    Loading capture history...
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", maxHeight: "500px", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr
                          style={{
                            position: "sticky",
                            top: 0,
                            background: "#fff",
                            borderBottom: "2px solid var(--lewa-border)",
                            fontSize: "11px",
                            textTransform: "uppercase",
                            letterSpacing: "1.5px",
                            color: "var(--lewa-muted)",
                            zIndex: 5,
                          }}
                        >
                          <th style={{ padding: "12px 10px" }}>Station</th>
                          <th style={{ padding: "12px 10px" }}>Zone</th>
                          <th style={{ padding: "12px 10px" }}>Lat</th>
                          <th style={{ padding: "12px 10px" }}>Lon</th>
                          <th style={{ padding: "12px 10px" }}>Timestamp</th>
                          <th style={{ padding: "12px 10px" }}>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tigerDetail?.captures?.map((cap, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid var(--lewa-border-subtle)",
                              fontSize: "13px",
                            }}
                          >
                            <td style={{ padding: "12px 10px" }}>
                              <code style={{ fontWeight: 700, color: "var(--lewa-terracotta)" }}>
                                {cap.station_id}
                              </code>
                            </td>
                            <td style={{ padding: "12px 10px" }}>
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  background: cap.zone === "core" ? "rgba(184,71,40,0.12)" : "rgba(200,134,46,0.12)",
                                  color: cap.zone === "core" ? "var(--lewa-terracotta)" : "var(--lewa-amber)",
                                }}
                              >
                                {cap.zone}
                              </span>
                            </td>
                            <td style={{ padding: "12px 10px", fontFamily: "monospace" }}>
                              {cap.lat?.toFixed(4)}
                            </td>
                            <td style={{ padding: "12px 10px", fontFamily: "monospace" }}>
                              {cap.lon?.toFixed(4)}
                            </td>
                            <td style={{ padding: "12px 10px", color: "var(--lewa-body)" }}>
                              {new Date(cap.timestamp).toLocaleString()}
                            </td>
                            <td style={{ padding: "12px 10px" }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color:
                                    cap.confidence >= 0.9
                                      ? "#10B981"
                                      : cap.confidence >= 0.85
                                      ? "#F59E0B"
                                      : "var(--lewa-muted)",
                                }}
                              >
                                {(cap.confidence * 100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HUMAN REVIEW QUEUE */}
        {tab === "review" && (
          <div style={{ maxWidth: "900px" }}>
            {queue.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "60px 32px",
                  textAlign: "center",
                  boxShadow: "0 8px 30px rgba(28,23,18,0.04)",
                  border: "1px solid var(--lewa-border)",
                }}
              >
                <ShieldCheck size={48} style={{ color: "var(--lewa-terracotta)", marginBottom: "16px", opacity: 0.6 }} />
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "22px", marginBottom: "8px" }}>
                  Review Queue Empty
                </h3>
                <p style={{ color: "var(--lewa-muted)", fontSize: "14px" }}>
                  All ambiguous Re-ID matches have been reviewed by forest department rangers.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {queue.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "#fff",
                      borderRadius: "16px",
                      padding: "24px 32px",
                      boxShadow: "0 8px 30px rgba(28,23,18,0.06)",
                      border: "1px solid var(--lewa-border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                      <div>
                        <div
                          style={{
                            fontSize: "11px",
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                            color: "var(--lewa-amber)",
                            fontWeight: 700,
                            marginBottom: "6px",
                          }}
                        >
                          Ambiguous Re-ID Match — Ranger Confirmation Required
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--lewa-muted)" }}>
                          Station: <code>{item.station_id}</code> • {new Date(item.timestamp).toLocaleString()}
                        </div>

                        <div style={{ display: "flex", gap: "32px", marginTop: "20px" }}>
                          <div>
                            <div style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>Top Candidate</div>
                            <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 700 }}>
                              {TIGER_CLASSIFICATION_NAMES[item.top_match_id] || item.top_match_id}
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--lewa-terracotta)" }}>
                              {(item.top_match_confidence * 100).toFixed(1)}% match
                            </div>
                          </div>

                          <div style={{ width: "1px", background: "var(--lewa-border)" }} />

                          <div>
                            <div style={{ fontSize: "11px", color: "var(--lewa-muted)" }}>Alternative Candidate</div>
                            <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 700 }}>
                              {TIGER_CLASSIFICATION_NAMES[item.alt_match_id] || item.alt_match_id}
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--lewa-amber)" }}>
                              {(item.alt_match_confidence * 100).toFixed(1)}% match
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <button
                          onClick={() => handleResolve(item.id, "confirm")}
                          className="btn-brush"
                        >
                          <CheckCircle2 size={14} /> CONFIRM TOP
                        </button>
                        <button
                          onClick={() => handleResolve(item.id, "new")}
                          className="btn-pill-light"
                        >
                          ENROLL NEW
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VIDEO MANAGER */}
        {tab === "video" && (
          <div style={{ maxWidth: "800px" }}>
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "36px",
                boxShadow: "0 8px 30px rgba(28,23,18,0.06)",
                border: "1px solid var(--lewa-border)",
              }}
            >
              <div style={{ marginBottom: "28px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    background: "rgba(184, 71, 40, 0.1)",
                    color: "var(--lewa-terracotta)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  <Film size={14} /> Field Video Telemetry
                </div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", margin: "4px 0 8px" }}>
                  Upload Video from Field Station or Laptop
                </h3>
                <p style={{ color: "var(--lewa-muted)", fontSize: "14px", lineHeight: "1.6" }}>
                  Upload high-definition camera trap MP4 or WebM video footage to update background telemetry and hero displays in real time.
                </p>
              </div>

              {!videoFile ? (
                <div
                  className={`lewa-dropzone ${videoDragOver ? "dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setVideoDragOver(true);
                  }}
                  onDragLeave={() => setVideoDragOver(false)}
                  onDrop={handleVideoDrop}
                  onClick={() => videoInputRef.current?.click()}
                  style={{
                    padding: "48px 24px",
                    border: "2px dashed var(--lewa-border)",
                    borderRadius: "14px",
                    textAlign: "center",
                    background: "var(--lewa-cream)",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                >
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/mp4,video/webm,video/quicktime"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleVideoSelect(f);
                    }}
                  />
                  <Video
                    size={48}
                    style={{ color: "var(--lewa-terracotta)", margin: "0 auto 12px" }}
                  />
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "19px", fontWeight: 600, marginBottom: "6px" }}>
                    Drag &amp; drop field video here, or browse files
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>
                    Supports MP4, WebM, MOV up to 200MB
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      borderRadius: "12px",
                      overflow: "hidden",
                      maxHeight: "320px",
                      background: "#000",
                      marginBottom: "20px",
                    }}
                  >
                    {videoPreviewUrl && (
                      <video
                        src={videoPreviewUrl}
                        controls
                        autoPlay
                        muted
                        style={{ width: "100%", maxHeight: "320px", objectFit: "contain" }}
                      />
                    )}
                  </div>

                  <div style={{ fontSize: "14px", color: "var(--lewa-charcoal)", marginBottom: "20px", fontWeight: 600 }}>
                    {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      className="btn-brush"
                      onClick={handleVideoUpload}
                      disabled={videoUploading}
                    >
                      {videoUploading ? "Uploading & Processing..." : "APPLY AS HERO VIDEO"}
                    </button>
                    <button
                      className="btn-pill-light"
                      onClick={() => {
                        setVideoFile(null);
                        setVideoPreviewUrl(null);
                      }}
                      disabled={videoUploading}
                    >
                      Choose Different Video
                    </button>
                  </div>
                </div>
              )}

              {videoErrorMsg && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px",
                    borderRadius: "8px",
                    background: "rgba(184, 71, 40, 0.1)",
                    color: "var(--lewa-terracotta)",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} /> {videoErrorMsg}
                </div>
              )}

              {videoSuccessMsg && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} /> {videoSuccessMsg}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
