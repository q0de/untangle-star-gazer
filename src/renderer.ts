import type { GameNode } from './config';
import { NODE_RADIUS, NODE_DRAG_RADIUS } from './config';
import { drawParticles } from './juice';

// (node orbs drawn procedurally — SVG btn-star-power style)

// ── Helpers ────────────────────────────────────────────────────────

function hex2rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Starfield (extra sparkle layer on top of bg image) ─────────────

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
}

let stars: Star[] = [];

export function initStarfield(w: number, h: number, count: number = 60) {
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: 0.4 + Math.random() * 1.0,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 1.2,
  }));
}

function drawStarfield(ctx: CanvasRenderingContext2D, time: number) {
  for (const s of stars) {
    const alpha = 0.2 + 0.4 * Math.sin(time * 0.001 * s.speed + s.phase);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }
}

// ── Main Render ────────────────────────────────────────────────────

export interface RenderState {
  nodes: GameNode[];
  edges: [number, number][];
  crossingSet: Set<number>;
  dragIdx: number;
  winState: boolean;
  winProgress: number;
  time: number;
  logicalWidth: number;
  logicalHeight: number;
  nodesVisible: boolean;
  nodeOpacities: number[];  // per-node opacity 0–1
  edgesOpacity: number;     // 0–1, edges fade in after all nodes
}

export function render(ctx: CanvasRenderingContext2D, state: RenderState) {
  const w = state.logicalWidth;
  const h = state.logicalHeight;
  ctx.clearRect(0, 0, w, h);

  // Layer 1: Subtle starfield sparkle
  drawStarfield(ctx, state.time);

  if (!state.nodesVisible) {
    drawParticles(ctx);
    return;
  }

  // Layer 2: Edges (fade in after nodes)
  if (state.edgesOpacity > 0) {
    ctx.globalAlpha = state.edgesOpacity;
    drawEdges(ctx, state);
    ctx.globalAlpha = 1;
  }

  // Layer 3: Nodes (each with its own opacity)
  drawNodesStaggered(ctx, state);

  // Layer 4: Particles
  drawParticles(ctx);
}

// ── Edges ──────────────────────────────────────────────────────────

function drawEdges(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { nodes, edges, crossingSet, winState } = state;

  edges.forEach((edge, idx) => {
    const na = nodes[edge[0]];
    const nb = nodes[edge[1]];
    const isCrossing = crossingSet.has(idx);

    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);

    if (winState) {
      ctx.strokeStyle = 'rgba(255,215,64,0.88)';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255,215,64,0.6)';
      ctx.shadowBlur = 12;
    } else if (isCrossing) {
      ctx.strokeStyle = 'rgba(255,80,80,0.75)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(255,80,80,0.4)';
      ctx.shadowBlur = 6;
    } else {
      ctx.strokeStyle = 'rgba(0,188,212,0.55)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0,188,212,0.3)';
      ctx.shadowBlur = 5;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  });
}

// ── Nodes (staggered entrance) ─────────────────────────────────────

function drawNodesStaggered(ctx: CanvasRenderingContext2D, state: RenderState) {
  state.nodes.forEach((node, idx) => {
    const alpha = state.nodeOpacities[idx] ?? 1;
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    drawSingleNode(ctx, state, node, idx);
    ctx.globalAlpha = 1;
  });
}

// ── SVG-style 3-ring orb node (btn-star-power design) ──────────────
// Derives 3 shades from the node color: dark outer, mid ring, bright inner

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function drawSingleNode(ctx: CanvasRenderingContext2D, state: RenderState, node: GameNode, idx: number) {
  const { dragIdx, winState, time } = state;
  const isDragging = idx === dragIdx;
  const breathe = isDragging ? 0 : Math.sin(time * 0.003 + idx * 1.2) * 1.5;
  const r = (isDragging ? NODE_DRAG_RADIUS : NODE_RADIUS) + breathe;

  const baseColor = winState ? '#4caf50' : node.color;
  const outerColor = darken(baseColor, 120); // dark rim
  const midColor = darken(baseColor, 40);    // mid ring
  const innerColor = baseColor;               // bright inner

  // Outer shadow/glow
  ctx.shadowColor = hex2rgba(baseColor, isDragging ? 0.6 : 0.3);
  ctx.shadowBlur = isDragging ? 16 : 8;

  // Ring 1: Dark outer rim
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
  ctx.fillStyle = outerColor;
  ctx.fill();

  ctx.shadowBlur = 0;

  // Ring 2: Mid ring (slightly smaller, offset up 1px like SVG)
  const midR = r * 0.905;
  ctx.beginPath();
  ctx.arc(node.x, node.y - 1, midR, 0, Math.PI * 2);
  ctx.fillStyle = midColor;
  ctx.fill();

  // Ring 3: Bright inner fill with gradient for depth
  const innerR = midR * 0.95;
  const grad = ctx.createRadialGradient(
    node.x, node.y - innerR * 0.3, innerR * 0.1,
    node.x, node.y - 1, innerR,
  );
  grad.addColorStop(0, lighten(baseColor, 40));
  grad.addColorStop(0.7, innerColor);
  grad.addColorStop(1, midColor);
  ctx.beginPath();
  ctx.arc(node.x, node.y - 1, innerR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Highlight spot (top)
  const hlGrad = ctx.createRadialGradient(
    node.x, node.y - innerR * 0.4, 0,
    node.x, node.y - innerR * 0.4, innerR * 0.5,
  );
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
  hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(node.x, node.y - 1, innerR, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = `bold 9px "Montserrat",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 4;

  const lines = node.label.split('\n');
  const lineHeight = 10;
  const startY = node.y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, node.x, startY + i * lineHeight, r * 2 - 6);
  });
  ctx.shadowBlur = 0;
}
