"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import LewaNav from "@/components/LewaNav";
import {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
  ChatResponseData,
  ChatActionLink,
} from "@/lib/api";
import {
  Send,
  Trash2,
  Sparkles,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  Fingerprint,
  ScanSearch,
  LayoutDashboard,
  MessageSquare,
  Bot,
  User,
  ArrowRight,
  Database,
  WifiOff,
  Compass,
} from "lucide-react";

interface MessageItem {
  id: string | number;
  sender: "user" | "assistant";
  text: string;
  intent?: string;
  entities?: Record<string, any>;
  actions?: ChatActionLink[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  {
    category: "🐅 Tigers",
    queries: [
      "Show all registered tigers",
      "Tell me about Choti Tara (PTR-T01)",
      "Where was Kanha (PTR-T03) detected?",
      "Show movement history of PTR-T01",
    ],
  },
  {
    category: "🗺️ Territory & Movement",
    queries: [
      "What is T-01's home range?",
      "Which tigers have overlapping territories?",
      "Which tigers entered the buffer zone?",
      "Which tigers show abnormal movement deviations?",
    ],
  },
  {
    category: "⚠️ Safety & Conflict",
    queries: [
      "Show high severity alerts",
      "Which stations are near villages with tiger activity?",
      "Which tigers have prolonged absence?",
      "Which stations have high risk?",
    ],
  },
  {
    category: "📊 Monitoring & Triage",
    queries: [
      "Give me a summary of this monitoring cycle",
      "How many blank images were removed?",
      "How many images need human review?",
      "Check camera station health",
    ],
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getChatHistory(20);
        if (history && history.length > 0) {
          const formatted: MessageItem[] = [];
          history.forEach((h) => {
            formatted.push({
              id: `user-${h.id}`,
              sender: "user",
              text: h.message,
              timestamp: h.created_at || new Date().toISOString(),
            });
            formatted.push({
              id: `bot-${h.id}`,
              sender: "assistant",
              text: h.response,
              intent: h.intent,
              entities: h.entities,
              timestamp: h.created_at || new Date().toISOString(),
            });
          });
          setMessages(formatted);
        } else {
          // Add default welcome message
          setMessages([
            {
              id: "welcome-1",
              sender: "assistant",
              text: `🌿 **Welcome to the Pench Offline Conservation Intelligence Assistant.**\n\nI am connected directly to your local Pench Tiger Reserve database. I can answer inquiries regarding:\n• **Individual Tiger Profiles & Sightings**\n• **Home Range & Territory Overlaps**\n• **Buffer Zone Incursions & Community Risk**\n• **Triage, Blank Filtering & Camera Health**\n\n*All processing is 100% local, air-gapped, and grounded in ground-truth survey records.*`,
              intent: "GET_HELP",
              timestamp: new Date().toISOString(),
              actions: [
                { label: "Dashboard", route: "/", icon: "LayoutDashboard" },
                { label: "Territory Map", route: "/map", icon: "MapPin" },
                { label: "Behavioral Alerts", route: "/alerts", icon: "AlertTriangle" },
              ],
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    loadHistory();
  }, []);

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputValue.trim();
    if (!text || loading) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputValue("");
    setLoading(true);

    try {
      const res: ChatResponseData = await sendChatMessage(text);
      const botMsg: MessageItem = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: res.answer,
        intent: res.intent,
        entities: res.entities,
        actions: res.actions,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: `error-${Date.now()}`,
        sender: "assistant",
        text: `⚠️ **Connection Error**: Unable to reach local backend API (${err.message}). Ensure the backend server is active on port 8000.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClear = async () => {
    if (window.confirm("Are you sure you want to clear conversation history?")) {
      try {
        await clearChatHistory();
        setMessages([
          {
            id: "welcome-reset",
            sender: "assistant",
            text: `Conversation history cleared. Ready for your field queries.`,
            intent: "GET_HELP",
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Clear error:", err);
      }
    }
  };

  const getActionIcon = (iconName?: string) => {
    switch (iconName) {
      case "MapPin":
        return <MapPin size={13} style={{ marginRight: 5 }} />;
      case "AlertTriangle":
        return <AlertTriangle size={13} style={{ marginRight: 5 }} />;
      case "Fingerprint":
        return <Fingerprint size={13} style={{ marginRight: 5 }} />;
      case "ScanSearch":
        return <ScanSearch size={13} style={{ marginRight: 5 }} />;
      case "LayoutDashboard":
        return <LayoutDashboard size={13} style={{ marginRight: 5 }} />;
      default:
        return <Compass size={13} style={{ marginRight: 5 }} />;
    }
  };

  // Basic markdown text renderer
  const renderFormattedText = (raw: string) => {
    const lines = raw.split("\n");
    return lines.map((line, idx) => {
      // Format bold text **text**
      const parts = line.split(/(\*\*.*?\*\*|_.*?_)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} style={{ color: "var(--lewa-charcoal)", fontWeight: 600 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("_") && part.endsWith("_")) {
          return (
            <em key={pIdx} style={{ opacity: 0.85 }}>
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      });

      return (
        <p
          key={idx}
          style={{
            margin: line.trim() === "" ? "8px 0" : "3px 0",
            lineHeight: 1.55,
            fontSize: "14.5px",
          }}
        >
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      <LewaNav />

      <main
        style={{
          marginTop: "85px",
          padding: "40px 5vw 80px",
          maxWidth: "1120px",
          marginRight: "auto",
          marginLeft: "auto",
          minHeight: "calc(100vh - 120px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header Title Section */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 14px",
              borderRadius: "100px",
              background: "rgba(184, 71, 40, 0.08)",
              border: "1px solid rgba(184, 71, 40, 0.2)",
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "var(--lewa-terracotta)",
              }}
            >
              Offline Field AI · Database-Grounded Intelligence
            </span>
          </div>

          <h1 className="lewa-title-section" style={{ fontSize: "clamp(32px, 4vw, 54px)" }}>
            Conservation <span className="font-italic">Assistant</span>
          </h1>

          <p
            style={{
              color: "var(--lewa-muted)",
              fontSize: "14px",
              maxWidth: "600px",
              margin: "8px auto 0",
            }}
          >
            Air-gapped natural language interface providing instant intelligence on individual
            tigers, camera trap captures, territorial overlap, and village-adjacent movement.
          </p>
        </div>

        {/* Quick Topic Chips Tabs */}
        <div
          style={{
            background: "var(--lewa-paper)",
            border: "1px solid var(--lewa-border)",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {QUICK_PROMPTS.map((cat, idx) => (
                <button
                  key={cat.category}
                  onClick={() => setActiveCategory(idx)}
                  className={activeCategory === idx ? "btn-brush" : "btn-pill-light"}
                  style={{
                    padding: "5px 12px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {cat.category}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "11px",
                color: "var(--lewa-muted)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <WifiOff size={13} /> Air-Gapped Mode
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Database size={13} /> SQLite Grounded
              </span>
              <button
                onClick={handleClear}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--lewa-muted)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
                title="Clear Chat History"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>

          {/* Quick Query Pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {QUICK_PROMPTS[activeCategory].queries.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={loading}
                style={{
                  background: "var(--lewa-ivory)",
                  border: "1px solid var(--lewa-border)",
                  borderRadius: "100px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  color: "var(--lewa-charcoal)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--lewa-terracotta)";
                  e.currentTarget.style.color = "var(--lewa-terracotta)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--lewa-border)";
                  e.currentTarget.style.color = "var(--lewa-charcoal)";
                }}
              >
                <span>{q}</span>
                <ArrowRight size={11} style={{ opacity: 0.6 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Chat Stream Window */}
        <div
          style={{
            flex: 1,
            background: "var(--lewa-ivory)",
            border: "1px solid var(--lewa-border)",
            borderRadius: "20px",
            padding: "24px",
            minHeight: "440px",
            maxHeight: "560px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          {messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: isUser ? "row-reverse" : "row",
                  gap: "12px",
                  alignItems: "flex-start",
                  maxWidth: "100%",
                }}
              >
                {/* Avatar Icon */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: isUser ? "var(--lewa-charcoal)" : "var(--lewa-terracotta)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>

                {/* Message Bubble Container */}
                <div
                  style={{
                    maxWidth: "82%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  {/* Meta tag for assistant */}
                  {!isUser && m.intent && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "4px",
                        fontSize: "10.5px",
                        letterSpacing: "0.5px",
                        color: "var(--lewa-muted)",
                      }}
                    >
                      <span
                        style={{
                          background: "rgba(184, 71, 40, 0.1)",
                          color: "var(--lewa-terracotta)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: 600,
                        }}
                      >
                        {m.intent}
                      </span>
                      <span>•</span>
                      <span>LOCAL DETERMINISTIC</span>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    style={{
                      padding: isUser ? "12px 18px" : "16px 20px",
                      borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                      background: isUser ? "var(--lewa-charcoal)" : "#ffffff",
                      color: isUser ? "#ffffff" : "var(--lewa-body)",
                      border: isUser ? "none" : "1px solid var(--lewa-border)",
                      boxShadow: isUser
                        ? "0 2px 8px rgba(0,0,0,0.15)"
                        : "0 2px 10px rgba(0,0,0,0.04)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {isUser ? (
                      <p style={{ margin: 0, fontSize: "14.5px" }}>{m.text}</p>
                    ) : (
                      renderFormattedText(m.text)
                    )}
                  </div>

                  {/* Contextual Action Links */}
                  {!isUser && m.actions && m.actions.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginTop: "10px",
                      }}
                    >
                      {m.actions.map((act) => (
                        <Link
                          key={act.route + act.label}
                          href={act.route}
                          className="btn-pill-light"
                          style={{
                            padding: "4px 12px",
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            textDecoration: "none",
                            background: "#ffffff",
                            borderColor: "var(--lewa-border)",
                          }}
                        >
                          {getActionIcon(act.icon)}
                          {act.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--lewa-terracotta)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={18} />
              </div>
              <div
                style={{
                  padding: "12px 18px",
                  borderRadius: "4px 18px 18px 18px",
                  background: "#ffffff",
                  border: "1px solid var(--lewa-border)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--lewa-muted)",
                  fontSize: "13px",
                }}
              >
                <Sparkles size={14} className="animate-spin" />
                <span>Interrogating local Pench DB & spatial indices...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "10px",
            background: "#ffffff",
            padding: "8px 12px",
            borderRadius: "100px",
            border: "1px solid var(--lewa-border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question (e.g., 'Where was Choti Tara seen?', 'Show high risk alerts', 'Territory overlaps')..."
            disabled={loading}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              padding: "10px 16px",
              fontSize: "14px",
              background: "transparent",
              color: "var(--lewa-charcoal)",
              fontFamily: "var(--font-sans)",
            }}
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="btn-brush"
            style={{
              padding: "8px 20px",
              borderRadius: "100px",
              fontSize: "11px",
              cursor: inputValue.trim() && !loading ? "pointer" : "not-allowed",
              opacity: inputValue.trim() && !loading ? 1 : 0.6,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>ASK</span>
            <Send size={13} />
          </button>
        </form>

        {/* Safety / Compliance Footer */}
        <div
          style={{
            marginTop: "16px",
            textAlign: "center",
            fontSize: "11px",
            color: "var(--lewa-muted)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <ShieldCheck size={12} color="#10b981" /> Read-Only Safe Execution
          </span>
          <span>•</span>
          <span>Zero Cloud Transmissions</span>
          <span>•</span>
          <span>Pench Tiger Reserve Camera Trap Intelligence</span>
        </div>
      </main>
    </>
  );
}
