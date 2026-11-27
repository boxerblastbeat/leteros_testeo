import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Wrench,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { OT_STATUSES, OT_PRIORITIES } from '../../data/company';
import { DELIVERY_LABELS, formatDateCL, todayISO } from '../../lib/formatters';

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const normalizeWorkshopStatus = (status) => {
  if (['entregado', 'despachado', 'pagada'].includes(status)) return 'despachado';
  if (status === 'facturada') return 'terminado';
  return OT_STATUSES.some((s) => s.id === status) ? status : 'pendiente';
};

const getMondayOfWeek = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (date, n) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
};

const diffDaysISO = (fromIso, toIso) => {
  if (!fromIso || !toIso) return null;
  const a = new Date(`${fromIso.slice(0, 10)}T00:00:00`);
  const b = new Date(`${toIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b - a) / 86400000);
};

export default function WeeklyScheduleModal({ onClose, onSelectOt }) {
  const { workOrders, quotes } = useErp();
  const [weekOffset, setWeekOffset] = useState(0);

  const today = todayISO();

  const quoteCorrelativesSet = useMemo(() => {
    const s = new Set();
    quotes.forEach((q) => {
      if (q.id) s.add(q.id);
      if (q.correlative) s.add(q.correlative);
    });
    return s;
  }, [quotes]);

  const weekDays = useMemo(() => {
    const baseMonday = getMondayOfWeek(new Date());
    const start = addDays(baseMonday, weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const dateObj = addDays(start, i);
      return {
        iso: toISODate(dateObj),
        label: DAY_NAMES[i],
        dayNum: dateObj.getDate(),
        monthShort: dateObj.toLocaleDateString('es-CL', { month: 'short' }),
      };
    });
  }, [weekOffset]);

  const weekRangeLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    return `${first.dayNum} ${first.monthShort} — ${last.dayNum} ${last.monthShort}`;
  }, [weekDays]);

  const activeOts = useMemo(() => {
    return workOrders
      .filter((ot) => normalizeWorkshopStatus(ot.status) !== 'despachado')
      .map((ot) => {
        const stageId = normalizeWorkshopStatus(ot.status);
        const stageIdx = Math.max(
          0,
          OT_STATUSES.findIndex((s) => s.id === stageId)
        );
        const stageMeta = OT_STATUSES[stageIdx] || OT_STATUSES[0];
        const hasQuote =
          (ot.quote_id && quoteCorrelativesSet.has(ot.quote_id)) ||
          (ot.quote_correlative && quoteCorrelativesSet.has(ot.quote_correlative));
        const daysLeft = ot.deadline ? diffDaysISO(today, ot.deadline) : null;
        return {
          ...ot,
          stageId,
          stageIdx,
          stageMeta,
          hasQuote,
          daysLeft,
          isOverdue: Boolean(ot.deadline && ot.deadline < today),
        };
      })
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (b.isOverdue && !a.isOverdue) return 1;
        const rankA = OT_PRIORITIES.find((p) => p.id === a.priority)?.rank ?? 3;
        const rankB = OT_PRIORITIES.find((p) => p.id === b.priority)?.rank ?? 3;
        if (rankA !== rankB) return rankA - rankB;
        return (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31');
      });
  }, [workOrders, quoteCorrelativesSet, today]);

  const overdueOts = useMemo(() => activeOts.filter((ot) => ot.isOverdue), [activeOts]);
  const unscheduledOts = useMemo(() => activeOts.filter((ot) => !ot.deadline), [activeOts]);
  const urgentCount = useMemo(
    () => activeOts.filter((ot) => ot.priority === 'urgente').length,
    [activeOts]
  );

  const byDay = useMemo(() => {
    const map = {};
    weekDays.forEach((d) => {
      map[d.iso] = [];
    });

    activeOts.forEach((ot) => {
      if (ot.deadline && map[ot.deadline]) {
        map[ot.deadline].push(ot);
      }
    });

    return map;
  }, [activeOts, weekDays]);

  const weekCount = useMemo(
    () => Object.values(byDay).reduce((sum, arr) => sum + arr.length, 0),
    [byDay]
  );

  const handleOpenOt = (ot) => {
    if (onSelectOt) {
      onSelectOt(ot);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[96vw] xl:max-w-[1440px] max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
        {/* HEADER */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-600 shrink-0" />
              <span>Cronograma Semanal de Pedidos &amp; Prioridades</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en cualquier OT para ir directamente a gestionarla en Taller.
            </p>
          </div>

          <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-lg whitespace-nowrap"
            >
              {weekOffset === 0 ? `Esta semana · ${weekRangeLabel}` : weekRangeLabel}
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
              <div className="text-[11px] font-semibold text-red-700">Atrasados</div>
              <div className="font-heading text-xl font-extrabold text-red-700 mt-0.5">
                {overdueOts.length}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-[11px] font-semibold text-amber-800">Urgentes Activos</div>
              <div className="font-heading text-xl font-extrabold text-amber-700 mt-0.5">
                {urgentCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-200">
              <div className="text-[11px] font-semibold text-violet-800">Entregas Esta Semana</div>
              <div className="font-heading text-xl font-extrabold text-violet-700 mt-0.5">
                {weekCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-600">Total en Taller</div>
              <div className="font-heading text-xl font-extrabold text-slate-900 mt-0.5">
                {activeOts.length}
              </div>
            </div>
          </div>

          {/* ALERTA ATRASADOS */}
          {overdueOts.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Pedidos con plazo vencido ({overdueOts.length}) — Haz clic para abrir la OT
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {overdueOts.map((ot) => (
                  <button
                    key={ot.id}
                    type="button"
                    onClick={() => handleOpenOt(ot)}
                    className="w-full text-left p-3 rounded-xl bg-white hover:bg-red-50/40 border border-red-200 hover:border-red-400 transition flex items-start justify-between gap-3 text-xs group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{ot.ot_number}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ot.stageMeta.color}`}
                        >
                          Proceso: {ot.stageMeta.label} ({ot.stageIdx + 1}/{OT_STATUSES.length})
                        </span>
                        {ot.hasQuote ? (
                          <span className="text-[10px] font-mono text-slate-500">
                            {ot.quote_correlative}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                            Solo Taller
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 break-words">{ot.client_name}</div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-[11px] font-mono font-bold text-red-600">
                        {formatDateCL(ot.deadline)}
                      </div>
                      <div className="text-[10px] font-semibold text-red-700 inline-flex items-center gap-1 group-hover:underline">
                        <span>Abrir OT</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CRONOGRAMA SEMANAL COMPLETO (SIN RECORTAR OTs) */}
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 lg:min-w-[1260px]">
              {weekDays.map((day) => {
                const items = byDay[day.iso] || [];
                const isToday = day.iso === today;
                return (
                  <div
                    key={day.iso}
                    className={`rounded-2xl border p-3 flex flex-col gap-2.5 min-h-[210px] ${
                      isToday
                        ? 'bg-red-50/40 border-red-300 ring-1 ring-red-200'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 border-b border-slate-200/80 pb-2">
                      <span
                        className={`text-xs font-bold uppercase ${
                          isToday ? 'text-red-700' : 'text-slate-600'
                        }`}
                      >
                        {day.label}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          isToday
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {day.dayNum} {day.monthShort}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic py-6">
                        Sin entregas
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {items.map((ot) => (
                          <button
                            key={ot.id}
                            type="button"
                            onClick={() => handleOpenOt(ot)}
                            className={`w-full text-left p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-red-300 shadow-2xs hover:shadow-sm transition space-y-2 group ${
                              ot.isOverdue || ot.priority === 'urgente'
                                ? 'border-l-4 border-l-red-600'
                                : 'border-l-4 border-l-emerald-500'
                            }`}
                          >
                            {/* Correlativo completo + prioridad */}
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-mono text-xs font-extrabold text-slate-900 group-hover:text-red-600 transition">
                                {ot.ot_number}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 shrink-0 transition" />
                            </div>

                            {/* Proceso actual bien visible */}
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ot.stageMeta.color}`}
                                >
                                  {ot.stageMeta.label} ({ot.stageIdx + 1}/{OT_STATUSES.length})
                                </span>
                                {ot.priority === 'urgente' && (
                                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                    Urgente
                                  </span>
                                )}
                              </div>
                              {/* Mini barra de 5 etapas */}
                              <div className="grid grid-cols-5 gap-0.5">
                                {OT_STATUSES.map((st, sIdx) => (
                                  <div
                                    key={st.id}
                                    className={`h-1 rounded-full ${
                                      sIdx <= ot.stageIdx ? 'bg-violet-600' : 'bg-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Cliente completo (sin truncar) */}
                            <div className="text-xs font-bold text-slate-900 leading-snug break-words">
                              {ot.client_name}
                            </div>

                            {/* Trabajos completos */}
                            {(ot.items || []).length > 0 && (
                              <div className="text-[11px] text-slate-600 leading-snug break-words space-y-0.5">
                                {ot.items.map((item, idx) => (
                                  <div key={item.id || idx}>
                                    • {item.quantity}× {item.name}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Origen, dirección y modificaciones de fecha */}
                            <div className="pt-1.5 border-t border-slate-100 space-y-1 text-[10px] text-slate-500">
                              <div className="flex items-start gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                <div className="break-words">
                                  <div className="font-medium text-slate-700">
                                    {DELIVERY_LABELS[ot.delivery_method] || ot.delivery_method}
                                  </div>
                                  {ot.delivery_address && (
                                    <div className="text-slate-500">{ot.delivery_address}</div>
                                  )}
                                </div>
                              </div>
                              {Array.isArray(ot.deadline_history) &&
                                ot.deadline_history.length > 0 && (
                                  <div className="px-1.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 font-semibold break-words">
                                    Fecha movida (
                                    {ot.deadline_history[ot.deadline_history.length - 1].from ===
                                    'Sin fecha'
                                      ? 'Sin fecha'
                                      : formatDateCL(
                                          ot.deadline_history[ot.deadline_history.length - 1].from
                                        )}{' '}
                                    → {formatDateCL(ot.deadline)})
                                  </div>
                                )}
                              <div className="flex items-center gap-1">
                                {ot.hasQuote ? (
                                  <>
                                    <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="font-mono text-slate-600">
                                      {ot.quote_correlative}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Wrench className="w-3 h-3 text-violet-500 shrink-0" />
                                    <span className="font-semibold text-violet-700">
                                      Solo Taller
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SIN FECHA DEFINIDA */}
          {unscheduledOts.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>OTs activas sin fecha de entrega definida ({unscheduledOts.length}):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {unscheduledOts.map((ot) => (
                  <button
                    key={ot.id}
                    type="button"
                    onClick={() => handleOpenOt(ot)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-xs flex items-center gap-2 transition"
                  >
                    <span className="font-mono font-bold text-slate-900">{ot.ot_number}</span>
                    <span className="text-slate-600">{ot.client_name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ot.stageMeta.color}`}
                    >
                      {ot.stageMeta.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {overdueOts.length === 0 && weekCount === 0 && activeOts.length === 0 && (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 flex items-center justify-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>No hay pedidos pendientes ni atrasados en Taller esta semana.</span>
            </div>
          )}
        </div>

        {/* FOOTER — ÚNICA OPCIÓN DE CIERRE */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <span>Entendido, ir al ERP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
