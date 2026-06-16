"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { identity, systemStats } from "@/data/portfolio";
import Typewriter from "@/components/Typewriter";

const WireframeScene = dynamic(() => import("@/components/three/WireframeScene"), {
  ssr: false,
});
const StackStory = dynamic(() => import("@/components/StackStory"), {
  ssr: false,
});

export default function Hero({ started }: { started: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [storyOpen, setStoryOpen] = useState(false);

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

  return (
    <section
      ref={root}
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-6 py-24 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        {/* ---- LEFT: text column ---- */}
        <div className="relative z-10">
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
          <WireframeScene onOpen={() => setStoryOpen(true)} />
          <div className="pointer-events-none absolute inset-0 grid-vignette" />
          {/* globe annotations */}
          <div className="pointer-events-none absolute left-3 top-3 tech-label text-cyan/70">
            NODE GRAPH · LIVE
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 tech-label text-paper-dim">
            54 NODES · STREAMING
          </div>
          {/* tap-to-enter affordance */}
          <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 border border-cyan/30 bg-ink-900/70 px-3 py-1 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 sm:opacity-70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
            <span className="tech-label text-[0.55rem] text-cyan">
              TAP TO OPEN THE STACK
            </span>
          </div>
        </div>
      </div>

      {/* fullscreen scroll-story launched from the globe */}
      <StackStory open={storyOpen} onClose={() => setStoryOpen(false)} />

      {/* scroll cue */}
      <div className="hero-anim absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <span className="tech-label">DESCEND THROUGH THE SYSTEM</span>
        <span className="h-8 w-px animate-pulse bg-gradient-to-b from-cyan to-transparent" />
      </div>
    </section>
  );
}
