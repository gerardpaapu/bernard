import { WIDTH, HEIGHT, type SimulationState } from './types';

/**
 * Checks for collisions along a line using Bresenham's line algorithm
 * Returns the coordinates of the first collision point or null if no collision
 */
export function checkLineCollision(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  state: SimulationState
): { x: number; y: number } | null {
  // Convert to integers for grid-based collision detection
  const startX = Math.floor(x0);
  const startY = Math.floor(y0);
  const endX = Math.floor(x1);
  const endY = Math.floor(y1);

  // If start point is already colliding, return immediately
  const startIndex = startY * WIDTH + startX;
  if (
    startIndex >= 0 &&
    startIndex < state.sand.length &&
    state.sand[startIndex] > 0
  ) {
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
    if (index >= 0 && index < state.sand.length && state.sand[index] > 0) {
      // Calculate the exact collision point (interpolate between grid cells)
      // This is optional but makes explosions look better by putting them at the exact collision point
      const collisionX = x + 0.5; // center of the grid cell
      const collisionY = y + 0.5;
      return { x: collisionX, y: collisionY };
    }

    // Check for tank collisions
    if (state.tanks) {
      for (const tank of state.tanks) {
        // Skip dead tanks - missiles should pass through them
        if (tank.health <= 0) {
          continue;
        }

        // Calculate distance from current point to tank center
        const dx = x + 0.5 - tank.x; // +0.5 to center the grid point
        const dy = y + 0.5 - tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if we're within the tank's radius (assuming TANK_RADIUS = 10)
        const TANK_RADIUS = 10;
        if (distance <= TANK_RADIUS) {
          // Calculate the exact collision point on the tank's edge
          const collisionX = tank.x + (dx / distance) * TANK_RADIUS;
          const collisionY = tank.y + (dy / distance) * TANK_RADIUS;
          return { x: collisionX, y: collisionY };
        }
      }
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
