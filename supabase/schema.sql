-- ============================================================================
-- LETREROS OLIVAR SpA — ESQUEMA POSTGRESQL PARA SUPABASE (MINI-ERP v2.0)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================================================

-- 1. SECUENCIAS ATÓMICAS Y FUNCIONES DE CORRELATIVOS
create sequence if not exists public.quote_correlative_seq start 1;
create sequence if not exists public.ot_correlative_seq start 1;

revoke all on sequence public.quote_correlative_seq from public, anon;
revoke all on sequence public.ot_correlative_seq from public, anon;
grant usage, select on sequence public.quote_correlative_seq to authenticated;
grant usage, select on sequence public.ot_correlative_seq to authenticated;

create or replace function public.next_quote_correlative()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  seq_val bigint;
begin
  seq_val := nextval('public.quote_correlative_seq');
  return 'COT-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
end;
$$;

create or replace function public.next_ot_number()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  seq_val bigint;
begin
  seq_val := nextval('public.ot_correlative_seq');
  return 'OT-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
end;
$$;

revoke execute on function public.next_quote_correlative() from public, anon;
revoke execute on function public.next_ot_number() from public, anon;
grant execute on function public.next_quote_correlative() to authenticated;
grant execute on function public.next_ot_number() to authenticated;

-- Trigger genérico para updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2. MAESTRO DE CLIENTES
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rut text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  client_type text not null default 'Empresa'
    check (client_type in ('Empresa', 'Particular', 'Institución')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TARIFARIO DE MATERIALES E INSUMOS
create table if not exists public.materials (
  id text primary key,
  name text not null,
  category text not null,
  format text not null default 'A medida',
  cost numeric not null default 0 check (cost >= 0),
  price_per_sqm numeric not null default 0 check (price_per_sqm >= 0),
  unit text not null default 'm²',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consumables (
  id text primary key,
  name text not null,
  format text not null default 'Unidad',
  cost numeric not null default 0 check (cost >= 0),
  price numeric not null default 0 check (price >= 0),
  unit text not null default 'unidad',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. COTIZACIONES OFICIALES (MINI-ERP)
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  correlative text unique not null default public.next_quote_correlative(),
  client_id uuid references public.clients(id) on delete set null,
  client_snapshot jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'emitida'
    check (status in ('borrador', 'emitida', 'aplazada', 'aceptada', 'en_taller', 'despacho', 'facturada', 'pagada', 'rechazada')),
  postponed_until date,
  postpone_reason text not null default '',
  oc_number text not null default '',
  invoice_number text not null default '',
  invoice_date date,
  payment_terms text not null default '50% abono / 50% contra entrega',
  delivery_method text not null default 'instalacion'
    check (delivery_method in ('instalacion', 'retiro', 'despacho')),
  delivery_address text not null default '',
  manufacturing_days text not null default '5 a 7 días hábiles',
  installation_fee numeric not null default 0,
  freight_fee numeric not null default 0,
  discount_amount numeric not null default 0,
  tax_rate numeric not null default 19,
  subtotal numeric not null default 0,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  notes text not null default '',
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. SOLICITUDES DE COTIZACIÓN DESDE LA WEB PÚBLICA
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  material_id text not null default '',
  material_name text not null,
  width numeric,
  height numeric,
  quantity integer not null default 1 check (quantity > 0),
  delivery_method text not null default 'instalacion'
    check (delivery_method in ('instalacion', 'retiro', 'despacho')),
  delivery_address text not null default '',
  has_design text not null default 'si'
    check (has_design in ('si', 'no', 'ajustes')),
  comments text not null default '',
  client_name text not null,
  client_rut text not null default '',
  client_phone text not null,
  client_email text not null default '',
  status text not null default 'nueva'
    check (status in ('nueva', 'en_revision', 'convertida', 'descartada')),
  converted_quote_id uuid references public.quotes(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 6. ÓRDENES DE TRABAJO (TALLER / PRODUCCIÓN)
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  ot_number text unique not null default public.next_ot_number(),
  quote_id uuid references public.quotes(id) on delete set null,
  quote_correlative text not null default '',
  client_name text not null,
  client_phone text not null default '',
  items jsonb not null default '[]'::jsonb,
  delivery_method text not null default 'instalacion'
    check (delivery_method in ('instalacion', 'retiro', 'despacho')),
  delivery_address text not null default '',
  deadline date,
  deadline_history jsonb not null default '[]'::jsonb,
  priority text not null default 'normal'
    check (priority in ('normal', 'alta', 'urgente')),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'diseno', 'produccion', 'terminado', 'despachado', 'entregado', 'facturada', 'pagada')),
  invoice_number text not null default '',
  invoice_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. CALENDARIO DE ENTREGAS, INSTALACIONES Y SEGUIMIENTOS
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'entrega'
    check (event_type in ('entrega', 'instalacion', 'seguimiento', 'taller')),
  event_date date not null,
  event_time text not null default '10:00',
  client_name text not null default '',
  address text not null default '',
  quote_correlative text not null default '',
  ot_number text not null default '',
  status text not null default 'programado'
    check (status in ('programado', 'completado', 'reprogramado')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TRIGGERS DE UPDATED_AT
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

create trigger trg_materials_updated_at before update on public.materials
  for each row execute function public.set_updated_at();

create trigger trg_consumables_updated_at before update on public.consumables
  for each row execute function public.set_updated_at();

create trigger trg_quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

create trigger trg_work_orders_updated_at before update on public.work_orders
  for each row execute function public.set_updated_at();

create trigger trg_calendar_events_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ÍNDICES DE RENDIMIENTO Y LLAVES FORÁNEAS
create index if not exists idx_quotes_status on public.quotes(status);
create index if not exists idx_quotes_created on public.quotes(created_at desc);
create index if not exists idx_quotes_client_id on public.quotes(client_id);
create index if not exists idx_requests_status on public.quote_requests(status);
create index if not exists idx_requests_created on public.quote_requests(created_at desc);
create index if not exists idx_requests_converted_quote_id on public.quote_requests(converted_quote_id);
create index if not exists idx_ot_status on public.work_orders(status);
create index if not exists idx_ot_quote_id on public.work_orders(quote_id);
create index if not exists idx_ot_created on public.work_orders(created_at desc);
create index if not exists idx_cal_date on public.calendar_events(event_date);
create index if not exists idx_materials_active_category on public.materials(category) where active = true;

-- ROW LEVEL SECURITY (RLS)
alter table public.clients enable row level security;
alter table public.materials enable row level security;
alter table public.consumables enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.work_orders enable row level security;
alter table public.calendar_events enable row level security;

-- Políticas públicas (rol anon): solo lectura de materiales activos y envío de solicitudes nuevas
create policy "Public read active materials"
  on public.materials for select
  to anon
  using (active = true);

create policy "Public insert quote_requests"
  on public.quote_requests for insert
  to anon
  with check (
    char_length(trim(client_name)) > 0
    and char_length(trim(client_phone)) > 0
    and status = 'nueva'
    and converted_quote_id is null
  );

-- Políticas Intranet (usuarios autenticados del taller)
create policy "Auth all clients"
  on public.clients for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Auth all materials"
  on public.materials for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Auth all consumables"
  on public.consumables for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Auth all quote_requests"
  on public.quote_requests for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Auth all quotes"
  on public.quotes for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Auth all work_orders"
  on public.work_orders for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Auth all calendar_events"
  on public.calendar_events for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- REALTIME
alter publication supabase_realtime add table public.quote_requests;
alter publication supabase_realtime add table public.quotes;
alter publication supabase_realtime add table public.work_orders;
alter publication supabase_realtime add table public.calendar_events;


-- =====================================================================
-- 8. BITÁCORA OPERATIVA (AUDIT LOGS - APPEND ONLY)
-- =====================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null default '',
  entity_ref text not null default '',
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_user_email on public.audit_logs (user_email, created_at desc);
create index if not exists idx_audit_logs_entity_type on public.audit_logs (entity_type, created_at desc);

alter table public.audit_logs enable row level security;

create policy "audit_logs_authenticated_select"
  on public.audit_logs
  for select
  to authenticated
  using (true);

create policy "audit_logs_authenticated_insert"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    user_email is not null
    and length(trim(user_email)) > 0
    and summary is not null
    and length(trim(summary)) > 0
  );

alter publication supabase_realtime add table public.audit_logs;
