import { type SimulationState, DEBUG, WIDTH, HEIGHT } from './types';
import * as Sand from './systems/sand';
import * as Missiles from './systems/missiles';
import * as Explosions from './systems/explosions';
import * as Wind from './systems/wind';
import * as Tanks from './systems/tanks';
import './style.css';

const FRAME_RATE = 60;
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
      // Only move to missiles phase when all tanks have landed on sand
      if (allTanksOnSand) {
        // Fire a missile from the current tank
        if (simState.currentTankIndex !== undefined) {
          Missiles.fireMissileFromTank(simState, simState.currentTankIndex);

          // Move to the missiles phase
          simState.phase = 'missiles';

          // After missile phase completes, advance to next tank's turn
          // This happens in the missiles phase completion
        }
      }
      break;
  }
}

/**
 * Advance to the next tank's turn
 */
function advanceToNextTankTurn(simState: SimulationState): void {
  if (simState.tanks.length === 0) {
    return; // No tanks to advance
  }

  // If no current tank index is set, start with the first tank
  if (simState.currentTankIndex === undefined) {
    simState.currentTankIndex = 0;
    return;
  }

  // Advance to the next tank (with wrap-around)
  simState.currentTankIndex =
    (simState.currentTankIndex + 1) % simState.tanks.length;
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
    ctx.restore();
  }
}
