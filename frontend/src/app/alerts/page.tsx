"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LewaNav from "@/components/LewaNav";
import { getAlerts, resolveAlert, runAlertEngine, API_BASE } from "@/lib/api";
import { getNavigatedFromHome } from "@/lib/navigationTracker";
import { Play, Download, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Alert {
  id: number;
  tiger_id: string;
  alert_type: string;
  severity: string;
  message: string;
  evidence: Record<string, unknown>;
  confidence: number;
  created_at: string;
  resolved: boolean;
}

const alertTypeLabels: Record<string, string> = {
  absence: "Prolonged Absence",
  range_shift: "Range Shift",
  new_station: "New Territory",
  village_proximity: "Community Proximity",
  zone_transition: "Zone Transition",
};

export default function AlertsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [authorized, setAuthorized] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");

  useEffect(() => {
    getAlerts()
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRunEngine = async () => {
    setRunning(true);
    try {
      await runAlertEngine();
      const updated = await getAlerts();
      setAlerts(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const handleResolve = async (id: number) => {
    await resolveAlert(id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolved: true } : a))
    );
  };

  const filtered = alerts.filter((a) => {
    if (filter === "active") return !a.resolved;
    if (filter === "resolved") return a.resolved;
    return true;
  });

  const activeCount = alerts.filter((a) => !a.resolved).length;

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
            {t.alerts_badge}
          </p>

          <h1 className="lewa-title-section">
            {language === "hi" ? (
              <>व्यवहार <span className="font-italic">सतर्कता</span></>
            ) : language === "mr" ? (
              <>वर्तणूक <span className="font-italic">अलर्ट</span></>
            ) : (
              <>Behavioral <span className="font-italic">Alerts</span></>
            )}
          </h1>

          <p style={{ color: "var(--lewa-muted)", fontSize: "15px", maxWidth: "560px", margin: "16px auto 0" }}>
            {t.alerts_subtitle}
          </p>
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            {(["all", "active", "resolved"] as const).map((f) => (
              <button
                key={f}
                className={filter === f ? "btn-brush" : "btn-pill-light"}
                style={{ padding: "6px 18px", fontSize: "10px" }}
                onClick={() => setFilter(f)}
              >
                {f === "all" && `All (${alerts.length})`}
                {f === "active" && `Active (${activeCount})`}
                {f === "resolved" && `Resolved (${alerts.length - activeCount})`}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="btn-brush"
              onClick={handleRunEngine}
              disabled={running}
            >
              <Play size={12} fill="#fff" />
              {running ? "Scanning…" : "Run Alert Engine"}
            </button>

            <a
              href={`${API_BASE}/api/export/alerts`}
              target="_blank"
              className="btn-pill-light"
            >
              <Download size={13} /> Export CSV
            </a>
          </div>
        </div>

        {/* Alert Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--lewa-muted)" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "3px solid var(--lewa-border)",
                borderTopColor: "var(--lewa-terracotta)",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
              Loading active alerts…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(28,23,18,0.06)",
            }}
          >
            <CheckCircle2
              size={44}
              style={{ color: "var(--lewa-terracotta)", margin: "0 auto 16px" }}
            />
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", marginBottom: "8px" }}>
              No active behavioral deviations
            </h3>
            <p style={{ color: "var(--lewa-muted)", fontSize: "14px" }}>
              All resident tigers are within expected home range parameters.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filtered.map((alert) => {
              const severity =
                alert.severity === "high" || alert.severity === "low"
                  ? alert.severity
                  : "medium";

              return (
                <div
                  key={alert.id}
                  style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "24px",
                    border: "1px solid var(--lewa-border)",
                    boxShadow: "0 1px 4px rgba(28,23,18,0.04)",
                    opacity: alert.resolved ? 0.55 : 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "20px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "3px 10px",
                          borderRadius: "20px",
                          background: `var(--lewa-sev-${severity}-bg)`,
                          color: `var(--lewa-sev-${severity}-ink)`,
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "currentColor",
                          }}
                        />
                        {severity}
                      </span>

                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "20px",
                          border: "1px solid var(--lewa-border)",
                          color: "var(--lewa-muted)",
                          fontSize: "10px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        {alertTypeLabels[alert.alert_type] || alert.alert_type}
                      </span>

                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "13px", color: "var(--lewa-charcoal)" }}>
                        {alert.tiger_id}
                      </span>

                      {alert.resolved && (
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "20px",
                            border: "1px solid var(--lewa-border)",
                            color: "var(--lewa-light)",
                            fontSize: "10px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                          }}
                        >
                          Resolved
                        </span>
                      )}
                    </div>

                    <p style={{ color: "var(--lewa-body)", fontSize: "14px", lineHeight: "1.6", marginBottom: "12px" }}>
                      {alert.message}
                    </p>

                    <div style={{ fontSize: "12px", color: "var(--lewa-muted)", fontVariantNumeric: "tabular-nums" }}>
                      Confidence: <strong>{(alert.confidence * 100).toFixed(0)}%</strong> ·{" "}
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>

                  {!alert.resolved && (
                    <button
                      className="btn-pill-light"
                      style={{ padding: "6px 16px", fontSize: "10px" }}
                      onClick={() => handleResolve(alert.id)}
                    >
                      <CheckCircle2 size={12} /> Resolve
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
