-- ============================================================================
-- LETREROS OLIVAR SpA — ESQUEMA POSTGRESQL PARA SUPABASE (MINI-ERP v2.0)
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. SECUENCIAS ATÓMICAS (Cero duplicación de correlativos)
create sequence if not exists public.quote_correlative_seq start 1;
create sequence if not exists public.ot_correlative_seq start 1;

create or replace function public.next_quote_correlative()
returns text
language plpgsql
security definer
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
security definer
as $$
declare
  seq_val bigint;
begin
  seq_val := nextval('public.ot_correlative_seq');
  return 'OT-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
end;
$$;

-- 2. MAESTRO DE CLIENTES
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rut text default '',
  contact_name text default '',
  phone text default '',
  email text default '',
  address text default '',
  client_type text default 'Empresa', -- 'Empresa' | 'Particular' | 'Institución'
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. TARIFARIO DE MATERIALES E INSUMOS
create table if not exists public.materials (
  id text primary key,
  name text not null,
  category text not null,
  format text default 'A medida',
  cost numeric default 0,
  price_per_sqm numeric not null default 0,
  unit text not null default 'm²', -- 'm²' | 'unidad' | 'tira'
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.consumables (
  id text primary key,
  name text not null,
  format text default 'Unidad',
  cost numeric default 0,
  price numeric not null default 0,
  unit text not null default 'unidad',
  active boolean default true,
  created_at timestamptz default now()
);

-- 4. SOLICITUDES DE COTIZACIÓN DESDE LA WEB PÚBLICA
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  material_id text default '',
  material_name text not null,
  width numeric,
  height numeric,
  quantity integer not null default 1,
  delivery_method text not null default 'instalacion', -- 'instalacion' | 'retiro' | 'despacho'
  delivery_address text default '',
  has_design text default 'si', -- 'si' | 'no' | 'ajustes'
  comments text default '',
  client_name text not null,
  client_rut text default '',
  client_phone text not null,
  client_email text default '',
  status text not null default 'nueva', -- 'nueva' | 'en_revision' | 'convertida' | 'descartada'
  converted_quote_id uuid,
  created_at timestamptz default now()
);

-- 5. COTIZACIONES OFICIALES (MINI-ERP)
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  correlative text unique not null default public.next_quote_correlative(),
  client_id uuid references public.clients(id) on delete set null,
  client_snapshot jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'emitida',
  -- Estados: 'borrador' | 'emitida' | 'aplazada' | 'aceptada' | 'en_taller' | 'despacho' | 'facturada' | 'pagada' | 'rechazada'
  postponed_until date,
  postpone_reason text default '',
  oc_number text default '',
  invoice_number text default '',
  invoice_date date,
  payment_terms text default '50% abono / 50% contra entrega',
  delivery_method text default 'instalacion',
  delivery_address text default '',
  manufacturing_days text default '5 a 7 días hábiles',
  installation_fee numeric default 0,
  freight_fee numeric default 0,
  discount_amount numeric default 0,
  tax_rate numeric default 19,
  subtotal numeric default 0,
  tax_amount numeric default 0,
  total numeric default 0,
  notes text default '',
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. ÓRDENES DE TRABAJO (TALLER / PRODUCCIÓN)
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  ot_number text unique not null default public.next_ot_number(),
  quote_id uuid references public.quotes(id) on delete set null,
  quote_correlative text default '',
  client_name text not null,
  client_phone text default '',
  items jsonb not null default '[]'::jsonb,
  delivery_method text default 'instalacion',
  delivery_address text default '',
  deadline date,
  priority text default 'normal', -- 'normal' | 'urgente'
  status text not null default 'pendiente', -- 'pendiente' | 'diseno' | 'produccion' | 'terminado' | 'despachado' | 'entregado'
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. CALENDARIO DE ENTREGAS, INSTALACIONES Y SEGUIMIENTOS
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'entrega', -- 'entrega' | 'instalacion' | 'seguimiento' | 'taller'
  event_date date not null,
  event_time text default '10:00',
  client_name text default '',
  address text default '',
  quote_correlative text default '',
  ot_number text default '',
  status text not null default 'programado', -- 'programado' | 'completado' | 'reprogramado'
  notes text default '',
  created_at timestamptz default now()
);

-- ÍNDICES DE RENDIMIENTO
create index if not exists idx_quotes_status on public.quotes(status);
create index if not exists idx_quotes_created on public.quotes(created_at desc);
create index if not exists idx_requests_status on public.quote_requests(status);
create index if not exists idx_ot_status on public.work_orders(status);
create index if not exists idx_cal_date on public.calendar_events(event_date);

-- ROW LEVEL SECURITY (RLS)
alter table public.clients enable row level security;
alter table public.materials enable row level security;
alter table public.consumables enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.work_orders enable row level security;
alter table public.calendar_events enable row level security;

-- Política pública: cualquier cliente web puede ver materiales y enviar solicitudes de cotización
create policy "Public read materials" on public.materials for select using (true);
create policy "Public insert quote_requests" on public.quote_requests for insert with check (true);

-- Políticas Intranet: usuarios autenticados tienen control completo
create policy "Auth all clients" on public.clients for all to authenticated using (true) with check (true);
create policy "Auth all materials" on public.materials for all to authenticated using (true) with check (true);
create policy "Auth all consumables" on public.consumables for all to authenticated using (true) with check (true);
create policy "Auth all quote_requests" on public.quote_requests for all to authenticated using (true) with check (true);
create policy "Auth all quotes" on public.quotes for all to authenticated using (true) with check (true);
create policy "Auth all work_orders" on public.work_orders for all to authenticated using (true) with check (true);
create policy "Auth all calendar_events" on public.calendar_events for all to authenticated using (true) with check (true);

-- Habilitar Realtime para sincronización instantánea en la Intranet
alter publication supabase_realtime add table public.quote_requests;
alter publication supabase_realtime add table public.quotes;
alter publication supabase_realtime add table public.work_orders;
