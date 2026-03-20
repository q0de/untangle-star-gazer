import gsap from 'gsap';
import { DEFAULT_CONFIG } from './config';
import type { PuzzleConfig } from './config';
import { createState, pointerDown, pointerMove, pointerUp, markSolved, getSolvedPositions } from './untangle';
import type { UntangleState } from './untangle';
import { render, initStarfield } from './renderer';
import type { RenderState } from './renderer';
import { updateParticles, setShakeTarget, winBurst, screenShake, slamText, flashScreen, chromaticPulse, vibratePattern } from './juice';
import { createNoiseTexture } from './noise';

// ── Config ─────────────────────────────────────────────────────────
const config: PuzzleConfig = DEFAULT_CONFIG;

// ── DOM refs ───────────────────────────────────────────────────────
const screenMenu     = document.getElementById('screen-menu')!;
const screenIntro    = document.getElementById('screen-intro')!;
const screenGameplay = document.getElementById('screen-gameplay')!;
const screenSummary  = document.getElementById('screen-summary')!;

const btnPlay      = document.getElementById('btn-play')!;
const btnReshuffle = document.getElementById('btn-reshuffle')!;
const btnReplay    = document.getElementById('btn-replay')!;

const canvasEl       = document.getElementById('game-canvas') as HTMLCanvasElement;
const canvasArea     = document.getElementById('canvas-area')!;
const gameplayContent = document.getElementById('gameplay-content')!;
const starmanStatic  = document.getElementById('bg-starman-static')!;
const starmanVideo   = document.getElementById('bg-starman-video') as HTMLVideoElement;

const timerBar     = document.getElementById('timer-bar')!;
const timerSeconds = document.getElementById('timer-seconds')!;
const crossingsVal = document.getElementById('crossings-count')!;

const summaryHeadline = document.getElementById('summary-headline')!;
const summaryStat     = document.getElementById('summary-stat')!;
const summaryCallout  = document.getElementById('summary-callout')!;

const line1 = document.getElementById('typewriter-line1')!;
const line2 = document.getElementById('typewriter-line2')!;
const line3 = document.getElementById('typewriter-line3')!;

// ── State ──────────────────────────────────────────────────────────
let state: UntangleState;
let currentScreen: 'menu' | 'intro' | 'gameplay' | 'summary' = 'menu';
let timerInterval: number | null = null;
let timeLeft = config.timerSeconds;
let rafId = 0;
let winProgress = 0;
let lastFrameTime = 0;
let nodesVisible = false;
let nodeOpacities: number[] = [];
let edgesOpacity = 0;

// ── Canvas sizing (fill viewport) ──────────────────────────────────
function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvasArea.getBoundingClientRect();
  canvasEl.width  = rect.width * dpr;
  canvasEl.height = rect.height * dpr;
  const ctx = canvasEl.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initStarfield(rect.width, rect.height);
  return { w: rect.width, h: rect.height };
}

// Logical canvas dimensions (CSS pixels, not device pixels)
function canvasLogicalSize(): { w: number; h: number } {
  const rect = canvasArea.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

// ── Screen transitions ─────────────────────────────────────────────
function showScreen(name: typeof currentScreen) {
  const screens: Record<string, HTMLElement> = {
    menu: screenMenu, intro: screenIntro, gameplay: screenGameplay, summary: screenSummary,
  };
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('active', key === name);
  }
  currentScreen = name;
}

// ── Typewriter ─────────────────────────────────────────────────────
function typewrite(el: HTMLElement, text: string, speed: number = 30): Promise<void> {
  return new Promise(resolve => {
    let i = 0;
    el.textContent = '';
    const iv = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) { clearInterval(iv); resolve(); }
    }, speed);
  });
}

// ── Render loop ────────────────────────────────────────────────────
function frameLoop(time: number) {
  const dt = lastFrameTime ? time - lastFrameTime : 16;
  lastFrameTime = time;

  updateParticles(dt);

  const { w, h } = canvasLogicalSize();
  const ctx = canvasEl.getContext('2d')!;
  const renderState: RenderState = {
    nodes: state.nodes,
    edges: state.edges,
    crossingSet: state.crossingSet,
    dragIdx: state.dragIdx,
    winState: state.solved,
    winProgress,
    time,
    logicalWidth: w,
    logicalHeight: h,
    nodesVisible,
    nodeOpacities,
    edgesOpacity,
  };
  render(ctx, renderState);

  if (currentScreen === 'gameplay' || state.solved) {
    rafId = requestAnimationFrame(frameLoop);
  }
}

function startRenderLoop() {
  lastFrameTime = 0;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(frameLoop);
}

