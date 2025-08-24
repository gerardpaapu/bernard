/* eslint-disable @typescript-eslint/no-unused-vars */
import { type SimulationState, WIDTH, HEIGHT } from '../types';

/**
 * HUD (Heads-Up Display) system - renders game information overlay
 */

/**
 * Initialize the HUD system (no initialization needed)
 */
export function init(_state: SimulationState): void {
  // No initialization required for HUD
}

/**
 * Render the HUD overlay to the canvas
 */
export function render(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  renderHUD(state, ctx);
}

/**
 * Render the HUD information
 */
function renderHUD(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  ctx.save();

  // Handle game over state
  if (state.phase === 'gameover') {
    renderGameOverScreen(state, ctx);
    ctx.restore();
    return;
  }

  // Only show normal HUD if we have tanks and a current tank
  if (!state.tanks.length || state.currentTankIndex === undefined) {
    ctx.restore();
    return;
  }

  const currentTank = state.tanks[state.currentTankIndex];
  if (!currentTank) {
    ctx.restore();
    return;
  }

  // Set up HUD styling
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Semi-transparent background for better readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 300, 120);

  // Border for the HUD panel
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 300, 120);

  // Title
  ctx.fillStyle = 'white';
  ctx.fillText(
    `Tank ${state.currentTankIndex + 1}/${state.tanks.length}`,
    20,
    25
  );

  // Tank angle (convert from radians to degrees for display)
  const angleDegrees = Math.round((currentTank.angle * 180) / Math.PI);
  ctx.fillText(`Angle: ${angleDegrees}°`, 20, 50);

  // Tank power
  ctx.fillText(`Power: ${Math.round(currentTank.power)}%`, 20, 70);

  // Tank health with color coding
  const healthColor = getHealthColor(currentTank.health);
  ctx.fillStyle = healthColor;
  ctx.fillText(`Health: ${Math.round(currentTank.health)}`, 20, 90);

  // Wind information
  ctx.fillStyle = 'white';
  const windDirection = state.wind > 0 ? '→' : state.wind < 0 ? '←' : '-';
  const windStrength = Math.abs(state.wind);
  let windDescription = '';

  if (windStrength < 0.1) {
    windDescription = 'Calm';
  } else if (windStrength < 0.3) {
    windDescription = 'Light';
  } else if (windStrength < 0.6) {
    windDescription = 'Moderate';
  } else if (windStrength < 1.0) {
    windDescription = 'Strong';
  } else {
    windDescription = 'Very Strong';
  }

  ctx.fillText(
    `Wind: ${windDirection} ${windDescription} (${windStrength.toFixed(2)})`,
    20,
    110
  );

  // Show health bars for all tanks
  renderTankHealthBars(state, ctx);

  ctx.restore();
}

/**
 * Get color based on health percentage
 */
function getHealthColor(health: number): string {
  if (health > 70) {
    return '#4CAF50'; // Green
  } else if (health > 40) {
    return '#FF9800'; // Orange
  } else if (health > 20) {
    return '#FF5722'; // Red-orange
  } else {
    return '#F44336'; // Red
  }
}

/**
 * Render health bars for all tanks at the bottom of the screen
 */
function renderTankHealthBars(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  const barWidth = 60;
  const barHeight = 8;
  const spacing = 10;
  const startX = 20;
  const startY = HEIGHT * 2 - 40; // Bottom of the scaled canvas

  ctx.font = '12px Arial';
  ctx.textAlign = 'center';

  for (let i = 0; i < state.tanks.length; i++) {
    const tank = state.tanks[i];
    const x = startX + i * (barWidth + spacing);

    // Background bar
    ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
    ctx.fillRect(x, startY, barWidth, barHeight);

    // Health bar
    const healthWidth = (tank.health / 100) * barWidth;
    ctx.fillStyle = getHealthColor(tank.health);
    ctx.fillRect(x, startY, healthWidth, barHeight);

    // Border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, startY, barWidth, barHeight);

    // Tank number and highlight current tank
    ctx.fillStyle = i === state.currentTankIndex ? 'yellow' : 'white';
    ctx.fillText(`T${i + 1}`, x + barWidth / 2, startY - 5);

    // Health percentage
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.fillText(
      `${Math.round(tank.health)}`,
      x + barWidth / 2,
      startY + barHeight + 12
    );
  }
}

/**
 * Render the game over screen
 */
function renderGameOverScreen(
  state: SimulationState,
  ctx: CanvasRenderingContext2D
): void {
  // Full screen overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, WIDTH * 2, HEIGHT * 2);

  // Game Over title
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', WIDTH, HEIGHT - 50);

  // Determine winner or stalemate
  const aliveTanks = state.tanks.filter((tank) => tank.health > 0);

  if (aliveTanks.length === 0) {
    // Stalemate
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('STALEMATE', WIDTH, HEIGHT + 20);

    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.fillText('No tanks survived!', WIDTH, HEIGHT + 60);
  } else if (aliveTanks.length === 1) {
    // Winner
    const winnerIndex = state.tanks.findIndex((tank) => tank.health > 0);
    const winner = state.tanks[winnerIndex];

    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`TANK ${winnerIndex + 1} WINS!`, WIDTH, HEIGHT + 20);

    // Show winner's tank color
    ctx.fillStyle = winner.color;
    ctx.fillText('●', WIDTH, HEIGHT + 60);

    ctx.fillStyle = '#FFF';
    ctx.font = '18px Arial';
    ctx.fillText(
      `Final Health: ${Math.round(winner.health)}`,
      WIDTH,
      HEIGHT + 90
    );
  }

  // Instructions to restart (if we want to add that later)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '16px Arial';
  ctx.fillText('Refresh page to play again', WIDTH, HEIGHT + 140);
}
