# Untangle Star Gazer

A mobile-first playable ad prototype for **See the pATTRns** — an educational puzzle game about hATTR amyloidosis. Players drag symptom nodes to untangle a diagnostic web overlaid on a constellation wireframe body.

## Quick Start

```bash
npm install
npm run dev        # Dev server on http://localhost:5173
npm run build      # Production build → dist/
```

## Stack

- **Vite** + **TypeScript** — fast dev, tree-shaking, HMR
- **GSAP** — animation timelines (entrance sequences, win celebrations, node transitions)
- **HTML5 Canvas** — 60fps node/edge rendering with shimmering star effects
- **Montserrat** font via Google Fonts

## Architecture

```
src/
├── index.html      — Phone bezel shell with 4 screens (menu/intro/gameplay/summary)
├── styles.css      — Full visual design, animations, phone frame, gradients
├── main.ts         — Screen flow orchestration, pointer events, timer, GSAP sequences
├── untangle.ts     — Puzzle engine: crossing detection, drag handling, win condition
├── renderer.ts     — Canvas rendering: star nodes with chromatic aberration, edges, starfield
├── config.ts       — JSON-driven puzzle config (swap diseases without code changes)
├── juice.ts        — Game-feel: particles, screen shake, haptics, floating text
├── noise.ts        — Animated film grain noise texture overlay
└── starman.ts      — Procedural constellation body (legacy, replaced by image assets)
```

## Game Flow

**Menu** → hero image with noise texture, PLAY button
→ **Intro** → doctor avatar with speech glow, typewriter text, CONTINUE button
→ **Gameplay** → starman entrance video → crossfade to static → staggered node fade-in → edges draw → timer starts → drag to untangle
→ **Win** → wave celebration video plays fully → summary
→ **Summary** → educational callout + CTA to seethepattrns.com

## Config-Driven

Change the disease, symptoms, colors, and educational content by editing `src/config.ts`:

```typescript
export const DEFAULT_CONFIG: PuzzleConfig = {
  disease: 'hATTR',
  nodes: [
    { id: 'hub', label: 'hATTR', color: '#ff53ff', bodyRegion: 'center' },
    { id: 'sensori', label: 'SENSORIMOTOR', color: '#00bcd4', bodyRegion: 'hands-feet' },
    // ...
  ],
  edges: [['hub','sensori'], ['hub','cardiac'], ...],
  educationalCallout: '...',
};
```

## Brand

- **Pink:** `#ff53ff`
- **Gradient:** `#7c4dff → #ff53ff`
- **Background:** `#060215`
- **Font:** Montserrat 400/700/800/900

## Assets (in `public/`)

| File | Size | Purpose |
|------|------|---------|
| `bg.png` | 1.2 MB | Cosmic nebula background |
| `starman.png` | 1.4 MB | Wireframe body (screen-blended) |
| `starman-enter.mp4` | 7.2 MB | Walk-in entrance animation |
| `starman-wave.mp4` | 11 MB | Win celebration wave |
| `hero.jpg` | 195 KB | Menu screen hero image |
| `dr.png` | — | Doctor avatar for intro |

## Deploy

Connected to Vercel for auto-deploy from `main`. The Vite build outputs to `dist/`.

For ad network export: `npm run build:ad` (requires `vite-plugin-singlefile`).
