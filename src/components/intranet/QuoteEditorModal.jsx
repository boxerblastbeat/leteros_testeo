import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Save, Calculator, UserPlus } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatCLP, calculateQuoteTotals, uid } from '../../lib/formatters';

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
        client_snapshot: initialQuote.client_snapshot || {
          name: '',
          rut: '',
          contact_name: '',
          phone: '',
          email: '',
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
      client_snapshot: { name: '', rut: '', contact_name: '', phone: '', email: '' },
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto p-3 sm:p-6">
      <div className="max-w-5xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-600/30 text-red-500 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-white text-lg">
                {initialQuote
                  ? `Editar Cotización ${initialQuote.correlative}`
                  : fromRequest
                    ? 'Convertir Solicitud Web en Cotización Oficial'
                    : 'Nueva Cotización Correlativa'}
              </h3>
              <p className="text-xs text-zinc-400">
                Precios libres por m² o unidad · Cuadre matemático exacto + IVA 19% CLP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* CLIENTE */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                1. Cliente y Entrega
              </h4>
              <div className="flex items-center gap-2">
                <select
                  value={form.client_id}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
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
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-semibold flex items-center gap-1"
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
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
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
                className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
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
                className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
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
                className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
              />
              <select
                value={form.delivery_method}
                onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
                className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
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
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* AGREGAR ÍTEM */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              2. Agregar Ítem desde Tarifario o Libre
            </h4>
            <div className="grid sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className="block text-[11px] text-zinc-400 mb-1">Material de Catálogo</label>
                <select
                  value={selectedMatId}
                  onChange={(e) => handleMaterialPick(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {formatCLP(m.pricePerSqm)}/{m.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Descripción en Cotización
                </label>
                <input
                  type="text"
                  value={draftItem.name}
                  onChange={(e) => setDraftItem({ ...draftItem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Modo</label>
                <select
                  value={draftItem.priceMode}
                  onChange={(e) => setDraftItem({ ...draftItem, priceMode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="sqm">Por m²</option>
                  <option value="unit">Por Unidad</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={draftItem.quantity}
                  onChange={(e) => setDraftItem({ ...draftItem, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {draftItem.priceMode === 'sqm' && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-zinc-400 mb-1">Ancho (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftItem.width}
                      onChange={(e) => setDraftItem({ ...draftItem, width: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-zinc-400 mb-1">Alto (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftItem.height}
                      onChange={(e) => setDraftItem({ ...draftItem, height: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </>
              )}

              <div className={draftItem.priceMode === 'sqm' ? 'sm:col-span-3' : 'sm:col-span-5'}>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Detalle técnico (terminaciones, LED, ojetillos)
                </label>
                <input
                  type="text"
                  value={draftItem.detail}
                  onChange={(e) => setDraftItem({ ...draftItem, detail: e.target.value })}
                  placeholder="Ej: Laminado UV + bastidor metálico"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Precio Unitario Libre (Auto: {formatCLP(computedDraftUnitPrice())})
                </label>
                <input
                  type="number"
                  placeholder={String(computedDraftUnitPrice())}
                  value={draftItem.customUnitPrice}
                  onChange={(e) => setDraftItem({ ...draftItem, customUnitPrice: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
            </div>
          </div>

          {/* LISTA DE ÍTEMS */}
          <div className="rounded-2xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 text-left">Ítem / Detalle</th>
                  <th className="py-2.5 px-3 text-center">Medidas</th>
                  <th className="py-2.5 px-3 text-center w-20">Cant.</th>
                  <th className="py-2.5 px-3 text-right w-32">Unitario (CLP)</th>
                  <th className="py-2.5 px-3 text-right w-32">Subtotal</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {form.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Aún no has agregado ítems a esta cotización.
                    </td>
                  </tr>
                ) : (
                  form.items.map((item) => (
                    <tr key={item.id} className="bg-zinc-950/60">
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItemField(item.id, 'name', e.target.value)}
                          className="w-full bg-transparent font-semibold text-white focus:outline-none"
                        />
                        <input
                          type="text"
                          value={item.detail || ''}
                          onChange={(e) => updateItemField(item.id, 'detail', e.target.value)}
                          placeholder="Agregar detalle..."
                          className="w-full bg-transparent text-[11px] text-zinc-400 focus:outline-none mt-0.5"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-400">
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
                          className="w-16 text-center px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono"
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
                          className="w-28 text-right px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {formatCLP(Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)))}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
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

          {/* CARGOS, CONDICIONES Y TOTALES */}
          <div className="grid md:grid-cols-12 gap-5">
            <div className="md:col-span-7 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Instalación (CLP)</label>
                <input
                  type="number"
                  min="0"
                  value={form.installation_fee}
                  onChange={(e) => setForm({ ...form, installation_fee: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Flete / Despacho (CLP)</label>
                <input
                  type="number"
                  min="0"
                  value={form.freight_fee}
                  onChange={(e) => setForm({ ...form, freight_fee: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Descuento (CLP)</label>
                <input
                  type="number"
                  min="0"
                  value={form.discount_amount}
                  onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Plazo Fabricación</label>
                <input
                  type="text"
                  value={form.manufacturing_days}
                  onChange={(e) => setForm({ ...form, manufacturing_days: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Condición de Pago</label>
                <input
                  type="text"
                  value={form.payment_terms}
                  onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white resize-none"
                />
              </div>
            </div>

            <div className="md:col-span-5 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Ítems ({form.items.length})</span>
                  <span className="font-mono">{formatCLP(totals.itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-300 font-semibold pt-2 border-t border-zinc-800">
                  <span>Subtotal Neto</span>
                  <span className="font-mono">{formatCLP(totals.netSubtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>IVA ({form.tax_rate}%)</span>
                  <span className="font-mono">{formatCLP(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-extrabold text-white pt-3 border-t border-zinc-700">
                  <span>TOTAL CLP</span>
                  <span className="font-mono text-red-400">{formatCLP(totals.total)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(initialQuote ? form.status : 'emitida')}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : initialQuote ? 'Guardar Cambios' : 'Emitir Cotización Oficial'}
                </button>
                {!initialQuote && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSubmit('borrador')}
                    className="w-full py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
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
