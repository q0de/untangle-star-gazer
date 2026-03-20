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

// ── Shimmering star node with chromatic aberration ──────────────────
// Each node: outer color halo with CA fringe → soft glow → bright white-hot core

function parseHex(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function drawSingleNode(ctx: CanvasRenderingContext2D, state: RenderState, node: GameNode, idx: number) {
  const { dragIdx, winState, time } = state;
  const isDragging = idx === dragIdx;

  // Shimmer: each node twinkles at its own phase
  const shimmer = 0.85 + 0.15 * Math.sin(time * 0.004 + idx * 2.1);
  const breathe = isDragging ? 0 : Math.sin(time * 0.003 + idx * 1.2) * 1.5;
  const r = (isDragging ? NODE_DRAG_RADIUS : NODE_RADIUS) + breathe;

  const baseColor = winState ? '#4caf50' : node.color;
  const [cr, cg, cb] = parseHex(baseColor);

  // ── Layer 1: Chromatic aberration fringe ──
  // Draw 2 offset halos in shifted colors (red-shift right, blue-shift left)
  const caOffset = isDragging ? 3 : 2;
  const caRadius = r + 8;

  // Red-shifted halo (offset right)
  const redGrad = ctx.createRadialGradient(
    node.x + caOffset, node.y, r * 0.3,
    node.x + caOffset, node.y, caRadius,
  );
  redGrad.addColorStop(0, `rgba(${Math.min(255, cr + 80)},${Math.max(0, cg - 40)},${Math.max(0, cb - 40)},${0.2 * shimmer})`);
  redGrad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(node.x + caOffset, node.y, caRadius, 0, Math.PI * 2);
  ctx.fillStyle = redGrad;
  ctx.fill();

  // Blue-shifted halo (offset left)
  const blueGrad = ctx.createRadialGradient(
    node.x - caOffset, node.y, r * 0.3,
    node.x - caOffset, node.y, caRadius,
  );
  blueGrad.addColorStop(0, `rgba(${Math.max(0, cr - 40)},${Math.max(0, cg - 20)},${Math.min(255, cb + 80)},${0.2 * shimmer})`);
  blueGrad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(node.x - caOffset, node.y, caRadius, 0, Math.PI * 2);
  ctx.fillStyle = blueGrad;
  ctx.fill();

  // ── Layer 2: Soft color glow (the "atmosphere") ──
  const glowR = r + 14;
  const glow = ctx.createRadialGradient(node.x, node.y, r * 0.4, node.x, node.y, glowR);
  glow.addColorStop(0, `rgba(${cr},${cg},${cb},${0.4 * shimmer})`);
  glow.addColorStop(0.5, `rgba(${cr},${cg},${cb},${0.12 * shimmer})`);
  glow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // ── Layer 3: Core orb (white-hot center → node color edge) ──
  const core = ctx.createRadialGradient(
    node.x, node.y, 0,
    node.x, node.y, r,
  );
  core.addColorStop(0, `rgba(255,255,255,${0.95 * shimmer})`);
  core.addColorStop(0.3, `rgba(${Math.min(255, cr + 60)},${Math.min(255, cg + 60)},${Math.min(255, cb + 60)},${0.9 * shimmer})`);
  core.addColorStop(0.7, `rgba(${cr},${cg},${cb},${0.8 * shimmer})`);
  core.addColorStop(1, `rgba(${cr},${cg},${cb},0.3)`);
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();

  // ── Layer 4: Specular highlight (top-left) ──
  const spec = ctx.createRadialGradient(
    node.x - r * 0.2, node.y - r * 0.25, 0,
    node.x - r * 0.2, node.y - r * 0.25, r * 0.6,
  );
  spec.addColorStop(0, `rgba(255,255,255,${0.5 * shimmer})`);
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
  ctx.fillStyle = spec;
  ctx.fill();

  // ── Label ──
  ctx.fillStyle = '#fff';
  ctx.font = `bold 9px "Montserrat",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = `rgba(${cr},${cg},${cb},0.8)`;
  ctx.shadowBlur = 6;

  const lines = node.label.split('\n');
  const lineHeight = 10;
  const startY = node.y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, node.x, startY + i * lineHeight, r * 2 - 6);
  });
  ctx.shadowBlur = 0;
}
