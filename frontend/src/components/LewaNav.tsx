"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import VideoUploadModal from "./VideoUploadModal";

export default function LewaNav({ forceScrolled }: { forceScrolled?: boolean } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isScrolled = forceScrolled !== undefined ? forceScrolled : scrolled;

  return (
    <>
      <header
        className={`lewa-nav ${isScrolled ? "scrolled" : "transparent-light"}`}
      >
        {/* Left side */}
        <div className="lewa-nav-left">
          <Link href="/identification" className="btn-brush">
            IDENTIFY TIGER
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-pill-light"
            style={{ padding: "6px 14px", fontSize: "10px" }}
          >
            <Upload size={12} /> UPLOAD VIDEO
          </button>
          <a href="#wildlife" className="lewa-nav-link active">
            TIGER HABITAT
          </a>
        </div>

        {/* Center Wordmark */}
        <Link href="/" className="lewa-nav-logo">
          <h1>TigerSpot</h1>
          <p>PENCH TIGER RESERVE · STRIPE AI</p>
        </Link>

        {/* Right side */}
        <div className="lewa-nav-right">
          <Link href="/patrol" className="lewa-nav-link" style={{ color: "var(--lewa-terracotta)", fontWeight: 600 }}>
            PATROL PRIORITY
          </Link>
          <Link href="/chat" className="lewa-nav-link">
            AI ASSISTANT
          </Link>
          <Link href="/map" className="lewa-nav-link">
            TERRITORY
          </Link>
          <Link href="/alerts" className="lewa-nav-link">
            ALERTS
          </Link>
          <Link href="/triage" className="lewa-nav-link">
            TRIAGE
          </Link>
        </div>
      </header>

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onVideoUploaded={() => {
          // Force reload or event dispatch
          window.location.reload();
        }}
      />
    </>
  );
}
