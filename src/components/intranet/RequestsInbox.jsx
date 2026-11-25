import React from 'react';
import { Inbox, ArrowRightCircle, Trash2, MapPin, Ruler, Phone, Mail, Clock } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatDateCL, DELIVERY_LABELS, DESIGN_LABELS } from '../../lib/formatters';

export default function RequestsInbox({ onConvertRequest }) {
  const { quoteRequests, updateRequestStatus, showToast } = useErp();

  const statusBadge = {
    nueva: 'bg-red-50 text-red-700 border-red-200',
    en_revision: 'bg-amber-50 text-amber-800 border-amber-200',
    convertida: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    descartada: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-red-600 shrink-0" />
            <span>Bandeja de Solicitudes Web</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Requerimientos enviados por clientes desde la web pública. Conviértelos en cotización
            oficial en 1 clic.
          </p>
        </div>
      </div>

      {quoteRequests.length === 0 ? (
        <div className="p-10 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-xs">
          No hay solicitudes web pendientes en este momento.
        </div>
      ) : (
        <div className="grid gap-3.5 sm:gap-4">
          {quoteRequests.map((req) => (
            <div
              key={req.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5"
            >
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      statusBadge[req.status] || statusBadge.nueva
                    }`}
                  >
                    {req.status}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateCL(req.created_at)}
                  </span>
                  <span className="text-xs font-semibold text-red-600">{req.service_type}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 break-words">
                    {req.client_name}{' '}
                    {req.client_rut && (
                      <span className="text-xs font-mono text-slate-500 font-normal">
                        ({req.client_rut})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
                    Material: <strong className="text-slate-900">{req.material_name}</strong> ·
                    Cantidad: <strong>{req.quantity}</strong>
                    {req.width && req.height && (
                      <span className="ml-2 font-mono text-xs text-slate-500 inline-flex items-center gap-1">
                        <Ruler className="w-3.5 h-3.5 text-red-600" />
                        {req.width}m × {req.height}m ({(req.width * req.height).toFixed(2)} m²)
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {req.client_phone}
                  </span>
                  {req.client_email && (
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{req.client_email}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {DELIVERY_LABELS[req.delivery_method] || req.delivery_method}
                      {req.delivery_address ? ` — ${req.delivery_address}` : ''}
                    </span>
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Diseño:{' '}
                  <span className="text-slate-700 font-medium">
                    {DESIGN_LABELS[req.has_design] || req.has_design}
                  </span>
                  {req.comments && (
                    <p className="mt-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 break-words">
                      “{req.comments}”
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                {req.status !== 'convertida' && (
                  <button
                    onClick={() => onConvertRequest(req)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/20"
                  >
                    <ArrowRightCircle className="w-4 h-4" />
                    Convertir en Cotización
                  </button>
                )}
                {req.status !== 'descartada' && req.status !== 'convertida' && (
                  <button
                    onClick={async () => {
                      await updateRequestStatus(req.id, 'descartada');
                      showToast('Solicitud archivada', 'info');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Descartar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
