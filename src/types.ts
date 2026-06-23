export interface IterationResult {
  r: number;
  a: number;
  b: number;
  c: number;
  fa: number;
  fb: number;
  fc: number;
  newInterval: string;
  width: number;
  relativeError: number | null;
}

export interface Preset {
  name: string;
  formula: string;
  a: number;
  b: number;
  tolerance: number;
  maxIterations: number;
}

export interface CalculationOutcome {
  root: number | null;
  valF: number | null;
  iterations: number;
  status: 'converged' | 'max_reached' | 'error' | 'idle';
  message: string;
  results: IterationResult[];
}
