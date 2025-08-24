import { type SimulationState, DEBUG, WIDTH, HEIGHT } from './types';
import * as Sand from './systems/sand';
import * as Missiles from './systems/missiles';
import * as Explosions from './systems/explosions';
import * as Wind from './systems/wind';
import * as Tanks from './systems/tanks';
import * as HUD from './systems/hud';
import './style.css';

const FRAME_RATE = 60;

// Keyboard state tracking
const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  space: false,
};

// Track key press events (for single press detection)
const keyPressed = {
  space: false,
};

/**
 * Initialize the simulation
 */
export function init(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to get 2D rendering context');
  }

  // Initialize simulation state
  const simState: SimulationState = {
    phase: 'sand',
    missiles: [],
    explosions: [],
    explosionDuration: 0,
    wind: 0, // Start with no wind
    sand: new Uint8Array(WIDTH * HEIGHT),
    tanks: [],
  };

  // Initialize each system
  Sand.init(simState);
  Missiles.init(simState);
  Explosions.init(simState);
  Wind.init(simState);
  Tanks.init(simState);
  HUD.init(simState);

  // Set up keyboard event listeners
  setupKeyboardListeners();

  let token: number | undefined;
  function resume() {
    if (token != undefined) {
      clearInterval(token);
    }

    token = setInterval(() => {
      updateSimulation(simState);
    }, 1000 / FRAME_RATE);
  }

  const renderLoop = () => {
    render(simState, ctx);
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);
  resume();
}

/**
 * Set up keyboard event listeners for tank control
 */
function setupKeyboardListeners(): void {
  // Handle keydown events
  document.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'ArrowLeft':
        keys.left = true;
        event.preventDefault();
        break;
      case 'ArrowRight':
        keys.right = true;
        event.preventDefault();
        break;
      case 'ArrowUp':
        keys.up = true;
        event.preventDefault();
        break;
      case 'ArrowDown':
        keys.down = true;
        event.preventDefault();
        break;
      case 'Space':
        if (!keys.space) {
          keyPressed.space = true;
        }
        keys.space = true;
        event.preventDefault();
        break;
    }
  });

  // Handle keyup events
  document.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'ArrowLeft':
        keys.left = false;
        break;
      case 'ArrowRight':
        keys.right = false;
        break;
      case 'ArrowUp':
        keys.up = false;
        break;
      case 'ArrowDown':
        keys.down = false;
        break;
      case 'Space':
        keys.space = false;
        break;
    }
  });
}

/**
 * Main simulation update function - manages the phase-based system
 */
function updateSimulation(simState: SimulationState): void {
  switch (simState.phase) {
    case 'missiles':
      // Simulate missile physics and check for collisions
      const collisionDetected = Missiles.update(simState);

      // If there was a collision or no missiles left, move to next phase
      if (collisionDetected) {
        simState.phase = 'explosions';
        simState.explosionDuration = 30; // Show explosions for 30 frames (about 0.5 seconds at 60fps)
      } else if (simState.missiles.length === 0) {
        // No more missiles, advance to the next tank's turn
        advanceToNextTankTurn(simState);
        simState.phase = 'sand';
      }
      break;

    case 'explosions':
      // Process explosions
      Explosions.update(simState);

      // Count down explosion duration
      simState.explosionDuration--;

      // When explosion duration is complete, move to sand phase
      if (simState.explosionDuration <= 0) {
        // Advance to the next tank's turn after an explosion
        advanceToNextTankTurn(simState);
        simState.phase = 'sand';
        // Clear explosions after they're done
        simState.explosions = [];
      }
      break;

    case 'sand':
      const sandMoved = Sand.update(simState);
      if (!sandMoved) {
        // Sand has settled
        // If there are no missiles, go back to idle phase
        if (simState.missiles.length === 0) {
          simState.phase = 'idle';
        } else {
          simState.phase = 'missiles';
        }
      }
      break;

    case 'idle':
      // Generate random missiles and transition to missile phase
      simState.phase = 'tanks';
      break;

    case 'tanks':
      // Update tank positions and check for collisions
      const allTanksOnSand = Tanks.update(simState);
      // Only move to control phase when all tanks have landed on sand
      if (allTanksOnSand) {
        // Make sure we have a valid current tank that's alive
        if (
          simState.currentTankIndex !== undefined &&
          simState.tanks[simState.currentTankIndex] &&
          simState.tanks[simState.currentTankIndex].health > 0
        ) {
          // Move to the control phase to let player aim the current tank
          simState.phase = 'control';
        } else {
          // Current tank is dead, advance to next alive tank
          simState.currentTankIndex = findNextAliveTank(
            simState,
            simState.currentTankIndex ?? -1
          );
          if (simState.currentTankIndex !== undefined) {
            simState.phase = 'control';
          }
          // If no alive tanks, game over check will handle it
        }
      }
      break;

    case 'control':
      // Handle tank control phase
      updateTankControl(simState);
      break;

    case 'gameover':
      // Game over - do nothing, just display the results
      break;
  }

  // Check for game over condition after each update
  checkGameOverCondition(simState);
}

/**
 * Advance to the next tank's turn
 */
