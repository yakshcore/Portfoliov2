"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import type { DiagramNode, Reconstruction as Recon } from "@/data/portfolio";
import { sound } from "@/lib/sound";

// hex (not CSS vars) so GSAP can tween border/glow on the stress beats
const KIND_HEX: Record<DiagramNode["kind"], string> = {
  client: "#43c9ff",
  edge: "#8aa6c0",
  service: "#7fe0ff",
  data: "#ffb347",
  external: "#8aa6c0",
  ai: "#ffcb6b",
};
const STRESS_HEX = "#ff5a5a";

const T = 1; // timeline time per phase
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const TICK_COUNT = 64;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

// Detroit-style keycap: bracketed square with a down-caret above it.
// Tap = step one phase; press and hold = run the timeline in that direction.
function KeyCap({
  letter,
  dir,
  onTap,
  onHoldStart,
  onHoldEnd,
}: {
  letter: string;
  dir: -1 | 1;
  onTap: (dir: -1 | 1) => void;
  onHoldStart: (dir: -1 | 1) => void;
  onHoldEnd: () => void;
}) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);

  const down = () => {
    holding.current = false;
    holdTimer.current = setTimeout(() => {
      holding.current = true;
      onHoldStart(dir);
    }, 220);
  };
  const up = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (holding.current) {
      holding.current = false;
      onHoldEnd();
    } else {
      onTap(dir);
    }
  };
  const cancel = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (holding.current) {
      holding.current = false;
      onHoldEnd();
    }
  };

  return (
    <button
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onMouseEnter={() => sound.play("hover")}
      aria-label={`Key ${letter}`}
      className="group relative flex h-11 w-11 shrink-0 touch-none items-center justify-center"
    >
      <span className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent border-t-paper/80 transition-colors group-hover:border-t-cyan" />
      <span className="relative flex h-9 w-9 items-center justify-center border border-paper/60 font-mono text-sm font-medium text-paper transition-colors group-hover:border-cyan group-hover:text-cyan">
        {letter}
        <span className="absolute -left-1 -top-1 h-1.5 w-1.5 border-l border-t border-paper/60 transition-colors group-hover:border-cyan" />
        <span className="absolute -right-1 -top-1 h-1.5 w-1.5 border-r border-t border-paper/60 transition-colors group-hover:border-cyan" />
        <span className="absolute -bottom-1 -left-1 h-1.5 w-1.5 border-b border-l border-paper/60 transition-colors group-hover:border-cyan" />
        <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 border-b border-r border-paper/60 transition-colors group-hover:border-cyan" />
      </span>
    </button>
  );
}

