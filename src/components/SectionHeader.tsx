"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SectionHeader({
  index,
  title,
  caption,
}: {
  index: string;
  title: string;
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(".sh-line", {
        scrollTrigger: { trigger: el, start: "top 85%" },
        scaleX: 0,
        transformOrigin: "left",
        duration: 1,
        ease: "power3.out",
      });
      gsap.from(".sh-item", {
        scrollTrigger: { trigger: el, start: "top 85%" },
        y: 20,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="mb-12">
      <div className="sh-line h-px w-full bg-line-faint" />
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <h2 className="sh-item font-display text-2xl font-bold tracking-tight md:text-4xl">
          <span className="text-amber glow-amber">{index}</span>
          <span className="mx-3 text-line-dim">/</span>
          {title}
        </h2>
        {caption && (
          <p className="sh-item max-w-sm text-sm text-paper-dim">{caption}</p>
        )}
      </div>
    </div>
  );
}
