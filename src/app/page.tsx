"use client";

import { useState } from "react";
import SmoothScroll from "@/components/SmoothScroll";
import BootSequence from "@/components/BootSequence";
import HudFrame from "@/components/HudFrame";
import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import Approach from "@/components/sections/Approach";
import Projects from "@/components/sections/Projects";
import OpenSource from "@/components/sections/OpenSource";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";

export default function Home() {
  const [booted, setBooted] = useState(false);

  return (
    <SmoothScroll>
      {/* fixed console backdrop — grid + edge vignette stay put while content scrolls */}
      <div className="pointer-events-none fixed inset-0 -z-10 blueprint-grid" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--ink-900)_100%)]" />

      <BootSequence onDone={() => setBooted(true)} />
      <HudFrame />
      <Nav />

      <main className="relative">
        <Hero started={booted} />
        <Approach />
        <Projects />
        <OpenSource />
        <About />
        <Contact />
      </main>
    </SmoothScroll>
  );
}
