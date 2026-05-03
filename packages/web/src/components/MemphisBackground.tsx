interface Props {
  children: React.ReactNode;
  className?: string;
  variant?: "cream" | "dark" | "yellow";
}

export function MemphisBackground({ children, className = "", variant = "cream" }: Props) {
  const bg =
    variant === "dark"   ? "#1a1a2e" :
    variant === "yellow" ? "#FFE566" :
    "#FAF7F2";

  return (
    <div style={{ position: "relative", background: bg, overflow: "hidden" }} className={className}>
      <svg
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Circles ── */}
        <circle cx="5%"  cy="12%" r="28" fill="none" stroke="#FF6B6B" strokeWidth="3" />
        <circle cx="5%"  cy="12%" r="14" fill="#FF6B6B" opacity="0.25" />
        <circle cx="92%" cy="8%"  r="44" fill="#4ECDC4" opacity="0.18" />
        <circle cx="92%" cy="8%"  r="22" fill="none" stroke="#4ECDC4" strokeWidth="3" />
        <circle cx="18%" cy="88%" r="52" fill="none" stroke="#6C63FF" strokeWidth="3" />
        <circle cx="18%" cy="88%" r="26" fill="#6C63FF" opacity="0.15" />
        <circle cx="80%" cy="78%" r="36" fill="#FF6B6B" opacity="0.15" />
        <circle cx="80%" cy="78%" r="18" fill="none" stroke="#FF6B6B" strokeWidth="2.5" />
        <circle cx="50%" cy="5%"  r="16" fill="#FFE566" stroke="#1a1a2e" strokeWidth="2.5" />
        <circle cx="70%" cy="55%" r="9"  fill="#FF6B6B" />
        <circle cx="30%" cy="45%" r="7"  fill="#4ECDC4" />
        <circle cx="88%" cy="40%" r="11" fill="#6C63FF" opacity="0.4" />

        {/* ── Dots grid ── */}
        {[0,1,2,3,4].map(col => [0,1,2,3].map(row => (
          <circle
            key={`d-${col}-${row}`}
            cx={`${10 + col * 20}%`} cy={`${20 + row * 22}%`}
            r="3.5" fill="#1a1a2e" opacity="0.12"
          />
        )))}

        {/* ── Triangles ── */}
        <polygon points="96,60 120,110 72,110" fill="none" stroke="#FFE566" strokeWidth="3" />
        <polygon points="96,70 114,103 78,103" fill="#FFE566" opacity="0.3" />
        <polygon points="300,620 330,580 360,620" fill="#4ECDC4" opacity="0.5" />
        <polygon points="300,620 330,580 360,620" fill="none" stroke="#4ECDC4" strokeWidth="2" />

        {/* ── Rectangles ── */}
        <rect x="2%" y="50%" width="32" height="32" rx="3" fill="#FFE566" stroke="#1a1a2e" strokeWidth="2.5" transform="rotate(18, 80, 400)" />
        <rect x="85%" y="25%" width="24" height="24" rx="2" fill="#FF6B6B" opacity="0.6" transform="rotate(-12, 900, 250)" />
        <rect x="60%" y="88%" width="40" height="14" rx="3" fill="#6C63FF" opacity="0.4" transform="rotate(8, 700, 800)" />
        <rect x="40%" y="3%"  width="18" height="18" rx="2" fill="#4ECDC4" stroke="#1a1a2e" strokeWidth="2" transform="rotate(30, 500, 40)" />

        {/* ── Zigzag lines ── */}
        <polyline
          points="0,200 30,180 60,200 90,180 120,200 150,180 180,200 210,180 240,200"
          fill="none" stroke="#FF6B6B" strokeWidth="2.5" opacity="0.25"
        />
        <polyline
          points="800,600 830,580 860,600 890,580 920,600 950,580 980,600 1010,580 1040,600"
          fill="none" stroke="#6C63FF" strokeWidth="2.5" opacity="0.2"
        />

        {/* ── Squiggles ── */}
        <path
          d="M 20 350 Q 50 330, 80 350 Q 110 370, 140 350 Q 170 330, 200 350"
          fill="none" stroke="#4ECDC4" strokeWidth="2.5" opacity="0.35"
        />
        <path
          d="M 900 450 Q 930 430, 960 450 Q 990 470, 1020 450 Q 1050 430, 1080 450"
          fill="none" stroke="#FFE566" strokeWidth="3" opacity="0.5"
          style={{ filter: "drop-shadow(0 0 2px rgba(255,229,102,0.4))" }}
        />

        {/* ── Diamonds ── */}
        <polygon points="160,40  175,55  160,70  145,55"  fill="#6C63FF" opacity="0.5" />
        <polygon points="870,320 885,335 870,350 855,335" fill="#FFE566" stroke="#1a1a2e" strokeWidth="2" />

        {/* ── Cross / Plus ── */}
        <line x1="76%" y1="65%" x2="76%" y2="72%" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round" />
        <line x1="74%" y1="68%" x2="78%" y2="68%" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round" />
        <line x1="22%" y1="30%" x2="22%" y2="37%" stroke="#4ECDC4" strokeWidth="3" strokeLinecap="round" />
        <line x1="20%" y1="33%" x2="24%" y2="33%" stroke="#4ECDC4" strokeWidth="3" strokeLinecap="round" />
      </svg>

      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
