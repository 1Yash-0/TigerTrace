"use client";

export default function LewaStamp() {
  return (
    <div className="lewa-stamp">
      <svg className="rotating" viewBox="0 0 110 110">
        <defs>
          <path
            id="stamp-circle-path"
            d="M 55, 55 m -45, 0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0"
          />
        </defs>
        <text
          style={{
            fontSize: "8.5px",
            fill: "var(--lewa-terracotta)",
            letterSpacing: "3px",
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          <textPath href="#stamp-circle-path">
            · SCROLL TO EXPLORE · PENCH TIGER INTELLIGENCE ·
          </textPath>
        </text>
      </svg>

      {/* Tiger Stripe Paw icon in the center */}
      <div className="lewa-stamp-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {/* Tiger paw print */}
          <ellipse cx="12" cy="14" rx="4.5" ry="4" />
          <circle cx="7.5" cy="9.5" r="1.4" fill="currentColor" />
          <circle cx="12" cy="8" r="1.4" fill="currentColor" />
          <circle cx="16.5" cy="9.5" r="1.4" fill="currentColor" />
          <path d="M9 14.5 Q10 17 12 17 Q14 17 15 14.5" strokeWidth="0.8" />
          <line x1="10" y1="13" x2="10" y2="15.5" strokeWidth="0.9" />
          <line x1="12" y1="12.5" x2="12" y2="15.5" strokeWidth="0.9" />
          <line x1="14" y1="13" x2="14" y2="15.5" strokeWidth="0.9" />
        </svg>
      </div>
    </div>
  );
}
