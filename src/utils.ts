import { WIDTH, HEIGHT } from './types';

/**
 * Checks for collisions along a line using Bresenham's line algorithm
 * Returns the coordinates of the first collision point or null if no collision
 */
export function checkLineCollision(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sand: Uint8Array
): { x: number; y: number } | null {
  // Convert to integers for grid-based collision detection
  const startX = Math.floor(x0);
  const startY = Math.floor(y0);
  const endX = Math.floor(x1);
  const endY = Math.floor(y1);

  // If start point is already colliding, return immediately
  const startIndex = startY * WIDTH + startX;
  if (startIndex >= 0 && startIndex < sand.length && sand[startIndex] > 0) {
    return { x: x0, y: y0 };
  }

  // Calculate deltas and steps
  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);
  const sx = startX < endX ? 1 : -1;
  const sy = startY < endY ? 1 : -1;
  let err = dx - dy;

  // Current position
  let x = startX;
  let y = startY;

  // Traverse the line
  while (x !== endX || y !== endY) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }

    // Check if we're out of bounds
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
      break;
    }

    // Check if this point contains sand
    const index = y * WIDTH + x;
    if (index >= 0 && index < sand.length && sand[index] > 0) {
      // Calculate the exact collision point (interpolate between grid cells)
      // This is optional but makes explosions look better by putting them at the exact collision point
      const collisionX = x + 0.5; // center of the grid cell
      const collisionY = y + 0.5;
      return { x: collisionX, y: collisionY };
    }
  }

  // No collision found
  return null;
}

/**
 * Helper function for sine wave calculations
 */
export function sin(x: number): number {
  return Math.sin((x / WIDTH) * Math.PI * 2);
}
