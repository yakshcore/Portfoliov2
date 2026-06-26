"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NAV_SECTIONS } from "@/lib/sections";
import { scrollToSection, getLenis } from "@/lib/lenis";
import { sendCat } from "@/lib/catSignals";
import { sound } from "@/lib/sound";
import { identity } from "@/data/portfolio";

gsap.registerPlugin(ScrollTrigger);

// human-readable chapter titles for each depth-axis station
const CHAPTER: Record<string, string> = {
  operations: "OPERATIONS",
  principles: "GUIDING PRINCIPLES",
  systems: "DEPLOYED SYSTEMS",
  signals: "OPEN SIGNALS",
  architect: "THE ARCHITECT",
  comms: "ESTABLISH COMMS",
};

const N = NAV_SECTIONS.length;

export default function MissionDebrief() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const rowEls = useRef<(HTMLButtonElement | null)[]>([]);

  const [reviewed, setReviewed] = useState(0);
  const [compiled, setCompiled] = useState(false);
  const [choice, setChoice] = useState<"contact" | "observer" | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const counter = { p: 0 };
    const writeMeter = () => {
      const p = Math.round(counter.p);
      if (pct.current) pct.current.textContent = String(p).padStart(3, "0");
      if (bar.current) bar.current.style.width = `${p}%`;
    };

    if (reduce) {
      setReviewed(N);
      setCompiled(true);
      counter.p = 100;
      writeMeter();
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 78%", once: true },
      });

      tl.from(".debrief-head", {
        y: 18,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
      });

      // compile the dossier: each chapter flips to REVIEWED in sequence
      NAV_SECTIONS.forEach((_, i) => {
        const at = 0.5 + i * 0.18;
        tl.from(
          rowEls.current[i],
          { x: -14, opacity: 0, duration: 0.3, ease: "power2.out" },
          at,
        ).call(
          () => {
            setReviewed(i + 1);
            sound.play("boot");
          },
          [],
          at + 0.04,
        );
      });

      // SYNC meter climbs alongside the chapters
      tl.to(
        counter,
        { p: 100, duration: N * 0.18, ease: "none", onUpdate: writeMeter },
        0.5,
      );

      tl.call(() => {
        setCompiled(true);
        sound.play("online");
      })
        .from(".debrief-choice", {
          y: 16,
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
        })
        .from(
          ".debrief-cta",
          { y: 10, opacity: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" },
          "<",
        );
    }, el);

    return () => ctx.revert();
  }, []);

  const initiate = () => {
    sound.play("online");
    setChoice("contact");
    sendCat({ type: "perk", label: "transmission incoming" });
    scrollToSection("comms");
  };
  const observe = () => {
    sound.play("blip");
    setChoice("observer");
    const l = getLenis();
    if (l) l.scrollTo(0, { duration: 1.4 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div ref={root} className="mt-24 border-t border-line-faint pt-12">
      {/* header */}
      <div className="debrief-head flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="tech-label flex items-center gap-3 text-cyan">
            <span className="h-px w-8 bg-cyan" />
            MISSION DEBRIEF
          </div>
          <h3 className="mt-3 font-display text-3xl font-bold md:text-4xl">
            System reviewed.
          </h3>
        </div>

        {/* SYNC meter */}
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between">
            <span className="tech-label text-paper-dim/70">SYNC</span>
            <span className="font-mono text-sm text-cyan glow-cyan">
              <span ref={pct}>000</span>%
            </span>
          </div>
          <div className="relative mt-2 h-2 overflow-hidden border border-line-faint bg-ink-800">
            <div
              ref={bar}
              className="absolute inset-y-0 left-0 bg-cyan shadow-[0_0_12px_var(--cyan)]"
              style={{ width: 0 }}
            />
          </div>
        </div>
      </div>

      {/* chapter dossier */}
      <div className="mt-10 grid grid-cols-1 gap-px border border-line-faint bg-line-faint sm:grid-cols-2 lg:grid-cols-3">
        {NAV_SECTIONS.map((s, i) => {
          const done = i < reviewed;
          return (
            <button
              key={s.id}
              ref={(el) => {
                rowEls.current[i] = el;
              }}
              onClick={() => {
                sound.play("blip");
                scrollToSection(s.id);
              }}
              onMouseEnter={() => sound.play("hover")}
              className="group flex items-center gap-3 bg-ink-900 px-4 py-4 text-left transition-colors hover:bg-ink-800"
            >
              <span className="tech-label w-6 shrink-0 text-paper-dim/50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`h-2 w-2 shrink-0 rounded-full transition-all ${
                  done ? "bg-cyan shadow-[0_0_8px_var(--cyan)]" : "bg-line-dim"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-semibold text-paper transition-colors group-hover:text-cyan">
                  {CHAPTER[s.id] ?? s.label}
                </span>
                <span
                  className="tech-label text-[0.55rem]"
                  style={{ color: done ? "var(--cyan)" : "var(--line-dim)" }}
                >
                  {done ? "REVIEWED" : "OFFLINE"}
                </span>
              </span>
              <span className="tech-label text-line-dim transition-colors group-hover:text-cyan">
                ↗
              </span>
            </button>
          );
        })}
      </div>

      {/* final deviant choice */}
      {compiled && (
        <div className="debrief-choice mt-12">
          <div className="tech-label mb-4 text-amber glow-amber">
            // one decision remains
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* INITIATE CONTACT */}
            <a
              href={`mailto:${identity.email}`}
              onClick={initiate}
              onMouseEnter={() => sound.play("hover")}
              className="debrief-cta group relative flex flex-1 items-center justify-between border border-cyan bg-cyan/5 px-6 py-5 transition-colors hover:bg-cyan hover:text-ink-900"
            >
              <span className="absolute -left-1 -top-1 h-2 w-2 border-l border-t border-cyan" />
              <span className="absolute -right-1 -top-1 h-2 w-2 border-r border-t border-cyan" />
              <span className="absolute -bottom-1 -left-1 h-2 w-2 border-b border-l border-cyan" />
              <span className="absolute -bottom-1 -right-1 h-2 w-2 border-b border-r border-cyan" />
              <span>
                <span className="block font-display text-lg font-semibold text-cyan transition-colors group-hover:text-ink-900">
                  INITIATE CONTACT
                </span>
                <span className="tech-label text-paper-dim transition-colors group-hover:text-ink-900/70">
                  open the channel
                </span>
              </span>
              <span className="text-xl transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>

            {/* REMAIN OBSERVER */}
            <button
              onClick={observe}
              onMouseEnter={() => sound.play("hover")}
              className="debrief-cta group relative flex flex-1 items-center justify-between border border-line-faint px-6 py-5 text-left transition-colors hover:border-paper-dim"
            >
              <span>
                <span className="block font-display text-lg font-semibold text-paper-dim transition-colors group-hover:text-paper">
                  REMAIN OBSERVER
                </span>
                <span className="tech-label text-line-dim">
                  rewind to the top
                </span>
              </span>
              <span className="text-xl text-line-dim transition-transform group-hover:-translate-y-1">
                ↑
              </span>
            </button>
          </div>

          {choice && (
            <div className="mt-5 tech-label text-cyan">
              {choice === "contact"
                ? "> channel opening ..."
                : "> acknowledged. still watching."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
