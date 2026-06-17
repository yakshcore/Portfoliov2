"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { repos, github } from "@/data/portfolio";
import SectionHeader from "@/components/SectionHeader";
import { sound } from "@/lib/sound";

gsap.registerPlugin(ScrollTrigger);

export default function OpenSource() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(".os-card", {
        scrollTrigger: { trigger: el, start: "top 80%" },
        y: 28,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
      });
      // count-up the headline stars
      const starEl = el.querySelector<HTMLElement>(".star-count");
      if (starEl) {
        const obj = { v: 0 };
        gsap.to(obj, {
          v: github.totalStars,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 75%" },
          onUpdate: () => {
            starEl.textContent = String(Math.round(obj.v));
          },
        });
      }
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="signals"
      ref={ref}
      className="relative mx-auto max-w-6xl px-6 py-24 md:px-10"
    >
      <SectionHeader
        index="03"
        title="OPEN-SOURCE SIGNALS"
        caption="Public work on GitHub - built in the open, validated by stars."
      />

      {/* stat bar */}
      <div className="mb-10 grid grid-cols-3 gap-px border border-line-faint bg-line-faint">
        <div className="os-card bg-ink-900 px-5 py-5">
          <div className="font-display text-3xl font-semibold text-amber glow-amber">
            <span className="star-count">0</span>★
          </div>
          <div className="tech-label mt-1">TOTAL STARS</div>
        </div>
        <div className="os-card bg-ink-900 px-5 py-5">
          <div className="font-display text-3xl font-semibold text-cyan glow-cyan">
            {github.publicRepos}
          </div>
          <div className="tech-label mt-1">PUBLIC REPOS</div>
        </div>
        <a
          href={github.url}
          target="_blank"
          rel="noreferrer"
          onMouseEnter={() => sound.play("hover")}
          className="os-card group flex flex-col justify-between bg-ink-900 px-5 py-5 transition-colors hover:bg-ink-800"
        >
          <div className="font-display text-lg font-semibold text-paper transition-colors group-hover:text-cyan">
            @{github.handle}
          </div>
          <div className="tech-label mt-1 flex items-center gap-1">
            VIEW PROFILE
            <span className="transition-transform group-hover:translate-x-0.5">
              ↗
            </span>
          </div>
        </a>
      </div>

      {/* repo grid */}
      <div className="grid gap-px border border-line-faint bg-line-faint md:grid-cols-2 lg:grid-cols-3">
        {repos.map((r) => (
          <a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            onMouseEnter={() => sound.play("hover")}
            className="os-card group flex flex-col bg-ink-900 p-5 transition-colors hover:bg-ink-800"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="tech-label text-cyan">{r.tag}</span>
              <span className="flex items-center gap-1 font-display text-sm font-semibold text-amber">
                {r.stars}
                <span className="text-xs">★</span>
              </span>
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-paper transition-colors group-hover:text-cyan">
              {r.name}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-paper-dim">
              {r.desc}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-line-faint pt-3">
              <span className="flex items-center gap-1.5 text-xs text-paper-dim">
                <span className="h-2 w-2 rounded-full bg-cyan" />
                {r.lang}
              </span>
              <span className="tech-label transition-colors group-hover:text-cyan">
                OPEN ↗
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
