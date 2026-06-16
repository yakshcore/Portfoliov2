"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

const BASE_LINES = [
  "> initializing blueprint renderer ............ OK",
  "> mounting subsystem graph ................... OK",
  "> establishing uplink :: YAKSH-CORE ......... OK",
  "> loading 6 production systems ............... OK",
  "> calibrating telemetry ..................... OK",
];

function timeAgo(ms: number) {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// returning-visitor memory — recognizes the operator across visits
function buildLines() {
  const lines = [...BASE_LINES];
  let prev: { last?: number; count?: number } | null = null;
  try {
    const raw = localStorage.getItem("yb-visit");
    prev = raw ? JSON.parse(raw) : null;
  } catch {}

  if (prev?.last) {
    lines.push(`> returning operator :: last uplink ${timeAgo(prev.last)}`);
    lines.push(`> session log :: #${(prev.count || 1) + 1}`);
  } else {
    lines.push("> new operator detected :: welcome aboard");
  }

  try {
    localStorage.setItem(
      "yb-visit",
      JSON.stringify({ last: Date.now(), count: (prev?.count || 0) + 1 })
    );
  } catch {}

  lines.push("> ready.");
  return lines;
}

export default function BootSequence({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<number>(0);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const built = buildLines();
    setLines(built);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onDone();
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= built.length) {
        clearInterval(interval);
        gsap.to(root.current, {
          opacity: 0,
          duration: 0.6,
          delay: 0.45,
          ease: "power2.inOut",
          onComplete: () => {
            root.current?.style.setProperty("display", "none");
            onDone();
          },
        });
      }
    }, 230);

    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink-900 blueprint-grid"
    >
      <div className="w-[min(90vw,520px)] font-mono text-sm">
        <div className="tech-label mb-4 text-cyan">BLUEPRINT OS · v2.0</div>
        {lines.slice(0, shown).map((l, idx) => (
          <div
            key={idx}
            className={
              l.includes("ready")
                ? "text-amber glow-amber"
                : l.includes("operator")
                  ? "text-cyan glow-cyan"
                  : "text-paper-dim"
            }
          >
            {l}
          </div>
        ))}
        {shown < lines.length && (
          <span className="cursor-blink text-cyan">█</span>
        )}
      </div>
    </div>
  );
}
