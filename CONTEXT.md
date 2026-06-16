# Portfolio v2 — Project Context

> Deep-context handoff doc. Last updated: **2026-06-16**.
> Single source of truth for understanding the project's intent, architecture, and current phase.
> Keep this updated when architecture or phase changes.

---

## 1. What this is

An **award-aspiring (Awwwards-level) personal developer portfolio** for **Yaksh Bambhroliya**, a full-stack / systems engineer. The goal is that a recruiter, founder, or client lands on it and thinks *"who built this?"* — it should read as a **living system**, not a website. Narrative: **Builder > Designer, Engineer > Creator.**

### Theme: "The Architect's Blueprint"
The entire site is framed as **one master engineering schematic that draws itself as you scroll**. Mission-control / drafting-table aesthetic: corner HUD brackets, live telemetry, callsigns, self-assembling architecture diagrams, synthesized console sounds.

### Palette: "Classic Blueprint"
- Ground: ink-navy (`--ink-900 #060a16`)
- Linework: cyan (`--cyan #43c9ff`, bright `#7fe0ff`)
- Active/accent: amber (`--amber #ffb347`, bright `#ffcb6b`)

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 16.2.9** (App Router, TypeScript, `src/` dir) |
| React | **19.2.4** |
| Styling | **Tailwind CSS v4** (`@import "tailwindcss"`, `@theme inline` token mapping in `globals.css`) |
| 3D / WebGL | **@react-three/fiber 9**, **three 0.184**, **@react-three/drei 10**, **@react-three/postprocessing 3** (Bloom) |
| Animation | **GSAP 3 + ScrollTrigger** (draw-on, scrub, count-up, timelines) |
| Smooth scroll | **Lenis 1.3** (RAF driven via `gsap.ticker`) |
| Misc deps | framer-motion, leva (installed, not central) |
| Fonts | **Space Grotesk** (display, `--font-space`) · **JetBrains Mono** (mono, `--font-jetbrains`) — via `next/font/google` |
| Audio | **Web Audio API**, fully synthesized — no asset files (`src/lib/sound.ts`) |

### Commands
```bash
npm run dev      # next dev (port 3000) — usually already running in a separate terminal
npm run build    # next build
npm run lint     # eslint
npx tsc --noEmit -p tsconfig.json   # typecheck (used to verify changes without restarting dev)
```
Package name is `yaksh-portfolio` (the folder `Portfoliov2` has a capital, so `create-next-app` needed a temp-dir workaround originally).

---

## 3. High-level architecture & render flow

`src/app/page.tsx` is a client component that orchestrates everything:

```
<SmoothScroll>                       # Lenis provider (RAF + ScrollTrigger.update)
  <div fixed -z-10 blueprint-grid /> # FIXED console backdrop (grid) — content scrolls over it
  <div fixed -z-10 radial vignette />
  <BootSequence onDone={setBooted}/> # full-screen boot intro, fades out, then unlocks hero anim
  <HudFrame />                        # FIXED z-40 overlay: corners, clock, FPS, telemetry, sound toggle
  <Nav />                            # FIXED z-50 center-top pill nav w/ scroll-spy
  <main>
    <Hero started={booted} />        #  — (hero, no index)  → globe + StackStory entry point
    <Approach />                     # 01 / id="principles"
    <Projects />                     # 02 / id="systems"
    <OpenSource />                   # 03 / id="signals"
    <About />                        # 04 / id="architect"
    <Contact />                      # 05 / id="comms"
  </main>
</SmoothScroll>
```

**Key structural decision:** the blueprint grid + 4 corner HUD frame are **fixed to the viewport** (a static "console frame") while only the content scrolls underneath. The grid lives as a `fixed -z-10` div in `page.tsx`; corners live in the `fixed z-40` `HudFrame`.

### Section index / Nav mapping
Nav items (`Nav.tsx`) ↔ section ids: `principles → systems → signals → architect → comms`. Scroll-spy via `IntersectionObserver` (rootMargin `-45% 0px -50% 0px`). Hidden below `md`.

---

## 4. Content data layer — `src/data/portfolio.ts`

**Single source of truth for all copy.** Edit content here, not in components. Exports:

