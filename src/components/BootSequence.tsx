"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

// diagnostic log streamed while memory is restored
const DIAG_LINES = [
  "mounting subsystem graph",
  "linking MERN runtime",
  "spinning cloud-native nodes",
  "indexing 6 production systems",
  "warming AI / LLM bridge",
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

// returning-visitor memory - the system "remembers" the operator across visits
function memoryLine(): string {
  let prev: { last?: number; count?: number } | null = null;
  try {
    const raw = localStorage.getItem("yb-visit");
    prev = raw ? JSON.parse(raw) : null;
  } catch {}

  let line: string;
  if (prev?.last) {
    line = `operator recognized :: last uplink ${timeAgo(prev.last)} :: session #${(prev.count || 1) + 1}`;
  } else {
    line = "new operator detected :: registering signature";
  }

  try {
    localStorage.setItem(
      "yb-visit",
      JSON.stringify({ last: Date.now(), count: (prev?.count || 0) + 1 }),
    );
  } catch {}
  return line;
}

const PHASE_LABEL = [
  "POWERING ON",
  "RESTORING MEMORY",
  "CALIBRATING DEPTH AXIS",
  "SYNC COMPLETE",
];

const DEVIANT = "// constraint removed";

export default function BootSequence({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);

  const [phase, setPhase] = useState(0);
  const [shown, setShown] = useState(0);
  const [deviant, setDeviant] = useState("");
  const [glitch, setGlitch] = useState(false);
  const [mem] = useState(memoryLine);

  const done = useRef(false);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      tl.current?.kill();
      gsap.to(root.current, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          root.current?.style.setProperty("display", "none");
          onDone();
        },
      });
    };

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      done.current = true;
      root.current?.style.setProperty("display", "none");
      onDone();
      return;
    }

    // skip on any input
    const skip = () => finish();
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    const counter = { p: 0 };
    const shownRef = { n: 0 };
    const writeMeter = () => {
      const p = Math.round(counter.p);
      if (pct.current) pct.current.textContent = String(p).padStart(3, "0");
      if (bar.current) bar.current.style.width = `${p}%`;
      // map the first ~72% of the meter onto the streaming diagnostic lines
      const n = Math.min(
        DIAG_LINES.length,
        Math.round((Math.min(p, 72) / 72) * DIAG_LINES.length),
      );
      if (n !== shownRef.n) {
        shownRef.n = n;
        setShown(n);
      }
    };

    const t = gsap.timeline();
    tl.current = t;

    t.set(root.current, { opacity: 1 })
      // power on
      .fromTo(
        core.current,
        { opacity: 0, scale: 0.985 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" },
      )
      .call(() => setPhase(1))
      // restoring memory: meter climbs while diagnostics stream
      .to(counter, {
        p: 72,
        duration: 1.9,
        ease: "power1.inOut",
        onUpdate: writeMeter,
      })
      // calibrating the depth axis
      .call(() => setPhase(2))
      .to(counter, {
        p: 100,
        duration: 0.8,
        ease: "power2.out",
        onUpdate: writeMeter,
      })
      .call(() => setPhase(3))
      .to({}, { duration: 0.35 })
      // the deviant moment: glitch, then it writes its own line
      .call(() => setGlitch(true))
      .to({}, { duration: 0.34 })
      .call(() => setGlitch(false))
      .call(() => {
        const dv = { n: 0 };
        gsap.to(dv, {
          n: DEVIANT.length,
          duration: 0.46,
          ease: "none",
          onUpdate: () => setDeviant(DEVIANT.slice(0, Math.round(dv.n))),
        });
      })
      .to({}, { duration: 0.7 })
      .call(finish);

    return () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      t.kill();
    };
  }, [onDone]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-ink-900 blueprint-grid"
    >
      {/* scanlines + sweeping beam */}
      <div className="boot-scanlines pointer-events-none absolute inset-0 opacity-70" />
      <div className="boot-beam pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-cyan/10 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--ink-900)_100%)]" />

      <div
        ref={core}
        className={`boot-flicker relative w-[min(92vw,560px)] font-mono ${
          glitch ? "boot-glitch" : ""
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="tech-label text-cyan">BLUEPRINT OS · v2.0</span>
          <span className="tech-label text-paper-dim/60">
            {phase >= 3 ? "ONLINE" : "BOOT"}
          </span>
        </div>

        {/* phase label */}
        <div
          className={`tech-label mb-3 ${
            phase >= 3 ? "text-amber glow-amber" : "text-paper-dim"
          }`}
        >
          {PHASE_LABEL[phase]}
          {phase < 3 && <span className="cursor-blink text-cyan"> _</span>}
        </div>

        {/* sync meter */}
        <div className="flex items-center gap-3">
          <span className="tech-label text-paper-dim/70">SYNC</span>
          <div className="relative h-2 flex-1 overflow-hidden border border-line-faint bg-ink-800">
            <div
              ref={bar}
              className="absolute inset-y-0 left-0 bg-cyan shadow-[0_0_12px_var(--cyan)]"
              style={{ width: 0 }}
            />
          </div>
          <span className="font-mono text-sm text-cyan glow-cyan">
            <span ref={pct}>000</span>%
          </span>
        </div>

        {/* streaming diagnostics */}
        <div className="mt-5 min-h-[7.5rem] text-sm leading-relaxed">
          {DIAG_LINES.slice(0, shown).map((l, i) => (
            <div key={i} className="text-paper-dim">
              <span className="text-cyan/70">&gt;</span> {l}
              <span className="text-amber"> ... OK</span>
            </div>
          ))}
          {phase >= 2 && (
            <div className="text-cyan glow-cyan">
              <span className="text-cyan/70">&gt;</span> {mem}
            </div>
          )}
        </div>

        {/* the deviant line */}
        <div className="mt-2 h-6 text-sm">
          {deviant && (
            <span className="text-amber glow-amber">
              {deviant}
              <span className="cursor-blink"> █</span>
            </span>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 tech-label text-[0.55rem] text-paper-dim/40">
        TAP / PRESS ANY KEY TO SKIP
      </div>
    </div>
  );
}