// ── Timer ──────────────────────────────────────────────────────────
function startTimer() {
  timeLeft = config.timerSeconds;
  timerSeconds.textContent = String(timeLeft);
  timerBar.style.width = '100%';

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = window.setInterval(() => {
    timeLeft--;
    timerSeconds.textContent = String(Math.max(0, timeLeft));
    timerBar.style.width = `${(timeLeft / config.timerSeconds) * 100}%`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval!);
      timerInterval = null;
      endGame(false);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ── Pointer → Canvas coordinate mapping ────────────────────────────
function clientToCanvas(e: PointerEvent): { x: number; y: number } {
  const rect = canvasArea.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

// ── Pointer events ─────────────────────────────────────────────────
canvasEl.addEventListener('pointerdown', (e) => {
  if (currentScreen !== 'gameplay' || state.solved || !nodesVisible) return;
  e.preventDefault();
  const { x, y } = clientToCanvas(e);
  if (pointerDown(state, x, y, e.pointerId)) {
    try { canvasEl.setPointerCapture(e.pointerId); } catch {}
  }
});

canvasEl.addEventListener('pointermove', (e) => {
  if (currentScreen !== 'gameplay' || state.dragIdx === -1) return;
  e.preventDefault();
  const { x, y } = clientToCanvas(e);
  const { w, h } = canvasLogicalSize();
  // Pass null for juiceContainer to skip shake during drag (juice only on win)
  const result = pointerMove(state, x, y, e.pointerId, w, h, undefined);

  // Update UI
  crossingsVal.textContent = String(state.crossingCount);
  crossingsVal.classList.toggle('zero', state.crossingCount === 0);

  // Win!
  if (result.resolved) {
    triggerWin();
  }
});

canvasEl.addEventListener('pointerup', (e) => {
  pointerUp(state, e.pointerId);
});

canvasEl.addEventListener('pointercancel', (e) => {
  pointerUp(state, e.pointerId);
});

// ── Win Sequence ───────────────────────────────────────────────────
function triggerWin() {
  markSolved(state);
  stopTimer();

  // Play wave celebration video
  starmanVideo.src = '/starman-wave.mp4';
  starmanVideo.currentTime = 0;
  starmanVideo.play().catch(() => {});
  starmanVideo.classList.add('visible', 'lit');
  starmanStatic.classList.remove('visible');

  // Animate nodes to body positions (scaled to current canvas size)
  const { w, h } = canvasLogicalSize();
  const targets = getSolvedPositions(state.nodes);
  const tl = gsap.timeline();

  state.nodes.forEach((node, i) => {
    // Targets are normalized 0–1, scale to actual canvas
    const tx = targets[i].x * w;
    const ty = targets[i].y * h;
    tl.to(node, {
      x: tx,
      y: ty,
      duration: 0.6,
      ease: 'back.out(1.4)',
    }, i * 0.08);
  });

  // Win progress for starman glow in canvas
  tl.to({ val: 0 }, {
    val: 1,
    duration: 0.8,
    onUpdate: function (this: gsap.core.Tween) {
      winProgress = this.progress();
    },
  }, 0);

  // Win juice — shake + particles + flash
  setTimeout(() => {
    screenShake(0.6);
    winBurst(w / 2, h / 2);
    vibratePattern([30, 50, 30, 50, 80]);
    flashScreen(canvasArea);
    chromaticPulse(canvasArea);
  }, 200);
  setTimeout(() => winBurst(w * 0.3, h * 0.4), 400);
  setTimeout(() => winBurst(w * 0.7, h * 0.6), 600);

  slamText(canvasArea, 'UNTANGLED!');

  // Wait for the wave video to finish playing before going to summary
  const goToSummary = () => endGame(true);
  starmanVideo.addEventListener('ended', goToSummary, { once: true });
  // Fallback in case video doesn't fire ended
  setTimeout(goToSummary, 6000);
}

// ── End Game ───────────────────────────────────────────────────────
function endGame(solved: boolean) {
  stopTimer();
  cancelAnimationFrame(rafId);

  if (solved) {
    summaryHeadline.innerHTML = 'Web <span class="logo-pink">Untangled</span>!';
    summaryStat.textContent = `${state.initialCrossings} → 0 crossings`;
  } else {
    summaryHeadline.innerHTML = 'Almost There...';
    summaryStat.textContent = `${state.initialCrossings} → ${state.crossingCount} crossings`;
  }
  summaryCallout.textContent = config.educationalCallout;

  // Fade out starman
  starmanStatic.classList.remove('visible');
  starmanVideo.classList.remove('visible', 'lit');
  starmanVideo.pause();

  showScreen('summary');
}

// ── Start / Reset Game ─────────────────────────────────────────────
function initGame() {
  winProgress = 0;
  nodesVisible = false;
  nodeOpacities = [];
  edgesOpacity = 0;
  starmanStatic.classList.remove('visible');
  starmanVideo.classList.remove('visible', 'lit');

  const { w, h } = sizeCanvas();
  config.canvasWidth = w;
  config.canvasHeight = h;

  state = createState(config);
  crossingsVal.textContent = String(state.crossingCount);
  crossingsVal.classList.remove('zero');

  showScreen('gameplay');
  startRenderLoop();

  // Step 1: Play entrance video with a nice fade in
  starmanVideo.src = '/starman-enter.mp4';
  starmanVideo.currentTime = 0;
  starmanVideo.play().catch(() => {});
  requestAnimationFrame(() => starmanVideo.classList.add('visible'));

  // Step 2: After a short entrance (~2s), crossfade to static + show nodes + start timer
  // Don't wait for full video — overlap the transition for a smoother feel
  let entranceDone = false;
  const finishEntrance = () => {
    if (entranceDone) return;
    entranceDone = true;

    // Crossfade to static starman
    starmanStatic.classList.add('visible');
    setTimeout(() => {
      starmanVideo.classList.remove('visible');
      starmanVideo.pause();
    }, 800);

    // Staggered node entrance: each node fades in one at a time, then edges draw
    nodesVisible = true;
    const count = state.nodes.length;
    nodeOpacities = new Array(count).fill(0);

    // Fade in each node with 200ms stagger
    state.nodes.forEach((_, i) => {
      gsap.to(nodeOpacities, {
        [i]: 1,
        duration: 0.5,
        delay: i * 0.2,
        ease: 'power2.out',
      });
    });

    // After all nodes in, fade in edges
    const edgeDelay = count * 0.2 + 0.3;
    gsap.to({ val: 0 }, {
      val: 1,
      duration: 0.6,
      delay: edgeDelay,
      ease: 'power2.out',
      onUpdate: function (this: gsap.core.Tween) {
        edgesOpacity = this.progress();
      },
      onComplete: () => startTimer(), // timer starts only after everything is visible
    });
  };

  // Let the walk play longer for a more dramatic entrance
  setTimeout(finishEntrance, 3500);
  // Also handle video end / autoplay-blocked as fallback
  starmanVideo.addEventListener('ended', finishEntrance, { once: true });
}

// ── Intro Flow ─────────────────────────────────────────────────────
async function playIntro() {
  showScreen('intro');
  line1.textContent = '';
  line2.textContent = '';
  line3.textContent = '';

  // Animate doctor avatar in with glow
  const avatar = document.querySelector('.intro-avatar') as HTMLElement;
  const bubble = document.querySelector('.speech-bubble') as HTMLElement;
  avatar.classList.remove('glow', 'talking');
  bubble.classList.remove('glow');

  gsap.fromTo(avatar,
    { opacity: 0, scale: 0.6, y: 30 },
    {
      opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.6)',
      onComplete: () => avatar.classList.add('glow'),
    },
  );
  gsap.fromTo(bubble,
    { opacity: 0, y: 20 },
    {
      opacity: 1, y: 0, duration: 0.5, delay: 0.4, ease: 'power2.out',
      onComplete: () => bubble.classList.add('glow'),
    },
  );

  await new Promise(r => setTimeout(r, 500));

  // Skip button + intro flow
  const skipBtn = document.getElementById('btn-skip-intro')!;
  skipBtn.classList.remove('visible');
  let introSkipped = false;

  const skipToGame = () => {
    if (introSkipped) return;
    introSkipped = true;
    avatar.classList.remove('talking');
    skipBtn.classList.remove('visible');
    initGame();
  };

  skipBtn.onclick = skipToGame;

  // Start talking animation during typewriter
  avatar.classList.add('talking');

  // Typewriter text
  await typewrite(line1, 'This patient has symptoms');
  if (introSkipped) return;
  await typewrite(line2, 'across multiple systems.');
  if (introSkipped) return;
  await typewrite(line3, 'Untangle the web to see the pattern.');
  if (introSkipped) return;
  avatar.classList.remove('talking');

  // Pause a few beats then auto-advance to gameplay
  await new Promise(r => setTimeout(r, 1500));
  if (!introSkipped) skipToGame();
}

// ── Button handlers ────────────────────────────────────────────────
btnPlay.addEventListener('click', () => playIntro());

btnReshuffle.addEventListener('click', () => {
  stopTimer();
  cancelAnimationFrame(rafId);
  initGame();
});

btnReplay.addEventListener('click', () => playIntro());

// ── Resize handling ────────────────────────────────────────────────
window.addEventListener('resize', () => {
  if (currentScreen === 'gameplay' && state) {
    sizeCanvas();
  }
});

// ── Noise texture on menu hero ─────────────────────────────────────
const menuNoiseContainer = document.getElementById('menu-noise')!;
createNoiseTexture(menuNoiseContainer, {
  opacity: 0.04,
  speed: 18,
  contrast: 2.5,
  brightness: 1.5,
});

// ── Init ───────────────────────────────────────────────────────────
setShakeTarget(gameplayContent);
showScreen('menu');
