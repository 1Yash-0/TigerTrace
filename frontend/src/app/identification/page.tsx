"use client";

import { useState, useEffect, useRef } from "react";
import LewaNav from "@/components/LewaNav";
import SdCardImportPanel from "@/components/SdCardImportPanel";
import { analyzePipeline, listTigers, getReviewQueue, getCameraStations, getPublicImageUrl } from "@/lib/api";
import type { PipelineResult, CameraStationInfo } from "@/lib/api";
import { tigerColor } from "@/lib/tigerColor";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Upload, Search, CheckCircle2, XCircle, Loader2, PawPrint,
  Sparkles, AlertCircle, ChevronDown, ChevronUp, ArrowRight, RotateCcw, ScanSearch,
  FolderOpen, Ban,
} from "lucide-react";

interface Tiger {
  tiger_id: string;
  name: string;
  sex: string;
  total_captures: number;
  last_seen: string | null;
  last_station: string | null;
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

interface BatchFileResult {
  name: string;
  outcome: string;
  tiger: string | null;
  conf: number | null;
}

// (tiger colors are generated per-ID — see lib/tigerColor)

// A stage lights up when the backend reports it (or once it is the current step)
type StepState = "pending" | "active" | "done" | "skipped";

export default function IdentificationPage() {
  const { t, language } = useLanguage();
  const [tigers, setTigers] = useState<Tiger[]>([]);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [showTigers, setShowTigers] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Upload flow
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [steps, setSteps] = useState<Record<string, StepState>>({});

  // Folder (batch) upload state
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [folderInputRef] = useState(() => ({ current: null as HTMLInputElement | null }));
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchCancel, setBatchCancel] = useState(false);
  const [batch, setBatch] = useState<{
    processed: number; matched: number; review: number; newTiger: number;
    notTiger: number; blank: number; errors: number; current: string; done: boolean;
  } | null>(null);
  const [batchResults, setBatchResults] = useState<BatchFileResult[]>([]);
  const [stations, setStations] = useState<CameraStationInfo[]>([]);
  const [batchStation, setBatchStation] = useState<string>("");
  const batchCancelRef = useRef(false);

  useEffect(() => {
    listTigers().then(setTigers).catch(console.error);
    getReviewQueue().then(setQueue).catch(console.error);
    getCameraStations().then(setStations).catch(console.error);
  }, []);

  const handleFileSelect = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError(language === "hi" ? "कृपया एक छवि फ़ाइल चुनें (JPG, PNG, WebP)" :
              language === "mr" ? "कृपया प्रतिमा फाइल निवडा (JPG, PNG, WebP)" :
              "Please select an image file (JPG, PNG, WebP)");
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const runAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    // Stepper: stage 1 activates immediately, later stages activate as results land
    setSteps({ blank: "active", species: "pending", reid: "pending", result: "pending" });
    try {
      const res = await analyzePipeline(file);
      const s = res.stages;
      const next: Record<string, StepState> = { blank: "done" };
      if (s.blank_filter && !s.blank_filter.has_animal) {
        next.species = "skipped"; next.reid = "skipped"; next.result = "skipped";
      } else if (s.species_gate && !s.species_gate.is_tiger) {
        next.species = "done"; next.reid = "skipped"; next.result = "skipped";
      } else {
        next.species = "done"; next.reid = "done"; next.result = "done";
      }
      setSteps(next);
      setResult(res);
      // Refresh counts behind the scenes
      listTigers().then(setTigers).catch(() => {});
      getReviewQueue().then(setQueue).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setSteps({});
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setSteps({});
  };

  // ── Folder (batch) processing: sequential analyze calls with live progress ──
  const handleFolderSelect = (fileList: FileList | null) => {
    if (!fileList) return;
    const imgs = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    setFolderFiles(imgs);
    setBatchResults([]);
    setBatch(null);
    setBatchCancel(false);
    batchCancelRef.current = false;
  };

