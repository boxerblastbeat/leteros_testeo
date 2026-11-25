import React, { useState, useMemo } from 'react';
import { Scissors, Plus, Trash2, Printer, RotateCw, Layers } from 'lucide-react';
import { uid } from '../../lib/formatters';

const PRESET_SHEETS = [
  { id: 'acm', label: 'ACM / Acrílico / Trovicel (2440 × 1220 mm)', w: 2440, h: 1220 },
  { id: 'lata', label: 'Lata Galvanizada (3000 × 1000 mm)', w: 3000, h: 1000 },
  { id: 'custom', label: 'Plancha Personalizada', w: 2000, h: 1000 },
];

const PART_COLORS = [
  '#dc2626',
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4f46e5',
];

// Algoritmo Guillotine / Shelf 2D con soporte de rotación 90° y sangría de disco (kerf)
function packParts2D(sheetW, sheetH, kerf, allowRotate, partsList) {
  const expanded = [];
  partsList.forEach((p, idx) => {
    const qty = Math.max(1, parseInt(p.qty, 10) || 1);
    const w = Math.max(1, parseFloat(p.w) || 0);
    const h = Math.max(1, parseFloat(p.h) || 0);
    for (let i = 0; i < qty; i++) {
      expanded.push({
        uid: `${p.id}-${i}`,
        label: p.label || `Pieza ${idx + 1}`,
        w,
        h,
        color: PART_COLORS[idx % PART_COLORS.length],
      });
    }
  });

  // Ordenar por lado mayor descendente (First-Fit Decreasing)
  expanded.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w * b.h - a.w * a.h);

  const sheets = [];
  const unplaced = [];

  const createSheet = () => ({
    id: sheets.length + 1,
    placed: [],
    freeRects: [{ x: 0, y: 0, w: sheetW, h: sheetH }],
  });

  const tryPlaceOnSheet = (sheet, part) => {
    let bestRectIdx = -1;
    let bestOrientation = null;
    let bestScore = Infinity;

    for (let i = 0; i < sheet.freeRects.length; i++) {
      const r = sheet.freeRects[i];
      const candidates = [{ w: part.w, h: part.h, rotated: false }];
      if (allowRotate && part.w !== part.h) {
        candidates.push({ w: part.h, h: part.w, rotated: true });
      }

      for (const c of candidates) {
        if (c.w <= r.w && c.h <= r.h) {
          const score = Math.min(r.w - c.w, r.h - c.h);
          if (score < bestScore) {
            bestScore = score;
            bestRectIdx = i;
            bestOrientation = c;
          }
        }
      }
    }

    if (bestRectIdx === -1) return false;

    const r = sheet.freeRects[bestRectIdx];
    const placed = {
      ...part,
      x: r.x,
      y: r.y,
      w: bestOrientation.w,
      h: bestOrientation.h,
      rotated: bestOrientation.rotated,
    };
    sheet.placed.push(placed);

    // Split Guillotine (corte más largo)
    sheet.freeRects.splice(bestRectIdx, 1);
    const rightW = r.w - placed.w - kerf;
    const bottomH = r.h - placed.h - kerf;

    if (rightW > 0 && bottomH > 0) {
      if (rightW > bottomH) {
        sheet.freeRects.push({ x: r.x + placed.w + kerf, y: r.y, w: rightW, h: r.h });
        sheet.freeRects.push({ x: r.x, y: r.y + placed.h + kerf, w: placed.w, h: bottomH });
      } else {
        sheet.freeRects.push({ x: r.x, y: r.y + placed.h + kerf, w: r.w, h: bottomH });
        sheet.freeRects.push({ x: r.x + placed.w + kerf, y: r.y, w: rightW, h: placed.h });
      }
    } else if (rightW > 0) {
      sheet.freeRects.push({ x: r.x + placed.w + kerf, y: r.y, w: rightW, h: r.h });
    } else if (bottomH > 0) {
      sheet.freeRects.push({ x: r.x, y: r.y + placed.h + kerf, w: r.w, h: bottomH });
    }

    return true;
  };

  for (const part of expanded) {
    const fitsAtAll =
      (part.w <= sheetW && part.h <= sheetH) ||
      (allowRotate && part.h <= sheetW && part.w <= sheetH);
    if (!fitsAtAll) {
      unplaced.push(part);
      continue;
    }

    let ok = false;
    for (const s of sheets) {
      if (tryPlaceOnSheet(s, part)) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      const nextSheet = createSheet();
      sheets.push(nextSheet);
      tryPlaceOnSheet(nextSheet, part);
    }
  }

  const sheetArea = sheetW * sheetH;
  const totalUsedArea = sheets.reduce(
    (sum, s) => sum + s.placed.reduce((a, p) => a + p.w * p.h, 0),
    0
  );
  const totalAvailable = sheets.length * sheetArea;
  const efficiency = totalAvailable > 0 ? (totalUsedArea / totalAvailable) * 100 : 0;

  return { sheets, unplaced, efficiency, totalUsedArea };
}

