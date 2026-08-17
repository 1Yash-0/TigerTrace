"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LewaNav from "@/components/LewaNav";
import { runTriage, getTriageHistory } from "@/lib/api";
import { getNavigatedFromHome } from "@/lib/navigationTracker";
import { Play, CheckCircle2, XCircle, HardDrive, Clock, ScanSearch } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface TriageResult {
  total_images: number;
  blanks_removed: number;
  retained: number;
  saved_mb: number;
  saved_minutes: number;
  log: Array<{ file: string; status: string; confidence: number }>;
}

interface TriageHistoryItem {
  id: number;
  run_at: string;
  total_images: number;
  blanks_removed: number;
  retained: number;
  saved_mb: number;
  saved_minutes: number;
}

export default function TriagePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [authorized, setAuthorized] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [history, setHistory] = useState<TriageHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTriageHistory().then(setHistory).catch(console.error);
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runTriage();
      setResult(res);
      getTriageHistory().then(setHistory);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <LewaNav />

      <main
        style={{
          marginTop: "90px",
          padding: "80px 7vw",
          maxWidth: "1000px",
          marginRight: "auto",
          marginLeft: "auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "var(--lewa-terracotta)",
              fontWeight: 700,
              marginBottom: "12px",
            }}
          >
            {t.triage_badge}
          </p>

          <h1 className="lewa-title-section">
            {language === "hi" ? (
              <>कैमरा ट्रैप <span className="font-italic">ट्रायेज</span></>
            ) : language === "mr" ? (
              <>कॅमेरा ट्रॅप <span className="font-italic">ट्रायाज</span></>
            ) : (
              <>Camera Trap <span className="font-italic">Triage</span></>
            )}
          </h1>

          <p style={{ color: "var(--lewa-muted)", fontSize: "15px", maxWidth: "560px", margin: "16px auto 0" }}>
            {t.triage_subtitle}
          </p>
        </div>

        {/* Run Panel */}
        <div
          style={{
            background: "#fff",
            padding: "32px",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(28,23,18,0.06)",
            marginBottom: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", marginBottom: "4px" }}>
              Run Automated Pipeline
            </h3>
            <p style={{ color: "var(--lewa-muted)", fontSize: "13px" }}>
              Scans <code>data/images/</code> to separate blanks from animal detections.
            </p>
          </div>

          <button
            className="btn-brush"
            onClick={handleRun}
            disabled={running}
          >
            <Play size={12} fill="#fff" />
            {running ? "Processing…" : "Run Blank Triage"}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              background: "rgba(184, 71, 40, 0.1)",
              color: "var(--lewa-terracotta)",
              fontSize: "14px",
              marginBottom: "24px",
            }}
          >
            Error: {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div
            style={{
              background: "#fff",
              padding: "32px",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(28,23,18,0.06)",
              marginBottom: "32px",
            }}
          >
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", marginBottom: "20px", color: "var(--lewa-terracotta)" }}>
              ✓ Triage Run Complete
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", textAlign: "center" }}>
              <div style={{ background: "var(--lewa-cream)", padding: "16px", borderRadius: "8px" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "var(--lewa-charcoal)" }}>
                  {result.total_images}
                </div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--lewa-muted)" }}>
                  Total Scanned
                </div>
              </div>

              <div style={{ background: "var(--lewa-cream)", padding: "16px", borderRadius: "8px" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "var(--lewa-terracotta)" }}>
                  {result.blanks_removed}
                </div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--lewa-muted)" }}>
                  Blanks Quarantined
                </div>
              </div>

              <div style={{ background: "var(--lewa-cream)", padding: "16px", borderRadius: "8px" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "var(--lewa-charcoal)" }}>
                  {result.retained}
                </div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--lewa-muted)" }}>
                  Valid Retained
                </div>
              </div>

              <div style={{ background: "var(--lewa-cream)", padding: "16px", borderRadius: "8px" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "var(--lewa-amber)" }}>
                  {result.saved_mb} MB
                </div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--lewa-muted)" }}>
                  Storage Saved
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Run History */}
        <div style={{ background: "#fff", padding: "32px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(28,23,18,0.06)" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", marginBottom: "20px" }}>
            Triage History
          </h3>

          {history.length === 0 ? (
            <p style={{ color: "var(--lewa-muted)", fontSize: "14px" }}>No previous runs recorded.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {history.map((run) => (
                <div
                  key={run.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "var(--lewa-cream)",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                >
                  <span>
                    Run #{run.id} · {new Date(run.run_at).toLocaleString()}
                  </span>
                  <span>
                    <strong>{run.blanks_removed}</strong> blanks removed · <strong>{run.saved_mb} MB</strong> saved
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
