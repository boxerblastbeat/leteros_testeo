export const formatCLP = (value) => {
  const num = Math.round(Number(value) || 0);
  return '$' + num.toLocaleString('es-CL');
};

export const formatDateCL = (isoDate) => {
  if (!isoDate) return '—';
  const d = new Date(isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDaysISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const DELIVERY_LABELS = {
  instalacion: 'Instalación en Terreno / Obra',
  retiro: 'Retiro en Taller (Olivar)',
  despacho: 'Despacho a Domicilio / Obra',
};

export const DESIGN_LABELS = {
  si: 'Tengo diseño listo (vector / PDF)',
  ajustes: 'Tengo logo, necesito armado gráfico',
  no: 'Necesito diseño desde cero',
};

export const calculateQuoteTotals = ({
  items = [],
  installationFee = 0,
  freightFee = 0,
  discountAmount = 0,
  taxRate = 19,
}) => {
  const itemsSubtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return sum + Math.round(qty * unitPrice);
  }, 0);

  const extra = Math.round((Number(installationFee) || 0) + (Number(freightFee) || 0));
  const discount = Math.round(Number(discountAmount) || 0);
  const netSubtotal = Math.max(0, itemsSubtotal + extra - discount);
  const taxAmount = Math.round(netSubtotal * ((Number(taxRate) || 0) / 100));
  const total = netSubtotal + taxAmount;

  return {
    itemsSubtotal,
    netSubtotal,
    taxAmount,
    total,
  };
};

export const getQuotePayments = (quote) => {
  const list = quote?.payments || quote?.client_snapshot?.payments;
  return Array.isArray(list) ? list : [];
};

export const isQuoteInvoiced = (quote) => {
  if (!quote) return false;
  return (
    Boolean(String(quote.invoice_number || '').trim()) ||
    ['facturada', 'pagada'].includes(quote.status)
  );
};

export const getQuoteFinancialState = (quote) => {
  const total = Math.max(0, Math.round(Number(quote?.total) || 0));
  const payments = getQuotePayments(quote);
  const paymentsSum = payments.reduce((sum, p) => sum + Math.round(Number(p.amount) || 0), 0);
  const isPaid = quote?.status === 'pagada' || (total > 0 && paymentsSum >= total);
  const paidAmount = isPaid ? total : Math.min(total, paymentsSum);
  const pendingBalance = Math.max(0, total - paidAmount);
  const invoiced = isQuoteInvoiced(quote);
  return {
    total,
    payments,
    paidAmount,
    pendingBalance,
    hasPartialPayment: paidAmount > 0 && pendingBalance > 0,
    isPaid,
    invoiced,
    deliveredWithoutInvoice: quote?.status === 'despacho' && !invoiced,
  };
};
