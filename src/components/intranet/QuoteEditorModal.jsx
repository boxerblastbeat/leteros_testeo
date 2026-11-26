import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Save, Calculator, UserPlus } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatCLP, calculateQuoteTotals, uid } from '../../lib/formatters';

const MANUFACTURING_OPTIONS = [
  'Inmediato',
  '24 a 48 horas',
  '3 a 5 días hábiles',
  '5 a 7 días hábiles',
  '7 a 10 días hábiles',
  'Según coordinación',
];

const VALIDITY_OPTIONS = [5, 15, 30];

const isBlank = (val) => val === '' || val === null || val === undefined || (typeof val === 'string' && val.trim() === '');

const highlightInput = (val, base = '') =>
  `${base} ${
    isBlank(val)
      ? 'bg-amber-50/50 border-amber-300 placeholder:text-slate-400 focus:bg-white focus:border-red-600'
      : 'bg-white border-slate-300 focus:border-red-600'
  } focus:outline-none transition`;

export default function QuoteEditorModal({
  open,
  initialQuote = null,
  fromRequest = null,
  onClose,
  onSaved,
}) {
  const { materials, clients, saveQuote, saveClient, updateRequestStatus, showToast } = useErp();

  const buildInitialState = () => {
    if (initialQuote) {
      return {
        id: initialQuote.id,
        correlative: initialQuote.correlative,
        client_id: initialQuote.client_id || '',
        client_snapshot: {
          name: '',
          rut: '',
          contact_name: '',
          phone: '',
          email: '',
          validity_days: 15,
          ...(initialQuote.client_snapshot || {}),
        },
        items: initialQuote.items || [],
        status: initialQuote.status || 'emitida',
        delivery_method: initialQuote.delivery_method || 'instalacion',
        delivery_address: initialQuote.delivery_address || '',
        manufacturing_days: initialQuote.manufacturing_days || '5 a 7 días hábiles',
        payment_terms: initialQuote.payment_terms || '50% abono / 50% contra entrega',
        installation_fee: initialQuote.installation_fee || 0,
        freight_fee: initialQuote.freight_fee || 0,
        discount_amount: initialQuote.discount_amount || 0,
        tax_rate: initialQuote.tax_rate ?? 19,
        notes: initialQuote.notes || '',
        status_history: initialQuote.status_history || [],
      };
    }

    if (fromRequest) {
      const mat =
        materials.find((m) => m.id === fromRequest.material_id) ||
        materials.find((m) => m.name === fromRequest.material_name);
      const w = parseFloat(fromRequest.width) || 1;
      const h = parseFloat(fromRequest.height) || 1;
      const area = w * h;
      const isUnit = mat?.unit === 'unidad';
      const baseRate = mat?.pricePerSqm || 15000;
      const unitPrice = isUnit ? baseRate : Math.round(area * baseRate);
      const qty = Math.max(1, parseInt(fromRequest.quantity, 10) || 1);

      return {
        client_id: '',
        client_snapshot: {
          name: fromRequest.client_name || '',
          rut: fromRequest.client_rut || '',
          contact_name: fromRequest.client_name || '',
          phone: fromRequest.client_phone || '',
          email: fromRequest.client_email || '',
          validity_days: 15,
        },
        items: [
          {
            id: uid(),
            materialId: mat?.id || '',
            name: fromRequest.material_name || fromRequest.service_type,
            detail: `${fromRequest.service_type}${fromRequest.comments ? ` · ${fromRequest.comments}` : ''}`,
            width: fromRequest.width || '',
            height: fromRequest.height || '',
            area: Number(area.toFixed(2)),
            quantity: qty,
            priceMode: isUnit ? 'unit' : 'sqm',
            baseRate,
            unitPrice,
            lineTotal: Math.round(qty * unitPrice),
          },
        ],
        status: 'emitida',
        delivery_method: fromRequest.delivery_method || 'instalacion',
        delivery_address: fromRequest.delivery_address || '',
        manufacturing_days: '5 a 7 días hábiles',
        payment_terms: '50% abono / 50% contra entrega',
        installation_fee: 0,
        freight_fee: 0,
        discount_amount: 0,
        tax_rate: 19,
        notes: fromRequest.comments || '',
        status_history: [],
      };
    }

    return {
      client_id: '',
      client_snapshot: { name: '', rut: '', contact_name: '', phone: '', email: '', validity_days: 15 },
      items: [],
      status: 'emitida',
      delivery_method: 'instalacion',
      delivery_address: '',
      manufacturing_days: '5 a 7 días hábiles',
      payment_terms: '50% abono / 50% contra entrega',
      installation_fee: 0,
      freight_fee: 0,
      discount_amount: 0,
      tax_rate: 19,
      notes: '',
      status_history: [],
    };
  };

  const [form, setForm] = useState(buildInitialState);
  const [selectedMatId, setSelectedMatId] = useState(materials[0]?.id || '');
  const [draftItem, setDraftItem] = useState({
    name: materials[0]?.name || '',
    detail: '',
    width: '1.00',
    height: '1.00',
    quantity: 1,
    priceMode: materials[0]?.unit === 'unidad' ? 'unit' : 'sqm',
    baseRate: materials[0]?.pricePerSqm || 25000,
    customUnitPrice: '',
  });
  const [saving, setSaving] = useState(false);

  const totals = useMemo(
    () =>
      calculateQuoteTotals({
        items: form.items,
        installationFee: form.installation_fee,
        freightFee: form.freight_fee,
        discountAmount: form.discount_amount,
        taxRate: form.tax_rate,
      }),
    [form.items, form.installation_fee, form.freight_fee, form.discount_amount, form.tax_rate]
  );

  if (!open) return null;

  const handleSelectClient = (clientId) => {
    const found = clients.find((c) => c.id === clientId);
    if (!found) {
      setForm((prev) => ({ ...prev, client_id: '' }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      client_id: found.id,
      delivery_address: prev.delivery_address || found.address || '',
      client_snapshot: {
        ...prev.client_snapshot,
        name: found.name,
        rut: found.rut || '',
        contact_name: found.contact_name || '',
        phone: found.phone || '',
        email: found.email || '',
      },
    }));
  };

  const handleMaterialPick = (matId) => {
    setSelectedMatId(matId);
    const mat = materials.find((m) => m.id === matId);
    if (!mat) return;
    setDraftItem((prev) => ({
      ...prev,
      name: mat.name,
      priceMode: mat.unit === 'unidad' ? 'unit' : 'sqm',
      baseRate: mat.pricePerSqm,
      customUnitPrice: '',
    }));
  };

  const computedDraftUnitPrice = () => {
    if (draftItem.customUnitPrice !== '' && !Number.isNaN(Number(draftItem.customUnitPrice))) {
      return Math.max(0, Math.round(Number(draftItem.customUnitPrice)));
    }
    const rate = Number(draftItem.baseRate) || 0;
    if (draftItem.priceMode === 'unit') return Math.round(rate);
    const w = parseFloat(draftItem.width) || 0;
    const h = parseFloat(draftItem.height) || 0;
    return Math.round(w * h * rate);
  };

  const handleAddItem = () => {
    if (!draftItem.name.trim()) return;
    const qty = Math.max(1, parseInt(draftItem.quantity, 10) || 1);
    const unitPrice = computedDraftUnitPrice();
    const w = parseFloat(draftItem.width) || 0;
    const h = parseFloat(draftItem.height) || 0;
    const newItem = {
      id: uid(),
      materialId: selectedMatId,
      name: draftItem.name.trim(),
      detail: draftItem.detail.trim(),
      width: draftItem.priceMode === 'sqm' ? w : '',
      height: draftItem.priceMode === 'sqm' ? h : '',
      area: draftItem.priceMode === 'sqm' ? Number((w * h).toFixed(2)) : 0,
      quantity: qty,
      priceMode: draftItem.priceMode,
      baseRate: Number(draftItem.baseRate) || 0,
      unitPrice,
      lineTotal: Math.round(qty * unitPrice),
    };
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setDraftItem((prev) => ({ ...prev, detail: '', customUnitPrice: '' }));
  };

  const updateItemField = (itemId, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.id !== itemId) return it;
        const next = { ...it, [field]: value };
        const qty = Number(next.quantity) || 0;
        const unitPrice = Number(next.unitPrice) || 0;
        next.lineTotal = Math.round(qty * unitPrice);
        return next;
      }),
    }));
  };

  const removeItem = (itemId) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== itemId) }));
  };

  const handleSaveNewClientToMaster = async () => {
    if (!form.client_snapshot.name.trim()) {
      showToast('Ingresa el nombre del cliente primero', 'error');
      return;
    }
    const created = await saveClient({
      name: form.client_snapshot.name.trim(),
      rut: form.client_snapshot.rut.trim(),
      contact_name: form.client_snapshot.contact_name.trim(),
      phone: form.client_snapshot.phone.trim(),
      email: form.client_snapshot.email.trim(),
      address: form.delivery_address.trim(),
      client_type: 'Empresa',
      notes: '',
    });
    setForm((prev) => ({ ...prev, client_id: created.id }));
    showToast('Cliente guardado en Maestro de Clientes');
  };

  const handleSubmit = async (targetStatus) => {
    if (!form.client_snapshot.name.trim()) {
      showToast('Debes ingresar el nombre o razón social del cliente', 'error');
      return;
    }
    if (form.items.length === 0) {
      showToast('Agrega al menos un ítem a la cotización', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        installation_fee: Number(form.installation_fee) || 0,
        freight_fee: Number(form.freight_fee) || 0,
        discount_amount: Number(form.discount_amount) || 0,
        status: targetStatus || form.status,
        subtotal: totals.netSubtotal,
        tax_amount: totals.taxAmount,
        total: totals.total,
      };
      const saved = await saveQuote(payload);
      if (fromRequest?.id) {
        await updateRequestStatus(fromRequest.id, 'convertida', saved.id);
      }
      showToast(`Cotización ${saved.correlative} guardada correctamente`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      showToast(err?.message || 'Error al guardar cotización', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6">
      <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-4 text-slate-900">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-slate-900 text-base sm:text-lg truncate">
                {initialQuote
                  ? `Editar Cotización ${initialQuote.correlative}`
                  : fromRequest
                    ? 'Convertir Solicitud Web en Cotización Oficial'
                    : 'Nueva Cotización Correlativa'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Precios libres por m² o unidad · Cuadre matemático exacto + IVA 19% CLP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* CLIENTE */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Cliente y Entrega
              </h4>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto min-w-0">
                <select
                  value={form.client_id}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full sm:w-auto sm:max-w-xs min-w-0 px-3 py-2 sm:py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-red-600 truncate"
                >
                  <option value="">— Cargar desde Maestro de Clientes —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.rut ? `(${c.rut})` : ''}
                    </option>
                  ))}
                </select>
                {!form.client_id && form.client_snapshot.name && (
                  <button
                    type="button"
                    onClick={handleSaveNewClientToMaster}
                    className="w-full sm:w-auto justify-center px-3 py-2 sm:py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs text-slate-700 font-semibold flex items-center gap-1 shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Guardar Cliente
                  </button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Razón Social / Cliente *"
                value={form.client_snapshot.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    client_snapshot: { ...form.client_snapshot, name: e.target.value },
                  })
                }
                className={highlightInput(form.client_snapshot.name, 'sm:col-span-2 px-3 py-2 rounded-xl border text-sm text-slate-900')}
              />
              <input
                type="text"
                placeholder="RUT"
                value={form.client_snapshot.rut}
                onChange={(e) =>
                  setForm({
                    ...form,
                    client_snapshot: { ...form.client_snapshot, rut: e.target.value },
                  })
                }
                className={highlightInput(form.client_snapshot.rut, 'px-3 py-2 rounded-xl border text-sm text-slate-900')}
              />
              <input
                type="text"
                placeholder="WhatsApp / Teléfono"
                value={form.client_snapshot.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    client_snapshot: { ...form.client_snapshot, phone: e.target.value },
                  })
                }
                className={highlightInput(form.client_snapshot.phone, 'px-3 py-2 rounded-xl border text-sm text-slate-900')}
              />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={form.client_snapshot.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    client_snapshot: { ...form.client_snapshot, email: e.target.value },
                  })
                }
                className={highlightInput(form.client_snapshot.email, 'px-3 py-2 rounded-xl border text-sm text-slate-900')}
              />
              <select
                value={form.delivery_method}
                onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
              >
                <option value="instalacion">Instalación en Terreno</option>
                <option value="retiro">Retiro en Taller</option>
                <option value="despacho">Despacho a Domicilio</option>
              </select>
              <input
                type="text"
                placeholder="Dirección de obra o entrega"
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                className={highlightInput(form.delivery_address, 'sm:col-span-2 px-3 py-2 rounded-xl border text-sm text-slate-900')}
              />
            </div>
          </div>

          {/* AGREGAR ÍTEM */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Agregar Ítem desde Tarifario o Libre
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
              <div className="col-span-2 sm:col-span-4">
                <label className="block text-[11px] text-slate-500 mb-1">Material de Catálogo</label>
                <select
                  value={selectedMatId}
                  onChange={(e) => handleMaterialPick(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {formatCLP(m.pricePerSqm)}/{m.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 sm:col-span-4">
                <label className="block text-[11px] text-slate-500 mb-1">
                  Descripción en Cotización
                </label>
                <input
                  type="text"
                  value={draftItem.name}
                  onChange={(e) => setDraftItem({ ...draftItem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Modo</label>
                <select
                  value={draftItem.priceMode}
                  onChange={(e) => setDraftItem({ ...draftItem, priceMode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                >
                  <option value="sqm">Por m²</option>
                  <option value="unit">Por Unidad</option>
                </select>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={draftItem.quantity}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDraftItem({ ...draftItem, quantity: e.target.value })}
                  className={highlightInput(draftItem.quantity, 'w-full px-3 py-2 rounded-xl border text-xs text-slate-900')}
                />
              </div>

              {draftItem.priceMode === 'sqm' && (
                <>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] text-slate-500 mb-1">Ancho (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftItem.width}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setDraftItem({ ...draftItem, width: e.target.value })}
                      className={highlightInput(draftItem.width, 'w-full px-3 py-2 rounded-xl border text-xs text-slate-900')}
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] text-slate-500 mb-1">Alto (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftItem.height}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setDraftItem({ ...draftItem, height: e.target.value })}
                      className={highlightInput(draftItem.height, 'w-full px-3 py-2 rounded-xl border text-xs text-slate-900')}
                    />
                  </div>
                </>
              )}

              <div className={draftItem.priceMode === 'sqm' ? 'col-span-2 sm:col-span-3' : 'col-span-2 sm:col-span-5'}>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Detalle técnico (terminaciones, LED, ojetillos)
                </label>
                <input
                  type="text"
                  value={draftItem.detail}
                  onChange={(e) => setDraftItem({ ...draftItem, detail: e.target.value })}
                  placeholder="Ej: Laminado UV + bastidor metálico"
                  className={highlightInput(draftItem.detail, 'w-full px-3 py-2 rounded-xl border text-xs text-slate-900')}
                />
              </div>

              <div className="col-span-2 sm:col-span-3">
                <label className="block text-[11px] text-slate-500 mb-1">
                  Precio Unitario Libre (Auto: {formatCLP(computedDraftUnitPrice())})
                </label>
                <input
                  type="number"
                  placeholder={String(computedDraftUnitPrice())}
                  value={draftItem.customUnitPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDraftItem({ ...draftItem, customUnitPrice: e.target.value })}
                  className={highlightInput(draftItem.customUnitPrice, 'w-full px-3 py-2 rounded-xl border text-xs font-mono text-slate-900')}
                />
              </div>

              <div className="col-span-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2.5 sm:py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
            </div>
          </div>

          {/* LISTA DE ÍTEMS (Tarjetas en móvil + Tabla en tablet/desktop) */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            {/* Vista Móvil */}
            <div className="sm:hidden divide-y divide-slate-100">
              {form.items.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs text-slate-400">
                  Aún no has agregado ítems a esta cotización.
                </div>
              ) : (
                form.items.map((item) => (
                  <div key={item.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItemField(item.id, 'name', e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={item.detail || ''}
                          onChange={(e) => updateItemField(item.id, 'detail', e.target.value)}
                          placeholder="Agregar detalle..."
                          className="w-full bg-transparent text-[11px] text-slate-500 focus:outline-none mt-0.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                        title="Eliminar ítem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-end pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-400 mb-0.5">Cant.</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemField(item.id, 'quantity', Math.max(1, Number(e.target.value) || 1))
                          }
                          className="w-full text-center px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 mb-0.5">Unitario (CLP)</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItemField(item.id, 'unitPrice', Math.max(0, Number(e.target.value) || 0))
                          }
                          className="w-full text-right px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 font-mono"
                        />
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-400 mb-0.5">
                          {item.width && item.height ? `${item.width}×${item.height}m` : 'Subtotal'}
                        </span>
                        <div className="py-1.5 font-mono text-xs font-extrabold text-slate-900">
                          {formatCLP(Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Vista Tablet / Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Ítem / Detalle</th>
                    <th className="py-2.5 px-3 text-center">Medidas</th>
                    <th className="py-2.5 px-3 text-center w-20">Cant.</th>
                    <th className="py-2.5 px-3 text-right w-32">Unitario (CLP)</th>
                    <th className="py-2.5 px-3 text-right w-32">Subtotal</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Aún no has agregado ítems a esta cotización.
                      </td>
                    </tr>
                  ) : (
                    form.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItemField(item.id, 'name', e.target.value)}
                            className="w-full bg-transparent font-semibold text-slate-900 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={item.detail || ''}
                            onChange={(e) => updateItemField(item.id, 'detail', e.target.value)}
                            placeholder="Agregar detalle..."
                            className="w-full bg-transparent text-[11px] text-slate-500 focus:outline-none mt-0.5"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {item.width && item.height ? `${item.width}×${item.height}m` : 'Unid.'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemField(item.id, 'quantity', Math.max(1, Number(e.target.value) || 1))
                            }
                            className="w-16 text-center px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItemField(item.id, 'unitPrice', Math.max(0, Number(e.target.value) || 0))
                            }
                            className="w-28 text-right px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCLP(Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)))}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARGOS, CONDICIONES Y TOTALES */}
          <div className="grid md:grid-cols-12 gap-5">
            <div className="md:col-span-7 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Instalación (CLP)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={Number(form.installation_fee) === 0 ? '' : form.installation_fee}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      installation_fee: e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={highlightInput(
                    Number(form.installation_fee) === 0 ? '' : form.installation_fee,
                    'w-full px-3 py-2 rounded-xl border text-xs font-mono text-slate-900'
                  )}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Flete / Despacho (CLP)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={Number(form.freight_fee) === 0 ? '' : form.freight_fee}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      freight_fee: e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={highlightInput(
                    Number(form.freight_fee) === 0 ? '' : form.freight_fee,
                    'w-full px-3 py-2 rounded-xl border text-xs font-mono text-slate-900'
                  )}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Descuento (CLP)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={Number(form.discount_amount) === 0 ? '' : form.discount_amount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discount_amount: e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={highlightInput(
                    Number(form.discount_amount) === 0 ? '' : form.discount_amount,
                    'w-full px-3 py-2 rounded-xl border text-xs font-mono text-emerald-700'
                  )}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Plazo Fabricación</label>
                <select
                  value={form.manufacturing_days}
                  onChange={(e) => setForm({ ...form, manufacturing_days: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                >
                  {!MANUFACTURING_OPTIONS.includes(form.manufacturing_days) && form.manufacturing_days && (
                    <option value={form.manufacturing_days}>{form.manufacturing_days}</option>
                  )}
                  {MANUFACTURING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Validez Cotización</label>
                <select
                  value={Number(form.client_snapshot?.validity_days) || 15}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      client_snapshot: {
                        ...form.client_snapshot,
                        validity_days: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                >
                  {VALIDITY_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {days} días corridos
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Condición de Pago</label>
                <input
                  type="text"
                  placeholder="Ej: 50% abono / 50% contra entrega"
                  value={form.payment_terms}
                  onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                  className={highlightInput(form.payment_terms, 'w-full px-3 py-2 rounded-xl border text-xs text-slate-900')}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales visibles en la cotización..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={highlightInput(form.notes, 'w-full px-3 py-2 rounded-xl border text-xs text-slate-900 resize-none')}
                />
              </div>
            </div>

            <div className="md:col-span-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5 text-xs">
                {/* Selector Con IVA / Sin IVA */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/70 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tax_rate: 19 })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition ${
                      Number(form.tax_rate) > 0
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Con IVA (19%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tax_rate: 0 })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition ${
                      Number(form.tax_rate) === 0
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sin IVA (Neto)
                  </button>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Ítems ({form.items.length})</span>
                  <span className="font-mono">{formatCLP(totals.itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-semibold pt-2 border-t border-slate-200">
                  <span>Subtotal Neto</span>
                  <span className="font-mono">{formatCLP(totals.netSubtotal)}</span>
                </div>
                {Number(form.tax_rate) > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>IVA ({form.tax_rate}%)</span>
                    <span className="font-mono">{formatCLP(totals.taxAmount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-500 italic">
                    <span>IVA</span>
                    <span>Valores sin IVA (Neto)</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-extrabold text-slate-900 pt-3 border-t border-slate-300">
                  <span>{Number(form.tax_rate) > 0 ? 'TOTAL CLP' : 'TOTAL NETO'}</span>
                  <span className="font-mono text-red-600">{formatCLP(totals.total)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(initialQuote ? form.status : 'emitida')}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : initialQuote ? 'Guardar Cambios' : 'Emitir Cotización Oficial'}
                </button>
                {!initialQuote && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSubmit('borrador')}
                    className="w-full py-2 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold transition"
                  >
                    Guardar como Borrador
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