- `identity` — name, callsign (`YAKSH-CORE`), `role` ("Independent Systems Architect"), `roleFramings[]` (hero typewriter cycle), location, email, phone, **`tagline`** ("I architect and ship production systems end-to-end."), `summary`, `links` (github `yakshcore`, linkedin, **`site` still points to old `yakshdevani.framer.website`** — see Known Issues).
- `projects[]` — 3 production systems. Each carries a `diagram: { nodes, edges }` node-graph that powers the self-drawing architecture figure:
  - **SYS-01 Pravasa Transworld** (Obscur Labs, 2026) — visa CRM, OTP auth, status pipeline, Cloudinary docs.
  - **SYS-02 AI Meal-Planning Platform** (Techsture, 2025) — Gemini+Claude rec engine, SSR/ISR, AWS/Docker.
  - **SYS-03 Gamers Era** (university, 2025) — social gaming, WebSocket E2E chat, Firebase, GCP.
  - Types: `DiagramNode { id, label, sub?, x, y (0–100 %), kind }`, `kind ∈ client|edge|service|data|external|ai`; `DiagramEdge { from, to, label? }`.
- `experience[]` — 3 roles (Obscur Labs, Techsture, Swiftrut).
- `skillGroups[]` — Languages, Frontend, Backend & APIs, Cloud & DevOps, AI & Automation, Data & Caching, Integrations, **Blockchain** (newest group).
- `achievements[]` — Prompt Wars 1st runner-up, GDG Solution Challenge, Neo4j Certified.
- `systemStats[]` — hero stat strip (2+ yrs, 6+ systems, 500+ concurrent, 70+ stars).
- `github` + `repos[]` — OpenSource section social proof (totalStars 73, 6 featured repos incl. Gamers-Era 33★, Solar-System-Explorer 23★).
- **`stackStory`** — drives the Stack Story feature (see §6). `{ title, line, layers: StackLayer[] }`. Types `StackLayer { code, role, title, narrative, items[], accent: "cyan"|"amber", status?: "LIVE"|"EXPLORING" }`.

---

## 5. The "alive" layer (Awwwards push)

What makes it feel like a living system rather than a static page:

1. **Boot sequence** (`BootSequence.tsx`) — typed console log on load, fades out, then unlocks the hero intro animation (gated by `started`/`booted` prop).
2. **Hero network globe** (`three/WireframeScene.tsx`) — 54 nodes on a sphere surface, traveling signal packets (additive blending), pulsing nodes, equatorial halo. **Drag-interactive**: grab-to-stop, swipe-to-fling with momentum, reverse-swipe reverses, eases back to idle spin. `FitCamera` recomputes camera distance each frame from aspect ratio so it never clips. **Tap/double-tap opens the Stack Story** (tap-vs-drag detection).
3. **Self-assembling diagrams** (`BlueprintDiagram.tsx`) — per project, status goes `OFFLINE → BOOTING → ONLINE` on scroll; scan line → nodes pop in → edges draw (SVG `pathLength` + dashoffset) → labels → flowing data packets. **Interactive**: wheel-zoom toward cursor + drag-pan (1×–4×), clamped, with a *pinned* grid background (transform applies only to inner viewport). Wheel hijacked via non-passive listener so it doesn't fight Lenis.
4. **Mission-control sound** (`lib/sound.ts` + `SoundToggle.tsx`) — fully synthesized (blip/hover/boot/online/sweep/toggle). **Off by default**, localStorage-persisted (`yb-sound`), lazily inits on first user gesture (autoplay policy). `sound.subscribe()` returns an unsubscribe fn.
5. **Live telemetry HUD** (`HudFrame.tsx`) — live clock (1 s tick, labeled IST but uses local time), real FPS meter (rAF), fluctuating SIG bars + SYS LOAD %, scroll-depth DEPTH gauge, callsign readout. Hidden below `md`.
6. **Hero typewriter** (`Typewriter.tsx`) — cycles `identity.roleFramings`.
7. **Count-up** — OpenSource total-stars animates 0→73 on scroll.

All of the above respect `prefers-reduced-motion` (Lenis, BootSequence, BlueprintDiagram, Typewriter all short-circuit).

---

## 6. CURRENT FOCUS — the Stack Story (globe → fullscreen scrollytelling)

This is the feature actively being built/polished. It converts the hero globe from ambient decoration into the site's **primary storytelling element**.

### Concept
**Tap (or double-tap) the hero globe → a fullscreen overlay expands → a scroll-story descends the tech stack, one layer at a time.** Each layer lights up its own constellation of nodes on a dedicated globe. The arc runs **foundation → frontier**, climaxing at a **Blockchain** layer the user is moving into.

