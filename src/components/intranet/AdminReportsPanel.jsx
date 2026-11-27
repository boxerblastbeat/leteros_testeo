import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Receipt,
  BadgeDollarSign,
  AlertCircle,
  Wrench,
  FileText,
  Calendar,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { QUOTE_STATUSES } from '../../data/company';
import { formatCLP, formatDateCL, todayISO } from '../../lib/formatters';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const getEffectiveDate = (q) => {
  // Para documentos facturados/despachados/pagados, priorizar fecha de factura SII si existe
  if (['facturada', 'despacho', 'pagada'].includes(q.status) && q.invoice_date) {
    return String(q.invoice_date).slice(0, 10);
  }
  return String(q.created_at || todayISO()).slice(0, 10);
};

const sumFinancials = (list) =>
  list.reduce(
    (acc, q) => {
      const subtotal = Number(q.subtotal) || 0;
      const tax = Number(q.tax_amount) || 0;
      const total = Number(q.total) || 0;
      acc.count += 1;
      acc.net += subtotal;
      acc.iva += tax;
      acc.total += total;
      if (Number(q.tax_rate) > 0 && tax > 0) {
        acc.afectoNet += subtotal;
      } else {
        acc.exentoNet += subtotal;
      }
      return acc;
    },
    { count: 0, net: 0, iva: 0, total: 0, afectoNet: 0, exentoNet: 0 }
  );

