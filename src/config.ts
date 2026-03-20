// ── Types ──────────────────────────────────────────────────────────
export interface NodeDef {
  id: string;
  label: string;
  color: string;
  bodyRegion: string; // mapped position on starman
}

export interface PuzzleConfig {
  disease: string;
  nodes: NodeDef[];
  edges: [string, string][];
  educationalCallout: string;
  timerSeconds: number;
  canvasWidth: number;
  canvasHeight: number;
}

// ── Runtime node (mutable position during gameplay) ────────────────
export interface GameNode {
  idx: number;
  id: string;
  label: string;
  color: string;
  bodyRegion: string;
  x: number;
  y: number;
}

// ── Default hATTR config ───────────────────────────────────────────
export const DEFAULT_CONFIG: PuzzleConfig = {
  disease: 'hATTR',
  timerSeconds: 30,
  canvasWidth: 320,
  canvasHeight: 300,
  nodes: [
    { id: 'hub',     label: 'hATTR',                 color: '#ff53ff', bodyRegion: 'center' },
    { id: 'sensori', label: 'SENSORIMOTOR',           color: '#00bcd4', bodyRegion: 'hands-feet' },
    { id: 'cardiac', label: 'CARDIAC',                color: '#ff9100', bodyRegion: 'chest' },
    { id: 'musculo', label: 'MUSCULO\nSKELETAL',      color: '#b388ff', bodyRegion: 'limbs' },
    { id: 'auto',    label: 'AUTONOMIC\nDYSFUNCTION', color: '#ffd740', bodyRegion: 'gut' },
    { id: 'nephro',  label: 'NEPHROPATHY',            color: '#b2ff59', bodyRegion: 'kidneys' },
  ],
  edges: [
    // Hub spokes
    ['hub', 'sensori'], ['hub', 'cardiac'], ['hub', 'musculo'], ['hub', 'auto'], ['hub', 'nephro'],
    // Rim cycle
    ['sensori', 'cardiac'], ['cardiac', 'musculo'], ['musculo', 'auto'], ['auto', 'nephro'], ['nephro', 'sensori'],
  ],
  educationalCallout:
    'hATTR amyloidosis is a progressive, systemic disease affecting multiple organ systems. Recognizing the pattern of multi-system involvement is key to early diagnosis.',
};

// ── Visual constants ───────────────────────────────────────────────
export const NODE_RADIUS = 24;
export const NODE_HIT_RADIUS = 34;
export const NODE_DRAG_RADIUS = 27;

// ── Solved body-mapped positions (normalized 0–1, scaled to canvas at runtime) ──
// Calibrated to starman_black.png at: left:-75, top:16, 525x783 on 375x812 viewport
export const BODY_POSITIONS: Record<string, { x: number; y: number }> = {
  'center':     { x: 0.48, y: 0.40 },  // torso center (solar plexus)
  'hands-feet': { x: 0.48, y: 0.70 },  // lower legs / knees area
  'chest':      { x: 0.48, y: 0.28 },  // upper chest / heart
  'limbs':      { x: 0.18, y: 0.48 },  // left arm / elbow area
  'gut':        { x: 0.78, y: 0.46 },  // right side abdomen
  'kidneys':    { x: 0.48, y: 0.55 },  // lower abdomen / kidneys
};

// ── Tangled start positions (guaranteed crossings) ─────────────────
export function generateTangledPositions(config: PuzzleConfig): { x: number; y: number }[] {
  const { canvasWidth: w, canvasHeight: h } = config;
  const count = config.nodes.length;

  // Safe play area: inset from HUD top (~100px) and HUD bottom (~100px), sides (~40px)
  const safeTop = h * 0.14;
  const safeBottom = h * 0.86;
  const safeLeft = w * 0.1;
  const safeRight = w * 0.9;

  const safeW = safeRight - safeLeft;
  const safeH = safeBottom - safeTop;
  const cx = safeLeft + safeW / 2;
  const cy = safeTop + safeH / 2;
  const rx = safeW / 2 - NODE_RADIUS;
  const ry = safeH / 2 - NODE_RADIUS;

  // Place nodes in circle, then shuffle to create crossings
  const angles = Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2);
  const shuffled = [...angles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map(angle => ({
    x: Math.round(cx + Math.cos(angle) * rx * (0.5 + Math.random() * 0.5)),
    y: Math.round(cy + Math.sin(angle) * ry * (0.4 + Math.random() * 0.5)),
  }));
}

// ── Resolve edge indices from string IDs ───────────────────────────
export function resolveEdges(config: PuzzleConfig): [number, number][] {
  const idMap = new Map(config.nodes.map((n, i) => [n.id, i]));
  return config.edges.map(([a, b]) => [idMap.get(a)!, idMap.get(b)!]);
}