function advanceToNextTankTurn(simState: SimulationState): void {
  if (simState.tanks.length === 0) {
    return; // No tanks to advance
  }

  // If no current tank index is set, start with the first alive tank
  if (simState.currentTankIndex === undefined) {
    simState.currentTankIndex = findNextAliveTank(simState, -1);
    return;
  }

  // Advance to the next alive tank (with wrap-around)
  simState.currentTankIndex = findNextAliveTank(
    simState,
    simState.currentTankIndex
  );
}

/**
 * Find the next tank with health > 0, starting from the given index
 */
function findNextAliveTank(
  simState: SimulationState,
  startIndex: number
): number | undefined {
  const aliveTanks = simState.tanks.filter((tank) => tank.health > 0);
  if (aliveTanks.length === 0) {
    return undefined;
  }

  // Find the next alive tank starting from startIndex + 1
  for (let i = 1; i <= simState.tanks.length; i++) {
    const nextIndex = (startIndex + i) % simState.tanks.length;
    if (simState.tanks[nextIndex].health > 0) {
      return nextIndex;
    }
  }

  return undefined; // This should never happen if aliveTanks.length > 0
}

/**
 * Check if the game should end and transition to game over state
 */
function checkGameOverCondition(simState: SimulationState): void {
  // Don't check for game over if we're already in game over state
  if (simState.phase === 'gameover') {
    return;
  }

  // Count tanks with health > 0
  const aliveTanks = simState.tanks.filter((tank) => tank.health > 0);

  // Game over conditions:
  // 1. No tanks have health remaining (stalemate)
  // 2. Only one tank has health remaining (winner)
  if (aliveTanks.length <= 1) {
    simState.phase = 'gameover';

    // Set the current tank index to the winner (if any)
    if (aliveTanks.length === 1) {
      const winnerIndex = simState.tanks.findIndex((tank) => tank.health > 0);
      simState.currentTankIndex = winnerIndex;
    } else {
      // Stalemate - no winner
      simState.currentTankIndex = undefined;
    }
  }
}

/**
 * Update tank control phase - handle player input for aiming
 */
function updateTankControl(simState: SimulationState): void {
  if (
    simState.currentTankIndex === undefined ||
    !simState.tanks[simState.currentTankIndex]
  ) {
    return;
  }

  const currentTank = simState.tanks[simState.currentTankIndex];
  const ANGLE_SPEED = 0.03; // Radians per frame (adjust for sensitivity)
  const POWER_SPEED = 2.0; // Power units per frame

  // Handle left/right arrow keys for turret rotation
  if (keys.left) {
    currentTank.angle -= ANGLE_SPEED;
  }
  if (keys.right) {
    currentTank.angle += ANGLE_SPEED;
  }

  // Handle up/down arrow keys for power adjustment
  if (keys.up) {
    currentTank.power = Math.min(100, currentTank.power + POWER_SPEED);
  }
  if (keys.down) {
    currentTank.power = Math.max(10, currentTank.power - POWER_SPEED);
  }

  // Clamp angle to reasonable firing range (upwards directions)
  // Allow from Pi to 2 Pi
  currentTank.angle = Math.max(
    Math.PI,
    Math.min(2 * Math.PI, currentTank.angle)
  );

  // Handle space key for firing
  if (keyPressed.space) {
    keyPressed.space = false; // Reset the press flag

    // Fire missile from current tank
    Missiles.fireMissileFromTank(simState, simState.currentTankIndex);

    // Move to missiles phase
    simState.phase = 'missiles';
  }
}

/**
 * Render the simulation to the canvas
 */
function render(
  simState: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  // Clear the canvas
  ctx.clearRect(0, 0, WIDTH * 2, HEIGHT * 2);

  // Render each system
  Sand.render(simState, ctx);
  Wind.render(simState, ctx);
  Tanks.render(simState, ctx);
  Missiles.render(simState, ctx);
  Explosions.render(simState, ctx);

  // Render HUD last so it appears on top
  HUD.render(simState, ctx);

  // Draw phase indicator for debugging
  if (DEBUG) {
    ctx.save();
    ctx.scale(2, 2);
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Phase: ${simState.phase}`, 10, 20);
    ctx.fillText(`Missiles: ${simState.missiles.length}`, 10, 40);
    ctx.fillText(`Tanks: ${simState.tanks.length}`, 10, 60);

    // Display current tank turn information
    if (simState.tanks.length > 0 && simState.currentTankIndex !== undefined) {
      ctx.fillText(
        `Current tank: ${simState.currentTankIndex + 1}/${simState.tanks.length}`,
        10,
        80
      );
    }

    // Display wind strength with direction indicator
    const windDirection =
      simState.wind > 0 ? '→' : simState.wind < 0 ? '←' : '-';
    ctx.fillText(
      `Wind: ${windDirection} ${Math.abs(simState.wind).toFixed(3)}`,
      10,
      100
    );
    if (simState.phase === 'explosions') {
      ctx.fillText(`Explosion Time: ${simState.explosionDuration}`, 10, 120);
    }
    if (simState.phase === 'control') {
      ctx.fillText(`Controls: ← → to aim, SPACE to fire`, 10, 140);
    }
    ctx.restore();
  }
}
