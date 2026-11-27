import React, { useMemo } from 'react';
import { Printer, X } from 'lucide-react';
import { COMPANY_INFO } from '../../data/company';
import { DELIVERY_LABELS, formatDateCL } from '../../lib/formatters';
import { computeOtCubicationAndCuts } from '../../lib/cutOptimizer';
import { useModalClose } from '../../lib/useModalClose';

export default function WorkOrderPrintModal({ ot, onClose }) {
  const { handleClose, handleBackdropClick } = useModalClose(Boolean(ot), onClose, {
    confirm: false,
  });

  const cub = useMemo(() => (ot ? computeOtCubicationAndCuts(ot.items) : null), [ot]);

  if (!ot) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="print-modal-overlay fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-2.5 sm:p-4"
    >
      <div className="print-modal-container max-w-3xl mx-auto">
        <div className="no-print flex flex-wrap justify-between items-center gap-2 mb-3 sm:mb-4 bg-white border border-slate-200 rounded-2xl p-3 shadow-lg">
          <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
            Ficha de Producción · {ot.ot_number}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ficha
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="print-sheet bg-white text-zinc-900 rounded-2xl p-4 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start gap-3 border-b-2 border-zinc-900 pb-4">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold">{COMPANY_INFO.name}</h2>
              <p className="text-xs text-zinc-600">ORDEN DE TRABAJO INTERNA — TALLER</p>
            </div>
            <div className="text-left sm:text-right print:text-right">
              <div className="font-mono text-xl sm:text-2xl font-extrabold text-red-600">
                {ot.ot_number}
              </div>
              {ot.quote_correlative && (
                <div className="text-xs font-mono text-zinc-600">Ref: {ot.quote_correlative}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 text-xs bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <div>
              <span className="text-zinc-500 block">Cliente:</span>
              <strong className="text-sm break-words">{ot.client_name}</strong>
              {ot.client_phone && <div className="mt-0.5">{ot.client_phone}</div>}
            </div>
            <div>
              <span className="text-zinc-500 block">Entrega / Instalación:</span>
              <strong>{formatDateCL(ot.deadline)}</strong>
              <div>{DELIVERY_LABELS[ot.delivery_method] || ot.delivery_method}</div>
              {ot.delivery_method !== 'retiro' && ot.delivery_address && (
                <div className="break-words font-medium text-zinc-800 mt-0.5">
                  Dirección: {ot.delivery_address}
                </div>
              )}
            </div>
          </div>

          {Array.isArray(ot.deadline_history) && ot.deadline_history.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <strong className="block uppercase text-[10px] text-amber-800">
                Historial de Modificaciones de Fecha:
              </strong>
              {ot.deadline_history.map((h, idx) => (
                <div key={idx} className="text-amber-900">
                  • {h.from === 'Sin fecha' ? 'Sin fecha' : formatDateCL(h.from)} →{' '}
                  <strong>{formatDateCL(h.to)}</strong>
                  {h.reason ? ` — ${h.reason}` : ''}
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[460px] sm:min-w-0 text-xs border border-zinc-300">
              <thead className="bg-zinc-900 text-white">
                <tr>
                  <th className="p-2.5 text-left">Material / Trabajo</th>
                  <th className="p-2.5 text-center">Medidas</th>
                  <th className="p-2.5 text-center">Cantidad</th>
                  <th className="p-2.5 text-center">Check Taller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(ot.items || []).map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="p-3">
                      <div className="font-bold">{item.name}</div>
                      {item.detail && <div className="text-zinc-600">{item.detail}</div>}
                    </td>
                    <td className="p-3 text-center font-mono whitespace-nowrap">
                      {item.width && item.height ? `${item.width}m × ${item.height}m` : 'Estándar'}
                    </td>
                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                    <td className="p-3 text-center">☐</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {cub?.hasOptimization && (
            <div className="space-y-3 border border-zinc-300 rounded-xl p-4 bg-zinc-50 print-avoid-break">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <strong className="text-xs uppercase tracking-wider text-zinc-900">
                  Cubicación y Glosa de Cortes Optimizados (Sangría 3 mm)
                </strong>
                <span className="text-[11px] font-mono text-zinc-600">
                  {cub.totalPieces} piezas · {cub.totalAreaSqm.toFixed(2)} m² totales
                </span>
              </div>

              {cub.rigidResults.map((r, rIdx) => (
                <div key={rIdx} className="space-y-2.5 bg-white border border-zinc-200 rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <strong className="text-zinc-900">
                      {r.label} — Formato {r.sheetW} × {r.sheetH} mm
                    </strong>
                    <span className="font-mono text-zinc-700">
                      Retirar bodega:{' '}
                      <strong>
                        {r.sheetCount} {r.sheetCount === 1 ? 'plancha' : 'planchas'}
                      </strong>{' '}
                      · Aprovechamiento:{' '}
                      <strong className="text-emerald-700">{r.efficiency.toFixed(1)}%</strong>
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-zinc-700">
                    {r.patterns.map((pat, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-zinc-100 last:border-0"
                      >
                        <span>
                          <strong>
                            {pat.sheetIds.length > 1
                              ? `Planchas #${pat.sheetIds[0]} a #${pat.sheetIds[pat.sheetIds.length - 1]} (×${pat.sheetIds.length} idénticas)`
                              : `Plancha #${pat.sheetIds[0]}`}
                            :
                          </strong>{' '}
                          {pat.summaryItems
                            .map((si) => `${si.qty} cortes de ${si.dims} mm (${si.label})`)
                            .join(' + ')}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {pat.efficiency.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 pt-1">
                    {r.patterns.slice(0, 4).map((pat, pIdx) => (
                      <div key={pIdx} className="border border-zinc-200 rounded-lg p-2 bg-zinc-50">
                        <div className="text-[10px] font-mono text-zinc-600 mb-1 flex justify-between">
                          <span>
                            {pat.sheetIds.length > 1
                              ? `Patrón ×${pat.sheetIds.length} planchas`
                              : `Plancha #${pat.sheetIds[0]}`}
                          </span>
                          <span>{pat.efficiency.toFixed(1)}%</span>
                        </div>
                        <svg
                          viewBox={`0 0 ${r.sheetW} ${r.sheetH}`}
                          className="w-full h-auto max-h-28"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <rect
                            x={0}
                            y={0}
                            width={r.sheetW}
                            height={r.sheetH}
                            fill="#ffffff"
                            stroke="#52525b"
                            strokeWidth={Math.max(8, r.sheetW * 0.004)}
                          />
                          {pat.sampleSheet.placed.map((p) => (
                            <rect
                              key={p.uid}
                              x={p.x}
                              y={p.y}
                              width={p.w}
                              height={p.h}
                              fill={p.color}
                              fillOpacity={0.8}
                              stroke="#ffffff"
                              strokeWidth={Math.max(6, r.sheetW * 0.003)}
                            />
                          ))}
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {cub.rollResults.map((roll, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-zinc-200 rounded-lg p-3 text-xs space-y-1"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong className="text-zinc-900">
                      Rollo Flexible: {roll.label} (Ancho {roll.rollWidthM}m)
                    </strong>
                    <span className="font-mono text-zinc-700">
                      Consumo estimado:{' '}
                      <strong>{roll.linearMeters.toFixed(2)} metros lineales</strong> (
                      {roll.areaSqm.toFixed(2)} m²)
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-600">
                    {roll.cuts.map((c, cIdx) => (
                      <div key={cIdx}>
                        • {c.qty}× piezas de {c.wM}m × {c.hM}m — {c.orientNote} (
                        {c.linearMeters.toFixed(2)} ml)
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {ot.notes && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
              <strong className="block uppercase text-[10px] text-amber-800">
                Instrucciones de Taller:
              </strong>
              {ot.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
