// Animated noise texture overlay — adapted from NoiseTexture React component
// Renders grainy film-like noise via canvas with mix-blend-mode: overlay

export interface NoiseConfig {
  opacity?: number;
  contrast?: number;
  brightness?: number;
  speed?: number; // FPS
}

export function createNoiseTexture(
  container: HTMLElement,
  config: NoiseConfig = {},
): () => void {
  const {
    opacity = 0.04,
    contrast = 2.5,
    brightness = 1.5,
    speed = 18,
  } = config;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3;';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `width:100%;height:100%;mix-blend-mode:overlay;opacity:${opacity};`;
  wrapper.appendChild(canvas);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d')!;
  let animId = 0;
  let lastTime = 0;
  const frameInterval = 1000 / speed;

  function resize() {
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function generateNoise(timestamp: number) {
    if (timestamp - lastTime < frameInterval) {
      animId = requestAnimationFrame(generateNoise);
      return;
    }
    lastTime = timestamp;

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 255;
      let adjusted = ((noise - 128) * contrast + 128) * brightness;
      adjusted = Math.max(0, Math.min(255, adjusted));
      data[i] = data[i + 1] = data[i + 2] = adjusted;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    animId = requestAnimationFrame(generateNoise);
  }

  resize();
  window.addEventListener('resize', resize);
  animId = requestAnimationFrame(generateNoise);

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(animId);
    wrapper.remove();
  };
}
