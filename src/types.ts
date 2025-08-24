// Types and interfaces shared across the simulation
export const WIDTH = 1024 / 2;
export const HEIGHT = 768 / 2;
export const DEBUG = false; // Set to true to show debug information

// Simulation phases
export type SimulationPhase =
  | 'missiles'
  | 'explosions'
  | 'sand'
  | 'tanks'
  | 'idle';

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

export interface Tank {
  x: number; // X position
  y: number; // Y position (starts negative, above the visible area)
  angle: number; // Angle in radians that the turret is pointing
  color: string; // CSS color string for the tank
}

export interface SimulationState {
  phase: SimulationPhase;
  missiles: Missile[];
  explosions: Explosion[];
  explosionDuration: number; // Number of frames to show the explosion
  wind: number; // Wind strength (positive = right, negative = left)
  sand: Uint8Array;
  tanks: Tank[]; // Array of tanks in the simulation
  currentTankIndex?: number; // Index of the tank whose turn it is currently
}
