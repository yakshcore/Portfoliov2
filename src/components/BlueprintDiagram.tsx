"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
const MAX_SCALE = 4;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export default function BlueprintDiagram({
  nodes,
  edges,
  onOnline,
}: {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  onOnline?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  // --- pan / zoom transform state ---
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  // clamp pan so scaled content always covers the box (origin 0,0)
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

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const el = root.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const { scale, tx, ty } = viewRef.current;
      const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
      if (next === scale) return;
      // keep the point under the cursor fixed
      const wx = (mx - tx) / scale;
      const wy = (my - ty) / scale;
      let ntx = next === 1 ? 0 : mx - wx * next;
      let nty = next === 1 ? 0 : my - wy * next;
      ({ tx: ntx, ty: nty } = clampPan(ntx, nty, next));
      setView({ scale: next, tx: ntx, ty: nty });
    },
    [clampPan]
  );

  // non-passive wheel listener so we can preventDefault (and not fight Lenis)
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(e.clientX, e.clientY, factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (viewRef.current.scale <= 1) return;
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setView((v) => {
      const p = clampPan(v.tx + dx, v.ty + dy, v.scale);
      return { ...v, ...p };
    });
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const zoomButton = (dir: 1 | -1) => {
    const el = root.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    sound.play("blip");
    zoomAt(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      dir === 1 ? 1.4 : 1 / 1.4
    );
  };
  const resetView = () => {
    sound.play("blip");
    setView({ scale: 1, tx: 0, ty: 0 });
  };

  // --- boot-up assembly animation ---
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      scrollTrigger: { trigger: el, start: "top 72%" },
      onComplete: goOnline,
    });

    if (scan) {
      tl.fromTo(
        scan,
        { top: "0%", opacity: 0.9 },
        { top: "100%", duration: 0.6, ease: "power1.inOut" },
        0
      ).to(scan, { opacity: 0, duration: 0.2 }, 0.6);
    }

    tl.to(
      cards,
      {
        opacity: 1,
        scale: 1,
        stagger: 0.1,
        ease: "back.out(2)",
        onStart: () => sound.play("boot"),
      },
      0.25
    )
      .to(
        paths,
        {
          strokeDashoffset: 0,
          stagger: 0.07,
          duration: 0.5,
          ease: "power1.inOut",
        },
        0.5
      )
      .to(labels, { opacity: 1, stagger: 0.05 }, 0.9)
      .to(flows, { opacity: 1, duration: 0.4 }, ">-0.1");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [nodes, edges, onOnline]);

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
  const panned = view.scale > 1;

  return (
    <div
      ref={root}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className={`diagram relative aspect-[5/3] w-full touch-none select-none overflow-hidden rounded border border-line-faint bg-ink-800/40 ${
        panned ? (dragging.current ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
      }`}
    >
      {/* PINNED background — does not pan/zoom */}
      <div className="pointer-events-none absolute inset-0 rounded blueprint-grid opacity-60" />

      {/* boot scan line (also pinned) */}
      <div className="boot-scan pointer-events-none absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan to-transparent opacity-0 shadow-[0_0_12px_var(--cyan)]" />

      {/* TRANSFORMED viewport — the map that pans/zooms */}
      <div
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{ transform }}
      >
        {/* edges + flowing packets */}
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
              className="edge-label tech-label pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 bg-ink-900/80 px-1 text-[0.55rem] text-cyan"
              style={{ left: `${mx}%`, top: `${my}%` }}
            >
              {e.label}
            </span>
          );
        })}

        {/* nodes */}
        {nodes.map((n) => (
          <div
            key={n.id}
            className="node-card pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <div
              className="flex min-w-[5.5rem] flex-col items-center rounded-sm border bg-ink-900/90 px-2.5 py-1.5 backdrop-blur"
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

      {/* zoom controls (pinned overlay) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-2 top-2 flex flex-col gap-px border border-line-faint bg-line-faint"
      >
        {[
          { k: "+", fn: () => zoomButton(1) },
          { k: "−", fn: () => zoomButton(-1) },
          { k: "⤢", fn: resetView },
        ].map((b) => (
          <button
            key={b.k}
            onClick={b.fn}
            onMouseEnter={() => sound.play("hover")}
            className="flex h-7 w-7 items-center justify-center bg-ink-900 font-mono text-sm text-paper-dim transition-colors hover:bg-ink-800 hover:text-cyan"
            aria-label={b.k === "+" ? "Zoom in" : b.k === "−" ? "Zoom out" : "Reset view"}
          >
            {b.k}
          </button>
        ))}
      </div>

      {/* zoom level + hint */}
      <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-3">
        <span className="tech-label tabular-nums text-cyan">
          {view.scale.toFixed(1)}×
        </span>
        <span className="tech-label text-[0.5rem] text-paper-dim/70">
          {panned ? "DRAG TO PAN" : "SCROLL TO ZOOM"}
        </span>
      </div>
    </div>
  );
}
