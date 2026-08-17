"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanSearch,
  Fingerprint,
  MapPin,
  AlertTriangle,
  Download,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSelector from "./LanguageSelector";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t.nav_tiger_habitat || "Habitat & Corridors", icon: LayoutDashboard },
    { href: "/patrol", label: t.nav_patrol_priority, icon: ShieldAlert },
    { href: "/chat", label: t.nav_ai_assistant, icon: MessageSquare },
    { href: "/triage", label: t.nav_triage, icon: ScanSearch },
    { href: "/identification", label: t.nav_identify_tiger, icon: Fingerprint },
    { href: "/map", label: t.nav_territory, icon: MapPin },
    { href: "/alerts", label: t.nav_alerts, icon: AlertTriangle },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon" style={{ background: "var(--lewa-terracotta)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px" }}>
          <ShieldAlert size={20} />
        </div>
        <div>
          <h1>{t.nav_brand_title}</h1>
          <p>{t.nav_brand_subtitle}</p>
        </div>
      </div>

      {/* Language Switcher in Sidebar */}
      <div style={{ padding: "8px 20px 14px" }}>
        <LanguageSelector variant="dark" />
      </div>

      <nav className="sidebar-nav">
        <p className="sidebar-section-title">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              <Icon className="sidebar-link-icon" />
              {item.label}
            </Link>
          );
        })}

        <p className="sidebar-section-title" style={{ marginTop: 24 }}>
          Exports
        </p>
        <a
          href="http://localhost:8000/api/export/patrol"
          target="_blank"
          className="sidebar-link"
        >
          <Download className="sidebar-link-icon" />
          {t.patrol_export_csv || "Patrol Priority CSV"}
        </a>
        <a
          href="http://localhost:8000/api/export/alerts"
          target="_blank"
          className="sidebar-link"
        >
          <Download className="sidebar-link-icon" />
          Alerts CSV
        </a>
        <a
          href="http://localhost:8000/api/export/geospatial"
          target="_blank"
          className="sidebar-link"
        >
          <Download className="sidebar-link-icon" />
          Home Ranges CSV
        </a>
      </nav>

      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border-color)",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        Pench Tiger Reserve
        <br />
        <span style={{ opacity: 0.6 }}>v1.0.0 — Conservation AI</span>
      </div>
    </aside>
  );
}
