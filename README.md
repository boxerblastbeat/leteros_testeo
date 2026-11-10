# LETREROS OLIVAR SpA — Plataforma Web & Intranet Privada de Cotizaciones

Plataforma oficial para **Letreros Olivar SpA** (Olivar, Región de O'Higgins, Chile), construida con arquitectura dual:

1. **Sitio Público para Clientes:** Presentación de portafolio, servicios, taller en Olivar y **formulario de requerimientos sin precios** donde el cliente selecciona materiales, medidas y modalidad (**Instalación en Terreno** o **Retiro en Taller**).
2. **Intranet Privada de Taller:** Acceso protegido por contraseña para el equipo interno donde se reciben las solicitudes web, se convierten en **cotizaciones correlativas oficiales (`COT-2026-XXXX`) con cálculo de precios netos + IVA 19% (CLP)** y se emiten los documentos en PDF formal A4 o por WhatsApp.

---

## 🔐 Acceso a la Intranet de Taller

* **Acceso:** Botón discreto `"Acceso Intranet"` en la barra superior o en el pie de página.
* **Contraseña por defecto:** `olivar2026` (o `admin` / `1234`).
* **Secciones de la Intranet:**
  1. **Cotizador Correlativo:** Calculadora oficial por $m^2$ y unidad en Pesos Chilenos (CLP), acabados, descuentos, IVA (19%) y exportación a PDF formal con el RUT 77.880.952-4.
  2. **Bandeja de Solicitudes Web:** Permite revisar los requerimientos enviados por los clientes con un clic en **"Convertir en Cotización Correlativa"** para precargar los datos de inmediato.
  3. **Historial de Cotizaciones:** Registro oficial de cotizaciones emitidas para seguimiento comercial o reimpresión.

---

## 🏢 Formulario Público del Cliente (Sin Precios Visibles)

El usuario final en la web solo completa:
* **Servicio requerido:** Gráfica corporativa, Señéticas viales, Gigantografías, Letreros en general, Cajones luminosos, Corte láser en acrílico, CNC en aluminio compuesto ACM, Impresión gran formato, etc.
* **Material preferido:** Acrílico, Polyfan, Lona pesada, Vinilo microperforado, etc.
* **Dimensiones y cantidad:** Ancho y alto estimados en metros, cantidad de piezas.
* **Modalidad de Entrega:**
  * 🚚 **Instalación en Terreno / Obra** (solicita dirección de obra).
  * 🏬 **Retiro en Taller** (Ruta H-40, Olivar).
* **Datos de contacto:** Nombre, RUT, WhatsApp, Email y comentarios.
* **Envío:** Se guarda automáticamente en la bandeja de la Intranet y abre un chat en WhatsApp con el requerimiento estructurado.

---

## 📁 Archivos del Proyecto

```
publicidad-grafica-web/
├── index.html              ← Aplicación completa autónoma (abre con doble clic)
├── package.json            ← React 18, Vite, Tailwind CSS
├── vite.config.js          
├── tailwind.config.js      ← Paleta Negro, Rojo (#dc2626) y Blanco
├── README.md               ← Documentación
└── src/
    ├── main.jsx
    ├── App.jsx             ← Componente principal con soporte de Intranet y vista pública
    ├── index.css           ← Estilos e impresión @media print
    └── data/
        ├── products.js     ← Catálogo de precios internos del taller en CLP
        └── portfolioData.js← Proyectos con especificaciones técnicas
```

---

## ⚡ Cómo Usar y Probar

Haz doble clic sobre [**index.html**](file:///C:/Users/AccessAIT/.gemini/antigravity/scratch/publicidad-grafica-web/index.html) para abrirlo en tu navegador.
* Para probar como cliente: completa el formulario de solicitud al final de la página.
* Para probar la Intranet: haz clic en **"Acceso Intranet"** en la barra superior (clave: `olivar2026`).
