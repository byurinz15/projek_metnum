import { evaluate } from 'mathjs';
import { IterationResult, CalculationOutcome } from '../types';

/**
 * Mengevaluasi ekspresi f(x) dengan nilai x tertentu menggunakan mathjs.
 */
export function evaluateF(fxString: string, xValue: number): number {
  try {
    const scope = { x: xValue };
    const result = evaluate(fxString, scope);
    
    if (typeof result === 'number') {
      return result;
    }
    
    if (result && typeof result === 'object' && 'toNumber' in result) {
      return (result as any).toNumber();
    }
    
    const parsed = parseFloat(result);
    if (isNaN(parsed)) {
      throw new Error('Hasil evaluasi bukan berupa angka berkelanjutan (NaN)');
    }
    return parsed;
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Kesalahan parsing atau sintaks fungsi f(x)'
    );
  }
}

/**
 * Menjalankan algoritma Bisection Method.
 */
export function runBisection(
  formula: string,
  aInput: number,
  bInput: number,
  tolerance: number,
  maxIterations: number
): CalculationOutcome {
  // Hard limit pengaman
  const ITERATION_HARD_LIMIT = 100;
  const maxIters = Math.min(maxIterations, ITERATION_HARD_LIMIT);

  if (aInput >= bInput) {
    return {
      root: null,
      valF: null,
      iterations: 0,
      status: 'error',
      message: 'Batas bawah (a) harus lebih kecil dibanding batas atas (b).',
      results: []
    };
  }

  // Uji evaluasi fungsi awal
  let fa: number, fb: number;
  try {
    fa = evaluateF(formula, aInput);
    fb = evaluateF(formula, bInput);
  } catch (err) {
    return {
      root: null,
      valF: null,
      iterations: 0,
      status: 'error',
      message: `Error saat mengevaluasi batas awal: ${err instanceof Error ? err.message : String(err)}`,
      results: []
    };
  }

  if (isNaN(fa) || isNaN(fb)) {
    return {
      root: null,
      valF: null,
      iterations: 0,
      status: 'error',
      message: 'Hasil f(a) atau f(b) menghasilkan nilai tidak valid (NaN).',
      results: []
    };
  }

  // Cek f(a) * f(b) < 0
  const product = fa * fb;
  if (product >= 0) {
    return {
      root: null,
      valF: null,
      iterations: 0,
      status: 'error',
      message: `f(a) [${fa.toFixed(6)}] dan f(b) [${fb.toFixed(6)}] harus memiliki tanda berlawanan (f(a) * f(b) < 0) agar metode Bisection dapat digunakan.`,
      results: []
    };
  }

  const results: IterationResult[] = [];
  let currentA = aInput;
  let currentB = bInput;
  let lastC: number | null = null;
  let converged = false;
  let finalStatus: 'converged' | 'max_reached' | 'error' = 'max_reached';
  let message = '';

  for (let r = 1; r <= maxIters; r++) {
    const c = (currentA + currentB) / 2;
    
    let evaluatedFA: number;
    let evaluatedFB: number;
    let evaluatedFC: number;

    try {
      evaluatedFA = evaluateF(formula, currentA);
      evaluatedFB = evaluateF(formula, currentB);
      evaluatedFC = evaluateF(formula, c);
    } catch (err) {
      return {
        root: null,
        valF: null,
        iterations: r - 1,
        status: 'error',
        message: `Error evaluasi di iterasi ke-${r}: ${err instanceof Error ? err.message : String(err)}`,
        results
      };
    }

    // Hitung lebar interval sebelum update
    const widthBefore = currentB - currentA;

    // Hitung error relatif e_a = |c_baru - c_lama| / |c_baru|
    let relativeError: number | null = null;
    if (lastC !== null && c !== 0) {
      relativeError = Math.abs(c - lastC) / Math.abs(c);
    }

    // Tentukan interval baru
    // f(a) * f(c) < 0 => interval baru adalah (a, c) ditulis "(a,c)"
    // jika diskordansi tanda di b, interval baru (c, b) ditulis "(c,b)"
    const fProduct = evaluatedFA * evaluatedFC;
    const newIntervalLabel = fProduct < 0 ? '(a,c)' : '(c,b)';

    // Simpan history
    results.push({
      r,
      a: currentA,
      b: currentB,
      c,
      fa: evaluatedFA,
      fb: evaluatedFB,
      fc: evaluatedFC,
      newInterval: newIntervalLabel,
      width: widthBefore,
      relativeError
    });

    // Cek kriteria konvergensi
    // 1. Error relatif < toleransi (mulai iterasi ke-2 jika relativeError tidak null)
    const isErrorUnderTol = relativeError !== null && relativeError < tolerance;
    // 2. f(c) mendekati 0 mutlak
    const isValueCloseToZero = Math.abs(evaluatedFC) < 1e-12; // f(c) mendekati 0 sangat presisi

    if (isErrorUnderTol || isValueCloseToZero) {
      converged = true;
      finalStatus = 'converged';
      if (isErrorUnderTol && isValueCloseToZero) {
        message = `Konvergen! Nilai error relatif (${relativeError?.toExponential(4)}) berada di bawah toleransi (${tolerance}) dan f(akar) [${evaluatedFC.toExponential(4)}] mendekati nol.`;
      } else if (isErrorUnderTol) {
        message = `Konvergen! Nilai error relatif (${relativeError?.toExponential(4)}) berada di bawah toleransi (${tolerance}).`;
      } else {
        message = `Konvergen! Nilai f(akar) [${evaluatedFC.toExponential(4)}] mendekati nol (< 1e-12).`;
      }
      break;
    }

    // Update interval
    if (fProduct < 0) {
      currentB = c;
    } else {
      currentA = c;
    }

    lastC = c;
  }

  if (!converged) {
    message = `Iterasi dihentikan karena mencapai jumlah maksimum iterasi (${maxIters}) tanpa memenuhi kriteria konvergensi.`;
  }

  const finalResult = results[results.length - 1];

  return {
    root: finalResult ? finalResult.c : null,
    valF: finalResult ? finalResult.fc : null,
    iterations: results.length,
    status: finalStatus,
    message,
    results
  };
}
