import React, { useState, useMemo, useEffect } from 'react';
import { Scissors, Plus, Trash2, Printer, RotateCw, Layers } from 'lucide-react';
import { uid } from '../../lib/formatters';
import { PART_COLORS, PRESET_SHEETS, packParts2D } from '../../lib/cutOptimizer';

export default function CutOptimizer2D({ initialPayload = null }) {
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

  useEffect(() => {
    if (!initialPayload) return;
    if (initialPayload.sheetW && initialPayload.sheetH) {
      setSheetW(initialPayload.sheetW);
      setSheetH(initialPayload.sheetH);
      const match = PRESET_SHEETS.find(
        (s) => s.w === initialPayload.sheetW && s.h === initialPayload.sheetH
      );
      setPreset(match ? match.id : 'custom');
    }
    if (Array.isArray(initialPayload.parts) && initialPayload.parts.length > 0) {
      setParts(initialPayload.parts);
    }
  }, [initialPayload]);

  const [newPart, setNewPart] = useState({ label: '', w: 500, h: 300, qty: 1 });

  const result = useMemo(
    () =>
      packParts2D(
        Number(sheetW) || 2440,
        Number(sheetH) || 1220,
        Number(kerf) || 0,
        allowRotate,
        parts
      ),
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
          <h2 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-red-600" />
            Optimizador de Cortes 2D de Planchas (Taller)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calcula el aprovechamiento óptimo de ACM, Acrílico, Trovicel y Lata con sangría de disco
            en milímetros.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Imprimir Planos de Corte
        </button>
      </div>

      {/* CONFIGURACIÓN Y PIEZAS */}
      <div className="no-print grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-red-600" />
            1. Formato de Plancha Base (mm)
          </h3>

          <select
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
          >
            {PRESET_SHEETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Largo (mm)</label>
              <input
                type="number"
                value={sheetW}
                onChange={(e) => {
                  setPreset('custom');
                  setSheetW(Number(e.target.value));
                }}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Ancho (mm)</label>
              <input
                type="number"
                value={sheetH}
                onChange={(e) => {
                  setPreset('custom');
                  setSheetH(Number(e.target.value));
                }}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Sangría (mm)</label>
              <input
                type="number"
                min="0"
                max="15"
                value={kerf}
                onChange={(e) => setKerf(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={allowRotate}
              onChange={(e) => setAllowRotate(e.target.checked)}
              className="rounded border-slate-300 text-red-600 focus:ring-red-600"
            />
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            Permitir rotar piezas 90° para mejorar aprovechamiento
          </label>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase">Planchas</div>
              <div className="font-mono text-lg font-bold text-slate-900">
                {result.sheets.length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase">Eficiencia</div>
              <div className="font-mono text-lg font-bold text-emerald-700">
                {result.efficiency.toFixed(1)}%
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase">Merma</div>
              <div className="font-mono text-lg font-bold text-amber-600">
                {(100 - result.efficiency).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* LISTA DE PIEZAS */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            2. Piezas a Cortar (en milímetros)
          </h3>

          <form onSubmit={addPart} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
            <div className="col-span-2 sm:col-span-4">
              <label className="block text-[10px] text-slate-500 mb-1">Etiqueta</label>
              <input
                type="text"
                placeholder="Ej: Letrero Lateral"
                value={newPart.label}
                onChange={(e) => setNewPart({ ...newPart, label: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
              />
            </div>
            <div className="col-span-1 sm:col-span-3">
              <label className="block text-[10px] text-slate-500 mb-1">Largo (mm)</label>
              <input
                type="number"
                required
                min="10"
                value={newPart.w}
                onChange={(e) => setNewPart({ ...newPart, w: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] text-slate-500 mb-1">Alto (mm)</label>
              <input
                type="number"
                required
                min="10"
                value={newPart.h}
                onChange={(e) => setNewPart({ ...newPart, h: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>
            <div className="col-span-1 sm:col-span-1">
              <label className="block text-[10px] text-slate-500 mb-1">Cant.</label>
              <input
                type="number"
                min="1"
                value={newPart.qty}
                onChange={(e) => setNewPart({ ...newPart, qty: e.target.value })}
                className="w-full px-2 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 text-center"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1"
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
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: PART_COLORS[idx % PART_COLORS.length] }}
                  />
                  <span className="font-semibold text-slate-900">{p.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-slate-600">
                    {p.w} × {p.h} mm · <strong className="text-slate-900">{p.qty} unid.</strong>
                  </span>
                  <button
                    onClick={() => setParts((prev) => prev.filter((x) => x.id !== p.id))}
                    className="text-slate-400 hover:text-red-600"
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
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
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
              className="print-sheet print-avoid-break p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-heading font-bold text-slate-900 text-sm">
                  Plancha #{sheet.id} — {sheetW} × {sheetH} mm
                </span>
                <span className="font-mono text-slate-500">
                  {sheet.placed.length} piezas · Aprovechamiento:{' '}
                  <strong className="text-emerald-700">{pct}%</strong>
                </span>
              </div>

              <div className="w-full overflow-x-auto bg-slate-50 rounded-xl p-3 border border-slate-200">
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
                    fill="#f8fafc"
                    stroke="#94a3b8"
                    strokeWidth={Math.max(4, sheetW * 0.002)}
                  />
                  <defs>
                    {sheet.placed.map((p) => (
                      <clipPath key={`clip-${p.uid}`} id={`clip-${sheet.id}-${p.uid}`}>
                        <rect
                          x={p.x + 6}
                          y={p.y + 6}
                          width={Math.max(0, p.w - 12)}
                          height={Math.max(0, p.h - 12)}
                        />
                      </clipPath>
                    ))}
                  </defs>
                  {sheet.placed.map((p) => {
                    const isTall = p.h > p.w * 1.35;
                    const textAxis = isTall ? p.h : p.w;
                    const crossAxis = isTall ? p.w : p.h;
                    const dimText = `${p.w}×${p.h}`;
                    const labelChars = Math.max(p.label.length, 6);
                    const dimChars = Math.max(dimText.length, 6);
                    const titleSize = Math.min(
                      64,
                      Math.max(16, Math.min((textAxis * 0.82) / (labelChars * 0.62), crossAxis * 0.24))
                    );
                    const dimSize = Math.min(
                      48,
                      Math.max(
                        14,
                        Math.min((textAxis * 0.82) / (dimChars * 0.62), crossAxis * 0.19, titleSize * 0.82)
                      )
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
                          fillOpacity={0.9}
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
                                fill="#f8fafc"
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
