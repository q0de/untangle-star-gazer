# PRD: Untangle Star Gazer — Playable Ad Prototype

## Overview

A playable ad prototype built around the "Untangle" puzzle mechanic from the *See the pATTRns* suite. Players drag symptom nodes to untangle a tangled diagnostic web, revealing the connection between hATTR amyloidosis and its multi-system symptoms. Built with Vite + GSAP for development, deployable to Vercel/GitHub Pages, with a single-file HTML export for ad network delivery.

**Theme:** Cosmic / constellation-body — symptom nodes are mapped onto a procedurally rendered "star man" wireframe figure, connected by glowing constellation lines against a deep-space background.

---

## Goals

1. **Engagement:** Make the untangle mechanic feel satisfying with full game-juice (particles, screen shake, haptics, floating text). No audio.
2. **Education:** Each node represents a real hATTR symptom category. Solving the puzzle visually "maps" symptoms to the body.
3. **Configurability:** Node labels, colors, edges, and educational content are driven by a single JSON config object — swap diseases/symptoms without touching game code.
4. **Deliverability:** < 2 MB total (uncompressed), 60 fps on mid-range mobile. Exportable as single HTML file for ad networks.
5. **Scalability:** Architecture supports adding more game modes, content configs, or becoming a full web app later.

---

## Target Platform

- **Primary format:** Vite + HTML5 + GSAP web app, hosted on Vercel / GitHub Pages
- **Export format:** Single self-contained HTML file (inline CSS + JS) for ad network delivery
- **Viewport:** Mobile-first, 375×812 reference (renders in phone bezel frame for desktop preview)
- **Browser support:** Chrome, Safari, Firefox (latest 2 versions), iOS Safari 15+, Android Chrome
- **Performance budget:** < 2 MB uncompressed, < 150 KB gzipped, 60 fps on iPhone 12 / Pixel 6 equivalent

---

## Game Mechanics

### Core Loop

1. **Intro screen** — Branding + typewriter prompt from doctor avatar: *"This patient has symptoms across multiple systems. Untangle the web to see the pattern."*
2. **Gameplay screen** — A tangled graph of 6 nodes (5 symptom categories + hATTR hub) connected by edges. Player drags nodes until zero edge crossings remain.
3. **Win state** — When crossings hit 0, nodes snap to their "solved" positions on the star-man body, constellation lines glow gold, particle explosions fire, educational callout appears.
4. **Summary screen** — Score, educational message, CTA button to seethepattrns.com.

### Node Configuration (JSON-driven)

```json
{
  "disease": "hATTR",
  "nodes": [
    { "id": "hub",    "label": "hATTR",                  "color": "#e91e8c", "bodyRegion": "center" },
    { "id": "sensori","label": "SENSORIMOTOR",            "color": "#00bcd4", "bodyRegion": "hands-feet" },
    { "id": "cardiac","label": "CARDIAC",                 "color": "#ff9100", "bodyRegion": "chest" },
    { "id": "musculo","label": "MUSCULOSKELETAL",         "color": "#b388ff", "bodyRegion": "limbs" },
    { "id": "auto",   "label": "AUTONOMIC\nDYSFUNCTION", "color": "#ffd740", "bodyRegion": "gut" },
    { "id": "nephro", "label": "NEPHROPATHY",             "color": "#b2ff59", "bodyRegion": "kidneys" }
  ],
  "edges": [
    ["hub","sensori"], ["hub","cardiac"], ["hub","musculo"], ["hub","auto"], ["hub","nephro"],
    ["sensori","cardiac"], ["cardiac","musculo"], ["musculo","auto"], ["auto","nephro"], ["nephro","sensori"]
  ],
  "educationalCallout": "hATTR amyloidosis is a progressive, systemic disease affecting multiple organ systems. Recognizing the pattern of multi-system involvement is key to early diagnosis."
}
```

The hub node connects to all symptom nodes (star/wheel topology). Rim nodes also form a cycle, guaranteeing a solvable but initially tangled graph.

### Interaction

