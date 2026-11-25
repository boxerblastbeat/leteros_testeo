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
  { id: 'borrador', label: 'Borrador', color: 'bg-zinc-800 text-zinc-300 border-zinc-700', dot: 'bg-zinc-400' },
  { id: 'emitida', label: 'Emitida', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30', dot: 'bg-sky-400' },
  { id: 'aplazada', label: 'Aplazada', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
  { id: 'aceptada', label: 'Aceptada', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  { id: 'en_taller', label: 'En Taller (OT)', color: 'bg-violet-500/15 text-violet-300 border-violet-500/30', dot: 'bg-violet-400' },
  { id: 'despacho', label: 'Despacho / Inst.', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30', dot: 'bg-orange-400' },
  { id: 'facturada', label: 'Facturada', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-400' },
  { id: 'pagada', label: 'Pagada', color: 'bg-green-600/20 text-green-300 border-green-500/40', dot: 'bg-green-400' },
  { id: 'rechazada', label: 'Rechazada', color: 'bg-red-500/15 text-red-300 border-red-500/30', dot: 'bg-red-400' },
];

export const OT_STATUSES = [
  { id: 'pendiente', label: 'Pendiente', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  { id: 'diseno', label: 'Diseño / Preprensa', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { id: 'produccion', label: 'En Producción', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'terminado', label: 'Terminado', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { id: 'despachado', label: 'En Despacho / Obra', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  { id: 'entregado', label: 'Entregado', color: 'bg-green-600/20 text-green-300 border-green-500/40' },
];
