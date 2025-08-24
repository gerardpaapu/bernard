/* eslint-disable @typescript-eslint/no-unused-vars */
import { type SimulationState, type Explosion, WIDTH, HEIGHT } from '../types';
import { checkLineCollision } from '../utils';

/**
 * Initialize the missile system
 */
export function init(_state: SimulationState): void {
  // Nothing to initialize specifically for missiles
}

/**
 * Update missiles, applying physics and checking for collisions
 * Returns true if a collision was detected
 */
export function update(state: SimulationState): boolean {
  return updateMissiles(state);
}

/**
 * Render missiles to the canvas
 */
export function render(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  ctx.save();
  ctx.scale(2, 2); // Scale to match the sand rendering

  for (const missile of state.missiles) {
    // Map explosion radius to a color hue
    // Smaller radius (20) -> red (0)
    // Larger radius (50) -> blue (240)
    const minRadius = 20;
    const maxRadius = 50;
    const hue =
      240 -
      Math.min(
        240,
        Math.max(
          0,
          (240 * (missile.explosionRadius - minRadius)) /
            (maxRadius - minRadius)
        )
      );

    // Calculate a size that slightly increases with explosion radius
    const missileSize = 2 + (missile.explosionRadius / 50) * 3;

    // Draw missile with color based on explosion radius
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(missile.x, missile.y, missileSize, 0, Math.PI * 2);
    ctx.fill();

    // Add a slight glow effect that matches the missile color
    ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.3)`;
    ctx.beginPath();
    ctx.arc(missile.x, missile.y, missileSize * 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw missile trail with matching color but more transparent
    ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.5)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(missile.x, missile.y);
    ctx.lineTo(missile.x - missile.vx * 3, missile.y - missile.vy * 3);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Generate random missiles with random properties
 */
export function generateRandomMissiles(state: SimulationState): void {
  // Clear any existing missiles
  state.missiles = [];

  // Generate random wind
  state.wind = (Math.random() - 0.5) * 0.2; // Wind strength from -0.1 to 0.1 pixels per frame

  // Decide on the number of missiles to generate (1-3 missiles)
  const missileCount = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < missileCount; i++) {
    // Initialize with default position at top of screen
    let x = Math.random() * WIDTH;
    let y = 10;
    let validPosition = false;

    // Try to find a position without sand
    const maxAttempts = 50;
    let attempts = 0;

    while (!validPosition && attempts < maxAttempts) {
      // Generate random position anywhere on screen
      x = Math.random() * WIDTH;
      y = Math.random() * HEIGHT;

      // Check if this position contains sand
      const index = Math.floor(y) * WIDTH + Math.floor(x);
      if (index >= 0 && index < state.sand.length && state.sand[index] === 0) {
        validPosition = true;
      }

      attempts++;
    }

    // If we couldn't find a sand-free spot, the default values (top of screen) will be used

    // Random velocities in any direction
    const speed = Math.random() * 3 + 2; // 2 to 5 pixels per frame
    const angle = Math.random() * Math.PI * 2; // Random angle in radians (full 360 degrees)

    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;

    // Ensure missiles have enough initial velocity to be visibly moving
    const minVelocity = 1.0;
    if (Math.abs(vx) < minVelocity && Math.abs(vy) < minVelocity) {
      // If velocity is too low, increase it while maintaining direction
      const factor = minVelocity / Math.max(Math.abs(vx), Math.abs(vy));
      vx *= factor;
      vy *= factor;
    }

    // Random explosion radius
    const explosionRadius = Math.random() * 60 + 10; // 10 to 70 pixels

    // Add the missile to the simulation state
    state.missiles.push({
      x,
      y,
      vx,
      vy,
      explosionRadius,
    });
  }
}

/**
 * Fire a missile from a tank in the direction its turret is pointing
 * @param state The simulation state
 * @param tankIndex The index of the tank to fire from
 */
export function fireMissileFromTank(
  state: SimulationState,
  tankIndex: number
): void {
  if (!state.tanks || tankIndex >= state.tanks.length || tankIndex < 0) {
    return; // Invalid tank index
  }
  const tank = state.tanks[tankIndex];
  const angle = tank.angle;

  // Calculate the initial position of the missile (just outside the tank's radius)
  // Position the missile at the end of the turret
  const turretLength = 15; // Should match TURRET_LENGTH in tanks.ts

  // Position the missile at the end of the turret
  const missileX = tank.x + Math.cos(angle) * (turretLength + 2);
  const missileY = tank.y + Math.sin(angle) * (turretLength + 2);

  // Calculate the initial velocity components
  const missileSpeed = (10 * tank.power) / 100; // Base missile speed
  const vx = Math.cos(angle) * missileSpeed;
  const vy = Math.sin(angle) * missileSpeed;

  // Random explosion radius
  const explosionRadius = Math.random() * 60 + 10; // 10 to 70 pixels

  // Add the missile to the simulation state
  state.missiles.push({
    x: missileX,
    y: missileY,
    vx,
    vy,
    explosionRadius,
  });
}

/**
 * Update missile positions and check for collisions
 */
function updateMissiles(state: SimulationState): boolean {
  const gravity = 0.2; // Gravity constant (pixels per frame^2)
  let collisionDetected = false;
  const explosionsToCreate: Explosion[] = [];

  // Update each missile's position using Newtonian physics
  for (let i = state.missiles.length - 1; i >= 0; i--) {
    const missile = state.missiles[i];
    // Store previous position before updating
    const prevX = missile.x;
    const prevY = missile.y;

    // Apply gravity
    missile.vy += gravity;

    // Apply wind effect to the horizontal velocity
    missile.vx += state.wind;

    // Update position
    missile.x += missile.vx;
    missile.y += missile.vy;

    // Check for out of bounds
    if (missile.x < 0 || missile.x >= WIDTH || missile.y >= HEIGHT) {
      state.missiles.splice(i, 1);
      continue;
    }

    // Check for collision with sand and tanks using ray casting (Bresenham's line algorithm)
    // This prevents tunneling by checking all sand pixels and tanks along the missile's path
    const collision = checkLineCollision(
      prevX,
      prevY,
      missile.x,
      missile.y,
      state
    );

    if (collision) {
      // Collision detected!
      explosionsToCreate.push({
        x: collision.x,
        y: collision.y,
        radius: missile.explosionRadius,
      });
      collisionDetected = true;
      // Remove the missile from the simulation state
      state.missiles.splice(i, 1);
    }
  }

  // Add any explosions from collisions
  state.explosions = explosionsToCreate;

  return collisionDetected;
}