  const runFolderBatch = async () => {
    if (folderFiles.length === 0) return;
    setBatchRunning(true);
    setBatchCancel(false);
    batchCancelRef.current = false;
    setBatchResults([]);
    setBatch({
      processed: 0, matched: 0, review: 0, newTiger: 0,
      notTiger: 0, blank: 0, errors: 0, current: "", done: false,
    });
    const counters = { matched: 0, review: 0, newTiger: 0, notTiger: 0, blank: 0, errors: 0 };
    const results: BatchFileResult[] = [];

    for (let i = 0; i < folderFiles.length; i++) {
      if (batchCancelRef.current) break;
      const f = folderFiles[i];
      setBatch((b) => (b ? { ...b, current: f.name } : b));
      try {
        const res = await analyzePipeline(f, batchStation || "ST-01");
        const outcome = res.final.outcome;
        if (outcome === "matched") counters.matched++;
        else if (outcome === "review") counters.review++;
        else if (outcome === "new_tiger") counters.newTiger++;
        else if (outcome === "not_a_tiger") counters.notTiger++;
        else if (outcome === "blank") counters.blank++;
        results.push({
          name: f.name, outcome,
          tiger: res.final.tiger_id, conf: res.final.confidence,
        });
      } catch {
        counters.errors++;
        results.push({ name: f.name, outcome: "error", tiger: null, conf: null });
      }
      setBatchResults([...results]);
      setBatch((b) => (b ? { ...b, ...counters, processed: i + 1 } : b));
    }

    setBatch((b) => (b ? { ...b, done: true, current: "" } : b));
    setBatchRunning(false);
    // Refresh counts behind the scenes
    listTigers().then(setTigers).catch(() => {});
    getReviewQueue().then(setQueue).catch(() => {});
  };

