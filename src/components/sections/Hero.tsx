"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { identity, systemStats, stackStory } from "@/data/portfolio";
import Typewriter from "@/components/Typewriter";

const HeroStackGlobe = dynamic(
  () => import("@/components/three/HeroStackGlobe"),
  { ssr: false },
);
const StackStory = dynamic(() => import("@/components/StackStory"), {
  ssr: false,
});

const STACK_LEN = stackStory.layers.length;
const STACK_MAX = STACK_LEN - 1;

export default function Hero({ started }: { started: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const textCol = useRef<HTMLDivElement>(null);
  const [storyOpen, setStoryOpen] = useState(false);

  // activeRef is an animated power level for the globe. It starts OFF (dark) and
  // energizes layer-by-layer the moment the boot sequence hands off - the globe's
  // "coming online". It powers DOWN again when the story opens and back UP on
  // close. No persistence - purely presentational.
  const activeRef = useRef(-1.2);
  const power = useRef({ v: -1.2 });
  const writePower = () => {
    activeRef.current = power.current.v;
  };

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
        0.2,
      );
      // globe wakes up: energize from dark to full, one layer at a time
      gsap.to(power.current, {
        v: STACK_MAX,
        duration: 1.6,
        ease: "power2.out",
        delay: 0.35,
        onUpdate: writePower,
      });
    }, root);
    return () => ctx.revert();
  }, [started]);

  // double-tap transition: fade the hero text out and power the globe DOWN so
  // every node and layer visibly switches off before the story takes over;
  // on close, power it back UP to full so it "accepts its position" on the hero.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const tc = textCol.current;
    if (storyOpen) {
      gsap.to(tc, {
        opacity: 0,
        y: -12,
        duration: 0.4,
        ease: "power2.in",
        overwrite: "auto",
      });
      gsap.to(power.current, {
        v: -1.2,
        duration: 0.75,
        ease: "power2.inOut",
        overwrite: "auto",
        onUpdate: writePower,
      });
    } else {
      gsap.to(tc, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.15,
        overwrite: "auto",
        clearProps: "opacity,transform",
      });
      gsap.to(power.current, {
        v: STACK_MAX,
        duration: 1.0,
        ease: "power2.out",
        overwrite: "auto",
        onUpdate: writePower,
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
              systems with deep AI/LLM integration - from visa CRMs to AI
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
          <HeroStackGlobe
            activeRef={activeRef}
            onOpen={() => setStoryOpen(true)}
          />
          <div className="pointer-events-none absolute inset-0 grid-vignette" />
          {/* globe annotations - opposite corners so nothing overlaps */}
          <div className="pointer-events-none absolute left-3 top-3 tech-label text-cyan/70">
            STACK GRAPH · ONLINE
          </div>
          <div className="pointer-events-none absolute right-3 top-3 tech-label text-paper-dim">
            {String(STACK_LEN).padStart(2, "0")} LAYERS · LIVE
          </div>
          {/* double-tap affordance - bottom-center, clear of the corner labels */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap border border-cyan/30 bg-ink-900/70 px-3 py-1 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 sm:opacity-70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
            <span className="tech-label text-[0.55rem] text-cyan">
              DOUBLE-TAP TO EXPLORE THE STACK
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
