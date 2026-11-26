import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, CheckCircle2, Trash2, MapPin, Clock, X } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatDateCL, todayISO } from '../../lib/formatters';

const TYPE_STYLES = {
  instalacion: 'bg-orange-50 text-orange-700 border-orange-200',
  entrega: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  seguimiento: 'bg-amber-50 text-amber-800 border-amber-200',
  taller: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function CalendarPanel() {
  const { calendarEvents, saveCalendarEvent, deleteCalendarEvent, showToast } = useErp();
  const [filterType, setFilterType] = useState('todos');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '',
    event_type: 'instalacion',
    event_date: todayISO(),
    event_time: '10:00',
    client_name: '',
    address: '',
    notes: '',
  });

  const visibleEvents = calendarEvents.filter(
    (ev) => filterType === 'todos' || ev.event_type === filterType
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    await saveCalendarEvent({ ...form, status: 'programado' });
    setShowAdd(false);
    setForm({
      title: '',
      event_type: 'instalacion',
      event_date: todayISO(),
      event_time: '10:00',
      client_name: '',
      address: '',
      notes: '',
    });
    showToast('Evento agendado en calendario');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-red-600 shrink-0" />
            <span>Agenda de Entregas, Instalaciones y Seguimientos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Se alimenta automáticamente al aceptar cotizaciones (OT) o al aplazar seguimientos.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agendar Evento
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'instalacion', label: 'Instalaciones' },
          { id: 'entrega', label: 'Entregas / Retiros' },
          { id: 'seguimiento', label: 'Seguimientos (Aplazadas)' },
          { id: 'taller', label: 'Taller' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterType(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition whitespace-nowrap shrink-0 ${
              filterType === t.id
                ? 'bg-red-600 border-red-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visibleEvents.length === 0 ? (
        <div className="p-10 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-xs">
          No hay eventos programados en esta categoría.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEvents.map((ev) => {
            const done = ev.status === 'completado';
            return (
              <div
                key={ev.id}
                className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 shadow-xs ${
                  done ? 'bg-slate-50 border-slate-200 opacity-65' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                  <div className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[76px] sm:min-w-[84px] shrink-0">
                    <div className="text-[11px] sm:text-xs font-bold text-slate-900">
                      {formatDateCL(ev.event_date)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ev.event_time || '10:00'}
                    </div>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          TYPE_STYLES[ev.event_type] || TYPE_STYLES.entrega
                        }`}
                      >
                        {ev.event_type}
                      </span>
                      {ev.quote_correlative && (
                        <span className="text-[11px] font-mono text-slate-500">
                          {ev.quote_correlative}
                        </span>
                      )}
                      {ev.ot_number && (
                        <span className="text-[11px] font-mono text-violet-700 font-semibold">
                          {ev.ot_number}
                        </span>
                      )}
                    </div>
                    <h3
                      className={`text-sm font-bold break-words ${
                        done ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {ev.title}
                    </h3>
                    {ev.address && (
                      <div className="text-xs text-slate-600 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="break-words">{ev.address}</span>
                      </div>
                    )}
                    {ev.notes && <p className="text-xs text-slate-500 break-words">{ev.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    onClick={async () => {
                      await saveCalendarEvent({
                        ...ev,
                        status: done ? 'programado' : 'completado',
                      });
                      showToast(done ? 'Evento reabierto' : 'Evento marcado como completado');
                    }}
                    className={`flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                      done
                        ? 'bg-slate-100 border-slate-200 text-slate-600'
                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {done ? 'Reabrir' : 'Completar'}
                  </button>
                  <button
                    onClick={() => deleteCalendarEvent(ev.id)}
                    className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200"
                    aria-label="Eliminar evento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleAdd}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-bold text-slate-900 text-lg">Agendar Evento</h3>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                required
                placeholder="Título del evento *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                >
                  <option value="instalacion">Instalación</option>
                  <option value="entrega">Entrega / Retiro</option>
                  <option value="seguimiento">Seguimiento</option>
                  <option value="taller">Taller</option>
                </select>
                <input
                  type="time"
                  value={form.event_time}
                  onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                />
              </div>
              <input
                type="date"
                required
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <input
                type="text"
                placeholder="Dirección o ubicación"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <textarea
                rows={2}
                placeholder="Notas..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Guardar Evento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
