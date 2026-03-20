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
  ctx.lineCap = 'round';

  edges.forEach((edge, idx) => {
    const na = nodes[edge[0]];
    const nb = nodes[edge[1]];
    const isCrossing = crossingSet.has(idx);

    // Color config: bloom → mid glow → white-hot core
    let bloom: string, mid: string, core: string;
    if (winState) {
      bloom = 'rgba(255,215,64,0.15)';
      mid   = 'rgba(255,230,120,0.5)';
      core  = 'rgba(255,255,240,0.95)';
    } else if (isCrossing) {
      bloom = 'rgba(255,70,70,0.18)';
      mid   = 'rgba(255,120,100,0.5)';
      core  = 'rgba(255,220,210,0.9)';
    } else {
      bloom = 'rgba(0,180,255,0.12)';
      mid   = 'rgba(100,220,255,0.45)';
      core  = 'rgba(230,250,255,0.9)';
    }

    // Pass 1: Wide soft bloom
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = bloom;
    ctx.lineWidth = 10;
    ctx.shadowColor = bloom;
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Pass 2: Medium glow
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = mid;
    ctx.lineWidth = 4;
    ctx.shadowColor = mid;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Pass 3: Bright white-hot core
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = core;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  ctx.lineCap = 'butt';
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
  const r = isDragging ? NODE_DRAG_RADIUS : NODE_RADIUS;

  const baseColor = winState ? '#4caf50' : node.color;
  const [cr, cg, cb] = parseHex(baseColor);

  // Slowly rotating angle for spikes
  const rot = time * 0.0004 + idx * 1.0;
  const shimmer = 0.9 + 0.1 * Math.sin(time * 0.003 + idx * 2.1);

  // ── Chromatic aberration halo ──
  const caOff = isDragging ? 3 : 2;
  // Red-shifted
  const rg = ctx.createRadialGradient(node.x + caOff, node.y, 0, node.x + caOff, node.y, r + 10);
  rg.addColorStop(0, `rgba(${Math.min(255, cr + 60)},${Math.max(0, cg - 30)},${Math.max(0, cb - 30)},${0.2 * shimmer})`);
  rg.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(node.x + caOff, node.y, r + 10, 0, Math.PI * 2); ctx.fillStyle = rg; ctx.fill();
  // Blue-shifted
  const blg = ctx.createRadialGradient(node.x - caOff, node.y, 0, node.x - caOff, node.y, r + 10);
  blg.addColorStop(0, `rgba(${Math.max(0, cr - 30)},${Math.max(0, cg - 15)},${Math.min(255, cb + 60)},${0.2 * shimmer})`);
  blg.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(node.x - caOff, node.y, r + 10, 0, Math.PI * 2); ctx.fillStyle = blg; ctx.fill();

  // ── Soft color glow (bigger) ──
  const glowR = r + 18;
  const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
  glow.addColorStop(0, `rgba(${cr},${cg},${cb},${0.35 * shimmer})`);
  glow.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.1)`);
  glow.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();

  // ── Amorphous rotating blobs (soft organic shapes around the core) ──
  ctx.save();
  ctx.translate(node.x, node.y);
  ctx.rotate(rot);

  // Draw 3 soft elliptical blobs at different angles, slowly drifting
  for (let i = 0; i < 3; i++) {
    const bAngle = (i * Math.PI * 2) / 3 + Math.sin(time * 0.001 + idx + i) * 0.3;
    const bDist = r * 0.3;
    const bx = Math.cos(bAngle) * bDist;
    const by = Math.sin(bAngle) * bDist;
    const bSize = r * (0.7 + 0.15 * Math.sin(time * 0.002 + i * 2));

    const blob = ctx.createRadialGradient(bx, by, 0, bx, by, bSize);
    blob.addColorStop(0, `rgba(255,255,255,${0.18 * shimmer})`);
    blob.addColorStop(0.4, `rgba(${cr},${cg},${cb},${0.08 * shimmer})`);
    blob.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.ellipse(bx, by, bSize, bSize * 0.6, bAngle, 0, Math.PI * 2);
    ctx.fillStyle = blob;
    ctx.fill();
  }

  ctx.restore();

  // ── Bright core ──
  const coreR = r * 0.45;
  const coreGrad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, coreR);
  coreGrad.addColorStop(0, `rgba(255,255,255,${0.95 * shimmer})`);
  coreGrad.addColorStop(0.5, `rgba(${Math.min(255, cr + 80)},${Math.min(255, cg + 80)},${Math.min(255, cb + 80)},0.6)`);
  coreGrad.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(node.x, node.y, coreR, 0, Math.PI * 2); ctx.fillStyle = coreGrad; ctx.fill();

  // ── Label (below the star) ──
  ctx.font = `bold 11px "Montserrat",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = node.label.split('\n');
  const lineHeight = 12;
  const labelY = node.y + r * 0.5 + 10;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1;
  lines.forEach((line, i) => { ctx.fillText(line, node.x, labelY + i * lineHeight, r * 3); });

  ctx.shadowColor = `rgba(${cr},${cg},${cb},0.9)`;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#fff';
  lines.forEach((line, i) => { ctx.fillText(line, node.x, labelY + i * lineHeight, r * 3); });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}
