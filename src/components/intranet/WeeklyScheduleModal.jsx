import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Wrench,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { OT_STATUSES } from '../../data/company';
import { DELIVERY_LABELS, formatDateCL, todayISO } from '../../lib/formatters';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const normalizeWorkshopStatus = (status) => {
  if (['entregado', 'despachado', 'pagada'].includes(status)) return 'despachado';
  if (status === 'facturada') return 'terminado';
  return OT_STATUSES.some((s) => s.id === status) ? status : 'pendiente';
};

const getMondayOfWeek = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sun, 1 = Mon...
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

export default function WeeklyScheduleModal({ onClose, onGoToWorkshop, onGoToCalendar }) {
  const { workOrders, calendarEvents } = useErp();
  const [weekOffset, setWeekOffset] = useState(0);

  const today = todayISO();

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

  // OTs activas (aún no despachadas)
  const activeOts = useMemo(
    () =>
      workOrders.filter((ot) => normalizeWorkshopStatus(ot.status) !== 'despachado'),
    [workOrders]
  );

  // Pedidos atrasados (deadline < hoy)
  const overdueOts = useMemo(() => {
    return activeOts
      .filter((ot) => ot.deadline && ot.deadline < today)
      .sort((a, b) => {
        if (a.priority === 'urgente' && b.priority !== 'urgente') return -1;
        if (b.priority === 'urgente' && a.priority !== 'urgente') return 1;
        return (a.deadline || '').localeCompare(b.deadline || '');
      });
  }, [activeOts, today]);

  // Pedidos sin fecha de entrega definida
  const unscheduledOts = useMemo(
    () => activeOts.filter((ot) => !ot.deadline),
    [activeOts]
  );

  // Mapa de pedidos por día de la semana seleccionada
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
          quoteRef: ot.quote_correlative,
          client: ot.client_name,
          priority: ot.priority || 'normal',
          status: normalizeWorkshopStatus(ot.status),
          deliveryMethod: ot.delivery_method,
          summary: (ot.items || []).map((i) => `${i.quantity}× ${i.name}`).join(' · '),
        });
      }
    });

    // Agregar eventos de seguimiento/instalación que no dupliquen una OT ya listada ese día
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
            client: ev.client_name || ev.title,
            priority: ev.event_type === 'instalacion' ? 'urgente' : 'normal',
            status: ev.event_type,
            deliveryMethod: ev.event_type,
            summary: ev.title,
          });
        }
      }
    });

    // Ordenar cada día: urgentes primero
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

  const urgentCount = useMemo(
    () => activeOts.filter((ot) => ot.priority === 'urgente').length,
    [activeOts]
  );

  const getStageLabel = (status) => {
    const found = OT_STATUSES.find((s) => s.id === status);
    if (found) return found.label;
    if (status === 'seguimiento') return 'Seguimiento';
    if (status === 'instalacion') return 'Instalación';
    if (status === 'entrega') return 'Entrega';
    return status;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
        {/* HEADER */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-600 shrink-0" />
              <span>Cronograma Semanal de Pedidos &amp; Prioridades</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Plazos vigentes de Taller y entregas programadas para coordinar la semana.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
              <div className="text-[11px] font-semibold text-violet-800">En Esta Semana</div>
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
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{ot.ot_number}</span>
                        {ot.priority === 'urgente' && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                            URGENTE
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-slate-500">
                          {getStageLabel(normalizeWorkshopStatus(ot.status))}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 truncate mt-0.5">
                        {ot.client_name}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-red-600 shrink-0">
                      {formatDateCL(ot.deadline)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GRILLA SEMANAL LUN-DOM */}
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
                            {item.priority === 'urgente' && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 shrink-0">
                                Urg
                              </span>
                            )}
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
                            <span className="font-semibold text-violet-700">
                              {getStageLabel(item.status)}
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

        {/* FOOTER */}
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
