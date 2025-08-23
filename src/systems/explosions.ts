/* eslint-disable @typescript-eslint/no-unused-vars */
import { type SimulationState, WIDTH, HEIGHT } from '../types';

/**
 * Initialize the explosion system
 */
export function init(_state: SimulationState): void {
  // Nothing to initialize specifically for explosions
}

/**
 * Update explosions, processing any active explosions
 */
export function update(state: SimulationState): void {
  if (state.explosionDuration === 30) {
    processExplosions(state);
  }
}

/**
 * Render explosions to the canvas
 */
export function render(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  ctx.save();
  ctx.scale(2, 2); // Scale to match the sand rendering

  for (const explosion of state.explosions) {
    // Draw explosion radius
    // In explosions phase, make them more vibrant and orange
    if (state.phase === 'explosions') {
      // Calculate intensity based on remaining duration (brighter at start)
      const intensity = state.explosionDuration / 30;
      const outerRadius = explosion.radius * (1 + (1 - intensity) * 0.5); // Expand slightly as explosion fades

      // Create a vibrant orange explosion gradient
      const gradient = ctx.createRadialGradient(
        explosion.x,
        explosion.y,
        0,
        explosion.x,
        explosion.y,
        outerRadius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, ' + intensity + ')'); // White center
      gradient.addColorStop(0.2, 'rgba(255, 200, 0, ' + intensity + ')'); // Bright yellow
      gradient.addColorStop(0.5, 'rgba(255, 120, 0, ' + intensity + ')'); // Orange
      gradient.addColorStop(0.8, 'rgba(200, 0, 0, ' + intensity * 0.7 + ')'); // Red
      gradient.addColorStop(1, 'rgba(100, 0, 0, 0)'); // Fade to transparent

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, outerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Add a bright core
      ctx.fillStyle = 'rgba(255, 255, 200, ' + intensity + ')';
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standard explosion visualization for other phases
      const gradient = ctx.createRadialGradient(
        explosion.x,
        explosion.y,
        0,
        explosion.x,
        explosion.y,
        explosion.radius
      );
      gradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
      gradient.addColorStop(0.7, 'rgba(255, 100, 50, 0.5)');
      gradient.addColorStop(1, 'rgba(255, 50, 50, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Process explosions by removing sand within the explosion radius
 */
function processExplosions(state: SimulationState): void {
  // Process each explosion
  for (const explosion of state.explosions) {
    const { x, y, radius } = explosion;

    // Calculate bounds for the square containing the circular explosion
    const xMin = Math.max(0, Math.floor(x - radius));
    const xMax = Math.min(WIDTH - 1, Math.ceil(x + radius));
    const yMin = Math.max(0, Math.floor(y - radius));
    const yMax = Math.min(HEIGHT - 1, Math.ceil(y + radius));

    // Check each pixel in the bounded area
    for (let cy = yMin; cy <= yMax; cy++) {
      for (let cx = xMin; cx <= xMax; cx++) {
        // Calculate distance from explosion center
        const dx = cx - x;
        const dy = cy - y;
        const distanceSquared = dx * dx + dy * dy;

        // If the point is within the explosion radius, remove sand
        if (distanceSquared <= radius * radius) {
          const index = cy * WIDTH + cx;
          state.sand[index] = 0;
        }
      }
    }
  }
}
