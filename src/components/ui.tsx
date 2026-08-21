import { useEffect, useRef, type ReactNode, type SVGProps } from "react";

/* ---------- появление при скролле ---------- */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

/* ---------- заголовок раздела ---------- */
export function SectionHead({
  num,
  title,
  sub,
  light = false,
}: {
  num: string;
  title: string;
  sub?: string;
  light?: boolean;
}) {
  return (
    <Reveal className="mb-10 md:mb-14">
      <div className="flex items-baseline gap-4">
        <span className={`font-mono text-sm md:text-base tracking-widest ${light ? "text-copper-600" : "text-copper-400"}`}>
          /{num}
        </span>
        <span className={`h-px flex-1 ${light ? "bg-ink-900/15" : "bg-pine-600/60"}`} />
      </div>
      <h2
        className={`mt-4 font-display font-bold uppercase leading-tight text-2xl md:text-4xl tracking-tight ${
          light ? "text-ink-900" : "text-pine-100"
        }`}
      >
        {title}
      </h2>
      {sub && <p className={`mt-3 max-w-2xl text-sm md:text-base ${light ? "text-ink-500" : "text-pine-300"}`}>{sub}</p>}
    </Reveal>
  );
}

/* ---------- иконки (рисованные) ---------- */
type IP = SVGProps<SVGSVGElement>;
const base = (p: IP) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconChip = (p: IP) => (
  <svg {...base(p)}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
    <rect x="9.5" y="9.5" width="5" height="5" />
    <path d="M9 6V3M15 6V3M9 21v-3M15 21v-3M6 9H3M6 15H3M21 9h-3M21 15h-3" />
  </svg>
);
export const IconCard = (p: IP) => (
  <svg {...base(p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M7 10h4M7 13.5h7" />
    <circle cx="17" cy="10.5" r="1.6" />
  </svg>
);
export const IconClock = (p: IP) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const IconBell = (p: IP) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
  </svg>
);
export const IconDownload = (p: IP) => (
  <svg {...base(p)}>
    <path d="M12 4v10m0 0l-4-4m4 4l4-4" />
    <path d="M4.5 16.5v2A1.5 1.5 0 006 20h12a1.5 1.5 0 001.5-1.5v-2" />
  </svg>
);
export const IconCopy = (p: IP) => (
  <svg {...base(p)}>
    <rect x="8" y="8" width="12" height="12" rx="1.5" />
    <path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8" />
  </svg>
);
export const IconCheck = (p: IP) => (
  <svg {...base(p)}>
    <path d="M4.5 12.5l5 5L19.5 7" />
  </svg>
);
export const IconWrench = (p: IP) => (
  <svg {...base(p)}>
    <path d="M14.5 6.5a4 4 0 00-5.4 4.8L4 16.4a1.8 1.8 0 102.6 2.6l5.1-5.1a4 4 0 004.8-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" />
  </svg>
);
export const IconDoc = (p: IP) => (
  <svg {...base(p)}>
    <path d="M6 3.5h8L19 8.5V20a.5.5 0 01-.5.5h-12A.5.5 0 016 20V3.5z" />
    <path d="M14 3.5V9h5M9 13h6M9 16.5h6" />
  </svg>
);
export const IconPlay = (p: IP) => (
  <svg {...base(p)}>
    <path d="M8 5.5v13l10-6.5z" />
  </svg>
);
export const IconPause = (p: IP) => (
  <svg {...base(p)}>
    <path d="M8.5 5.5v13M15.5 5.5v13" />
  </svg>
);
export const IconArrowR = (p: IP) => (
  <svg {...base(p)}>
    <path d="M4 12h15m0 0l-5.5-5.5M19 12l-5.5 5.5" />
  </svg>
);
export const IconAlert = (p: IP) => (
  <svg {...base(p)}>
    <path d="M12 3.5l9.5 16.5H2.5L12 3.5z" />
    <path d="M12 10v4.5M12 17.6v.2" />
  </svg>
);
export const IconWifi = (p: IP) => (
  <svg {...base(p)}>
    <path d="M3 9.5a13 13 0 0118 0M6.5 13a8 8 0 0111 0M9.8 16.4a3.5 3.5 0 014.4 0" />
    <path d="M12 19.5v.2" />
  </svg>
);
export const IconSound = (p: IP) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" />
    <path d="M15.5 9a4.2 4.2 0 010 6M18 6.5a8 8 0 010 11" />
  </svg>
);
export const IconMute = (p: IP) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" />
    <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
  </svg>
);
export const IconTag = (p: IP) => (
  <svg {...base(p)}>
    <path d="M3.5 11V4.5A1 1 0 014.5 3.5H11l9 9a1.4 1.4 0 010 2l-5.5 5.5a1.4 1.4 0 01-2 0l-9-9z" />
    <circle cx="8" cy="8" r="1.4" />
  </svg>
);
export const IconSwap = (p: IP) => (
  <svg {...base(p)}>
    <path d="M4 8h13m0 0l-3.5-3.5M17 8l-3.5 3.5M20 16H7m0 0l3.5-3.5M7 16l3.5 3.5" />
  </svg>
);
