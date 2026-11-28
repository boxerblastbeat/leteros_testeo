import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { erpService } from '../lib/erpService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_WORKSHOP_MATERIALS, DEFAULT_WORKSHOP_CONSUMABLES } from '../data/products';
import { uid, getQuotePayments } from '../lib/formatters';

const applyRealtimeRow = (setter, payload, { maxItems = 400, sortFn = null } = {}) => {
  const { eventType, new: nextRow, old: prevRow } = payload || {};
  setter((prev) => {
    let next = prev;
    if (eventType === 'INSERT' && nextRow) {
      const exists = prev.some((item) => item.id === nextRow.id);
      next = exists
        ? prev.map((item) => (item.id === nextRow.id ? nextRow : item))
        : [nextRow, ...prev];
    } else if (eventType === 'UPDATE' && nextRow) {
      const exists = prev.some((item) => item.id === nextRow.id);
      next = exists
        ? prev.map((item) => (item.id === nextRow.id ? nextRow : item))
        : [nextRow, ...prev];
    } else if (eventType === 'DELETE' && prevRow?.id) {
      next = prev.filter((item) => item.id !== prevRow.id);
    }
    if (sortFn) next = [...next].sort(sortFn);
    return maxItems ? next.slice(0, maxItems) : next;
  });
};
import { formatCLP } from '../lib/formatters';

const ErpContext = createContext(null);
const ToastContext = createContext(null);

const ERP_CACHE_KEY = 'olivar_erp_cache_v1';

