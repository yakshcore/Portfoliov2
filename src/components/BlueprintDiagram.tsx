"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DiagramNode, DiagramEdge } from "@/data/portfolio";
import { sound } from "@/lib/sound";

gsap.registerPlugin(ScrollTrigger);

const KIND_COLOR: Record<DiagramNode["kind"], string> = {
  client: "var(--cyan)",
  edge: "var(--paper-dim)",
  service: "var(--cyan-bright)",
  data: "var(--amber)",
  external: "var(--paper-dim)",
  ai: "var(--amber-bright)",
};

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

type DiagramData = { nodes: DiagramNode[]; edges: DiagramEdge[] };

// ------------------------------------------------------------------
// The scene: renders the schematic + boot-assembly + flowing packets.
// When `interactive`, pan/zoom is driven imperatively through refs so the
// animated SVG paths never re-render (the flow lines keep moving while you
// drag or zoom). When not interactive it's a clean, static animated figure.
// ------------------------------------------------------------------
function DiagramScene({
  nodes,
  edges,
  interactive = false,
  autoBoot = false,
  onOnline,
}: {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  interactive?: boolean;
  autoBoot?: boolean;
  onOnline?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  // imperative view state — never goes through React, so no re-render
  const view = useRef({ scale: 1, tx: 0, ty: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const clampPan = useCallback((tx: number, ty: number, scale: number) => {
    const el = root.current;
    if (!el) return { tx, ty };
    const w = el.clientWidth;
    const h = el.clientHeight;
    return {
      tx: clamp(tx, w * (1 - scale), 0),
      ty: clamp(ty, h * (1 - scale), 0),
    };
  }, []);

  const apply = useCallback(() => {
    const l = layer.current;
    if (!l) return;
    const { scale, tx, ty } = view.current;
    l.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    if (readout.current) readout.current.textContent = `${scale.toFixed(1)}×`;
    if (root.current)
      root.current.style.cursor =
        scale > 1 ? (dragging.current ? "grabbing" : "grab") : "default";
  }, []);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const el = root.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const { scale, tx, ty } = view.current;
      const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
      if (next === scale) return;
      const wx = (mx - tx) / scale;
      const wy = (my - ty) / scale;
      let ntx = next === 1 ? 0 : mx - wx * next;
      let nty = next === 1 ? 0 : my - wy * next;
      ({ tx: ntx, ty: nty } = clampPan(ntx, nty, next));
      view.current = { scale: next, tx: ntx, ty: nty };
      apply();
    },
    [apply, clampPan],
  );

  // wheel-zoom (non-passive so we can preventDefault and not fight Lenis)
  useEffect(() => {
    if (!interactive) return;
    const el = root.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive, zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || view.current.scale <= 1) return;
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    apply();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    const v = view.current;
    const p = clampPan(v.tx + dx, v.ty + dy, v.scale);
    view.current = { ...v, ...p };
    apply();
  };
  const onPointerUp = () => {
    dragging.current = false;
    apply();
  };

  const zoomButton = (dir: 1 | -1) => {
    const el = root.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    sound.play("blip");
    zoomAt(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      dir === 1 ? 1.4 : 1 / 1.4,
    );
  };
  const resetView = () => {
    sound.play("blip");
    view.current = { scale: 1, tx: 0, ty: 0 };
    apply();
  };

  // boot-up assembly
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const paths = el.querySelectorAll<SVGPathElement>("path.edge");
    const flows = el.querySelectorAll<SVGPathElement>("path.flow");
    const cards = el.querySelectorAll<HTMLElement>(".node-card");
    const labels = el.querySelectorAll<HTMLElement>(".edge-label");
    const scan = el.querySelector<HTMLElement>(".boot-scan");

    const goOnline = () => {
      el.classList.add("online");
      onOnline?.();
    };

    if (reduce) {
      gsap.set(paths, { strokeDashoffset: 0 });
      gsap.set([cards, labels, flows], { opacity: 1 });
      goOnline();
      return;
    }

    gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(cards, { opacity: 0, scale: 0.6 });
    gsap.set(labels, { opacity: 0 });
    gsap.set(flows, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: autoBoot ? undefined : { trigger: el, start: "top 72%" },
      delay: autoBoot ? 0.15 : 0,
      onComplete: goOnline,
    });

    if (scan) {
      tl.fromTo(
        scan,
        { top: "0%", opacity: 0.9 },
        { top: "100%", duration: 0.6, ease: "power1.inOut" },
        0,
      ).to(scan, { opacity: 0, duration: 0.2 }, 0.6);
    }

    tl.to(
      cards,
      {
        opacity: 1,
        scale: 1,
        stagger: 0.08,
        ease: "back.out(2)",
        onStart: () => sound.play("boot"),
      },
      0.25,
    )
      .to(
        paths,
        { strokeDashoffset: 0, stagger: 0.05, duration: 0.5, ease: "power1.inOut" },
        0.5,
      )
      .to(labels, { opacity: 1, stagger: 0.04 }, 0.9)
      .to(flows, { opacity: 1, duration: 0.4 }, ">-0.1");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [nodes, edges, onOnline, autoBoot]);

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={root}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className={`diagram relative h-full w-full select-none overflow-hidden rounded border border-line-faint bg-ink-800/40 ${
        interactive ? "touch-none" : ""
      }`}
    >
      {/* PINNED background */}
      <div className="pointer-events-none absolute inset-0 rounded blueprint-grid opacity-60" />
      <div className="boot-scan pointer-events-none absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan to-transparent opacity-0 shadow-[0_0_12px_var(--cyan)]" />

      {/* TRANSFORMED layer (mutated imperatively when interactive) */}
      <div
        ref={layer}
        className="absolute inset-0 origin-top-left will-change-transform"
      >
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
                  className="edge"
                  d={d}
                  pathLength={1}
                  fill="none"
                  stroke="var(--line-dim)"
                  strokeWidth={1.2}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="flow"
                  d={d}
                  pathLength={1}
                  fill="none"
                  stroke="var(--cyan-bright)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="0.04 0.3"
                  style={{ animationDelay: `${(i % 5) * 0.4}s` }}
                />
              </g>
            );
          })}
        </svg>

        {edges.map((e, i) => {
          const a = nodeById[e.from];
          const b = nodeById[e.to];
          if (!a || !b || !e.label) return null;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <span
              key={`l-${i}`}
              className="edge-label tech-label pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 bg-ink-900/80 px-1 text-[0.55rem] text-cyan"
              style={{ left: `${mx}%`, top: `${my}%` }}
            >
              {e.label}
            </span>
          );
        })}

        {nodes.map((n) => (
          <div
            key={n.id}
            className="node-card pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <div
              className="flex min-w-[5rem] flex-col items-center rounded-sm border bg-ink-900/90 px-2.5 py-1.5 backdrop-blur"
              style={{ borderColor: KIND_COLOR[n.kind] }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="node-dot h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: KIND_COLOR[n.kind],
                    boxShadow: `0 0 6px ${KIND_COLOR[n.kind]}`,
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

      {/* zoom controls — only in the interactive (maximized) view */}
      {interactive && (
        <>
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-2 top-2 z-10 flex flex-col gap-px border border-line-faint bg-line-faint"
          >
            {[
              { k: "+", fn: () => zoomButton(1), a: "Zoom in" },
              { k: "−", fn: () => zoomButton(-1), a: "Zoom out" },
              { k: "⤢", fn: resetView, a: "Reset view" },
            ].map((b) => (
              <button
                key={b.k}
                onClick={b.fn}
                onMouseEnter={() => sound.play("hover")}
                className="flex h-8 w-8 items-center justify-center bg-ink-900 font-mono text-sm text-paper-dim transition-colors hover:bg-ink-800 hover:text-cyan"
                aria-label={b.a}
              >
                {b.k}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-3">
            <span
              ref={readout}
              className="tech-label tabular-nums text-cyan"
            >
              1.0×
            </span>
            <span className="tech-label text-[0.5rem] text-paper-dim/70">
              SCROLL TO ZOOM · DRAG TO PAN
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Inline figure: static animated scene + a single MAXIMIZE button that opens
// a fullscreen, fully interactive view of the detailed architecture.
// ------------------------------------------------------------------
export default function BlueprintDiagram({
  nodes,
  edges,
  detail,
  title,
  onOnline,
  hideMaximize = false,
}: {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  detail?: DiagramData;
  title?: string;
  onOnline?: () => void;
  // when a reconstruction owns the deep-dive, drop the maximize affordance
  hideMaximize?: boolean;
}) {
  const [max, setMax] = useState(false);
  const big = detail ?? { nodes, edges };

  useEffect(() => {
    if (!max) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMax(false);
    };
    window.addEventListener("keydown", onKey);
    sound.play("online");
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [max]);

  return (
    <div className="relative aspect-[5/3] w-full">
      <DiagramScene nodes={nodes} edges={edges} onOnline={onOnline} />

      {/* maximize - hidden when a reconstruction owns the deep-dive */}
      {!hideMaximize && (
        <>
          <button
            onClick={() => {
              sound.play("blip");
              setMax(true);
            }}
            onMouseEnter={() => sound.play("hover")}
            aria-label="Maximize diagram"
            className="absolute right-2 top-2 z-10 flex h-8 items-center gap-1.5 border border-line-faint bg-ink-900/80 px-2.5 font-mono text-[0.6rem] uppercase tracking-wider text-paper-dim backdrop-blur transition-colors hover:border-cyan hover:text-cyan"
          >
            <span className="text-sm leading-none">⤢</span> MAXIMIZE
          </button>

          {detail && (
            <div className="pointer-events-none absolute bottom-2 left-2">
              <span className="tech-label text-[0.5rem] text-paper-dim/70">
                MAXIMIZE FOR FULL BREAKDOWN
              </span>
            </div>
          )}
        </>
      )}

      {/* fullscreen interactive view - portaled to <body> so it escapes any
          transformed ancestor (GSAP-animated parents) and truly fills the window */}
      {max &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex flex-col bg-ink-900/95 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 blueprint-grid opacity-40" />

            <div className="relative z-10 flex items-center justify-between px-5 py-4 md:px-8">
              <div className="tech-label flex items-center gap-3 text-cyan">
                <span className="h-px w-8 bg-cyan" />
                {title ?? "SYSTEM ARCHITECTURE"} · DETAILED
              </div>
              <button
                onClick={() => {
                  sound.play("blip");
                  setMax(false);
                }}
                onMouseEnter={() => sound.play("hover")}
                aria-label="Close diagram"
                className="flex h-9 items-center gap-2 border border-line-faint bg-ink-900/80 px-3 font-mono text-xs text-paper-dim transition-colors hover:border-cyan hover:text-cyan"
              >
                ESC <span className="text-base leading-none">×</span>
              </button>
            </div>

            <div className="relative z-10 flex-1 px-4 pb-6 md:px-8">
              <div className="mx-auto h-full max-w-[1600px]">
                <DiagramScene
                  nodes={big.nodes}
                  edges={big.edges}
                  interactive
                  autoBoot
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
