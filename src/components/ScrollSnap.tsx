"use client";

import { useEffect } from "react";
import { getLenis } from "@/lib/lenis";
import { NAV_SECTIONS } from "@/lib/sections";

// Proximity scroll-snap: once scrolling settles, if we've come to rest near a
// section "station" we ease onto it via Lenis — magnetic, not mandatory, so you
// can still stop mid-section when you're not close to a point.
const SETTLE_MS = 150; // quiet time before we consider snapping
const SNAP_WINDOW = 0.38; // only snap if within this fraction of viewport height
const MIN_DELTA = 4; // ignore if we're already basically on the point

export default function ScrollSnap() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let settle: ReturnType<typeof setTimeout>;
    let snapping = false;

    const stationTops = () => {
      const tops = [0]; // the hero / top of the descent
      for (const s of NAV_SECTIONS) {
        const el = document.getElementById(s.id);
        if (el) tops.push(el.getBoundingClientRect().top + window.scrollY);
      }
      return tops;
    };

    const trySnap = () => {
      const lenis = getLenis();
      if (!lenis || snapping) return;
      // don't fight a body-locked overlay (e.g. the stack story)
      if (document.body.style.overflow === "hidden") return;

      const y = window.scrollY;
      const vh = window.innerHeight;
      let best: number | null = null;
      let bd = Infinity;
      for (const t of stationTops()) {
        const d = Math.abs(t - y);
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
      if (best == null || bd <= MIN_DELTA || bd >= vh * SNAP_WINDOW) return;

      snapping = true;
      lenis.scrollTo(best, {
        duration: 0.7,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        onComplete: () => {
          snapping = false;
        },
      });
    };

    const onScroll = () => {
      clearTimeout(settle);
      settle = setTimeout(trySnap, SETTLE_MS);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
