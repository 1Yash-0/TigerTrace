"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import LewaNav from "@/components/LewaNav";
import { useLanguage } from "@/lib/i18n/LanguageContext";
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

// label keys translate per language; query stays English because the
// backend intent router is keyword-based. Each query below was verified
// against the live Pench dataset (T1xx tigers, C-grid stations) so every
// prompt returns a real answer, and each hits a distinct intent type:
// census, profile, enrollment, range size, last detection, movement
// timeline, overlap, buffer entry, severity-filtered alerts, absence,
// risk ranking, patrol routing, cycle summary, review queue, camera
// health, and station activity.
const QUICK_PROMPTS = [
  {
    categoryKey: "chat_quick_cat_1",
    queries: [
      { key: "chat_quick_q1", query: "How many tigers are registered in the database?" },
      { key: "chat_quick_q2", query: "Tell me about Tiger T112" },
      { key: "chat_quick_q3", query: "Show newly identified tigers" },
      { key: "chat_quick_q4", query: "Which tiger has the largest home range?" },
    ],
  },
  {
    categoryKey: "chat_quick_cat_2",
    queries: [
      { key: "chat_quick_q5", query: "Where was T112 last seen?" },
      { key: "chat_quick_q6", query: "Show movement history of T112" },
      { key: "chat_quick_q7", query: "Which tiger territories overlap?" },
      { key: "chat_quick_q8", query: "Which tigers entered the buffer zone?" },
    ],
  },
  {
    categoryKey: "chat_quick_cat_3",
    queries: [
      { key: "chat_quick_q9", query: "Show high severity alerts" },
      { key: "chat_quick_q10", query: "Which tigers have not been seen recently?" },
      { key: "chat_quick_q11", query: "Which stations have high risk?" },
      { key: "chat_quick_q12", query: "Suggest a patrol sequence for today" },
    ],
  },
  {
    categoryKey: "chat_quick_cat_4",
    queries: [
      { key: "chat_quick_q13", query: "Give me a summary of this monitoring cycle" },
      { key: "chat_quick_q14", query: "Are there any images pending review?" },
      { key: "chat_quick_q15", query: "Are all cameras working properly?" },
      { key: "chat_quick_q16", query: "Which station has the most tiger activity?" },
    ],
  },
] as const;

export default function ChatPage() {
  const { t, language } = useLanguage();
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
          // Add default welcome message (localized)
          setMessages([
            {
              id: "welcome-1",
              sender: "assistant",
              text: `🌿 **${t.chat_welcome}**`,
              intent: "GET_HELP",
              timestamp: new Date().toISOString(),
              actions: [
                { label: t.chat_act_dashboard, route: "/", icon: "LayoutDashboard" },
                { label: t.chat_act_map, route: "/map", icon: "MapPin" },
                { label: t.chat_act_alerts, route: "/alerts", icon: "AlertTriangle" },
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
      const res: ChatResponseData = await sendChatMessage(text, language);
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
        text:
          language === "hi"
            ? `**कनेक्शन त्रुटि**: बैकएंड एपीआई तक नहीं पहुँच सके (${err.message})। सुनिश्चित करें कि पोर्ट 8000 पर सर्वर चालू है।`
            : language === "mr"
              ? `**जोडणी त्रुटी**: बॅकएंड एपीआय पर्यंत पोहोचू शकले नाही (${err.message}). पोर्ट 8000 वर सर्व्हर चालू आहे याची खात्री करा.`
              : `**Connection Error**: Unable to reach local backend API (${err.message}). Ensure the backend server is active on port 8000.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClear = async () => {
    const confirmMsg =
      language === "hi"
        ? "क्या आप वाकई बातचीत का इतिहास साफ़ करना चाहते हैं?"
        : language === "mr"
          ? "तुम्हाला खरंच संभाषणाचा इतिहास पुसून टाकायचा आहे का?"
          : "Are you sure you want to clear conversation history?";
    if (window.confirm(confirmMsg)) {
      try {
        await clearChatHistory();
        setMessages([
          {
            id: "welcome-reset",
            sender: "assistant",
            text:
              language === "hi"
                ? "बातचीत का इतिहास साफ़ हो गया। अपने प्रश्न पूछें।"
                : language === "mr"
                  ? "संभाषण इतिहास पुसला. तुमचे प्रश्न विचारा."
                  : "Conversation history cleared. Ready for your field queries.",
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
          <h1 className="lewa-title-section" style={{ fontSize: "clamp(32px, 4vw, 54px)" }}>
            {language === "hi" ? (
              <>संरक्षण <span className="font-italic">एआई सहायक</span></>
            ) : language === "mr" ? (
              <>संवर्धन <span className="font-italic">एआई सहाय्यक</span></>
            ) : (
              <>Conservation <span className="font-italic">Assistant</span></>
            )}
          </h1>

          <p
            style={{
              color: "var(--lewa-muted)",
              fontSize: "14px",
              maxWidth: "600px",
              margin: "8px auto 0",
            }}
          >
            {t.chat_subtitle}
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
                  key={cat.categoryKey}
                  onClick={() => setActiveCategory(idx)}
                  className={activeCategory === idx ? "btn-brush" : "btn-pill-light"}
                  style={{
                    padding: "5px 12px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {t[cat.categoryKey]}
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
                <WifiOff size={13} /> {t.chat_offline_badge}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Database size={13} /> {t.chat_local_badge}
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
                <Trash2 size={12} /> {t.chat_clear}
              </button>
            </div>
          </div>

          {/* Quick Query Pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {QUICK_PROMPTS[activeCategory].queries.map((q) => (
              <button
                key={q.key}
                onClick={() => handleSend(q.query)}
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
                <span>{t[q.key]}</span>
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
                      <span>{t.chat_local_badge}</span>
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
                <span>{t.chat_welcome_short}</span>
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
            placeholder={t.chat_placeholder}
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
            <span>{t.chat_send}</span>
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
            <ShieldCheck size={12} color="#10b981" /> {t.chat_footer_ro}
          </span>
          <span>•</span>
          <span>{t.chat_footer_zc}</span>
          <span>•</span>
          <span>{t.chat_footer_pt}</span>
        </div>
      </main>
    </>
  );
}
