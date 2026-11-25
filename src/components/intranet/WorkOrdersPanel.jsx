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
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { OT_STATUSES, COMPANY_INFO } from '../../data/company';
import { formatDateCL, DELIVERY_LABELS, addDaysISO, uid } from '../../lib/formatters';

export default function WorkOrdersPanel() {
  const { workOrders, quotes, saveWorkOrder, changeQuoteStatus, showToast } = useErp();

  const [filter, setFilter] = useState('activas');
  const [printOt, setPrintOt] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
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

  const filtered = useMemo(() => {
    return workOrders.filter((ot) => {
      if (filter === 'activas') return ot.status !== 'entregado';
      if (filter === 'todas') return true;
      return ot.status === filter;
    });
  }, [workOrders, filter]);

  const advanceStatus = async (ot) => {
    const order = OT_STATUSES.map((s) => s.id);
    const idx = order.indexOf(ot.status);
    if (idx === -1 || idx >= order.length - 1) return;
    const nextStatus = order[idx + 1];
    await saveWorkOrder({ ...ot, status: nextStatus });

    if (ot.quote_id) {
      const linked = quotes.find((q) => q.id === ot.quote_id);
      if (linked && nextStatus === 'despachado' && linked.status === 'en_taller') {
        await changeQuoteStatus(linked, 'despacho', {}, `OT ${ot.ot_number} enviada a despacho`);
      }
    }
    showToast(`${ot.ot_number} actualizada a ${OT_STATUSES[idx + 1].label}`);
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-red-600" />
            Producción, Órdenes de Trabajo (OT) y Despachos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Control de avance en taller desde diseño y producción hasta instalación o retiro.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva OT Manual
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'activas', label: 'Activas en Taller' },
          ...OT_STATUSES,
          { id: 'todas', label: 'Todas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              filter === tab.id
                ? 'bg-red-600 border-red-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-xs">
          No hay Órdenes de Trabajo en este estado.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((ot) => {
            const meta = OT_STATUSES.find((s) => s.id === ot.status) || OT_STATUSES[0];
            const idx = OT_STATUSES.findIndex((s) => s.id === ot.status);
            const nextMeta = idx >= 0 && idx < OT_STATUSES.length - 1 ? OT_STATUSES[idx + 1] : null;

            return (
              <div
                key={ot.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {ot.ot_number}
                      </span>
                      {ot.quote_correlative && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {ot.quote_correlative}
                        </span>
                      )}
                      {ot.priority === 'urgente' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Urgente
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{ot.client_name}</h3>
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
                        <span className="text-slate-800 font-medium">
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

                  {ot.notes && <p className="text-xs text-slate-500 italic">“{ot.notes}”</p>}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setPrintOt(ot)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Ficha Taller
                  </button>

                  {nextMeta ? (
                    <button
                      onClick={() => advanceStatus(ot)}
                      className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      Avanzar a {nextMeta.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Completada
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateManualOt}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-slate-900"
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
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <select
                value={newOt.priority}
                onChange={(e) => setNewOt({ ...newOt, priority: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              >
                <option value="normal">Prioridad Normal</option>
                <option value="urgente">Prioridad Urgente</option>
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto">
            <div className="no-print flex justify-between items-center mb-4 bg-white border border-slate-200 rounded-2xl p-3 shadow-lg">
              <span className="text-sm font-bold text-slate-900 font-mono">
                Ficha de Producción · {printOt.ot_number}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1.5"
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

            <div className="print-sheet bg-white text-zinc-900 rounded-2xl p-8 space-y-6 shadow-2xl">
              <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4">
                <div>
                  <h2 className="font-heading text-xl font-bold">{COMPANY_INFO.name}</h2>
                  <p className="text-xs text-zinc-600">ORDEN DE TRABAJO INTERNA — TALLER</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-extrabold text-red-600">
                    {printOt.ot_number}
                  </div>
                  {printOt.quote_correlative && (
                    <div className="text-xs font-mono text-zinc-600">
                      Ref: {printOt.quote_correlative}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <div>
                  <span className="text-zinc-500 block">Cliente:</span>
                  <strong className="text-sm">{printOt.client_name}</strong>
                  {printOt.client_phone && <div className="mt-0.5">{printOt.client_phone}</div>}
                </div>
                <div>
                  <span className="text-zinc-500 block">Entrega / Instalación:</span>
                  <strong>{formatDateCL(printOt.deadline)}</strong>
                  <div>{DELIVERY_LABELS[printOt.delivery_method] || printOt.delivery_method}</div>
                  {printOt.delivery_address && <div>{printOt.delivery_address}</div>}
                </div>
              </div>

              <table className="w-full text-xs border border-zinc-300">
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
                      <td className="p-3 text-center font-mono">
                        {item.width && item.height ? `${item.width}m × ${item.height}m` : 'Estándar'}
                      </td>
                      <td className="p-3 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 text-center">☐</td>
                    </tr>
                  ))}
                </tbody>
              </table>

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
