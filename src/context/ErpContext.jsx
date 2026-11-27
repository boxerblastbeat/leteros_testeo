import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { erpService } from '../lib/erpService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_WORKSHOP_MATERIALS, DEFAULT_WORKSHOP_CONSUMABLES } from '../data/products';
import { formatCLP } from '../lib/formatters';

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
  const [auditLogs, setAuditLogs] = useState([]);

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
    const data = await erpService.loadAllErpData();
    setClients(data.clients);
    setMaterials(data.materials);
    setConsumables(data.consumables);
    setQuoteRequests(data.quoteRequests);
    setQuotes(data.quotes);
    setWorkOrders(data.workOrders);
    setCalendarEvents(data.calendarEvents);
    setAuditLogs(data.auditLogs || []);
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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, async () => {
          setAuditLogs(await erpService.loadAuditLogs());
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
        auditLogs,
        refreshErp,
        recordAudit,
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
