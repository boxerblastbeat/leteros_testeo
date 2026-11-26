import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Printer,
  Edit3,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  Trash2,
  Download,
  Wrench,
  RotateCcw,
  Truck,
  BadgeDollarSign,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { QUOTE_STATUSES } from '../../data/company';
import { formatCLP, formatDateCL, addDaysISO, todayISO } from '../../lib/formatters';

export default function QuotesManager({ onNewQuote, onEditQuote, onPrintQuote }) {
  const { quotes, changeQuoteStatus, saveWorkOrder, saveCalendarEvent, deleteQuote, showToast } =
    useErp();

  const [statusFilter, setStatusFilter] = useState('activas');
  const [search, setSearch] = useState('');

  const [approveModal, setApproveModal] = useState(null);
  const [approveForm, setApproveForm] = useState({
    oc_number: '',
    deadline: addDaysISO(5),
    priority: 'normal',
    notes: '',
  });

  const [postponeModal, setPostponeModal] = useState(null);
  const [postponeForm, setPostponeForm] = useState({
    postponed_until: addDaysISO(7),
    postpone_reason: '',
  });

  const [invoiceModal, setInvoiceModal] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    invoice_date: todayISO(),
  });

  const kpis = useMemo(() => {
    const active = quotes.filter((q) => !['rechazada', 'borrador'].includes(q.status));
    const emitidas = quotes.filter((q) => q.status === 'emitida');
    const aplazadas = quotes.filter((q) => q.status === 'aplazada');
    const aprobadas = quotes.filter((q) =>
      ['aceptada', 'en_taller', 'despacho', 'facturada', 'pagada'].includes(q.status)
    );
    const totalPipeline = emitidas.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const totalAprobado = aprobadas.reduce((s, q) => s + (Number(q.total) || 0), 0);
    return {
      totalCount: active.length,
      emitidasCount: emitidas.length,
      aplazadasCount: aplazadas.length,
      aprobadasCount: aprobadas.length,
      totalPipeline,
      totalAprobado,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    return quotes.filter((q) => {
      if (statusFilter === 'activas' && ['pagada', 'rechazada'].includes(q.status)) return false;
      if (statusFilter !== 'todas' && statusFilter !== 'activas' && q.status !== statusFilter)
        return false;

      if (!qLower) return true;
      const haystack = [
        q.correlative,
        q.client_snapshot?.name,
        q.client_snapshot?.rut,
        q.oc_number,
        q.invoice_number,
        ...(q.items || []).map((i) => i.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(qLower);
    });
  }, [quotes, statusFilter, search]);

  const getStatusMeta = (id) =>
    QUOTE_STATUSES.find((s) => s.id === id) || QUOTE_STATUSES[0];

  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    if (!approveModal) return;
    const q = approveModal;
    await changeQuoteStatus(
      q,
      'en_taller',
      { oc_number: approveForm.oc_number.trim() },
      `Aceptada${approveForm.oc_number ? ` (${approveForm.oc_number})` : ''} y enviada a Taller`
    );

    const ot = await saveWorkOrder({
      quote_id: q.id,
      quote_correlative: q.correlative,
      client_name: q.client_snapshot?.name || 'Cliente',
      client_phone: q.client_snapshot?.phone || '',
      items: q.items || [],
      delivery_method: q.delivery_method,
      delivery_address: q.delivery_address,
      deadline: approveForm.deadline,
      priority: approveForm.priority,
      status: 'pendiente',
      notes: approveForm.notes || q.notes || '',
    });

    if (approveForm.deadline) {
      await saveCalendarEvent({
        title: `${q.delivery_method === 'instalacion' ? 'Instalación' : 'Entrega'} ${q.correlative} · ${q.client_snapshot?.name}`,
        event_type: q.delivery_method === 'instalacion' ? 'instalacion' : 'entrega',
        event_date: approveForm.deadline,
        event_time: '10:00',
        client_name: q.client_snapshot?.name || '',
        address: q.delivery_address || '',
        quote_correlative: q.correlative,
        ot_number: ot.ot_number,
        status: 'programado',
        notes: approveForm.notes || '',
      });
    }

    setApproveModal(null);
    showToast(`${q.correlative} aceptada · OT ${ot.ot_number} creada en Taller`);
  };

  const handleConfirmPostpone = async (e) => {
    e.preventDefault();
    if (!postponeModal) return;
    await changeQuoteStatus(
      postponeModal,
      'aplazada',
      {
        postponed_until: postponeForm.postponed_until,
        postpone_reason: postponeForm.postpone_reason.trim(),
      },
      `Aplazada hasta ${postponeForm.postponed_until}: ${postponeForm.postpone_reason.trim()}`
    );
    setPostponeModal(null);
    showToast(`${postponeModal.correlative} aplazada · Seguimiento agendado en Calendario`);
  };

  const handleConfirmInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceModal) return;
    await changeQuoteStatus(
      invoiceModal,
      'facturada',
      {
        invoice_number: invoiceForm.invoice_number.trim(),
        invoice_date: invoiceForm.invoice_date,
      },
      `Facturada N° ${invoiceForm.invoice_number.trim()}`
    );
    setInvoiceModal(null);
    showToast(`${invoiceModal.correlative} marcada como Facturada`);
  };

  const exportCsv = () => {
    const headers = ['Correlativo', 'Fecha', 'Cliente', 'RUT', 'Estado', 'OC', 'Factura', 'Neto', 'IVA', 'Total'];
    const rows = filteredQuotes.map((q) => [
      q.correlative,
      (q.created_at || '').slice(0, 10),
      `"${(q.client_snapshot?.name || '').replace(/"/g, '""')}"`,
      q.client_snapshot?.rut || '',
      q.status,
      q.oc_number || '',
      q.invoice_number || '',
      q.subtotal || 0,
      q.tax_amount || 0,
      q.total || 0,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotizaciones-letreros-olivar-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">En Seguimiento (Emitidas)</div>
          <div className="font-heading text-lg sm:text-2xl font-bold text-slate-900 mt-1 truncate">
            {formatCLP(kpis.totalPipeline)}
          </div>
          <div className="text-[11px] text-sky-600 font-semibold mt-1">
            {kpis.emitidasCount} {kpis.emitidasCount === 1 ? 'cotización' : 'cotizaciones'}
          </div>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">Aplazadas (Por Retomar)</div>
          <div className="font-heading text-lg sm:text-2xl font-bold text-amber-600 mt-1">
            {kpis.aplazadasCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Con recordatorio de fecha</div>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">Ventas Cerradas / Taller</div>
          <div className="font-heading text-lg sm:text-2xl font-bold text-emerald-700 mt-1 truncate">
            {formatCLP(kpis.totalAprobado)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {kpis.aprobadasCount} {kpis.aprobadasCount === 1 ? 'aprobada' : 'aprobadas'}
          </div>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Acción Rápida</div>
          <button
            onClick={onNewQuote}
            className="mt-2 w-full py-2.5 px-3 sm:px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/20"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">Nueva Cotización</span>
          </button>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none">
          {[
            { id: 'activas', label: 'Activas' },
            { id: 'emitida', label: 'Emitidas' },
            { id: 'aplazada', label: 'Aplazadas' },
            { id: 'en_taller', label: 'En Taller' },
            { id: 'despacho', label: 'Despacho' },
            { id: 'facturada', label: 'Facturadas' },
            { id: 'pagada', label: 'Pagadas' },
            { id: 'rechazada', label: 'Rechazadas' },
            { id: 'todas', label: 'Todas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-red-600 border-red-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar correlativo, cliente, RUT..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-600"
            />
          </div>
          <button
            onClick={exportCsv}
            title="Exportar tabla a CSV / Excel"
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUOTES LIST */}
      <div className="space-y-3">
        {filteredQuotes.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-xs">
            No se encontraron cotizaciones con los filtros seleccionados.
          </div>
        ) : (
          filteredQuotes.map((q) => {
            const meta = getStatusMeta(q.status);
            return (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {q.correlative}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-500">{formatDateCL(q.created_at)}</span>
                      {q.oc_number && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          OC: {q.oc_number}
                        </span>
                      )}
                      {q.invoice_number && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                          FAC: {q.invoice_number}
                        </span>
                      )}
                    </div>

                    <div className="text-base font-bold text-slate-900">
                      {q.client_snapshot?.name || 'Cliente sin nombre'}
                      {q.client_snapshot?.rut && (
                        <span className="ml-2 text-xs font-mono font-normal text-slate-500">
                          {q.client_snapshot.rut}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600">
                      {(q.items || []).map((i) => `${i.quantity}× ${i.name}`).join(' · ')}
                    </div>

                    {q.status === 'aplazada' && (
                      <div className="mt-2 inline-flex flex-wrap items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          Retomar: <strong>{formatDateCL(q.postponed_until)}</strong>
                        </span>
                        {q.postpone_reason && (
                          <span className="text-amber-700">— {q.postpone_reason}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">
                        Total c/IVA
                      </div>
                      <div className="font-mono text-lg font-extrabold text-slate-900">
                        {formatCLP(q.total)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {['borrador', 'emitida', 'aplazada'].includes(q.status) && (
                        <>
                          <button
                            onClick={() => {
                              setApproveForm({
                                oc_number: q.oc_number || '',
                                deadline: addDaysISO(5),
                                priority: 'normal',
                                notes: q.notes || '',
                              });
                              setApproveModal(q);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                            title="Aceptar cotización y generar OT en Taller"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aceptar → OT
                          </button>

                          <button
                            onClick={() => {
                              setPostponeForm({
                                postponed_until: q.postponed_until || addDaysISO(7),
                                postpone_reason: q.postpone_reason || '',
                              });
                              setPostponeModal(q);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Aplazar
                          </button>
                        </>
                      )}

                      {q.status === 'aplazada' && (
                        <button
                          onClick={async () => {
                            await changeQuoteStatus(q, 'emitida', {}, 'Reactivada a Emitida');
                            showToast(`${q.correlative} reactivada`);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reactivar
                        </button>
                      )}

                      {q.status === 'en_taller' && (
                        <button
                          onClick={async () => {
                            await changeQuoteStatus(
                              q,
                              'despacho',
                              {},
                              'Lista para despacho / instalación'
                            );
                            showToast(`${q.correlative} pasada a Despacho`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-bold flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Pasar a Despacho
                        </button>
                      )}

                      {['aceptada', 'en_taller', 'despacho'].includes(q.status) && (
                        <button
                          onClick={() => {
                            setInvoiceForm({
                              invoice_number: q.invoice_number || '',
                              invoice_date: todayISO(),
                            });
                            setInvoiceModal(q);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          Facturar
                        </button>
                      )}

                      {q.status === 'facturada' && (
                        <button
                          onClick={async () => {
                            await changeQuoteStatus(q, 'pagada', {}, 'Pago confirmado');
                            showToast(`${q.correlative} marcada como Pagada`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <BadgeDollarSign className="w-3.5 h-3.5" />
                          Marcar Pagada
                        </button>
                      )}

                      <button
                        onClick={() => onPrintQuote(q)}
                        title="Ver / Imprimir PDF"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditQuote(q)}
                        title="Editar cotización"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {['emitida', 'aplazada', 'borrador'].includes(q.status) && (
                        <button
                          onClick={async () => {
                            await changeQuoteStatus(q, 'rechazada', {}, 'Marcada como rechazada');
                            showToast(`${q.correlative} marcada como Rechazada`, 'info');
                          }}
                          title="Rechazar cotización"
                          className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar permanentemente ${q.correlative}?`)) {
                            deleteQuote(q.id);
                          }
                        }}
                        title="Eliminar"
                        className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL ACEPTAR -> OT */}
      {approveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmApprove}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex items-center gap-2.5 text-emerald-600">
              <Wrench className="w-5 h-5" />
              <h3 className="font-heading font-bold text-slate-900 text-lg">
                Aceptar {approveModal.correlative} y Crear OT
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Se generará automáticamente una Orden de Trabajo en Taller y un evento en el
              Calendario de Entregas.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  N° Orden de Compra (Opcional)
                </label>
                <input
                  type="text"
                  value={approveForm.oc_number}
                  onChange={(e) => setApproveForm({ ...approveForm, oc_number: e.target.value })}
                  placeholder="Ej: OC-2026-884"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 font-medium mb-1">
                    Fecha Entrega / Obra
                  </label>
                  <input
                    type="date"
                    required
                    value={approveForm.deadline}
                    onChange={(e) => setApproveForm({ ...approveForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-medium mb-1">
                    Prioridad Taller
                  </label>
                  <select
                    value={approveForm.priority}
                    onChange={(e) => setApproveForm({ ...approveForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Notas para Taller
                </label>
                <textarea
                  rows={2}
                  value={approveForm.notes}
                  onChange={(e) => setApproveForm({ ...approveForm, notes: e.target.value })}
                  placeholder="Instrucciones técnicas para fabricación o montaje..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApproveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Confirmar y Enviar a Taller
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL APLAZAR */}
      {postponeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmPostpone}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex items-center gap-2.5 text-amber-600">
              <Clock className="w-5 h-5" />
              <h3 className="font-heading font-bold text-slate-900 text-lg">
                Aplazar {postponeModal.correlative}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Fecha de Seguimiento
                </label>
                <input
                  type="date"
                  required
                  value={postponeForm.postponed_until}
                  onChange={(e) =>
                    setPostponeForm({ ...postponeForm, postponed_until: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Motivo del Aplazamiento
                </label>
                <textarea
                  rows={3}
                  required
                  value={postponeForm.postpone_reason}
                  onChange={(e) =>
                    setPostponeForm({ ...postponeForm, postpone_reason: e.target.value })
                  }
                  placeholder="Ej: Cliente esperando aprobación de presupuesto o término de obra..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostponeModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Guardar Aplazamiento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL FACTURAR */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmInvoice}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex items-center gap-2.5 text-cyan-600">
              <Receipt className="w-5 h-5" />
              <h3 className="font-heading font-bold text-slate-900 text-lg">
                Registrar Factura · {invoiceModal.correlative}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  N° Factura SII
                </label>
                <input
                  type="text"
                  required
                  value={invoiceForm.invoice_number}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })
                  }
                  placeholder="Ej: 1452"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">
                  Fecha Emisión Factura
                </label>
                <input
                  type="date"
                  required
                  value={invoiceForm.invoice_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold"
              >
                Confirmar Factura
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