| Action | Response |
|--------|----------|
| Tap + drag node | Node follows finger/cursor, edges redraw in real time |
| Crossing count decreases | Floating text "+1", subtle screen shake, haptic pulse, particle sparkle at resolved intersection |
| Crossing count hits 0 | Win sequence: nodes animate to body positions, gold glow, triple particle burst, checkmark overlay, haptic celebration pattern |
| Timer expires (30s) | Game ends with current state, summary shows partial progress |
| Reshuffle button | Re-randomize node positions (new tangle), reset timer |

---

## Visual Design

### Star Man (Procedural Constellation Body)

Rather than loading a raster image, the body figure is **rendered procedurally** using canvas paths:

- Thin glowing lines forming a wireframe human silhouette (head, torso, arms, legs)
- Dots at joint intersections that pulse subtly
- Rendered at low opacity (0.15–0.25) as a background layer beneath the game graph
- On win, the body "lights up" — opacity increases to 0.6, nodes settle onto their mapped body regions, and constellation lines trace the body's shape

**Background:** CSS radial gradients simulating a deep-space nebula (dark navy → purple → black), with a canvas starfield layer of slowly twinkling dots.

### Node Design

- **Idle:** Filled circle (24px radius) with node color at 82% opacity, white stroke, radial glow halo
- **Dragging:** Slightly larger (27px), full opacity, thick white stroke, brighter glow
- **Solved:** Green fill, gold constellation lines, pulse animation
- **Label:** Bold 8–9px Montserrat, centered inside node, dark fill for readability

### Edge Design

- **Clean edge** (no crossing): Cyan glow (`rgba(0,188,212,0.62)`), 2px
- **Crossing edge:** Red glow (`rgba(255,80,80,0.82)`), 2.5px, subtle pulse
- **Solved edge:** Gold glow (`rgba(255,215,64,0.88)`), 2.5px, bloom effect

### Typography

