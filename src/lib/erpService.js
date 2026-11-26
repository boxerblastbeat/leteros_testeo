import { supabase, isSupabaseConfigured } from './supabase';
import { DEFAULT_WORKSHOP_MATERIALS, DEFAULT_WORKSHOP_CONSUMABLES } from '../data/products';
import { uid, todayISO, addDaysISO } from './formatters';

const STORAGE_KEY = 'letreros_olivar_erp_v2';

// Postgres rechaza "" en columnas uuid, date o numeric anulables
const toNullable = (val) => (val === '' || val === undefined ? null : val);

const buildInitialLocalState = () => {
  const year = new Date().getFullYear();
  const c1 = 'cli-demo-1';
  const c2 = 'cli-demo-2';
  const q1 = 'quote-demo-1';
  const q2 = 'quote-demo-2';
  const q3 = 'quote-demo-3';

  return {
    quoteSeq: 3,
    otSeq: 1,
    materials: DEFAULT_WORKSHOP_MATERIALS,
    consumables: DEFAULT_WORKSHOP_CONSUMABLES,
    clients: [
      {
        id: c1,
        name: 'Agrícola Valle Central Ltda.',
        rut: '76.432.190-5',
        contact_name: 'Rodrigo Fuentes',
        phone: '+56 9 8412 3301',
        email: 'rfuentes@vallecentral.cl',
        address: 'Ruta H-40 Km 4, Olivar',
        client_type: 'Empresa',
        notes: 'Cliente frecuente de señalética de packing y letreros viales.',
        created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
      },
      {
        id: c2,
        name: 'Clínica Dental Rancagua Centro',
        rut: '77.129.884-2',
        contact_name: 'Dra. Camila Morales',
        phone: '+56 9 7731 9920',
        email: 'administracion@dentalrancagua.cl',
        address: 'Av. Independencia 482, Rancagua',
        client_type: 'Empresa',
        notes: 'Prefiere acabados en acrílico cristal con distanciadores.',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ],
    quoteRequests: [
      {
        id: 'req-demo-1',
        service_type: 'Cajones & Letreros Luminosos',
        material_id: 'mat-40',
        material_name: 'Cajón Luminoso Galvanizado',
        width: 3.2,
        height: 1.0,
        quantity: 1,
        delivery_method: 'instalacion',
        delivery_address: 'Av. San Juan 1120, Machalí',
        has_design: 'ajustes',
        comments: 'Fachada a 3 metros de altura, necesitamos iluminación LED blanca fría.',
        client_name: 'Minimarket El Roble',
        client_rut: '76.980.112-K',
        client_phone: '+56 9 9120 4411',
        client_email: 'contacto@elroble.cl',
        status: 'nueva',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
    ],
    quotes: [
      {
        id: q1,
        correlative: `COT-${year}-0001`,
        client_id: c1,
        client_snapshot: {
          name: 'Agrícola Valle Central Ltda.',
          rut: '76.432.190-5',
          contact_name: 'Rodrigo Fuentes',
          phone: '+56 9 8412 3301',
          email: 'rfuentes@vallecentral.cl',
        },
        items: [
          {
            id: 'it-1',
            materialId: 'mat-4',
            name: 'Aluminio Compuesto 3mm (ACM)',
            detail: 'Señalética corporativa exterior con vinilo reflectante laminado UV',
            width: 2.0,
            height: 1.0,
            area: 2.0,
            quantity: 2,
            priceMode: 'sqm',
            baseRate: 32000,
            unitPrice: 64000,
            lineTotal: 128000,
          },
        ],
        status: 'en_taller',
        oc_number: 'OC-4582',
        invoice_number: '',
        invoice_date: null,
        postponed_until: null,
        postpone_reason: '',
        payment_terms: '50% abono / 50% contra entrega',
        delivery_method: 'instalacion',
        delivery_address: 'Ruta H-40 Km 4, Olivar',
        manufacturing_days: '5 días hábiles',
        installation_fee: 45000,
        freight_fee: 0,
        discount_amount: 0,
        tax_rate: 19,
        subtotal: 173000,
        tax_amount: 32870,
        total: 205870,
        notes: 'Instalación coordinada con jefe de planta en horario AM.',
        status_history: [
          { status: 'emitida', at: new Date(Date.now() - 86400000 * 4).toISOString(), note: 'Cotización emitida' },
          { status: 'aceptada', at: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'OC-4582 aprobada' },
          { status: 'en_taller', at: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'OT generada automáticamente' },
        ],
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: q2,
        correlative: `COT-${year}-0002`,
        client_id: c2,
        client_snapshot: {
          name: 'Clínica Dental Rancagua Centro',
          rut: '77.129.884-2',
          contact_name: 'Dra. Camila Morales',
          phone: '+56 9 7731 9920',
          email: 'administracion@dentalrancagua.cl',
        },
        items: [
          {
            id: 'it-2',
            materialId: 'mat-3',
            name: 'Acrílico Transparente 5mm',
            detail: 'Placa recepción con logo troquelado + 4 distanciadores acero inox',
            width: 1.2,
            height: 0.7,
            area: 0.84,
            quantity: 1,
            priceMode: 'sqm',
            baseRate: 45000,
            unitPrice: 49800,
            lineTotal: 49800,
          },
          {
            id: 'it-3',
            materialId: 'mat-35',
            name: 'Dusted / Empavonado 1.22m',
            detail: 'Franjas de privacidad en 3 boxes de atención',
            width: 4.5,
            height: 1.2,
            area: 5.4,
            quantity: 1,
            priceMode: 'sqm',
            baseRate: 21000,
            unitPrice: 113400,
            lineTotal: 113400,
          },
        ],
        status: 'aplazada',
        oc_number: '',
        invoice_number: '',
        invoice_date: null,
        postponed_until: addDaysISO(5),
        postpone_reason: 'Cliente esperando cierre de remodelación de recepción para confirmar fecha.',
        payment_terms: '50% abono / 50% contra entrega',
        delivery_method: 'instalacion',
        delivery_address: 'Av. Independencia 482, Rancagua',
        manufacturing_days: '4 días hábiles',
        installation_fee: 35000,
        freight_fee: 0,
        discount_amount: 0,
        tax_rate: 19,
        subtotal: 198200,
        tax_amount: 37658,
        total: 235858,
        notes: 'Llamar el lunes para confirmar avance de obra.',
        status_history: [
          { status: 'emitida', at: new Date(Date.now() - 86400000 * 3).toISOString(), note: 'Enviada por correo y WhatsApp' },
          { status: 'aplazada', at: new Date(Date.now() - 86400000).toISOString(), note: 'Aplazada por remodelación de local' },
        ],
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: q3,
        correlative: `COT-${year}-0003`,
        client_id: null,
        client_snapshot: {
          name: 'Ferretería Los Lirios',
          rut: '76.554.321-8',
          contact_name: 'Marcelo Díaz',
          phone: '+56 9 6521 8840',
          email: 'ventas@ferreterialoslirios.cl',
        },
        items: [
          {
            id: 'it-4',
            materialId: 'mat-16',
            name: 'Tela PVC 380gr (3.20m Gran Formato)',
            detail: 'Gigantografía promocional con ojetillos metálicos cada 50 cm',
            width: 5.0,
            height: 2.0,
            area: 10.0,
            quantity: 1,
            priceMode: 'sqm',
            baseRate: 14000,
            unitPrice: 140000,
            lineTotal: 140000,
          },
        ],
        status: 'emitida',
        oc_number: '',
        invoice_number: '',
        invoice_date: null,
        postponed_until: null,
        postpone_reason: '',
        payment_terms: 'Contado al retiro',
        delivery_method: 'retiro',
        delivery_address: 'Taller Letreros Olivar',
        manufacturing_days: '2 días hábiles',
        installation_fee: 0,
        freight_fee: 0,
        discount_amount: 0,
        tax_rate: 19,
        subtotal: 140000,
        tax_amount: 26600,
        total: 166600,
        notes: 'Retira el propio cliente en taller.',
        status_history: [
          { status: 'emitida', at: new Date(Date.now() - 3600000 * 6).toISOString(), note: 'Cotización emitida' },
        ],
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
    ],
    workOrders: [
      {
        id: 'ot-demo-1',
        ot_number: `OT-${year}-0001`,
        quote_id: q1,
        quote_correlative: `COT-${year}-0001`,
        client_name: 'Agrícola Valle Central Ltda.',
        client_phone: '+56 9 8412 3301',
        items: [
          {
            id: 'it-1',
            name: 'Aluminio Compuesto 3mm (ACM)',
            detail: 'Señalética corporativa exterior con vinilo reflectante laminado UV',
            width: 2.0,
            height: 1.0,
            quantity: 2,
          },
        ],
        delivery_method: 'instalacion',
        delivery_address: 'Ruta H-40 Km 4, Olivar',
        deadline: addDaysISO(3),
        priority: 'normal',
        status: 'produccion',
        notes: 'Revisar corte CNC en plancha ACM 1.22x2.44.',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    calendarEvents: [
      {
        id: 'cal-demo-1',
        title: 'Instalación Señalética ACM · Agrícola Valle Central',
        event_type: 'instalacion',
        event_date: addDaysISO(3),
        event_time: '09:30',
        client_name: 'Agrícola Valle Central Ltda.',
        address: 'Ruta H-40 Km 4, Olivar',
        quote_correlative: `COT-${year}-0001`,
        ot_number: `OT-${year}-0001`,
        status: 'programado',
        notes: 'Llevar taladro percutor y anclajes metálicos.',
      },
      {
        id: 'cal-demo-2',
        title: 'Seguimiento Cotización Aplazada · Clínica Dental',
        event_type: 'seguimiento',
        event_date: addDaysISO(5),
        event_time: '11:00',
        client_name: 'Clínica Dental Rancagua Centro',
        address: 'Av. Independencia 482, Rancagua',
        quote_correlative: `COT-${year}-0002`,
        ot_number: '',
        status: 'programado',
        notes: 'Confirmar término de obra para activar fabricación.',
      },
    ],
  };
};

const readLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt storage
  }
  const seeded = buildInitialLocalState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

const writeLocal = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
  return state;
};

export const erpService = {
  isCloud: isSupabaseConfigured,

  // --- AUTH ---
  async getSession() {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  },

  async signIn(email, password) {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase no está configurado en este entorno. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.session;
  },

  async signOut() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  },

  // --- LOAD ALL ---
  async loadPublicCatalog() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          format: m.format,
          cost: Number(m.cost) || 0,
          pricePerSqm: Number(m.price_per_sqm) || 0,
          unit: m.unit,
        }));
      }
    }
    return readLocal().materials;
  },

  async loadQuoteRequests() {
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('quote_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(250);
      return data || [];
    }
    return readLocal().quoteRequests;
  },

  async loadQuotes() {
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      return data || [];
    }
    return readLocal().quotes;
  },

  async loadWorkOrders() {
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('work_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(250);
      return data || [];
    }
    return readLocal().workOrders;
  },

  async loadCalendarEvents() {
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true })
        .limit(300);
      return data || [];
    }
    return readLocal().calendarEvents;
  },

  async loadActivityLogs() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(400);
      if (error) return [];
      return data || [];
    }
    return readLocal().activityLogs || [];
  },

  async createActivityLog(entry) {
    const clean = {
      user_id: toNullable(entry.user_id),
      user_email: entry.user_email || 'sistema',
      module: entry.module || 'sistema',
      action: entry.action || 'accion',
      entity_ref: entry.entity_ref || '',
      summary: entry.summary || '',
      details: entry.details || {},
    };
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .insert([clean])
          .select()
          .single();
        if (error) return null;
        return data;
      } catch {
        return null;
      }
    }
    const db = readLocal();
    const created = { ...clean, id: uid(), created_at: new Date().toISOString() };
    db.activityLogs = [created, ...(db.activityLogs || [])].slice(0, 400);
    writeLocal(db);
    return created;
  },

  async loadAllErpData() {
    if (isSupabaseConfigured) {
      const [clientsRes, materialsRes, consumablesRes, reqRes, quotesRes, otRes, calRes, logsRes] =
        await Promise.all([
          supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(500),
          supabase.from('materials').select('*').order('category', { ascending: true }).limit(300),
          supabase.from('consumables').select('*').order('name', { ascending: true }).limit(200),
          supabase.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(250),
          supabase.from('quotes').select('*').order('created_at', { ascending: false }).limit(300),
          supabase.from('work_orders').select('*').order('created_at', { ascending: false }).limit(250),
          supabase.from('calendar_events').select('*').order('event_date', { ascending: true }).limit(300),
          supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(400),
        ]);

      return {
        clients: clientsRes.data || [],
        materials:
          materialsRes.data && materialsRes.data.length > 0
            ? materialsRes.data.map((m) => ({
                id: m.id,
                name: m.name,
                category: m.category,
                format: m.format,
                cost: Number(m.cost) || 0,
                pricePerSqm: Number(m.price_per_sqm) || 0,
                unit: m.unit,
              }))
            : DEFAULT_WORKSHOP_MATERIALS,
        consumables:
          consumablesRes.data && consumablesRes.data.length > 0
            ? consumablesRes.data
            : DEFAULT_WORKSHOP_CONSUMABLES,
        quoteRequests: reqRes.data || [],
        quotes: quotesRes.data || [],
        workOrders: otRes.data || [],
        calendarEvents: calRes.data || [],
        activityLogs: logsRes.error ? [] : logsRes.data || [],
      };
    }

    const local = readLocal();
    return {
      clients: local.clients,
      materials: local.materials,
      consumables: local.consumables,
      quoteRequests: local.quoteRequests,
      quotes: local.quotes,
      workOrders: local.workOrders,
      calendarEvents: local.calendarEvents,
      activityLogs: local.activityLogs || [],
    };
  },

  // --- PUBLIC QUOTE REQUESTS ---
  async createQuoteRequest(payload) {
    if (isSupabaseConfigured) {
      const cleanPayload = {
        ...payload,
        width: toNullable(payload.width),
        height: toNullable(payload.height),
      };
      // No encadenamos .select() porque el rol público (anon) solo tiene permiso INSERT por RLS
      const { error } = await supabase.from('quote_requests').insert([cleanPayload]);
      if (error) throw error;
      return {
        ...cleanPayload,
        id: uid(),
        status: 'nueva',
        created_at: new Date().toISOString(),
      };
    }
    const db = readLocal();
    const record = {
      ...payload,
      id: uid(),
      status: 'nueva',
      created_at: new Date().toISOString(),
    };
    db.quoteRequests = [record, ...db.quoteRequests];
    writeLocal(db);
    return record;
  },

  async updateQuoteRequestStatus(id, status, convertedQuoteId = null) {
    if (isSupabaseConfigured) {
      const patch = { status };
      if (convertedQuoteId) patch.converted_quote_id = convertedQuoteId;
      const { data, error } = await supabase
        .from('quote_requests')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const db = readLocal();
    let updated = null;
    db.quoteRequests = db.quoteRequests.map((r) => {
      if (r.id === id) {
        updated = { ...r, status, converted_quote_id: convertedQuoteId || r.converted_quote_id };
        return updated;
      }
      return r;
    });
    writeLocal(db);
    return updated;
  },

  async deleteQuoteRequest(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('quote_requests').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const db = readLocal();
    db.quoteRequests = db.quoteRequests.filter((r) => r.id !== id);
    writeLocal(db);
  },

  // --- QUOTES ---
  async saveQuote(quote) {
    if (isSupabaseConfigured) {
      const cleanQuote = {
        ...quote,
        client_id: toNullable(quote.client_id),
        postponed_until: toNullable(quote.postponed_until),
        invoice_date: toNullable(quote.invoice_date),
      };
      if (cleanQuote.id) {
        const { data, error } = await supabase
          .from('quotes')
          .update({ ...cleanQuote, updated_at: new Date().toISOString() })
          .eq('id', cleanQuote.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { id: _omit, correlative: _corr, ...insertData } = cleanQuote;
      const { data, error } = await supabase
        .from('quotes')
        .insert([insertData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = readLocal();
    const now = new Date().toISOString();
    if (quote.id && db.quotes.some((q) => q.id === quote.id)) {
      let saved = null;
      db.quotes = db.quotes.map((q) => {
        if (q.id === quote.id) {
          saved = { ...q, ...quote, updated_at: now };
          return saved;
        }
        return q;
      });
      writeLocal(db);
      return saved;
    }

    const nextSeq = (db.quoteSeq || 0) + 1;
    const year = new Date().getFullYear();
    const correlative = `COT-${year}-${String(nextSeq).padStart(4, '0')}`;
    const newQuote = {
      ...quote,
      id: uid(),
      correlative,
      status: quote.status || 'emitida',
      status_history: quote.status_history?.length
        ? quote.status_history
        : [{ status: quote.status || 'emitida', at: now, note: 'Cotización creada' }],
      created_at: now,
      updated_at: now,
    };
    db.quoteSeq = nextSeq;
    db.quotes = [newQuote, ...db.quotes];
    writeLocal(db);
    return newQuote;
  },

  async deleteQuote(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const db = readLocal();
    db.quotes = db.quotes.filter((q) => q.id !== id);
    writeLocal(db);
  },

  // --- WORK ORDERS (OT) ---
  async saveWorkOrder(ot) {
    if (isSupabaseConfigured) {
      const cleanOt = {
        ...ot,
        quote_id: toNullable(ot.quote_id),
        deadline: toNullable(ot.deadline),
        invoice_date: toNullable(ot.invoice_date),
      };
      if (cleanOt.id) {
        const { data, error } = await supabase
          .from('work_orders')
          .update({ ...cleanOt, updated_at: new Date().toISOString() })
          .eq('id', cleanOt.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { id: _omit, ot_number: _num, ...insertData } = cleanOt;
      const { data, error } = await supabase
        .from('work_orders')
        .insert([insertData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = readLocal();
    const now = new Date().toISOString();
    if (ot.id && db.workOrders.some((w) => w.id === ot.id)) {
      let saved = null;
      db.workOrders = db.workOrders.map((w) => {
        if (w.id === ot.id) {
          saved = { ...w, ...ot, updated_at: now };
          return saved;
        }
        return w;
      });
      writeLocal(db);
      return saved;
    }

    const nextSeq = (db.otSeq || 0) + 1;
    const year = new Date().getFullYear();
    const ot_number = `OT-${year}-${String(nextSeq).padStart(4, '0')}`;
    const created = {
      ...ot,
      id: uid(),
      ot_number,
      status: ot.status || 'pendiente',
      created_at: now,
      updated_at: now,
    };
    db.otSeq = nextSeq;
    db.workOrders = [created, ...db.workOrders];
    writeLocal(db);
    return created;
  },

  async deleteWorkOrder(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('work_orders').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const db = readLocal();
    db.workOrders = db.workOrders.filter((w) => w.id !== id);
    writeLocal(db);
  },

  // --- CALENDAR ---
  async saveCalendarEvent(ev) {
    if (isSupabaseConfigured) {
      const cleanEv = {
        ...ev,
        event_date: ev.event_date || todayISO(),
      };
      if (cleanEv.id) {
        const { data, error } = await supabase
          .from('calendar_events')
          .update(cleanEv)
          .eq('id', cleanEv.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { id: _omit, ...insertData } = cleanEv;
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([insertData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = readLocal();
    if (ev.id && db.calendarEvents.some((e) => e.id === ev.id)) {
      let saved = null;
      db.calendarEvents = db.calendarEvents.map((e) => {
        if (e.id === ev.id) {
          saved = { ...e, ...ev };
          return saved;
        }
        return e;
      });
      writeLocal(db);
      return saved;
    }
    const created = {
      ...ev,
      id: uid(),
      event_date: ev.event_date || todayISO(),
      status: ev.status || 'programado',
    };
    db.calendarEvents = [...db.calendarEvents, created].sort((a, b) =>
      a.event_date.localeCompare(b.event_date)
    );
    writeLocal(db);
    return created;
  },

  async deleteCalendarEvent(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const db = readLocal();
    db.calendarEvents = db.calendarEvents.filter((e) => e.id !== id);
    writeLocal(db);
  },

  // --- CLIENTS ---
  async saveClient(client) {
    if (isSupabaseConfigured) {
      if (client.id) {
        const { data, error } = await supabase
          .from('clients')
          .update({ ...client, updated_at: new Date().toISOString() })
          .eq('id', client.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { id: _omit, ...insertData } = client;
      const { data, error } = await supabase
        .from('clients')
        .insert([insertData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = readLocal();
    if (client.id && db.clients.some((c) => c.id === client.id)) {
      let saved = null;
      db.clients = db.clients.map((c) => {
        if (c.id === client.id) {
          saved = { ...c, ...client };
          return saved;
        }
        return c;
      });
      writeLocal(db);
      return saved;
    }
    const created = {
      ...client,
      id: uid(),
      created_at: new Date().toISOString(),
    };
    db.clients = [created, ...db.clients];
    writeLocal(db);
    return created;
  },

  async deleteClient(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const db = readLocal();
    db.clients = db.clients.filter((c) => c.id !== id);
    writeLocal(db);
  },

  // --- MATERIALS ---
  async saveMaterial(material) {
    const id = material.id || `mat-${Date.now()}`;
    const normalized = {
      id,
      name: material.name,
      category: material.category || 'Acrílicos y Rígidos',
      format: material.format || 'A medida',
      cost: Number(material.cost) || 0,
      pricePerSqm: Number(material.pricePerSqm) || 0,
      unit: material.unit || 'm²',
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('materials').upsert({
        id: normalized.id,
        name: normalized.name,
        category: normalized.category,
        format: normalized.format,
        cost: normalized.cost,
        price_per_sqm: normalized.pricePerSqm,
        unit: normalized.unit,
        active: true,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return normalized;
    }

    const db = readLocal();
    const exists = db.materials.some((m) => m.id === id);
    db.materials = exists
      ? db.materials.map((m) => (m.id === id ? normalized : m))
      : [normalized, ...db.materials];
    writeLocal(db);
    return normalized;
  },

  async deleteMaterial(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const db = readLocal();
    db.materials = db.materials.filter((m) => m.id !== id);
    writeLocal(db);
  },
};
