"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  identity,
  experience,
  skillGroups,
  achievements,
} from "@/data/portfolio";
import SectionHeader from "@/components/SectionHeader";

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".about-reveal").forEach((node) => {
        gsap.from(node, {
          scrollTrigger: { trigger: node, start: "top 85%" },
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
        });
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="architect"
      ref={ref}
      className="relative mx-auto max-w-6xl px-6 py-24 md:px-10"
    >
      <SectionHeader
        index="04"
        title="THE ARCHITECT"
        caption="Operator spec sheet & service history."
      />

      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        {/* spec card */}
        <div className="about-reveal h-fit border border-line-faint bg-ink-800/40">
          <div className="border-b border-line-faint px-5 py-3 tech-label text-cyan">
            OPERATOR SPEC · {identity.callsign}
          </div>
          <dl className="divide-y divide-line-faint text-sm">
            {[
              ["DESIGNATION", identity.role],
              ["BASE", identity.location],
              ["EXPERIENCE", "2+ years · production scale"],
              ["FOCUS", "MERN · AI/LLM · Cloud-native"],
              ["EDUCATION", "BCA - SSIU (exp. Aug 2026)"],
              ["STATUS", "Open to roles & freelance"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4 px-5 py-3">
                <dt className="tech-label w-32 shrink-0 pt-0.5">{k}</dt>
                <dd className="text-paper">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-line-faint px-5 py-4 text-sm leading-relaxed text-paper-dim">
            {identity.summary}
          </p>
        </div>

        {/* experience timeline */}
        <div className="about-reveal">
          <div className="tech-label mb-5">SERVICE HISTORY · LOG</div>
          <ol className="relative space-y-8 border-l border-line-faint pl-6">
            {experience.map((e) => (
              <li key={e.company} className="relative">
                <span className="absolute -left-[1.65rem] top-1.5 h-2.5 w-2.5 rounded-full border border-cyan bg-ink-900" />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-display text-lg font-semibold text-paper">
                    {e.role}
                  </h4>
                  <span className="tech-label text-cyan">{e.period}</span>
                </div>
                <div className="text-sm text-amber">
                  {e.company} · {e.mode}
                </div>
                <ul className="mt-2 space-y-1">
                  {e.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-paper-dim">
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-line-dim" />
                      {p}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* skills as subsystems */}
      <div className="about-reveal mt-16">
        <div className="tech-label mb-5">SUBSYSTEMS · CAPABILITY MATRIX</div>
        <div className="grid gap-px border border-line-faint bg-line-faint sm:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((g) => (
            <div key={g.group} className="bg-ink-900 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_6px_var(--cyan)]" />
                <span className="font-display text-sm font-semibold text-paper">
                  {g.group}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((it) => (
                  <span
                    key={it}
                    className="border border-line-faint px-2 py-0.5 text-xs text-paper-dim"
                  >
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* achievements */}
      <div className="about-reveal mt-16">
        <div className="tech-label mb-5">FIELD RECOGNITION</div>
        <div className="grid gap-px border border-line-faint bg-line-faint md:grid-cols-3">
          {achievements.map((a) => (
            <div key={a.title} className="bg-ink-900 p-5">
              <div className="tech-label text-amber">{a.date}</div>
              <div className="mt-2 font-display text-base font-semibold text-paper">
                {a.title}
              </div>
              <div className="mt-1 text-sm text-paper-dim">{a.org}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
