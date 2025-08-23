const WIDTH = 1024 / 2;
const HEIGHT = 768 / 2;

// Simulation phases
type SimulationPhase = 'missiles' | 'explosions' | 'sand' | 'idle';

interface Missile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  explosionRadius: number;
}

interface SimulationState {
  phase: SimulationPhase;
  missiles: Array<Missile>;
  explosions: Array<{ x: number; y: number; radius: number }>;
  explosionDuration: number; // Number of frames to show the explosion
  sand: Uint8Array;
  nextSand: Uint8Array;
}

export function init(canvas: HTMLCanvasElement) {
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
    sand: new Uint8Array(WIDTH * HEIGHT),
    nextSand: new Uint8Array(WIDTH * HEIGHT),
  };

  // Initialize the sand
  initialiseSand(simState.sand);

  let token: number | undefined;
  function resume() {
    if (token != undefined) {
      clearInterval(token);
    }

    token = setInterval(() => {
      updateSimulation(simState);
    }, 1000 / 60);
  }

  const renderLoop = () => {
    render(simState, ctx);
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);
  resume();
}

// Phase management system
function updateSimulation(simState: SimulationState) {
  switch (simState.phase) {
    case 'missiles':
      // Simulate missile physics and check for collisions
      const collisionDetected = updateMissiles(simState);

      // If there was a collision or no missiles left, move to next phase
      if (collisionDetected) {
        simState.phase = 'explosions';
        simState.explosionDuration = 30; // Show explosions for 30 frames (about 0.5 seconds at 60fps)
      } else if (simState.missiles.length === 0) {
        simState.phase = 'sand';
      }
      break;

    case 'explosions':
      // First frame of explosions - process all explosions to remove sand
      if (simState.explosionDuration === 30) {
        processExplosions(simState);
      }

      // Count down explosion duration
      simState.explosionDuration--;

      // When explosion duration is complete, move to sand phase
      if (simState.explosionDuration <= 0) {
        simState.phase = 'sand';
        // Clear explosions after they're done
        simState.explosions = [];
      }
      break;

    case 'sand':
      const sandMoved = updateSand(simState.sand, simState.nextSand);
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
      generateRandomMissiles(simState);
      if (simState.missiles.length > 0) {
        simState.phase = 'missiles';
      }
      break;
  }
}

// Extracted sand simulation function
function updateSand(state: Uint8Array, nextState: Uint8Array): boolean {
  // Clear the next state buffer
  nextState.fill(0);

  let changed = false;

  // Update the state of the application
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const S = state[y * WIDTH + x];
      if (!S) {
        continue;
      }

      const left =
        y < HEIGHT - 1 && x > 0 ? state[(y + 1) * WIDTH + (x - 1)] : 1;
      const middle = y < HEIGHT - 1 ? state[(y + 1) * WIDTH + x] : 1;
      const right =
        y < HEIGHT - 1 && x < WIDTH - 1 ? state[(y + 1) * WIDTH + (x + 1)] : 1;

      if (left && middle && right) {
        // we're sand but we can't fall - stay in place
        nextState[y * WIDTH + x] = 255;
        continue;
      }

      changed = true;
      // we're sand and we're falling straight down
      if (!middle) {
        nextState[(y + 1) * WIDTH + x] = 255;
        continue;
      }

      if (!(left || right)) {
        if (Math.random() < 0.5) {
          nextState[(y + 1) * WIDTH + (x - 1)] = 255;
        } else {
          nextState[(y + 1) * WIDTH + (x + 1)] = 255;
        }
        continue;
      }

      // we're sand and we're falling left
      if (!left) {
        nextState[(y + 1) * WIDTH + (x - 1)] = 255;
        continue;
      }

      // we're sand and we're falling right
      if (!right) {
        nextState[(y + 1) * WIDTH + (x + 1)] = 255;
        continue;
      }
    }
  }
  // Copy nextState back to state
  state.set(nextState);
  return changed;
}

// Function to generate random missiles
function generateRandomMissiles(simState: SimulationState) {
  // Clear any existing missiles
  simState.missiles = [];

  // Decide on the number of missiles to generate (1-3 missiles)
  const missileCount = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < missileCount; i++) {
    // Generate random positions at the top of the screen
    const x = Math.random() * WIDTH;
    const y = 10; // Start near the top

    // Random velocities - mostly downward with some sideways motion
    const vx = (Math.random() - 0.5) * 5; // -2.5 to 2.5 pixels per frame
    const vy = Math.random() * 2 + 2; // 2 to 4 pixels per frame downward

    // Random explosion radius
    const explosionRadius = Math.random() * 60 + 10; // 0 to 50 pixels

    // Add the missile to the simulation state
    simState.missiles.push({
      x,
      y,
      vx,
      vy,
      explosionRadius,
    });
  }
}

