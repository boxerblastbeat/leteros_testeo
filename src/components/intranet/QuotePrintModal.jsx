import React from 'react';
import { Printer, X, MessageCircle } from 'lucide-react';
import { COMPANY_INFO } from '../../data/company';
import { formatCLP, formatDateCL, DELIVERY_LABELS } from '../../lib/formatters';

export default function QuotePrintModal({ quote, onClose }) {
  if (!quote) return null;

  const client = quote.client_snapshot || {};
  const taxRate = Number(quote.tax_rate ?? 19);
  const hasTax = taxRate > 0;
  const validityDays = Number(quote.validity_days ?? client.validity_days) || 15;

  const whatsappText = encodeURIComponent(
    `Hola ${client.name || ''}, te enviamos el resumen de tu cotización *${quote.correlative}* de *${COMPANY_INFO.name}*:\n` +
      (hasTax
        ? `• Total Neto: ${formatCLP(quote.subtotal)}\n• IVA (${taxRate}%): ${formatCLP(quote.tax_amount)}\n• *TOTAL c/IVA: ${formatCLP(quote.total)}*\n`
        : `• *TOTAL NETO (Sin IVA): ${formatCLP(quote.total)}*\n`) +
      `• Plazo estimado: ${quote.manufacturing_days || '5 a 7 días hábiles'}\n` +
      `• Validez: ${validityDays} días corridos\n\n` +
      `Quedamos atentos a tu confirmación.`
  );

  const cleanPhone = String(client.phone || '').replace(/\D/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`}?text=${whatsappText}`
    : `https://wa.me/?text=${whatsappText}`;

  return (
    <div className="print-modal-overlay fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-2.5 sm:p-6">
      <div className="print-modal-container max-w-4xl mx-auto">
        {/* Action Bar (hidden on print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-4 bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-lg">
          <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 min-w-0">
            <span className="font-mono text-red-600 shrink-0">{quote.correlative}</span>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <span className="text-slate-600 hidden sm:inline truncate">Vista Previa Documento Carta</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-initial justify-center px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>WhatsApp</span>
            </a>
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition shrink-0"
              aria-label="Cerrar vista previa"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Letter Document */}
        <div className="print-sheet bg-white text-zinc-900 rounded-2xl p-4 sm:p-10 shadow-2xl space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start gap-4 sm:gap-6 pb-5 border-b-2 border-red-600">
            <div className="space-y-1 min-w-0">
              <img
                src="/logo.svg"
                alt={COMPANY_INFO.name}
                className="h-10 sm:h-11 w-auto object-contain mb-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <h1 className="font-heading text-lg sm:text-xl font-bold text-zinc-950">{COMPANY_INFO.name}</h1>
              <p className="text-xs text-zinc-600">{COMPANY_INFO.giro}</p>
              <p className="text-xs text-zinc-600">
                RUT: <strong>{COMPANY_INFO.rut}</strong> · {COMPANY_INFO.address}
              </p>
              <p className="text-xs text-zinc-600 break-all sm:break-normal">
                {COMPANY_INFO.phone} · {COMPANY_INFO.email} · {COMPANY_INFO.web}
              </p>
            </div>

            <div className="border-2 border-zinc-900 rounded-xl px-4 sm:px-5 py-3 text-left sm:text-right print:text-right w-full sm:w-auto sm:min-w-[210px] shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-600">
                Cotización Formal
              </div>
              <div className="font-mono text-lg sm:text-xl font-extrabold text-zinc-950 mt-0.5">
                {quote.correlative}
              </div>
              <div className="text-xs text-zinc-600 mt-1">
                Fecha: <strong>{formatDateCL(quote.created_at)}</strong>
              </div>
              {quote.oc_number && (
                <div className="text-xs text-zinc-700 mt-0.5">
                  Ref. OC: <strong>{quote.oc_number}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Client & Delivery Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 sm:gap-6 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs">
            <div className="space-y-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Datos del Cliente
              </div>
              <div className="text-sm font-bold text-zinc-950 break-words">{client.name || 'Cliente'}</div>
              {client.rut && <div>RUT: {client.rut}</div>}
              {client.contact_name && <div>Contacto: {client.contact_name}</div>}
              {client.phone && <div>Teléfono: {client.phone}</div>}
              {client.email && <div className="break-all">Email: {client.email}</div>}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Condiciones y Entrega
              </div>
              <div>
                Modalidad:{' '}
                <strong>{DELIVERY_LABELS[quote.delivery_method] || quote.delivery_method}</strong>
              </div>
              {quote.delivery_method !== 'retiro' && quote.delivery_address && (
                <div className="break-words">Dirección: {quote.delivery_address}</div>
              )}
              <div>
                Plazo de fabricación: <strong>{quote.manufacturing_days || '5 a 7 días hábiles'}</strong>
              </div>
              <div>
                Forma de pago: <strong>{quote.payment_terms || 'Transferencia bancaria'}</strong>
              </div>
              <div>
                Validez cotización: <strong>{validityDays} días corridos</strong>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[540px] sm:min-w-0 text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-white">
                  <th className="py-2.5 px-3 text-left rounded-tl-lg">#</th>
                  <th className="py-2.5 px-3 text-left">Descripción / Especificación</th>
                  <th className="py-2.5 px-3 text-center">Medidas</th>
                  <th className="py-2.5 px-3 text-center">Cant.</th>
                  <th className="py-2.5 px-3 text-right">Valor Unit.</th>
                  <th className="py-2.5 px-3 text-right rounded-tr-lg">Total Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 border-b border-zinc-300">
                {(quote.items || []).map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-3 px-3 font-mono text-zinc-500">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-zinc-900">{item.name}</div>
                      {item.detail && <div className="text-zinc-600 mt-0.5">{item.detail}</div>}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-zinc-700 whitespace-nowrap">
                      {item.width && item.height
                        ? `${item.width}m × ${item.height}m`
                        : 'Estándar'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">{formatCLP(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-zinc-950 whitespace-nowrap">
                      {formatCLP(Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Bank Info */}
          <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-4 sm:gap-6 items-start print-avoid-break">
            <div className="md:col-span-7 print:col-span-7 space-y-3 text-xs order-2 md:order-1 print:order-1">
              {quote.notes && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-zinc-800">
                  <strong className="block text-[10px] uppercase text-amber-800 mb-0.5">
                    Observaciones:
                  </strong>
                  {quote.notes}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Datos para Transferencia Bancaria
                </div>
                <div>
                  <strong>{COMPANY_INFO.bank.banco}</strong> · {COMPANY_INFO.bank.tipo} N°{' '}
                  <strong className="font-mono">{COMPANY_INFO.bank.cuenta}</strong>
                </div>
                <div>
                  Titular: <strong>{COMPANY_INFO.bank.titular}</strong> · RUT:{' '}
                  {COMPANY_INFO.bank.rut}
                </div>
                <div className="break-all sm:break-normal">Comprobantes a: {COMPANY_INFO.bank.email}</div>
              </div>
            </div>

            <div className="md:col-span-5 print:col-span-5 bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2 text-xs order-1 md:order-2 print:order-2">
              {Number(quote.installation_fee) > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Instalación en Terreno</span>
                  <span className="font-mono">{formatCLP(quote.installation_fee)}</span>
                </div>
              )}
              {Number(quote.freight_fee) > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Despacho / Flete</span>
                  <span className="font-mono">{formatCLP(quote.freight_fee)}</span>
                </div>
              )}
              {Number(quote.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Descuento Comercial</span>
                  <span className="font-mono">-{formatCLP(quote.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-zinc-200 font-semibold">
                <span>Subtotal Neto</span>
                <span className="font-mono">{formatCLP(quote.subtotal)}</span>
              </div>
              {hasTax ? (
                <div className="flex justify-between text-zinc-600">
                  <span>IVA ({taxRate}%)</span>
                  <span className="font-mono">{formatCLP(quote.tax_amount)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-zinc-500 italic">
                  <span>IVA</span>
                  <span>Valores sin IVA (Neto)</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-zinc-900 text-base font-extrabold text-zinc-950">
                <span>{hasTax ? 'TOTAL CLP' : 'TOTAL NETO'}</span>
                <span className="font-mono">{formatCLP(quote.total)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Signature */}
          <div className="pt-4 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 text-[10px] text-zinc-600 print-avoid-break">
            <div className="space-y-0.5">
              <strong className="text-zinc-900 block">Términos y Validez:</strong>
              <p>• Cotización válida por {validityDays} días corridos desde su fecha de emisión.</p>
              <p>• Archivos aportados por el cliente deben venir vectorizados (.AI, .PDF o .EPS).</p>
              <p>• Trabajos garantizados con respaldo directo en Taller Matriz Olivar.</p>
            </div>
            <div className="flex flex-col justify-end items-center text-center pt-6">
              <div className="w-44 border-b border-zinc-900 mb-1" />
              <span className="font-bold text-zinc-900 uppercase">Firma y Timbre Autorizado</span>
              <span className="text-zinc-500">{COMPANY_INFO.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
