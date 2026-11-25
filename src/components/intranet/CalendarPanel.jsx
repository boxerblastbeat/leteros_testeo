import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, CheckCircle2, Trash2, MapPin, Clock, X } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatDateCL, todayISO } from '../../lib/formatters';

const TYPE_STYLES = {
  instalacion: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  entrega: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  seguimiento: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  taller: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-red-500" />
            Agenda de Entregas, Instalaciones y Seguimientos
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Se alimenta automáticamente al aceptar cotizaciones (OT) o al aplazar seguimientos.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Agendar Evento
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              filterType === t.id
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visibleEvents.length === 0 ? (
        <div className="p-12 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center text-zinc-400 text-sm">
          No hay eventos programados en esta categoría.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEvents.map((ev) => {
            const done = ev.status === 'completado';
            return (
              <div
                key={ev.id}
                className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  done
                    ? 'bg-zinc-950/40 border-zinc-800/60 opacity-65'
                    : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-center min-w-[84px]">
                    <div className="text-xs font-bold text-white">{formatDateCL(ev.event_date)}</div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ev.event_time || '10:00'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          TYPE_STYLES[ev.event_type] || TYPE_STYLES.entrega
                        }`}
                      >
                        {ev.event_type}
                      </span>
                      {ev.quote_correlative && (
                        <span className="text-[11px] font-mono text-zinc-400">
                          {ev.quote_correlative}
                        </span>
                      )}
                      {ev.ot_number && (
                        <span className="text-[11px] font-mono text-violet-400">{ev.ot_number}</span>
                      )}
                    </div>
                    <h3 className={`text-sm font-bold ${done ? 'line-through text-zinc-400' : 'text-white'}`}>
                      {ev.title}
                    </h3>
                    {ev.address && (
                      <div className="text-xs text-zinc-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        {ev.address}
                      </div>
                    )}
                    {ev.notes && <p className="text-xs text-zinc-500">{ev.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      await saveCalendarEvent({
                        ...ev,
                        status: done ? 'programado' : 'completado',
                      });
                      showToast(done ? 'Evento reabierto' : 'Evento marcado como completado');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      done
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {done ? 'Reabrir' : 'Completar'}
                  </button>
                  <button
                    onClick={() => deleteCalendarEvent(ev.id)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 border border-zinc-800"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAdd}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-bold text-white text-lg">Agendar Evento</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-zinc-400">
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
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
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
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
                />
              </div>
              <input
                type="date"
                required
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Dirección o ubicación"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
              <textarea
                rows={2}
                placeholder="Notas..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
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
