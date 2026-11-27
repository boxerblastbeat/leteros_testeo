import React, { useMemo } from 'react';
import {
  TrendingUp,
  Target,
  Users,
  Package,
  AlertTriangle,
  MessageCircle,
  Percent,
} from 'lucide-react';
import { COMPANY_INFO } from '../../data/company';
import { formatCLP, formatDateCL, getQuoteFinancialState, todayISO } from '../../lib/formatters';

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const diffDaysFromToday = (iso) => {
  if (!iso) return 0;
  const start = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  const now = new Date(`${todayISO()}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.round((now - start) / 86400000));
};

const buildCollectionWhatsAppUrl = (q, pendingBalance) => {
  const clientName = q.client_snapshot?.name || 'estimado cliente';
  const ref = q.invoice_number ? `Factura N° ${q.invoice_number} (${q.correlative})` : q.correlative;
  const text = encodeURIComponent(
    `Hola ${clientName}, te escribimos de *${COMPANY_INFO.name}* para recordarte el saldo pendiente de *${formatCLP(pendingBalance)}* correspondiente a *${ref}*.\n\nSi ya realizaste la transferencia, por favor envíanos el comprobante a ${COMPANY_INFO.bank.email}. ¡Muchas gracias!`
  );
  const digits = String(q.client_snapshot?.phone || '').replace(/\D/g, '');
  if (!digits) return `https://wa.me/?text=${text}`;
  return `https://wa.me/${digits.startsWith('56') ? digits : `56${digits}`}?text=${text}`;
};

export default function AdminDashboardCharts({
  monthlyRows,
  periodQuotes,
  quoteRequests,
  materials,
  selectedYear,
  selectedMonth,
  onSelectMonth,
  periodLabel,
}) {
  // 1. Escala máxima del gráfico mensual (Caja Recibida + Saldo Por Cobrar + En Taller)
  const chartData = useMemo(() => {
    const items = monthlyRows.map((row) => {
      const caja = (row.pagadas?.total || 0) + (row.abonosParciales || 0);
      const porCobrar = row.porCobrar?.pending || 0;
      const enTaller = row.enTaller?.total || 0;
      const combined = caja + porCobrar + enTaller;
      return {
        month: row.month,
        short: MONTH_SHORT[row.month - 1] || row.name.slice(0, 3),
        name: row.name,
        caja,
        porCobrar,
        enTaller,
        combined,
      };
    });
    const maxVal = Math.max(1, ...items.map((i) => i.combined));
    return { items, maxVal, hasAny: items.some((i) => i.combined > 0) };
  }, [monthlyRows]);

  // 2. Embudo comercial y Tasa de cierre
  const funnel = useMemo(() => {
    const periodRequests = (quoteRequests || []).filter((r) => {
      const d = String(r.created_at || '').slice(0, 10);
      const [y, m] = d.split('-');
      if (y !== selectedYear) return false;
      if (selectedMonth !== 'todos' && parseInt(m, 10) !== parseInt(selectedMonth, 10)) return false;
      return true;
    }).length;

    const nonDraft = periodQuotes.filter((q) => q.status !== 'borrador');
    const approved = periodQuotes.filter((q) =>
      ['aceptada', 'en_taller', 'facturada', 'despacho', 'pagada'].includes(q.status)
    );
    const paid = periodQuotes.filter((q) => q.status === 'pagada');

    const closeRate = nonDraft.length > 0 ? (approved.length / nonDraft.length) * 100 : 0;
    const avgTicket =
      approved.length > 0
        ? approved.reduce((s, q) => s + (Number(q.total) || 0), 0) / approved.length
        : 0;

    const maxStep = Math.max(1, periodRequests, nonDraft.length, approved.length, paid.length);

    return {
      steps: [
        { label: 'Solicitudes Web', count: periodRequests, color: 'bg-slate-500' },
        { label: 'Cotizaciones Emitidas', count: nonDraft.length, color: 'bg-sky-500' },
        { label: 'Aprobadas / Taller', count: approved.length, color: 'bg-violet-600' },
        { label: 'Pagadas al 100%', count: paid.length, color: 'bg-emerald-600' },
      ],
      maxStep,
      closeRate,
      avgTicket,
    };
  }, [periodQuotes, quoteRequests, selectedYear, selectedMonth]);

  // 3. Margen Bruto Estimado (Venta Neta vs Costo Materiales del Tarifario)
  const marginStats = useMemo(() => {
    const matById = new Map();
    const matByName = new Map();
    (materials || []).forEach((m) => {
      if (m.id) matById.set(m.id, m);
      if (m.name) matByName.set(String(m.name).toLowerCase(), m);
    });

    const operational = periodQuotes.filter((q) =>
      ['aceptada', 'en_taller', 'facturada', 'despacho', 'pagada'].includes(q.status)
    );

    let netSales = 0;
    let estMaterialCost = 0;
    let extraWorkshopCosts = 0;

    operational.forEach((q) => {
      netSales += Number(q.subtotal) || 0;
      const otCosts = Array.isArray(q.client_snapshot?.ot_costs) ? q.client_snapshot.ot_costs : [];
      extraWorkshopCosts += otCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      (q.items || []).forEach((item) => {
        const mat =
          (item.materialId && matById.get(item.materialId)) ||
          (item.name && matByName.get(String(item.name).toLowerCase()));
        if (!mat || !Number(mat.cost)) return;
        const qty = Math.max(1, Number(item.quantity) || 1);
        const w = Number(item.width) || 0;
        const h = Number(item.height) || 0;
        const isSqm =
          item.priceMode === 'sqm' ||
          String(mat.unit || '').toLowerCase().includes('m');
        if (isSqm && w > 0 && h > 0) {
          estMaterialCost += w * h * qty * Number(mat.cost);
        } else {
          estMaterialCost += qty * Number(mat.cost);
        }
      });
    });

    const totalEstCost = Math.round(estMaterialCost + extraWorkshopCosts);
    const grossMargin = Math.max(0, netSales - totalEstCost);
    const marginPct = netSales > 0 ? (grossMargin / netSales) * 100 : 0;

    return {
      docs: operational.length,
      netSales,
      estMaterialCost: totalEstCost,
      extraWorkshopCosts: Math.round(extraWorkshopCosts),
      grossMargin: Math.round(grossMargin),
      marginPct,
    };
  }, [periodQuotes, materials]);

  // 4. Semáforo de Cartera Por Cobrar (Antigüedad de facturas impagas)
  const aging = useMemo(() => {
    const unpaid = periodQuotes
      .map((q) => {
        const fin = getQuoteFinancialState(q);
        if (!fin.invoiced || fin.isPaid || fin.pendingBalance <= 0) return null;
        const refDate = q.invoice_date || q._effDate || q.created_at;
        const days = diffDaysFromToday(refDate);
        return { quote: q, fin, days, refDate };
      })
      .filter(Boolean)
      .sort((a, b) => b.days - a.days);

    const b0_15 = unpaid.filter((u) => u.days <= 15);
    const b16_30 = unpaid.filter((u) => u.days >= 16 && u.days <= 30);
    const b30p = unpaid.filter((u) => u.days > 30);

    const sumPending = (arr) => arr.reduce((s, u) => s + u.fin.pendingBalance, 0);

    return {
      list: unpaid,
      buckets: [
        {
          label: '0 a 15 días (Al día)',
          count: b0_15.length,
          total: sumPending(b0_15),
          style: 'bg-sky-50 border-sky-200 text-sky-800',
        },
        {
          label: '16 a 30 días (Por vencer)',
          count: b16_30.length,
          total: sumPending(b16_30),
          style: 'bg-amber-50 border-amber-200 text-amber-900',
        },
        {
          label: '+30 días (Vencida)',
          count: b30p.length,
          total: sumPending(b30p),
          style: 'bg-red-50 border-red-200 text-red-800',
        },
      ],
    };
  }, [periodQuotes]);

  // 5. Top 5 Clientes y Top 5 Materiales del período
  const rankings = useMemo(() => {
    const operational = periodQuotes.filter((q) =>
      ['aceptada', 'en_taller', 'facturada', 'despacho', 'pagada'].includes(q.status)
    );

    const clientMap = new Map();
    const matMap = new Map();

    operational.forEach((q) => {
      const cName = (q.client_snapshot?.name || 'Cliente sin nombre').trim();
      const cEntry = clientMap.get(cName) || { name: cName, total: 0, count: 0 };
      cEntry.total += Number(q.total) || 0;
      cEntry.count += 1;
      clientMap.set(cName, cEntry);

      (q.items || []).forEach((item) => {
        const mName = (item.name || 'Material').trim();
        const mEntry = matMap.get(mName) || { name: mName, net: 0, qty: 0 };
        const lineNet =
          Number(item.lineTotal) ||
          Math.round((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0));
        mEntry.net += lineNet;
        mEntry.qty += Math.max(1, Number(item.quantity) || 1);
        matMap.set(mName, mEntry);
      });
    });

    const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const topMaterials = Array.from(matMap.values())
      .sort((a, b) => b.net - a.net)
      .slice(0, 5);

    return {
      topClients,
      maxClient: Math.max(1, ...topClients.map((c) => c.total)),
      topMaterials,
      maxMat: Math.max(1, ...topMaterials.map((m) => m.net)),
    };
  }, [periodQuotes]);

  return (
    <div className="space-y-5">
      {/* 1. GRÁFICO MENSUAL INTERACTIVO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-600" />
              <span>Evolución Mensual de Ingresos y Producción · {selectedYear}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Haz clic en cualquier barra para filtrar el dashboard y el detalle por ese mes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Caja Recibida
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              Saldo Por Cobrar
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-violet-400" />
              En Taller
            </span>
          </div>
        </div>

        {!chartData.hasAny ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Aún no hay movimientos aprobados o facturados en {selectedYear} para graficar.
          </div>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[560px] grid grid-cols-12 gap-2 items-end h-48 pt-6 px-1">
              {chartData.items.map((m) => {
                const isSelected = selectedMonth === String(m.month);
                const hCaja = (m.caja / chartData.maxVal) * 100;
                const hCobrar = (m.porCobrar / chartData.maxVal) * 100;
                const hTaller = (m.enTaller / chartData.maxVal) * 100;
                return (
                  <button
                    key={m.month}
                    type="button"
                    onClick={() => onSelectMonth(isSelected ? 'todos' : String(m.month))}
                    title={`${m.name}: Caja ${formatCLP(m.caja)} | Por Cobrar ${formatCLP(m.porCobrar)} | Taller ${formatCLP(m.enTaller)}`}
                    className={`group flex flex-col items-center gap-1.5 h-full justify-end rounded-xl p-1 transition ${
                      isSelected ? 'bg-red-50 ring-1 ring-red-300' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[9px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition truncate max-w-full">
                      {m.combined > 0 ? formatCLP(m.combined) : ''}
                    </div>
                    <div className="w-full max-w-[34px] flex-1 flex flex-col justify-end gap-0.5">
                      {m.enTaller > 0 && (
                        <div
                          style={{ height: `${Math.max(4, hTaller)}%` }}
                          className="w-full rounded-t-md bg-violet-400 group-hover:bg-violet-500 transition-all"
                        />
                      )}
                      {m.porCobrar > 0 && (
                        <div
                          style={{ height: `${Math.max(4, hCobrar)}%` }}
                          className={`w-full bg-amber-400 group-hover:bg-amber-500 transition-all ${
                            m.enTaller === 0 ? 'rounded-t-md' : ''
                          }`}
                        />
                      )}
                      {m.caja > 0 && (
                        <div
                          style={{ height: `${Math.max(4, hCaja)}%` }}
                          className={`w-full bg-emerald-500 group-hover:bg-emerald-600 transition-all rounded-b-md ${
                            m.enTaller === 0 && m.porCobrar === 0 ? 'rounded-t-md' : ''
                          }`}
                        />
                      )}
                      {m.combined === 0 && (
                        <div className="w-full h-1 rounded-full bg-slate-200/80" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        isSelected ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      {m.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. EMBUDO COMERCIAL + MARGEN BRUTO ESTIMADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Embudo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-red-600" />
              <span>Embudo Comercial · {periodLabel}</span>
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Cierre: {funnel.closeRate.toFixed(0)}%
            </span>
          </div>

          <div className="space-y-2.5">
            {funnel.steps.map((step) => {
              const pct = Math.max(step.count > 0 ? 8 : 0, (step.count / funnel.maxStep) * 100);
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{step.label}</span>
                    <span className="font-mono font-bold text-slate-900">{step.count}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${step.color} transition-all`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Ticket promedio aprobado:</span>
            <strong className="font-mono text-sm text-slate-900">
              {formatCLP(funnel.avgTicket)}
            </strong>
          </div>
        </div>

        {/* Margen Bruto */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Margen Bruto Estimado · {periodLabel}</span>
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {marginStats.docs} {marginStats.docs === 1 ? 'proyecto' : 'proyectos'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500">Venta Neta</div>
              <div className="font-mono text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 truncate">
                {formatCLP(marginStats.netSales)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
              <div className="text-[10px] font-bold uppercase text-rose-700">Costo Mater.</div>
              <div className="font-mono text-sm sm:text-base font-extrabold text-rose-700 mt-0.5 truncate">
                {formatCLP(marginStats.estMaterialCost)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] font-bold uppercase text-emerald-700">Margen Est.</div>
              <div className="font-mono text-sm sm:text-base font-extrabold text-emerald-700 mt-0.5 truncate">
                {formatCLP(marginStats.grossMargin)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600">Rentabilidad estimada sobre sustratos</span>
              <span className="font-mono text-emerald-700 font-bold">
                {marginStats.marginPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                style={{ width: `${Math.min(100, Math.max(0, marginStats.marginPct))}%` }}
                className="h-full rounded-full bg-emerald-500 transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Incluye costo base del Tarifario
              {marginStats.extraWorkshopCosts > 0
                ? ` + ${formatCLP(marginStats.extraWorkshopCosts)} en gastos extra registrados en Taller.`
                : ' (registra gastos extra en Taller & OTs para afinar la utilidad real).'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. SEMÁFORO DE CARTERA POR COBRAR (ANTIGÜEDAD) */}
      {aging.list.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Semáforo de Cartera Por Cobrar ({aging.list.length} facturas impagas)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {aging.buckets.map((b) => (
              <div key={b.label} className={`p-3 rounded-xl border ${b.style}`}>
                <div className="text-[11px] font-bold">{b.label}</div>
                <div className="font-mono text-lg font-extrabold mt-0.5">{formatCLP(b.total)}</div>
                <div className="text-[10px] opacity-80">
                  {b.count} {b.count === 1 ? 'documento' : 'documentos'}
                </div>
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {aging.list.slice(0, 6).map(({ quote: q, fin, days, refDate }) => (
              <div
                key={q.id}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">{q.correlative}</span>
                    {q.invoice_number && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                        FAC {q.invoice_number}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        days > 30
                          ? 'bg-red-100 text-red-700'
                          : days >= 16
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {days} {days === 1 ? 'día' : 'días'}
                    </span>
                  </div>
                  <div className="text-slate-600 truncate">
                    {q.client_snapshot?.name || 'Cliente'} · Emitida {formatDateCL(refDate)}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-amber-700">
                      {formatCLP(fin.pendingBalance)}
                    </div>
                    {fin.hasPartialPayment && (
                      <div className="text-[10px] text-emerald-700">
                        Abonado {formatCLP(fin.paidAmount)}
                      </div>
                    )}
                  </div>
                  <a
                    href={buildCollectionWhatsAppUrl(q, fin.pendingBalance)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Cobrar</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. TOP 5 CLIENTES Y TOP 5 MATERIALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-red-600" />
            <span>Top 5 Clientes · {periodLabel}</span>
          </h3>
          {rankings.topClients.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Sin ventas aprobadas en este período.
            </p>
          ) : (
            <div className="space-y-2.5">
              {rankings.topClients.map((c, idx) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800 truncate">
                      <span className="text-slate-400 mr-1.5">#{idx + 1}</span>
                      {c.name}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({c.count} {c.count === 1 ? 'doc' : 'docs'})
                      </span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 shrink-0">
                      {formatCLP(c.total)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(8, (c.total / rankings.maxClient) * 100)}%` }}
                      className="h-full rounded-full bg-red-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-red-600" />
            <span>Top 5 Materiales Más Vendidos · {periodLabel}</span>
          </h3>
          {rankings.topMaterials.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Sin materiales facturados o aprobados en este período.
            </p>
          ) : (
            <div className="space-y-2.5">
              {rankings.topMaterials.map((m, idx) => (
                <div key={m.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800 truncate">
                      <span className="text-slate-400 mr-1.5">#{idx + 1}</span>
                      {m.name}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({m.qty} unid.)
                      </span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 shrink-0">
                      {formatCLP(m.net)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(8, (m.net / rankings.maxMat) * 100)}%` }}
                      className="h-full rounded-full bg-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