export default function AdminReportsPanel() {
  const { quotes } = useErp();

  const currentYear = String(new Date().getFullYear());

  const enrichedQuotes = useMemo(() => {
    return quotes.map((q) => {
      const effDate = getEffectiveDate(q);
      const [y, m] = effDate.split('-');
      return {
        ...q,
        _effDate: effDate,
        _year: y || currentYear,
        _month: m ? parseInt(m, 10) : 1, // 1..12
      };
    });
  }, [quotes, currentYear]);

  const availableYears = useMemo(() => {
    const set = new Set([currentYear]);
    enrichedQuotes.forEach((q) => {
      if (q._year) set.add(q._year);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [enrichedQuotes, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState('todos'); // 'todos' | '1'..'12'
  const [detailFilter, setDetailFilter] = useState('operativos'); // 'operativos' | 'pagada' | 'por_cobrar' | 'en_taller' | 'con_iva' | 'sin_iva' | 'todas'

  const yearQuotes = useMemo(
    () => enrichedQuotes.filter((q) => q._year === selectedYear),
    [enrichedQuotes, selectedYear]
  );

  const periodQuotes = useMemo(() => {
    if (selectedMonth === 'todos') return yearQuotes;
    const mNum = parseInt(selectedMonth, 10);
    return yearQuotes.filter((q) => q._month === mNum);
  }, [yearQuotes, selectedMonth]);

  // KPIs del período seleccionado
  const kpis = useMemo(() => {
    const pagadas = sumFinancials(periodQuotes.filter((q) => q.status === 'pagada'));
    const porCobrar = sumFinancials(
      periodQuotes.filter((q) => ['facturada', 'despacho'].includes(q.status))
    );
    const facturadoTotal = sumFinancials(
      periodQuotes.filter((q) => ['facturada', 'despacho', 'pagada'].includes(q.status))
    );
    const enTaller = sumFinancials(
      periodQuotes.filter((q) => ['aceptada', 'en_taller'].includes(q.status))
    );
    const emitidas = sumFinancials(periodQuotes.filter((q) => q.status === 'emitida'));

    return { pagadas, porCobrar, facturadoTotal, enTaller, emitidas };
  }, [periodQuotes]);

  // Tabla mensual del año seleccionado
  const monthlyRows = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => {
      const mNum = idx + 1;
      const mQuotes = yearQuotes.filter((q) => q._month === mNum);
      const pagadas = sumFinancials(mQuotes.filter((q) => q.status === 'pagada'));
      const porCobrar = sumFinancials(
        mQuotes.filter((q) => ['facturada', 'despacho'].includes(q.status))
      );
      const enTaller = sumFinancials(
        mQuotes.filter((q) => ['aceptada', 'en_taller'].includes(q.status))
      );
      const emitidas = sumFinancials(mQuotes.filter((q) => q.status === 'emitida'));
      const ivaDebitoMes = pagadas.iva + porCobrar.iva;
      const hasData = mQuotes.length > 0;
      return {
        month: mNum,
        name,
        totalDocs: mQuotes.length,
        pagadas,
        porCobrar,
        enTaller,
        emitidas,
        ivaDebitoMes,
        hasData,
      };
    });
  }, [yearQuotes]);

  const annualTotals = useMemo(() => {
    const pagadas = sumFinancials(yearQuotes.filter((q) => q.status === 'pagada'));
    const porCobrar = sumFinancials(
      yearQuotes.filter((q) => ['facturada', 'despacho'].includes(q.status))
    );
    const enTaller = sumFinancials(
      yearQuotes.filter((q) => ['aceptada', 'en_taller'].includes(q.status))
    );
    return {
      totalDocs: yearQuotes.length,
      pagadas,
      porCobrar,
      enTaller,
      ivaDebitoAnual: pagadas.iva + porCobrar.iva,
    };
  }, [yearQuotes]);

  // Detalle de documentos del período
  const detailRows = useMemo(() => {
    return periodQuotes
      .filter((q) => {
        if (detailFilter === 'operativos') {
          return ['aceptada', 'en_taller', 'facturada', 'despacho', 'pagada'].includes(q.status);
        }
        if (detailFilter === 'pagada') return q.status === 'pagada';
        if (detailFilter === 'por_cobrar') return ['facturada', 'despacho'].includes(q.status);
        if (detailFilter === 'en_taller') return ['aceptada', 'en_taller'].includes(q.status);
        if (detailFilter === 'con_iva') return Number(q.tax_amount) > 0;
        if (detailFilter === 'sin_iva') return Number(q.tax_amount) === 0;
        return true;
      })
      .sort((a, b) => b._effDate.localeCompare(a._effDate));
  }, [periodQuotes, detailFilter]);

  const detailTotals = useMemo(() => sumFinancials(detailRows), [detailRows]);

  const getStatusMeta = (id) =>
    QUOTE_STATUSES.find((s) => s.id === id) || QUOTE_STATUSES[0];

  const exportCsv = () => {
    const headers = [
      'Año',
      'Mes',
      'Fecha',
      'Correlativo',
      'N° Factura SII',
      'Cliente',
      'RUT',
      'Estado',
      'Cobro',
      'Neto (CLP)',
      'Tasa IVA (%)',
      'IVA (CLP)',
      'Total (CLP)',
    ];
    const rows = detailRows.map((q) => [
      q._year,
      MONTH_NAMES[q._month - 1] || q._month,
      q._effDate,
      q.correlative,
      q.invoice_number || '',
      `"${(q.client_snapshot?.name || '').replace(/"/g, '""')}"`,
      q.client_snapshot?.rut || '',
      getStatusMeta(q.status).label,
      q.status === 'pagada'
        ? 'Pagada'
        : ['facturada', 'despacho'].includes(q.status)
          ? 'No Pagada'
          : 'Sin Facturar',
      Number(q.subtotal) || 0,
      Number(q.tax_rate) || 0,
      Number(q.tax_amount) || 0,
      Number(q.total) || 0,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const monthSuffix =
      selectedMonth === 'todos' ? 'anual' : String(selectedMonth).padStart(2, '0');
    a.href = url;
    a.download = `informe-administrativo-${selectedYear}-${monthSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel =
    selectedMonth === 'todos'
      ? `Año ${selectedYear}`
      : `${MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`;

  return (
    <div className="space-y-6">
      {/* HEADER & FILTROS AÑO/MES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600 shrink-0" />
            <span>Administración · Informe Mensual de Ventas e IVA</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Control financiero por año y mes: caja realmente pagada, facturado por cobrar, IVA
            Débito Fiscal (19%) y producción en taller.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              aria-label="Seleccionar año"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Año {y}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
            aria-label="Seleccionar mes"
          >
            <option value="todos">Todos los meses ({selectedYear})</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={String(idx + 1)}>
                {name} {selectedYear}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={exportCsv}
            disabled={detailRows.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS DEL PERÍODO CON DESGLOSE DE NETO E IVA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Realmente Pagado ({periodLabel})</span>
            <BadgeDollarSign className="w-4 h-4 shrink-0" />
          </div>
          <div className="font-heading text-2xl font-extrabold text-emerald-700">
            {formatCLP(kpis.pagadas.total)}
          </div>
          <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 pt-1 border-t border-slate-100">
            <span>
              Neto: <strong className="font-mono">{formatCLP(kpis.pagadas.net)}</strong>
            </span>
            <span>
              IVA: <strong className="font-mono">{formatCLP(kpis.pagadas.iva)}</strong>
            </span>
            <span className="text-emerald-700 font-semibold">{kpis.pagadas.count} docs</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>Facturado por Cobrar</span>
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          </div>
          <div className="font-heading text-2xl font-extrabold text-amber-700">
            {formatCLP(kpis.porCobrar.total)}
          </div>
          <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 pt-1 border-t border-slate-100">
            <span>
              Neto: <strong className="font-mono">{formatCLP(kpis.porCobrar.net)}</strong>
            </span>
            <span>
              IVA: <strong className="font-mono">{formatCLP(kpis.porCobrar.iva)}</strong>
            </span>
            <span className="text-amber-700 font-semibold">{kpis.porCobrar.count} sin pagar</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-800">
            <span>IVA Débito Fiscal (F29)</span>
            <Receipt className="w-4 h-4 shrink-0 text-cyan-700" />
          </div>
          <div className="font-heading text-2xl font-extrabold text-cyan-800">
            {formatCLP(kpis.facturadoTotal.iva)}
          </div>
          <div className="text-[11px] text-cyan-900/80 flex flex-wrap gap-x-3 gap-y-0.5 pt-1 border-t border-cyan-200/60">
            <span>
              Afecto:{' '}
              <strong className="font-mono">{formatCLP(kpis.facturadoTotal.afectoNet)}</strong>
            </span>
            <span>
              Sin IVA:{' '}
              <strong className="font-mono">{formatCLP(kpis.facturadoTotal.exentoNet)}</strong>
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-violet-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-violet-700">
            <span>Aceptado / En Taller</span>
            <Wrench className="w-4 h-4 shrink-0" />
          </div>
          <div className="font-heading text-2xl font-extrabold text-violet-700">
            {formatCLP(kpis.enTaller.total)}
          </div>
          <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 pt-1 border-t border-slate-100">
            <span>
              Neto: <strong className="font-mono">{formatCLP(kpis.enTaller.net)}</strong>
            </span>
            <span>
              IVA est.: <strong className="font-mono">{formatCLP(kpis.enTaller.iva)}</strong>
            </span>
            <span className="text-violet-700 font-semibold">{kpis.enTaller.count} en taller</span>
          </div>
        </div>
      </div>

      {/* RESUMEN MENSUAL DEL AÑO */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-slate-900 text-sm">
              Resumen Mensual · Año {selectedYear}
            </h3>
            <p className="text-[11px] text-slate-500">
              Haz clic en cualquier mes para filtrar el detalle inferior.
            </p>
          </div>
          {selectedMonth !== 'todos' && (
            <button
              type="button"
              onClick={() => setSelectedMonth('todos')}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Ver todo el año {selectedYear}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2.5 px-4 text-left font-bold">Mes</th>
                <th className="py-2.5 px-3 text-right font-bold">Aceptado / Taller</th>
                <th className="py-2.5 px-3 text-right font-bold">Por Cobrar (Total)</th>
                <th className="py-2.5 px-3 text-right font-bold">Pagado (Neto)</th>
                <th className="py-2.5 px-3 text-right font-bold">Pagado (Total)</th>
                <th className="py-2.5 px-4 text-right font-bold text-cyan-800">
                  IVA Débito (Fact.+Pag.)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyRows
                .filter((r) => r.hasData)
                .map((row) => {
                  const isSelected = selectedMonth === String(row.month);
                  return (
                    <tr
                      key={row.month}
                      onClick={() =>
                        setSelectedMonth(isSelected ? 'todos' : String(row.month))
                      }
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-red-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span>{row.name}</span>
                        <span className="ml-2 text-[10px] font-normal text-slate-400">
                          ({row.totalDocs} cots)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-violet-700">
                        {formatCLP(row.enTaller.total)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 font-semibold">
                        {formatCLP(row.porCobrar.total)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatCLP(row.pagadas.net)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCLP(row.pagadas.total)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-cyan-800 bg-cyan-50/40">
                        {formatCLP(row.ivaDebitoMes)}
                      </td>
                    </tr>
                  );
                })}
              {monthlyRows.every((r) => !r.hasData) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No hay movimientos registrados en {selectedYear}.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100/80 border-t-2 border-slate-200 font-bold text-slate-900">
              <tr>
                <td className="py-3 px-4">TOTAL {selectedYear}</td>
                <td className="py-3 px-3 text-right font-mono text-violet-800">
                  {formatCLP(annualTotals.enTaller.total)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-800">
                  {formatCLP(annualTotals.porCobrar.total)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-700">
                  {formatCLP(annualTotals.pagadas.net)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-800">
                  {formatCLP(annualTotals.pagadas.total)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-cyan-900 bg-cyan-100/60">
                  {formatCLP(annualTotals.ivaDebitoAnual)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* DETALLE DE DOCUMENTOS DEL PERÍODO */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-600" />
            <h3 className="font-heading font-bold text-slate-900 text-sm">
              Detalle de Documentos · {periodLabel} ({detailRows.length})
            </h3>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'operativos', label: 'Aprobados / Fact. / Pag.' },
              { id: 'pagada', label: 'Solo Pagadas' },
              { id: 'por_cobrar', label: 'Por Cobrar' },
              { id: 'en_taller', label: 'En Taller' },
              { id: 'con_iva', label: 'Con IVA (19%)' },
              { id: 'sin_iva', label: 'Sin IVA (0%)' },
              { id: 'todas', label: 'Todas' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap shrink-0 transition ${
                  detailFilter === tab.id
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2.5 px-3 text-left font-bold">Fecha</th>
                <th className="py-2.5 px-3 text-left font-bold">Cotización</th>
                <th className="py-2.5 px-3 text-left font-bold">Factura SII</th>
                <th className="py-2.5 px-3 text-left font-bold">Cliente</th>
                <th className="py-2.5 px-3 text-left font-bold">Estado</th>
                <th className="py-2.5 px-3 text-right font-bold">Neto</th>
                <th className="py-2.5 px-3 text-right font-bold">IVA</th>
                <th className="py-2.5 px-4 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No hay documentos en este filtro para {periodLabel}.
                  </td>
                </tr>
              ) : (
                detailRows.map((q) => {
                  const meta = getStatusMeta(q.status);
                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatDateCL(q._effDate)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {q.correlative}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-700 whitespace-nowrap">
                        {q.invoice_number ? `N° ${q.invoice_number}` : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">
                          {q.client_snapshot?.name || 'Cliente'}
                        </div>
                        {q.client_snapshot?.rut && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {q.client_snapshot.rut}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatCLP(q.subtotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-cyan-800">
                        {Number(q.tax_amount) > 0 ? (
                          <span>{formatCLP(q.tax_amount)}</span>
                        ) : (
                          <span className="text-slate-400">$0 (0%)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCLP(q.total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {detailRows.length > 0 && (
              <tfoot className="bg-slate-100/80 border-t-2 border-slate-200 font-bold text-slate-900">
                <tr>
                  <td colSpan={5} className="py-3 px-3 text-right">
                    SUBTOTAL FILTRO ({detailRows.length} docs):
                  </td>
                  <td className="py-3 px-3 text-right font-mono">{formatCLP(detailTotals.net)}</td>
                  <td className="py-3 px-3 text-right font-mono text-cyan-900">
                    {formatCLP(detailTotals.iva)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900">
                    {formatCLP(detailTotals.total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