- **Font:** Montserrat (400, 600, 700, 800, 900 weights), loaded from Google Fonts with fallback to system sans-serif
- **Brand treatment:** "SEE THE **P**ATTR**NS**" — "P" in pink (#e91e8c), "ATTR" in accent, "NS" in white
- **Crossings counter:** Large pill badge below canvas

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#0a0618` | Page background |
| `--pink` | `#e91e8c` | Brand accent, hATTR node |
| `--cyan` | `#00bcd4` | Clean edges, sensorimotor |
| `--orange` | `#ff9100` | Cardiac node |
| `--purple` | `#b388ff` | Musculoskeletal node |
| `--gold` | `#ffd740` | Autonomic node, win state |
| `--lime` | `#b2ff59` | Nephropathy node |
| `--red-cross` | `#ff5050` | Crossing edges |
| `--gold-win` | `#ffd740` | Solved edges |

---

## Game Juice Integration

Effects ported from the `game-juice` library, inlined into the single file:

### Screen Effects
- **Screen shake** — On each crossing reduction: trauma-based shake (intensity scales with how many crossings were just resolved). Container translates + rotates via CSS transform.
- **Flash** — Brief white/gold flash overlay on win (200ms fade).
- **Chromatic pulse** — Subtle RGB split on win sequence (CSS filter).

### Particles
- **Intersection sparkle** — When an edge goes from crossing → clean, emit 6–10 small cyan/white particles at the former intersection point.
- **Node drag trail** — While dragging, emit faint trailing particles in the node's color.
- **Win burst** — Three staggered particle explosions (gold + white) on solve. Stars, circles, and diamond shapes.

### Hit Stop
- **Micro-freeze** — 40ms pause when a crossing resolves (all animation freezes briefly, then resumes). Gives a "snap" feel.
- **Win slow-mo** — 300ms slow-motion on final crossing resolve before the celebration fires.

### Audio

**No audio.** The prototype is silent by design — keeps file size down, avoids autoplay policy issues, and simplifies the ad network delivery. If audio is needed later, the game-juice `AudioEngine` can be wired in without architectural changes.

### Haptics (Vibration API)
- **Drag start:** Single 10ms pulse
- **Crossing resolved:** 15ms pulse
- **Win:** Pattern `[30, 50, 30, 50, 80]`
- Falls back silently on unsupported devices.

### Floating Text
- **Crossing resolved:** "+1" floats up from the resolved area, fades out over 600ms
- **Win:** "UNTANGLED!" slams in from scale 0→1 with bounce easing

### Progress Bar
- **Timer bar** at top: 30s countdown, gradient fill (green → yellow → red as time decreases), smooth CSS transition.
- **Crossings counter** below canvas: pill badge showing current count, pulses and turns green on zero.

---

## Screen Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  MENU       │────▶│  INTRO      │────▶│  GAMEPLAY   │────▶│  SUMMARY    │
│  (tap to    │     │  (typewriter │     │  (untangle  │     │  (score +   │
│   start)    │     │   + avatar)  │     │   puzzle)   │     │   CTA)      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │                     │
                                              ▼                     ▼
                                        [Reshuffle]          [Play Again]
                                                             [See the pATTRns →]
```

### Screen Details

**Menu Screen**
- Brand logo centered
- Single "Untangle" button (since this is a standalone prototype of just that game mode)
- Starfield background animating

**Intro Screen**
- Doctor avatar (inline SVG, same as existing prototype)
- 3-line typewriter text introducing the puzzle context
- Auto-advances to gameplay after typewriter completes (~3s)

**Gameplay Screen**
- Header: brand logo
- Timer bar + seconds counter
- Canvas: tangled graph with star-man background layer
- Crossings counter pill
- Reshuffle button

**Summary Screen**
- Headline: "Web Untangled" / "Almost There" (based on solve vs timeout)
- Mini solved-graph SVG recap
- Stat: "X → 0 crossings" or "X → Y crossings"
- Educational callout (glassmorphism card) with hATTR info from config
- CTA button: "See the pATTRns →" (links to seethepattrns.com)
- Replay button

---

## Technical Architecture

### File Structure (Development)

```
untangle-star-gazer/
├── src/
│   ├── index.html          # Shell with phone bezel
│   ├── styles.css           # All styles (extracted from playable ad + new juice effects)
│   ├── main.ts              # Entry point, screen flow orchestration
│   ├── untangle.ts          # Core untangle puzzle logic (drag, crossings, win detection)
│   ├── juice.ts             # Game-juice effects (particles, shake, haptics, popups) — ported from game-juice lib
│   ├── starman.ts           # Procedural constellation body renderer
│   ├── renderer.ts          # Canvas drawing (nodes, edges, particles, starman)
│   └── config.ts            # JSON node/edge/content configuration + types
├── public/
│   └── (static assets if needed — goal is zero)
├── dist/                    # Vite build output — deployable to Vercel
│   └── index.html           # Production build (Vite-bundled, tree-shaken)
├── scripts/
│   └── inline-build.ts      # Post-build script: inlines all assets into single HTML for ad export
├── assets/                  # Reference assets (not shipped in final build)
│   ├── EXAMPLE.png
│   ├── img_background.png
│   ├── img_starman.png
│   └── anim_starman-move.mp4
├── game-juice/              # Reference library (effects ported into src/juice.ts, not bundled directly)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vercel.json              # Deploy config (if needed)
└── PRD.md
```

### Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Bundler | **Vite** | Fast dev server, tree-shaking, single-file output via `vite-plugin-singlefile` |
| Language | **TypeScript** | Type safety for config objects, better DX, game-juice lib is already TS |
| Animation | **GSAP** | Industry-standard tweening, timeline sequencing for win animations, small footprint |
| Canvas | **HTML5 Canvas 2D** | All rendering (graph, starman, particles) on one canvas — no DOM overhead |
| Hosting | **Vercel / GitHub Pages** | Zero-config deploy from `dist/`, preview URLs for stakeholder review |
| Ad export | **vite-plugin-singlefile** + custom script | Inlines all CSS/JS/fonts into one HTML file < 2 MB |

### Build Pipeline

- **`npm run dev`** — Vite dev server with HMR, separate TS modules
- **`npm run build`** — Vite production build → `dist/` (deployable to Vercel)
- **`npm run build:ad`** — Production build + inline script → `dist/playable-ad.html` (single file for ad networks)
- **Font strategy:** Montserrat subset (400, 700, 800) base64-inlined in CSS for the ad build; CDN for web build
- **GSAP:** Imported as ES module, tree-shaken to only include used features

### Deployment

- **Vercel:** Auto-deploy from `main` branch, preview deploys on PRs
- **Ad export:** `npm run build:ad` produces a single HTML file that can be uploaded to any ad network
- **GitHub Pages:** Alternative static hosting if Vercel isn't preferred

### Performance Targets

| Metric | Target |
|--------|--------|
| File size (uncompressed) | < 2 MB |
| File size (gzipped) | < 150 KB |
| First paint | < 500ms |
| Frame rate during drag | 60 fps |
| Canvas redraw | < 4ms per frame |
| Particle count (max concurrent) | 50 |
| Total DOM nodes | < 100 |

### Canvas Strategy

- **Single canvas** for the untangle graph + star-man body + particles
- requestAnimationFrame loop during gameplay only (paused on menu/summary)
- Particle pool (pre-allocated array, recycle dead particles) — no GC pressure
- Edge crossing detection: O(E^2) per frame during drag — acceptable for 10 edges (45 pair checks)
- GSAP used for screen transitions, node snap animations, and win sequence timeline — not for per-frame canvas drawing

---

## Acceptance Criteria

### Must Have (P0)

- [ ] Untangle puzzle renders with 6 configurable nodes (5 symptoms + hATTR hub) and 10 edges
- [ ] Drag-to-move nodes with pointer events (touch + mouse)
- [ ] Real-time crossing count updates during drag
- [ ] Crossing edges render red, clean edges render cyan
- [ ] Win detection when crossings = 0
- [ ] Win animation: gold edges, green nodes, particle bursts
- [ ] 30-second countdown timer with visual bar
- [ ] Reshuffle button resets node positions
- [ ] 4-screen flow: Menu → Intro → Gameplay → Summary
- [ ] Summary shows solve state + educational callout
- [ ] CTA button links to seethepattrns.com
- [ ] Builds to single HTML file
- [ ] Runs at 60fps on iPhone 12 Safari

### Should Have (P1)

- [ ] Procedural star-man constellation body behind the graph
- [ ] On win, nodes animate to body-mapped positions
- [ ] Screen shake on crossing reduction
- [ ] Particle sparkle at resolved intersections
- [ ] Floating "+1" text on crossing reduction
- [ ] Hit-stop micro-freeze on crossing resolution
- [ ] Haptic feedback on drag and resolve
- [ ] Node drag trail particles
- [ ] Chromatic aberration pulse on win

### Nice to Have (P2)

- [ ] Starfield background animation (twinkling dots)
- [ ] Node pulse/breathing animation while idle
- [ ] "UNTANGLED!" slam text on win
- [ ] Slow-motion effect on final crossing resolve
- [ ] Timer warning pulse at 5s remaining
- [ ] Star-man body "lights up" progressively as crossings reduce
- [ ] Animated starman (reference: anim_starman-move.mp4) plays on win as a reward

---

## Scaling Path

This prototype is architected to grow:

| Phase | Scope | Effort |
|-------|-------|--------|
| **v1 (now)** | Single untangle game, JSON config, playable ad export | This PRD |
| **v2** | Add more game modes from the existing prototype (Simon, Shuffle, Unscramble) as separate routes/screens | Config-driven, same architecture |
| **v3** | Multi-disease support — different JSON configs for different conditions | Swap config file, everything else works |
| **v4** | Full web app with menu, progression, analytics dashboard | Vite + router, Vercel hosting already in place |

The JSON config, TypeScript modules, and Vite build system are chosen specifically to support this trajectory without rewrites.

---

## Open Questions

1. **Ad network constraints?** — Some networks (MRAID, Facebook Playable) have specific size limits (2MB–5MB) and API requirements. Which network(s) are we targeting first?
2. **Analytics/tracking?** — Should we fire events (game_start, crossing_resolved, game_complete, cta_click) to an analytics endpoint, or is this purely a visual prototype for now?
3. **Accessibility?** — Any requirements for screen reader support or reduced-motion preferences for this ad format?
4. **CTA destination URL?** — Confirmed as `seethepattrns.com` or a specific landing page / deep link?

---

## References

- Existing prototype: `PlayableAd_SeeThePattrns/` (multi-game playable ad with untangle mode)
- Game juice library: `game-juice/` (TypeScript effects toolkit)
- Visual assets: `ASSETS/` (star-man figure, space background, animation)
- Medical content: seethepattrns.com/hattr-symptoms (5 symptom categories for hATTR amyloidosis)
