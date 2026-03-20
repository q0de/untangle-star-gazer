import type { GameNode, PuzzleConfig } from './config';
import { NODE_HIT_RADIUS, BODY_POSITIONS, resolveEdges, generateTangledPositions } from './config';
import { sparkleAt, trailParticle, hitStop, isHitStopped, vibrate, floatingText } from './juice';

// ── Crossing Detection ─────────────────────────────────────────────

function _cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

function _edgesCross(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): boolean {
  const d1 = _cross(x4 - x3, y4 - y3, x1 - x3, y1 - y3);
  const d2 = _cross(x4 - x3, y4 - y3, x2 - x3, y2 - y3);
  const d3 = _cross(x2 - x1, y2 - y1, x3 - x1, y3 - y1);
  const d4 = _cross(x2 - x1, y2 - y1, x4 - x1, y4 - y1);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// ── Intersection point of two line segments ────────────────────────

function _intersectionPoint(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): { x: number; y: number } {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
}

// ── Game State ─────────────────────────────────────────────────────

export interface UntangleState {
  nodes: GameNode[];
  edges: [number, number][];
  crossingSet: Set<number>;
  crossingCount: number;
  initialCrossings: number;
  dragIdx: number;
  dragOffX: number;
  dragOffY: number;
  pointerId: number | null;
  solved: boolean;
  prevCrossingCount: number;
}

export function createState(config: PuzzleConfig): UntangleState {
  const edges = resolveEdges(config);
  let positions = generateTangledPositions(config);

  // Build nodes
  let nodes: GameNode[] = config.nodes.map((n, i) => ({
    idx: i, id: n.id, label: n.label, color: n.color, bodyRegion: n.bodyRegion,
    x: positions[i].x, y: positions[i].y,
  }));

  // Ensure we actually have crossings. Re-shuffle if needed (up to 20 tries)
  let crossCount = countCrossings(nodes, edges);
  let tries = 0;
  while (crossCount < 3 && tries < 20) {
    positions = generateTangledPositions(config);
    nodes = config.nodes.map((n, i) => ({
      idx: i, id: n.id, label: n.label, color: n.color, bodyRegion: n.bodyRegion,
      x: positions[i].x, y: positions[i].y,
    }));
    crossCount = countCrossings(nodes, edges);
    tries++;
  }

  const crossingSet = getCrossingEdgeSet(nodes, edges);

  return {
    nodes,
    edges,
    crossingSet,
    crossingCount: crossCount,
    initialCrossings: crossCount,
    dragIdx: -1,
    dragOffX: 0,
    dragOffY: 0,
    pointerId: null,
    solved: false,
    prevCrossingCount: crossCount,
  };
}

// ── Counting & Sets ────────────────────────────────────────────────

function countCrossings(nodes: GameNode[], edges: [number, number][]): number {
  let n = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i], [c, d] = edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (_edgesCross(
        nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y,
        nodes[c].x, nodes[c].y, nodes[d].x, nodes[d].y,
      )) n++;
    }
  }
  return n;
}

function getCrossingEdgeSet(nodes: GameNode[], edges: [number, number][]): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i], [c, d] = edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (_edgesCross(
        nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y,
        nodes[c].x, nodes[c].y, nodes[d].x, nodes[d].y,
      )) { s.add(i); s.add(j); }
    }
  }
  return s;
}

// Find intersection points of crossing edges (for particle effects)
function getCrossingPoints(nodes: GameNode[], edges: [number, number][]): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i], [c, d] = edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (_edgesCross(
        nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y,
        nodes[c].x, nodes[c].y, nodes[d].x, nodes[d].y,
      )) {
        pts.push(_intersectionPoint(
          nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y,
          nodes[c].x, nodes[c].y, nodes[d].x, nodes[d].y,
        ));
      }
    }
  }
  return pts;
}

// ── Pointer Handlers ───────────────────────────────────────────────

export function pointerDown(
  state: UntangleState,
  canvasX: number, canvasY: number,
  pointerId: number,
): boolean {
  if (state.solved) return false;

  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < state.nodes.length; i++) {
    const n = state.nodes[i];
    const d = Math.hypot(n.x - canvasX, n.y - canvasY);
    if (d <= NODE_HIT_RADIUS && d < bestD) { best = i; bestD = d; }
  }

  if (best !== -1) {
    state.dragIdx = best;
    state.dragOffX = state.nodes[best].x - canvasX;
    state.dragOffY = state.nodes[best].y - canvasY;
    state.pointerId = pointerId;
    state.prevCrossingCount = state.crossingCount;
    vibrate(10);
    return true;
  }
  return false;
}

export interface MoveResult {
  crossingDelta: number;
  resolved: boolean; // went from >0 to 0
  newCrossings: number;
}

export function pointerMove(
  state: UntangleState,
  canvasX: number, canvasY: number,
  pointerId: number,
  canvasW: number, canvasH: number,
  juiceContainer?: HTMLElement,
): MoveResult {
  if (state.dragIdx === -1 || state.pointerId !== pointerId || state.solved) {
    return { crossingDelta: 0, resolved: false, newCrossings: state.crossingCount };
  }
  if (isHitStopped()) {
    return { crossingDelta: 0, resolved: false, newCrossings: state.crossingCount };
  }

  const margin = NODE_HIT_RADIUS;
  const node = state.nodes[state.dragIdx];
  node.x = Math.max(margin, Math.min(canvasW - margin, canvasX + state.dragOffX));
  node.y = Math.max(margin, Math.min(canvasH - margin, canvasY + state.dragOffY));

  // Trail particle
  trailParticle(node.x, node.y, node.color);

  // Recalc crossings
  const prevSet = state.crossingSet;
  state.crossingSet = getCrossingEdgeSet(state.nodes, state.edges);
  const newCount = countCrossings(state.nodes, state.edges);
  const delta = state.prevCrossingCount - newCount;

  // Juice on crossing reduction — particles + haptics only, no shake during drag
  if (delta > 0) {
    vibrate(15);

    // Sparkle near the dragged node
    sparkleAt(node.x + (Math.random() - 0.5) * 30, node.y + (Math.random() - 0.5) * 30);

    // Floating text if container provided
    if (juiceContainer) {
      const rect = juiceContainer.getBoundingClientRect();
      floatingText(juiceContainer, `+${delta}`, rect.width / 2 - 10, rect.height / 2 - 20);
    }
  }

  state.crossingCount = newCount;
  state.prevCrossingCount = newCount;

  return {
    crossingDelta: delta,
    resolved: newCount === 0 && !state.solved,
    newCrossings: newCount,
  };
}

export function pointerUp(state: UntangleState, pointerId: number) {
  if (state.pointerId !== pointerId) return;
  state.dragIdx = -1;
  state.pointerId = null;
}

// ── Win & Reset ────────────────────────────────────────────────────

export function markSolved(state: UntangleState) {
  state.solved = true;
}

// Returns normalized 0–1 positions; caller scales to actual canvas size
export function getSolvedPositions(nodes: GameNode[]): { x: number; y: number }[] {
  return nodes.map(n => BODY_POSITIONS[n.bodyRegion] || { x: 0.5, y: 0.5 });
}
