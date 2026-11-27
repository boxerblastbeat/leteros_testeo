import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import {
  History,
  Search,
  User,
  Download,
  ShieldCheck,
  Clock,
  FileText,
  Wrench,
  Inbox,
  Users,
  Package,
  Calendar,
  LogIn,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { todayISO } from '../../lib/formatters';

const formatDateTimeCL = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ACTION_META = {
  crear: { label: 'Creación', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  editar: { label: 'Edición', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  estado: { label: 'Cambio Estado', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  facturar: { label: 'Facturación', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  despachar: { label: 'Despacho', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  pagar: { label: 'Pago', badge: 'bg-green-100 text-green-800 border-green-300' },
  eliminar: { label: 'Eliminación', badge: 'bg-red-50 text-red-700 border-red-200' },
  sesion: { label: 'Sesión', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const ENTITY_META = {
  cotizacion: { label: 'Cotización', icon: FileText },
  ot: { label: 'Taller / OT', icon: Wrench },
  solicitud: { label: 'Solicitud Web', icon: Inbox },
  cliente: { label: 'Cliente', icon: Users },
  material: { label: 'Tarifario', icon: Package },
  agenda: { label: 'Agenda', icon: Calendar },
  sesion: { label: 'Acceso', icon: LogIn },
};

const getInitials = (email) => {
  if (!email) return 'US';
  const base = email.split('@')[0] || email;
  return base.slice(0, 2).toUpperCase();
};

export default function ActivityLogPanel() {
  const { auditLogs, loadAuditLogsOnDemand } = useErp();

  const [accountFilter, setAccountFilter] = useState('todas');
  const [entityFilter, setEntityFilter] = useState('todos');
  const [actionFilter, setActionFilter] = useState('todas');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [visibleCount, setVisibleCount] = useState(40);

  useEffect(() => {
    loadAuditLogsOnDemand?.();
  }, [loadAuditLogsOnDemand]);

  useEffect(() => {
    setVisibleCount(40);
  }, [accountFilter, entityFilter, actionFilter, deferredSearch]);

  const accounts = useMemo(() => {
    const set = new Set();
    auditLogs.forEach((l) => {
      if (l.user_email) set.add(l.user_email);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return auditLogs.filter((log) => {
      if (accountFilter !== 'todas' && log.user_email !== accountFilter) return false;
      if (entityFilter !== 'todos' && log.entity_type !== entityFilter) return false;
      if (actionFilter !== 'todas' && log.action !== actionFilter) return false;
      if (!q) return true;
      const hay = [log.user_email, log.entity_ref, log.summary, log.entity_type, log.action]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [auditLogs, accountFilter, entityFilter, actionFilter, deferredSearch]);

  const visibleLogs = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const exportCsv = () => {
    const headers = ['Fecha/Hora', 'Cuenta', 'Acción', 'Módulo', 'Referencia', 'Detalle'];
    const rows = filtered.map((l) => [
      `"${formatDateTimeCL(l.created_at)}"`,
      `"${(l.user_email || '').replace(/"/g, '""')}"`,
      ACTION_META[l.action]?.label || l.action,
      ENTITY_META[l.entity_type]?.label || l.entity_type,
      `"${(l.entity_ref || '').replace(/"/g, '""')}"`,
      `"${(l.summary || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora-operativa-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-red-600 shrink-0" />
            <span>Bitácora de Control Operativo ({filtered.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Registro inalterable de qué cuenta ejecutó cada acción en la Intranet (solo lectura).
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cuenta, COT, OT, cliente..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-600"
            />
          </div>

          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600"
            title="Filtrar por cuenta de usuario"
          >
            <option value="todas">Todas las cuentas ({accounts.length})</option>
            {accounts.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600"
            title="Filtrar por tipo de acción"
          >
            <option value="todas">Todas las acciones</option>
            {Object.entries(ACTION_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>

          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            title="Exportar bitácora a CSV / Excel"
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* MODULE FILTER PILLS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none">
        {[
          { id: 'todos', label: 'Todos los módulos' },
          { id: 'cotizacion', label: 'Cotizaciones' },
          { id: 'ot', label: 'Taller / OTs' },
          { id: 'solicitud', label: 'Solicitudes Web' },
          { id: 'cliente', label: 'Clientes' },
          { id: 'material', label: 'Tarifario' },
          { id: 'agenda', label: 'Agenda' },
          { id: 'sesion', label: 'Sesiones' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setEntityFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition whitespace-nowrap shrink-0 ${
              entityFilter === tab.id
                ? 'bg-red-600 border-red-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* AUDIT TABLE / LIST */}
      {filtered.length === 0 ? (
        <div className="p-10 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-xs">
          <p className="text-sm font-semibold text-slate-700">
            Aún no hay registros de actividad con estos filtros.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            A partir de ahora, cada vez que cualquier cuenta cree, edite, cambie de estado,
            facture, despache, marque pagada o elimine un registro, quedará registrado aquí con su
            correo y hora exacta.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs divide-y divide-slate-100 overflow-hidden">
          {visibleLogs.map((log) => {
            const actionMeta = ACTION_META[log.action] || {
              label: log.action,
              badge: 'bg-slate-100 text-slate-700 border-slate-200',
            };
            const entityMeta = ENTITY_META[log.entity_type] || {
              label: log.entity_type,
              icon: History,
            };
            const EntityIcon = entityMeta.icon;

            return (
              <div
                key={log.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5"
                    title={log.user_email}
                  >
                    {getInitials(log.user_email)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        <User className="w-3 h-3 text-slate-500" />
                        {log.user_email}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${actionMeta.badge}`}
                      >
                        {actionMeta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        <EntityIcon className="w-3 h-3 text-slate-400" />
                        {entityMeta.label}
                      </span>
                      {log.entity_ref && (
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {log.entity_ref}
                        </span>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm text-slate-800 break-words">
                      {log.summary}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium shrink-0 sm:text-right pl-12 sm:pl-0">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{formatDateTimeCL(log.created_at)}</span>
                </div>
              </div>
            );
          })}
          {filtered.length > visibleCount && (
            <div className="p-3.5 bg-slate-50 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 40)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 transition"
              >
                Mostrar 40 más ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
