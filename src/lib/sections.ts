// single source of truth for the section "stations" - used by the depth-bar
// navigation and the proximity scroll-snap.
export const NAV_SECTIONS = [
  { id: "operations", label: "OPS" },
  { id: "principles", label: "PRINCIPLES" },
  { id: "systems", label: "SYSTEMS" },
  { id: "signals", label: "SIGNALS" },
  { id: "architect", label: "ARCHITECT" },
  { id: "comms", label: "COMMS" },
] as const;
