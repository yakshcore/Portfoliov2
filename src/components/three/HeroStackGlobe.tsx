"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { sound } from "@/lib/sound";
import { stackStory } from "@/data/portfolio";
import type { GlobeControls, HoverNode } from "@/components/three/StackGlobe";

const StackGlobe = dynamic(() => import("@/components/three/StackGlobe"), {
  ssr: false,
});

const { layers } = stackStory;

// The hero globe IS the stack globe, shown in whatever "completion" state the
// visitor has reached. Single tap does nothing; a double-tap / double-click
// opens the fullscreen scroll-story. Drag still spins it 360°.
export default function HeroStackGlobe({
  reachedRef,
  onOpen,
}: {
  reachedRef: React.RefObject<number>;
  onOpen: () => void;
}) {
  const controlsRef = useRef<GlobeControls>({
    dragging: false,
    vy: 0.12,
    vx: 0,
    accumDX: 0,
    accumDY: 0,
    lastX: 0,
    lastY: 0,
  });
  const hoverRef = useRef<HoverNode>(null);

  const drag = useRef({
    active: false,
    decided: false,
    rotating: false,
    x: 0,
    y: 0,
    moved: false,
  });
  const lastTap = useRef(0);

  const onDown = (e: React.PointerEvent) => {
    drag.current = {
      active: true,
      decided: false,
      rotating: false,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    controlsRef.current.lastX = e.clientX;
    controlsRef.current.lastY = e.clientY;
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const adx = Math.abs(e.clientX - d.x);
    const ady = Math.abs(e.clientY - d.y);
    if (!d.decided) {
      if (Math.max(adx, ady) < 5) return;
      d.decided = true;
      d.moved = true;
      // mouse → always rotate; touch → horizontal rotates, vertical = page scroll
      d.rotating = e.pointerType === "mouse" ? true : adx >= ady;
      if (d.rotating) {
        controlsRef.current.dragging = true;
        controlsRef.current.vy = 0;
        controlsRef.current.vx = 0;
        controlsRef.current.lastX = e.clientX;
        controlsRef.current.lastY = e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } else {
        d.active = false;
        return;
      }
    }
    if (d.rotating) {
      controlsRef.current.accumDX += e.clientX - controlsRef.current.lastX;
      controlsRef.current.accumDY += e.clientY - controlsRef.current.lastY;
      controlsRef.current.lastX = e.clientX;
      controlsRef.current.lastY = e.clientY;
    }
  };

  const onUp = () => {
    const d = drag.current;
    if (d.rotating) controlsRef.current.dragging = false;
    // double-tap to open (works for both touch and mouse) — never on a drag
    if (!d.moved) {
      const now = performance.now();
      if (now - lastTap.current < 320) {
        lastTap.current = 0;
        sound.play("blip");
        onOpen();
      } else {
        lastTap.current = now;
      }
    }
    d.active = false;
    d.decided = false;
    d.rotating = false;
  };

  const onLeave = () => {
    if (drag.current.rotating) controlsRef.current.dragging = false;
    drag.current.active = false;
    drag.current.decided = false;
    drag.current.rotating = false;
  };

  return (
    <div
      className="absolute inset-0 cursor-pointer touch-pan-y select-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
    >
      <StackGlobe
        layers={layers}
        activeRef={reachedRef}
        controlsRef={controlsRef}
        hoverRef={hoverRef}
      />
    </div>
  );
}
