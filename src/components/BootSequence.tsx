"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

const LINES = [
  "> initializing blueprint renderer ............ OK",
  "> mounting subsystem graph ................... OK",
  "> establishing uplink :: YAKSH-CORE ......... OK",
  "> loading 6 production systems ............... OK",
  "> calibrating telemetry ..................... OK",
  "> ready.",
];

export default function BootSequence({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<number>(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onDone();
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= LINES.length) {
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
        {LINES.slice(0, shown).map((l, idx) => (
          <div
            key={idx}
            className={
              l.includes("ready")
                ? "text-amber glow-amber"
                : "text-paper-dim"
            }
          >
            {l}
          </div>
        ))}
        {shown < LINES.length && (
          <span className="cursor-blink text-cyan">█</span>
        )}
      </div>
    </div>
  );
}
