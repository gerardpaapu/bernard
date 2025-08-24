import { type SimulationState, WIDTH, HEIGHT } from '../types';

// Constants
const TANK_RADIUS = 10;
const TANK_GRAVITY = 0.8; // Increased from 0.1 for faster falling
const TURRET_LENGTH = 15;

// Create a tank system
let tanksInitialized = false;

/**
 * Initialize the tank system
 */
export function init(state: SimulationState): void {
  if (!tanksInitialized) {
    // Initialize the tanks array if it doesn't exist
    if (!state.tanks) {
      state.tanks = [];
    }

    generateRandomTanks(state);

    // Set the initial current tank index to 0 (first tank's turn)
    if (state.tanks.length > 0) {
      state.currentTankIndex = 0;
    }

    tanksInitialized = true;
  }
}

/**
 * Update tanks, applying physics and checking for collisions with sand
 * Returns true if all tanks are touching sand, false otherwise
 */
export function update(state: SimulationState): boolean {
  return updateTanks(state);
}

/**
 * Render tanks to the canvas
 */
export function render(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  renderTanks(state, ctx);
}

/**
 * Generate random tanks with random properties
 */
function generateRandomTanks(state: SimulationState): void {
  // Generate 1-3 tanks at random positions above the screen
  const tankCount = 3;

  for (let i = 0; i < tankCount; i++) {
    const x = Math.random() * WIDTH;
    const y = -20;
    const angle = -Math.PI / 2; // Point turret upward (-90 degrees)
    const color = COLORS[i];

    state.tanks.push({
      x,
      y,
      angle,
      color,
    });
  }
}

/**
 * Update tank positions and check for collisions with sand
 * Returns true if all tanks are on sand, false if any are still falling
 */
function updateTanks(state: SimulationState): boolean {
  let allTanksOnSand = true;

  for (const tank of state.tanks) {
    // Check if tank is directly above sand
    const tankBottom = Math.floor(tank.y + TANK_RADIUS);
    const tankLeft = Math.floor(tank.x - TANK_RADIUS);
    const tankRight = Math.floor(tank.x + TANK_RADIUS);

    // Check if there's sand below the tank
    let onSand = false;
    // Check center point of tank bottom for sand collision
    const tankCenterX = Math.floor(tank.x);
    if (
      tankCenterX >= 0 &&
      tankCenterX < WIDTH &&
      tankBottom >= 0 &&
      tankBottom < HEIGHT
    ) {
      const index = tankBottom * WIDTH + tankCenterX;
      if (state.sand[index]) {
        onSand = true;
      }
    }

    if (!onSand) {
      // Tank is not on sand, apply gravity
      tank.y += TANK_GRAVITY;
      allTanksOnSand = false;
    } else {
      // Position tank precisely on top of sand
      // Find the highest sand point under the tank
      let highestSandY = HEIGHT;

      for (let x = tankLeft; x <= tankRight; x++) {
        if (x >= 0 && x < WIDTH) {
          // Search upward from the bottom of the tank to find sand
          for (let y = tankBottom; y >= 0; y--) {
            const index = y * WIDTH + x;
            if (state.sand[index]) {
              highestSandY = Math.min(highestSandY, y);
              break;
            }
          }
        }
      }

      // Position the tank so it's sitting exactly on the sand
      if (highestSandY < HEIGHT) {
        tank.y = highestSandY - TANK_RADIUS;
      }
    }

    // Check if tank is sitting on the bottom
    if (tank.y + TANK_RADIUS > HEIGHT) {
      tank.y = HEIGHT - TANK_RADIUS;
    }
  }

  return allTanksOnSand;
}

/**
 * Render tanks to the canvas
 */
function renderTanks(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  ctx.save();
  ctx.scale(2, 2); // Scale to match the sand rendering

  for (let i = 0; i < state.tanks.length; i++) {
    const tank = state.tanks[i];
    const isCurrentTank = i === state.currentTankIndex;

    // Draw tank body (semi-circle)
    ctx.fillStyle = tank.color;
    ctx.beginPath();
    ctx.arc(tank.x, tank.y, TANK_RADIUS, 0, Math.PI, true);
    ctx.fill();

    // Draw tank turret (line)
    ctx.strokeStyle = tank.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(
      tank.x + Math.cos(tank.angle) * TANK_RADIUS,
      tank.y + Math.sin(tank.angle) * TANK_RADIUS
    );
    ctx.lineTo(
      tank.x + Math.cos(tank.angle) * TURRET_LENGTH,
      tank.y + Math.sin(tank.angle) * TURRET_LENGTH
    );
    ctx.stroke();

    // Add indicator for current tank's turn
    if (isCurrentTank) {
      // Draw an arrow or indicator above the current tank
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(tank.x, tank.y - TANK_RADIUS - 10);
      ctx.lineTo(tank.x - 5, tank.y - TANK_RADIUS - 5);
      ctx.lineTo(tank.x + 5, tank.y - TANK_RADIUS - 5);
      ctx.fill();
    }
  }

  ctx.restore();
}

const COLORS = [
  '#E63946', // Red
  '#F4A261', // Orange
  '#8338EC', // Purple
];
