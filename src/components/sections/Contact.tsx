"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { identity } from "@/data/portfolio";
import SectionHeader from "@/components/SectionHeader";
import CatField, { type CatMood } from "@/components/CatField";

gsap.registerPlugin(ScrollTrigger);

const CHANNELS = [
  { label: "EMAIL", value: identity.email, href: `mailto:${identity.email}` },
  {
    label: "GITHUB",
    value: "github.com/yakshcore",
    href: identity.links.github,
  },
  {
    label: "LINKEDIN",
    value: "in/yaksh-bambhroliya",
    href: identity.links.linkedin,
  },
  {
    label: "PHONE",
    value: identity.phone,
    href: `tel:${identity.phone.replace(/\s/g, "")}`,
  },
];

export default function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [mood, setMood] = useState<CatMood>("DOZING");
  const [thought, setThought] = useState<string | null>(null);
  const thoughtTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showThought = (t: string) => {
    setThought(t);
    if (thoughtTimer.current) clearTimeout(thoughtTimer.current);
    thoughtTimer.current = setTimeout(() => setThought(null), 4200);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(".contact-reveal", {
        scrollTrigger: { trigger: el, start: "top 75%" },
        y: 28,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });
      ScrollTrigger.create({
        trigger: el,
        start: "top 70%",
        onEnter: () => setArmed(true),
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="comms"
      ref={ref}
      className="relative mx-auto max-w-6xl px-6 py-24 md:px-10"
    >
      <SectionHeader
        index="05"
        title="ESTABLISH COMMS"
        caption="Channel open. Awaiting transmission."
      />

      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <div className="contact-reveal flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                armed ? "bg-cyan shadow-[0_0_10px_var(--cyan)]" : "bg-line-dim"
              }`}
            />
            <span className="tech-label text-cyan">
              {armed ? "SIGNAL ACQUIRED" : "ACQUIRING..."}
            </span>
          </div>

          <h3 className="contact-reveal mt-6 font-display text-4xl font-bold leading-tight md:text-6xl">
            Let&apos;s build
            <br />
            <span className="text-cyan glow-cyan">something</span>
            <br />
            ambitious.
          </h3>

          <p className="contact-reveal mt-6 max-w-md text-sm leading-relaxed text-paper-dim">
            Recruiters, founders, and clients - if you need someone who can
            architect, build, and ship a production system end-to-end, the
            channel is open.
          </p>

          <a
            href={`mailto:${identity.email}`}
            className="contact-reveal group mt-8 inline-flex items-center gap-3 border border-cyan px-6 py-3 font-display text-sm font-semibold text-cyan transition-colors hover:bg-cyan hover:text-ink-900"
          >
            INITIATE TRANSMISSION
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>

        {/* right column: channels + interactive signal field */}
        <div className="flex flex-col gap-6">
          {/* channel list */}
          <div className="contact-reveal grid grid-cols-1 gap-px border border-line-faint bg-line-faint sm:grid-cols-2">
            {CHANNELS.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="group bg-ink-900 p-5 transition-colors hover:bg-ink-800"
              >
                <div className="tech-label flex items-center justify-between">
                  {c.label}
                  <span className="text-line-dim transition-colors group-hover:text-cyan">
                    ↗
                  </span>
                </div>
                <div className="mt-2 break-all font-display text-sm text-paper transition-colors group-hover:text-cyan">
                  {c.value}
                </div>
              </a>
            ))}
          </div>

          {/* resident kitten - watches the cursor, purrs when pet, chases a toy */}
          <div className="contact-reveal relative min-h-[240px] flex-1 overflow-hidden rounded border border-line-faint bg-ink-900/40">
            <CatField onMood={setMood} onThought={showThought} />
            <div className="pointer-events-none absolute left-3 top-3 tech-label text-paper-dim/60">
              purr.sys ·{" "}
              <span className="text-cyan">{mood}</span>
            </div>
            {thought && (
              <div className="pointer-events-none absolute left-3 top-8 font-mono text-[0.6rem] text-cyan/70">
                &gt; {thought}
              </div>
            )}
            <div className="pointer-events-none absolute bottom-3 right-3 tech-label text-[0.5rem] text-paper-dim/40">
              HOVER TO PET · CLICK TO PLAY
            </div>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-line-faint pt-6 tech-label">
        <span>
          © {new Date().getFullYear()} {identity.name.toUpperCase()}
        </span>
        <span>DRAWING NO. YB-2026 · END OF SCHEMATIC</span>
        <span className="text-cyan">UPLINK · STABLE</span>
      </div>
    </section>
  );
}