export default function Reconstruction({
  data,
  title,
  onClose,
}: {
  data: Recon;
  title: string;
  onClose: () => void;
}) {
  const { graph, phases } = data;
  const { nodes, edges } = graph;
  const N = phases.length;

  // ---- derived: when each node / edge first comes online ----
  const nodePhase: Record<string, number> = {};
  phases.forEach((ph, p) =>
    ph.add.forEach((id) => {
      if (nodePhase[id] === undefined) nodePhase[id] = p;
    }),
  );
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const edgePhase = edges.map((e) =>
    Math.max(nodePhase[e.from] ?? 0, nodePhase[e.to] ?? 0),
  );
  const stressNodes = Array.from(
    new Set(phases.flatMap((p) => (p.stress ? [p.stress] : []))),
  );

  // ---- element ref maps ----
  const nodeWrap = useRef<Record<string, HTMLDivElement | null>>({});
  const nodeInner = useRef<Record<string, HTMLDivElement | null>>({});
  const ringEl = useRef<Record<string, HTMLDivElement | null>>({});
  const edgePath = useRef<(SVGPathElement | null)[]>([]);
  const flowPath = useRef<(SVGPathElement | null)[]>([]);
  const labelEl = useRef<(HTMLSpanElement | null)[]>([]);

  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const timecode = useRef<HTMLSpanElement>(null);

  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const stepTween = useRef<gsap.core.Tween | null>(null);
  const notchRef = useRef<number[]>([]);
  const phaseRef = useRef(0);

  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [notches, setNotches] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [isFs, setIsFs] = useState(false);

  // ---- zoom / pan (imperative, never re-renders the animated svg) ----
  const view = useRef({ scale: 1, tx: 0, ty: 0 });
  const panning = useRef(false);
  const lastPt = useRef({ x: 0, y: 0 });

  const clampPan = useCallback((tx: number, ty: number, scale: number) => {
    const el = canvas.current;
    if (!el) return { tx, ty };
    const w = el.clientWidth;
    const h = el.clientHeight;
    return {
      tx: clamp(tx, w * (1 - scale), 0),
      ty: clamp(ty, h * (1 - scale), 0),
    };
  }, []);

  const applyView = useCallback(() => {
    const l = layer.current;
    if (!l) return;
    const { scale, tx, ty } = view.current;
    l.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    if (readout.current) readout.current.textContent = `${scale.toFixed(1)}×`;
    if (canvas.current)
      canvas.current.style.cursor =
        scale > 1 ? (panning.current ? "grabbing" : "grab") : "default";
  }, []);

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      const el = canvas.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = cx - rect.left;
      const my = cy - rect.top;
      const { scale, tx, ty } = view.current;
      const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
      if (next === scale) return;
      const wx = (mx - tx) / scale;
      const wy = (my - ty) / scale;
      let ntx = next === 1 ? 0 : mx - wx * next;
      let nty = next === 1 ? 0 : my - wy * next;
      ({ tx: ntx, ty: nty } = clampPan(ntx, nty, next));
      view.current = { scale: next, tx: ntx, ty: nty };
      applyView();
    },
    [applyView, clampPan],
  );

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onCanvasDown = (e: React.PointerEvent) => {
    if (view.current.scale <= 1) return;
    panning.current = true;
    lastPt.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    applyView();
  };
  const onCanvasMove = (e: React.PointerEvent) => {
    if (!panning.current) return;
    const dx = e.clientX - lastPt.current.x;
    const dy = e.clientY - lastPt.current.y;
    lastPt.current = { x: e.clientX, y: e.clientY };
    const v = view.current;
    const p = clampPan(v.tx + dx, v.ty + dy, v.scale);
    view.current = { ...v, ...p };
    applyView();
  };
  const onCanvasUp = () => {
    panning.current = false;
    applyView();
  };

  const zoomBtn = (dir: 1 | -1) => {
    const el = canvas.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    sound.play("blip");
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, dir > 0 ? 1.4 : 1 / 1.4);
  };
  const resetView = () => {
    sound.play("blip");
    view.current = { scale: 1, tx: 0, ty: 0 };
    applyView();
  };

  // ---- fullscreen ----
  const toggleFs = () => {
    const el = root.current;
    if (!el) return;
    sound.play("blip");
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };
  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ---- phase helpers ----
  const phaseAt = useCallback((f: number) => {
    const nf = notchRef.current;
    let idx = 0;
    for (let k = 0; k < nf.length; k++) if (f + 1e-4 >= nf[k]) idx = k;
    return idx;
  }, []);

  const syncUI = useCallback(
    (f: number) => {
      if (playhead.current) playhead.current.style.left = `${f * 100}%`;
      // reveal the bright filmstrip up to the playhead
      if (fill.current)
        fill.current.style.clipPath = `inset(0 ${(1 - f) * 100}% 0 0)`;
      if (timecode.current) {
        const t = f * 8;
        const ss = Math.floor(t);
        const mmm = Math.floor((t - ss) * 1000);
        timecode.current.textContent = `${String(ss).padStart(2, "0")}:${String(
          mmm,
        ).padStart(3, "0")}`;
      }
      const np = phaseAt(f);
      if (np !== phaseRef.current) {
        phaseRef.current = np;
        setPhase(np);
      }
    },
    [phaseAt],
  );

  const scrubTo = useCallback(
    (f: number) => {
      f = clamp(f, 0, 1);
      stepTween.current?.kill();
      tlRef.current?.pause();
      tlRef.current?.progress(f);
      syncUI(f);
    },
    [syncUI],
  );

  // ---- build the (paused) reconstruction timeline ----
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      Object.values(nodeWrap.current).forEach(
        (w) => w && gsap.set(w, { opacity: 0, scale: 0.5 }),
      );
      edgePath.current.forEach(
        (p) => p && gsap.set(p, { strokeDasharray: 1, strokeDashoffset: 1 }),
      );
      flowPath.current.forEach((p) => p && gsap.set(p, { opacity: 0 }));
      labelEl.current.forEach((l) => l && gsap.set(l, { opacity: 0 }));
      Object.values(ringEl.current).forEach(
        (r) => r && gsap.set(r, { opacity: 0 }),
      );

      const tl = gsap.timeline({ paused: true });

      phases.forEach((ph, p) => {
        const start = p * T;
        ph.add.forEach((id, k) => {
          const w = nodeWrap.current[id];
          if (w)
            tl.fromTo(
              w,
              { opacity: 0, scale: 0.5 },
              { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.8)" },
              start + k * 0.05,
            );
        });
        edges.forEach((_, i) => {
          if (edgePhase[i] !== p) return;
          const ep = edgePath.current[i];
          const fp = flowPath.current[i];
          const lb = labelEl.current[i];
          if (ep)
            tl.to(
              ep,
              { strokeDashoffset: 0, duration: 0.45, ease: "power1.inOut" },
              start + 0.15,
            );
          if (fp) tl.to(fp, { opacity: 1, duration: 0.3 }, start + 0.35);
          if (lb) tl.to(lb, { opacity: 1, duration: 0.3 }, start + 0.35);
        });
        if (ph.stress) {
          const r = ringEl.current[ph.stress];
          const inner = nodeInner.current[ph.stress];
          if (r) tl.to(r, { opacity: 1, duration: 0.3 }, start + 0.25);
          if (inner)
            tl.to(
              inner,
              {
                borderColor: STRESS_HEX,
                boxShadow: `0 0 16px ${STRESS_HEX}`,
                duration: 0.3,
              },
              start + 0.25,
            );
        }
        if (ph.resolve) {
          const id = ph.resolve;
          const r = ringEl.current[id];
          const inner = nodeInner.current[id];
          const hex = KIND_HEX[nodeById[id]?.kind ?? "service"];
          if (r) tl.to(r, { opacity: 0, duration: 0.3 }, start + 0.2);
          if (inner)
            tl.to(
              inner,
              { borderColor: hex, boxShadow: `0 0 8px ${hex}`, duration: 0.3 },
              start + 0.2,
            );
        }
      });

      tlRef.current = tl;
      const dur = tl.duration() || 1;
      const nf = phases.map((_, k) => Math.min(1, (k * T + 0.45) / dur));
      notchRef.current = nf;
      setNotches(nf);
      setReady(true);

      tl.eventCallback("onUpdate", () => syncUI(tl.progress()));
      tl.eventCallback("onComplete", () => setPlaying(false));

      if (reduce) {
        tl.progress(1);
        syncUI(1);
      } else {
        tl.progress(0);
        syncUI(0);
      }
    }, canvas);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- transport ----
  const togglePlay = useCallback(() => {
    const tl = tlRef.current;
    if (!tl) return;
    sound.play("blip");
    stepTween.current?.kill();
    if (playing) {
      tl.pause();
      setPlaying(false);
    } else {
      if (tl.progress() >= 0.999) tl.progress(0);
      tl.play();
      setPlaying(true);
    }
  }, [playing]);

  // smoothly run the timeline to a phase (A / D tap, notch clicks)
  const stepTo = useCallback((k: number) => {
    const tl = tlRef.current;
    if (!tl) return;
    const nf = notchRef.current;
    const idx = clamp(k, 0, nf.length - 1);
    setPlaying(false);
    stepTween.current?.kill();
    tl.pause();
    sound.play("blip");
    const targetTime = nf[idx] * (tl.duration() || 1);
    stepTween.current = tl.tweenTo(targetTime, {
      duration: 0.6,
      ease: "power2.inOut",
    });
  }, []);

  const tapStep = useCallback((dir: -1 | 1) => stepTo(phaseRef.current + dir), [
    stepTo,
  ]);

  // press-and-hold: run the timeline continuously in a direction
  const holdStart = useCallback((dir: -1 | 1) => {
    const tl = tlRef.current;
    if (!tl) return;
    stepTween.current?.kill();
    setPlaying(false);
    tl.pause();
    const dur = tl.duration() || 1;
    const target = dir > 0 ? dur : 0;
    const at = tl.time();
    const speed = dur / 4; // a full sweep takes ~4s
    const d = Math.abs(target - at) / speed;
    if (d < 0.02) return;
    sound.play("blip");
    stepTween.current = tl.tweenTo(target, { duration: d, ease: "none" });
  }, []);

  const holdEnd = useCallback(() => {
    stepTween.current?.kill();
  }, []);

  // pointer scrubbing on the track
  const dragging = useRef(false);
  const fromClientX = useCallback(
    (clientX: number) => {
      const el = track.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPlaying(false);
      scrubTo((clientX - r.left) / r.width);
    },
    [scrubTo],
  );

  // keyboard: A / D step, space play, esc close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // in browser-fullscreen, let Esc just drop fullscreen first
      if (e.key === "Escape") {
        if (!document.fullscreenElement) onClose();
      } else if (k === "d") stepTo(phaseRef.current + 1);
      else if (k === "a") stepTo(phaseRef.current - 1);
      else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (document.fullscreenElement) document.exitFullscreen?.();
    };
  }, [onClose, stepTo, togglePlay]);

  const cur = phases[phase];

  // filmstrip ticks + gold "event" zones (the stress windows)
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => i / (TICK_COUNT - 1));
  const goldRanges: [number, number][] = [];
  if (notches.length === N) {
    phases.forEach((ph, p) => {
      if (!ph.stress) return;
      let rp = phases.findIndex((q, qi) => qi > p && q.resolve === ph.stress);
      if (rp < 0) rp = N - 1;
      goldRanges.push([notches[p] ?? 0, notches[rp] ?? 1]);
    });
  }
  const inGold = (pos: number) =>
    goldRanges.some(([s, e]) => pos >= s && pos < e);
  const evTotal = stressNodes.length;
  const evAnalyzed = phases.filter((ph, p) => ph.stress && p <= phase).length;

  let stressActive: { msg: string } | null = null;
  let fixDone: { fix: string } | null = null;
  for (let p = 0; p <= phase; p++) {
    const ph = phases[p];
    if (ph.stress && ph.stressMsg) stressActive = { msg: ph.stressMsg };
    if (ph.resolve) {
      stressActive = null;
      if (ph.fix) fixDone = { fix: ph.fix };
    }
  }

  const ctrlBtn =
    "flex h-8 w-8 items-center justify-center bg-ink-900 font-mono text-sm text-paper-dim transition-colors hover:bg-ink-800 hover:text-cyan";

  return createPortal(
    <div
      ref={root}
      className="fixed inset-0 z-[80] flex flex-col bg-ink-900/96 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 blueprint-grid opacity-40" />

      {/* header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 md:px-8">
        <div className="tech-label flex items-center gap-3 text-cyan">
          <span className="h-px w-8 bg-cyan" />
          {title} · RECONSTRUCTION
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`tech-label ${
              phase >= N - 1 ? "text-cyan glow-cyan" : "text-amber glow-amber"
            }`}
          >
            {phase >= N - 1 ? "RECONSTRUCTION COMPLETE" : "ANALYZING..."}
          </span>
          <button
            onClick={onClose}
            onMouseEnter={() => sound.play("hover")}
            aria-label="Close reconstruction"
            className="flex h-9 items-center gap-2 border border-line-faint bg-ink-900/80 px-3 font-mono text-xs text-paper-dim transition-colors hover:border-cyan hover:text-cyan"
          >
            ESC <span className="text-base leading-none">×</span>
          </button>
        </div>
      </div>

      {/* body: diagram + log rail */}
      <div className="relative z-10 flex min-h-0 flex-1 gap-4 px-4 pb-2 md:px-8">
        {/* diagram canvas */}
        <div
          ref={canvas}
          onPointerDown={onCanvasDown}
          onPointerMove={onCanvasMove}
          onPointerUp={onCanvasUp}
          onPointerLeave={onCanvasUp}
          className="diagram online relative min-h-0 flex-1 touch-none select-none overflow-hidden rounded border border-line-faint bg-ink-800/40"
        >
          <div className="pointer-events-none absolute inset-0 rounded blueprint-grid opacity-50" />

          {/* transformed layer (zoom / pan) */}
          <div
            ref={layer}
            className="absolute inset-0 origin-top-left will-change-transform"
          >
            {/* stress rings (behind cards) */}
            {stressNodes.map((id) => {
              const n = nodeById[id];
              if (!n) return null;
              return (
                <div
                  key={`ring-${id}`}
                  ref={(el) => {
                    ringEl.current[id] = el;
                  }}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${n.x}%`, top: `${n.y}%`, opacity: 0 }}
                >
                  <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-[#ff5a5a]" />
                  <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff5a5a]/60" />
                </div>
              );
            })}

            {/* edges + flow packets */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {edges.map((e, i) => {
                const a = nodeById[e.from];
                const b = nodeById[e.to];
                if (!a || !b) return null;
                const midX = (a.x + b.x) / 2;
                const d = `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
                return (
                  <g key={i}>
                    <path
                      ref={(el) => {
                        edgePath.current[i] = el;
                      }}
                      className="edge"
                      d={d}
                      pathLength={1}
                      fill="none"
                      stroke="var(--line-dim)"
                      strokeWidth={1.2}
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      ref={(el) => {
                        flowPath.current[i] = el;
                      }}
                      className="flow"
                      d={d}
                      pathLength={1}
                      fill="none"
                      stroke="var(--cyan-bright)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray="0.04 0.3"
                      style={{ animationDelay: `${(i % 5) * 0.4}s`, opacity: 0 }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* edge labels */}
            {edges.map((e, i) => {
              const a = nodeById[e.from];
              const b = nodeById[e.to];
              if (!a || !b || !e.label) return null;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <span
                  key={`l-${i}`}
                  ref={(el) => {
                    labelEl.current[i] = el;
                  }}
                  className="edge-label tech-label pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 bg-ink-900/80 px-1 text-[0.55rem] text-cyan"
                  style={{ left: `${mx}%`, top: `${my}%`, opacity: 0 }}
                >
                  {e.label}
                </span>
              );
            })}

            {/* node cards */}
            {nodes.map((n) => (
              <div
                key={n.id}
                ref={(el) => {
                  nodeWrap.current[n.id] = el;
                }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${n.x}%`, top: `${n.y}%`, opacity: 0 }}
              >
                <div
                  ref={(el) => {
                    nodeInner.current[n.id] = el;
                  }}
                  className="flex min-w-[5rem] flex-col items-center rounded-sm border bg-ink-900/90 px-2.5 py-1.5 backdrop-blur"
                  style={{ borderColor: KIND_HEX[n.kind] }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="node-dot h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: KIND_HEX[n.kind],
                        boxShadow: `0 0 6px ${KIND_HEX[n.kind]}`,
                      }}
                    />
                    <span className="font-display text-xs font-semibold text-paper">
                      {n.label}
                    </span>
                  </div>
                  {n.sub && (
                    <span className="tech-label mt-0.5 text-[0.5rem] tracking-[0.15em]">
                      {n.sub}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* zoom + fullscreen controls */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-2 top-2 z-20 flex flex-col gap-px border border-line-faint bg-line-faint"
          >
            <button onClick={() => zoomBtn(1)} className={ctrlBtn} aria-label="Zoom in">
              +
            </button>
            <button onClick={() => zoomBtn(-1)} className={ctrlBtn} aria-label="Zoom out">
              −
            </button>
            <button onClick={resetView} className={ctrlBtn} aria-label="Reset view">
              ⤢
            </button>
            <button onClick={toggleFs} className={ctrlBtn} aria-label="Toggle fullscreen">
              {isFs ? "⤡" : "⛶"}
            </button>
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-3">
            <span ref={readout} className="tech-label tabular-nums text-cyan">
              1.0×
            </span>
            <span className="tech-label text-[0.5rem] text-paper-dim/70">
              SCROLL TO ZOOM · DRAG TO PAN
            </span>
          </div>
        </div>

        {/* commit log + stress rail */}
        <aside className="hidden w-72 shrink-0 flex-col gap-3 lg:flex">
          <div className="tech-label text-paper-dim/70">COMMIT LOG</div>
          <div className="flex-1 overflow-hidden rounded border border-line-faint bg-ink-900/60 p-3 font-mono text-[0.7rem] leading-relaxed">
            {phases.slice(0, phase + 1).map((ph, i) => (
              <div key={i} className="mb-1.5">
                <span className="text-paper-dim/50">{ph.at} </span>
                <span className={i === phase ? "text-cyan" : "text-paper-dim"}>
                  {ph.commit}
                </span>
              </div>
            ))}
            <span className="cursor-blink text-cyan">█</span>
          </div>

          {stressActive && (
            <div className="rounded border border-[#ff5a5a]/50 bg-[#ff5a5a]/10 p-3">
              <div className="tech-label text-[#ff8a8a]">⚠ STRESS DETECTED</div>
              <p className="mt-1.5 text-xs leading-relaxed text-paper">
                {stressActive.msg}
              </p>
            </div>
          )}
          {!stressActive && fixDone && (
            <div className="rounded border border-cyan/40 bg-cyan/10 p-3">
              <div className="tech-label text-cyan">✓ RESOLVED</div>
              <p className="mt-1.5 text-xs leading-relaxed text-paper">
                {fixDone.fix}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* transport + scrubber - Detroit reconstruction bar */}
      <div className="relative z-10 px-4 pb-6 pt-3 md:px-8">
        {/* current beat */}
        <div className="mb-2 flex items-baseline gap-3">
          <span className="tech-label shrink-0 text-amber">
            {cur?.at} · {cur?.title}
          </span>
          <span className="truncate text-xs text-paper-dim">{cur?.note}</span>
        </div>

        {/* status row */}
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-1 items-center gap-4">
            <span className="font-mono text-sm uppercase tracking-[0.25em] text-paper">
              {phase >= N - 1 ? "RECONSTRUCT COMPLETE" : "RECONSTRUCT INCOMPLETE"}
            </span>
            <span className="h-px flex-1 bg-line-faint" />
          </div>
          <div className="flex items-end gap-3">
            <div className="text-right leading-[1.05]">
              <div className="tech-label text-[0.55rem] text-paper-dim/70">
                EVENTS
              </div>
              <div className="tech-label text-[0.55rem] text-paper-dim/70">
                ANALYZED
              </div>
            </div>
            <span className="font-display text-3xl font-light tabular-nums text-paper">
              {evTotal > 0 ? `${evAnalyzed}/${evTotal}` : `${phase + 1}/${N}`}
            </span>
          </div>
        </div>

        {/* track row */}
        <div className="mt-3 flex items-center gap-3">
          {/* crosshair */}
          <div className="relative hidden h-11 w-5 shrink-0 sm:block">
            <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 bg-paper/40" />
            <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-paper/40" />
          </div>

          <KeyCap
            letter="A"
            dir={-1}
            onTap={tapStep}
            onHoldStart={holdStart}
            onHoldEnd={holdEnd}
          />

          <div
            ref={track}
            onPointerDown={(e) => {
              dragging.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              fromClientX(e.clientX);
            }}
            onPointerMove={(e) => dragging.current && fromClientX(e.clientX)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
            className="relative h-12 flex-1 cursor-pointer select-none border-y border-line-faint/60"
          >
            {/* dim filmstrip */}
            <div className="absolute inset-0 flex items-center justify-between px-3">
              {ticks.map((pos, i) => (
                <span
                  key={i}
                  className="w-px"
                  style={{
                    height: i % 8 === 0 ? "70%" : "45%",
                    background: inGold(pos)
                      ? "rgba(255,179,71,0.35)"
                      : "rgba(138,166,192,0.32)",
                  }}
                />
              ))}
            </div>
            {/* bright filmstrip, revealed up to the playhead */}
            <div
              ref={fill}
              className="absolute inset-0 flex items-center justify-between px-3"
              style={{ clipPath: "inset(0 100% 0 0)" }}
            >
              {ticks.map((pos, i) => (
                <span
                  key={i}
                  className="w-px"
                  style={{
                    height: i % 8 === 0 ? "70%" : "45%",
                    background: inGold(pos) ? "#ffcb6b" : "#dceaf6",
                    boxShadow: inGold(pos)
                      ? "0 0 6px #ffb347"
                      : "0 0 4px rgba(220,234,246,0.5)",
                  }}
                />
              ))}
            </div>

            {/* segment dividers at each phase boundary */}
            {notches.map((f, k) => (
              <span
                key={`dv-${k}`}
                className="pointer-events-none absolute top-1/2 h-[78%] w-px -translate-x-1/2 -translate-y-1/2 bg-line-dim/45"
                style={{ left: `${f * 100}%` }}
              />
            ))}

            {/* gold event brackets (the stress windows) */}
            {goldRanges.map(([s, e], i) => (
              <div
                key={`g-${i}`}
                className="pointer-events-none absolute top-1/2 h-[82%] -translate-y-1/2"
                style={{ left: `${s * 100}%`, width: `${(e - s) * 100}%` }}
              >
                <span className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-amber" />
                <span className="absolute right-0 top-0 h-1.5 w-1.5 border-r border-t border-amber" />
                <span className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b border-l border-amber" />
                <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-amber" />
              </div>
            ))}

            {/* in / out brackets at the strip ends */}
            <span className="pointer-events-none absolute left-0 top-1/2 h-[86%] w-1.5 -translate-y-1/2 border-y border-l border-paper/60" />
            <span className="pointer-events-none absolute right-0 top-1/2 h-[86%] w-1.5 -translate-y-1/2 border-y border-r border-paper/60" />

            {/* phase notches (clickable, label on hover) */}
            {notches.map((f, k) => (
              <button
                key={k}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  stepTo(k);
                }}
                aria-label={`Go to ${phases[k].at}`}
                className="group absolute bottom-0 top-0 w-3 -translate-x-1/2"
                style={{ left: `${f * 100}%` }}
              >
                <span className="tech-label pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.5rem] text-paper-dim/60 opacity-0 transition-opacity group-hover:opacity-100">
                  {phases[k].at}
                </span>
              </button>
            ))}

            {/* playhead */}
            <div
              ref={playhead}
              className="pointer-events-none absolute top-0 h-full w-px -translate-x-1/2 bg-cyan-bright shadow-[0_0_10px_var(--cyan)]"
              style={{ left: "0%" }}
            >
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-cyan-bright" />
            </div>
          </div>

          <KeyCap
            letter="D"
            dir={1}
            onTap={tapStep}
            onHoldStart={holdStart}
            onHoldEnd={holdEnd}
          />

          {/* balance the crosshair column */}
          <div className="hidden w-5 shrink-0 sm:block" />
        </div>

        {/* timecode + secondary ruler, aligned under the strip */}
        <div className="mt-1.5 flex items-start gap-3">
          <div className="hidden w-5 shrink-0 sm:block" />
          <div className="w-11 shrink-0" />
          <div className="relative flex-1">
            <div className="flex items-center justify-between">
              <span
                ref={timecode}
                className="font-mono text-xs tabular-nums text-paper-dim"
              >
                00:000
              </span>
              <span className="tech-label text-[0.5rem] text-paper-dim/50">
                {ready ? "A / D HOLD TO RUN · TAP TO STEP" : "LOADING..."}
              </span>
            </div>
            <div className="relative mt-1 h-2.5">
              <span className="absolute left-0 right-0 top-0 h-px bg-line-faint/60" />
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <span
                  key={f}
                  className="absolute top-0 h-2 w-px bg-paper-dim/35"
                  style={{ left: `${f * 100}%` }}
                />
              ))}
            </div>
          </div>
          <div className="w-11 shrink-0" />
          <div className="hidden w-5 shrink-0 sm:block" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
