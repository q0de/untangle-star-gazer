// Procedural constellation body renderer
// Draws a wireframe human silhouette made of glowing lines and joint dots

interface Joint {
  x: number;
  y: number;
}

// Joint positions relative to a 320×300 canvas
// Normalized around center (160, 150) with body height ~240px
const JOINTS: Record<string, Joint> = {
  head:           { x: 160, y: 30 },
  neck:           { x: 160, y: 55 },
  shoulderL:      { x: 120, y: 70 },
  shoulderR:      { x: 200, y: 70 },
  elbowL:         { x: 95,  y: 115 },
  elbowR:         { x: 225, y: 115 },
  handL:          { x: 75,  y: 160 },
  handR:          { x: 245, y: 160 },
  chest:          { x: 160, y: 100 },
  hip:            { x: 160, y: 160 },
  hipL:           { x: 140, y: 165 },
  hipR:           { x: 180, y: 165 },
  kneeL:          { x: 130, y: 215 },
  kneeR:          { x: 190, y: 215 },
  footL:          { x: 120, y: 270 },
  footR:          { x: 200, y: 270 },
};

// Bones connecting joints
const BONES: [string, string][] = [
  ['head', 'neck'],
  ['neck', 'shoulderL'], ['neck', 'shoulderR'],
  ['shoulderL', 'elbowL'], ['shoulderR', 'elbowR'],
  ['elbowL', 'handL'], ['elbowR', 'handR'],
  ['neck', 'chest'], ['chest', 'hip'],
  ['hip', 'hipL'], ['hip', 'hipR'],
  ['hipL', 'kneeL'], ['hipR', 'kneeR'],
  ['kneeL', 'footL'], ['kneeR', 'footR'],
  // Cross braces for constellation look
  ['shoulderL', 'chest'], ['shoulderR', 'chest'],
  ['shoulderL', 'shoulderR'],
  ['hipL', 'hipR'],
];

export function drawStarman(
  ctx: CanvasRenderingContext2D,
  opacity: number = 0.18,
  glowColor: string = '#e91e8c',
  time: number = 0, // for subtle pulse animation
) {
  ctx.save();

  // Draw bones
  ctx.strokeStyle = `rgba(233, 30, 140, ${opacity * 0.7})`;
  ctx.lineWidth = 1;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 4 * opacity;

  for (const [a, b] of BONES) {
    const ja = JOINTS[a];
    const jb = JOINTS[b];
    ctx.beginPath();
    ctx.moveTo(ja.x, ja.y);
    ctx.lineTo(jb.x, jb.y);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  // Draw joints as dots
  const jointKeys = Object.keys(JOINTS);
  for (let i = 0; i < jointKeys.length; i++) {
    const j = JOINTS[jointKeys[i]];
    // Subtle pulse per joint (staggered by index)
    const pulse = 1 + 0.3 * Math.sin(time * 0.002 + i * 0.8);
    const r = 2 * pulse;

    // Glow
    const grd = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, r * 3);
    grd.addColorStop(0, `rgba(233, 30, 140, ${opacity * 0.5})`);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(j.x, j.y, r * 3, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(j.x, j.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(233, 30, 140, ${opacity})`;
    ctx.fill();
  }

  // Head circle
  ctx.beginPath();
  ctx.arc(JOINTS.head.x, JOINTS.head.y, 12, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(233, 30, 140, ${opacity * 0.5})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// Lit-up version for win state — brighter, gold-tinted
export function drawStarmanLit(
  ctx: CanvasRenderingContext2D,
  progress: number, // 0→1 animation progress
  time: number = 0,
) {
  const opacity = 0.15 + progress * 0.5;
  const glowColor = `rgba(255, 215, 64, ${progress})`;
  drawStarman(ctx, opacity, glowColor, time);
}
