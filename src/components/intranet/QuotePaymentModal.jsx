import React, { useState, useEffect } from 'react';
import { Wallet, X } from 'lucide-react';
import { formatCLP, formatDateCL, todayISO, getQuoteFinancialState } from '../../lib/formatters';
import { useModalClose } from '../../lib/useModalClose';

export default function QuotePaymentModal({ quote, onClose, onSubmitPayment, showToast }) {
  const [form, setForm] = useState({
    amount: '',
    date: todayISO(),
    method: 'Transferencia bancaria',
    note: '',
  });

  useEffect(() => {
    if (quote) {
      setForm({
        amount: '',
        date: todayISO(),
        method: 'Transferencia bancaria',
        note: '',
      });
    }
  }, [quote]);

  const { handleClose, handleBackdropClick } = useModalClose(Boolean(quote), onClose, {
    confirm: true,
    message: '¿Cerrar registro de abono? Los datos ingresados se perderán.',
  });

  if (!quote) return null;

  const fin = getQuoteFinancialState(quote);

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const res = await onSubmitPayment(quote, form);
            onClose();
            showToast?.(
              res.completesTotal
                ? `${quote.correlative} pagada al 100%`
                : `Abono registrado en ${quote.correlative} · Saldo ${formatCLP(res.pendingBalance)}`
            );
          } catch (err) {
            showToast?.(err?.message || 'Error al registrar abono', 'error');
          }
        }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-900"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-emerald-600">
            <Wallet className="w-5 h-5" />
            <h3 className="font-heading font-bold text-slate-900 text-lg">
              Registrar Abono · {quote.correlative}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <div>
            <span className="text-[10px] uppercase text-slate-500 block">Total</span>
            <strong className="font-mono text-slate-900">{formatCLP(fin.total)}</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase text-emerald-600 block">Abonado</span>
            <strong className="font-mono text-emerald-700">{formatCLP(fin.paidAmount)}</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase text-amber-600 block">Saldo</span>
            <strong className="font-mono text-amber-700">{formatCLP(fin.pendingBalance)}</strong>
          </div>
        </div>

        {fin.payments.length > 0 && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-2.5 space-y-1 text-[11px]">
            <div className="font-bold text-emerald-800">Abonos registrados:</div>
            {fin.payments.map((p) => (
              <div key={p.id} className="flex justify-between gap-2 text-emerald-900">
                <span>
                  {formatDateCL(p.date)} · {p.method}
                  {p.note ? ` (${p.note})` : ''}
                </span>
                <strong className="font-mono">{formatCLP(p.amount)}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-600 font-semibold">
                Monto del Abono (CLP) *
              </label>
              <div className="flex items-center gap-1.5">
                {fin.paidAmount === 0 && fin.total > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        amount: String(Math.round(fin.total * 0.5)),
                      }))
                    }
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    50% ({formatCLP(Math.round(fin.total * 0.5))})
                  </button>
                )}
                {fin.pendingBalance > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        amount: String(fin.pendingBalance),
                      }))
                    }
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                  >
                    Saldo ({formatCLP(fin.pendingBalance)})
                  </button>
                )}
              </div>
            </div>
            <input
              type="number"
              min="1"
              required
              autoFocus
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Ej: 150000 (monto libre)"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 font-medium mb-1">
                Fecha del Abono
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 font-medium mb-1">
                Medio de Pago
              </label>
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              >
                <option value="Transferencia bancaria">Transferencia bancaria</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Débito / Crédito">Débito / Crédito</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 font-medium mb-1">
              Nota / Comprobante (Opcional)
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ej: Transferencia BCI #4491"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            Guardar Abono
          </button>
        </div>
      </form>
    </div>
  );
}
