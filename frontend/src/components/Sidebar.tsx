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

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patrol", label: "Patrol Priority", icon: ShieldAlert },
  { href: "/chat", label: "Intelligence Assistant", icon: MessageSquare },
  { href: "/triage", label: "Triage Engine", icon: ScanSearch },
  { href: "/identification", label: "Identification", icon: Fingerprint },
  { href: "/map", label: "Territory Map", icon: MapPin },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🐅</div>
        <div>
          <h1>Pench AI</h1>
          <p>Camera Trap Intelligence</p>
        </div>
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
          Patrol Priority CSV
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
        <span style={{ opacity: 0.6 }}>v1.0.0 — Prototype</span>
      </div>
    </aside>
  );
}