### Pieces
- **`src/data/portfolio.ts → stackStory`** — 7 ordered layers:
  `L1 Language Core → L2 Interface → L3 Services → L4 Persistence → L5 Infrastructure → L6 Intelligence (AI) → L7 The Decentralized Edge (Blockchain)`.
  L6 and L7 use `accent: "amber"`; L7 has `status: "EXPLORING"`.
- **`src/components/three/StackGlobe.tsx`** — the story's 3D globe. Nodes are stacked in **latitude bands** (bottom = foundation, top = frontier). Each tech item = one node (`built.nodeLayer[]` / `built.nodeItem[]` map flat index → layer/item). Behaviors:
  - **Cumulative highlight**: all layers `i <= active` stay lit (the stack *builds up* as you descend); current layer brightest, visited ~55%, future dim.
  - **Lit rings draw over the sphere** (`depthTest` off + renderOrder) so the highlighted loop is always a *complete* circle.
  - **`BASE_TILT (~28°)`** so no band is ever edge-on (this fixed L4, which sits on the equator, from rendering as a flat/incomplete line).
  - **Drag-to-rotate 360°**: reads a shared `controlsRef` (`GlobeControls` type) — free horizontal spin with fling momentum, clamped vertical tilt (`X_CLAMP`), eases back to re-frame the active band when idle. `IDLE_SPIN`, `DRAG_SENS` constants.
  - **Hover-to-locate**: reads `hoverRef` (`HoverNode = {layer,item}|null`); the hovered node pops bright-white with a pulsing **halo mesh** (`depthTest` off → visible even through the back of the globe).
  - `FitCamera` keeps it framed at any aspect ratio.
- **`src/components/StackStory.tsx`** — the fullscreen overlay (`z-[60]`). Renders `StackGlobe` (right 58% on desktop, full-bleed faint backdrop on mobile). Mechanics:
  - **Scroll-snap chapters** in a `data-lenis-prevent` container (so the overlay's own scroll doesn't fight Lenis); `onScroll` computes active chapter → drives globe via `activeRef` + plays `blip`.
  - **Drag-rotate input lives on the scroller** with `touch-action: pan-y`: vertical touch scrolls chapters, horizontal touch rotates the globe; mouse drag rotates, wheel scrolls. Detection in `onGlobeDown/Move/Up` (decides rotate-vs-scroll by axis dominance / pointerType, feeds `controlsRef`).
  - **Tag chips** set/clear `hoverRef` on mouse enter/leave → highlights the matching globe node. Hint line: `▸ HOVER A TAG TO LOCATE IT · DRAG THE GLOBE TO ROTATE`.
  - Keyboard: ↑/↓/PageUp/PageDown navigate, Esc closes. Body scroll locked while open. Right-edge progress rail (visited dots filled, current glowing). Intro scale/opacity transition on mount.
- **Trigger wiring**: `WireframeScene` accepts `onOpen`; tap-vs-drag logic distinguishes a clean tap/double-click (opens story) from a swipe (spins globe). `Hero.tsx` holds `storyOpen` state, renders `<StackStory>` (dynamic import, `ssr:false`), and shows the pulsing **"TAP TO OPEN THE STACK"** affordance over the globe.

### Recent copy change
Hero sub-line: removed "solo" everywhere; tagline → "…production systems **end-to-end**."; sub-line now reads "Two years architecting MERN and cloud-native systems **with deep AI/LLM integration** — from visa CRMs to AI food-tech."

---

## 7. File map (quick reference)

```
src/
  app/
    layout.tsx        # fonts, metadata (title/desc from identity), html/body
    page.tsx          # orchestrator: fixed backdrop + boot + hud + nav + sections
    globals.css       # design system: tokens, @theme, .blueprint-grid, .tech-label,
                      #   glows, draw-path, flow/nodepulse keyframes, reduced-motion
  data/
    portfolio.ts      # ALL content + types (identity, projects, stackStory, etc.)
  lib/
    sound.ts          # SoundEngine singleton (Web Audio), `sound` export
  components/
    SmoothScroll.tsx  # Lenis setup
    BootSequence.tsx  # typed boot intro
    HudFrame.tsx      # fixed telemetry overlay + corners + SoundToggle
    Nav.tsx           # scroll-spy pill nav
    SectionHeader.tsx # numbered section header w/ draw-on rule
    Typewriter.tsx    # cycling typewriter
    SoundToggle.tsx   # audio on/off w/ equalizer bars
    BlueprintDiagram.tsx  # interactive self-drawing architecture figure (Projects)
    StackStory.tsx    # ★ fullscreen stack scrollytelling overlay (current focus)
    three/
      WireframeScene.tsx  # hero globe (drag-spin, signals) + Stack Story trigger
      StackGlobe.tsx      # ★ stack-story 3D globe (bands, cumulative, hover, rotate)
    sections/
      Hero.tsx        # name + typewriter + stat strip + globe + StackStory mount
      Approach.tsx    # 01 operating principles (hardcoded P-01..P-04 in file)
      Projects.tsx    # 02 deployed systems (ProjectBlock + BlueprintDiagram)
      OpenSource.tsx  # 03 GitHub social proof + star count-up
      About.tsx       # 04 spec sheet + experience timeline + skills + achievements
      Contact.tsx     # 05 comms + channel list + footer
```

