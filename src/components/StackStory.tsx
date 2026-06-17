"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { stackStory } from "@/data/portfolio";
import { sound } from "@/lib/sound";
import type { GlobeControls, HoverNode } from "@/components/three/StackGlobe";

const StackGlobe = dynamic(() => import("@/components/three/StackGlobe"), {
  ssr: false,
});

const { title, line, layers } = stackStory;
const clampIdx = (i: number) => Math.max(0, Math.min(layers.length - 1, i));

export default function StackStory({
  open,
  onClose,
  onProgress,
}: {
  open: boolean;
  onClose: () => void;
  onProgress?: (layer: number) => void;
}) {
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  activeRef.current = active;
  // furthest layer the visitor descends to - persisted onto the hero globe
  const maxReached = useRef(0);

  // globe drag-rotate state + hovered-tag node
  const controlsRef = useRef<GlobeControls>({
    dragging: false,
    vy: 0.1,
    vx: 0,
    accumDX: 0,
    accumDY: 0,
    lastX: 0,
    lastY: 0,
  });
  const hoverRef = useRef<HoverNode>(null);
  const drag = useRef({
    active: false,
    decided: false,
    rotating: false,
    x: 0,
    y: 0,
  });

  // pointer on the scroller spins the globe; vertical touch still scrolls chapters
  const onGlobeDown = (e: React.PointerEvent) => {
    drag.current = {
      active: true,
      decided: false,
      rotating: false,
      x: e.clientX,
      y: e.clientY,
    };
    controlsRef.current.lastX = e.clientX;
    controlsRef.current.lastY = e.clientY;
  };
  const onGlobeMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    if (!d.decided) {
      const adx = Math.abs(e.clientX - d.x);
      const ady = Math.abs(e.clientY - d.y);
      if (Math.max(adx, ady) < 5) return;
      d.decided = true;
      // mouse → always rotate; touch → only horizontal (vertical = scroll)
      d.rotating = e.pointerType === "mouse" ? true : adx >= ady;
      if (d.rotating) {
        controlsRef.current.dragging = true;
        controlsRef.current.vy = 0;
        controlsRef.current.vx = 0;
        controlsRef.current.lastX = e.clientX;
        controlsRef.current.lastY = e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } else {
        d.active = false;
        return;
      }
    }
    if (d.rotating) {
      controlsRef.current.accumDX += e.clientX - controlsRef.current.lastX;
      controlsRef.current.accumDY += e.clientY - controlsRef.current.lastY;
      controlsRef.current.lastX = e.clientX;
      controlsRef.current.lastY = e.clientY;
    }
  };
  const onGlobeUp = () => {
    if (drag.current.rotating) controlsRef.current.dragging = false;
    drag.current.active = false;
    drag.current.decided = false;
    drag.current.rotating = false;
  };

  const scrollToChapter = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: clampIdx(i) * el.clientHeight, behavior: "smooth" });
  }, []);

  // open: reset + intro animation + body lock + keyboard
  useEffect(() => {
    if (!open) return;
    setActive(0);
    activeRef.current = 0;
    maxReached.current = 0;
    if (scroller.current) scroller.current.scrollTop = 0;

    const raf = requestAnimationFrame(() => setMounted(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sound.play("online");

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        scrollToChapter(activeRef.current + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollToChapter(activeRef.current - 1);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      setMounted(false);
    };
  }, [open, onClose, scrollToChapter]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = clampIdx(Math.round(el.scrollTop / el.clientHeight));
    if (i !== activeRef.current) {
      setActive(i);
      sound.play("blip");
      if (i > maxReached.current) {
        maxReached.current = i;
        onProgress?.(i);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] origin-center bg-ink-900/95 backdrop-blur-sm transition-all duration-500 ease-out ${
        mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="The Stack - system layers"
    >
      <div className="pointer-events-none absolute inset-0 blueprint-grid opacity-50" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--ink-900)_100%)]" />

      {/* globe - fills the right on desktop, sits behind text on mobile */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full opacity-60 lg:w-[58%] lg:opacity-100">
        <StackGlobe
          layers={layers}
          activeRef={activeRef}
          controlsRef={controlsRef}
          hoverRef={hoverRef}
        />
      </div>

      {/* header */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 max-w-sm md:left-10">
        <div className="tech-label flex items-center gap-3 text-cyan">
          <span className="h-px w-8 bg-cyan" />
          {title} · {layers.length} LAYERS
        </div>
        <p className="mt-2 hidden text-xs leading-relaxed text-paper-dim sm:block">
          {line}
        </p>
      </div>

      {/* close */}
      <button
        onClick={() => {
          sound.play("blip");
          onClose();
        }}
        onMouseEnter={() => sound.play("hover")}
        className="absolute right-5 top-5 z-20 flex h-9 items-center gap-2 border border-line-faint bg-ink-900/80 px-3 font-mono text-xs text-paper-dim transition-colors hover:border-cyan hover:text-cyan md:right-10"
        aria-label="Close stack story"
      >
        ESC <span className="text-base leading-none">×</span>
      </button>

      {/* progress rail */}
      <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        {layers.map((L, i) => (
          <button
            key={L.code}
            onClick={() => scrollToChapter(i)}
            onMouseEnter={() => sound.play("hover")}
            aria-label={`Go to ${L.title}`}
            className="group flex items-center justify-end gap-2"
          >
            <span
              className={`tech-label text-[0.55rem] transition-opacity ${
                i === active
                  ? "opacity-100 text-cyan"
                  : "opacity-0 group-hover:opacity-60"
              }`}
            >
              {L.code}
            </span>
            <span
              className={`h-2 w-2 rounded-full border transition-all ${
                i === active
                  ? "scale-125 border-cyan bg-cyan shadow-[0_0_8px_var(--cyan)]"
                  : i < active
                    ? "border-cyan/60 bg-cyan/50"
                    : "border-line-dim bg-transparent"
              }`}
            />
          </button>
        ))}
      </div>

      {/* scrolling chapters (data-lenis-prevent keeps Lenis from hijacking this) */}
      <div
        ref={scroller}
        onScroll={onScroll}
        onPointerDown={onGlobeDown}
        onPointerMove={onGlobeMove}
        onPointerUp={onGlobeUp}
        onPointerLeave={onGlobeUp}
        onPointerCancel={onGlobeUp}
        data-lenis-prevent
        className="absolute inset-0 z-10 touch-pan-y snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {layers.map((L, i) => {
          const focused = i === active;
          const amber = L.accent === "amber";
          return (
            <section
              key={L.code}
              className="flex h-full snap-start items-center px-6 md:px-10"
            >
              <div
                className={`max-w-xl transition-all duration-500 lg:max-w-[44%] ${
                  focused
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-30"
                }`}
              >
                <div className="tech-label flex flex-wrap items-center gap-3">
                  <span className={amber ? "text-amber" : "text-cyan"}>
                    {L.code} · {L.role}
                  </span>
                  <span className="text-paper-dim/40">
                    {String(i + 1).padStart(2, "0")} /{" "}
                    {String(layers.length).padStart(2, "0")}
                  </span>
                  {L.status === "EXPLORING" && (
                    <span className="flex items-center gap-1.5 border border-amber/40 px-2 py-0.5 text-[0.55rem] text-amber">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
                      EXPLORING
                    </span>
                  )}
                </div>

                <h2
                  className={`mt-4 font-display text-4xl font-bold leading-[0.95] sm:text-5xl lg:text-6xl ${
                    amber ? "text-amber glow-amber" : "text-paper"
                  }`}
                >
                  {L.title}
                </h2>

                <p className="mt-5 max-w-md text-sm leading-relaxed text-paper-dim sm:text-base">
                  {L.narrative}
                </p>

                <div className="mt-7 flex flex-wrap gap-2">
                  {L.items.map((it, k) => (
                    <span
                      key={it}
                      onMouseEnter={() => {
                        hoverRef.current = { layer: i, item: k };
                        sound.play("hover");
                      }}
                      onMouseLeave={() => {
                        hoverRef.current = null;
                      }}
                      className={`cursor-default border bg-ink-900/70 px-2.5 py-1 font-mono text-xs backdrop-blur transition-colors ${
                        amber
                          ? "border-amber/40 text-amber-bright hover:border-amber hover:bg-amber/10"
                          : "border-cyan/30 text-cyan-bright hover:border-cyan hover:bg-cyan/10"
                      }`}
                    >
                      {it}
                    </span>
                  ))}
                </div>

                <p className="mt-3 hidden text-[0.6rem] tracking-wide text-paper-dim/50 lg:block">
                  ▸ HOVER A TAG TO LOCATE IT · DRAG THE GLOBE TO ROTATE
                </p>
              </div>
            </section>
          );
        })}
      </div>

      {/* scroll hint */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <span className="tech-label text-[0.55rem]">
          {active < layers.length - 1
            ? "SCROLL TO DESCEND"
            : "FRONTIER REACHED"}
        </span>
        <span className="h-7 w-px animate-pulse bg-gradient-to-b from-cyan to-transparent" />
      </div>
    </div>
  );
}
