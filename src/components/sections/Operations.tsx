"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { manifesto, operations, type Operation } from "@/data/portfolio";

gsap.registerPlugin(ScrollTrigger);

const STATUS_COLOR: Record<Operation["status"], string> = {
  ACTIVE: "var(--cyan)",
  RESEARCH: "var(--amber)",
  EXPERIMENTING: "var(--amber-bright)",
};

export default function Operations() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(".manifesto-line", {
        scrollTrigger: { trigger: el, start: "top 75%" },
        y: 26,
        opacity: 0,
        duration: 0.9,
        stagger: 0.18,
        ease: "power3.out",
      });
      gsap.from(".op-row", {
        scrollTrigger: { trigger: ".op-grid", start: "top 85%" },
        x: -20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="operations"
      ref={ref}
      className="relative mx-auto max-w-6xl px-6 py-24 md:px-10"
    >
      {/* operating philosophy — the myth */}
      <div className="max-w-3xl">
        <div className="tech-label mb-7 flex items-center gap-3 text-cyan">
          <span className="h-px w-8 bg-cyan" />
          OPERATING PHILOSOPHY
        </div>
        {manifesto.map((line, i) => (
          <p
            key={line}
            className={`manifesto-line font-display text-2xl font-semibold leading-[1.18] md:text-4xl ${
              i === manifesto.length - 1
                ? "text-cyan glow-cyan"
                : "text-paper/90"
            }`}
          >
            {line}
          </p>
        ))}
      </div>

      {/* current operations — live status */}
      <div className="op-grid mt-16">
        <div className="tech-label mb-5 flex items-center gap-3">
          CURRENT OPERATIONS
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
          <span className="text-paper-dim/50">LIVE</span>
        </div>

        <div className="grid gap-px border border-line-faint bg-line-faint">
          {operations.map((o, i) => {
            const color = STATUS_COLOR[o.status];
            return (
              <div
                key={o.name}
                className="op-row grid grid-cols-[1fr_auto] items-center gap-4 bg-ink-900 px-5 py-4 transition-colors hover:bg-ink-800 md:grid-cols-[auto_1fr_auto] md:gap-6"
              >
                <span className="hidden font-mono text-xs text-line-dim md:block">
                  OP-{String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="font-display text-base font-semibold text-paper">
                    {o.name}
                  </div>
                  <div className="text-sm text-paper-dim">{o.detail}</div>
                </div>
                <span
                  className="tech-label flex items-center gap-2 justify-self-end"
                  style={{ color }}
                >
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  {o.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
