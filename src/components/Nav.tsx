"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/sound";

const ITEMS = [
  { id: "operations", label: "OPS" },
  { id: "principles", label: "PRINCIPLES" },
  { id: "systems", label: "SYSTEMS" },
  { id: "signals", label: "SIGNALS" },
  { id: "architect", label: "ARCHITECT" },
  { id: "comms", label: "COMMS" },
];

export default function Nav() {
  const [active, setActive] = useState("");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ITEMS.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="pointer-events-auto fixed left-1/2 top-6 z-50 hidden -translate-x-1/2 items-center gap-1 border border-line-faint bg-ink-900/70 px-1.5 py-1.5 backdrop-blur md:flex">
      {ITEMS.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          onMouseEnter={() => sound.play("hover")}
          onClick={() => sound.play("blip")}
          className={`px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] transition-colors ${
            active === i.id
              ? "bg-cyan/15 text-cyan"
              : "text-paper-dim hover:text-paper"
          }`}
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}
