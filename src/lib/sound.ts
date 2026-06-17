// ============================================================
// MISSION-CONTROL SOUND ENGINE
// Fully synthesized via Web Audio API - no asset files.
// Subtle, tasteful, off by default. Respects autoplay policy.
// ============================================================

type SoundName = "blip" | "hover" | "boot" | "online" | "sweep" | "toggle";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _enabled = false;
  private ready = false;
  private listeners = new Set<(on: boolean) => void>();

  get enabled() {
    return this._enabled;
  }

  init() {
    if (this.ready || typeof window === "undefined") return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0;
    this.master.connect(this.ctx.destination);
    this.ready = true;

    // restore persisted preference
    try {
      if (localStorage.getItem("yb-sound") === "on") this.setEnabled(true);
    } catch {}
  }

  subscribe(fn: (on: boolean) => void): () => void {
    this.listeners.add(fn);
    fn(this._enabled);
    return () => {
      this.listeners.delete(fn);
    };
  }

  setEnabled(on: boolean) {
    if (!this.ready) this.init();
    this._enabled = on;
    if (this.ctx?.state === "suspended") this.ctx.resume();
    if (this.master)
      this.master.gain.setTargetAtTime(
        on ? 0.5 : 0.0,
        this.ctx!.currentTime,
        0.05,
      );
    try {
      localStorage.setItem("yb-sound", on ? "on" : "off");
    } catch {}
    this.listeners.forEach((fn) => fn(on));
    if (on) this.play("toggle");
  }

  toggle() {
    this.setEnabled(!this._enabled);
  }

  private env(
    osc: OscillatorNode,
    gain: GainNode,
    t: number,
    dur: number,
    peak: number,
  ) {
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  play(name: SoundName) {
    if (!this.ready || !this._enabled || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const tone = (
      freq: number,
      dur: number,
      type: OscillatorType,
      peak: number,
      detune = 0,
      delay = 0,
    ) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(g);
      g.connect(this.master!);
      this.env(osc, g, t + delay, dur, peak);
    };

    switch (name) {
      case "hover":
        tone(2100, 0.05, "sine", 0.06);
        break;
      case "blip":
        tone(1320, 0.06, "triangle", 0.12);
        break;
      case "toggle":
        tone(880, 0.07, "square", 0.07);
        tone(1320, 0.09, "square", 0.05, 0, 0.06);
        break;
      case "boot":
        tone(660, 0.05, "sine", 0.08);
        break;
      case "online":
        // confident two-tone confirmation
        tone(587, 0.12, "sine", 0.13);
        tone(880, 0.18, "sine", 0.11, 0, 0.1);
        break;
      case "sweep": {
        // low filtered sweep for section entry
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 600;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(330, t + 0.4);
        osc.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.52);
        break;
      }
    }
  }
}

export const sound = new SoundEngine();

// lazily init audio on the first user gesture anywhere
if (typeof window !== "undefined") {
  const kick = () => {
    sound.init();
    window.removeEventListener("pointerdown", kick);
    window.removeEventListener("keydown", kick);
  };
  window.addEventListener("pointerdown", kick, { once: true });
  window.addEventListener("keydown", kick, { once: true });
}
