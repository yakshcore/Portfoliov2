"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/sound";
import { scrollToSection } from "@/lib/lenis";
import { NAV_SECTIONS as SECTIONS } from "@/lib/sections";

// the navigation IS the depth axis - each section is a station at its true
// scroll depth, so spacing itself reads as a schematic of the descent.
type Pt = { id: string; label: string; frac: number };

export default function DepthNav() {
  const [progress, setProgress] = useState(0);
  const [pts, setPts] = useState<Pt[]>(() =>
    SECTIONS.map((s, i) => ({ ...s, frac: (i + 1) / (SECTIONS.length + 1) })),
  );

  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const denom = max > 0 ? max : 1;
      setPts(
        SECTIONS.map((s) => {
          const el = document.getElementById(s.id);
          const top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
          return { ...s, frac: Math.max(0, Math.min(1, top / denom)) };
        }),
      );
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0);
    };

    measure();
    onScroll();
    // re-measure after late layout shifts (fonts, the 3D canvas, images)
    const t1 = setTimeout(measure, 400);
    const t2 = setTimeout(measure, 1400);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // active = the deepest station we've descended past (-1 = still at the hero)
  let active = -1;
  for (let i = 0; i < pts.length; i++) {
    if (progress + 0.02 >= pts[i].frac) active = i;
  }

  const go = (id: string) => {
    sound.play("blip");
    scrollToSection(id);
  };

  return (
    <>
      {/* ---- desktop: the depth axis is the nav ---- */}
      <div className="pointer-events-none fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex">
        <button
          onClick={() => go("operations")}
          className="tech-label pointer-events-auto [writing-mode:vertical-rl] text-paper-dim transition-colors hover:text-cyan"
        >
          DEPTH
        </button>

        <div className="relative h-[58vh] max-h-[560px] w-px bg-line-faint">
          {/* descent progress fill */}
          <div
            className="absolute left-0 top-0 w-px bg-cyan"
            style={{ height: `${progress * 100}%` }}
          />

          {/* section stations */}
          {pts.map((p, i) => {
            const isActive = i === active;
            return (
              <div
                key={p.id}
                className="group absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ top: `${p.frac * 100}%` }}
              >
                <span
                  className={`tech-label pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap text-[0.6rem] transition-all duration-200 ${
                    isActive
                      ? "translate-x-0 text-cyan opacity-100"
                      : "-translate-x-1 text-paper-dim opacity-0 group-hover:translate-x-0 group-hover:opacity-70"
                  }`}
                >
                  {p.label}
                </span>
                <button
                  onClick={() => go(p.id)}
                  onMouseEnter={() => sound.play("hover")}
                  aria-label={p.label}
                  className="pointer-events-auto -m-2 block rounded-full p-2"
                >
                  <span
                    className={`block h-1.5 w-1.5 rounded-full border transition-all ${
                      isActive
                        ? "scale-125 border-cyan bg-cyan shadow-[0_0_8px_var(--cyan)]"
                        : "border-line-dim bg-ink-900 group-hover:border-cyan"
                    }`}
                  />
                </button>
              </div>
            );
          })}

          {/* you-are-here marker rides the axis */}
          <div
            className="pointer-events-none absolute -left-[3.5px] z-10 h-2 w-2 rounded-full bg-cyan shadow-[0_0_10px_var(--cyan)]"
            style={{ top: `calc(${progress * 100}% - 4px)` }}
          />
        </div>

        <span className="tech-label tabular-nums text-cyan">
          {String(Math.round(progress * 100)).padStart(3, "0")}
        </span>
      </div>

      {/* ---- mobile: compact dot-strip so phones aren't stranded ---- */}
      <div className="pointer-events-auto fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line-faint bg-ink-900/85 px-4 py-2 backdrop-blur md:hidden">
        <span className="tech-label text-[0.55rem] text-cyan">
          {pts[active]?.label ?? "HERO"}
        </span>
        {pts.map((p, i) => (
          <button
            key={p.id}
            onClick={() => go(p.id)}
            aria-label={p.label}
            className={`h-2 w-2 rounded-full transition-all ${
              i === active
                ? "scale-125 bg-cyan shadow-[0_0_8px_var(--cyan)]"
                : "bg-line-dim"
            }`}
          />
        ))}
      </div>
    </>
  );
}
