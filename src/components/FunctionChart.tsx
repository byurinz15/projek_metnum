import React, { useEffect, useRef, useState, useCallback } from 'react';
import { evaluateF } from '../utils/bisection';
import { ZoomIn, ZoomOut, Maximize2, Move, HelpCircle } from 'lucide-react';

interface FunctionChartProps {
  formula: string;
  a: number | null;
  b: number | null;
  plotMin: number;
  plotMax: number;
  root: number | null;
}

export default function FunctionChart({ formula, a, b, plotMin, plotMax, root }: FunctionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 600, height: 360 });

  // Navigation State in World Coordinates
  const [centerX, setCenterX] = useState<number>(1);
  const [centerY, setCenterY] = useState<number>(0);
  const [scaleX, setScaleX] = useState<number>(80); // pixels per unit
  const [scaleY, setScaleY] = useState<number>(80);

  // Interaction State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragCenterStart, setDragCenterStart] = useState({ x: 0, y: 0 });
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Resize handler
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: Math.max(height || 360, 300)
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Autofit plot range on change of inputs
  const fitToRange = useCallback((minVal: number, maxVal: number) => {
    const range = maxVal - minVal;
    if (range <= 0 || isNaN(range)) return;

    const newCenterX = (minVal + maxVal) / 2;
    // Fit range inside 80% of canvas width
    const targetPixels = dimensions.width * 0.8;
    const newScaleX = targetPixels / range;
    
    setCenterX(newCenterX);
    setScaleX(newScaleX);
    
    // Lock Aspect Ratio for math plots (or standard proportional scale)
    setScaleY(newScaleX);
    setCenterY(0); // Center around f(x) = 0 typically
  }, [dimensions.width]);

  // Sync with prop-driven ranges initially or when clicking preset
  useEffect(() => {
    fitToRange(plotMin, plotMax);
  }, [plotMin, plotMax, fitToRange]);

  // Coordinate conversion helpers
  const toScreenX = (x: number) => dimensions.width / 2 + (x - centerX) * scaleX;
  const toScreenY = (y: number) => dimensions.height / 2 - (y - centerY) * scaleY;
  const toWorldX = (px: number) => (px - dimensions.width / 2) / scaleX + centerX;
  const toWorldY = (py: number) => (dimensions.height / 2 - py) / scaleY + centerY;

  // Zoom handlers
  const handleZoom = (factor: number) => {
    setScaleX((prev) => Math.max(1, prev * factor));
    setScaleY((prev) => Math.max(1, prev * factor));
  };

  const handleResetView = () => {
    if (a !== null && b !== null) {
      fitToRange(a, b);
    } else {
      fitToRange(plotMin, plotMax);
    }
  };

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragCenterStart({ x: centerX, y: centerY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const wx = toWorldX(px);
      let wy = 0;
      try {
        wy = evaluateF(formula, wx);
      } catch {
        // Fallback to coordinates under cursor
        wy = toWorldY(py);
      }
      setHoverCoord({ x: wx, y: wy });
    }

    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setCenterX(dragCenterStart.x - dx / scaleX);
    setCenterY(dragCenterStart.y + dy / scaleY);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    if (!isDragging) {
      setHoverCoord(null);
    }
  };

  // Non-passive native listener for custom zooming on mouse wheel to prevent page scrolling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault(); // Stop default browser window/page scrolling

      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;

      const mouseWoldXBefore = toWorldX(px);
      const mouseWoldYBefore = toWorldY(py);

      setScaleX((prev) => {
        const next = Math.max(5, prev * zoomFactor);
        setScaleY(next);
        
        // Re-center focused under cursor
        setCenterX(mouseWoldXBefore - (px - dimensions.width / 2) / next);
        setCenterY(mouseWoldYBefore + (py - dimensions.height / 2) / next);
        return next;
      });
    };

    canvas.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheelNative);
    };
  }, [centerX, centerY, scaleX, scaleY, dimensions.width, dimensions.height]);

  // Draw plot loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas and fill dark background matching the mock up exactly
    ctx.fillStyle = '#070b13'; 
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 1. GRID DESIGN: Dynamic division grid
    const targetSpacing = 80; // approximate pixels between grid lines
    const minDiff = targetSpacing / scaleX;
    
    // Find nice power-of-10 unit divisions (0.1, 0.2, 0.5, 1, 2, 5, etc.)
    const power10 = Math.pow(10, Math.floor(Math.log10(minDiff)));
    const ratio = minDiff / power10;
    let gridSpacing = power10;
    if (ratio > 5) gridSpacing = power10 * 5;
    else if (ratio > 2) gridSpacing = power10 * 2;

    const startGridX = Math.floor(toWorldX(0) / gridSpacing) * gridSpacing;
    const endGridX = Math.ceil(toWorldX(dimensions.width) / gridSpacing) * gridSpacing;
    const startGridY = Math.floor(toWorldY(dimensions.height) / gridSpacing) * gridSpacing;
    const endGridY = Math.ceil(toWorldY(0) / gridSpacing) * gridSpacing;

    // Draw Subdued Grid Lines
    ctx.lineWidth = 1;
    for (let gx = startGridX; gx <= endGridX; gx += gridSpacing) {
      const px = toScreenX(gx);
      ctx.strokeStyle = gx === 0 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(6, 182, 212, 0.08)'; // Bright vertical grid lines
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, dimensions.height);
      ctx.stroke();
    }

    for (let gy = startGridY; gy <= endGridY; gy += gridSpacing) {
      const py = toScreenY(gy);
      ctx.strokeStyle = gy === 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(6, 182, 212, 0.08)'; // Bright horizontal grid lines
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(dimensions.width, py);
      ctx.stroke();
    }

    // 2. CORE BOLD COORDINATE AXES (Red for Y-Axis, Blue for X-Axis exactly as requested image)
    const axisY_px = toScreenX(0); // line x=0
    const axisX_px = toScreenY(0); // line y=0

    // Bold blue line for Horizontal X-Axis
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb'; // vivid blue matching user reference image
    ctx.lineWidth = 2.5;
    ctx.moveTo(0, axisX_px);
    ctx.lineTo(dimensions.width, axisX_px);
    ctx.stroke();

    // Bold red line for Vertical Y-Axis
    ctx.beginPath();
    ctx.strokeStyle = '#f43f5e'; // vivid red matching user reference image
    ctx.lineWidth = 2.5;
    ctx.moveTo(axisY_px, 0);
    ctx.lineTo(axisY_px, dimensions.height);
    ctx.stroke();

    // 3. LABELS AND TICK CALIBRATION
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Draw X-axis ticks (light blue/cyan background text)
    ctx.fillStyle = '#06b6d4';
    for (let gx = startGridX; gx <= endGridX; gx += gridSpacing) {
      if (Math.abs(gx) < 1e-10) continue; // skip 0 center
      const px = toScreenX(gx);
      // Ensure text is readable inside bounds
      const labelY = Math.min(Math.max(axisX_px + 8, 12), dimensions.height - 20);
      
      // Draw tick dash
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, axisX_px - 4);
      ctx.lineTo(px, axisX_px + 4);
      ctx.stroke();

      // Draw text
      const valueLabel = parseFloat(gx.toFixed(6)).toString();
      ctx.fillText(valueLabel, px, labelY);
    }

    // Draw Y-axis ticks (Reddish text)
    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = startGridY; gy <= endGridY; gy += gridSpacing) {
      if (Math.abs(gy) < 1e-10) continue; // skip 0
      const py = toScreenY(gy);
      const labelX = Math.min(Math.max(axisY_px - 8, 40), dimensions.width - 12);

      // Draw tick dash
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(axisY_px - 4, py);
      ctx.lineTo(axisY_px + 4, py);
      ctx.stroke();

      // Draw text
      const valueLabel = parseFloat(gy.toFixed(6)).toString();
      ctx.fillText(valueLabel, labelX, py);
    }

    // Draw 0 coordinate label at intersection
    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', axisY_px - 6, axisX_px + 6);

    // 4. DRAW FUNCTION CURVE: Pixel-by-pixel rendering avoiding sampling noise
    if (formula.trim()) {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#22d3ee'; // beautiful glowing cyan curve
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 4; // micro glow effect for precision display

      let first = true;
      for (let px = 0; px <= dimensions.width; px++) {
        const wx = toWorldX(px);
        try {
          const wy = evaluateF(formula, wx);
          if (isNaN(wy) || !isFinite(wy)) {
            first = true; // break path
            continue;
          }

          const py = toScreenY(wy);
          // Clamp to avoid painting outside borders causing rendering path artifacts
          if (py < -1000 || py > dimensions.height + 1000) {
            first = true;
            continue;
          }

          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else {
            ctx.lineTo(px, py);
          }
        } catch {
          first = true; // mathematical pole or parsing gap
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow glow
    }

    // 5. DRAW BOUNDS A AND B SHADED SLATS
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    if (a !== null && !isNaN(a)) {
      const sa = toScreenX(a);
      ctx.strokeStyle = '#38bdf8'; // light sky-blue
      ctx.beginPath();
      ctx.moveTo(sa, 0);
      ctx.lineTo(sa, dimensions.height);
      ctx.stroke();

      // Draw tag for a
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(sa - 15, 10, 30, 18);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(sa - 15, 10, 30, 18);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('a', sa, 19);
    }

    if (b !== null && !isNaN(b)) {
      const sb = toScreenX(b);
      ctx.strokeStyle = '#38bdf8'; // light sky-blue
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(sb, 0);
      ctx.lineTo(sb, dimensions.height);
      ctx.stroke();

      // Draw tag for b
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(sb - 15, 10, 30, 18);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(sb - 15, 10, 30, 18);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('b', sb, 19);
    }

    ctx.setLineDash([]); // clear dash formatting

    // 6. DRAW THE COMMITTED ROOT PINPOINT
    if (root !== null && !isNaN(root)) {
      const sRoot = toScreenX(root);
      const sY = toScreenY(0);

      // Pulse ring
      ctx.beginPath();
      ctx.arc(sRoot, sY, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 146, 60, 0.25)'; // bright orange core mask
      ctx.fill();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center solid pinpoint dot
      ctx.beginPath();
      ctx.arc(sRoot, sY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff8214';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label Akar tag
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`c ≈ ${root.toFixed(5)}`, sRoot, sY - 16);
    }

  }, [dimensions, centerX, centerY, scaleX, scaleY, formula, a, b, root]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Visual Navigation controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Move className="w-3.5 h-3.5 text-cyan-400" />
          <span>Navigasi: Klik &amp; Seret untuk menggeser, Scroll untuk zoom.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleZoom(1.35)}
            title="Klik untuk Zoom In"
            className="p-1.5 bg-slate-900 border border-white/10 hover:border-cyan-500 hover:text-cyan-400 text-slate-300 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer active:scale-95 transition-all duration-150"
          >
            <ZoomIn className="w-4 h-4" />
            <span>Perbesar</span>
          </button>
          <button
            type="button"
            onClick={() => handleZoom(0.7)}
            title="Klik untuk Zoom Out"
            className="p-1.5 bg-slate-900 border border-white/10 hover:border-cyan-500 hover:text-cyan-400 text-slate-300 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer active:scale-95 transition-all duration-150"
          >
            <ZoomOut className="w-4 h-4" />
            <span>Perkecil</span>
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Suaikan Fokus ke Interval Selang Kontinu"
            className="p-1.5 bg-slate-900 border border-white/10 hover:border-cyan-500 hover:text-cyan-400 text-slate-300 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer active:scale-95 transition-all duration-150"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fokus Selang</span>
          </button>
        </div>
      </div>

      {/* Main Graph Viewport */}
      <div 
        ref={containerRef} 
        className="w-full h-90 relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#070b13] cursor-grab active:cursor-grabbing"
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="block w-full h-full"
        />

        {/* Display Cartesian Coordinates indicator under cursor inside Canvas */}
        {hoverCoord && (
          <div className="absolute bottom-3 left-3 bg-[#0a0f1d]/85 text-slate-300 font-mono text-[10.5px] px-2.5 py-1.5 rounded-lg border border-primary/35 pointer-events-none shadow-md backdrop-blur-md flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>x: <span className="text-cyan-400 font-bold">{hoverCoord.x.toFixed(5)}</span></span>
            <span className="text-slate-600">|</span>
            <span>y f(x): <span className="text-emerald-400 font-bold">{isNaN(hoverCoord.y) || !isFinite(hoverCoord.y) ? 'Error' : hoverCoord.y.toFixed(5)}</span></span>
          </div>
        )}
      </div>

      {/* Grid Legend Keys */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-[11px] text-slate-400 border-t border-white/5 font-sans">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-cyan-400 shadow-[0_0_4px_#06b6d4]"></div>
          <span>Kurva f(x)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 border-b-2 border-dashed border-[#38bdf8]"></div>
          <span>Batas Selang (a &amp; b)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-[#2563eb]"></div>
          <span>Sumbu X (y = 0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-0.5 bg-error"></div>
          <span>Sumbu Y (x = 0)</span>
        </div>
        {root !== null && (
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-400/20 border-2 border-orange-500 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
            </div>
            <span className="font-semibold text-orange-450">Akar Didapat (y = 0)</span>
          </div>
        )}
      </div>
    </div>
  );
}
