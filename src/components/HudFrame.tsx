"use client";

import { useEffect, useRef, useState } from "react";
import { identity } from "@/data/portfolio";
import SoundToggle from "@/components/SoundToggle";

function Corner({ className }: { className: string }) {
  return (
    <svg
      className={`absolute h-6 w-6 text-line-dim ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path d="M1 8 V1 H8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function HudFrame() {
  const [clock, setClock] = useState("--:--:--");
  const [fps, setFps] = useState(60);
  const [signal, setSignal] = useState(5);
  const [load, setLoad] = useState(34);

  useEffect(() => {
    // live clock — updates every second
    const tick = () => {
      const d = new Date();
      setClock(
        [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map((n) => String(n).padStart(2, "0"))
          .join(":")
      );
    };
    tick();
    const clockId = setInterval(tick, 1000);

    // fluctuating telemetry
    const teleId = setInterval(() => {
      setSignal(3 + Math.floor(Math.random() * 3)); // 3..5 bars
      setLoad(28 + Math.floor(Math.random() * 22)); // 28..49 %
    }, 2200);

    return () => {
      clearInterval(clockId);
      clearInterval(teleId);
    };
  }, []);

  // FPS meter
  const raf = useRef(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 hidden md:block">
      {/* corner brackets */}
      <div className="absolute inset-4">
        <Corner className="left-0 top-0" />
        <Corner className="right-0 top-0 rotate-90" />
        <Corner className="bottom-0 right-0 rotate-180" />
        <Corner className="bottom-0 left-0 -rotate-90" />
      </div>

      {/* top-left readout */}
      <div className="absolute left-9 top-7 flex items-center gap-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
        <span className="tech-label text-cyan">{identity.callsign}</span>
        <span className="tech-label">UPLINK ACTIVE</span>
      </div>

      {/* top-right: clock + signal */}
      <div className="absolute right-9 top-7 flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="tech-label">SIG</span>
          <span className="flex items-end gap-[2px]">
            {[1, 2, 3, 4, 5].map((b) => (
              <span
                key={b}
                className="w-[3px]"
                style={{
                  height: `${b * 2 + 2}px`,
                  background: b <= signal ? "var(--cyan)" : "var(--line-faint)",
                }}
              />
            ))}
          </span>
        </span>
        <span className="tech-label tabular-nums text-cyan">T {clock} IST</span>
      </div>

      {/* bottom-left: location + telemetry */}
      <div className="absolute bottom-7 left-9 flex items-center gap-5">
        <span className="tech-label">{identity.location.toUpperCase()}</span>
        <span className="tech-label">
          FPS <span className="text-cyan tabular-nums">{fps}</span>
        </span>
        <span className="tech-label">
          SYS LOAD{" "}
          <span className="text-cyan tabular-nums">
            {String(load).padStart(2, "0")}%
          </span>
        </span>
      </div>

      {/* bottom-right: sound toggle */}
      <div className="absolute bottom-6 right-9">
        <SoundToggle />
      </div>
    </div>
  );
}
