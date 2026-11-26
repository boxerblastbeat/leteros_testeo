import React, { useMemo, useState } from 'react';
import { History, Search, Download, User, ShieldCheck, RefreshCw } from 'lucide-react';
import { useErp } from '../../context/ErpContext';

const MODULE_LABELS = {
  cotizaciones: { label: 'Cotizaciones', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  taller: { label: 'Taller & OTs', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  solicitudes: { label: 'Solicitudes Web', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  clientes: { label: 'Clientes', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  tarifario: { label: 'Tarifario', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  agenda: { label: 'Agenda', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  sesion: { label: 'Sesión', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const ACTION_LABELS = {
  crear: { label: 'Creó', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  editar: { label: 'Editó', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  estado: { label: 'Estado', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  eliminar: { label: 'Eliminó', color: 'bg-red-50 text-red-700 border-red-200' },
  login: { label: 'Ingreso', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  logout: { label: 'Salida', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function formatDateTimeCL(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ActivityLogPanel() {
  const { activityLogs, refreshErp, showToast } = useErp();
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('todos');
  const [moduleFilter, setModuleFilter] = useState('todos');
  const [refreshing, setRefreshing] = useState(false);

  const uniqueUsers = useMemo(() => {
    const set = new Set();
    activityLogs.forEach((l) => {
      if (l.user_email) set.add(l.user_email);
    });
    return Array.from(set).sort();
  }, [activityLogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activityLogs.filter((l) => {
      if (userFilter !== 'todos' && l.user_email !== userFilter) return false;
      if (moduleFilter !== 'todos' && l.module !== moduleFilter) return false;
      if (!q) return true;
      return (
        (l.user_email || '').toLowerCase().includes(q) ||
        (l.entity_ref || '').toLowerCase().includes(q) ||
        (l.summary || '').toLowerCase().includes(q) ||
        (l.module || '').toLowerCase().includes(q)
      );
    });
  }, [activityLogs, userFilter, moduleFilter, search]);

  const handleExportCsv = () => {
    const headers = ['Fecha y Hora', 'Cuenta', 'Módulo', 'Acción', 'Referencia', 'Detalle'];
    const rows = filtered.map((l) => [
      formatDateTimeCL(l.created_at),
      l.user_email || '',
      MODULE_LABELS[l.module]?.label || l.module || '',
      ACTION_LABELS[l.action]?.label || l.action || '',
      l.entity_ref || '',
      l.summary || '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora-letreros-olivar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Bitácora exportada a CSV');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-red-600 shrink-0" />
            <span>Bitácora de Actividad (Logs por Cuenta)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Registro inmutable: cada acción queda asociada automáticamente a la cuenta autenticada.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await refreshErp();
              } finally {
                setRefreshing(false);
              }
            }}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio, cliente, detalle..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-red-500"
          />
        </div>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-red-500"
        >
          <option value="todos">Todas las cuentas ({uniqueUsers.length})</option>
          {uniqueUsers.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-red-500"
        >
          <option value="todos">Todos los módulos</option>
          {Object.entries(MODULE_LABELS).map(([id, meta]) => (
            <option key={id} value={id}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de registros */}
      {filtered.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-xs">
          Aún no hay registros de actividad que coincidan con el filtro.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Fecha / Hora</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Cuenta</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Módulo</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Acción</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Ref.</th>
                  <th className="py-3 px-4 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => {
                  const mod = MODULE_LABELS[log.module] || {
                    label: log.module,
                    color: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  const act = ACTION_LABELS[log.action] || {
                    label: log.action,
                    color: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTimeCL(log.created_at)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {log.user_email || 'sistema'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${mod.color}`}
                        >
                          {mod.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${act.color}`}
                        >
                          {act.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {log.entity_ref || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 min-w-[240px]">{log.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
            <span>Mostrando {filtered.length} de {activityLogs.length} registros</span>
            <span>Historial protegido contra borrado</span>
          </div>
        </div>
      )}
    </div>
  );
}