// Function to update missile positions and check for collisions
function updateMissiles(simState: SimulationState): boolean {
  const gravity = 0.2; // Gravity constant (pixels per frame^2)
  let collisionDetected = false;
  const explosionsToCreate: Array<{ x: number; y: number; radius: number }> =
    [];

  // Update each missile's position using Newtonian physics
  simState.missiles = simState.missiles.filter((missile) => {
    // Apply gravity
    missile.vy += gravity;

    // Update position
    missile.x += missile.vx;
    missile.y += missile.vy;

    // Check for out of bounds
    if (missile.x < 0 || missile.x >= WIDTH || missile.y >= HEIGHT) {
      return false; // Remove missile if it goes out of bounds
    }

    // Check for collision with sand
    const sandIndex = Math.floor(missile.y) * WIDTH + Math.floor(missile.x);
    if (
      sandIndex >= 0 &&
      sandIndex < simState.sand.length &&
      simState.sand[sandIndex] > 0
    ) {
      // Collision detected!
      explosionsToCreate.push({
        x: missile.x,
        y: missile.y,
        radius: missile.explosionRadius,
      });
      collisionDetected = true;
      return false; // Remove this missile
    }

    return true; // Keep this missile
  });

  // Add any explosions from collisions
  simState.explosions = explosionsToCreate;

  return collisionDetected;
}

// Function to process explosions and remove sand within the explosion radius
function processExplosions(simState: SimulationState) {
  // Process each explosion
  for (const explosion of simState.explosions) {
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
          simState.sand[index] = 0;
        }
      }
    }
  }
}

function sin(x: number): number {
  return Math.sin((x / WIDTH) * Math.PI * 2);
}

function initialiseSand(state: Uint8Array) {
  let heights = [] as number[];
  for (let x = 0; x < WIDTH; x++) {
    heights[x] = 0;
    heights[x] += 1 * sin(x * 3);
    heights[x] += 0.7 * sin(x * 7);
    heights[x] += 0.5 * sin(x * 11);
    heights[x] += 0.2 * sin(x * 13);
    heights[x] += 1.7;
    heights[x] /= 3;
  }

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x;
      // Initialize the state with a sine wave pattern
      state[index] =
        Math.random() > 0.4 && (y * 7) / HEIGHT > heights[x] ? 255 : 0;
    }
  }
}

function render(simState: SimulationState, ctx: CanvasRenderingContext2D) {
  const { sand, missiles, explosions } = simState;

  // Clear the canvas
  ctx.clearRect(0, 0, WIDTH * 2, HEIGHT * 2);

  // Render the sand
  const imageData = ctx.createImageData(WIDTH * 2, HEIGHT * 2);
  for (let y = 0; y < HEIGHT * 2; y++) {
    for (let x = 0; x < WIDTH * 2; x++) {
      const i = 4 * (y * 2 * WIDTH + x);
      const yy = Math.floor(y / 2);
      const xx = Math.floor(x / 2);
      const j = yy * WIDTH + xx;
      imageData.data[i] = sand[j] ? 220 : 100; // Red
      imageData.data[i + 1] = sand[j] ? 200 : 150; // Green
      imageData.data[i + 2] = sand[j] ? 120 : 200; // Blue
      imageData.data[i + 3] = 255; // Alpha
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Render missiles
  ctx.save();
  ctx.scale(2, 2); // Scale to match the sand rendering

  for (const missile of missiles) {
    // Map explosion radius to a color hue
    // Smaller radius (20) -> red (0)
    // Larger radius (50) -> blue (240)
    const minRadius = 20;
    const maxRadius = 50;
    const hue = 240 - Math.min(240, Math.max(0, 
      240 * (missile.explosionRadius - minRadius) / (maxRadius - minRadius)
    ));
    
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

  // Render explosions
  for (const explosion of explosions) {
    // Draw explosion radius
    // In explosions phase, make them more vibrant and orange
    if (simState.phase === 'explosions') {
      // Calculate intensity based on remaining duration (brighter at start)
      const intensity = simState.explosionDuration / 30;
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

  // Draw phase indicator for debugging
  ctx.fillStyle = 'white';
  ctx.font = '12px Arial';
  ctx.fillText(`Phase: ${simState.phase}`, 10, 20);
  ctx.fillText(`Missiles: ${missiles.length}`, 10, 40);
  if (simState.phase === 'explosions') {
    ctx.fillText(`Explosion Time: ${simState.explosionDuration}`, 10, 60);
  }

  ctx.restore();
}
