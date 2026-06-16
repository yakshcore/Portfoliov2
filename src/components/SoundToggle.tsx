"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/sound";

export default function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const unsub = sound.subscribe(setOn);
    return unsub;
  }, []);

  return (
    <button
      onClick={() => sound.toggle()}
      onMouseEnter={() => sound.play("hover")}
      aria-label={on ? "Mute audio" : "Enable audio"}
      className="pointer-events-auto group flex items-center gap-2 border border-line-faint bg-ink-900/70 px-3 py-1.5 backdrop-blur transition-colors hover:border-cyan"
    >
      <span className="flex h-3 items-end gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-[2px] transition-all duration-300 ${
              on ? "bg-cyan" : "bg-line-dim"
            }`}
            style={{
              height: on ? `${4 + ((i * 3 + 5) % 9)}px` : "3px",
              animation: on
                ? `eq 0.9s ease-in-out ${i * 0.12}s infinite alternate`
                : "none",
            }}
          />
        ))}
      </span>
      <span className="tech-label text-[0.6rem]">
        {on ? "AUDIO ON" : "AUDIO OFF"}
      </span>
      <style jsx>{`
        @keyframes eq {
          from {
            height: 3px;
          }
          to {
            height: 12px;
          }
        }
      `}</style>
    </button>
  );
}
