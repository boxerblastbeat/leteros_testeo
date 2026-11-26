import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { erpService } from '../lib/erpService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_WORKSHOP_MATERIALS, DEFAULT_WORKSHOP_CONSUMABLES } from '../data/products';

const ErpContext = createContext(null);

export function ErpProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [materials, setMaterials] = useState(DEFAULT_WORKSHOP_MATERIALS);
  const [consumables, setConsumables] = useState(DEFAULT_WORKSHOP_CONSUMABLES);
  const [clients, setClients] = useState([]);
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const logActivity = useCallback(
    async ({ module, action, entity_ref = '', summary, details = {}, userOverride = null }) => {
      const actor = userOverride || session?.user;
      const created = await erpService.createActivityLog({
        user_id: actor?.id || null,
        user_email: actor?.email || 'sistema',
        module,
        action,
        entity_ref,
        summary,
        details,
      });
      if (created) {
        setActivityLogs((prev) => [created, ...prev.filter((l) => l.id !== created.id)].slice(0, 400));
      }
    },
    [session]
  );

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 3600);
  }, []);

  const refreshErp = useCallback(async () => {
    const data = await erpService.loadAllErpData();
    setClients(data.clients);
    setMaterials(data.materials);
    setConsumables(data.consumables);
    setQuoteRequests(data.quoteRequests);
    setQuotes(data.quotes);
    setWorkOrders(data.workOrders);
    setCalendarEvents(data.calendarEvents);
    setActivityLogs(data.activityLogs || []);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [sess, pubMaterials] = await Promise.all([
          erpService.getSession(),
          erpService.loadPublicCatalog(),
        ]);
        if (!mounted) return;
        setSession(sess);
        setMaterials(pubMaterials);
        if (sess) {
          await refreshErp();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if (newSession) refreshErp();
      });

      const channel = supabase
        .channel('erp-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' }, async () => {
          setQuoteRequests(await erpService.loadQuoteRequests());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, async () => {
          setQuotes(await erpService.loadQuotes());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, async () => {
          setWorkOrders(await erpService.loadWorkOrders());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, async () => {
          setCalendarEvents(await erpService.loadCalendarEvents());
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, async () => {
          setActivityLogs(await erpService.loadActivityLogs());
        })
        .subscribe();

      return () => {
        mounted = false;
        subscription?.unsubscribe();
        supabase.removeChannel(channel);
      };
    }

    return () => {
      mounted = false;
    };
  }, [refreshErp]);

  const signIn = async (email, password) => {
    const sess = await erpService.signIn(email, password);
    setSession(sess);
    await refreshErp();
    logActivity({
      module: 'sesion',
      action: 'login',
      entity_ref: 'Intranet',
      summary: `Inició sesión en la Intranet`,
      userOverride: sess?.user || { email },
    });
    showToast('Sesión iniciada en Intranet Letreros Olivar');
    return sess;
  };

  const signOut = async () => {
    await logActivity({
      module: 'sesion',
      action: 'logout',
      entity_ref: 'Intranet',
      summary: `Cerró sesión en la Intranet`,
    });
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
      logActivity({
        module: 'solicitudes',
        action: 'estado',
        entity_ref: existing?.client_name || 'Solicitud Web',
        summary: `Actualizó solicitud web de ${existing?.client_name || 'cliente'} a "${status}"`,
      });
    }
    return updated;
  };

  const deleteQuoteRequest = async (id) => {
    const existing = quoteRequests.find((r) => r.id === id);
    await erpService.deleteQuoteRequest(id);
    setQuoteRequests((prev) => prev.filter((r) => r.id !== id));
    logActivity({
      module: 'solicitudes',
      action: 'eliminar',
      entity_ref: existing?.client_name || 'Solicitud Web',
      summary: `Eliminó solicitud web de ${existing?.client_name || 'cliente'}`,
    });
    showToast('Solicitud web eliminada');
  };

  const saveQuote = async (quote, { skipLog = false } = {}) => {
    const isEdit = Boolean(quote.id && quotes.some((q) => q.id === quote.id));
    const saved = await erpService.saveQuote(quote);
    setQuotes((prev) => {
      const exists = prev.some((q) => q.id === saved.id);
      return exists ? prev.map((q) => (q.id === saved.id ? saved : q)) : [saved, ...prev];
    });
    if (!skipLog) {
      logActivity({
        module: 'cotizaciones',
        action: isEdit ? 'editar' : 'crear',
        entity_ref: saved.correlative || '',
        summary: `${isEdit ? 'Editó' : 'Creó'} cotización ${saved.correlative} · ${saved.client_snapshot?.name || 'Cliente'} ($${Number(saved.total || 0).toLocaleString('es-CL')})`,
      });
    }
    return saved;
  };

  const changeQuoteStatus = async (quote, newStatus, extra = {}, historyNote = '') => {
    const now = new Date().toISOString();
    const nextHistory = [
      ...(Array.isArray(quote.status_history) ? quote.status_history : []),
      { status: newStatus, at: now, note: historyNote || `Cambio a ${newStatus}` },
    ];
    const saved = await saveQuote(
      {
        ...quote,
        ...extra,
        status: newStatus,
        status_history: nextHistory,
      },
      { skipLog: true }
    );
    logActivity({
      module: 'cotizaciones',
      action: 'estado',
      entity_ref: saved.correlative || '',
      summary: `Cambió estado de ${saved.correlative} (${quote.status} → ${newStatus})${historyNote ? ` · ${historyNote}` : ''}`,
    });

    // Si se aplaza con fecha de seguimiento, crear evento automático en el calendario
    if (newStatus === 'aplazada' && extra.postponed_until) {
      await saveCalendarEvent({
        title: `Seguimiento ${saved.correlative} · ${saved.client_snapshot?.name || 'Cliente'}`,
        event_type: 'seguimiento',
        event_date: extra.postponed_until,
        event_time: '10:30',
        client_name: saved.client_snapshot?.name || '',
        address: saved.delivery_address || '',
        quote_correlative: saved.correlative,
        status: 'programado',
        notes: extra.postpone_reason || 'Seguimiento de cotización aplazada',
      });
    }

    return saved;
  };

  const deleteQuote = async (id) => {
    const existing = quotes.find((q) => q.id === id);
    await erpService.deleteQuote(id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    logActivity({
      module: 'cotizaciones',
      action: 'eliminar',
      entity_ref: existing?.correlative || '',
      summary: `Eliminó cotización ${existing?.correlative || ''} (${existing?.client_snapshot?.name || 'Cliente'})`,
    });
    showToast('Cotización eliminada');
  };

  const saveWorkOrder = async (ot) => {
    const existing = ot.id ? workOrders.find((w) => w.id === ot.id) : null;
    const saved = await erpService.saveWorkOrder(ot);
    setWorkOrders((prev) => {
      const exists = prev.some((w) => w.id === saved.id);
      return exists ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev];
    });
    const statusChanged = existing && existing.status !== saved.status;
    logActivity({
      module: 'taller',
      action: !existing ? 'crear' : statusChanged ? 'estado' : 'editar',
      entity_ref: saved.ot_number || '',
      summary: !existing
        ? `Creó orden ${saved.ot_number}${saved.quote_correlative ? ` (desde ${saved.quote_correlative})` : ''} · ${saved.client_name}`
        : statusChanged
          ? `Actualizó ${saved.ot_number} (${existing.status} → ${saved.status})${saved.invoice_number ? ` · FAC ${saved.invoice_number}` : ''}`
          : `Editó orden ${saved.ot_number} · ${saved.client_name}`,
    });
    return saved;
  };

  const deleteWorkOrder = async (id) => {
    const existing = workOrders.find((w) => w.id === id);
    await erpService.deleteWorkOrder(id);
    setWorkOrders((prev) => prev.filter((w) => w.id !== id));
    logActivity({
      module: 'taller',
      action: 'eliminar',
      entity_ref: existing?.ot_number || '',
      summary: `Eliminó orden ${existing?.ot_number || ''} (${existing?.client_name || 'Cliente'})`,
    });
    showToast('Orden de Trabajo eliminada');
  };

  const saveCalendarEvent = async (ev) => {
    const isEdit = Boolean(ev.id && calendarEvents.some((e) => e.id === ev.id));
    const saved = await erpService.saveCalendarEvent(ev);
    setCalendarEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      const next = exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
      return next.sort((a, b) => a.event_date.localeCompare(b.event_date));
    });
    logActivity({
      module: 'agenda',
      action: isEdit ? 'editar' : 'crear',
      entity_ref: saved.event_date || '',
      summary: `${isEdit ? 'Actualizó' : 'Agendó'} evento "${saved.title}" (${saved.event_date})`,
    });
    return saved;
  };

  const deleteCalendarEvent = async (id) => {
    const existing = calendarEvents.find((e) => e.id === id);
    await erpService.deleteCalendarEvent(id);
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
    logActivity({
      module: 'agenda',
      action: 'eliminar',
      entity_ref: existing?.event_date || '',
      summary: `Eliminó evento "${existing?.title || ''}"`,
    });
  };

  const saveClient = async (client) => {
    const isEdit = Boolean(client.id && clients.some((c) => c.id === client.id));
    const saved = await erpService.saveClient(client);
    setClients((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
    });
    logActivity({
      module: 'clientes',
      action: isEdit ? 'editar' : 'crear',
      entity_ref: saved.rut || saved.name || '',
      summary: `${isEdit ? 'Editó' : 'Registró'} cliente ${saved.name}`,
    });
    return saved;
  };

  const deleteClient = async (id) => {
    const existing = clients.find((c) => c.id === id);
    await erpService.deleteClient(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    logActivity({
      module: 'clientes',
      action: 'eliminar',
      entity_ref: existing?.rut || existing?.name || '',
      summary: `Eliminó cliente ${existing?.name || ''}`,
    });
  };

  const saveMaterial = async (material) => {
    const isEdit = Boolean(material.id && materials.some((m) => m.id === material.id));
    const saved = await erpService.saveMaterial(material);
    setMaterials((prev) => {
      const exists = prev.some((m) => m.id === saved.id);
      return exists ? prev.map((m) => (m.id === saved.id ? saved : m)) : [saved, ...prev];
    });
    logActivity({
      module: 'tarifario',
      action: isEdit ? 'editar' : 'crear',
      entity_ref: saved.category || '',
      summary: `${isEdit ? 'Editó' : 'Agregó'} material "${saved.name}" ($${Number(saved.pricePerSqm || 0).toLocaleString('es-CL')}/${saved.unit || 'm²'})`,
    });
    return saved;
  };

  const deleteMaterial = async (id) => {
    const existing = materials.find((m) => m.id === id);
    await erpService.deleteMaterial(id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    logActivity({
      module: 'tarifario',
      action: 'eliminar',
      entity_ref: existing?.category || '',
      summary: `Eliminó material "${existing?.name || ''}"`,
    });
  };

  return (
    <ErpContext.Provider
      value={{
        session,
        loading,
        isCloud: erpService.isCloud,
        toast,
        showToast,
        materials,
        consumables,
        clients,
        quoteRequests,
        quotes,
        workOrders,
        calendarEvents,
        activityLogs,
        refreshErp,
        signIn,
        signOut,
        submitPublicRequest,
        updateRequestStatus,
        deleteQuoteRequest,
        saveQuote,
        changeQuoteStatus,
        deleteQuote,
        saveWorkOrder,
        deleteWorkOrder,
        saveCalendarEvent,
        deleteCalendarEvent,
        saveClient,
        deleteClient,
        saveMaterial,
        deleteMaterial,
      }}
    >
      {children}
    </ErpContext.Provider>
  );
}

export const useErp = () => {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error('useErp must be used inside ErpProvider');
  return ctx;
};
