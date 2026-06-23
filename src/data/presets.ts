import { Preset } from '../types';

export const equationPresets: Preset[] = [
  {
    name: 'Formula 1: exp(x) - 5*x^2',
    formula: 'exp(x) - 5*x^2',
    a: 0.0,
    b: 1.0,
    tolerance: 0.0001,
    maxIterations: 50,
  },
  {
    name: 'Formula 2: x^3 - x - 2',
    formula: 'x^3 - x - 2',
    a: 1.0,
    b: 2.0,
    tolerance: 0.0001,
    maxIterations: 50,
  },
  {
    name: 'Formula 3: cos(x) - x',
    formula: 'cos(x) - x',
    a: 0.0,
    b: 1.0,
    tolerance: 0.0001,
    maxIterations: 50,
  },
  {
    name: 'Formula 4: ln(x) - 1',
    formula: 'log(x) - 1', // log(x) in mathjs is natural logarithm
    a: 2.0,
    b: 3.5,
    tolerance: 0.0001,
    maxIterations: 50,
  },
];
