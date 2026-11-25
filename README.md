# Letreros Olivar SpA — Plataforma Web & Mini-ERP (v2.0)

Plataforma optimizada para **Letreros Olivar SpA** (Olivar, Región de O'Higgins, Chile), construida con **Vite + React 18 + Tailwind CSS compilado + Supabase (PostgreSQL)** y lista para despliegue automático en **Cloudflare Pages**.

## Módulos Incluidos

1. **Web Pública & Cotizador Interactivo de Clientes (`/`)**
   - Presentación de servicios, portafolio filtrable y formulario de cotización a medida (material exacto del tarifario, ancho × alto en metros con cálculo automático de m², cantidad, estado del diseño y modalidad de entrega: *Instalación en Terreno*, *Retiro en Taller* o *Despacho*).
   - Las solicitudes ingresan directo a la bandeja de la Intranet y permiten envío rápido por WhatsApp.

2. **Intranet Mini-ERP (`/intranet`)**
   - **Control de Cotizaciones:** Correlativos estrictos (`COT-YYYY-XXXX`), estados completos (`Borrador`, `Emitida`, `Aplazada` con fecha y motivo de seguimiento, `Aceptada`, `En Taller`, `Despacho`, `Facturada`, `Pagada`, `Rechazada`), exportación a CSV/Excel y vista previa/impresión **PDF tamaño Carta**.
   - **Bandeja de Solicitudes Web:** Conversión de requerimientos de clientes en cotización oficial en 1 clic.
   - **Producción y Taller (OTs):** Generación automática de Órdenes de Trabajo (`OT-YYYY-XXXX`) al aceptar una cotización, avance secuencial de estados y ficha técnica imprimible para taller.
   - **Agenda de Entregas, Instalaciones y Seguimientos:** Sincronizada automáticamente con OTs y cotizaciones aplazadas.
   - **Optimizador de Cortes 2D:** Cálculo de aprovechamiento de planchas (ACM, Acrílico, Trovicel, Lata) con sangría de disco (kerf), rotación 90° e impresión de planos SVG.
   - **Maestro de Clientes & Tarifario Editable:** Gestión centralizada de clientes y precios CLP.

---

## Desarrollo Local

```bash
npm install
npm run dev
```

- Sin variables de entorno de Supabase, la app arranca en **Modo Local Demo** (clave de prueba de Intranet: `olivar2026`).

---

## Conexión a Supabase (PostgreSQL + Auth + Realtime)

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta completo el archivo [`supabase/schema.sql`](supabase/schema.sql).
3. En **Authentication → Users**, crea el usuario administrador del taller (correo y contraseña).
4. Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## Despliegue en Cloudflare Pages

1. Conecta el repositorio de GitHub en **Cloudflare Pages**.
2. Configura:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Agrega las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. El archivo `public/_redirects` ya está configurado para enrutamiento SPA (`/* /index.html 200`).
