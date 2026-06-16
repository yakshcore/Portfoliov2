"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects, type Project } from "@/data/portfolio";
import BlueprintDiagram from "@/components/BlueprintDiagram";
import SectionHeader from "@/components/SectionHeader";
import { sound } from "@/lib/sound";

gsap.registerPlugin(ScrollTrigger);

type Status = "OFFLINE" | "BOOTING" | "ONLINE";

const STATUS_COLOR: Record<Status, string> = {
  OFFLINE: "var(--line-dim)",
  BOOTING: "var(--amber)",
  ONLINE: "var(--cyan)",
};

function ProjectBlock({ project, i }: { project: Project; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reverse = i % 2 === 1;
  const [status, setStatus] = useState<Status>("OFFLINE");

  const handleOnline = useCallback(() => {
    setStatus("ONLINE");
    sound.play("online");
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(".proj-reveal", {
        scrollTrigger: { trigger: el, start: "top 78%" },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
      });
      ScrollTrigger.create({
        trigger: el,
        start: "top 72%",
        onEnter: () => {
          setStatus((s) => (s === "ONLINE" ? s : "BOOTING"));
          sound.play("sweep");
        },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      className="grid items-center gap-10 border-t border-line-faint py-20 lg:grid-cols-2 lg:gap-16"
    >
      {/* details */}
      <div className={reverse ? "lg:order-2" : ""}>
        <div className="proj-reveal flex items-center gap-3">
          <span className="tech-label text-amber">{project.index}</span>
          <span className="h-px flex-1 bg-line-faint" />
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "BOOTING" ? "animate-pulse" : ""
              }`}
              style={{
                backgroundColor: STATUS_COLOR[status],
                boxShadow:
                  status === "ONLINE" ? `0 0 8px ${STATUS_COLOR[status]}` : "none",
              }}
            />
            <span
              className="tech-label"
              style={{ color: STATUS_COLOR[status] }}
            >
              {status}
            </span>
          </span>
          <span className="tech-label">{project.year}</span>
        </div>

        <h3 className="proj-reveal mt-4 font-display text-3xl font-bold md:text-4xl">
          {project.name}
        </h3>
        <div className="proj-reveal mt-1 tech-label text-cyan">
          {project.classification} · {project.client}
        </div>

        <p className="proj-reveal mt-5 max-w-lg text-sm leading-relaxed text-paper-dim">
          {project.summary}
        </p>

        {/* metrics */}
        <div className="proj-reveal mt-6 flex flex-wrap gap-px border border-line-faint bg-line-faint">
          {project.metrics.map((m) => (
            <div key={m.label} className="flex-1 bg-ink-900 px-4 py-3">
              <div className="font-display text-xl font-semibold text-cyan glow-cyan">
                {m.value}
              </div>
              <div className="tech-label mt-0.5 text-[0.55rem]">{m.label}</div>
            </div>
          ))}
        </div>

        {/* highlights */}
        <ul className="proj-reveal mt-6 space-y-1.5">
          {project.highlights.map((h) => (
            <li key={h} className="flex gap-2.5 text-sm text-paper">
              <span className="mt-1.5 h-1 w-1 shrink-0 bg-amber" />
              <span>{h}</span>
            </li>
          ))}
        </ul>

        {/* stack */}
        <div className="proj-reveal mt-6 flex flex-wrap gap-2">
          {project.stack.map((s) => (
            <span
              key={s}
              className="border border-line-faint px-2.5 py-1 text-xs text-paper-dim"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* diagram */}
      <div className={`proj-reveal ${reverse ? "lg:order-1" : ""}`}>
        <div className="tech-label mb-3 flex items-center justify-between">
          <span>FIG.{i + 1} — SYSTEM ARCHITECTURE</span>
          <span style={{ color: STATUS_COLOR[status] }}>
            {status === "ONLINE"
              ? "● STREAMING"
              : status === "BOOTING"
                ? "◐ ASSEMBLING"
                : "○ STANDBY"}
          </span>
        </div>
        <BlueprintDiagram
          nodes={project.diagram.nodes}
          edges={project.diagram.edges}
          onOnline={handleOnline}
        />
      </div>
    </div>
  );
}

export default function Projects() {
  return (
    <section id="systems" className="relative mx-auto max-w-6xl px-6 py-24 md:px-10">
      <SectionHeader index="02" title="DEPLOYED SYSTEMS" caption="Self-assembling architecture schematics — drawn as you read." />
      <div>
        {projects.map((p, i) => (
          <ProjectBlock key={p.id} project={p} i={i} />
        ))}
      </div>
    </section>
  );
}
