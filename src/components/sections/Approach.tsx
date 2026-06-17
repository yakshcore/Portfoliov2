"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeader from "@/components/SectionHeader";

gsap.registerPlugin(ScrollTrigger);

const PRINCIPLES = [
  {
    no: "P-01",
    title: "Own the whole stack",
    body: "From system design to production deploy - architecture, services, CI/CD, and performance are one continuous responsibility, not separate jobs.",
  },
  {
    no: "P-02",
    title: "Ship to real users",
    body: "Every system here runs in production: visa cases, 500+ concurrent users, real-time pipelines. Demos are easy; uptime is the test.",
  },
  {
    no: "P-03",
    title: "AI as infrastructure",
    body: "LLMs (Gemini · Claude · OpenAI) integrated as dependable subsystems inside real products - not bolted-on gimmicks.",
  },
  {
    no: "P-04",
    title: "Engineer for scale",
    body: "Microservices, RBAC, caching, WebSockets, containerized cloud. Build it to hold weight before it needs to.",
  },
];

export default function Approach() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(".pr-card", {
        scrollTrigger: { trigger: el, start: "top 78%" },
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="principles"
      ref={ref}
      className="relative mx-auto max-w-6xl px-6 py-24 md:px-10"
    >
      <SectionHeader
        index="01"
        title="OPERATING PRINCIPLES"
        caption="The design constraints behind every system below."
      />
      <div className="grid gap-px border border-line-faint bg-line-faint md:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div
            key={p.no}
            className="pr-card group bg-ink-900 p-7 transition-colors hover:bg-ink-800"
          >
            <div className="flex items-baseline justify-between">
              <span className="tech-label text-amber">{p.no}</span>
              <span className="font-display text-3xl text-line-faint transition-colors group-hover:text-line-dim">
                {p.no.split("-")[1]}
              </span>
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-paper">
              {p.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-paper-dim">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
