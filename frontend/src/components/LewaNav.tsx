"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSelector from "./LanguageSelector";

interface LewaNavProps {
  forceScrolled?: boolean;
}

export default function LewaNav({ forceScrolled }: LewaNavProps = {}) {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isScrolled = forceScrolled !== undefined ? forceScrolled : scrolled;

  return (
    <header
      className={`lewa-nav ${isScrolled ? "scrolled" : "transparent-light"}`}
    >
      {/* Left side */}
      <div className="lewa-nav-left">
        <Link href="/identification" className="btn-brush">
          {t.nav_identify_tiger}
        </Link>
        <Link href="/#wildlife" className="lewa-nav-link active">
          {t.nav_tiger_habitat}
        </Link>
        <Link href="/patrol" className="lewa-nav-link" style={{ color: "var(--lewa-terracotta)", fontWeight: 600 }}>
          {t.nav_patrol_priority}
        </Link>
      </div>

      {/* Center Wordmark */}
      <Link href="/" className="lewa-nav-logo">
        <h1>{t.nav_brand_title}</h1>
        <p>{t.nav_brand_subtitle}</p>
      </Link>

      {/* Right side */}
      <div className="lewa-nav-right" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <Link href="/chat" className="lewa-nav-link">
          {t.nav_ai_assistant}
        </Link>
        <Link href="/map" className="lewa-nav-link">
          {t.nav_territory}
        </Link>
        <Link href="/alerts" className="lewa-nav-link">
          {t.nav_alerts}
        </Link>
        <Link href="/triage" className="lewa-nav-link">
          {t.nav_triage}
        </Link>
        <LanguageSelector variant={isScrolled ? "dark" : "light"} />
      </div>
    </header>
  );
}
