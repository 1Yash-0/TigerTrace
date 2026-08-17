"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LewaNav from "@/components/LewaNav";
import { getAlerts, resolveAlert, runAlertEngine } from "@/lib/api";
import { getNavigatedFromHome } from "@/lib/navigationTracker";
import { Play, Download, CheckCircle2 } from "lucide-react";

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
            Real-time Territory Surveillance
          </p>

          <h1 className="lewa-title-section">
            Behavioral <span className="font-italic">Alerts</span>
          </h1>

          <p style={{ color: "var(--lewa-muted)", fontSize: "15px", maxWidth: "560px", margin: "16px auto 0" }}>
            Automated anomaly detection monitoring boundary drift, nomadic
            expansions, and individual absence durations across Pench Tiger Reserve.
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
              href="http://localhost:8000/api/export/alerts"
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
            {filtered.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "24px",
                  boxShadow: "0 4px 20px rgba(28,23,18,0.05)",
                  borderLeft: `4px solid ${
                    alert.severity === "high"
                      ? "var(--lewa-terracotta)"
                      : "var(--lewa-amber)"
                  }`,
                  opacity: alert.resolved ? 0.5 : 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "20px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "20px",
                        background: "rgba(184, 71, 40, 0.1)",
                        color: "var(--lewa-terracotta)",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                      }}
                    >
                      {alertTypeLabels[alert.alert_type] || alert.alert_type}
                    </span>

                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "13px", color: "var(--lewa-charcoal)" }}>
                      {alert.tiger_id}
                    </span>
                  </div>

                  <p style={{ color: "var(--lewa-body)", fontSize: "14px", lineHeight: "1.6", marginBottom: "12px" }}>
                    {alert.message}
                  </p>

                  <div style={{ fontSize: "12px", color: "var(--lewa-muted)" }}>
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
            ))}
          </div>
        )}
      </main>
    </>
  );
}
