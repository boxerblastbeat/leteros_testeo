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
  GanttChart,
  LayoutGrid,
  Wrench,
  FileText,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { OT_STATUSES } from '../../data/company';
import { DELIVERY_LABELS, formatDateCL, todayISO } from '../../lib/formatters';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const STAGE_BAR_COLORS = {
  pendiente: 'bg-slate-400 text-white',
  diseno: 'bg-sky-500 text-white',
  produccion: 'bg-amber-500 text-white',
  terminado: 'bg-emerald-500 text-white',
  despachado: 'bg-orange-500 text-white',
};

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

export default function WeeklyScheduleModal({ onClose }) {
  const { workOrders, quotes, calendarEvents } = useErp();
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState('gantt'); // 'gantt' | 'calendar'

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
        const startIso = (ot.created_at || today).slice(0, 10);
        const endIso = ot.deadline || startIso;
        const daysLeft = ot.deadline ? diffDaysISO(today, ot.deadline) : null;
        return {
          ...ot,
          stageId,
          stageIdx,
          stageMeta,
          hasQuote,
          startIso,
          endIso,
          daysLeft,
          isOverdue: Boolean(ot.deadline && ot.deadline < today),
        };
      })
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (b.isOverdue && !a.isOverdue) return 1;
        if (a.priority === 'urgente' && b.priority !== 'urgente') return -1;
        if (b.priority === 'urgente' && a.priority !== 'urgente') return 1;
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
        map[ot.deadline].push({
          type: 'ot',
          id: ot.id,
          ref: ot.ot_number,
          quoteRef: ot.hasQuote ? ot.quote_correlative : null,
          client: ot.client_name,
          priority: ot.priority || 'normal',
          stageId: ot.stageId,
          stageMeta: ot.stageMeta,
          stageIdx: ot.stageIdx,
          deliveryMethod: ot.delivery_method,
          summary: (ot.items || []).map((i) => `${i.quantity}× ${i.name}`).join(' · '),
        });
      }
    });

    calendarEvents.forEach((ev) => {
      if (ev.status === 'completado') return;
      if (ev.event_date && map[ev.event_date]) {
        const dup = map[ev.event_date].some(
          (item) =>
            (ev.ot_number && item.ref === ev.ot_number) ||
            (ev.quote_correlative && item.quoteRef === ev.quote_correlative)
        );
        if (!dup) {
          map[ev.event_date].push({
            type: 'event',
            id: ev.id,
            ref: ev.ot_number || ev.quote_correlative || ev.event_time || 'Agenda',
            quoteRef: ev.quote_correlative || null,
            client: ev.client_name || ev.title,
            priority: ev.event_type === 'instalacion' ? 'urgente' : 'normal',
            stageId: ev.event_type,
            stageMeta: {
              label:
                ev.event_type === 'seguimiento'
                  ? 'Seguimiento'
                  : ev.event_type === 'instalacion'
                    ? 'Instalación'
                    : 'Entrega',
              color: 'bg-sky-50 text-sky-700 border-sky-200',
            },
            stageIdx: 0,
            deliveryMethod: ev.event_type,
            summary: ev.title,
          });
        }
      }
    });

    Object.keys(map).forEach((iso) => {
      map[iso].sort((a, b) => {
        if (a.priority === 'urgente' && b.priority !== 'urgente') return -1;
        if (b.priority === 'urgente' && a.priority !== 'urgente') return 1;
        return 0;
      });
    });

    return map;
  }, [activeOts, calendarEvents, weekDays]);

  const weekCount = useMemo(
    () => Object.values(byDay).reduce((sum, arr) => sum + arr.length, 0),
    [byDay]
  );

  const renderDeadlineBadge = (ot) => {
    if (!ot.deadline) {
      return (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
          Sin fecha
        </span>
      );
    }
    if (ot.daysLeft < 0) {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
          Atrasada {Math.abs(ot.daysLeft)}d
        </span>
      );
    }
    if (ot.daysLeft === 0) {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white">
          Vence HOY
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
        En {ot.daysLeft}d · {formatDateCL(ot.deadline)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
        {/* HEADER */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-600 shrink-0" />
              <span>Cronograma Semanal &amp; Carta Gantt de Taller</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ubicación actual de cada OT, etapa productiva, origen y plazos vigentes de la semana.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Vista Gantt / Calendario */}
            <div className="inline-flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('gantt')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'gantt'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <GanttChart className="w-3.5 h-3.5" />
                <span>Carta Gantt</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'calendar'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Por Día</span>
              </button>
            </div>

            {/* Navegador de semana */}
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
                  Pedidos con plazo vencido ({overdueOts.length}) — Requieren atención inmediata
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {overdueOts.map((ot) => (
                  <div
                    key={ot.id}
                    className="p-2.5 rounded-xl bg-white border border-red-200 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{ot.ot_number}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ot.stageMeta.color}`}
                        >
                          {ot.stageMeta.label}
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
                      <div className="font-bold text-slate-800 truncate">{ot.client_name}</div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-red-600 shrink-0">
                      {formatDateCL(ot.deadline)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA CARTA GANTT */}
          {viewMode === 'gantt' ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-3 text-left font-bold w-[300px]">
                        Orden de Trabajo · Ubicación y Etapa
                      </th>
                      {weekDays.map((day) => {
                        const isToday = day.iso === today;
                        return (
                          <th
                            key={day.iso}
                            className={`py-2 px-1.5 text-center border-l border-slate-200/80 ${
                              isToday ? 'bg-red-50 text-red-700' : ''
                            }`}
                          >
                            <div className="text-[10px] uppercase font-bold">{day.label}</div>
                            <div
                              className={`inline-block mt-0.5 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                                isToday ? 'bg-red-600 text-white' : 'text-slate-700'
                              }`}
                            >
                              {day.dayNum} {day.monthShort}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeOts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          No hay OTs activas en Taller.
                        </td>
                      </tr>
                    ) : (
                      activeOts.map((ot) => {
                        const barColor = ot.isOverdue
                          ? 'bg-red-600 text-white'
                          : ot.priority === 'urgente'
                            ? 'bg-red-500 text-white'
                            : STAGE_BAR_COLORS[ot.stageId] || 'bg-violet-600 text-white';

                        return (
                          <tr key={ot.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 px-3 align-top">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900">
                                    {ot.ot_number}
                                  </span>
                                  {ot.hasQuote ? (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      <FileText className="w-2.5 h-2.5 text-slate-400" />
                                      {ot.quote_correlative}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                                      <Wrench className="w-2.5 h-2.5" />
                                      En Taller
                                    </span>
                                  )}
                                  {ot.priority === 'urgente' && (
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                      Urgente
                                    </span>
                                  )}
                                </div>
                                <div className="font-bold text-slate-800 truncate max-w-[270px]">
                                  {ot.client_name}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ot.stageMeta.color}`}
                                  >
                                    {ot.stageIdx + 1}/{OT_STATUSES.length} · {ot.stageMeta.label}
                                  </span>
                                  {renderDeadlineBadge(ot)}
                                </div>
                              </div>
                            </td>

                            {weekDays.map((day) => {
                              const isToday = day.iso === today;
                              const isDeadline = ot.deadline === day.iso;
                              const inSpan =
                                ot.deadline &&
                                day.iso >= ot.startIso &&
                                day.iso <= ot.endIso;
                              const isStart = day.iso === ot.startIso;

                              return (
                                <td
                                  key={day.iso}
                                  className={`p-1 border-l border-slate-100 align-middle text-center ${
                                    isToday ? 'bg-red-50/40' : ''
                                  }`}
                                >
                                  {inSpan ? (
                                    <div
                                      title={`${ot.ot_number} · ${ot.stageMeta.label} (Plazo: ${formatDateCL(ot.deadline)})`}
                                      className={`h-7 flex items-center justify-center px-1.5 text-[10px] font-bold truncate shadow-2xs ${barColor} ${
                                        isStart && isDeadline
                                          ? 'rounded-lg'
                                          : isStart
                                            ? 'rounded-l-lg'
                                            : isDeadline
                                              ? 'rounded-r-lg ring-2 ring-offset-1 ring-slate-900/20'
                                              : 'rounded-none'
                                      }`}
                                    >
                                      {isDeadline ? 'Entrega' : isStart ? 'Inicio' : '···'}
                                    </div>
                                  ) : isDeadline ? (
                                    <div
                                      className={`h-7 rounded-lg flex items-center justify-center px-1.5 text-[10px] font-bold ${barColor}`}
                                    >
                                      Entrega
                                    </div>
                                  ) : null}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Leyenda Carta Gantt */}
              <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700">Etapas:</span>
                {OT_STATUSES.slice(0, 4).map((st) => (
                  <span key={st.id} className="inline-flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        (STAGE_BAR_COLORS[st.id] || 'bg-slate-400').split(' ')[0]
                      }`}
                    />
                    <span>{st.label}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  <span>Atrasada / Urgente</span>
                </span>
              </div>
            </div>
          ) : (
            /* VISTA CALENDARIO POR DÍA */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
              {weekDays.map((day) => {
                const items = byDay[day.iso] || [];
                const isToday = day.iso === today;
                return (
                  <div
                    key={day.iso}
                    className={`rounded-2xl border p-2.5 flex flex-col gap-2 min-h-[150px] ${
                      isToday
                        ? 'bg-red-50/40 border-red-300 ring-1 ring-red-200'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                      <span
                        className={`text-xs font-bold uppercase ${
                          isToday ? 'text-red-700' : 'text-slate-600'
                        }`}
                      >
                        {day.label}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                          isToday
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {day.dayNum} {day.monthShort}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-[11px] text-slate-400 italic py-4">
                        Sin entregas
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={`${item.type}-${item.id}`}
                            className={`p-2 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1 text-[11px] ${
                              item.priority === 'urgente'
                                ? 'border-l-4 border-l-red-600'
                                : 'border-l-4 border-l-emerald-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-bold text-slate-900 truncate">
                                {item.ref}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                {item.quoteRef ? item.quoteRef.slice(-4) : 'Taller'}
                              </span>
                            </div>
                            <div className="font-bold text-slate-800 leading-tight line-clamp-2">
                              {item.client}
                            </div>
                            {item.summary && (
                              <div className="text-[10px] text-slate-500 line-clamp-2 leading-snug">
                                {item.summary}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                              <span
                                className={`font-bold px-1.5 py-0.2 rounded-full border ${item.stageMeta.color}`}
                              >
                                {item.stageMeta.label}
                              </span>
                              <span className="inline-flex items-center gap-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                {DELIVERY_LABELS[item.deliveryMethod] || item.deliveryMethod}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* SIN FECHA DEFINIDA */}
          {unscheduledOts.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Hay <strong>{unscheduledOts.length}</strong> OT(s) activas sin fecha de entrega
                definida:{' '}
                <span className="font-mono">
                  {unscheduledOts.map((o) => o.ot_number).join(', ')}
                </span>
              </span>
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
