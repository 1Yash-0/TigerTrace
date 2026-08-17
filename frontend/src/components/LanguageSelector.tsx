"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  variant?: "light" | "dark";
}

const languages: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "EN", native: "English" },
  { code: "hi", label: "हिंदी", native: "हिन्दी" },
  { code: "mr", label: "मराठी", native: "मराठी" },
];

export default function LanguageSelector({ variant = "dark" }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  const isLight = variant === "light";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: isLight ? "rgba(255, 255, 255, 0.15)" : "rgba(28, 23, 18, 0.06)",
        padding: "3px 6px",
        borderRadius: "20px",
        border: isLight ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid rgba(28, 23, 18, 0.12)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Globe
        size={12}
        style={{
          color: isLight ? "rgba(255, 255, 255, 0.8)" : "var(--lewa-muted)",
          marginLeft: "4px",
          marginRight: "2px",
        }}
      />
      {languages.map((lang) => {
        const active = language === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            style={{
              border: "none",
              borderRadius: "14px",
              padding: "3px 8px",
              fontSize: "10.5px",
              fontWeight: active ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: active
                ? "var(--lewa-terracotta)"
                : "transparent",
              color: active
                ? "#ffffff"
                : isLight
                ? "rgba(255, 255, 255, 0.75)"
                : "var(--lewa-charcoal)",
              lineHeight: 1.2,
            }}
            title={lang.native}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}
