import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  FileText,
  Wrench,
  Inbox,
  Receipt,
  BadgeDollarSign,
  Truck,
  Clock,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatCLP } from '../../lib/formatters';

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

const CATEGORY_META = {
  cotizacion: {
    label: 'Cotización',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: FileText,
  },
  taller: {
    label: 'Taller / OT',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: Wrench,
  },
  facturacion: {
    label: 'Facturación / Cobro',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: Receipt,
  },
  despacho: {
    label: 'Despacho / Entrega',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: Truck,
  },
  pago: {
    label: 'Pago Confirmado',
    badge: 'bg-green-100 text-green-800 border-green-300',
    icon: BadgeDollarSign,
  },
  solicitud: {
    label: 'Solicitud Web',
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: Inbox,
  },
};

export default function ActivityLogPanel() {
  const { quotes, workOrders, quoteRequests } = useErp();
  const [filterCat, setFilterCat] = useState('todos');
  const [search, setSearch] = useState('');

  const entries = useMemo(() => {
    const list = [];

    // 1. Historial de movimientos de cotizaciones
    quotes.forEach((q) => {
      const clientName = q.client_snapshot?.name || 'Cliente';
      const history = Array.isArray(q.status_history) ? q.status_history : [];
      if (history.length > 0) {
        history.forEach((h, idx) => {
          const st = h.status || q.status;
          const cat =
            st === 'pagada'
              ? 'pago'
              : st === 'facturada'
                ? 'facturacion'
                : st === 'despacho'
                  ? 'despacho'
                  : st === 'en_taller'
                    ? 'taller'
                    : 'cotizacion';
          list.push({
            id: `q-${q.id}-${idx}`,
            at: h.at || q.updated_at || q.created_at,
            category: cat,
            ref: q.correlative,
            client: clientName,
            title: h.note || `Cotización en estado ${st}`,
            meta: `${formatCLP(q.total)}${q.invoice_number ? ` · FAC ${q.invoice_number}` : ''}${q.oc_number ? ` · OC ${q.oc_number}` : ''}`,
          });
        });
      } else {
        list.push({
          id: `q-${q.id}-base`,
          at: q.updated_at || q.created_at,
          category: 'cotizacion',
          ref: q.correlative,
          client: clientName,
          title: `Cotización registrada (${q.status})`,
          meta: formatCLP(q.total),
        });
      }
    });

    // 2. Órdenes de Trabajo
    workOrders.forEach((ot) => {
      const cat =
        ot.status === 'pagada'
          ? 'pago'
          : ot.status === 'facturada'
            ? 'facturacion'
            : ot.status === 'despachado' || ot.status === 'entregado'
              ? 'despacho'
              : 'taller';
      list.push({
        id: `ot-${ot.id}`,
        at: ot.updated_at || ot.created_at,
        category: cat,
        ref: ot.ot_number,
        client: ot.client_name || 'Cliente',
        title: `OT ${ot.ot_number} en estado: ${ot.status}`,
        meta: [
          ot.quote_correlative ? `Ref. ${ot.quote_correlative}` : '',
          ot.invoice_number ? `FAC ${ot.invoice_number}` : '',
          ot.priority === 'urgente' ? 'Prioridad Urgente' : '',
        ]
          .filter(Boolean)
          .join(' · '),
      });
    });

    // 3. Solicitudes web
    quoteRequests.forEach((req) => {
      list.push({
        id: `req-${req.id}`,
        at: req.created_at,
        category: 'solicitud',
        ref: 'WEB',
        client: req.client_name || 'Visitante Web',
        title: `Solicitud web (${req.status}): ${req.material_name}`,
        meta: `${req.service_type} · Cant. ${req.quantity}`,
      });
    });

    return list.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  }, [quotes, workOrders, quoteRequests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterCat !== 'todos' && e.category !== filterCat) return false;
      if (!q) return true;
      return `${e.ref} ${e.client} ${e.title} ${e.meta}`.toLowerCase().includes(q);
    });
  }, [entries, filterCat, search]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-red-600 shrink-0" />
            <span>Bitácora de Movimientos ({entries.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico de solicitudes, cotizaciones, avance de taller (OT), facturación,
            despachos y pagos.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar correlativo, cliente, factura..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-600"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'cotizacion', label: 'Cotizaciones' },
          { id: 'taller', label: 'Taller / OTs' },
          { id: 'facturacion', label: 'Facturación' },
          { id: 'despacho', label: 'Despachos' },
          { id: 'pago', label: 'Pagos' },
          { id: 'solicitud', label: 'Solicitudes Web' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterCat(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition whitespace-nowrap shrink-0 ${
              filterCat === tab.id
                ? 'bg-red-600 border-red-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-xs">
          No hay movimientos registrados con los filtros actuales.
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filtered.slice(0, 150).map((item) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.cotizacion;
            const Icon = meta.icon;
            return (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${meta.badge}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900">{item.ref}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {item.client}
                      </span>
                    </div>
                    <div className="text-xs text-slate-800 break-words">{item.title}</div>
                    {item.meta && (
                      <div className="text-[11px] font-mono text-slate-500">{item.meta}</div>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 pl-11 sm:pl-0">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTimeCL(item.at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
