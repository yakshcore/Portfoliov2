"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { identity, systemStats, stackStory } from "@/data/portfolio";
import Typewriter from "@/components/Typewriter";

const HeroStackGlobe = dynamic(
  () => import("@/components/three/HeroStackGlobe"),
  { ssr: false }
);
const StackStory = dynamic(() => import("@/components/StackStory"), {
  ssr: false,
});

const STACK_LEN = stackStory.layers.length;
const STACK_MAX = STACK_LEN - 1;

export default function Hero({ started }: { started: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const textCol = useRef<HTMLDivElement>(null);
  const globeWrap = useRef<HTMLDivElement>(null);
  const [storyOpen, setStoryOpen] = useState(false);

  // furthest stack layer the visitor has mapped — the hero globe renders this
  // "completion" state, and it survives across visits via localStorage.
  const [reached, setReached] = useState(0);
  const reachedRef = useRef(0);

  useEffect(() => {
    let v = 0;
    try {
      v = parseInt(localStorage.getItem("yb-stack-reached") || "0", 10) || 0;
    } catch {}
    v = Math.max(0, Math.min(STACK_MAX, v));
    reachedRef.current = v;
    setReached(v);
  }, []);

  const handleProgress = (layer: number) => {
    setReached((prev) => {
      const next = Math.max(prev, layer);
      reachedRef.current = next;
      try {
        localStorage.setItem("yb-stack-reached", String(next));
      } catch {}
      return next;
    });
  };

  const complete = reached >= STACK_MAX;

  useEffect(() => {
    if (!started) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-anim", {
        y: 26,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
      }).from(
        ".hero-globe",
        { opacity: 0, scale: 0.9, duration: 1.2, ease: "power2.out" },
        0.2
      );
    }, root);
    return () => ctx.revert();
  }, [started]);

  // double-tap transition: zoom the hero globe in + fade the hero content out
  // so the fullscreen story reads as "diving into" the globe (and reverses on close)
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const tc = textCol.current;
    const gw = globeWrap.current;
    if (storyOpen) {
      gsap.to(tc, { opacity: 0, y: -12, duration: 0.35, ease: "power2.in" });
      gsap.to(gw, {
        scale: 1.45,
        opacity: 0,
        duration: 0.55,
        ease: "power2.in",
      });
    } else {
      gsap.to(tc, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: "power3.out",
        delay: 0.1,
      });
      gsap.to(gw, {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.1,
      });
    }
  }, [storyOpen]);

  return (
    <section
      ref={root}
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-6 py-24 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        {/* ---- LEFT: text column ---- */}
        <div ref={textCol} className="relative z-10">
          <div className="hero-anim tech-label mb-6 flex items-center gap-3 text-cyan">
            <span className="h-px w-10 bg-cyan" />
            DRAWING NO. YB-2026 · MASTER SCHEMATIC
          </div>

          <h1 className="hero-anim font-display text-[14vw] font-bold leading-[0.92] tracking-tight sm:text-[11vw] lg:text-[6.2rem] xl:text-[7rem]">
            YAKSH
            <br />
            <span className="text-line">BAMBHROLIYA</span>
          </h1>

          <div className="hero-anim mt-6 max-w-xl">
            <p className="font-display text-lg text-paper md:text-2xl">
              <Typewriter
                words={identity.roleFramings}
                className="text-cyan glow-cyan"
              />
            </p>
            <p className="mt-3 text-sm leading-relaxed text-paper-dim">
              {identity.tagline} Two years architecting MERN and cloud-native
              systems with deep AI/LLM integration — from visa CRMs to AI
              food-tech.
            </p>
          </div>

          {/* stat strip */}
          <div className="hero-anim mt-10 grid max-w-2xl grid-cols-2 gap-px border border-line-faint bg-line-faint sm:grid-cols-4">
            {systemStats.map((s) => (
              <div
                key={s.label}
                className="bg-ink-900/80 px-4 py-3 backdrop-blur"
              >
                <div className="font-display text-2xl font-semibold text-cyan glow-cyan">
                  {s.value}
                </div>
                <div className="tech-label mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---- RIGHT: globe column ---- */}
        <div className="hero-globe group relative h-[42vh] min-h-[320px] w-full lg:h-[78vh]">
          <div ref={globeWrap} className="absolute inset-0">
            <HeroStackGlobe
              reachedRef={reachedRef}
              onOpen={() => setStoryOpen(true)}
            />
            <div className="pointer-events-none absolute inset-0 grid-vignette" />
            {/* globe annotations — opposite corners so nothing overlaps */}
            <div className="pointer-events-none absolute left-3 top-3 tech-label text-cyan/70">
              STACK GRAPH · {complete ? "COMPLETE" : "PARTIAL"}
            </div>
            <div className="pointer-events-none absolute right-3 top-3 tech-label text-paper-dim">
              LAYER {String(reached + 1).padStart(2, "0")} /{" "}
              {String(STACK_LEN).padStart(2, "0")} MAPPED
            </div>
            {/* double-tap affordance — bottom-center, clear of the corner labels */}
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap border border-cyan/30 bg-ink-900/70 px-3 py-1 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 sm:opacity-70">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
              <span className="tech-label text-[0.55rem] text-cyan">
                {complete
                  ? "DOUBLE-TAP TO RE-EXPLORE THE STACK"
                  : "DOUBLE-TAP TO COMPLETE THE GLOBE"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* fullscreen scroll-story launched from the globe */}
      <StackStory
        open={storyOpen}
        onClose={() => setStoryOpen(false)}
        onProgress={handleProgress}
      />

      {/* scroll cue */}
      <div className="hero-anim absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <span className="tech-label">DESCEND THROUGH THE SYSTEM</span>
        <span className="h-8 w-px animate-pulse bg-gradient-to-b from-cyan to-transparent" />
      </div>
    </section>
  );
}
