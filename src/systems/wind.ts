/* eslint-disable @typescript-eslint/no-unused-vars */
import { type SimulationState, WIDTH } from '../types';

/**
 * Initialize the wind system
 */
export function init(_state: SimulationState): void {
  // Nothing to initialize for wind
}

/**
 * Update wind (not needed as wind is updated in missiles.ts)
 */
export function update(_state: SimulationState): void {
  // Wind updates handled in missile generation
}

/**
 * Render wind indicator to the canvas
 */
export function render(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  // Draw wind indicator as a triangle in the top right
  if (state.wind !== 0) {
    const maxTriangleSize = 20; // Maximum triangle size
    const triangleSize = Math.min(maxTriangleSize, Math.abs(state.wind) * 200);

    // Scale wind for visual effect
    const windDirection = state.wind > 0 ? 1 : -1; // 1 = right, -1 = left

    ctx.save();
    ctx.scale(2, 2); // Scale to match the sand rendering

    // Position in top right corner with some padding
    const triangleX = WIDTH - 30;
    const triangleY = 30;

    // Draw triangle pointing in wind direction
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();

    if (windDirection > 0) {
      // Wind blowing right - triangle points right
      ctx.moveTo(triangleX, triangleY - triangleSize / 2); // Top point
      ctx.lineTo(triangleX, triangleY + triangleSize / 2); // Bottom point
      ctx.lineTo(triangleX + triangleSize, triangleY); // Right point
    } else {
      // Wind blowing left - triangle points left
      ctx.moveTo(triangleX, triangleY - triangleSize / 2); // Top point
      ctx.lineTo(triangleX, triangleY + triangleSize / 2); // Bottom point
      ctx.lineTo(triangleX - triangleSize, triangleY); // Left point
    }

    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
