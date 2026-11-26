export const COMPANY_INFO = {
  name: 'LETREROS OLIVAR SpA',
  shortName: 'Letreros Olivar',
  tagline: 'Gráfica Corporativa, Letreros Luminosos & Publicidad Exterior',
  rut: '77.880.952-4',
  giro: 'Letreros Comerciales, Publicidad Gráfica',
  phone: '+56 9 5158 5884',
  whatsapp: '56951585884',
  email: 'contacto@letrerosolivar.com',
  emailAlt: 'letrerosolivar@gmail.com',
  address: "Camino Público S/N, Olivar, Región de O'Higgins, Chile",
  mapsUrl: 'https://maps.app.goo.gl/CAhXECLhAJ12AzEC9',
  web: 'www.letrerosolivar.com',
  hours: 'Lunes a Viernes · 10:00 a 20:00 hrs',
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100044724316759',
    instagram: 'https://www.instagram.com/letreros_olivar/',
    whatsapp: 'https://wa.me/56951585884',
  },
  bank: {
    banco: 'BCI / MACH',
    tipo: 'Cuenta Corriente',
    cuenta: '95069607',
    titular: 'Letreros Olivar SpA',
    rut: '77.880.952-4',
    email: 'contacto@letrerosolivar.com',
  },
};

export const PUBLIC_SERVICES = [
  {
    id: 'grafica-corporativa',
    title: 'Gráfica Corporativa & Placas',
    description: 'Placas de recepción en acrílico cristal con distanciadores metálicos, vinilo esmerilado y señalética interior.',
    defaultMaterial: 'Acrílico Transparente 5mm',
  },
  {
    id: 'letreros-luminosos',
    title: 'Cajones & Letreros Luminosos',
    description: 'Cajas de luz con estructura galvanizada, iluminación LED de alto brillo y gráfica backlight o acrílico.',
    defaultMaterial: 'Cajón Luminoso Galvanizado',
  },
  {
    id: 'corporeos-3d',
    title: 'Letras Corpóreas 3D & CNC',
    description: 'Corte láser en acrílico y ruteado CNC en Aluminio Compuesto (ACM), Trovicel y Polyfan con terminación profesional.',
    defaultMaterial: 'Aluminio Compuesto 3mm (ACM)',
  },
  {
    id: 'gran-formato',
    title: 'Gigantografías & Telas PVC',
    description: 'Impresión ecosolvente hasta 3.20m de ancho en tela PVC reforzada, blackout, bastidores metálicos y ojetillos.',
    defaultMaterial: 'Tela PVC 380gr (3.20m Gran Formato)',
  },
  {
    id: 'vinilos-rotulacion',
    title: 'Rotulación Vehicular & Vinilos',
    description: 'Vinilo alta adherencia, microperforado Window Vision, empavonado arquitectónico e imantados vehiculares.',
    defaultMaterial: 'Vinilo Alta Adherencia 1.27m',
  },
  {
    id: 'senaleticas-viales',
    title: 'Señaléticas Industriales & Viales',
    description: 'Placas sobre lata galvanizada o ACM con adhesivo reflectante normativo para faenas, minería y condominios.',
    defaultMaterial: 'Adhesivo Reflectante 1.24m',
  },
];

export const QUOTE_STATUSES = [
  { id: 'borrador', label: 'Borrador', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  { id: 'emitida', label: 'Emitida', color: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  { id: 'aplazada', label: 'Aplazada', color: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  { id: 'aceptada', label: 'Aceptada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'en_taller', label: 'En Taller (OT)', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  { id: 'despacho', label: 'Despacho / Inst.', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { id: 'facturada', label: 'Facturada', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500' },
  { id: 'pagada', label: 'Pagada', color: 'bg-green-100 text-green-800 border-green-300', dot: 'bg-green-600' },
  { id: 'rechazada', label: 'Rechazada', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
];

export const OT_STATUSES = [
  { id: 'pendiente', label: 'Pendiente', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'diseno', label: 'Diseño / Preprensa', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'produccion', label: 'En Producción', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'terminado', label: 'Terminado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'despachado', label: 'En Despacho / Obra', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'entregado', label: 'Entregado', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'facturada', label: 'Facturada', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'pagada', label: 'Pagada', color: 'bg-green-100 text-green-800 border-green-300' },
];