  const resetFolder = () => {
    setFolderFiles([]);
    setBatch(null);
    setBatchResults([]);
    setBatchRunning(false);
    setBatchCancel(false);
    batchCancelRef.current = false;
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const outcomeMeta = (outcome: string) => {
    switch (outcome) {
      case "matched": return { label: t.unified_outcome_matched, color: "#10B981", icon: <CheckCircle2 size={22} /> };
      case "review": return { label: t.unified_outcome_review, color: "#B87140", icon: <AlertCircle size={22} /> };
      case "new_tiger": return { label: t.unified_outcome_new_tiger, color: "#A855F7", icon: <Sparkles size={22} /> };
      case "not_a_tiger": return { label: t.unified_outcome_not_a_tiger, color: "#EF4444", icon: <XCircle size={22} /> };
      default: return { label: t.unified_outcome_blank, color: "var(--lewa-muted)", icon: <ScanSearch size={22} /> };
    }
  };

  const stepDefs = [
    { key: "blank", label: t.unified_step_blank, desc: t.unified_step_blank_desc },
    { key: "species", label: t.unified_step_species, desc: t.unified_step_species_desc },
    { key: "reid", label: t.unified_step_reid, desc: t.unified_step_reid_desc },
    { key: "result", label: t.unified_step_result, desc: t.unified_step_result_desc },
  ];

  const meta = result ? outcomeMeta(result.final.outcome) : null;

  return (
    <>
      <LewaNav />

      <main style={{ marginTop: "90px", padding: "60px 7vw", maxWidth: "980px", margin: "90px auto 0" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: "var(--lewa-terracotta)", fontWeight: 700, marginBottom: "12px" }}>
            {t.unified_badge}
          </p>
          <h1 className="lewa-title-section">{t.unified_title}</h1>
          <p style={{ color: "var(--lewa-muted)", fontSize: "15px", maxWidth: "640px", margin: "16px auto 0" }}>
            {t.unified_subtitle}
          </p>
        </div>

        {/* ── Upload / Preview / Confirm ─────────────────────────────── */}
        {!result && !analyzing && (
          <div
            className={`lewa-dropzone ${dragOver ? "dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
            onClick={() => inputRef.current?.click()}
            style={{
              background: previewUrl ? "#fff" : "var(--lewa-cream)",
              border: "1.5px dashed #cbbfae",
              borderRadius: "14px",
              padding: previewUrl ? "24px" : "56px 24px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: "20px",
              position: "relative",
              display: previewUrl ? "flex" : "block",
              gap: "24px",
              alignItems: "center",
              justifyContent: previewUrl ? "flex-start" : "center",
              flexWrap: "wrap",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {!previewUrl ? (
              <>
                <Upload size={36} style={{ margin: "0 auto 14px", color: "var(--lewa-terracotta)" }} />
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", marginBottom: "6px" }}>{t.unified_upload_title}</h3>
                <p style={{ color: "var(--lewa-muted)", fontSize: "14px" }}>{t.unified_upload_desc}</p>
                <p style={{ color: "var(--lewa-muted)", fontSize: "11px", letterSpacing: "2px", marginTop: "14px" }}>{t.unified_upload_hint}</p>
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="upload preview"
                  style={{ width: "220px", height: "220px", objectFit: "cover", borderRadius: "10px" }}
                />
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--lewa-charcoal)", marginBottom: "16px", wordBreak: "break-all" }}>
                    {file?.name} ({file ? (file.size / 1024 / 1024).toFixed(1) : 0} MB)
                  </p>
                  <button
                    className="btn-brush"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                    onClick={async (e) => { e.stopPropagation(); await runAnalysis(); }}
                  >
                    <Search size={13} /> {t.unified_confirm_button}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(184,71,40,0.1)", color: "var(--lewa-terracotta)", fontSize: "14px", marginBottom: "24px" }}>
            {error}
          </div>
        )}

        {/* ── Folder upload (batch) ───────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(28,23,18,0.06)", padding: "28px 32px", marginBottom: "32px" }}>
          <input
            ref={(el) => { folderInputRef.current = el; }}
            type="file"
            multiple
            /* @ts-expect-error non-standard but universally supported directory picker attributes */
            webkitdirectory=""
            directory=""
            hidden
            onChange={(e) => handleFolderSelect(e.target.files)}
          />
          {!folderFiles.length && !batch && (
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "var(--lewa-cream)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lewa-terracotta)", flexShrink: 0 }}>
                <FolderOpen size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "18px", marginBottom: "4px" }}>{t.folder_pick}</h3>
                <p style={{ color: "var(--lewa-muted)", fontSize: "13px" }}>{t.folder_pick_desc}</p>
              </div>
              <button className="btn-brush" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }} onClick={() => folderInputRef.current?.click()}>
                <FolderOpen size={13} /> {t.folder_pick}
              </button>
            </div>
          )}

          {folderFiles.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                <span style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--lewa-charcoal)" }}>
                  <FolderOpen size={16} style={{ verticalAlign: "-3px", marginRight: "6px", color: "var(--lewa-terracotta)" }} />
                  {folderFiles.length} {t.folder_selected}
                </span>
                {batch?.done && (
                  <button className="btn-pill-light" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={resetFolder}>
                    <RotateCcw size={12} /> {t.folder_another}
                  </button>
                )}
              </div>

              {!batchRunning && !batch && (
                <div style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "12px", color: "var(--lewa-muted)", marginBottom: "10px" }}>
                    <CheckCircle2 size={12} style={{ verticalAlign: "-2px", color: "#10B981" }} /> {t.folder_auto_station}
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "var(--lewa-muted)" }}>{t.folder_pick_station}</span>
                    <select
                      value={batchStation}
                      onChange={(e) => setBatchStation(e.target.value)}
                      style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #d8cfc4", fontSize: "13px", background: "#fff" }}
                    >
                      <option value="">—</option>
                      {stations.map((s) => (
                        <option key={s.station_id} value={s.station_id}>
                          {s.station_id} ({s.beat})
                        </option>
                      ))}
                    </select>
                    <button className="btn-brush" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }} onClick={runFolderBatch}>
                      <ScanSearch size={13} /> {t.folder_process_btn}
                    </button>
                    <button className="btn-pill-light" onClick={resetFolder}>{t.folder_cancel}</button>
                  </div>
                </div>
              )}

              {(batchRunning || batch) && (
                <div style={{ border: "1px solid #e8e0d5", borderRadius: "10px", padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", flexWrap: "wrap", gap: "6px" }}>
                    <span style={{ fontWeight: 700, color: batch?.done ? "#10B981" : "var(--lewa-charcoal)" }}>
                      {batchRunning ? <Loader2 size={14} className="spin" style={{ verticalAlign: "-2px" }} /> : <CheckCircle2 size={14} style={{ verticalAlign: "-2px", color: "#10B981" }} />}
                      {" "}{batchRunning ? t.folder_processing : t.folder_done}
                    </span>
                    <span style={{ color: "var(--lewa-muted)" }}>
                      {batch?.processed}/{folderFiles.length} {t.folder_photos_word}
                      {batch?.current ? ` · ${batch.current}` : ""}
                    </span>
                  </div>
                  <div style={{ height: "10px", background: "var(--lewa-cream)", borderRadius: "5px", overflow: "hidden", marginBottom: "14px" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.round(((batch?.processed ?? 0) / Math.max(1, folderFiles.length)) * 100)}%`,
                      background: "var(--lewa-amber)", transition: "width 0.4s ease", borderRadius: "5px",
                    }} />
                  </div>
                  {batchRunning && (
                    <button className="btn-pill-light" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}
                      onClick={() => { batchCancelRef.current = true; setBatchCancel(true); }}>
                      <Ban size={12} /> {t.folder_cancel}
                    </button>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px" }}>
                    <div style={{ background: "var(--lewa-cream)", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "#10B981" }}>{batch?.matched}</div>
                      <div style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>{t.unified_outcome_matched}</div>
                    </div>
                    <div style={{ background: "var(--lewa-cream)", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "#B87140" }}>{batch?.review}</div>
                      <div style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>{t.unified_outcome_review}</div>
                    </div>
                    <div style={{ background: "var(--lewa-cream)", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "#A855F7" }}>{batch?.newTiger}</div>
                      <div style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>{t.unified_outcome_new_tiger}</div>
                    </div>
                    <div style={{ background: "var(--lewa-cream)", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "var(--lewa-muted)" }}>{batch?.blank}</div>
                      <div style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>{t.unified_outcome_blank}</div>
                    </div>
                    {batch && batch.errors > 0 && (
                      <div style={{ background: "var(--lewa-cream)", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "var(--lewa-terracotta)" }}>{batch.errors}</div>
                        <div style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--lewa-muted)" }}>{t.folder_errors}</div>
                      </div>
                    )}
                  </div>
                  {batch?.done && batchResults.length > 0 && (
                    <div style={{ marginTop: "16px", maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {batchResults.map((r, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "10px", padding: "8px 12px", background: "var(--lewa-cream)", borderRadius: "6px", fontSize: "12px" }}>
                          <span style={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                          <span style={{ whiteSpace: "nowrap", fontWeight: 600, color: r.outcome === "matched" ? "#10B981" : r.outcome === "review" ? "#B87140" : r.outcome === "new_tiger" ? "#A855F7" : "var(--lewa-muted)" }}>
                            {r.tiger ? `${r.tiger} · ${Math.round((r.conf ?? 0) * 100)}%` : t[`unified_outcome_${r.outcome === "error" ? "blank" : r.outcome}` as keyof typeof t] ?? r.outcome}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Pipeline stepper ───────────────────────────────────────── */}
        {(analyzing || result) && (
          <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(28,23,18,0.06)", padding: "32px", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "16px" }}>
              {stepDefs.map((sd, i) => {
                const state = steps[sd.key] ?? "pending";
                const isDone = state === "done";
                const isActive = state === "active";
                const isSkipped = state === "skipped";
                return (
                  <div key={sd.key} style={{ textAlign: "center", opacity: isSkipped ? 0.35 : 1 }}>
                    <div
                      style={{
                        width: "52px", height: "52px", borderRadius: "50%", margin: "0 auto 10px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `2px solid ${isDone ? "#10B981" : isActive ? "var(--lewa-amber)" : "#e0d8cc"}`,
                        background: isDone ? "rgba(16,185,129,0.08)" : isActive ? "rgba(191,141,51,0.08)" : "transparent",
                        color: isDone ? "#10B981" : isActive ? "var(--lewa-amber)" : "#b0a698",
                      }}
                    >
                      {isActive ? <Loader2 size={22} className="spin" /> : isDone ? <CheckCircle2 size={22} /> : <span style={{ fontFamily: "var(--font-serif)", fontSize: "18px" }}>{i + 1}</span>}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--lewa-charcoal)", marginBottom: "4px" }}>
                      {sd.label} {isSkipped && "·"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--lewa-muted)", lineHeight: 1.5 }}>{sd.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Result card ─────────────────────────────────────────────── */}
        {result && meta && (
          <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(28,23,18,0.06)", padding: "32px", marginBottom: "32px", borderTop: `4px solid ${meta.color}` }}>
            <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPublicImageUrl(result.image_url) || ""}
                alt="analyzed"
                style={{ width: "200px", height: "200px", objectFit: "cover", borderRadius: "10px", border: "1px solid #eee" }}
              />
              <div style={{ flex: 1, minWidth: "240px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", color: meta.color }}>
                  {meta.icon}
                  <span style={{ fontSize: "15px", fontWeight: 700 }}>{meta.label}</span>
                </div>

                {result.final.name && (
                  <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "34px", color: "var(--lewa-charcoal)", margin: "0 0 4px" }}>
                    {result.final.name}
                    <span style={{ fontSize: "16px", color: "var(--lewa-muted)", fontWeight: 400 }}> ({result.final.tiger_id})</span>
                  </h2>
                )}
                {result.final.sex && result.final.outcome !== "blank" && (
                  <p style={{ color: "var(--lewa-muted)", fontSize: "14px", margin: "0 0 14px" }}>
                    {result.final.sex === "Male" ? (language === "hi" ? "नर" : language === "mr" ? "नर" : "Male") :
                     result.final.sex === "Female" ? (language === "hi" ? "मादा" : language === "mr" ? "मादा" : "Female") : result.final.sex}
                  </p>
                )}

                {result.final.confidence !== null && result.final.outcome !== "blank" && (
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--lewa-muted)", marginBottom: "4px" }}>
                      <span>{t.unified_result_confidence}</span>
                      <span>{Math.round(result.final.confidence * 100)}%</span>
                    </div>
                    <div style={{ height: "8px", background: "var(--lewa-cream)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${result.final.confidence * 100}%`, background: meta.color, borderRadius: "4px", transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                )}

                {result.final.outcome === "review" && (
                  <p style={{ color: "var(--lewa-terracotta)", fontSize: "13px", marginBottom: "14px" }}>
                    {t.unified_top_match}: <strong>{result.final.tiger_id}</strong> · {t.unified_alt_match}:{" "}
                    <strong>{result.final.all_scores[1]?.tiger_id}</strong>
                  </p>
                )}

                {result.final.outcome === "matched" && result.final.all_scores.length > 0 && (
                  <p style={{ color: "var(--lewa-muted)", fontSize: "13px", marginBottom: "14px" }}>
                    {t.unified_alt_match}: <strong>{result.final.all_scores[1]?.tiger_id}</strong>
                  </p>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {result.final.outcome === "review" && (
                    <a href="/identification#queue" className="btn-pill-light" style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
                      {t.unified_result_go_to_review} <ArrowRight size={12} />
                    </a>
                  )}
                  <button className="btn-brush" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }} onClick={reset}>
                    <RotateCcw size={13} /> {t.unified_analyze_another}
                  </button>
                </div>
              </div>
            </div>

            {/* Stage detail chips */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "22px", paddingTop: "18px", borderTop: "1px solid #f0ebe3" }}>
              {result.stages.blank_filter && (
                <span style={{ fontSize: "12px", padding: "6px 12px", background: "var(--lewa-cream)", borderRadius: "20px", color: "var(--lewa-muted)" }}>
                  {t.unified_step_blank}: {Math.round(result.stages.blank_filter.confidence * 100)}%
                </span>
              )}
              {result.stages.species_gate?.is_tiger && (
                <span style={{ fontSize: "12px", padding: "6px 12px", background: "var(--lewa-cream)", borderRadius: "20px", color: "var(--lewa-muted)" }}>
                  {t.unified_step_species}: {Math.round(result.stages.species_gate.tiger_probability * 100)}%
                </span>
              )}
              {result.stages.stripe_reid && (
                <span style={{ fontSize: "12px", padding: "6px 12px", background: "var(--lewa-cream)", borderRadius: "20px", color: "var(--lewa-muted)" }}>
                  {t.unified_step_reid}: {result.stages.stripe_reid.embedding_dim || 512}-D {result.stages.stripe_reid.flank_side ? `(${result.stages.stripe_reid.flank_side} Flank)` : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── SD-Card Import (same page) ──────────────────────────────── */}
        <SdCardImportPanel />

        {/* ── Registered Tigers (collapsed) ────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(28,23,18,0.06)", padding: "24px 32px", marginBottom: "20px" }}>
          <button
            onClick={() => setShowTigers(!showTigers)}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
          >
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "18px" }}>
              {t.unified_registered_tigers} ({tigers.length})
            </span>
            {showTigers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showTigers && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "14px", marginTop: "18px" }}>
              {tigers.map((tg) => (
                <div key={tg.tiger_id} style={{ border: "1px solid #eee", borderRadius: "10px", padding: "16px", borderTop: `3px solid ${tigerColor(tg.tiger_id)}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <PawPrint size={14} style={{ color: tigerColor(tg.tiger_id) }} />
                    <strong style={{ fontSize: "14px" }}>{tg.name}</strong>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--lewa-muted)", lineHeight: 1.6 }}>
                    {tg.tiger_id} · {tg.sex === "Male" ? (language === "hi" ? "नर" : language === "mr" ? "नर" : "Male") : tg.sex === "Female" ? (language === "hi" ? "मादा" : language === "mr" ? "मादा" : "Female") : tg.sex}
                    <br />
                    {tg.total_captures} {t.unified_captures_label} · {t.unified_last_seen}: {tg.last_station || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Review Queue (collapsed) ────────────────────────────────── */}
        <div id="queue" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(28,23,18,0.06)", padding: "24px 32px" }}>
          <button
            onClick={() => setShowQueue(!showQueue)}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
          >
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "18px" }}>
              {t.unified_review_queue} ({queue.length})
            </span>
            {showQueue ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showQueue && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "18px" }}>
              {queue.length === 0 && (
                <p style={{ color: "var(--lewa-muted)", fontSize: "14px" }}>—</p>
              )}
              {queue.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--lewa-cream)", borderRadius: "8px", fontSize: "13px", flexWrap: "wrap", gap: "8px" }}>
                  <span>#{item.id} · {item.station_id}</span>
                  <span>
                    {t.unified_top_match}: <strong>{item.top_match_id}</strong> ({Math.round(item.top_match_confidence * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