> Note: `Approach.tsx` principles (`P-01..P-04`) are **hardcoded in the component**, not in `portfolio.ts` — the one content exception.

---

## 8. Design system cheatsheet (`globals.css`)

- Tokens as CSS vars in `:root`, re-exported to Tailwind via `@theme inline` → use classes like `text-cyan`, `bg-ink-900`, `border-line-faint`, `text-paper-dim`, `text-amber-bright`.
- `.blueprint-grid` — layered drafting grid (24px + 120px lines).
- `.grid-vignette` — radial fade overlay.
- `.tech-label` — uppercase mono, wide tracking — the recurring "instrument label" style.
- `.glow-cyan` / `.glow-amber` — text glow.
- `.draw-path` — stroke draw-on helper.
- `@keyframes flow` / `nodepulse` — only animate when a `.diagram` has `.online`.
- Reduced-motion media query neutralizes animations.

**Conventions when adding UI:** match the mono/uppercase `tech-label` instrument style, cyan for normal/live, amber for active/accent/frontier, hairline `border-line-faint` dividers on `bg-line-faint` grids (1px gap technique), `glow-*` sparingly.

---

## 9. Current phase & status

- **Phase:** core site complete and stable; actively **polishing the Stack Story** (globe-driven scrollytelling) as the signature interaction. Most recent work: fixed L4 ring completeness + base tilt, cumulative layer highlighting, drag-to-rotate 360°, hover-tag-to-highlight-node, hero copy edit.
- **Build health:** `npx tsc --noEmit` passes clean. The only console noise is a harmless browser-extension hydration warning (`cz-shortcut-listen`).
- **Verification note:** the FPS meter reads low (~1–5) only when Chrome throttles an unfocused/automation tab; a real focused tab runs 60–144. GSAP rAF intros can appear stuck near opacity 0 under automation throttling — click to focus the tab to confirm.

---

## 10. Known issues / tech debt

- **Stale identity in metadata/links:** `layout.tsx` `metadataBase` and `identity.links.site` still point to **`yakshdevani.framer.website`** (the old "Yaksh Devani" Framer site). New brand is **Yaksh Bambhroliya** — update before deploy. Also `layout.tsx` title says "Systems Architect" while `identity.role` is "Independent Systems Architect".
- **Old portfolios reviewed, not imported:** `yakshdevani.vercel.app` (oldest) and `yakshdevani.framer.website` are older "Devani"-branded sites with weaker/demo projects (Voranty, DashStack) and a casual voice that clashes with the blueprint tone. Decision: **do not pull content from them.**
- **No deploy config / OG image yet.** No custom crosshair cursor, no boot→hero morph, no mobile-choreography pass (all previously discussed, not started).
- **HudFrame clock** is labeled `IST` but renders the browser's local time.

---

## 11. Roadmap / parked ideas (not started — confirm before building)

- Boot-sequence → hero morph transition.
- Custom crosshair cursor; page/section transitions.
- Mobile choreography pass for the Stack Story (hover-to-locate is desktop-only by nature).
- Optional: hovered Stack node auto-spins to the front.
- Solar-System-Explorer live embed in OpenSource.
- OG image + Vercel deploy + identity/link cleanup.
- Optionally surface the Blockchain "exploring" status in the About/skills section too (currently only in the Stack Story).

---

## 12. Working agreements (with the project owner)

- Owner is **Yaksh Bambhroliya** (`github.com/yakshcore`). Wants memorable, "alive", engineer-forward design.
- **Dev server is usually already running** in a separate terminal — don't start `npm run dev`; use `tsc --noEmit` to verify.
- When asked, **don't open/inspect the site in Chrome** — report what changed and let the owner verify.
- **GitHub/data:** only public data was fetched via web; any GitHub MCP/PAT setup must be done by the owner in their own terminal — never paste tokens into chat.
