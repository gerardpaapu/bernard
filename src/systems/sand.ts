import { type SimulationState, WIDTH, HEIGHT } from '../types';
import { sin } from '../utils';

// Create an offscreen canvas for sand rendering (only create once)
let offscreenCanvas: OffscreenCanvas | undefined;
// Need to use any here due to potential type incompatibilities between
// OffscreenCanvasRenderingContext2D and CanvasRenderingContext2D
let offscreenCtx: OffscreenCanvasRenderingContext2D | undefined;
let sandImageData: ImageData | undefined;

/**
 * Initialize the sand with a wave-like pattern
 */
export function init(state: SimulationState): void {
  // Initialize offscreen canvas using the OffscreenCanvas constructor
  offscreenCanvas = new OffscreenCanvas(WIDTH, HEIGHT);
  offscreenCtx = offscreenCanvas.getContext('2d') ?? undefined;

  if (!offscreenCtx) {
    console.error('Failed to get offscreen canvas context');
    return;
  }

  // Create image data once
  sandImageData = offscreenCtx.createImageData(WIDTH, HEIGHT);

  initialiseSand(state.sand);
}

/**
 * Update the sand simulation, making sand fall according to gravity rules
 * Returns true if any sand moved, false if settled
 */
export function update(state: SimulationState): boolean {
  return updateSand(state.sand);
}

/**
 * Render the sand to the canvas
 */
export function render(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  // Make sure offscreen canvas is initialized
  if (!offscreenCanvas || !offscreenCtx || !sandImageData) {
    console.error('Offscreen canvas not initialized');
    return;
  }

  // Update the pre-allocated image data with sand colors
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = 4 * (y * WIDTH + x);
      const j = y * WIDTH + x;
      sandImageData.data[i] = state.sand[j] ? 220 : 100; // Red
      sandImageData.data[i + 1] = state.sand[j] ? 200 : 150; // Green
      sandImageData.data[i + 2] = state.sand[j] ? 120 : 200; // Blue
      sandImageData.data[i + 3] = 255; // Alpha
    }
  }

  // Put the image data onto the offscreen canvas
  offscreenCtx.putImageData(sandImageData, 0, 0);

  // Now draw the offscreen canvas onto the main canvas with scaling
  // This will properly apply the scale transformation
  ctx.save();

  // Set pixelated rendering for crisp pixel art look
  ctx.imageSmoothingEnabled = false;

  ctx.scale(2, 2); // Scale by 2 to match the canvas size
  ctx.drawImage(offscreenCanvas, 0, 0);
  ctx.restore();
}

const SAND = 255;
const EMPTY = 0;

/**
 * Update the sand simulation by applying gravity rules
 */
function updateSand(state: Uint8Array): boolean {
  let changed = false;
  const next = new Uint8Array(state.length);
  next.fill(0);

  function get(x: number, y: number): number {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
      return SAND;
    }
    return state[y * WIDTH + x];
  }

  function set(x: number, y: number, v: number) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
      return;
    }

    next[y * WIDTH + x] = v;
  }

  // Update the state of the application
  for (let y = HEIGHT - 1; y >= 0; y--) {
    for (let x = 0; x < WIDTH; x++) {
      if (get(x, y) === EMPTY) {
        set(x, y, EMPTY);
        continue;
      }

      if (get(x, y + 1) === EMPTY) {
        set(x, y + 1, SAND);
        set(x, y, EMPTY);
        changed = true;
        continue;
      }

      const dx = y % 2 === 0 ? -1 : 1;
      if (get(x + dx, y + 1) === EMPTY) {
        set(x + dx, y + 1, SAND);
        set(x, y, EMPTY);
        changed = true;
        continue;
      }

      set(x, y, SAND);
    }
  }

  state.set(next);

  return changed;
}

/**
 * Initialize sand with a wave-like pattern
 */
function initialiseSand(state: Uint8Array) {
  const heights = [] as number[];
  for (let x = 0; x < WIDTH; x++) {
    heights[x] = 0;
    heights[x] += 1 * sin(x * 3);
    heights[x] += 0.7 * sin(x * 7);
    heights[x] += 0.5 * sin(x * 11);
    heights[x] += 0.2 * sin(x * 13);
    heights[x] += 1.7;
    heights[x] /= 3;
    heights[x] *= (2 + Math.random()) / 3;
  }

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x;
      // Initialize the state with a sine wave pattern
      state[index] = y / HEIGHT > heights[x] ? 255 : 0;
    }
  }
}
