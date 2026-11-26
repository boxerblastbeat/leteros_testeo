import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Printer,
  Plus,
  CheckCircle2,
  MapPin,
  Calendar,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  Receipt,
  BadgeDollarSign,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { OT_STATUSES, OT_PRIORITIES, COMPANY_INFO } from '../../data/company';
import { formatDateCL, DELIVERY_LABELS, addDaysISO, todayISO, uid } from '../../lib/formatters';

const OT_TO_QUOTE_STATUS = {
  pendiente: 'en_taller',
  diseno: 'en_taller',
  produccion: 'en_taller',
  terminado: 'en_taller',
  despachado: 'despacho',
  entregado: 'despacho',
  facturada: 'facturada',
  pagada: 'pagada',
};

export default function WorkOrdersPanel() {
  const { workOrders, quotes, saveWorkOrder, changeQuoteStatus, showToast } = useErp();

  const [filter, setFilter] = useState('activas');
  const [printOt, setPrintOt] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [invoiceOt, setInvoiceOt] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    invoice_date: todayISO(),
  });
  const [newOt, setNewOt] = useState({
    client_name: '',
    client_phone: '',
    itemName: '',
    width: '1.20',
    height: '0.80',
    quantity: 1,
    delivery_method: 'instalacion',
    delivery_address: '',
    deadline: addDaysISO(4),
    priority: 'normal',
    notes: '',
  });

  const otTabCounts = useMemo(() => {
    const counts = {
      activas: workOrders.filter((ot) => ot.status !== 'pagada').length,
      todas: workOrders.length,
    };
    OT_STATUSES.forEach((s) => {
      counts[s.id] = workOrders.filter((ot) => ot.status === s.id).length;
    });
    return counts;
  }, [workOrders]);

  const filtered = useMemo(() => {
    return workOrders.filter((ot) => {
      if (filter === 'activas') return ot.status !== 'pagada';
      if (filter === 'todas') return true;
      return ot.status === filter;
    });
  }, [workOrders, filter]);

  const syncLinkedQuote = async (ot, targetOtStatus, extraQuoteFields = {}, note = '') => {
    if (!ot.quote_id) return;
    const linked = quotes.find((q) => q.id === ot.quote_id);
    if (!linked) return;
    const mappedQuoteStatus = OT_TO_QUOTE_STATUS[targetOtStatus];
    if (!mappedQuoteStatus) return;

    const needsUpdate =
      linked.status !== mappedQuoteStatus || Object.keys(extraQuoteFields).length > 0;
    if (needsUpdate) {
      await changeQuoteStatus(
        linked,
        mappedQuoteStatus,
        extraQuoteFields,
        note || `Sincronizado desde OT ${ot.ot_number} (${targetOtStatus})`
      );
    }
  };

  const applyOtStatus = async (ot, targetStatus, extra = {}, direction = 'avance') => {
    const meta = OT_STATUSES.find((s) => s.id === targetStatus);
    await saveWorkOrder({ ...ot, ...extra, status: targetStatus });
    const quoteExtra = {};
    if (extra.invoice_number !== undefined) quoteExtra.invoice_number = extra.invoice_number;
    if (extra.invoice_date !== undefined) quoteExtra.invoice_date = extra.invoice_date;

    await syncLinkedQuote(
      ot,
      targetStatus,
      quoteExtra,
      `OT ${ot.ot_number} ${direction === 'retroceso' ? 'devuelta' : 'actualizada'} a ${meta?.label || targetStatus}`
    );
    showToast(
      `${ot.ot_number} ${direction === 'retroceso' ? 'devuelta' : 'actualizada'} a ${meta?.label || targetStatus}`
    );
  };

  const advanceStatus = async (ot) => {
    const order = OT_STATUSES.map((s) => s.id);
    const idx = order.indexOf(ot.status);
    if (idx === -1 || idx >= order.length - 1) return;
    const nextStatus = order[idx + 1];

    if (nextStatus === 'facturada') {
      setInvoiceForm({
        invoice_number: ot.invoice_number || '',
        invoice_date: ot.invoice_date || todayISO(),
      });
      setInvoiceOt(ot);
      return;
    }

    await applyOtStatus(ot, nextStatus, {}, 'avance');
  };

  const revertStatus = async (ot) => {
    const order = OT_STATUSES.map((s) => s.id);
    const idx = order.indexOf(ot.status);
    if (idx <= 0) return;
    const prevStatus = order[idx - 1];
    await applyOtStatus(ot, prevStatus, {}, 'retroceso');
  };

  const handleConfirmInvoiceOt = async (e) => {
    e.preventDefault();
    if (!invoiceOt) return;
    await applyOtStatus(
      invoiceOt,
      'facturada',
      {
        invoice_number: invoiceForm.invoice_number.trim(),
        invoice_date: invoiceForm.invoice_date,
      },
      'avance'
    );
    setInvoiceOt(null);
  };

  const handleCreateManualOt = async (e) => {
    e.preventDefault();
    const created = await saveWorkOrder({
      client_name: newOt.client_name.trim(),
      client_phone: newOt.client_phone.trim(),
      items: [
        {
          id: uid(),
          name: newOt.itemName.trim(),
          width: parseFloat(newOt.width) || '',
          height: parseFloat(newOt.height) || '',
          quantity: Math.max(1, parseInt(newOt.quantity, 10) || 1),
        },
      ],
      delivery_method: newOt.delivery_method,
      delivery_address: newOt.delivery_address.trim(),
      deadline: newOt.deadline,
      priority: newOt.priority,
      status: 'pendiente',
      notes: newOt.notes.trim(),
    });
    setShowNewModal(false);
    setNewOt({
      client_name: '',
      client_phone: '',
      itemName: '',
      width: '1.20',
      height: '0.80',
      quantity: 1,
      delivery_method: 'instalacion',
      delivery_address: '',
      deadline: addDaysISO(4),
      priority: 'normal',
      notes: '',
    });
    showToast(`Orden de Trabajo ${created.ot_number} creada`);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-red-600 shrink-0" />
            <span>Producción, Órdenes de Trabajo (OT), Facturación y Pago</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Control paso a paso (con avance y retroceso) desde taller hasta facturación y pago
            confirmado.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva OT Manual
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none">
        {[
          { id: 'activas', label: 'Activas (Sin Pagar)' },
          ...OT_STATUSES,
          { id: 'todas', label: 'Todas' },
        ].map((tab) => {
          const count = otTabCounts[tab.id] || 0;
          const isActive = filter === tab.id;
          const isPendingStage = !['todas', 'pagada'].includes(tab.id) && count > 0;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                isActive
                  ? 'bg-red-600 border-red-600 text-white shadow-xs'
                  : isPendingStage
                    ? 'bg-amber-50/70 border-amber-300 text-slate-900 hover:bg-amber-100/70'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : isPendingStage
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-xs">
          No hay Órdenes de Trabajo en este estado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filtered.map((ot) => {
            const idx = OT_STATUSES.findIndex((s) => s.id === ot.status);
            const currentIdx = idx >= 0 ? idx : 0;
            const meta = OT_STATUSES[currentIdx];
            const prevMeta = currentIdx > 0 ? OT_STATUSES[currentIdx - 1] : null;
            const nextMeta = currentIdx < OT_STATUSES.length - 1 ? OT_STATUSES[currentIdx + 1] : null;

            return (
              <div
                key={ot.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 ${prioMeta.cardBorder} shadow-xs flex flex-col justify-between gap-4`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {ot.ot_number}
                      </span>
                      {ot.quote_correlative && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {ot.quote_correlative}
                        </span>
                      )}
                      {ot.invoice_number && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                          FAC: {ot.invoice_number}
                        </span>
                      )}
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${prioMeta.badge}`}>
                        {ot.priority === 'urgente' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${prioMeta.dot}`} />
                        )}
                        {prioMeta.label}
                      </span>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Barra visual de avance paso a paso */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-7 gap-1">
                      {OT_STATUSES.map((step, sIdx) => (
                        <div
                          key={step.id}
                          title={step.label}
                          className={`h-1.5 rounded-full transition ${
                            sIdx <= currentIdx
                              ? ot.status === 'pagada'
                                ? 'bg-green-600'
                                : 'bg-red-600'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>
                        Paso {currentIdx + 1} de {OT_STATUSES.length}
                      </span>
                      <span>{meta.label}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base break-words">{ot.client_name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-red-600" />
                        Entrega: <strong className="text-slate-800">{formatDateCL(ot.deadline)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {DELIVERY_LABELS[ot.delivery_method] || ot.delivery_method}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    {(ot.items || []).map((item, i) => (
                      <div key={item.id || i} className="text-xs flex justify-between gap-2">
                        <span className="text-slate-800 font-medium break-words">
                          {item.quantity}× {item.name}
                        </span>
                        {item.width && item.height && (
                          <span className="font-mono text-slate-500 shrink-0">
                            {item.width}m × {item.height}m
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {ot.notes && <p className="text-xs text-slate-500 italic break-words">“{ot.notes}”</p>}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPrintOt(ot)}
                      className="px-3 py-2 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Ficha</span>
                    </button>

                    {prevMeta && (
                      <button
                        onClick={() => revertStatus(ot)}
                        title={`Devolver a ${prevMeta.label}`}
                        className="px-2.5 py-2 sm:py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Devolver</span>
                      </button>
                    )}
                  </div>

                  {nextMeta ? (
                    <button
                      onClick={() => advanceStatus(ot)}
                      className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition ${
                        nextMeta.id === 'facturada'
                          ? 'bg-cyan-600 hover:bg-cyan-700'
                          : nextMeta.id === 'pagada'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {nextMeta.id === 'facturada' && <Receipt className="w-3.5 h-3.5" />}
                      {nextMeta.id === 'pagada' && <BadgeDollarSign className="w-3.5 h-3.5" />}
                      <span>
                        {nextMeta.id === 'facturada'
                          ? 'Facturar OT'
                          : nextMeta.id === 'pagada'
                            ? 'Marcar Pagada'
                            : `Avanzar a ${nextMeta.label}`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-green-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Pagada y Cerrada
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FACTURAR OT */}
      {invoiceOt && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleConfirmInvoiceOt}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-lg">
                  Facturar {invoiceOt.ot_number}
                </h3>
                <p className="text-xs text-slate-500">{invoiceOt.client_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceOt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  N° Factura / Boleta SII
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: 1452"
                  value={invoiceForm.invoice_number}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-cyan-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Fecha de Facturación
                </label>
                <input
                  type="date"
                  required
                  value={invoiceForm.invoice_date}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-cyan-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInvoiceOt(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                Confirmar Factura
              </button>
            </div>
          </form>
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleCreateManualOt}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-slate-900 text-lg">
                Nueva Orden de Trabajo
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Cliente *"
                value={newOt.client_name}
                onChange={(e) => setNewOt({ ...newOt, client_name: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <input
                type="text"
                required
                placeholder="Trabajo / Material *"
                value={newOt.itemName}
                onChange={(e) => setNewOt({ ...newOt, itemName: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Ancho (m)"
                value={newOt.width}
                onChange={(e) => setNewOt({ ...newOt, width: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Alto (m)"
                value={newOt.height}
                onChange={(e) => setNewOt({ ...newOt, height: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <input
                type="date"
                value={newOt.deadline}
                onChange={(e) => setNewOt({ ...newOt, deadline: e.target.value })}
                className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <select
                value={newOt.priority}
                onChange={(e) => setNewOt({ ...newOt, priority: e.target.value })}
                className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              >
                <option value="normal">Prioridad Normal (Verde)</option>
                <option value="alta">Prioridad Alta (Ámbar)</option>
                <option value="urgente">Prioridad Urgente (Rojo)</option>
              </select>
              <textarea
                rows={2}
                placeholder="Notas técnicas de taller..."
                value={newOt.notes}
                onChange={(e) => setNewOt({ ...newOt, notes: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Crear OT
              </button>
            </div>
          </form>
        </div>
      )}

      {printOt && (
        <div className="print-modal-overlay fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-2.5 sm:p-4">
          <div className="print-modal-container max-w-3xl mx-auto">
            <div className="no-print flex flex-wrap justify-between items-center gap-2 mb-3 sm:mb-4 bg-white border border-slate-200 rounded-2xl p-3 shadow-lg">
              <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                Ficha de Producción · {printOt.ot_number}
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
                  onClick={() => setPrintOt(null)}
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
                    {printOt.ot_number}
                  </div>
                  {printOt.quote_correlative && (
                    <div className="text-xs font-mono text-zinc-600">
                      Ref: {printOt.quote_correlative}
                    </div>
                  )}
                  {printOt.invoice_number && (
                    <div className="text-xs font-mono text-cyan-700 font-semibold">
                      Factura: {printOt.invoice_number}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 text-xs bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <div>
                  <span className="text-zinc-500 block">Cliente:</span>
                  <strong className="text-sm break-words">{printOt.client_name}</strong>
                  {printOt.client_phone && <div className="mt-0.5">{printOt.client_phone}</div>}
                </div>
                <div>
                  <span className="text-zinc-500 block">Entrega / Instalación:</span>
                  <strong>{formatDateCL(printOt.deadline)}</strong>
                  <div>{DELIVERY_LABELS[printOt.delivery_method] || printOt.delivery_method}</div>
                  {printOt.delivery_address && <div className="break-words">{printOt.delivery_address}</div>}
                </div>
              </div>

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
                    {(printOt.items || []).map((item, idx) => (
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

              {printOt.notes && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <strong className="block uppercase text-[10px] text-amber-800">
                    Instrucciones de Taller:
                  </strong>
                  {printOt.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
