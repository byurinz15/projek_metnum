import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, HelpCircle, FileDown, Info, RotateCcw, FunctionSquare, X, AlertTriangle } from 'lucide-react';
import { runBisection, evaluateF, formatNumeric } from './utils/bisection';
import { CalculationOutcome } from './types';
import FunctionChart from './components/FunctionChart';

export default function App() {
  useEffect(() => {
    document.title = 'Bisectify - Kalkulator Metode Bisection';
  }, []);

  // DOM References for scrolling
  const chartSectionRef = useRef<HTMLDivElement>(null);
  const tableSectionRef = useRef<HTMLElement>(null);

  // Input states
  const [formula, setFormula] = useState<string>('');
  const [aInput, setAInput] = useState<string>('');
  const [bInput, setBInput] = useState<string>('');
  const [toleranceInput, setToleranceInput] = useState<string>('');
  const [maxIterationsInput, setMaxIterationsInput] = useState<string>('');

  // Visualization states
  const [renderedFormula, setRenderedFormula] = useState<string>('');
  const [renderedPlotMin, setRenderedPlotMin] = useState<number>(-5.0);
  const [renderedPlotMax, setRenderedPlotMax] = useState<number>(5.0);
  const [plotError, setPlotError] = useState<string | null>(null);

  // Calculation state initialized with default run
  const [outcome, setOutcome] = useState<CalculationOutcome>({
    root: null,
    valF: null,
    iterations: 0,
    status: 'idle',
    message: 'Belum ada komputasi. Silakan masukkan formula dan batas interval.',
    results: []
  });

  // Local helper states
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  // Real-time check if formula is mathematically valid under simple check
  const handleFormulaChange = (val: string) => {
    setFormula(val);
    if (!val.trim()) {
      setFormulaError('Fungsi atau rumus tidak boleh kosong.');
      return;
    }
    try {
      // Test evaluate for single number to check syntactic parsing
      evaluateF(val, 1);
      setFormulaError(null);
    } catch {
      setFormulaError('Format ekspresi salah (periksa operator seperti * dan ^)');
    }
  };

  // Visualize function chart over custom ranges
  const handleVisualize = () => {
    if (!formula.trim()) {
      setPlotError('Fungsi atau rumus tidak boleh kosong.');
      return;
    }
    
    // Auto-calculate bounds based on interval bounds a & b
    let pMin = -5;
    let pMax = 5;
    const valA = parseFloat(aInput);
    const valB = parseFloat(bInput);

    if (!isNaN(valA) && !isNaN(valB)) {
      const margin = Math.max(1, Math.abs(valB - valA) * 0.5);
      pMin = Math.min(valA, valB) - margin;
      pMax = Math.max(valA, valB) + margin;
    }

    try {
      // Test parse
      evaluateF(formula, pMin);
      evaluateF(formula, (pMin + pMax) / 2);
      evaluateF(formula, pMax);
      
      setRenderedFormula(formula);
      setRenderedPlotMin(pMin);
      setRenderedPlotMax(pMax);
      setPlotError(null);

      // Smooth scroll to chart visualization
      setTimeout(() => {
        chartSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } catch (err: any) {
      setPlotError(`Kesalahan sintaks fungsi: ${err.message}`);
    }
  };

  // Run calculation
  const handleCalculate = () => {
    const errorPrefix = 'Parameter tidak valid';
    const aVal = parseFloat(aInput);
    const bVal = parseFloat(bInput);
    const tolVal = parseFloat(toleranceInput);
    const maxIters = parseInt(maxIterationsInput, 10);

    // Dynamic numeric checks
    if (isNaN(aVal) || isNaN(bVal)) {
      const msg = 'Batas bawah (a) dan batas atas (b) harus diinput dengan nilai angka yang valid.';
      setOutcome({
        root: null,
        valF: null,
        iterations: 0,
        status: 'error',
        message: msg,
        results: []
      });
      setErrorModalMsg(msg);
      return;
    }

    if (isNaN(tolVal) || tolVal <= 0) {
      const msg = 'Nilai toleransi (ε) harus berupa angka positif yang lebih besar dari 0.';
      setOutcome({
        root: null,
        valF: null,
        iterations: 0,
        status: 'error',
        message: msg,
        results: []
      });
      setErrorModalMsg(msg);
      return;
    }

    if (isNaN(maxIters) || maxIters <= 0) {
      const msg = 'Jumlah maksimum iterasi harus berupa bilangan bulat positif.';
      setOutcome({
        root: null,
        valF: null,
        iterations: 0,
        status: 'error',
        message: msg,
        results: []
      });
      setErrorModalMsg(msg);
      return;
    }

    if (aVal >= bVal) {
      const msg = 'Batas bawah (a) harus bernilai lebih kecil daripada batas atas (b).';
      setOutcome({
        root: null,
        valF: null,
        iterations: 0,
        status: 'error',
        message: msg,
        results: []
      });
      setErrorModalMsg(msg);
      return;
    }

    try {
      // Test parsing f(a) & f(b) first
      evaluateF(formula, aVal);
    } catch (err: any) {
      const msg = `Sintaks matematika rusak: ${err.message}`;
      setOutcome({
        root: null,
        valF: null,
        iterations: 0,
        status: 'error',
        message: msg,
        results: []
      });
      setErrorModalMsg(msg);
      return;
    }

    const calculated = runBisection(formula, aVal, bVal, tolVal, maxIters);
    setOutcome(calculated);
    if (calculated.status === 'error') {
      setErrorModalMsg(calculated.message);
    } else {
      // Smooth scroll to table section
      setTimeout(() => {
        tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  // Reset inputs to original state
  const handleReset = () => {
    setFormula('');
    setAInput('');
    setBInput('');
    setToleranceInput('');
    setMaxIterationsInput('');
    setRenderedFormula('');
    setRenderedPlotMin(-5.0);
    setRenderedPlotMax(5.0);
    setFormulaError(null);
    setPlotError(null);
    setOutcome({
      root: null,
      valF: null,
      iterations: 0,
      status: 'idle',
      message: 'Belum ada komputasi. Silakan masukkan formula dan batas interval.',
      results: []
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (outcome.results.length === 0) return;
    
    // Headers matching reference image
    const headers = ['r', 'a', 'b', 'c', 'f(a)', 'f(b)', 'f(c)', 'Kalang baru', 'Lebar kalang', 'Error relatif'];
    
    const rows = outcome.results.map(row => [
      row.r,
      formatNumeric(row.a, true),
      formatNumeric(row.b, true),
      formatNumeric(row.c, true),
      formatNumeric(row.fa, true),
      formatNumeric(row.fb, true),
      formatNumeric(row.fc, true),
      // Wrap the interval label in quotes because it contains commas (e.g. "(c,b)" or "(a,c)")
      `"${row.newInterval}"`,
      formatNumeric(row.width, true),
      formatNumeric(row.relativeError, true)
    ]);
    
    // Using sep=, as the first line to guarantee that Microsoft Excel loads the file correctly with columns in all regions
    // Add UTF-8 BOM \ufeff at the start for proper character encoding support
    const csvContent = "sep=,\n" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bisection_hasil_${formula.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Safe variables for current bounds
  const currentA = parseFloat(aInput) || 0;
  const currentB = parseFloat(bInput) || 0;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 flex flex-col antialiased">
      {/* Navbar */}
      <nav id="top-navigation" className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-[#0f172a]/85 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <span className="material-symbols-outlined text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>function</span>
          </div>
          <div>
            <span className="font-sans text-lg font-bold text-white leading-snug tracking-tight">Bisectify</span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-mono tracking-wider text-cyan-400 bg-cyan-950/50 border border-cyan-500/10 px-2 py-0.5 rounded-full uppercase font-bold">Bisection Engine</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleReset}
            title="Reset Kalkulator"
            className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all px-3 py-1.5 rounded-lg duration-150 active:scale-95 flex items-center gap-2 border border-transparent hover:border-red-500/20 text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <main className="flex-1 w-full pt-20 pb-16 min-h-screen">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex flex-col gap-6">
          
          {/* Scientific Header banner */}
          <header className="border-b border-white/10 pb-5">
            <h1 className="font-sans text-3xl md:text-4xl text-white tracking-tight font-bold">
              Kalkulator Metode Bisection (Bagi-Dua)
            </h1>
            <p className="font-sans text-sm md:text-base text-slate-400 mt-1.5 max-w-4xl leading-relaxed">
              Sebuah metode numerik iteratif tertutup untuk mencari salah satu akar nyata dari fungsi kontinu f(x) = 0 pada rentang koordinat [a, b] dengan membagi selang secara bertahap hingga konvergensi presisi toleransi ε terpenuhi.
            </p>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* COLUMN 1: Config bento box (Left) */}
            <section className="xl:col-span-4 flex flex-col gap-6">
              <div className="glass-panel p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <h2 className="font-sans text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-400 font-semibold">tune</span>
                    Parameter Input
                  </h2>
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-500/20 px-2.5 py-0.5 rounded-md font-semibold">PRESISI TINGGI</span>
                </div>

                <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); handleCalculate(); }}>
                  
                  {/* f(x) Field */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="formula-input" className="font-sans text-[10px] uppercase font-bold text-slate-400 tracking-wider">FUNGSI f(x)</label>
                      <span className="text-[10px] text-slate-500 font-sans">Contoh: exp(x) - 5*x^2</span>
                    </div>
                    <div className="relative">
                      <input
                        id="formula-input"
                        type="text"
                        value={formula}
                        onChange={(e) => handleFormulaChange(e.target.value)}
                        placeholder="f(x) ="
                        className="academic-input w-full px-4 py-3 font-mono text-sm transition-all outline-none placeholder:text-[#22d3ee] placeholder:italic placeholder:font-semibold"
                      />
                    </div>
                    {formulaError ? (
                      <p className="text-xs text-rose-400 mt-1.5 font-sans flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {formulaError}
                      </p>
                    ) : (
                      <p className="text-[10.5px] text-slate-400 mt-1.5 font-sans leading-relaxed">
                        Operator matematika: <code className="font-mono bg-slate-900/60 text-cyan-300 px-1 py-0.5 rounded border border-white/5">+</code>, <code className="font-mono bg-slate-900/60 text-cyan-300 px-1 py-0.5 rounded border border-white/5">-</code>, <code className="font-mono bg-slate-900/60 text-cyan-300 px-1 py-0.5 rounded border border-white/5">*</code>, <code className="font-mono bg-slate-900/60 text-cyan-300 px-1 py-0.5 rounded border border-white/5">/</code>, <code className="font-mono bg-slate-900/60 text-cyan-300 px-1 py-0.5 rounded border border-white/5">^</code>, serta fungsi <code className="font-mono bg-slate-900/60 text-cyan-300 px-1 py-0.5 rounded border border-white/5">exp()</code>, <code className="font-mono bg-slate-900/60 text-cyan-300 px-1 py-0.5 rounded border border-white/5">cos()</code>, <code className="font-mono bg-slate-900/60 text-cyan-300 px-1 py-0.5 rounded border border-white/5">log()</code>.
                      </p>
                    )}
                  </div>

                  {/* Bounds inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="bound-a" className="font-sans text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">BATAS BAWAH (a)</label>
                      <input
                        id="bound-a"
                        type="number"
                        step="any"
                        value={aInput}
                        onChange={(e) => setAInput(e.target.value)}
                        className="academic-input w-full px-3 py-2.5 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="bound-b" className="font-sans text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">BATAS ATAS (b)</label>
                      <input
                        id="bound-b"
                        type="number"
                        step="any"
                        value={bInput}
                        onChange={(e) => setBInput(e.target.value)}
                        className="academic-input w-full px-3 py-2.5 font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Param convergence parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tolerance" className="font-sans text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">TOLERANSI (ε)</label>
                      <input
                        id="tolerance"
                        type="number"
                        step="any"
                        value={toleranceInput}
                        onChange={(e) => setToleranceInput(e.target.value)}
                        className="academic-input w-full px-3 py-2.5 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="max-iterations" className="font-sans text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">MAKS ITERASI</label>
                      <input
                        id="max-iterations"
                        type="number"
                        min="1"
                        max="100"
                        value={maxIterationsInput}
                        onChange={(e) => setMaxIterationsInput(e.target.value)}
                        className="academic-input w-full px-3 py-2.5 font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Submit buttons */}
                  <button
                    type="submit"
                    disabled={!!formulaError || !formula.trim()}
                    className={`mt-3 w-full text-white font-sans font-bold text-sm py-3 px-4 rounded-xl shadow-lg flex justify-center items-center gap-2 active:scale-[0.98] transition-all duration-150 cursor-pointer ${
                      !!formulaError || !formula.trim()
                        ? 'bg-slate-800 border border-white/5 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/25 border border-cyan-500/20'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Mulai Komputasi
                  </button>

                  {/* Static Validation status check */}
                  <div className="mt-1 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
                    <p className="font-sans text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
                      <span className="material-symbols-outlined text-[15px] text-cyan-400 mt-[2px] font-bold">info</span>
                      Metode Bisection mengharuskan f(a) dan f(b) memiliki nilai tanda berlawanan agar akar kontinu berada di tengahnya.
                    </p>
                  </div>
                </form>
              </div>

              {/* Informational Help Box */}
              <div className="glass-panel p-6 shadow-md">
                <h3 className="font-sans text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-base font-semibold">help_center</span>
                  Penjelasan Algoritma
                </h3>
                <ol className="text-xs text-slate-400 space-y-2.5 leading-relaxed list-decimal pl-4">
                  <li>Pilih interval [a, b] sehingga f(a) * f(b) &lt; 0.</li>
                  <li>Dapatkan titik tengah <code className="font-mono text-cyan-400 bg-slate-900 border border-white/5 px-1 rounded font-semibold">c = (a + b) / 2</code>.</li>
                  <li>Jika f(a) * f(c) &lt; 0, akar berada dalam interval baru [a, c]. Geser b = c.</li>
                  <li>Jika tidak, akar berada di interval [c, b]. Geser a = c.</li>
                  <li>Lakukan perulangan hingga <code className="font-mono text-cyan-400 bg-slate-900 border border-white/5 px-1 rounded font-semibold">|c_baru - c_lama| / |c_baru| &lt; ε</code> atau <code className="font-mono text-cyan-400 bg-slate-900 border border-white/5 px-1 rounded font-semibold">|f(c)| &lt; 1e-12</code>.</li>
                </ol>
              </div>
            </section>

            {/* COLUMN 2: Visual & Analytical Dashboard (Right) */}
            <main className="xl:col-span-8 flex flex-col gap-6">

              {/* Summary dashboard tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* ROOT */}
                <div className="glass-panel p-5 relative overflow-hidden group shadow-lg">
                  <div className="absolute top-2 right-2 opacity-10 scale-90 group-hover:opacity-15 transition-opacity">
                    <span className="material-symbols-outlined text-5xl text-cyan-400">my_location</span>
                  </div>
                  <h3 className="font-sans text-[10px] uppercase font-bold text-slate-500 tracking-wider">ESTIMASI AKAR (c)</h3>
                  <p className="font-mono text-2xl font-bold text-cyan-400 mt-1 tracking-tight">
                    {outcome.root !== null ? formatNumeric(outcome.root) : 'N/A'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-sans mt-1 block">Titik tengah c terakhir</span>
                </div>

                {/* f(ROOT) */}
                <div className="glass-panel p-5 relative overflow-hidden group shadow-lg">
                  <h3 className="font-sans text-[10px] uppercase font-bold text-slate-500 tracking-wider">RESIDU f(c)</h3>
                  <p className="font-mono text-2xl font-bold text-emerald-400 mt-1 tracking-tight">
                    {outcome.valF !== null ? formatNumeric(outcome.valF) : 'N/A'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-sans mt-1 block">Makin dekat ke 0 = makin presisi</span>
                </div>

                {/* ITERATIONS */}
                <div className="glass-panel p-5 relative overflow-hidden group shadow-lg">
                  <h3 className="font-sans text-[10px] uppercase font-bold text-slate-500 tracking-wider">TOTAL ITERASI</h3>
                  <p className="font-mono text-2xl font-bold text-orange-400 mt-1 tracking-tight">
                    {outcome.iterations}
                  </p>
                  <span className="text-[10px] text-slate-500 font-sans mt-1 block">Dari limit {maxIterationsInput} iterasi</span>
                </div>

                {/* CONVERGENCE STATUS */}
                <div className={`rounded-3xl border shadow-lg p-5 flex flex-col justify-between backdrop-blur-xl ${
                  outcome.status === 'converged' 
                    ? 'bg-cyan-500/10 border-cyan-500/20 text-white' 
                    : outcome.status === 'max_reached'
                      ? 'bg-amber-500/10 border-amber-500/20 text-white'
                      : outcome.status === 'idle'
                        ? 'bg-slate-500/5 border-slate-500/10 text-slate-300'
                        : 'bg-rose-500/10 border-rose-500/20 text-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-sans text-[10px] uppercase font-bold text-slate-500 tracking-wider">KONDISI</h3>
                    <span className={`material-symbols-outlined text-lg ${
                      outcome.status === 'converged' 
                        ? 'text-cyan-400' 
                        : outcome.status === 'max_reached' 
                          ? 'text-amber-400' 
                          : outcome.status === 'idle' 
                            ? 'text-slate-500' 
                            : 'text-rose-400'
                    }`}>
                      {outcome.status === 'converged' ? 'check_circle' : outcome.status === 'idle' ? 'help_outline' : 'timeline'}
                    </span>
                  </div>
                  <p className="font-sans text-sm font-bold mt-2">
                    {outcome.status === 'converged' && 'Konvergen'}
                    {outcome.status === 'max_reached' && 'Limit Tercapai'}
                    {outcome.status === 'error' && 'Gagal'}
                    {outcome.status === 'idle' && 'Belum ada komputasi'}
                  </p>
                  <span className="text-[10px] text-slate-400 font-sans block mt-1 leading-snug">
                    {outcome.status === 'converged' ? 'Toleransi ε dipenuhi' : outcome.status === 'idle' ? 'Menunggu input parameter' : 'Belum konvergen sempurna'}
                  </span>
                </div>
              </div>



              {/* Graphical Card Visualizer */}
              <div ref={chartSectionRef} className="glass-panel overflow-hidden shadow-2xl flex flex-col justify-between">
                <div className="px-6 py-4.5 border-b border-white/10 flex justify-between items-center bg-slate-900/15">
                  <h2 className="font-sans text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-400">monitoring</span>
                    Visualisasi Fungsi &amp; Batas Interval
                  </h2>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/40 border border-cyan-500/20 rounded-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <span className="font-mono text-[10px] text-cyan-300 uppercase font-bold">f(x)</span>
                  </div>
                </div>

                {/* Control Panel with Visualize Trigger only */}
                <div className="p-5 border-b border-white/10 bg-slate-900/10 flex items-center justify-center">
                  <button
                    id="btn-visualize-only"
                    type="button"
                    onClick={handleVisualize}
                    className={`w-full max-w-md text-white font-sans font-bold text-xs py-2.5 px-6 rounded-xl shadow-lg h-10 flex justify-center items-center gap-2 transform active:scale-[0.98] transition-all duration-150 cursor-pointer ${
                      formula !== renderedFormula 
                        ? 'bg-cyan-600 hover:bg-cyan-550 border border-cyan-400/20 shadow-cyan-900/40' 
                        : 'bg-slate-800 border border-white/10 hover:bg-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    Visualisasikan Fungsi f(x)
                  </button>
                </div>

                {/* Info & Error Banner for Plotting */}
                {plotError && (
                  <div className="mx-6 mt-4 p-3 bg-rose-950/45 border border-rose-500/25 rounded-xl flex items-center gap-2 text-rose-300 text-xs shadow-md">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{plotError}</span>
                  </div>
                )}
                
                {formula !== renderedFormula && !plotError && (
                  <div className="mx-6 mt-4 p-3 bg-cyan-950/20 border border-cyan-500/15 rounded-xl flex items-center gap-2 text-cyan-300 text-xs shadow-md">
                    <span className="material-symbols-outlined text-sm animate-bounce text-cyan-400 font-bold">info</span>
                    <span>f(x) telah diubah! Klik <strong className="text-cyan-400">"Visualisasikan Fungsi"</strong> untuk memplot rumus f(x) yang baru.</span>
                  </div>
                )}

                {formula === renderedFormula && !plotError && (
                  <div className="mx-6 mt-4 p-3 bg-slate-900/30 border border-white/5 rounded-xl flex items-center gap-2 text-slate-400 text-xs shadow-sm">
                    <span className="material-symbols-outlined text-sm text-cyan-500 font-bold">check_circle</span>
                    <span>Memplot grafik untuk <code className="font-mono text-cyan-300 bg-slate-950/60 px-1 py-0.5 rounded border border-white/5">{renderedFormula}</code> pada [{renderedPlotMin.toFixed(1)}, {renderedPlotMax.toFixed(1)}].</span>
                  </div>
                )}

                <div className="p-4 bg-transparent">
                  <FunctionChart 
                    formula={renderedFormula} 
                    a={parseFloat(aInput) || null} 
                    b={parseFloat(bInput) || null} 
                    plotMin={renderedPlotMin}
                    plotMax={renderedPlotMax}
                    root={outcome.status === 'converged' ? outcome.root : null} 
                  />
                </div>
              </div>

            </main>
          </div>

          {/* Iteration Table - Bottom */}
          <section ref={tableSectionRef} className="glass-panel overflow-hidden shadow-2xl mt-4 flex flex-col">
            <div className="px-6 py-5 border-b border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-900/20">
              <div>
                <h2 className="font-sans text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400">table_view</span>
                  Tabel Iterasi Bisection Berurutan
                </h2>
                <p className="font-sans text-xs text-slate-400 mt-0.5">
                  Menampilkan pelacakan nilai a, b, c, f(a), f(b), dan f(c) secara detail dari baris permulaan hingga baris resolusi akhir.
                </p>
              </div>

              {outcome.results.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="bg-slate-900/60 border border-white/10 text-slate-200 hover:bg-slate-850 hover:border-cyan-500 hover:text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-sm"
                >
                  <FileDown className="w-4 h-4" />
                  Unduh Spreadsheet (CSV)
                </button>
              )}
            </div>

            <div className="overflow-x-auto table-scroll max-h-[480px]">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                <thead className="sticky top-0 z-20 shadow-[0_1.5px_0_rgba(255,255,255,0.1)] bg-[#0b0f19]">
                  <tr className="font-sans text-[11px] font-bold text-slate-400 bg-slate-900/80">
                    <th className="px-5 py-3.5 border-r border-white/10 text-center w-14">r</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Batas Bawah (a)</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Batas Atas (b)</th>
                    <th className="px-5 py-3.5 text-right text-cyan-400 font-bold bg-cyan-950/30">Akar Tengah (c)</th>
                    <th className="px-5 py-3.5 text-right border-l border-white/10 font-semibold">f(a)</th>
                    <th className="px-5 py-3.5 text-right font-semibold">f(b)</th>
                    <th className="px-5 py-3.5 text-right font-semibold">f(c)</th>
                    <th className="px-5 py-3.5 border-l border-white/10 text-center font-semibold w-24">Kalang Baru</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Lebar Interval [b-a]</th>
                    <th className="px-5 py-3.5 text-right font-semibold pr-8 bg-[#0b0f19]/30">Error Relatif</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[12.5px] text-slate-300">
                  {outcome.results.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-slate-400 font-sans text-sm bg-transparent">
                        <div className="flex items-center justify-center gap-2">
                          <HelpCircle className="w-5 h-5 text-slate-500 shrink-0" />
                          <span>Belum ada komputasi. Silakan masukkan parameter di atas lalu klik tombol "Mulai Komputasi".</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    outcome.results.map((item, idx) => {
                      const isLastRow = idx === outcome.results.length - 1;
                      const hasRelativeError = item.relativeError !== null;
                      
                      return (
                        <tr
                          key={item.r}
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                            isLastRow 
                              ? 'bg-cyan-500/25 hover:bg-cyan-500/30 font-bold border-y border-cyan-500/35 border-l-4 border-l-cyan-500 shadow-[inset_0_-1px_0_rgba(6,182,212,0.3)] text-white' 
                              : idx % 2 === 0 
                                ? 'bg-transparent' 
                                : 'bg-white/[0.01]'
                          }`}
                        >
                          {/* r - Iteration counter */}
                          <td className={`px-5 py-2.5 border-r border-white/10 text-center ${
                            isLastRow ? 'text-cyan-400 font-bold text-sm' : 'text-slate-400'
                          }`}>
                            {item.r}
                          </td>
                                                 {/* a */}
                          <td className="px-5 py-2.5 text-right">
                            {formatNumeric(item.a)}
                          </td>
                          
                          {/* b */}
                          <td className="px-5 py-2.5 text-right">
                            {formatNumeric(item.b)}
                          </td>
                          
                          {/* c */}
                          <td className={`px-5 py-2.5 text-right font-bold bg-[#0f172a]/20 ${isLastRow ? 'text-cyan-400 text-sm' : 'text-cyan-300'}`}>
                            {formatNumeric(item.c)}
                          </td>
                          
                          {/* f(a) */}
                          <td className="px-5 py-2.5 text-right border-l border-white/10 text-slate-400">
                            {formatNumeric(item.fa)}
                          </td>
                          
                          {/* f(b) */}
                          <td className="px-5 py-2.5 text-right text-slate-400">
                            {formatNumeric(item.fb)}
                          </td>
                          
                          {/* f(c) */}
                          <td className={`px-5 py-2.5 text-right font-medium ${
                            Math.abs(item.fc) < 1e-6 ? 'text-cyan-400 font-bold' : 'text-slate-300'
                          }`}>
                            {formatNumeric(item.fc)}
                          </td>
                          
                          {/* Kalang baru */}
                          <td className="px-5 py-2.5 border-l border-white/10 text-center">
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide ${
                              item.newInterval === '(a,c)' 
                                ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/20' 
                                : 'bg-slate-900 text-slate-400 border border-white/5'
                            }`}>
                              {item.newInterval}
                            </span>
                          </td>
                          
                          {/* Width */}
                          <td className="px-5 py-2.5 text-right text-slate-400">
                            {formatNumeric(item.width)}
                          </td>
                          
                          {/* Relative Error */}
                          <td className={`px-5 py-2.5 text-right pr-8 font-bold ${
                            isLastRow 
                              ? 'text-cyan-400' 
                              : 'text-amber-400'
                          }`}>
                            {formatNumeric(item.relativeError)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Stats Summary */}
            {outcome.results.length > 0 && (
              <div className="bg-slate-900/30 px-6 py-4.5 border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="text-xs text-slate-400 font-sans">
                    <strong>Batas Mula [a, b]:</strong> [{aInput}, {bInput}]
                  </div>
                  <div className="text-xs text-slate-400 font-sans">
                    <strong>Jumlah Langkah:</strong> {outcome.iterations} kali
                  </div>
                  <div className="text-xs text-slate-400 font-sans">
                    <strong>Toleransi ε:</strong> {toleranceInput}
                  </div>
                </div>

                {outcome.status === 'converged' && (
                  <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-sans font-semibold">
                    <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                    Akar konvensional ditemukan di iterasi ke-{outcome.iterations}: x ≈ {outcome.root?.toFixed(8)}
                  </div>
                )}
              </div>
            )}
          </section>

        </div>
      </main>

      {/* Beautiful scientific footer */}
      <footer className="w-full bg-slate-950/40 border-t border-white/10 py-6 mt-12 text-center text-xs text-slate-500 font-sans">
        <div className="max-w-[1440px] mx-auto px-6">
          <p>© 2026 Kelompok 8 Metode Numerik. ITPLN.</p>
        </div>
      </footer>

      {/* Error Logic & Validation Modal Pop-up */}
      {errorModalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with elegant fade */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setErrorModalMsg(null)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
          />
          
          {/* Pop-up modal card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-[#0e1424] border border-rose-500/30 rounded-2xl shadow-2xl shadow-rose-950/20 overflow-hidden"
          >
            {/* Red/Rose header accent */}
            <div className="bg-gradient-to-r from-rose-950/60 to-slate-900 px-6 py-4.5 border-b border-rose-500/20 flex justify-between items-center">
              <div className="flex items-center gap-2.5 text-rose-450">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <h3 className="font-sans text-sm font-bold text-rose-200 tracking-wide">Peringatan Validasi</h3>
              </div>
              <button 
                type="button"
                onClick={() => setErrorModalMsg(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6">
              <div className="space-y-3">
                <p className="font-sans text-sm font-semibold text-rose-300">
                  Terjadi kesalahan pada parameter komputasi:
                </p>
                <p className="font-sans text-[13px] leading-relaxed text-slate-300 bg-rose-950/25 border border-rose-500/10 p-4 rounded-xl font-medium">
                  {errorModalMsg}
                </p>
                <p className="font-sans text-[11px] text-slate-400 leading-relaxed mt-4">
                  <strong>Catatan Penting:</strong> Metode Bisection membutuhkan fungsi matematika yang kontinu serta pemilihan sepasang nilai batas <code className="font-mono text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">a</code> dan <code className="font-mono text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">b</code> yang menghasilkan tanda berlawanan, yaitu <code className="font-mono text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">f(a) * f(b) &lt; 0</code> agar dijamin terdapat minimal satu akar di dalamnya.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setErrorModalMsg(null)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-sans font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] flex items-center gap-2"
                >
                  Tutup Peringatan
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
