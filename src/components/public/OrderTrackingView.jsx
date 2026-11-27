import React, { useEffect, useState } from 'react';
import {
  Search,
  Wrench,
  CheckCircle2,
  Calendar,
  MapPin,
  ArrowLeft,
  MessageCircle,
  Package,
  AlertCircle,
} from 'lucide-react';
import { COMPANY_INFO, OT_STATUSES } from '../../data/company';
import { DELIVERY_LABELS, formatDateCL } from '../../lib/formatters';
import { erpService } from '../../lib/erpService';

const normalizeWorkshopStatus = (status) => {
  if (['entregado', 'despachado', 'pagada'].includes(status)) return 'despachado';
  if (status === 'facturada') return 'terminado';
  return OT_STATUSES.some((s) => s.id === status) ? status : 'pendiente';
};

export default function OrderTrackingView({ initialCode = '', onGoHome }) {
  const [code, setCode] = useState(initialCode);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchOrder = async (targetCode) => {
    const clean = String(targetCode || '').trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setNotFound(false);
    setErrorMsg('');
    try {
      const data = await erpService.loadPublicOrderTracking(clean);
      if (!data) {
        setOrder(null);
        setNotFound(true);
      } else {
        setOrder(data);
        window.history.replaceState({}, '', `/seguimiento/${encodeURIComponent(data.ot_number)}`);
      }
    } catch (err) {
      setOrder(null);
      setErrorMsg(
        err?.message?.includes('get_public_ot_status')
          ? 'El seguimiento público aún no está activado en la base de datos.'
          : 'No pudimos consultar el estado en este momento. Intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchOrder(initialCode);
    }
  }, [initialCode]);

  const normStatus = order ? normalizeWorkshopStatus(order.status) : 'pendiente';
  const stepIdx = Math.max(
    0,
    OT_STATUSES.findIndex((s) => s.id === normStatus)
  );
  const currentStep = OT_STATUSES[stepIdx] || OT_STATUSES[0];

  const whatsappUrl = `https://wa.me/${COMPANY_INFO.whatsapp}?text=${encodeURIComponent(
    `Hola *${COMPANY_INFO.name}*, consulto por el estado de mi pedido *${order?.ot_number || code || ''}*.`
  )}`;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt={COMPANY_INFO.name}
              className="h-9 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="border-l border-zinc-800 pl-3">
              <div className="font-heading font-bold text-sm text-white">
                Seguimiento de Pedido
              </div>
              <div className="text-[11px] text-zinc-400">Taller Matriz · Olivar</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoHome}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al sitio</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
            Consulta el estado de tu trabajo
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Ingresa tu código de Orden de Trabajo (ej. <span className="font-mono text-zinc-200">OT-2026-0001</span>) o Cotización (<span className="font-mono text-zinc-200">COT-2026-0001</span>).
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchOrder(code);
          }}
          className="flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: OT-2026-0001"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono uppercase text-white focus:outline-none focus:border-red-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold transition shadow-lg shadow-red-600/20"
          >
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </form>

        {errorMsg && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {notFound && (
          <div className="max-w-xl mx-auto p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-2">
            <p className="text-sm font-bold text-white">No encontramos el código «{code}»</p>
            <p className="text-xs text-zinc-400">
              Verifica el correlativo enviado por WhatsApp o contáctanos directamente.
            </p>
          </div>
        )}

        {order && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xl sm:text-2xl font-extrabold text-white">
                    {order.ot_number}
                  </span>
                  {order.quote_correlative && (
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Ref: {order.quote_correlative}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Última actualización: {formatDateCL(order.updated_at)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold">
                <Wrench className="w-3.5 h-3.5" />
                {currentStep.label}
              </span>
            </div>

            {/* PROGRESO 5 ETAPAS */}
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {OT_STATUSES.map((step, idx) => {
                  const done = idx <= stepIdx;
                  const active = idx === stepIdx;
                  return (
                    <div key={step.id} className="space-y-1.5">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          done
                            ? normStatus === 'despachado'
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                            : 'bg-zinc-800'
                        }`}
                      />
                      <div
                        className={`text-[10px] sm:text-xs font-semibold leading-tight ${
                          active ? 'text-white' : done ? 'text-zinc-300' : 'text-zinc-600'
                        }`}
                      >
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              {normStatus === 'despachado' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>¡Tu trabajo ya fue completado y entregado / despachado!</span>
                </div>
              )}
            </div>

            {/* DETALLE DE ENTREGA E ÍTEMS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <span className="text-zinc-500 block text-[11px]">Fecha estimada entrega</span>
                  <strong className="text-white text-sm">
                    {order.deadline ? formatDateCL(order.deadline) : 'Por confirmar'}
                  </strong>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <span className="text-zinc-500 block text-[11px]">Modalidad</span>
                  <strong className="text-white text-sm">
                    {DELIVERY_LABELS[order.delivery_method] || order.delivery_method}
                  </strong>
                </div>
              </div>
            </div>

            {Array.isArray(order.items) && order.items.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-red-500" />
                  <span>Detalle del pedido</span>
                </div>
                <div className="divide-y divide-zinc-800 rounded-2xl bg-zinc-950/70 border border-zinc-800 overflow-hidden">
                  {order.items.map((item, i) => (
                    <div key={i} className="px-4 py-3 text-xs flex justify-between gap-3">
                      <span className="font-semibold text-zinc-100">
                        {item.quantity}× {item.name}
                      </span>
                      {item.width && item.height && (
                        <span className="font-mono text-zinc-400 shrink-0">
                          {item.width}m × {item.height}m
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Consultar por WhatsApp</span>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