const readErpCache = () => {
  try {
    const raw = sessionStorage.getItem(ERP_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeErpCache = (data) => {
  try {
    sessionStorage.setItem(ERP_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignorar si supera cuota de sessionStorage
  }
};

export function ErpProvider({ children }) {
  const initialCache = useRef(readErpCache());
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erpSyncing, setErpSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  const [materials, setMaterials] = useState(
    () => initialCache.current?.materials || DEFAULT_WORKSHOP_MATERIALS
  );
  const [consumables, setConsumables] = useState(
    () => initialCache.current?.consumables || DEFAULT_WORKSHOP_CONSUMABLES
  );
  const [clients, setClients] = useState(() => initialCache.current?.clients || []);
  const [quoteRequests, setQuoteRequests] = useState(() => initialCache.current?.quoteRequests || []);
  const [quotes, setQuotes] = useState(() => initialCache.current?.quotes || []);
  const [workOrders, setWorkOrders] = useState(() => initialCache.current?.workOrders || []);
  const [calendarEvents, setCalendarEvents] = useState(() => initialCache.current?.calendarEvents || []);
  const [auditLogs, setAuditLogs] = useState([]);
  const auditLogsLoadedRef = useRef(false);
  const loadedUserRef = useRef(null);

  const loadAuditLogsOnDemand = useCallback(async ({ force = false } = {}) => {
    if (auditLogsLoadedRef.current && !force) return;
    const rows = await erpService.loadAuditLogs();
    setAuditLogs(rows);
    auditLogsLoadedRef.current = true;
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 3600);
  }, []);

  const recordAudit = useCallback(
    async ({ action, entity_type, entity_id = '', entity_ref = '', summary, details = {}, userOverride = null }) => {
      const actor = userOverride || session?.user;
      const userEmail = actor?.email || 'usuario@local';
      const userId = actor?.id || null;
      try {
        const created = await erpService.createAuditLog({
          user_id: userId,
          user_email: userEmail,
          action,
          entity_type,
          entity_id,
          entity_ref,
          summary,
          details,
        });
        if (created) {
          setAuditLogs((prev) => {
            if (prev.some((a) => a.id === created.id)) return prev;
            return [created, ...prev].slice(0, 500);
          });
        }
      } catch (err) {
        console.warn('No se pudo registrar en bitácora:', err?.message || err);
      }
    },
    [session]
  );

  const refreshErp = useCallback(async () => {
    setErpSyncing(true);
    try {
      const data = await erpService.loadAllErpData();
      setClients(data.clients);
      setMaterials(data.materials);
      setConsumables(data.consumables);
      setQuoteRequests(data.quoteRequests);
      setQuotes(data.quotes);
      setWorkOrders(data.workOrders);
      setCalendarEvents(data.calendarEvents);
      writeErpCache(data);
      if (auditLogsLoadedRef.current) {
        setAuditLogs(await erpService.loadAuditLogs());
      }
    } finally {
      setErpSyncing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isIntranetPath = path.startsWith('/intranet');
    const isTrackingPath = path.startsWith('/seguimiento');

    (async () => {
      try {
        if (isTrackingPath) {
          // Tracking público no requiere esperar sesión ni catálogo
          if (mounted) setLoading(false);
          return;
        }

        const sess = await erpService.getSession();
        if (!mounted) return;
        setSession(sess);
        // Desbloqueamos la UI apenas conocemos la sesión (~5ms); los datos sincronizan en paralelo.
        if (mounted) setLoading(false);

        if (sess) {
          loadedUserRef.current = sess.user?.id || 'local';
          // En Web Pública solo refrescamos el catálogo; el ERP completo se carga al abrir Intranet
          // o en segundo plano sin bloquear nunca la pantalla.
          if (isIntranetPath) {
            await refreshErp();
          } else {
            refreshErp();
          }
        } else {
          const pubMaterials = await erpService.loadPublicCatalog();
          if (mounted) setMaterials(pubMaterials);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession);
        if (newSession) {
          const uidKey = newSession.user?.id || 'local';
          if (event === 'SIGNED_IN' && loadedUserRef.current !== uidKey) {
            loadedUserRef.current = uidKey;
            refreshErp();
          }
        } else {
          loadedUserRef.current = null;
          try {
            sessionStorage.removeItem(ERP_CACHE_KEY);
          } catch {
            // ignore
          }
        }
      });

      return () => {
        mounted = false;
        subscription?.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [refreshErp]);

  // Suscripción Realtime incremental SOLO cuando hay sesión autenticada (0 tráfico en Web Pública)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session?.user?.id) return undefined;

    const channel = supabase
      .channel(`erp-realtime-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' }, (payload) => {
        applyRealtimeRow(setQuoteRequests, payload, { maxItems: 250 });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, (payload) => {
        applyRealtimeRow(setQuotes, payload, { maxItems: 300 });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, (payload) => {
        applyRealtimeRow(setWorkOrders, payload, { maxItems: 250 });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, (payload) => {
        applyRealtimeRow(setCalendarEvents, payload, {
          maxItems: 300,
          sortFn: (a, b) => String(a.event_date || '').localeCompare(String(b.event_date || '')),
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        applyRealtimeRow(setAuditLogs, payload, { maxItems: 500 });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const signIn = async (email, password) => {
    const sess = await erpService.signIn(email, password);
    setSession(sess);
    loadedUserRef.current = sess?.user?.id || 'local';
    await refreshErp();
    await recordAudit({
      action: 'sesion',
      entity_type: 'sesion',
      entity_ref: sess?.user?.email || email,
      summary: 'Inició sesión en Intranet Mini-ERP',
      userOverride: sess?.user,
    });
    showToast('Sesión iniciada en Intranet Letreros Olivar');
    return sess;
  };

  const signOut = async () => {
    const currentUser = session?.user;
    if (currentUser?.email) {
      await recordAudit({
        action: 'sesion',
        entity_type: 'sesion',
        entity_ref: currentUser.email,
        summary: 'Cerró sesión en Intranet Mini-ERP',
        userOverride: currentUser,
      });
    }
    await erpService.signOut();
    setSession(null);
    showToast('Sesión cerrada', 'info');
  };

  const submitPublicRequest = async (payload) => {
    const created = await erpService.createQuoteRequest(payload);
    setQuoteRequests((prev) => [created, ...prev]);
    return created;
  };

  const updateRequestStatus = async (id, status, convertedQuoteId = null) => {
    const existing = quoteRequests.find((r) => r.id === id);
    const updated = await erpService.updateQuoteRequestStatus(id, status, convertedQuoteId);
    if (updated) {
      setQuoteRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      await recordAudit({
        action: 'estado',
        entity_type: 'solicitud',
        entity_id: id,
        entity_ref: existing?.client_name || updated.client_name || 'Solicitud Web',
        summary: `Actualizó solicitud web de ${existing?.client_name || updated.client_name || 'cliente'} a "${status}"`,
        details: { status, converted_quote_id: convertedQuoteId },
      });
    }
    return updated;
  };

  const deleteQuoteRequest = async (id) => {
    const existing = quoteRequests.find((r) => r.id === id);
    await erpService.deleteQuoteRequest(id);
    setQuoteRequests((prev) => prev.filter((r) => r.id !== id));
    await recordAudit({
      action: 'eliminar',
      entity_type: 'solicitud',
      entity_id: id,
      entity_ref: existing?.client_name || 'Solicitud Web',
      summary: `Eliminó solicitud web de ${existing?.client_name || 'cliente'}${existing?.material_name ? ` (${existing.material_name})` : ''}`,
    });
    showToast('Solicitud web eliminada');
  };

  const saveQuote = async (quote, options = {}) => {
    const isEdit = Boolean(quote.id && quotes.some((q) => q.id === quote.id));
    const saved = await erpService.saveQuote(quote);
    setQuotes((prev) => {
      const exists = prev.some((q) => q.id === saved.id);
      return exists ? prev.map((q) => (q.id === saved.id ? saved : q)) : [saved, ...prev];
    });

    if (!options.skipAudit) {
      const clientName = saved.client_snapshot?.name || 'Cliente';
      await recordAudit({
        action: isEdit ? 'editar' : 'crear',
        entity_type: 'cotizacion',
        entity_id: saved.id,
        entity_ref: saved.correlative,
        summary: isEdit
          ? `Editó cotización ${saved.correlative} (${clientName} · ${formatCLP(saved.total)})`
          : `Creó cotización ${saved.correlative} para ${clientName} (${formatCLP(saved.total)})`,
        details: {
          status: saved.status,
          total: saved.total,
          client_name: clientName,
        },
      });
    }
    return saved;
  };

  const changeQuoteStatus = async (quote, newStatus, extra = {}, historyNote = '') => {
    const now = new Date().toISOString();
    const actorEmail = session?.user?.email || '';
    const nextHistory = [
      ...(Array.isArray(quote.status_history) ? quote.status_history : []),
      {
        status: newStatus,
        at: now,
        by: actorEmail,
        note: historyNote || `Cambio a ${newStatus}`,
      },
    ];
    const saved = await saveQuote(
      {
        ...quote,
        ...extra,
        status: newStatus,
        status_history: nextHistory,
      },
      { skipAudit: true }
    );

    const actionType =
      newStatus === 'facturada'
        ? 'facturar'
        : newStatus === 'despacho'
          ? 'despachar'
          : newStatus === 'pagada'
            ? 'pagar'
            : 'estado';

    await recordAudit({
      action: actionType,
      entity_type: 'cotizacion',
      entity_id: saved.id,
      entity_ref: saved.correlative,
      summary: `${historyNote || `Cambió estado a ${newStatus}`} · ${saved.client_snapshot?.name || 'Cliente'}`,
      details: {
        from_status: quote.status,
        to_status: newStatus,
        invoice_number: saved.invoice_number || undefined,
        oc_number: saved.oc_number || undefined,
        total: saved.total,
      },
    });

    // Si se aplaza con fecha de seguimiento, actualizar evento existente o crear uno en el calendario
    if (newStatus === 'aplazada' && extra.postponed_until) {
      const existingEv = calendarEvents.find(
        (ev) => saved.correlative && ev.quote_correlative === saved.correlative
      );
      await saveCalendarEvent(
        {
          ...(existingEv || {}),
          title: `Seguimiento ${saved.correlative} · ${saved.client_snapshot?.name || 'Cliente'}`,
          event_type: 'seguimiento',
          event_date: extra.postponed_until,
          event_time: existingEv?.event_time || '10:30',
          client_name: saved.client_snapshot?.name || '',
          address: saved.delivery_address || '',
          quote_correlative: saved.correlative,
          status: existingEv?.status || 'programado',
          notes: extra.postpone_reason || 'Seguimiento de cotización aplazada',
        },
        { skipAudit: true }
      );
    }

    return saved;
  };

  const addQuotePayment = async (quote, { amount, date, method = 'Transferencia bancaria', note = '' }) => {
    const cleanAmount = Math.round(Number(amount) || 0);
    if (cleanAmount <= 0) throw new Error('Ingresa un monto de abono válido mayor a $0');

    const prevPayments = getQuotePayments(quote);
    const paymentEntry = {
      id: uid(),
      amount: cleanAmount,
      date: date || new Date().toISOString().slice(0, 10),
      method,
      note: String(note || '').trim(),
      by: session?.user?.email || '',
      at: new Date().toISOString(),
    };
    const nextPayments = [...prevPayments, paymentEntry];
    const paidSum = nextPayments.reduce((s, p) => s + (Math.round(Number(p.amount) || 0)), 0);
    const total = Math.round(Number(quote.total) || 0);
    const completesTotal = total > 0 && paidSum >= total;
    const nextStatus = completesTotal ? 'pagada' : quote.status;

    const nextHistory = [
      ...(Array.isArray(quote.status_history) ? quote.status_history : []),
      {
        status: nextStatus,
        at: paymentEntry.at,
        by: paymentEntry.by,
        note: completesTotal
          ? `Pago completado (+$${cleanAmount.toLocaleString('es-CL')} · ${method})`
          : `Abono registrado: $${cleanAmount.toLocaleString('es-CL')} (${method})`,
      },
    ];

    const saved = await saveQuote(
      {
        ...quote,
        status: nextStatus,
        client_snapshot: {
          ...(quote.client_snapshot || {}),
          payments: nextPayments,
        },
        status_history: nextHistory,
      },
      { skipAudit: true }
    );

    await recordAudit({
      action: completesTotal ? 'pagar' : 'abono',
      entity_type: 'cotizacion',
      entity_id: saved.id,
      entity_ref: saved.correlative,
      summary: completesTotal
        ? `Completó pago de ${saved.correlative} (+$${cleanAmount.toLocaleString('es-CL')} · ${method}) · ${saved.client_snapshot?.name || 'Cliente'}`
        : `Registró abono de $${cleanAmount.toLocaleString('es-CL')} en ${saved.correlative} (${method}) · Saldo $${Math.max(0, total - paidSum).toLocaleString('es-CL')}`,
      details: {
        amount: cleanAmount,
        method,
        paid_total: paidSum,
        pending_balance: Math.max(0, total - paidSum),
        total,
      },
    });

    return { saved, completesTotal, paidSum, pendingBalance: Math.max(0, total - paidSum) };
  };

  const deleteQuote = async (id) => {
    const existing = quotes.find((q) => q.id === id);
    await erpService.deleteQuote(id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    setWorkOrders((prev) =>
      prev.filter(
        (w) =>
          w.quote_id !== id &&
          !(existing?.correlative && w.quote_correlative === existing.correlative)
      )
    );
    await recordAudit({
      action: 'eliminar',
      entity_type: 'cotizacion',
      entity_id: id,
      entity_ref: existing?.correlative || 'Cotización',
      summary: `Eliminó cotización ${existing?.correlative || ''} y su OT vinculada (${existing?.client_snapshot?.name || 'Cliente'})`,
      details: { total: existing?.total },
    });
    showToast('Cotización eliminada');
  };

  const saveWorkOrder = async (ot) => {
    const prevOt = ot.id ? workOrders.find((w) => w.id === ot.id) : null;
    const saved = await erpService.saveWorkOrder(ot);
    setWorkOrders((prev) => {
      const exists = prev.some((w) => w.id === saved.id);
      return exists ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev];
    });

    if (!prevOt) {
      await recordAudit({
        action: 'crear',
        entity_type: 'ot',
        entity_id: saved.id,
        entity_ref: saved.ot_number,
        summary: `Creó ${saved.ot_number} para ${saved.client_name}${saved.quote_correlative ? ` (desde ${saved.quote_correlative})` : ''}`,
        details: { status: saved.status, priority: saved.priority },
      });
    } else if (prevOt.status !== saved.status) {
      const actionType =
        saved.status === 'facturada'
          ? 'facturar'
          : saved.status === 'despachado'
            ? 'despachar'
            : saved.status === 'pagada'
              ? 'pagar'
              : 'estado';
      await recordAudit({
        action: actionType,
        entity_type: 'ot',
        entity_id: saved.id,
        entity_ref: saved.ot_number,
        summary: `Movió ${saved.ot_number} (${saved.client_name}) de "${prevOt.status}" a "${saved.status}"${saved.invoice_number ? ` · FAC ${saved.invoice_number}` : ''}`,
        details: {
          from_status: prevOt.status,
          to_status: saved.status,
          invoice_number: saved.invoice_number || undefined,
        },
      });
    } else {
      await recordAudit({
        action: 'editar',
        entity_type: 'ot',
        entity_id: saved.id,
        entity_ref: saved.ot_number,
        summary: `Editó ${saved.ot_number} (${saved.client_name})`,
      });
    }

    return saved;
  };

  const deleteWorkOrder = async (id) => {
    const existing = workOrders.find((w) => w.id === id);
    await erpService.deleteWorkOrder(id);
    setWorkOrders((prev) => prev.filter((w) => w.id !== id));
    await recordAudit({
      action: 'eliminar',
      entity_type: 'ot',
      entity_id: id,
      entity_ref: existing?.ot_number || 'OT',
      summary: `Eliminó ${existing?.ot_number || 'OT'} (${existing?.client_name || 'Cliente'})`,
      details: { quote_correlative: existing?.quote_correlative || undefined },
    });
    showToast('Orden de Trabajo eliminada');
  };

  const saveCalendarEvent = async (ev, options = {}) => {
    const isEdit = Boolean(ev.id && calendarEvents.some((e) => e.id === ev.id));
    const saved = await erpService.saveCalendarEvent(ev);
    setCalendarEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      const next = exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
      return next.sort((a, b) => a.event_date.localeCompare(b.event_date));
    });

    if (!options.skipAudit) {
      await recordAudit({
        action: isEdit ? 'editar' : 'crear',
        entity_type: 'agenda',
        entity_id: saved.id,
        entity_ref: saved.quote_correlative || saved.ot_number || saved.event_date,
        summary: `${isEdit ? 'Actualizó' : 'Agendó'} evento: ${saved.title} (${saved.event_date})`,
      });
    }
    return saved;
  };

  const deleteCalendarEvent = async (id) => {
    const existing = calendarEvents.find((e) => e.id === id);
    await erpService.deleteCalendarEvent(id);
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
    await recordAudit({
      action: 'eliminar',
      entity_type: 'agenda',
      entity_id: id,
      entity_ref: existing?.event_date || 'Agenda',
      summary: `Eliminó evento de agenda: ${existing?.title || id}`,
    });
  };

  const saveClient = async (client) => {
    const isEdit = Boolean(client.id && clients.some((c) => c.id === client.id));
    const saved = await erpService.saveClient(client);
    setClients((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
    });
    await recordAudit({
      action: isEdit ? 'editar' : 'crear',
      entity_type: 'cliente',
      entity_id: saved.id,
      entity_ref: saved.rut || saved.name,
      summary: `${isEdit ? 'Editó' : 'Creó'} cliente: ${saved.name}${saved.rut ? ` (${saved.rut})` : ''}`,
    });
    return saved;
  };

  const deleteClient = async (id) => {
    const existing = clients.find((c) => c.id === id);
    await erpService.deleteClient(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    await recordAudit({
      action: 'eliminar',
      entity_type: 'cliente',
      entity_id: id,
      entity_ref: existing?.rut || existing?.name || 'Cliente',
      summary: `Eliminó cliente: ${existing?.name || id}`,
    });
  };

  const saveMaterial = async (material) => {
    const isEdit = Boolean(material.id && materials.some((m) => m.id === material.id));
    const saved = await erpService.saveMaterial(material);
    setMaterials((prev) => {
      const exists = prev.some((m) => m.id === saved.id);
      return exists ? prev.map((m) => (m.id === saved.id ? saved : m)) : [saved, ...prev];
    });
    await recordAudit({
      action: isEdit ? 'editar' : 'crear',
      entity_type: 'material',
      entity_id: saved.id,
      entity_ref: saved.name,
      summary: `${isEdit ? 'Actualizó' : 'Agregó'} material en Tarifario: ${saved.name} (${formatCLP(saved.pricePerSqm)}/${saved.unit})`,
    });
    return saved;
  };

  const deleteMaterial = async (id) => {
    const existing = materials.find((m) => m.id === id);
    await erpService.deleteMaterial(id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    await recordAudit({
      action: 'eliminar',
      entity_type: 'material',
      entity_id: id,
      entity_ref: existing?.name || 'Material',
      summary: `Eliminó material del Tarifario: ${existing?.name || id}`,
    });
  };

  // Mantener la caché de sesión sincronizada tras cualquier mutación (con debounce)
  useEffect(() => {
    if (!session) return undefined;
    const timer = setTimeout(() => {
      writeErpCache({
        clients,
        materials,
        consumables,
        quoteRequests,
        quotes,
        workOrders,
        calendarEvents,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [session, clients, materials, consumables, quoteRequests, quotes, workOrders, calendarEvents]);

  const contextValue = useMemo(
    () => ({
      session,
      loading,
      erpSyncing,
      isCloud: erpService.isCloud,
      showToast,
      materials,
      consumables,
      clients,
      quoteRequests,
      quotes,
      workOrders,
      calendarEvents,
      auditLogs,
      loadAuditLogsOnDemand,
      refreshErp,
      recordAudit,
      signIn,
      signOut,
      submitPublicRequest,
      updateRequestStatus,
      deleteQuoteRequest,
      saveQuote,
      changeQuoteStatus,
      addQuotePayment,
      deleteQuote,
      saveWorkOrder,
      deleteWorkOrder,
      saveCalendarEvent,
      deleteCalendarEvent,
      saveClient,
      deleteClient,
      saveMaterial,
      deleteMaterial,
    }),
    [
      session,
      loading,
      erpSyncing,
      showToast,
      materials,
      consumables,
      clients,
      quoteRequests,
      quotes,
      workOrders,
      calendarEvents,
      auditLogs,
      loadAuditLogsOnDemand,
      refreshErp,
      recordAudit,
    ]
  );

  return (
    <ErpContext.Provider value={contextValue}>
      <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>
    </ErpContext.Provider>
  );
}

export const useErp = () => {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error('useErp must be used inside ErpProvider');
  return ctx;
};

export const useToast = () => useContext(ToastContext);
