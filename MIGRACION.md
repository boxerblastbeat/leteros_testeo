# Guía de Migración a Producción (GitHub + Supabase + Cloudflare Pages)

Esta plataforma está diseñada para ser **100% portable**: no tiene correos, contraseñas, llaves ni URLs fijas en el código fuente. Para migrarla a las cuentas definitivas de **Letreros Olivar SpA**, sigue estos 4 pasos en orden (toma ~10 minutos).

---

## Paso 1 — Migrar el repositorio de GitHub
Tienes 2 opciones (elige la más cómoda):
- **Opción A (Transferencia directa):** en GitHub → *Settings → Danger Zone → Transfer ownership* hacia la cuenta de GitHub definitiva.
- **Opción B (Clon limpio):** crear un repositorio vacío en la cuenta destino y subir la rama `main`:
  ```bash
  git remote add destino https://github.com/<USUARIO_DESTINO>/<REPO_DESTINO>.git
  git push destino main
  ```

---

## Paso 2 — Crear el proyecto definitivo en Supabase
1. Entra a [supabase.com](https://supabase.com/) con la cuenta definitiva y crea un proyecto nuevo (región recomendada: **South America / São Paulo**).
2. Ve a **SQL Editor → New Query**, pega y ejecuta completo el archivo [`supabase/schema.sql`](./supabase/schema.sql).
   - Esto crea todas las tablas, secuencias correlativas (`COT-YYYY-XXXX` y `OT-YYYY-XXXX`), índices, políticas RLS, Realtime, la función segura de tracking público (`get_public_ot_status`) y el bucket de fotos (`ot-photos`).
3. En una nueva consulta del **SQL Editor**, pega y ejecuta completo el archivo [`supabase/seed.sql`](./supabase/seed.sql) para cargar los 42 materiales e insumos base.
4. Ve a **Project Settings → API** y copia:
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **anon / public key** (`VITE_SUPABASE_ANON_KEY`)

---

## Paso 3 — Crear usuarios y asignar Roles (Admin / Ventas / Taller)
1. En el nuevo Supabase, ve a **Authentication → Users → Add user → Create new user** y crea las cuentas del equipo (marca *Auto Confirm User*).
2. Por defecto, toda cuenta nueva entra como **`admin`** (acceso total, evitando bloqueos).
3. Para restringir una cuenta a **Taller** (solo ve *Taller & OTs*, *Agenda*, *Cortes 2D* y *Cronograma*, sin montos financieros ni Administración) o **Ventas** (sin Administración ni Bitácora), ejecuta este SQL cambiando el correo:

```sql
-- Ejemplo: asignar rol TALLER
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "taller"}'::jsonb
where email = 'taller@letrerosolivar.com';

-- Ejemplo: asignar rol VENTAS
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "ventas"}'::jsonb
where email = 'ventas@letrerosolivar.com';

-- Volver una cuenta a ADMIN
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'contacto@letrerosolivar.com';
```

*(El usuario debe cerrar sesión y volver a entrar para tomar el nuevo rol).*

---

## Paso 4 — Conectar Cloudflare Pages y Dominio
1. En Cloudflare Pages → **Create a project → Connect to Git**, selecciona el repositorio destino (rama `main`).
2. Configuración de build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. En **Settings → Environment variables** (Production y Preview), agrega:
   - `VITE_SUPABASE_URL` = *(Project URL del Paso 2)*
   - `VITE_SUPABASE_ANON_KEY` = *(anon public key del Paso 2)*
4. Lanza el deploy y verifica:
   - `/` (Web Pública + formulario de cotización)
   - `/intranet` (Login + ERP completo)
   - `/seguimiento` (Tracking público de pedidos)
5. Finalmente, en **Custom domains**, conecta `letrerosolivar.com` / `www.letrerosolivar.com`.
