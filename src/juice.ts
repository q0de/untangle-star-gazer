import gsap from 'gsap';

// ── Particle System ────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: 'circle' | 'star' | 'diamond';
  active: boolean;
}

const POOL_SIZE = 60;
const pool: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
  x: 0, y: 0, vx: 0, vy: 0,
  life: 0, maxLife: 0, size: 0,
  color: '#fff', shape: 'circle', active: false,
}));

function _getParticle(): Particle | null {
  for (const p of pool) {
    if (!p.active) return p;
  }
  return null;
}

export function emitParticles(
  x: number, y: number,
  count: number,
  opts: {
    color?: string;
    colors?: string[];
    minSpeed?: number;
    maxSpeed?: number;
    minSize?: number;
    maxSize?: number;
    life?: number;
    shapes?: Particle['shape'][];
  } = {},
) {
  const {
    color, colors,
    minSpeed = 0.5, maxSpeed = 3,
    minSize = 1.5, maxSize = 4,
    life = 500,
    shapes = ['circle'],
  } = opts;

  for (let i = 0; i < count; i++) {
    const p = _getParticle();
    if (!p) break;

    const angle = Math.random() * Math.PI * 2;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = life + Math.random() * life * 0.3;
    p.maxLife = p.life;
    p.size = minSize + Math.random() * (maxSize - minSize);
    p.color = colors ? colors[Math.floor(Math.random() * colors.length)] : (color || '#fff');
    p.shape = shapes[Math.floor(Math.random() * shapes.length)];
    p.active = true;
  }
}

export function updateParticles(dt: number) {
  for (const p of pool) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02; // slight gravity
    p.vx *= 0.99;
    p.vy *= 0.99;
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D) {
  for (const p of pool) {
    if (!p.active) continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    const size = p.size * (0.5 + alpha * 0.5);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'diamond') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size, -size, size * 2, size * 2);
      ctx.restore();
    } else if (p.shape === 'star') {
      _drawStar(ctx, p.x, p.y, size);
    }
  }
  ctx.globalAlpha = 1;
}

function _drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// ── Burst presets ──────────────────────────────────────────────────

export function sparkleAt(x: number, y: number) {
  emitParticles(x, y, 8, {
    colors: ['#00bcd4', '#ffffff', '#80deea'],
    minSpeed: 0.8, maxSpeed: 2.5,
    minSize: 1, maxSize: 3,
    life: 400,
    shapes: ['circle', 'diamond'],
  });
}

export function winBurst(x: number, y: number) {
  emitParticles(x, y, 20, {
    colors: ['#ffd740', '#ffffff', '#ffab00', '#e91e8c'],
    minSpeed: 1, maxSpeed: 4,
    minSize: 2, maxSize: 5,
    life: 700,
    shapes: ['circle', 'star', 'diamond'],
  });
}

export function trailParticle(x: number, y: number, color: string) {
  emitParticles(x, y, 1, {
    color,
    minSpeed: 0.1, maxSpeed: 0.5,
    minSize: 1, maxSize: 2,
    life: 250,
  });
}

// ── Screen Shake ───────────────────────────────────────────────────

let shakeEl: HTMLElement | null = null;

export function setShakeTarget(el: HTMLElement) {
  shakeEl = el;
}

export function screenShake(intensity: number = 0.5) {
  if (!shakeEl) return;
  const px = intensity * 6;
  const deg = intensity * 2;
  gsap.to(shakeEl, {
    x: `random(-${px}, ${px})`,
    y: `random(-${px}, ${px})`,
    rotation: `random(-${deg}, ${deg})`,
    duration: 0.05,
    repeat: 3,
    yoyo: true,
    ease: 'power2.inOut',
    onComplete: () => { gsap.set(shakeEl!, { x: 0, y: 0, rotation: 0 }); },
  });
}

// ── Flash Overlay ──────────────────────────────────────────────────

export function flashScreen(el: HTMLElement, color: string = 'rgba(255,215,64,0.3)', duration: number = 0.2) {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:absolute;inset:0;z-index:100;pointer-events:none;
    background:${color};opacity:1;
  `;
  el.appendChild(flash);
  gsap.to(flash, { opacity: 0, duration, ease: 'power2.out', onComplete: () => flash.remove() });
}

// ── Chromatic Aberration Pulse ─────────────────────────────────────

export function chromaticPulse(el: HTMLElement) {
  const kf = [
    { filter: 'none' },
    { filter: 'drop-shadow(2px 0 0 rgba(255,0,80,0.4)) drop-shadow(-2px 0 0 rgba(0,188,212,0.4))' },
    { filter: 'none' },
  ];
  el.animate(kf, { duration: 300, easing: 'ease-out' });
}

// ── Hit Stop (micro-freeze) ───────────────────────────────────────

let _hitStopActive = false;

export function isHitStopped(): boolean {
  return _hitStopActive;
}

export function hitStop(durationMs: number = 40): Promise<void> {
  _hitStopActive = true;
  return new Promise(resolve => {
    setTimeout(() => {
      _hitStopActive = false;
      resolve();
    }, durationMs);
  });
}

// ── Floating Text ──────────────────────────────────────────────────

export function floatingText(
  container: HTMLElement,
  text: string,
  x: number, y: number,
  opts: { color?: string; fontSize?: string; duration?: number } = {},
) {
  const { color = '#00bcd4', fontSize = '16px', duration = 0.6 } = opts;
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position:absolute;left:${x}px;top:${y}px;
    color:${color};font-size:${fontSize};font-weight:800;
    font-family:'Montserrat',sans-serif;
    pointer-events:none;z-index:50;
    text-shadow:0 0 8px ${color};
  `;
  container.appendChild(el);
  gsap.to(el, { y: -40, opacity: 0, duration, ease: 'power2.out', onComplete: () => el.remove() });
}

export function slamText(
  container: HTMLElement,
  text: string,
  opts: { color?: string; fontSize?: string } = {},
) {
  const { color = '#ffd740', fontSize = '28px' } = opts;
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) scale(0);
    color:${color};font-size:${fontSize};font-weight:900;
    font-family:'Montserrat',sans-serif;
    pointer-events:none;z-index:60;
    text-shadow:0 0 16px ${color}, 0 0 32px rgba(255,215,64,0.3);
    white-space:nowrap;
  `;
  container.appendChild(el);
  gsap.to(el, {
    scale: 1, duration: 0.4, ease: 'back.out(2)',
    onComplete: () => {
      gsap.to(el, { opacity: 0, y: -20, duration: 0.8, delay: 0.6, ease: 'power2.in', onComplete: () => el.remove() });
    },
  });
}

// ── Haptics ────────────────────────────────────────────────────────

export function vibrate(ms: number = 15) {
  navigator?.vibrate?.(ms);
}

export function vibratePattern(pattern: number[]) {
  navigator?.vibrate?.(pattern);
}
