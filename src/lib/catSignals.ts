// Tiny one-listener bus so other components can nudge the resident cat without
// prop-drilling. The cat registers a handler; anyone can send it a signal.
export type CatAct = "ball" | "roll" | "treat" | "nap";

export type CatSignal =
  | { type: "glance"; x: number; y: number } // client coords to look toward
  | { type: "perk"; label?: string } // brief alert + optional thought line
  | { type: "act"; name: CatAct }; // commands from the right-click menu

type Handler = (s: CatSignal) => void;
let handler: Handler | null = null;

export function registerCat(h: Handler | null) {
  handler = h;
}

export function sendCat(s: CatSignal) {
  handler?.(s);
}