export default function CutOptimizer2D() {
  const [preset, setPreset] = useState('acm');
  const [sheetW, setSheetW] = useState(2440);
  const [sheetH, setSheetH] = useState(1220);
  const [kerf, setKerf] = useState(3);
  const [allowRotate, setAllowRotate] = useState(true);

  const [parts, setParts] = useState([
    { id: 'p1', label: 'Letrero Principal', w: 1200, h: 600, qty: 2 },
    { id: 'p2', label: 'Placa Señalética', w: 600, h: 400, qty: 4 },
    { id: 'p3', label: 'Cenefa Lateral', w: 1100, h: 250, qty: 2 },
  ]);

  const [newPart, setNewPart] = useState({ label: '', w: 500, h: 300, qty: 1 });

  const result = useMemo(
    () => packParts2D(Number(sheetW) || 2440, Number(sheetH) || 1220, Number(kerf) || 0, allowRotate, parts),
    [sheetW, sheetH, kerf, allowRotate, parts]
  );

  const handlePresetChange = (id) => {
    setPreset(id);
    const p = PRESET_SHEETS.find((x) => x.id === id);
    if (p && id !== 'custom') {
      setSheetW(p.w);
      setSheetH(p.h);
    }
  };

  const addPart = (e) => {
    e.preventDefault();
    if (!newPart.w || !newPart.h) return;
    setParts((prev) => [
      ...prev,
      {
        id: uid(),
        label: newPart.label.trim() || `Pieza ${prev.length + 1}`,
        w: Number(newPart.w),
        h: Number(newPart.h),
        qty: Math.max(1, parseInt(newPart.qty, 10) || 1),
      },
    ]);
    setNewPart({ label: '', w: 500, h: 300, qty: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <Scissors className="w-5 h-5 text-red-500" />
            Optimizador de Cortes 2D de Planchas (Taller)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Calcula el aprovechamiento óptimo de ACM, Acrílico, Trovicel y Lata con sangría de disco
            en milímetros.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          Imprimir Planos de Corte
        </button>
      </div>

      {/* CONFIGURACIÓN Y PIEZAS */}
      <div className="no-print grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-red-500" />
            1. Formato de Plancha Base (mm)
          </h3>

          <select
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
          >
            {PRESET_SHEETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Largo (mm)</label>
              <input
                type="number"
                value={sheetW}
                onChange={(e) => {
                  setPreset('custom');
                  setSheetW(Number(e.target.value));
                }}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Ancho (mm)</label>
              <input
                type="number"
                value={sheetH}
                onChange={(e) => {
                  setPreset('custom');
                  setSheetH(Number(e.target.value));
                }}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Sangría (mm)</label>
              <input
                type="number"
                min="0"
                max="15"
                value={kerf}
                onChange={(e) => setKerf(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={allowRotate}
              onChange={(e) => setAllowRotate(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-950 text-red-600"
            />
            <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
            Permitir rotar piezas 90° para mejorar aprovechamiento
          </label>

          {/* Resumen KPI */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800 text-center">
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase">Planchas</div>
              <div className="font-mono text-lg font-bold text-white">{result.sheets.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase">Eficiencia</div>
              <div className="font-mono text-lg font-bold text-emerald-400">
                {result.efficiency.toFixed(1)}%
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase">Merma</div>
              <div className="font-mono text-lg font-bold text-amber-400">
                {(100 - result.efficiency).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* LISTA DE PIEZAS */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            2. Piezas a Cortar (en milímetros)
          </h3>

          <form onSubmit={addPart} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4">
              <label className="block text-[10px] text-zinc-500 mb-1">Etiqueta</label>
              <input
                type="text"
                placeholder="Ej: Letrero Lateral"
                value={newPart.label}
                onChange={(e) => setNewPart({ ...newPart, label: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] text-zinc-500 mb-1">Largo (mm)</label>
              <input
                type="number"
                required
                min="10"
                value={newPart.w}
                onChange={(e) => setNewPart({ ...newPart, w: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-zinc-500 mb-1">Alto (mm)</label>
              <input
                type="number"
                required
                min="10"
                value={newPart.h}
                onChange={(e) => setNewPart({ ...newPart, h: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] text-zinc-500 mb-1">Cant.</label>
              <input
                type="number"
                min="1"
                value={newPart.qty}
                onChange={(e) => setNewPart({ ...newPart, qty: e.target.value })}
                className="w-full px-2 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white text-center"
              />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Sumar
              </button>
            </div>
          </form>

          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {parts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: PART_COLORS[idx % PART_COLORS.length] }}
                  />
                  <span className="font-semibold text-white">{p.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-zinc-400">
                    {p.w} × {p.h} mm · <strong className="text-white">{p.qty} unid.</strong>
                  </span>
                  <button
                    onClick={() => setParts((prev) => prev.filter((x) => x.id !== p.id))}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result.unplaced.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          Atención: {result.unplaced.length} pieza(s) superan las dimensiones máximas de la plancha (
          {sheetW} × {sheetH} mm).
        </div>
      )}

      {/* PLANOS DE CORTE SVG */}
      <div className="space-y-5">
        {result.sheets.map((sheet) => {
          const used = sheet.placed.reduce((s, p) => s + p.w * p.h, 0);
          const pct = ((used / (sheetW * sheetH)) * 100).toFixed(1);
          return (
            <div
              key={sheet.id}
              className="print-sheet print-avoid-break p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-heading font-bold text-white text-sm">
                  Plancha #{sheet.id} — {sheetW} × {sheetH} mm
                </span>
                <span className="font-mono text-zinc-400">
                  {sheet.placed.length} piezas · Aprovechamiento:{' '}
                  <strong className="text-emerald-400">{pct}%</strong>
                </span>
              </div>

              <div className="w-full overflow-x-auto bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                <svg
                  viewBox={`0 0 ${sheetW} ${sheetH}`}
                  className="w-full h-auto max-h-[380px]"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <rect
                    x={0}
                    y={0}
                    width={sheetW}
                    height={sheetH}
                    fill="#18181b"
                    stroke="#52525b"
                    strokeWidth={Math.max(4, sheetW * 0.002)}
                  />
                  <defs>
                    {sheet.placed.map((p) => (
                      <clipPath key={`clip-${p.uid}`} id={`clip-${sheet.id}-${p.uid}`}>
                        <rect x={p.x + 6} y={p.y + 6} width={Math.max(0, p.w - 12)} height={Math.max(0, p.h - 12)} />
                      </clipPath>
                    ))}
                  </defs>
                  {sheet.placed.map((p) => {
                    const isTall = p.h > p.w * 1.35;
                    const textAxis = isTall ? p.h : p.w;
                    const crossAxis = isTall ? p.w : p.h;
                    const dimText = `${p.w}×${p.h}${p.rotated ? ' ↻' : ''}`;
                    const labelChars = Math.max(p.label.length, 6);
                    const dimChars = Math.max(dimText.length, 6);
                    const titleSize = Math.min(
                      64,
                      Math.max(16, Math.min((textAxis * 0.82) / (labelChars * 0.62), crossAxis * 0.24))
                    );
                    const dimSize = Math.min(
                      48,
                      Math.max(14, Math.min((textAxis * 0.82) / (dimChars * 0.62), crossAxis * 0.19, titleSize * 0.82))
                    );
                    const cx = p.x + p.w / 2;
                    const cy = p.y + p.h / 2;
                    const showText = textAxis >= 140 && crossAxis >= 90;

                    return (
                      <g key={p.uid}>
                        <rect
                          x={p.x}
                          y={p.y}
                          width={p.w}
                          height={p.h}
                          fill={p.color}
                          fillOpacity={0.85}
                          stroke="#ffffff"
                          strokeWidth={Math.max(3, sheetW * 0.0015)}
                        />
                        {showText && (
                          <g clipPath={`url(#clip-${sheet.id}-${p.uid})`}>
                            <g transform={isTall ? `rotate(-90 ${cx} ${cy})` : undefined}>
                              <text
                                x={cx}
                                y={cy - dimSize * 0.65}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#ffffff"
                                fontSize={titleSize}
                                fontWeight="700"
                              >
                                {p.label}
                              </text>
                              <text
                                x={cx}
                                y={cy + titleSize * 0.72}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#f4f4f5"
                                fontSize={dimSize}
                                fontFamily="monospace"
                              >
                                {dimText}
                              </text>
                            </g>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
