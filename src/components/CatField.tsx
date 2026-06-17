"use client";

import { useEffect, useRef } from "react";
import { sound } from "@/lib/sound";

// A procedural line-art kitten - no assets. Watches the paw cursor, blinks and
// flicks its tail on idle, purrs + floats hearts when pet, startles on fast
// moves, naps when left alone, and chases a toy you throw (click) for it.
const STROKE = "127,224,255"; // cyan-bright
const FILL = "8,16,30";
const TOY = "255,179,71"; // amber toy

const THOUGHTS = [
  "contemplating databases...",
  "deployment smells stable today",
  "investigating packet loss",
  "is the cursor... prey?",
  "nap queued · priority low",
  "guarding the schematic",
  "uptime: purrfect",
  "where do the packets go",
];

export type CatMood =
  | "SLEEPING"
  | "STARTLED"
  | "PLAYING"
  | "PURRING"
  | "WATCHING"
  | "DOZING";

export default function CatField({
  onMood,
  onThought,
}: {
  onMood?: (m: CatMood) => void;
  onThought?: (t: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const moodCb = useRef(onMood);
  moodCb.current = onMood;
  const thoughtCb = useRef(onThought);
  thoughtCb.current = onThought;

  useEffect(() => {
    const box = wrap.current;
    const cv = canvas.current;
    if (!box || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;

    const resize = () => {
      const r = box.getBoundingClientRect();
      W = r.width;
      H = r.height;
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const P = { x: -9999, y: -9999, inside: false, px: -9999, py: -9999, spd: 0 };
    let lastActivity = performance.now();
    let clickPending: { x: number; y: number } | null = null;

    const setPos = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      P.x = e.clientX - r.left;
      P.y = e.clientY - r.top;
      P.inside = true;
      lastActivity = performance.now();
    };
    const onMove = (e: PointerEvent) => setPos(e);
    const onDown = (e: PointerEvent) => {
      setPos(e);
      clickPending = { x: P.x, y: P.y };
    };
    const onLeave = () => {
      P.inside = false;
    };
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerdown", onDown);
    box.addEventListener("pointerleave", onLeave);

    let running = true;
    const io = new IntersectionObserver(([e]) => (running = e.isIntersecting), {
      threshold: 0,
    });
    io.observe(box);

    const S = {
      comfort: 0,
      startle: 0,
      alert: 0,
      play: 0,
      asleep: 0,
      lookx: 0,
      looky: 0,
      leanx: 0,
      leany: 0,
      pupil: 1,
      ear: 0,
      blinkT: 1.5 + Math.random() * 2.5,
      blinking: -1,
    };
    const hearts: { x: number; y: number; life: number; vx: number }[] = [];
    const toys: { x: number; y: number; life: number }[] = [];
    let heartT = 0;
    let purrT = 0;
    let thoughtT = 18 + Math.random() * 18;
    let stretch = 0;
    let prevAsleep = 0;
    let prevMood: CatMood | "" = "";
    let last = performance.now();

    const ease = (cur: number, target: number, rate: number, dt: number) =>
      cur + (target - cur) * Math.min(1, dt * rate);

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = now / 1000;

      if (P.px > -9000 && dt > 0) {
        const sp = Math.hypot(P.x - P.px, P.y - P.py) / dt;
        P.spd += (sp - P.spd) * 0.35;
      }
      P.px = P.x;
      P.py = P.y;

      const size = Math.min(W * 0.5, H * 0.9);
      const headR = size * 0.22;
      const baseX = W / 2;
      const baseY = H * 0.56;
      const breathe = Math.sin(time * (S.asleep > 0.5 ? 0.9 : 1.6)) * headR * 0.02;
      const hx = baseX + S.leanx;
      const hy = baseY - headR * 0.55 + S.leany + breathe;

      // consume a click: far from the cat = throw a toy, near = a pet
      if (clickPending) {
        const cd = Math.hypot(clickPending.x - hx, clickPending.y - hy);
        if (cd > headR * 1.7) {
          toys.push({ x: clickPending.x, y: clickPending.y, life: 1 });
          sound.play("chirp");
        }
        clickPending = null;
      }
      const toy = toys.length ? toys[toys.length - 1] : null;
      const chasing = !!toy;

      // focus point: toy if chasing, else the cursor
      const fx = toy ? toy.x : P.x;
      const fy = toy ? toy.y : P.y;
      const focused = chasing || P.inside;
      const dx = fx - hx;
      const dy = fy - hy;
      const dist = Math.hypot(dx, dy);
      const petR = headR * 2.5;

      // sleep when left alone (no toy, no recent activity)
      const asleepT = !chasing && now - lastActivity > 9000 ? 1 : 0;
      S.asleep = ease(S.asleep, asleepT, 1.6, dt);
      if (prevAsleep > 0.5 && S.asleep < 0.5) {
        stretch = 0.7;
        sound.play("meow");
      }
      prevAsleep = S.asleep;
      if (stretch > 0) stretch = Math.max(0, stretch - dt);
      const wake = 1 - S.asleep;

      // moods (suppressed while asleep)
      const startleT = P.inside && !chasing
        ? Math.min(1, Math.max(0, (P.spd - 1100) / 1400)) * wake
        : 0;
      const comfortT =
        !chasing && P.inside && dist < petR
          ? (1 - dist / petR) * (1 - startleT) * wake
          : 0;
      const alertT = focused ? wake - startleT * 0.4 : 0;
      const playT = chasing
        ? wake
        : P.inside && dist < headR * 3.6 && dist > petR * 0.75 && P.spd > 140 && P.spd < 1500
          ? (1 - comfortT) * wake
          : 0;

      S.comfort = ease(S.comfort, comfortT, 6, dt);
      S.startle = ease(S.startle, startleT, 11, dt);
      S.alert = ease(S.alert, alertT, 5, dt);
      S.play = ease(S.play, playT, 6, dt);
      S.pupil = ease(S.pupil, (S.startle > 0.3 ? 1.55 : 1) - S.comfort * 0.45, 8, dt);
      S.ear = ease(S.ear, (S.alert * 0.6 + S.play - S.startle * 1.4) * wake - S.asleep, 6, dt);

      const tx = focused ? Math.max(-1, Math.min(1, dx / (headR * 3))) * wake : 0;
      const ty = focused ? Math.max(-1, Math.min(1, dy / (headR * 3))) * wake : 0;
      S.lookx = ease(S.lookx, tx, 8, dt);
      S.looky = ease(S.looky, ty, 8, dt);
      const leanK = S.comfort * 0.55 + S.alert * 0.12 + S.play * 0.4;
      S.leanx = ease(S.leanx, tx * headR * 0.7 * leanK - S.startle * tx * headR * 0.5, 6, dt);
      S.leany = ease(S.leany, ty * headR * 0.4 * leanK - S.startle * headR * 0.35, 6, dt);

      // blink
      S.blinkT -= dt;
      if (S.blinkT <= 0 && S.blinking < 0) {
        S.blinking = 0;
        S.blinkT = 2 + Math.random() * 3;
      }
      let open = 1;
      if (S.blinking >= 0) {
        S.blinking += dt / 0.15;
        open = Math.abs(S.blinking * 2 - 1);
        if (S.blinking >= 1) S.blinking = -1;
      }

      // mood readout + sound cues
      let mood: CatMood = "DOZING";
      if (S.asleep > 0.55) mood = "SLEEPING";
      else if (S.startle > 0.4) mood = "STARTLED";
      else if (chasing) mood = "PLAYING";
      else if (S.comfort > 0.5) mood = "PURRING";
      else if (S.play > 0.3) mood = "PLAYING";
      else if (P.inside) mood = "WATCHING";
      if (mood !== prevMood) {
        if (mood === "WATCHING" && (prevMood === "DOZING" || prevMood === "SLEEPING"))
          sound.play("chirp");
        moodCb.current?.(mood);
        prevMood = mood;
      }
      if (S.comfort > 0.6) {
        purrT -= dt;
        if (purrT <= 0) {
          sound.play("purr");
          purrT = 1.4 + Math.random() * 0.6;
        }
      }
      // occasional thought when calm
      thoughtT -= dt;
      if (thoughtT <= 0) {
        thoughtT = 24 + Math.random() * 26;
        if (!chasing && S.startle < 0.2 && S.asleep < 0.4)
          thoughtCb.current?.(THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]);
      }

      const vib = S.comfort * Math.sin(time * 38) * headR * 0.02;
      const drop = S.asleep * headR * 0.45 - stretch * headR * 0.15;
      const hd = hy + drop;

      // ---- render ----
      ctx.clearRect(0, 0, W, H);
      const lw = Math.max(1.5, size * 0.013);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const stroke = (a = 1) => {
        ctx.strokeStyle = `rgba(${STROKE},${a})`;
        ctx.shadowColor = `rgba(${STROKE},0.7)`;
        ctx.shadowBlur = size * 0.04;
        ctx.lineWidth = lw;
      };
      const fill = () => {
        ctx.fillStyle = `rgba(${FILL},0.55)`;
        ctx.shadowBlur = 0;
      };

      // toys (drawn first, behind)
      for (let i = toys.length - 1; i >= 0; i--) {
        const tg = toys[i];
        tg.life -= dt / 1.6;
        const caught = Math.hypot(tg.x - hx, tg.y - hy) < headR * 0.9;
        if (caught) tg.life -= dt * 1.5;
        if (tg.life <= 0) {
          toys.splice(i, 1);
          continue;
        }
        const pulse = 0.7 + 0.3 * Math.sin(time * 14);
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, headR * 0.13 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${TOY},${tg.life})`;
        ctx.shadowColor = `rgba(${TOY},0.8)`;
        ctx.shadowBlur = size * 0.05;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, headR * 0.26 * (2 - tg.life), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${TOY},${tg.life * 0.3})`;
        ctx.shadowBlur = 0;
        ctx.lineWidth = lw * 0.7;
        ctx.stroke();
      }

      const bodyCx = baseX + S.leanx * 0.4;
      const bodyCy = baseY + headR * 1.05 + breathe;
      const bodyW = headR * (0.92 + S.asleep * 0.35);
      const bodyH = headR * (1.4 - S.asleep * 0.45 + stretch * 0.2);

      // tail
      const tailAmp = headR * (0.5 + S.alert * 0.4 + S.play * 0.9);
      const tailWave = Math.sin(time * (1.5 + S.alert * 1.6 + S.play * 4)) * tailAmp * wake;
      ctx.beginPath();
      const tsx = bodyCx + bodyW * 0.72;
      const tsy = bodyCy + bodyH * 0.25;
      ctx.moveTo(tsx, tsy);
      ctx.quadraticCurveTo(
        tsx + headR * 1.1,
        tsy - headR * 0.2 + tailWave,
        tsx + headR * 0.6,
        tsy - headR * 1.4 + tailWave * 0.6,
      );
      stroke(0.9);
      ctx.stroke();

      // body
      ctx.beginPath();
      ctx.ellipse(bodyCx + vib, bodyCy, bodyW, bodyH, 0, 0, Math.PI * 2);
      fill();
      ctx.fill();
      stroke(0.9);
      ctx.stroke();

      // front paws
      const pawLift = S.play * headR * 0.5;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        const pxp = bodyCx + sgn * bodyW * 0.58 + vib;
        const pyp = bodyCy + bodyH * 0.82 - (sgn === 1 ? pawLift : 0);
        ctx.ellipse(pxp, pyp, headR * 0.22, headR * 0.16, 0, 0, Math.PI * 2);
        fill();
        ctx.fill();
        stroke(0.85);
        ctx.stroke();
      }

      // ears
      const earUp = S.ear;
      for (const sgn of [-1, 1]) {
        const ex = hx + sgn * headR * 0.62 + vib;
        const ey = hd - headR * 0.55;
        const spread = sgn * headR * (0.32 + earUp * 0.12);
        const lift = headR * (0.55 + earUp * 0.25);
        ctx.beginPath();
        ctx.moveTo(ex - headR * 0.28, ey + headR * 0.2);
        ctx.lineTo(ex + spread, ey - lift);
        ctx.lineTo(ex + headR * 0.32, ey + headR * 0.15);
        ctx.closePath();
        fill();
        ctx.fill();
        stroke(0.9);
        ctx.stroke();
      }

      // head
      ctx.beginPath();
      ctx.ellipse(hx + vib, hd, headR, headR * 0.92, 0, 0, Math.PI * 2);
      fill();
      ctx.fill();
      stroke(1);
      ctx.stroke();

      // eyes
      const eyeY = hd + headR * 0.03;
      const eyeDX = headR * 0.4;
      const eyeR = headR * 0.33;
      const sleepy = S.asleep > 0.45;
      for (const sgn of [-1, 1]) {
        const ex = hx + sgn * eyeDX + vib;
        if (sleepy || S.comfort > 0.55) {
          // closed / happy arc
          stroke(0.95);
          ctx.beginPath();
          if (sleepy)
            ctx.arc(ex, eyeY - eyeR * 0.1, eyeR * 0.8, Math.PI * 0.15, Math.PI * 0.85);
          else
            ctx.arc(ex, eyeY + eyeR * 0.2, eyeR * 0.8, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        } else {
          const oy = Math.max(0.06, open) * (1 - S.comfort);
          ctx.beginPath();
          ctx.ellipse(ex, eyeY, eyeR, eyeR * oy, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${FILL},0.9)`;
          ctx.shadowBlur = 0;
          ctx.fill();
          stroke(0.9);
          ctx.stroke();
          const pr = eyeR * 0.5 * S.pupil;
          const pxe = ex + S.lookx * eyeR * 0.42;
          const pye = eyeY + S.looky * eyeR * 0.42 * Math.max(0.2, oy);
          ctx.beginPath();
          ctx.ellipse(pxe, pye, pr * 0.7, pr * Math.max(0.3, oy), 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${STROKE},0.95)`;
          ctx.shadowColor = `rgba(${STROKE},0.9)`;
          ctx.shadowBlur = size * 0.03;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pxe - pr * 0.25, pye - pr * 0.3, pr * 0.22, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.shadowBlur = 0;
          ctx.fill();
        }
      }

      // nose + mouth
      const noseY = hd + headR * 0.36;
      stroke(0.9);
      ctx.beginPath();
      ctx.moveTo(hx - headR * 0.07 + vib, noseY);
      ctx.lineTo(hx + headR * 0.07 + vib, noseY);
      ctx.lineTo(hx + vib, noseY + headR * 0.1);
      ctx.closePath();
      ctx.fillStyle = `rgba(${STROKE},0.85)`;
      ctx.fill();
      const smile = headR * (0.12 + S.comfort * 0.08);
      ctx.beginPath();
      ctx.moveTo(hx + vib, noseY + headR * 0.1);
      ctx.quadraticCurveTo(hx - headR * 0.18 + vib, noseY + headR * 0.1 + smile, hx - headR * 0.26 + vib, noseY + headR * 0.04);
      ctx.moveTo(hx + vib, noseY + headR * 0.1);
      ctx.quadraticCurveTo(hx + headR * 0.18 + vib, noseY + headR * 0.1 + smile, hx + headR * 0.26 + vib, noseY + headR * 0.04);
      stroke(0.85);
      ctx.stroke();

      // whiskers
      stroke(0.4);
      for (const sgn of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const wy = noseY - headR * 0.04 + k * headR * 0.12;
          ctx.beginPath();
          ctx.moveTo(hx + sgn * headR * 0.2 + vib, wy);
          ctx.lineTo(hx + sgn * headR * 0.95 + vib, wy - headR * 0.06 + k * headR * 0.06);
          ctx.stroke();
        }
      }

      // purr rings
      if (S.comfort > 0.45) {
        for (let r = 0; r < 2; r++) {
          const ph = (time * 0.8 + r / 2) % 1;
          ctx.beginPath();
          ctx.arc(hx, hd, headR * (1.1 + ph * 0.9), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${STROKE},${(1 - ph) * 0.22 * S.comfort})`;
          ctx.shadowBlur = 0;
          ctx.lineWidth = lw * 0.7;
          ctx.stroke();
        }
      }

      // hearts
      heartT -= dt;
      if (S.comfort > 0.6 && heartT <= 0) {
        heartT = 0.5;
        hearts.push({ x: hx + (Math.random() - 0.5) * headR, y: hd - headR, life: 1, vx: (Math.random() - 0.5) * headR * 0.4 });
      }
      for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i];
        h.life -= dt / 1.3;
        if (h.life <= 0) {
          hearts.splice(i, 1);
          continue;
        }
        const hy2 = h.y - (1 - h.life) * headR * 1.6;
        const hxx = h.x + h.vx * (1 - h.life);
        const r = headR * 0.16 * (0.6 + h.life * 0.4);
        ctx.fillStyle = `rgba(${STROKE},${h.life * 0.8})`;
        ctx.shadowColor = `rgba(${STROKE},0.6)`;
        ctx.shadowBlur = size * 0.03;
        ctx.beginPath();
        ctx.moveTo(hxx, hy2 + r * 0.3);
        ctx.bezierCurveTo(hxx - r, hy2 - r * 0.6, hxx - r, hy2 - r * 1.3, hxx, hy2 - r * 0.6);
        ctx.bezierCurveTo(hxx + r, hy2 - r * 1.3, hxx + r, hy2 - r * 0.6, hxx, hy2 + r * 0.3);
        ctx.fill();
      }

      // Zzz while sleeping
      if (S.asleep > 0.5) {
        ctx.font = `${headR * 0.5}px var(--font-jetbrains), monospace`;
        ctx.textBaseline = "middle";
        for (let z = 0; z < 3; z++) {
          const ph = (time * 0.4 + z * 0.33) % 1;
          ctx.fillStyle = `rgba(${STROKE},${(1 - ph) * 0.6 * S.asleep})`;
          ctx.shadowColor = `rgba(${STROKE},0.5)`;
          ctx.shadowBlur = size * 0.02;
          ctx.fillText(
            "z",
            hx + headR * 0.6 + ph * headR * 0.8,
            hd - headR * 0.8 - ph * headR * 1.2,
          );
        }
      }

      // paw cursor
      if (P.inside) {
        const pr = headR * 0.32;
        ctx.save();
        ctx.translate(P.x, P.y);
        ctx.beginPath();
        ctx.ellipse(0, pr * 0.25, pr * 0.7, pr * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${FILL},0.7)`;
        ctx.shadowBlur = 0;
        ctx.fill();
        stroke(0.95);
        ctx.stroke();
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.ellipse(k * pr * 0.42, -pr * 0.45, pr * 0.2, pr * 0.26, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${FILL},0.7)`;
          ctx.shadowBlur = 0;
          ctx.fill();
          stroke(0.95);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.shadowBlur = 0;
    };

    let raf = 0;
    const tick = (now: number) => {
      if (running) draw(now);
      raf = requestAnimationFrame(tick);
    };
    if (reduce) draw(performance.now());
    else raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrap} className="relative h-full w-full cursor-none">
      <canvas ref={canvas} className="absolute inset-0" />
    </div>
  );
}
