// Types and interfaces shared across the simulation
export const WIDTH = 1024 / 2;
export const HEIGHT = 768 / 2;
export const DEBUG = false; // Set to true to show debug information

// Simulation phases
export type SimulationPhase = 'missiles' | 'explosions' | 'sand' | 'idle';

export interface Missile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  explosionRadius: number;
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
}

export interface SimulationState {
  phase: SimulationPhase;
  missiles: Missile[];
  explosions: Explosion[];
  explosionDuration: number; // Number of frames to show the explosion
  wind: number; // Wind strength (positive = right, negative = left)
  sand: Uint8Array;
  nextSand: Uint8Array;
}
