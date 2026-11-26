import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Save, Calculator, UserPlus, Layers, Sparkles } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatCLP, calculateQuoteTotals, uid } from '../../lib/formatters';
import { useModalClose } from '../../lib/useModalClose';
import {
  DEFAULT_COMPOSITION_LAYERS,
  DEFAULT_FINISHES,
  isRigidSubstrate,
} from '../../data/products';

const clonePreset = (preset, autoAdhesivo = false) => {
  const out = {};
  Object.keys(preset).forEach((k) => {
    out[k] = {
      ...preset[k],
      active: k === 'adhesivo' ? autoAdhesivo : Boolean(preset[k].active),
    };
  });
  return out;
};

export default function QuoteEditorModal({
  open,
  initialQuote = null,
  fromRequest = null,
  onClose,
  onSaved,
}) {
  const { materials, clients, saveQuote, saveClient, updateRequestStatus, showToast } = useErp();

  const { handleClose: requestClose, handleBackdropClick } = useModalClose(open, onClose, {
    confirm: true,
    message: '¿Seguro que deseas cerrar la cotización? Los datos no guardados se perderán.',
  });

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
      const autoAdhesive = !isUnit && isRigidSubstrate(mat || fromRequest.material_name);
      const adhesiveRate = autoAdhesive ? DEFAULT_COMPOSITION_LAYERS.adhesivo.price : 0;
      const unitPrice = isUnit ? baseRate : Math.round(area * (baseRate + adhesiveRate));
      const qty = Math.max(1, parseInt(fromRequest.quantity, 10) || 1);
      const baseName = fromRequest.material_name || fromRequest.service_type;
      const baseDetail = `${fromRequest.service_type}${fromRequest.comments ? ` · ${fromRequest.comments}` : ''}`;
      const compositionSuffix = autoAdhesive
        ? `Composición del Letrero: [Base: ${baseName}] + Adhesivo Vinilo Impreso`
        : '';
      const combinedDetail = compositionSuffix ? `${baseDetail} | ${compositionSuffix}` : baseDetail;

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
            name: baseName,
            detail: combinedDetail,
            width: fromRequest.width || '',
            height: fromRequest.height || '',
            area: Number(area.toFixed(2)),
            quantity: qty,
            priceMode: isUnit ? 'unit' : 'sqm',
            baseRate,
            unitPrice,
            lineTotal: Math.round(qty * unitPrice),
            compositionLayers: autoAdhesive ? ['Adhesivo Vinilo Impreso (1440dpi)'] : [],
            selectedFinishes: [],
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
  const [compositionLayers, setCompositionLayers] = useState(() =>
    clonePreset(DEFAULT_COMPOSITION_LAYERS, isRigidSubstrate(materials[0]))
  );
  const [finishesState, setFinishesState] = useState(() => clonePreset(DEFAULT_FINISHES));
  const [showFinishes, setShowFinishes] = useState(false);
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
    const isSqmMat = mat.unit !== 'unidad';
    const autoAdhesive = isSqmMat && isRigidSubstrate(mat);
    setDraftItem((prev) => ({
      ...prev,
      name: mat.name,
      priceMode: isSqmMat ? 'sqm' : 'unit',
      baseRate: mat.pricePerSqm,
      customUnitPrice: '',
    }));
    // Si es sustrato rígido (Foam, Fomex/Trovicel, ACM, Acrílico, Lata), incluye adhesivo automáticamente
    setCompositionLayers((prev) => ({
      ...prev,
      adhesivo: { ...prev.adhesivo, active: autoAdhesive },
    }));
  };

  const computeExtrasPerUnit = () => {
    const isSqm = draftItem.priceMode === 'sqm';
    const w = parseFloat(draftItem.width) || 0;
    const h = parseFloat(draftItem.height) || 0;
    const area = isSqm && w > 0 && h > 0 ? w * h : 1;

    let compPerUnit = 0;
    const compLabels = [];
    Object.values(compositionLayers).forEach((layer) => {
      if (!layer.active) return;
      const p = Number(layer.price) || 0;
      compPerUnit += layer.perSqm && isSqm ? p * area : p;
      compLabels.push(layer.label.split(' (')[0]);
    });

    let finPerUnit = 0;
    const finLabels = [];
    Object.values(finishesState).forEach((f) => {
      if (!f.active) return;
      const p = Number(f.price) || 0;
      finPerUnit += f.perSqm && isSqm ? p * area : p;
      const priceTag = f.perSqm && isSqm ? `+${formatCLP(p)}/m²` : `+${formatCLP(p)}`;
      finLabels.push(`${f.label} (${priceTag})`);
    });

    return { compPerUnit, finPerUnit, compLabels, finLabels };
  };

  const computedDraftUnitPrice = () => {
    if (draftItem.customUnitPrice !== '' && !Number.isNaN(Number(draftItem.customUnitPrice))) {
      return Math.max(0, Math.round(Number(draftItem.customUnitPrice)));
    }
    const rate = Number(draftItem.baseRate) || 0;
    const isSqm = draftItem.priceMode === 'sqm';
    const w = parseFloat(draftItem.width) || 0;
    const h = parseFloat(draftItem.height) || 0;
    const baseUnit = isSqm ? w * h * rate : rate;
    const { compPerUnit, finPerUnit } = computeExtrasPerUnit();
    return Math.round(baseUnit + compPerUnit + finPerUnit);
  };

  const handleAddItem = () => {
    if (!draftItem.name.trim()) return;
    const qty = Math.max(1, parseInt(draftItem.quantity, 10) || 1);
    const unitPrice = computedDraftUnitPrice();
    const w = parseFloat(draftItem.width) || 0;
    const h = parseFloat(draftItem.height) || 0;
    const { compLabels, finLabels } = computeExtrasPerUnit();

    const detailParts = [];
    if (draftItem.detail.trim()) detailParts.push(draftItem.detail.trim());
    if (compLabels.length > 0) {
      detailParts.push(
        `Composición del Letrero: [Base: ${draftItem.name.trim()}] + ${compLabels.join(' + ')}`
      );
    }
    if (finLabels.length > 0) {
      detailParts.push(`Acabados: ${finLabels.join(' · ')}`);
    }

    const newItem = {
      id: uid(),
      materialId: selectedMatId,
      name: draftItem.name.trim(),
      detail: detailParts.join(' | '),
      width: draftItem.priceMode === 'sqm' ? w : '',
      height: draftItem.priceMode === 'sqm' ? h : '',
      area: draftItem.priceMode === 'sqm' ? Number((w * h).toFixed(2)) : 0,
      quantity: qty,
      priceMode: draftItem.priceMode,
      baseRate: Number(draftItem.baseRate) || 0,
      unitPrice,
      lineTotal: Math.round(qty * unitPrice),
      compositionLayers: compLabels,
      selectedFinishes: finLabels,
    };
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setDraftItem((prev) => ({ ...prev, detail: '', customUnitPrice: '' }));
    // Mantener precios editados, resetear acabados opcionales y preservar adhesivo si el material actual es rígido
    const currentMat = materials.find((m) => m.id === selectedMatId);
    const keepAdhesive = draftItem.priceMode === 'sqm' && isRigidSubstrate(currentMat || draftItem.name);
    setCompositionLayers((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        next[k] = { ...prev[k], active: k === 'adhesivo' ? keepAdhesive : false };
      });
      return next;
    });
    setFinishesState((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        next[k] = { ...prev[k], active: false };
      });
      return next;
    });
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
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6"
    >
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
            type="button"
            onClick={requestClose}
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
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
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
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
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
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
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
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
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
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
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
                  onChange={(e) => setDraftItem({ ...draftItem, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
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
                      onChange={(e) => setDraftItem({ ...draftItem, width: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] text-slate-500 mb-1">Alto (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftItem.height}
                      onChange={(e) => setDraftItem({ ...draftItem, height: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
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
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
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
                  onChange={(e) => setDraftItem({ ...draftItem, customUnitPrice: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900"
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

            {/* COMPOSICIÓN DEL LETRERO (MULTICAPA: Adhesivo automático en rígidos + Laminado UV, etc.) */}
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-red-600" />
                  Composición del Letrero (Capas montadas sobre base)
                </span>
                {isRigidSubstrate(materials.find((m) => m.id === selectedMatId) || draftItem.name) && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                    Sustrato rígido: Adhesivo auto-incluido
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(compositionLayers).map(([key, layer]) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition ${
                      layer.active
                        ? 'bg-red-50/70 border-red-300 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={layer.active}
                        onChange={(e) =>
                          setCompositionLayers((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], active: e.target.checked },
                          }))
                        }
                        className="rounded border-slate-300 text-red-600 focus:ring-red-600 shrink-0"
                      />
                      <span className="font-medium truncate">{layer.label}</span>
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        value={layer.price}
                        onChange={(e) =>
                          setCompositionLayers((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], price: Number(e.target.value) || 0 },
                          }))
                        }
                        className="w-16 px-1.5 py-0.5 rounded-md bg-white border border-slate-300 text-[11px] font-mono text-right text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400">
                        {layer.perSqm && draftItem.priceMode === 'sqm' ? '/m²' : 'c/u'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACABADOS Y SERVICIOS ADICIONALES */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() => setShowFinishes((prev) => !prev)}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-red-600 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Acabados y Servicios Adicionales (Bolsillo, Ojetillos, Bastidor, LED...)
                  {Object.values(finishesState).filter((f) => f.active).length > 0 &&
                    ` · ${Object.values(finishesState).filter((f) => f.active).length} activo(s)`}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {showFinishes ? '▲ Ocultar' : '▼ Mostrar'}
                </span>
              </button>

              {showFinishes && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {Object.entries(finishesState).map(([key, fin]) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition ${
                        fin.active
                          ? 'bg-amber-50/70 border-amber-300 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={fin.active}
                          onChange={(e) =>
                            setFinishesState((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], active: e.target.checked },
                            }))
                          }
                          className="rounded border-slate-300 text-red-600 focus:ring-red-600 shrink-0"
                        />
                        <span className="font-medium truncate">{fin.label}</span>
                      </label>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          value={fin.price}
                          onChange={(e) =>
                            setFinishesState((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], price: Number(e.target.value) || 0 },
                            }))
                          }
                          className="w-16 px-1.5 py-0.5 rounded-md bg-white border border-slate-300 text-[11px] font-mono text-right text-slate-900"
                        />
                        <span className="text-[10px] text-slate-400">
                          {fin.perSqm && draftItem.priceMode === 'sqm' ? '/m²' : 'c/u'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  value={form.installation_fee}
                  onChange={(e) => setForm({ ...form, installation_fee: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Flete / Despacho (CLP)</label>
                <input
                  type="number"
                  min="0"
                  value={form.freight_fee}
                  onChange={(e) => setForm({ ...form, freight_fee: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Descuento (CLP)</label>
                <input
                  type="number"
                  min="0"
                  value={form.discount_amount}
                  onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-emerald-700"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Plazo Fabricación</label>
                <input
                  type="text"
                  value={form.manufacturing_days}
                  onChange={(e) => setForm({ ...form, manufacturing_days: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Condición de Pago</label>
                <input
                  type="text"
                  value={form.payment_terms}
                  onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="md:col-span-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Ítems ({form.items.length})</span>
                  <span className="font-mono">{formatCLP(totals.itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-semibold pt-2 border-t border-slate-200">
                  <span>Subtotal Neto</span>
                  <span className="font-mono">{formatCLP(totals.netSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Number(form.tax_rate) > 0}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, tax_rate: e.target.checked ? 19 : 0 }))
                      }
                      className="rounded border-slate-300 text-red-600 focus:ring-red-600"
                    />
                    <span>IVA ({form.tax_rate}%)</span>
                  </label>
                  <span className="font-mono">{formatCLP(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-extrabold text-slate-900 pt-3 border-t border-slate-300">
                  <span>TOTAL CLP</span>
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
