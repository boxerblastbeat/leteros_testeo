import React, { useState, useMemo, useEffect } from 'react';
import {
  Wrench,
  Printer,
  Plus,
  CheckCircle2,
  MapPin,
  Calendar,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  Truck,
  Clock,
  Scissors,
  Trash2,
  MessageCircle,
  Link2,
  DollarSign,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { OT_STATUSES, OT_PRIORITIES, COMPANY_INFO } from '../../data/company';
import { formatCLP, formatDateCL, DELIVERY_LABELS, addDaysISO, todayISO, uid } from '../../lib/formatters';
import { useModalClose } from '../../lib/useModalClose';
import { computeOtCubicationAndCuts } from '../../lib/cutOptimizer';
import { erpService } from '../../lib/erpService';

// En Taller solo existen los 5 pasos productivos/despacho (facturación y cobro son exclusivos de Cotizaciones ERP)
const normalizeWorkshopStatus = (status) => {
  if (['entregado', 'despachado', 'pagada'].includes(status)) return 'despachado';
  if (status === 'facturada') return 'terminado';
  return OT_STATUSES.some((s) => s.id === status) ? status : 'pendiente';
};

const buildOtWhatsAppUrl = (ot) => {
  const ref = ot.quote_correlative || ot.ot_number;
  const actionMsg =
    ot.delivery_method === 'retiro'
      ? `ya se encuentra *terminado y listo para retiro* en Taller Letreros Olivar (${COMPANY_INFO.address}).`
      : ot.delivery_method === 'instalacion'
        ? `ya se encuentra *terminado en taller* y listo para coordinar la *instalación en terreno*.`
        : `ya se encuentra *terminado en taller* y listo para coordinar el *despacho / entrega*.`;
  const text = encodeURIComponent(
    `Hola ${ot.client_name || ''}, te escribimos de *${COMPANY_INFO.name}* para avisarte que tu trabajo *${ref}* ${actionMsg}\n\nQuedamos atentos para coordinar.`
  );
  const digits = String(ot.client_phone || '').replace(/\D/g, '');
  if (!digits) return `https://wa.me/?text=${text}`;
  return `https://wa.me/${digits.startsWith('56') ? digits : `56${digits}`}?text=${text}`;
};

const OT_COSTS_LOCAL_KEY = 'olivar_ot_extra_costs_v1';
const OT_PHOTOS_LOCAL_KEY = 'olivar_ot_photos_v1';
const readLocalOtPhotos = () => {
  try {
    return JSON.parse(localStorage.getItem(OT_PHOTOS_LOCAL_KEY) || '{}');
  } catch {
    return {};
  }
};
const COST_CATEGORIES = [
  'Herrería / Estructura',
  'LED / Eléctrico',
  'Flete / Combustible',
  'Instalación / Mano de obra',
  'Planchas / Insumos extra',
  'Otro gasto',
];

const readLocalOtCosts = () => {
  try {
    return JSON.parse(localStorage.getItem(OT_COSTS_LOCAL_KEY) || '{}');
  } catch {
    return {};
  }
};

export default function WorkOrdersPanel({ focusedOtId = null, onClearFocus, onOpenInOptimizer }) {
  const {
    session,
    workOrders,
    quotes,
    calendarEvents,
    saveQuote,
    saveWorkOrder,
    deleteWorkOrder,
    saveCalendarEvent,
    changeQuoteStatus,
    showToast,
  } = useErp();

  const [filter, setFilter] = useState('activas');
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    if (!focusedOtId) return;
    const target = workOrders.find((w) => w.id === focusedOtId);
    if (target) {
      const norm = normalizeWorkshopStatus(target.status);
      if (norm === 'despachado') {
        setFilter('todas');
      } else {
        setFilter('activas');
      }
    }
    setHighlightedId(focusedOtId);
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`ot-card-${focusedOtId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    const clearTimer = setTimeout(() => {
      setHighlightedId(null);
      onClearFocus?.();
    }, 4500);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [focusedOtId, workOrders, onClearFocus]);
  const [printOt, setPrintOt] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [rescheduleOt, setRescheduleOt] = useState(null);
  const [costsOt, setCostsOt] = useState(null);
  const [localCostsMap, setLocalCostsMap] = useState(() => readLocalOtCosts());
  const [costForm, setCostForm] = useState({
    category: COST_CATEGORIES[0],
    description: '',
    amount: '',
    date: todayISO(),
  });
  const costsClose = useModalClose(Boolean(costsOt), () => setCostsOt(null), {
    confirm: false,
  });

  const [photosOt, setPhotosOt] = useState(null);
  const [localPhotosMap, setLocalPhotosMap] = useState(() => readLocalOtPhotos());
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photosClose = useModalClose(Boolean(photosOt), () => setPhotosOt(null), {
    confirm: false,
  });

  const getOtPhotos = (ot) => {
    const linked = findLinkedQuoteForOt(ot);
    const fromQuote = linked?.client_snapshot?.ot_photos;
    if (Array.isArray(fromQuote)) return fromQuote;
    return Array.isArray(localPhotosMap[ot?.id]) ? localPhotosMap[ot.id] : [];
  };

  const handleUploadOtPhoto = async (file) => {
    if (!photosOt || !file) return;
    setUploadingPhoto(true);
    try {
      const { url, storagePath } = await erpService.uploadOtPhoto(photosOt.id, file);
      const entry = {
        id: uid(),
        url,
        storagePath,
        caption: photoCaption.trim() || 'Respaldo de avance / entrega',
        at: new Date().toISOString(),
        by: session?.user?.email || '',
      };
      const nextList = [entry, ...getOtPhotos(photosOt)];
      const linked = findLinkedQuoteForOt(photosOt);
      if (linked) {
        await saveQuote({
          ...linked,
          client_snapshot: {
            ...(linked.client_snapshot || {}),
            ot_photos: nextList,
          },
        });
      } else {
        const updated = { ...localPhotosMap, [photosOt.id]: nextList };
        setLocalPhotosMap(updated);
        try {
          localStorage.setItem(OT_PHOTOS_LOCAL_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      setPhotoCaption('');
      showToast('Foto de respaldo guardada correctamente');
    } catch (err) {
      showToast(err?.message || 'Error al subir foto', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteOtPhoto = async (ot, photo) => {
    if (!window.confirm('¿Eliminar esta foto de respaldo?')) return;
    if (photo.storagePath) {
      await erpService.deleteOtPhotoStorage(photo.storagePath);
    }
    const nextList = getOtPhotos(ot).filter((p) => p.id !== photo.id);
    const linked = findLinkedQuoteForOt(ot);
    if (linked) {
      await saveQuote({
        ...linked,
        client_snapshot: {
          ...(linked.client_snapshot || {}),
          ot_photos: nextList,
        },
      });
    } else {
      const updated = { ...localPhotosMap, [ot.id]: nextList };
      setLocalPhotosMap(updated);
      try {
        localStorage.setItem(OT_PHOTOS_LOCAL_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    showToast('Foto eliminada');
  };

  const findLinkedQuoteForOt = (ot) =>
    (ot?.quote_id && quotes.find((q) => q.id === ot.quote_id)) ||
    (ot?.quote_correlative && quotes.find((q) => q.correlative === ot.quote_correlative)) ||
    null;

  const getOtExtraCosts = (ot) => {
    const linked = findLinkedQuoteForOt(ot);
    const fromQuote = linked?.client_snapshot?.ot_costs;
    if (Array.isArray(fromQuote)) return fromQuote;
    return Array.isArray(localCostsMap[ot?.id]) ? localCostsMap[ot.id] : [];
  };

  const handleSaveOtExtraCost = async (e) => {
    e.preventDefault();
    if (!costsOt) return;
    const amt = Math.round(Number(costForm.amount) || 0);
    if (amt <= 0) return;

    const entry = {
      id: uid(),
      category: costForm.category,
      description: costForm.description.trim() || costForm.category,
      amount: amt,
      date: costForm.date || todayISO(),
      by: session?.user?.email || '',
    };
    const nextList = [...getOtExtraCosts(costsOt), entry];
    const linked = findLinkedQuoteForOt(costsOt);
    if (linked) {
      await saveQuote({
        ...linked,
        client_snapshot: {
          ...(linked.client_snapshot || {}),
          ot_costs: nextList,
        },
      });
    } else {
      const updated = { ...localCostsMap, [costsOt.id]: nextList };
      setLocalCostsMap(updated);
      try {
        localStorage.setItem(OT_COSTS_LOCAL_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage quota
      }
    }
    setCostForm({
      category: COST_CATEGORIES[0],
      description: '',
      amount: '',
      date: todayISO(),
    });
    showToast(`Gasto de ${formatCLP(amt)} registrado en ${costsOt.ot_number}`);
  };

  const handleRemoveOtExtraCost = async (ot, costId) => {
    const nextList = getOtExtraCosts(ot).filter((c) => c.id !== costId);
    const linked = findLinkedQuoteForOt(ot);
    if (linked) {
      await saveQuote({
        ...linked,
        client_snapshot: {
          ...(linked.client_snapshot || {}),
          ot_costs: nextList,
        },
      });
    } else {
      const updated = { ...localCostsMap, [ot.id]: nextList };
      setLocalCostsMap(updated);
      try {
        localStorage.setItem(OT_COSTS_LOCAL_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    showToast('Gasto eliminado');
  };

  const handleCopyTrackingLink = (ot) => {
    const url = `${window.location.origin}/seguimiento/${encodeURIComponent(ot.ot_number)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      showToast(`Link de seguimiento copiado: /seguimiento/${ot.ot_number}`);
    } else {
      window.prompt('Copia el link de seguimiento para tu cliente:', url);
    }
  };
  const [rescheduleForm, setRescheduleForm] = useState({
    deadline: '',
    delivery_method: 'retiro',
    delivery_address: '',
    priority: 'normal',
    reason: '',
    notes: '',
  });

  const rescheduleClose = useModalClose(Boolean(rescheduleOt), () => setRescheduleOt(null), {
    confirm: true,
    message: '¿Cerrar reprogramación de OT? Los cambios no guardados se perderán.',
  });
  const newOtClose = useModalClose(showNewModal, () => setShowNewModal(false), {
    confirm: true,
    message: '¿Cerrar formulario de Nueva OT? Los datos ingresados se perderán.',
  });
  const printOtClose = useModalClose(Boolean(printOt), () => setPrintOt(null), {
    confirm: false,
  });
  const [newOt, setNewOt] = useState({
    client_name: '',
    client_phone: '',
    itemName: '',
    width: '1.20',
    height: '0.80',
    quantity: 1,
    delivery_method: 'instalacion',
    delivery_address: '',
    deadline: addDaysISO(4),
    priority: 'normal',
    notes: '',
  });

  const filterCounts = useMemo(() => {
    const counts = {
      activas: 0,
      todas: workOrders.length,
    };
    OT_STATUSES.forEach((s) => {
      counts[s.id] = 0;
    });
    workOrders.forEach((ot) => {
      const norm = normalizeWorkshopStatus(ot.status);
      if (norm !== 'despachado') counts.activas += 1;
      if (counts[norm] !== undefined) counts[norm] += 1;
    });
    return counts;
  }, [workOrders]);

  const filtered = useMemo(() => {
    const list = workOrders.filter((ot) => {
      const norm = normalizeWorkshopStatus(ot.status);
      if (filter === 'activas') return norm !== 'despachado';
      if (filter === 'todas') return true;
      return norm === filter;
    });

    // Ordenar: Urgente -> Alta -> Normal, luego por fecha de entrega más próxima
    const rankOf = (prio) => OT_PRIORITIES.find((p) => p.id === prio)?.rank ?? 3;
    return [...list].sort((a, b) => {
      const diff = rankOf(a.priority) - rankOf(b.priority);
      if (diff !== 0) return diff;
      const da = a.deadline || '9999-12-31';
      const db = b.deadline || '9999-12-31';
      return da.localeCompare(db);
    });
  }, [workOrders, filter]);

  // Memoizar cubicación 2D por OT para evitar recalcular en cada render/tecla en modales
  const cubicationByOtId = useMemo(() => {
    const map = new Map();
    filtered.forEach((ot) => {
      map.set(ot.id, computeOtCubicationAndCuts(ot.items));
    });
    return map;
  }, [filtered]);

  const syncLinkedQuoteFromWorkshop = async (ot, targetStatus, direction) => {
    const linked =
      (ot.quote_id && quotes.find((q) => q.id === ot.quote_id)) ||
      (ot.quote_correlative && quotes.find((q) => q.correlative === ot.quote_correlative));
    if (!linked) return;

    // Nunca sobreescribir un estado financiero ya cerrado en Cotizaciones ERP
    if (['pagada', 'rechazada'].includes(linked.status)) return;

    const meta = OT_STATUSES.find((s) => s.id === targetStatus);
    if (targetStatus === 'despachado' && linked.status !== 'despacho') {
      await changeQuoteStatus(
        linked,
        'despacho',
        {},
        `Despachado desde Taller (${ot.ot_number} · ${DELIVERY_LABELS[ot.delivery_method] || 'Entrega'})`
      );
    } else if (
      targetStatus !== 'despachado' &&
      direction === 'retroceso' &&
      linked.status === 'despacho'
    ) {
      await changeQuoteStatus(
        linked,
        'en_taller',
        {},
        `OT ${ot.ot_number} devuelta a ${meta?.label || targetStatus}`
      );
    }
  };

  const applyOtStatus = async (ot, targetStatus, direction = 'avance') => {
    const meta = OT_STATUSES.find((s) => s.id === targetStatus);
    await saveWorkOrder({ ...ot, status: targetStatus });
    await syncLinkedQuoteFromWorkshop(ot, targetStatus, direction);
    showToast(
      `${ot.ot_number} ${direction === 'retroceso' ? 'devuelta' : 'actualizada'} a ${meta?.label || targetStatus}`
    );
  };

  const advanceStatus = async (ot) => {
    const order = OT_STATUSES.map((s) => s.id);
    const current = normalizeWorkshopStatus(ot.status);
    const idx = order.indexOf(current);
    if (idx === -1 || idx >= order.length - 1) return;
    await applyOtStatus(ot, order[idx + 1], 'avance');
  };

  const revertStatus = async (ot) => {
    const order = OT_STATUSES.map((s) => s.id);
    const current = normalizeWorkshopStatus(ot.status);
    const idx = order.indexOf(current);
    if (idx <= 0) return;
    await applyOtStatus(ot, order[idx - 1], 'retroceso');
  };

  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleOt) return;

    const prevDeadline = rescheduleOt.deadline || '';
    const nextDeadline = rescheduleForm.deadline || '';
    const prevHistory = Array.isArray(rescheduleOt.deadline_history)
      ? rescheduleOt.deadline_history
      : [];
    const nextHistory =
      prevDeadline !== nextDeadline
        ? [
            ...prevHistory,
            {
              from: prevDeadline || 'Sin fecha',
              to: nextDeadline,
              reason: rescheduleForm.reason.trim(),
              by: session?.user?.email || '',
              at: new Date().toISOString(),
            },
          ]
        : prevHistory;

    // Modifica la MISMA OT (sin crear duplicados)
    await saveWorkOrder({
      ...rescheduleOt,
      deadline: nextDeadline,
      deadline_history: nextHistory,
      delivery_method: rescheduleForm.delivery_method,
      delivery_address: rescheduleForm.delivery_address.trim(),
      priority: rescheduleForm.priority,
      notes: rescheduleForm.notes.trim(),
    });

    // Actualiza el evento vinculado en Agenda si existe (sin duplicar)
    if (nextDeadline) {
      const linkedEv = calendarEvents.find(
        (ev) =>
          (rescheduleOt.ot_number && ev.ot_number === rescheduleOt.ot_number) ||
          (rescheduleOt.quote_correlative &&
            ev.quote_correlative === rescheduleOt.quote_correlative)
      );
      if (linkedEv) {
        await saveCalendarEvent({
          ...linkedEv,
          event_date: nextDeadline,
          address: rescheduleForm.delivery_address.trim() || linkedEv.address,
          notes: rescheduleForm.notes.trim() || linkedEv.notes,
        });
      }
    }

    showToast(
      `Entrega y plazo de ${rescheduleOt.ot_number} actualizados (${formatDateCL(nextDeadline)})`
    );
    setRescheduleOt(null);
  };

  const handleCreateManualOt = async (e) => {
    e.preventDefault();
    const created = await saveWorkOrder({
      client_name: newOt.client_name.trim(),
      client_phone: newOt.client_phone.trim(),
      items: [
        {
          id: uid(),
          name: newOt.itemName.trim(),
          width: parseFloat(newOt.width) || '',
          height: parseFloat(newOt.height) || '',
          quantity: Math.max(1, parseInt(newOt.quantity, 10) || 1),
        },
      ],
      delivery_method: newOt.delivery_method,
      delivery_address: newOt.delivery_address.trim(),
      deadline: newOt.deadline,
      priority: newOt.priority,
      status: 'pendiente',
      notes: newOt.notes.trim(),
    });
    setShowNewModal(false);
    setNewOt({
      client_name: '',
      client_phone: '',
      itemName: '',
      width: '1.20',
      height: '0.80',
      quantity: 1,
      delivery_method: 'instalacion',
      delivery_address: '',
      deadline: addDaysISO(4),
      priority: 'normal',
      notes: '',
    });
    showToast(`Orden de Trabajo ${created.ot_number} creada`);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-red-600 shrink-0" />
            <span>Taller &amp; Órdenes de Producción (OT)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Solo ejecución productiva y despacho físico (5 etapas). Facturación y cobros se
            gestionan exclusivamente en Cotizaciones ERP.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva OT Manual
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none">
        {[
          { id: 'activas', label: 'Activas en Taller' },
          ...OT_STATUSES,
          { id: 'todas', label: 'Todas' },
        ].map((tab) => {
          const count = filterCounts[tab.id] || 0;
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                active
                  ? 'bg-red-600 border-red-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 rounded-full text-[10px] font-bold leading-4 ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm shadow-xs">
          No hay Órdenes de Trabajo en esta etapa.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filtered.map((ot) => {
            const normStatus = normalizeWorkshopStatus(ot.status);
            const idx = OT_STATUSES.findIndex((s) => s.id === normStatus);
            const currentIdx = idx >= 0 ? idx : 0;
            const meta = OT_STATUSES[currentIdx];
            const prevMeta = currentIdx > 0 ? OT_STATUSES[currentIdx - 1] : null;
            const nextMeta =
              currentIdx < OT_STATUSES.length - 1 ? OT_STATUSES[currentIdx + 1] : null;
            const isFinished = normStatus === 'despachado';
            const prioMeta =
              OT_PRIORITIES.find((p) => p.id === ot.priority) || OT_PRIORITIES[0];

            return (
              <div
                key={ot.id}
                id={`ot-card-${ot.id}`}
                className={`p-4 sm:p-5 rounded-2xl bg-white border shadow-xs flex flex-col justify-between gap-4 transition-all ${
                  highlightedId === ot.id
                    ? 'border-red-500 ring-4 ring-red-200 bg-red-50/20'
                    : 'border-slate-200'
                } ${isFinished ? 'border-l-4 border-l-orange-500' : prioMeta.cardBorder}`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {ot.ot_number}
                      </span>
                      {ot.quote_correlative && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {ot.quote_correlative}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${prioMeta.badge}`}
                      >
                        {ot.priority === 'urgente' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${prioMeta.dot}`} />
                        )}
                        Prioridad {prioMeta.label}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {/* Barra visual de avance de Taller (5 pasos) */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-5 gap-1.5">
                      {OT_STATUSES.map((step, sIdx) => (
                        <div
                          key={step.id}
                          title={`Paso ${sIdx + 1}: ${step.label}`}
                          className={`h-1.5 rounded-full transition ${
                            sIdx <= currentIdx
                              ? isFinished
                                ? 'bg-orange-500'
                                : 'bg-violet-600'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>
                        Etapa {currentIdx + 1} de {OT_STATUSES.length}
                      </span>
                      <span>{meta.label}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base break-words">
                      {ot.client_name}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        Plazo:{' '}
                        <strong className="text-slate-800">{formatDateCL(ot.deadline)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{DELIVERY_LABELS[ot.delivery_method] || ot.delivery_method}</span>
                      </span>
                    </div>
                    {ot.delivery_address && (
                      <div className="text-xs text-slate-600 mt-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 break-words">
                        <span className="font-semibold text-slate-500">Dirección:</span>{' '}
                        {ot.delivery_address}
                      </div>
                    )}
                    {Array.isArray(ot.deadline_history) && ot.deadline_history.length > 0 && (
                      <div className="mt-1.5 text-[11px] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-amber-900 space-y-0.5">
                        <div className="font-bold text-amber-800 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            Modificaciones de fecha ({ot.deadline_history.length}):
                          </span>
                        </div>
                        {ot.deadline_history.slice(-2).map((h, hIdx) => (
                          <div key={hIdx} className="text-[11px] text-amber-900/90 break-words">
                            • {h.from === 'Sin fecha' ? 'Sin fecha' : formatDateCL(h.from)} →{' '}
                            <strong>{formatDateCL(h.to)}</strong>
                            {h.reason ? ` (${h.reason})` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    {(ot.items || []).map((item, i) => (
                      <div key={item.id || i} className="text-xs space-y-0.5">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-800 font-semibold break-words">
                            {item.quantity}× {item.name}
                          </span>
                          {item.width && item.height && (
                            <span className="font-mono text-slate-500 shrink-0">
                              {item.width}m × {item.height}m
                            </span>
                          )}
                        </div>
                        {item.detail && (
                          <div className="text-[11px] text-slate-500 italic break-words leading-snug">
                            {item.detail}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {ot.notes && (
                    <p className="text-xs text-slate-500 italic break-words">“{ot.notes}”</p>
                  )}

                  {/* Glosa automática de cortes optimizados */}
                  {(() => {
                    const cub = cubicationByOtId.get(ot.id);
                    if (!cub?.hasOptimization) return null;
                    return (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                            <Scissors className="w-3.5 h-3.5 text-red-600" />
                            Glosa de Cortes Optimizados ({cub.totalAreaSqm.toFixed(2)} m²)
                          </span>
                          {onOpenInOptimizer && cub.rigidResults.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const first = cub.rigidResults[0];
                                onOpenInOptimizer({
                                  sheetW: first.sheetW,
                                  sheetH: first.sheetH,
                                  parts: first.parts,
                                });
                              }}
                              className="text-[10px] font-bold text-red-600 hover:text-red-700 underline underline-offset-2"
                            >
                              Ver en Cortes 2D
                            </button>
                          )}
                        </div>
                        {cub.rigidResults.map((r, rIdx) => (
                          <div key={rIdx} className="text-slate-700 leading-snug">
                            • <strong>{r.sheetCount} {r.sheetCount === 1 ? 'plancha' : 'planchas'}</strong>{' '}
                            de <span className="font-semibold">{r.label}</span> ({r.sheetW}×{r.sheetH} mm) ·{' '}
                            <span className="text-emerald-700 font-semibold">{r.efficiency.toFixed(1)}% aprov.</span>
                            {r.patterns.length > 0 && (
                              <div className="text-[10px] text-slate-500 pl-3 mt-0.5">
                                {r.patterns.map((pat, pIdx) => (
                                  <div key={pIdx}>
                                    {pat.sheetIds.length > 1
                                      ? `Planchas #${pat.sheetIds[0]}–#${pat.sheetIds[pat.sheetIds.length - 1]} (×${pat.sheetIds.length}): `
                                      : `Plancha #${pat.sheetIds[0]}: `}
                                    {pat.summaryItems
                                      .map((si) => `${si.qty}× (${si.dims} mm)`)
                                      .join(', ')}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {cub.rollResults.map((roll, rollIdx) => (
                          <div key={rollIdx} className="text-slate-700 leading-snug">
                            • <strong>{roll.linearMeters.toFixed(2)} ml</strong> de{' '}
                            <span className="font-semibold">{roll.label}</span> (rollo {roll.rollWidthM}m ·{' '}
                            {roll.areaSqm.toFixed(2)} m²)
                            <span className="text-slate-500">
                              {' '}
                              — {roll.cuts.map((c) => `${c.qty}× ${c.wM}×${c.hM}m (${c.orientNote})`).join('; ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Barra de herramientas y control de flujo en 2 niveles limpios */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setPrintOt(ot)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Ficha</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyTrackingLink(ot)}
                      title="Copiar link público de seguimiento para el cliente"
                      className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Tracking</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCostsOt(ot)}
                      title="Registrar gastos reales de taller (herrería, LED, flete, instalación)"
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>
                        Gastos
                        {getOtExtraCosts(ot).length > 0
                          ? ` (${formatCLP(getOtExtraCosts(ot).reduce((s, c) => s + (Number(c.amount) || 0), 0))})`
                          : ''}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhotosOt(ot)}
                      title="Adjuntar o ver fotos de avance y entrega en obra"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>
                        Fotos{getOtPhotos(ot).length > 0 ? ` (${getOtPhotos(ot).length})` : ''}
                      </span>
                    </button>

                    {!isFinished && (
                      <button
                        onClick={() => {
                          setRescheduleForm({
                            deadline: ot.deadline || addDaysISO(3),
                            delivery_method: ot.delivery_method || 'retiro',
                            delivery_address: ot.delivery_address || '',
                            priority: ot.priority || 'normal',
                            reason: '',
                            notes: ot.notes || '',
                          });
                          setRescheduleOt(ot);
                        }}
                        title="Modificar fecha, dirección o detalles de entrega manteniendo la misma OT"
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Plazo</span>
                      </button>
                    )}

                    {['terminado', 'despachado'].includes(normStatus) && (
                      <a
                        href={buildOtWhatsAppUrl(ot)}
                        target="_blank"
                        rel="noreferrer"
                        title="Avisar al cliente por WhatsApp que su trabajo está listo"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {prevMeta && (
                        <button
                          onClick={() => revertStatus(ot)}
                          title={`Devolver a ${prevMeta.label}`}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Devolver</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar definitivamente la orden ${ot.ot_number}?`)) {
                            deleteWorkOrder(ot.id);
                          }
                        }}
                        title="Eliminar OT"
                        aria-label={`Eliminar ${ot.ot_number}`}
                        className="p-2 sm:p-1.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {nextMeta ? (
                      <button
                        onClick={() => advanceStatus(ot)}
                        className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition ${
                          nextMeta.id === 'despachado'
                            ? 'bg-orange-600 hover:bg-orange-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {nextMeta.id === 'despachado' && <Truck className="w-3.5 h-3.5" />}
                        <span>
                          {nextMeta.id === 'despachado'
                            ? `Despachar (${DELIVERY_LABELS[ot.delivery_method] || 'Entrega'})`
                            : `Avanzar a ${nextMeta.label}`}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-xs text-orange-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Despachado / Entregado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL APLAZAR / REPROGRAMAR MISMA OT */}
      {rescheduleOt && (
        <div
          onClick={rescheduleClose.handleBackdropClick}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <form
            onSubmit={handleConfirmReschedule}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>Reprogramar {rescheduleOt.ot_number}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rescheduleOt.client_name} · Se mantiene la misma OT sin duplicar.
                </p>
              </div>
              <button
                type="button"
                onClick={rescheduleClose.handleClose}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fecha de Entrega / Plazo
                  </label>
                  <input
                    type="date"
                    required
                    value={rescheduleForm.deadline}
                    onChange={(e) =>
                      setRescheduleForm({ ...rescheduleForm, deadline: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Prioridad Taller
                  </label>
                  <select
                    value={rescheduleForm.priority}
                    onChange={(e) =>
                      setRescheduleForm({ ...rescheduleForm, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Modalidad de Entrega
                </label>
                <select
                  value={rescheduleForm.delivery_method}
                  onChange={(e) =>
                    setRescheduleForm({ ...rescheduleForm, delivery_method: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                >
                  <option value="retiro">Retiro en Taller (Olivar)</option>
                  <option value="despacho">Despacho a Domicilio / Obra</option>
                  <option value="instalacion">Instalación en Terreno / Obra</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Dirección de Entrega / Instalación
                </label>
                <input
                  type="text"
                  value={rescheduleForm.delivery_address}
                  onChange={(e) =>
                    setRescheduleForm({ ...rescheduleForm, delivery_address: e.target.value })
                  }
                  placeholder="Ej: Ruta H-40 Km 4, Olivar / Faena / Dirección..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>

              {rescheduleForm.deadline !== (rescheduleOt.deadline || '') && (
                <div>
                  <label className="block text-xs font-semibold text-amber-800 mb-1">
                    Motivo del cambio de fecha (se guarda en historial)
                  </label>
                  <input
                    type="text"
                    value={rescheduleForm.reason}
                    onChange={(e) =>
                      setRescheduleForm({ ...rescheduleForm, reason: e.target.value })
                    }
                    placeholder="Ej: Cliente pidió mover entrega por lluvia / obra..."
                    className="w-full px-3 py-2 rounded-xl bg-amber-50/50 border border-amber-300 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Detalles de entrega / Notas técnicas de taller
                </label>
                <textarea
                  rows={2}
                  value={rescheduleForm.notes}
                  onChange={(e) =>
                    setRescheduleForm({ ...rescheduleForm, notes: e.target.value })
                  }
                  placeholder="Horario de acceso, persona que recibe, instrucciones de instalación..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={rescheduleClose.handleClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Guardar Nuevo Plazo
              </button>
            </div>
          </form>
        </div>
      )}

      {showNewModal && (
        <div
          onClick={newOtClose.handleBackdropClick}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <form
            onSubmit={handleCreateManualOt}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-slate-900 text-lg">
                Nueva Orden de Trabajo
              </h3>
              <button
                type="button"
                onClick={newOtClose.handleClose}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Cliente *"
                value={newOt.client_name}
                onChange={(e) => setNewOt({ ...newOt, client_name: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <input
                type="text"
                required
                placeholder="Trabajo / Material *"
                value={newOt.itemName}
                onChange={(e) => setNewOt({ ...newOt, itemName: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Ancho (m)"
                value={newOt.width}
                onChange={(e) => setNewOt({ ...newOt, width: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Alto (m)"
                value={newOt.height}
                onChange={(e) => setNewOt({ ...newOt, height: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <select
                value={newOt.delivery_method}
                onChange={(e) => setNewOt({ ...newOt, delivery_method: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              >
                <option value="retiro">Retiro en Taller</option>
                <option value="despacho">Despacho a Domicilio / Obra</option>
                <option value="instalacion">Instalación en Terreno</option>
              </select>
              <input
                type="text"
                placeholder="Dirección de entrega / obra (opcional)"
                value={newOt.delivery_address}
                onChange={(e) => setNewOt({ ...newOt, delivery_address: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <input
                type="date"
                value={newOt.deadline}
                onChange={(e) => setNewOt({ ...newOt, deadline: e.target.value })}
                className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              />
              <select
                value={newOt.priority}
                onChange={(e) => setNewOt({ ...newOt, priority: e.target.value })}
                className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
              >
                <option value="normal">Prioridad Normal</option>
                <option value="alta">Prioridad Alta</option>
                <option value="urgente">Prioridad Urgente</option>
              </select>
              <textarea
                rows={2}
                placeholder="Notas técnicas de taller..."
                value={newOt.notes}
                onChange={(e) => setNewOt({ ...newOt, notes: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={newOtClose.handleClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Crear OT
              </button>
            </div>
          </form>
        </div>
      )}

      {printOt && (
        <div
          onClick={printOtClose.handleBackdropClick}
          className="print-modal-overlay fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-2.5 sm:p-4"
        >
          <div className="print-modal-container max-w-3xl mx-auto">
            <div className="no-print flex flex-wrap justify-between items-center gap-2 mb-3 sm:mb-4 bg-white border border-slate-200 rounded-2xl p-3 shadow-lg">
              <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                Ficha de Producción · {printOt.ot_number}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Ficha
                </button>
                <button
                  onClick={printOtClose.handleClose}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="print-sheet bg-white text-zinc-900 rounded-2xl p-4 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start gap-3 border-b-2 border-zinc-900 pb-4">
                <div>
                  <h2 className="font-heading text-lg sm:text-xl font-bold">{COMPANY_INFO.name}</h2>
                  <p className="text-xs text-zinc-600">ORDEN DE TRABAJO INTERNA — TALLER</p>
                </div>
                <div className="text-left sm:text-right print:text-right">
                  <div className="font-mono text-xl sm:text-2xl font-extrabold text-red-600">
                    {printOt.ot_number}
                  </div>
                  {printOt.quote_correlative && (
                    <div className="text-xs font-mono text-zinc-600">
                      Ref: {printOt.quote_correlative}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 text-xs bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <div>
                  <span className="text-zinc-500 block">Cliente:</span>
                  <strong className="text-sm break-words">{printOt.client_name}</strong>
                  {printOt.client_phone && <div className="mt-0.5">{printOt.client_phone}</div>}
                </div>
                <div>
                  <span className="text-zinc-500 block">Entrega / Instalación:</span>
                  <strong>{formatDateCL(printOt.deadline)}</strong>
                  <div>{DELIVERY_LABELS[printOt.delivery_method] || printOt.delivery_method}</div>
                  {printOt.delivery_address && (
                    <div className="break-words font-medium text-zinc-800 mt-0.5">
                      Dirección: {printOt.delivery_address}
                    </div>
                  )}
                </div>
              </div>

              {Array.isArray(printOt.deadline_history) && printOt.deadline_history.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                  <strong className="block uppercase text-[10px] text-amber-800">
                    Historial de Modificaciones de Fecha:
                  </strong>
                  {printOt.deadline_history.map((h, idx) => (
                    <div key={idx} className="text-amber-900">
                      • {h.from === 'Sin fecha' ? 'Sin fecha' : formatDateCL(h.from)} →{' '}
                      <strong>{formatDateCL(h.to)}</strong>
                      {h.reason ? ` — ${h.reason}` : ''}
                    </div>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[460px] sm:min-w-0 text-xs border border-zinc-300">
                  <thead className="bg-zinc-900 text-white">
                    <tr>
                      <th className="p-2.5 text-left">Material / Trabajo</th>
                      <th className="p-2.5 text-center">Medidas</th>
                      <th className="p-2.5 text-center">Cantidad</th>
                      <th className="p-2.5 text-center">Check Taller</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(printOt.items || []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="p-3">
                          <div className="font-bold">{item.name}</div>
                          {item.detail && <div className="text-zinc-600">{item.detail}</div>}
                        </td>
                        <td className="p-3 text-center font-mono whitespace-nowrap">
                          {item.width && item.height ? `${item.width}m × ${item.height}m` : 'Estándar'}
                        </td>
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-center">☐</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CUBICACIÓN Y GLOSA DE CORTES OPTIMIZADOS EN FICHA IMPRIMIBLE */}
              {(() => {
                const cub = computeOtCubicationAndCuts(printOt.items);
                if (!cub.hasOptimization) return null;
                return (
                  <div className="space-y-3 border border-zinc-300 rounded-xl p-4 bg-zinc-50 print-avoid-break">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                      <strong className="text-xs uppercase tracking-wider text-zinc-900">
                        Cubicación y Glosa de Cortes Optimizados (Sangría 3 mm)
                      </strong>
                      <span className="text-[11px] font-mono text-zinc-600">
                        {cub.totalPieces} piezas · {cub.totalAreaSqm.toFixed(2)} m² totales
                      </span>
                    </div>

                    {cub.rigidResults.map((r, rIdx) => (
                      <div key={rIdx} className="space-y-2.5 bg-white border border-zinc-200 rounded-lg p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <strong className="text-zinc-900">
                            {r.label} — Formato {r.sheetW} × {r.sheetH} mm
                          </strong>
                          <span className="font-mono text-zinc-700">
                            Retirar bodega: <strong>{r.sheetCount} {r.sheetCount === 1 ? 'plancha' : 'planchas'}</strong> ·
                            Aprovechamiento: <strong className="text-emerald-700">{r.efficiency.toFixed(1)}%</strong>
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px] text-zinc-700">
                          {r.patterns.map((pat, pIdx) => (
                            <div key={pIdx} className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-zinc-100 last:border-0">
                              <span>
                                <strong>
                                  {pat.sheetIds.length > 1
                                    ? `Planchas #${pat.sheetIds[0]} a #${pat.sheetIds[pat.sheetIds.length - 1]} (×${pat.sheetIds.length} idénticas)`
                                    : `Plancha #${pat.sheetIds[0]}`}
                                  :
                                </strong>{' '}
                                {pat.summaryItems
                                  .map((si) => `${si.qty} cortes de ${si.dims} mm (${si.label})`)
                                  .join(' + ')}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-500">
                                {pat.efficiency.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 pt-1">
                          {r.patterns.slice(0, 4).map((pat, pIdx) => (
                            <div key={pIdx} className="border border-zinc-200 rounded-lg p-2 bg-zinc-50">
                              <div className="text-[10px] font-mono text-zinc-600 mb-1 flex justify-between">
                                <span>
                                  {pat.sheetIds.length > 1
                                    ? `Patrón ×${pat.sheetIds.length} planchas`
                                    : `Plancha #${pat.sheetIds[0]}`}
                                </span>
                                <span>{pat.efficiency.toFixed(1)}%</span>
                              </div>
                              <svg
                                viewBox={`0 0 ${r.sheetW} ${r.sheetH}`}
                                className="w-full h-auto max-h-28"
                                preserveAspectRatio="xMidYMid meet"
                              >
                                <rect
                                  x={0}
                                  y={0}
                                  width={r.sheetW}
                                  height={r.sheetH}
                                  fill="#ffffff"
                                  stroke="#52525b"
                                  strokeWidth={Math.max(8, r.sheetW * 0.004)}
                                />
                                {pat.sampleSheet.placed.map((p) => (
                                  <rect
                                    key={p.uid}
                                    x={p.x}
                                    y={p.y}
                                    width={p.w}
                                    height={p.h}
                                    fill={p.color}
                                    fillOpacity={0.8}
                                    stroke="#ffffff"
                                    strokeWidth={Math.max(6, r.sheetW * 0.003)}
                                  />
                                ))}
                              </svg>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {cub.rollResults.map((roll, idx) => (
                      <div key={idx} className="bg-white border border-zinc-200 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex flex-wrap justify-between gap-2">
                          <strong className="text-zinc-900">
                            Rollo Flexible: {roll.label} (Ancho {roll.rollWidthM}m)
                          </strong>
                          <span className="font-mono text-zinc-700">
                            Consumo estimado: <strong>{roll.linearMeters.toFixed(2)} metros lineales</strong> ({roll.areaSqm.toFixed(2)} m²)
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-600">
                          {roll.cuts.map((c, cIdx) => (
                            <div key={cIdx}>
                              • {c.qty}× piezas de {c.wM}m × {c.hM}m — {c.orientNote} ({c.linearMeters.toFixed(2)} ml)
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {printOt.notes && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <strong className="block uppercase text-[10px] text-amber-800">
                    Instrucciones de Taller:
                  </strong>
                  {printOt.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL COSTEO REAL / GASTOS EXTRA DE OT */}
      {costsOt && (() => {
        const list = getOtExtraCosts(costsOt);
        const totalExtra = list.reduce((s, c) => s + (Number(c.amount) || 0), 0);
        return (
          <div
            onClick={costsClose.handleBackdropClick}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          >
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-heading font-bold text-slate-900 text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-rose-600" />
                    <span>Gastos Reales · {costsOt.ot_number}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {costsOt.client_name} · Se descuentan en el Margen del Dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={costsClose.handleClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-800">Total gastos extra registrados:</span>
                <strong className="font-mono text-base text-rose-700">{formatCLP(totalExtra)}</strong>
              </div>

              {list.length > 0 && (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {list.map((c) => (
                    <div key={c.id} className="px-3 py-2.5 flex items-center justify-between gap-2 bg-white">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{c.description}</div>
                        <div className="text-[10px] text-slate-500">
                          {c.category} · {formatDateCL(c.date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-rose-700">{formatCLP(c.amount)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOtExtraCost(costsOt, c.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Quitar gasto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSaveOtExtraCost} className="space-y-3 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Categoría</label>
                    <select
                      value={costForm.category}
                      onChange={(e) => setCostForm({ ...costForm, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                    >
                      {COST_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Monto (CLP) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={costForm.amount}
                      onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
                      placeholder="Ej: 35000"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={costForm.description}
                    onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
                    placeholder="Detalle (ej: 4 barras perfil 20×20 + LED)"
                    className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                  />
                  <input
                    type="date"
                    value={costForm.date}
                    onChange={(e) => setCostForm({ ...costForm, date: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={costsClose.handleClose}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  >
                    + Agregar Gasto
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL FOTOS DE AVANCE / ENTREGA EN OBRA */}
      {photosOt && (() => {
        const photos = getOtPhotos(photosOt);
        return (
          <div
            onClick={photosClose.handleBackdropClick}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          >
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-heading font-bold text-slate-900 text-lg flex items-center gap-2">
                    <Camera className="w-5 h-5 text-red-600" />
                    <span>Fotos de Avance y Entrega · {photosOt.ot_number}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {photosOt.client_name} · Comprimidas automáticamente para subida rápida desde terreno.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={photosClose.handleClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Descripción breve (ej: Letrero instalado en fachada, Entrega conforme...)"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                />
                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition">
                  <Camera className="w-4 h-4" />
                  <span>{uploadingPhoto ? 'Subiendo foto...' : 'Tomar / Subir Foto de Respaldo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={uploadingPhoto}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadOtPhoto(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {photos.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Aún no hay fotos adjuntas para esta OT.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {photos.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col"
                    >
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-video bg-slate-900 overflow-hidden"
                      >
                        <img
                          src={p.url}
                          alt={p.caption}
                          loading="lazy"
                          className="w-full h-full object-cover hover:scale-105 transition"
                        />
                      </a>
                      <div className="p-2.5 flex items-center justify-between gap-2 text-xs bg-white">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">{p.caption}</div>
                          <div className="text-[10px] text-slate-400">
                            {formatDateCL(p.at)}
                            {p.by ? ` · ${p.by}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                            title="Abrir tamaño completo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteOtPhoto(photosOt, p)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600"
                            title="Eliminar foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
