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
    showToast('Sesión iniciada en Intranet Letreros Olivar');
    return sess;
  };

  const signOut = async () => {
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
    const updated = await erpService.updateQuoteRequestStatus(id, status, convertedQuoteId);
    if (updated) {
      setQuoteRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    }
    return updated;
  };

  const deleteQuoteRequest = async (id) => {
    await erpService.deleteQuoteRequest(id);
    setQuoteRequests((prev) => prev.filter((r) => r.id !== id));
    showToast('Solicitud web eliminada');
  };

  const saveQuote = async (quote) => {
    const saved = await erpService.saveQuote(quote);
    setQuotes((prev) => {
      const exists = prev.some((q) => q.id === saved.id);
      return exists ? prev.map((q) => (q.id === saved.id ? saved : q)) : [saved, ...prev];
    });
    return saved;
  };

  const changeQuoteStatus = async (quote, newStatus, extra = {}, historyNote = '') => {
    const now = new Date().toISOString();
    const nextHistory = [
      ...(Array.isArray(quote.status_history) ? quote.status_history : []),
      { status: newStatus, at: now, note: historyNote || `Cambio a ${newStatus}` },
    ];
    const saved = await saveQuote({
      ...quote,
      ...extra,
      status: newStatus,
      status_history: nextHistory,
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
    await erpService.deleteQuote(id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    showToast('Cotización eliminada');
  };

  const saveWorkOrder = async (ot) => {
    const saved = await erpService.saveWorkOrder(ot);
    setWorkOrders((prev) => {
      const exists = prev.some((w) => w.id === saved.id);
      return exists ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev];
    });
    return saved;
  };

  const deleteWorkOrder = async (id) => {
    await erpService.deleteWorkOrder(id);
    setWorkOrders((prev) => prev.filter((w) => w.id !== id));
    showToast('Orden de Trabajo eliminada');
  };

  const saveCalendarEvent = async (ev) => {
    const saved = await erpService.saveCalendarEvent(ev);
    setCalendarEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      const next = exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
      return next.sort((a, b) => a.event_date.localeCompare(b.event_date));
    });
    return saved;
  };

  const deleteCalendarEvent = async (id) => {
    await erpService.deleteCalendarEvent(id);
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const saveClient = async (client) => {
    const saved = await erpService.saveClient(client);
    setClients((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
    });
    return saved;
  };

  const deleteClient = async (id) => {
    await erpService.deleteClient(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const saveMaterial = async (material) => {
    const saved = await erpService.saveMaterial(material);
    setMaterials((prev) => {
      const exists = prev.some((m) => m.id === saved.id);
      return exists ? prev.map((m) => (m.id === saved.id ? saved : m)) : [saved, ...prev];
    });
    return saved;
  };

  const deleteMaterial = async (id) => {
    await erpService.deleteMaterial(id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
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
