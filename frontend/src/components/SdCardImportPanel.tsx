"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getIngestStatus, getIngestStations, startIngest } from "@/lib/api";
import type { IngestStatus, PendingCard, IngestBatchRecord } from "@/lib/api";
import { HardDriveDownload, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ── SD-Card Import Panel (shared: unified demo page + triage redirect source) ──

export default function SdCardImportPanel() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<IngestStatus | null>(null);
  const [stations, setStations] = useState<string[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getIngestStations().then((r) => setStations(r.stations)).catch(console.error);
  }, []);

  // Poll: every 3s while a card is being imported, every 8s otherwise
  const refresh = useCallback(async () => {
    try {
      const s = await getIngestStatus();
      setStatus(s);
      if (!selectedCard && s.pending_cards.length > 0) {
        setSelectedCard(s.pending_cards[0].mount);
      }
      if (s.pending_cards.length === 0) {
        setSelectedCard(null);
      }
    } catch {
      /* backend briefly unreachable — keep last state */
    }
  }, [selectedCard]);

  useEffect(() => {
    refresh();
    const jobActive =
      status?.active_job && !["done", "error"].includes(status.active_job.stage);
    const interval = jobActive ? 3000 : 8000;
    pollRef.current = setInterval(refresh, interval);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [refresh, status?.active_job?.stage]);

  const job = status?.active_job ?? null;
  const jobActive = job && !["done", "error"].includes(job.stage);

  const handleStart = async () => {
    if (!selectedCard || !selectedStation) return;
    setStarting(true);
    setStartError(null);
    try {
      await startIngest(selectedCard, selectedStation);
      refresh();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Could not start import");
    } finally {
      setStarting(false);
    }
  };

  const stageLabel = (stage: string) =>
    stage === "copying" ? t.ingest_stage_copying
    : stage === "triaging" ? t.ingest_stage_triaging
    : stage === "done" ? t.ingest_stage_done
    : t.ingest_stage_error;

  const progressPct = job
    ? Math.min(100, Math.round(((job.copied_files + job.skipped_files) / Math.max(1, job.total_files)) * 100))
    : 0;

  return (
    <div
      style={{
        background: "#fff",
        padding: "32px",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(28,23,18,0.06)",
        marginBottom: "32px",
      }}
    >
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "18px" }}>
        <div
          style={{
            width: "44px", height: "44px", borderRadius: "10px", flexShrink: 0,
            background: "var(--lewa-cream)", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--lewa-terracotta)",
          }}
        >
          <HardDriveDownload size={22} />
        </div>
        <div>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", marginBottom: "4px" }}>
            {t.ingest_panel_title}
          </h3>
          <p style={{ color: "var(--lewa-muted)", fontSize: "13px", maxWidth: "620px" }}>
            {t.ingest_panel_desc}
          </p>
        </div>
      </div>

      {/* Pending card banner */}
      {status && status.pending_cards.length > 0 && (
        <div
          style={{
            border: "1.5px solid var(--lewa-amber)",
            background: "rgba(191, 141, 51, 0.07)",
            borderRadius: "10px",
            padding: "18px",
            marginBottom: "18px",
          }}
        >
          {status.pending_cards.map((c) => (
            <button
              key={c.mount}
              onClick={() => setSelectedCard(c.mount)}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                marginBottom: "8px",
                borderRadius: "8px",
                cursor: "pointer",
                border: selectedCard === c.mount ? "2px solid var(--lewa-terracotta)" : "1px solid transparent",
                background: selectedCard === c.mount ? "rgba(184, 71, 40, 0.06)" : "transparent",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--lewa-charcoal)" }}>
                {t.ingest_card_detected}: {t.ingest_card_label} {c.mount} ({c.fs_type})
              </span>
              <span style={{ fontSize: "13px", color: "var(--lewa-muted)", whiteSpace: "nowrap" }}>
                <strong>{c.image_count}</strong> {t.ingest_images_found}
                {c.video_count > 0 && <> · <strong>{c.video_count}</strong> {t.ingest_videos_found}</>}
                {" · "}{c.total_mb} MB
              </span>
            </button>
          ))}

          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--lewa-charcoal)", marginBottom: "6px" }}>
            {t.ingest_choose_station}
          </label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              style={{
                flex: 1, minWidth: "180px", padding: "10px 12px", borderRadius: "8px",
                border: "1px solid #d8cfc4", fontSize: "14px", background: "#fff",
              }}
            >
              <option value="">—</option>
              {stations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              className="btn-brush"
              onClick={handleStart}
              disabled={starting || !selectedCard || !selectedStation || !!jobActive}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              {starting ? "…" : t.ingest_start_button}
              <ArrowRight size={12} />
            </button>
          </div>
          {startError && (
            <p style={{ color: "var(--lewa-terracotta)", fontSize: "13px", marginTop: "8px" }}>{startError}</p>
          )}
        </div>
      )}

      {/* Idle state */}
      {status && status.pending_cards.length === 0 && !jobActive && (
        <p style={{ color: "var(--lewa-muted)", fontSize: "14px", padding: "14px", background: "var(--lewa-cream)", borderRadius: "8px" }}>
          {t.ingest_no_cards}
        </p>
      )}

      {/* Active/finished job progress */}
      {job && (
        <div style={{ border: "1px solid #e8e0d5", borderRadius: "10px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: job.stage === "error" ? "var(--lewa-terracotta)" : "var(--lewa-charcoal)" }}>
              {job.stage === "error" ? <XCircle size={16} style={{ verticalAlign: "-3px" }} /> : <CheckCircle2 size={16} style={{ verticalAlign: "-3px" }} />}
              {" "}{stageLabel(job.stage)} — {job.station_id}
            </span>
            <span style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>
              {job.stage === "copying"
                ? `${job.copied_files + job.skipped_files} / ${job.total_files} ${t.ingest_progress_files}`
                : job.stage === "triaging" ? t.ingest_stage_triaging
                : ""}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: "10px", background: "var(--lewa-cream)", borderRadius: "5px", overflow: "hidden", marginBottom: "16px" }}>
            <div
              style={{
                height: "100%",
                width: `${job.stage === "done" ? 100 : progressPct}%`,
                background: job.stage === "error" ? "var(--lewa-terracotta)" : "var(--lewa-amber)",
                transition: "width 0.6s ease",
                borderRadius: "5px",
              }}
            />
          </div>

          {job.stage === "done" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
              <div style={{ background: "var(--lewa-cream)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "22px" }}>{job.retained_files}</div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--lewa-muted)" }}>
                  {t.ingest_result_retained}
                </div>
              </div>
              <div style={{ background: "var(--lewa-cream)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "22px", color: "var(--lewa-terracotta)" }}>{job.blank_files}</div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--lewa-muted)" }}>
                  {t.ingest_result_blanks}
                </div>
              </div>
              <div style={{ background: "var(--lewa-cream)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "22px", color: "var(--lewa-muted)" }}>{job.skipped_files}</div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--lewa-muted)" }}>
                  {t.ingest_duplicates_skipped}
                </div>
              </div>
              <div style={{ background: "var(--lewa-cream)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "22px", color: "var(--lewa-amber)" }}>{job.saved_mb} MB</div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--lewa-muted)" }}>
                  {t.ingest_result_saved}
                </div>
              </div>
            </div>
          )}
          {job.error && (
            <p style={{ color: "var(--lewa-terracotta)", fontSize: "13px", marginTop: "10px" }}>{job.error}</p>
          )}
          <p style={{ color: "var(--lewa-muted)", fontSize: "12px", marginTop: "14px" }}>{t.ingest_importing_note}</p>
        </div>
      )}

      {/* Import history */}
      {status && status.recent_batches.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "16px", marginBottom: "12px" }}>
            {t.ingest_import_history}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {status.recent_batches.map((b: IngestBatchRecord) => (
              <div
                key={b.id}
                style={{
                  display: "flex", justifyContent: "space-between", padding: "10px 14px",
                  background: "var(--lewa-cream)", borderRadius: "6px", fontSize: "13px",
                }}
              >
                <span>
                  {b.station_id} · {new Date(b.started_at).toLocaleDateString()} · {b.job_id.slice(-8)}
                </span>
                <span>
                  <strong>{b.retained}</strong> {t.ingest_result_retained.toLowerCase()} ·{" "}
                  <strong>{b.blanks}</strong> {t.ingest_result_blanks.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
