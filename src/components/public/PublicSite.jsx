import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Lock,
  Layers,
  Ruler,
  Truck,
  Store,
  Send,
  Sparkles,
  X,
  Package,
  ShieldCheck,
  Video,
  Instagram,
  Facebook,
  Menu,
} from 'lucide-react';
import { COMPANY_INFO, PUBLIC_SERVICES } from '../../data/company';
import { PORTFOLIO_PROJECTS } from '../../data/portfolioData';
import { useErp } from '../../context/ErpContext';
import { DELIVERY_LABELS, DESIGN_LABELS } from '../../lib/formatters';

function WhatsAppIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.676.15s-.777.979-.953 1.18c-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.897-.8-1.503-1.788-1.68-2.089-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.2-.301.301-.502.1-.2.05-.376-.025-.527-.075-.15-.676-1.63-.927-2.233-.244-.588-.492-.508-.676-.517-.175-.009-.376-.011-.577-.011s-.527.075-.803.376c-.276.301-1.054 1.03-1.054 2.51 0 1.48 1.079 2.91 1.23 3.111.15.2 2.122 3.24 5.141 4.544.718.31 1.278.496 1.715.635.722.23 1.38.197 1.9.12.58-.087 1.78-.727 2.03-1.43.25-.703.25-1.306.175-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.981-1.307A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.608 0-3.112-.455-4.394-1.246l-.315-.194-2.96.776.79-2.885-.213-.339A8.156 8.156 0 013.8 12c0-4.521 3.679-8.2 8.2-8.2s8.2 3.679 8.2 8.2c0 4.521-3.679 8.2-8.2 8.2z" />
    </svg>
  );
}

export default function PublicSite({ onOpenIntranet }) {
  const { materials, submitPublicRequest, showToast, session } = useErp();

  const [activePortfolioCat, setActivePortfolioCat] = useState('Todos');
  const [selectedProject, setSelectedProject] = useState(null);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [form, setForm] = useState({
    service_type: PUBLIC_SERVICES[0].title,
    material_category: 'Acrílicos y Rígidos',
    material_id: 'mat-3',
    material_name: 'Acrílico Transparente 5mm',
    dimUnit: 'm',
    width: '1.50',
    height: '0.80',
    quantity: 1,
    delivery_method: 'instalacion',
    delivery_address: '',
    has_design: 'si',
    comments: '',
    client_name: '',
    client_rut: '',
    client_phone: '',
    client_email: '',
  });

  const materialCategories = useMemo(
    () => [...new Set(materials.map((m) => m.category))],
    [materials]
  );

  const filteredMaterials = useMemo(
    () => materials.filter((m) => m.category === form.material_category),
    [materials, form.material_category]
  );

  const portfolioCategories = useMemo(
    () => ['Todos', ...new Set(PORTFOLIO_PROJECTS.map((p) => p.category))],
    []
  );

  const visiblePortfolio = useMemo(() => {
    if (activePortfolioCat === 'Todos') return PORTFOLIO_PROJECTS;
    return PORTFOLIO_PROJECTS.filter((p) => p.category === activePortfolioCat);
  }, [activePortfolioCat]);

  const areaPerUnit = useMemo(() => {
    const factor = form.dimUnit === 'cm' ? 0.01 : 1;
    const w = (parseFloat(form.width) || 0) * factor;
    const h = (parseFloat(form.height) || 0) * factor;
    return w * h;
  }, [form.width, form.height, form.dimUnit]);

  const suspiciousMeters =
    form.dimUnit === 'm' && ((parseFloat(form.width) || 0) > 15 || (parseFloat(form.height) || 0) > 15);

  const handleDimUnitChange = (nextUnit) => {
    if (nextUnit === form.dimUnit) return;
    setForm((prev) => {
      // Si están los valores por defecto exactos, los convertimos para que el ejemplo siga teniendo sentido
      if (prev.dimUnit === 'm' && nextUnit === 'cm' && prev.width === '1.50' && prev.height === '0.80') {
        return { ...prev, dimUnit: 'cm', width: '150', height: '80' };
      }
      if (prev.dimUnit === 'cm' && nextUnit === 'm' && prev.width === '150' && prev.height === '80') {
        return { ...prev, dimUnit: 'm', width: '1.50', height: '0.80' };
      }
      return { ...prev, dimUnit: nextUnit };
    });
  };

  const totalArea = useMemo(
    () => areaPerUnit * (parseInt(form.quantity, 10) || 1),
    [areaPerUnit, form.quantity]
  );

  const selectServiceAndScroll = (serviceTitle, defaultMaterialName) => {
    const mat = materials.find((m) => m.name === defaultMaterialName) || materials[0];
    setForm((prev) => ({
      ...prev,
      service_type: serviceTitle,
      material_category: mat ? mat.category : prev.material_category,
      material_id: mat ? mat.id : prev.material_id,
      material_name: mat ? mat.name : prev.material_name,
    }));
    document.getElementById('cotizar')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategoryChange = (cat) => {
    const first = materials.find((m) => m.category === cat);
    setForm((prev) => ({
      ...prev,
      material_category: cat,
      material_id: first?.id || '',
      material_name: first?.name || '',
    }));
  };

  const handleMaterialChange = (matId) => {
    const mat = materials.find((m) => m.id === matId);
    setForm((prev) => ({
      ...prev,
      material_id: matId,
      material_name: mat?.name || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const factor = form.dimUnit === 'cm' ? 0.01 : 1;
      const rawW = parseFloat(form.width);
      const rawH = parseFloat(form.height);
      const payload = {
        service_type: form.service_type,
        material_id: form.material_id,
        material_name: form.material_name,
        width: Number.isFinite(rawW) && rawW > 0 ? Number((rawW * factor).toFixed(3)) : null,
        height: Number.isFinite(rawH) && rawH > 0 ? Number((rawH * factor).toFixed(3)) : null,
        quantity: Math.max(1, parseInt(form.quantity, 10) || 1),
        delivery_method: form.delivery_method,
        delivery_address:
          form.delivery_method === 'retiro' ? 'Retiro en Taller Olivar' : form.delivery_address,
        has_design: form.has_design,
        comments: form.comments,
        client_name: form.client_name.trim(),
        client_rut: form.client_rut.trim(),
        client_phone: form.client_phone.trim(),
        client_email: form.client_email.trim(),
      };
      const created = await submitPublicRequest(payload);
      setSubmittedRequest(created);
      showToast('Solicitud recibida correctamente. Nuestro equipo la revisará a la brevedad.');
    } catch (err) {
      showToast(err?.message || 'Error al enviar solicitud', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const buildWhatsAppLink = (req) => {
    const lines = [
      `Hola *Letreros Olivar*, acabo de enviar una solicitud de cotización web:`,
      `• *Cliente:* ${req.client_name}${req.client_rut ? ` (${req.client_rut})` : ''}`,
      `• *Servicio:* ${req.service_type}`,
      `• *Material:* ${req.material_name}`,
      req.width && req.height
        ? `• *Medidas:* ${req.width}m x ${req.height}m (${req.quantity} unid.)`
        : `• *Cantidad:* ${req.quantity} unid.`,
      `• *Entrega:* ${DELIVERY_LABELS[req.delivery_method] || req.delivery_method}${
        req.delivery_address ? ` (${req.delivery_address})` : ''
      }`,
      `• *Diseño:* ${DESIGN_LABELS[req.has_design] || req.has_design}`,
      req.comments ? `• *Notas:* ${req.comments}` : '',
    ].filter(Boolean);
    return `https://wa.me/${COMPANY_INFO.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {/* BARRA SUPERIOR CORPORATIVA (Una sola línea limpia en escritorio, ordenada en móvil) */}
      <div className="bg-zinc-950 border-b border-zinc-900 text-[11px] sm:text-xs py-2 px-3 sm:px-6 lg:px-8 no-print">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2 lg:gap-4 text-zinc-400">
          {/* Ubicación */}
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={COMPANY_INFO.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-zinc-200 hover:text-red-400 font-medium transition whitespace-nowrap truncate"
              title={COMPANY_INFO.address}
            >
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Taller Matriz: Olivar, O&apos;Higgins</span>
            </a>
            <span className="hidden 2xl:inline text-zinc-700">|</span>
            <a
              href={COMPANY_INFO.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden 2xl:inline text-zinc-400 hover:text-zinc-200 transition underline underline-offset-4 decoration-red-600/60 whitespace-nowrap"
            >
              {COMPANY_INFO.address}
            </a>
          </div>

          {/* Contacto, Redes y Acceso Intranet */}
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between lg:justify-end gap-x-3.5 xl:gap-x-4 gap-y-1.5 pt-1.5 lg:pt-0 border-t border-zinc-900 lg:border-t-0">
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 xl:gap-x-4 gap-y-1 whitespace-nowrap">
              <a
                href={`mailto:${COMPANY_INFO.email}`}
                className="text-zinc-300 hover:text-white transition font-mono hidden xl:flex items-center gap-1.5"
                title={`Enviar correo a ${COMPANY_INFO.email}`}
              >
                <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>{COMPANY_INFO.email}</span>
              </a>
              <a
                href={`tel:${COMPANY_INFO.phone.replace(/\s+/g, '')}`}
                className="text-zinc-200 hover:text-white transition font-mono flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>{COMPANY_INFO.phone}</span>
              </a>
              <a
                href={COMPANY_INFO.social.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp</span>
              </a>
              <a
                href={COMPANY_INFO.social.instagram}
                target="_blank"
                rel="noreferrer"
                className="text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1.5 transition"
                title="Instagram @letreros_olivar"
              >
                <Instagram className="w-3.5 h-3.5 shrink-0" />
                <span>Instagram</span>
              </a>
              <a
                href={COMPANY_INFO.social.facebook}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 transition"
                title="Facebook Letreros Olivar"
              >
                <Facebook className="w-3.5 h-3.5 shrink-0" />
                <span>Facebook</span>
              </a>
            </div>

            <div className="lg:border-l lg:border-zinc-800 lg:pl-3.5 shrink-0">
              <button
                onClick={onOpenIntranet}
                className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 px-3 py-1.5 rounded-xl border border-red-600/35 text-[11px] sm:text-xs transition whitespace-nowrap"
                title="Acceso directo a la Intranet de Taller y Cotizaciones"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{session ? 'Ir a Intranet' : 'Acceso Intranet'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NAVBAR PRINCIPAL STICKY */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-6 lg:px-8 py-3 sm:py-3.5 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          <a href="#inicio" className="flex items-center gap-2.5 group min-w-0 shrink-0">
            <img
              src="/logo-white.svg"
              alt={COMPANY_INFO.name}
              className="h-9 sm:h-11 w-auto object-contain group-hover:scale-105 transition"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 bg-red-600/10 text-red-500 rounded border border-red-600/30 font-mono font-bold">
              SpA
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-6 text-[13px] font-semibold text-zinc-300">
            <a href="#servicios" className="hover:text-white transition">
              Servicios
            </a>
            <a href="#portafolio" className="hover:text-white transition">
              Galería de Trabajos
            </a>
            <a
              href="#cotizar"
              className="flex items-center gap-1.5 text-red-500 hover:text-red-400 transition font-bold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              Solicitar Cotización
            </a>
            <a
              href={COMPANY_INFO.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition flex items-center gap-1.5 text-zinc-300"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              Ubicación
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#cotizar"
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs tracking-wide shadow-lg shadow-red-600/25 transition hover:shadow-red-600/40 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
            >
              <span className="sm:hidden">Cotizar</span>
              <span className="hidden sm:inline">Cotizar mi Proyecto</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition"
              aria-label="Abrir menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MENÚ DESPLEGABLE MÓVIL / TABLET */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-3 pt-3 border-t border-zinc-800/80 flex flex-col gap-1.5 text-sm font-semibold text-zinc-200">
            <a
              href="#servicios"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-zinc-900 transition"
            >
              Servicios
            </a>
            <a
              href="#portafolio"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-zinc-900 transition"
            >
              Galería de Trabajos
            </a>
            <a
              href="#cotizar"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl bg-red-600/10 text-red-400 border border-red-600/20 transition"
            >
              Solicitar Cotización
            </a>
            <a
              href={COMPANY_INFO.mapsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-zinc-900 transition flex items-center gap-2 text-zinc-300"
            >
              <MapPin className="w-4 h-4 text-red-500" />
              Ubicación (Taller Olivar)
            </a>
          </nav>
        )}
      </header>

      {/* HERO SECTION (Encuadre limpio above-the-fold en notebooks y escritorios) */}
      <section
        id="inicio"
        className="relative overflow-hidden py-10 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 border-b border-zinc-900"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/35 via-black to-black pointer-events-none" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-red-500" />
              Fabricación Propia • Instalación en Terreno o Retiro en Taller
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-none font-heading">
              Letreros y Publicidad Gráfica de <span className="text-red-600">Alto Impacto</span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl leading-relaxed">
              En <strong className="text-white">Letreros Olivar SpA</strong> somos especialistas en{' '}
              <strong className="text-white">gráfica corporativa</strong>, señaléticas viales,
              gigantografías, banner PVC, palomas publicitarias, cajones luminosos, corte y grabado
              láser en acrílico, mecanizado CNC en aluminio compuesto e impresión de gran formato.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <a
                href="#cotizar"
                className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-6 py-3.5 rounded-xl shadow-xl shadow-red-600/30 transition flex items-center gap-2 text-sm tracking-wide"
              >
                <span>Solicitar Presupuesto Online</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href={COMPANY_INFO.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-5 py-3.5 rounded-xl border border-zinc-700 transition text-sm flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-red-500" />
                <span>Ver Taller en Olivar</span>
              </a>
            </div>

            {/* Métricas oficiales */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 sm:pt-8 border-t border-zinc-900">
              <div>
                <span className="text-xl sm:text-3xl font-black text-white font-heading">
                  +1,800
                </span>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-medium mt-0.5">Letreros Instalados</p>
              </div>
              <div>
                <span className="text-xl sm:text-3xl font-black text-red-600 font-heading">
                  Corte CNC
                </span>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-medium mt-0.5">Láser & Ruteado 3D</p>
              </div>
              <div>
                <span className="text-xl sm:text-3xl font-black text-white font-heading">
                  3.20m
                </span>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-medium mt-0.5">Impresión Ecosolvente</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-zinc-800 bg-zinc-950/90 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Proceso Rápido y Formal
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-600/15 border border-red-500/30 text-red-400 font-bold">
                  RUT {COMPANY_INFO.rut}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-sm">
                      Indica material, medidas y entrega
                    </strong>
                    <p className="mt-0.5 text-zinc-300 leading-relaxed">
                      Elige el sustrato exacto (ACM, Acrílico, Tela PVC, Vinilo, Caja de Luz) y si
                      requieres instalación en obra o retiro en taller.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-sm">
                      Evaluación técnica en Taller
                    </strong>
                    <p className="mt-0.5 text-zinc-300 leading-relaxed">
                      Nuestro equipo calcula sustratos, herrería y te emite la cotización formal con
                      número correlativo oficial.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-white block font-heading text-sm">
                      Producción e Instalación
                    </strong>
                    <p className="mt-0.5 text-zinc-300 leading-relaxed">
                      Fabricación garantizada con entrega express o montaje en obra con personal
                      calificado en toda la Región de O&apos;Higgins.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS + VIDEO ECOSOLVENTE 3.20M */}
      <section id="servicios" className="py-20 px-4 sm:px-8 border-b border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                Capacidades de Taller
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mt-1">
                Soluciones en Publicidad Gráfica
              </h2>
            </div>
            <p className="text-sm text-zinc-400 max-w-md">
              Selecciona cualquier especialidad para precargar el material recomendado en el
              cotizador online.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PUBLIC_SERVICES.map((svc, idx) => {
              const isVideoCard = svc.id === 'gran-formato';
              return (
                <div
                  key={svc.id}
                  className={`group p-6 rounded-2xl bg-black border transition flex flex-col justify-between ${
                    isVideoCard
                      ? 'border-red-600/40 hover:border-red-500 shadow-xl shadow-red-950/20'
                      : 'border-zinc-800/90 hover:border-red-500/40'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-red-500 bg-red-600/10 border border-red-600/20 px-2.5 py-1 rounded-lg">
                        {idx + 1}. {isVideoCard ? 'Gran Escala • En Vivo' : 'Taller Propio'}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition">
                        {isVideoCard ? <Video className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                      </div>
                    </div>

                    {isVideoCard && (
                      <div className="relative rounded-xl overflow-hidden bg-black border border-red-600/40 shadow-lg aspect-video">
                        <video
                          src="/ecosolvente-320.mp4"
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover rounded-xl"
                        >
                          Tu navegador no soporta video.
                        </video>
                        <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md border border-red-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 pointer-events-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          <span className="text-[10px] font-bold text-white font-mono">
                            Ecosolvente 3.20m
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-heading text-xl font-bold text-white group-hover:text-red-400 transition">
                        {svc.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                        {svc.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() => selectServiceAndScroll(svc.title, svc.defaultMaterial)}
                      className="w-full bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 hover:border-red-500 text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <span>Cotizar {svc.defaultMaterial}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GALERÍA / PORTAFOLIO */}
      <section id="portafolio" className="py-20 px-4 sm:px-8 border-b border-zinc-900 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                Proyectos Recientes
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mt-1">
                Galería de Trabajos
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {portfolioCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActivePortfolioCat(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
                    activePortfolioCat === cat
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visiblePortfolio.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="cursor-pointer group rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/80 hover:border-red-500/40 transition flex flex-col"
              >
                <div className="relative h-52 overflow-hidden bg-zinc-900">
                  <img
                    src={project.image}
                    alt={project.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-red-600 text-[11px] font-bold text-white shadow">
                    {project.category}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-mono text-red-400 font-semibold">
                      {project.client}
                    </p>
                    <h3 className="font-heading text-base font-bold text-white mt-1">
                      {project.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{project.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COTIZADOR INTERACTIVO DE CLIENTES */}
      <section id="cotizar" className="py-20 px-4 sm:px-8 bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">
              Cotizador de Proyectos
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mt-1">
              Solicita tu Presupuesto a Medida
            </h2>
            <p className="text-sm text-zinc-400 mt-2">
              Especifica el material, medidas aproximadas y modalidad de entrega. Tu requerimiento
              ingresa directo a nuestra Intranet para emitir tu cotización formal.
            </p>
          </div>

          {submittedRequest ? (
            <div className="rounded-3xl bg-black border border-emerald-500/35 p-8 sm:p-10 text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-heading text-2xl font-bold text-white">
                  ¡Solicitud registrada con éxito!
                </h3>
                <p className="text-sm text-zinc-300 mt-2 max-w-lg mx-auto">
                  Gracias <strong>{submittedRequest.client_name}</strong>. Recibimos tu requerimiento
                  de <strong>{submittedRequest.material_name}</strong>. Nuestro equipo revisará los
                  detalles y te enviará la cotización formal.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <a
                  href={buildWhatsAppLink(submittedRequest)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-600/25"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  Enviar Resumen por WhatsApp
                </a>
                <button
                  onClick={() => setSubmittedRequest(null)}
                  className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition"
                >
                  Enviar otra solicitud
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl bg-black border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-8"
            >
              {/* BLOQUE 1 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="w-6 h-6 rounded-lg bg-red-600 text-white text-xs flex items-center justify-center">
                    1
                  </span>
                  Servicio y Material Específico
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Tipo de Proyecto
                    </label>
                    <select
                      value={form.service_type}
                      onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    >
                      {PUBLIC_SERVICES.map((s) => (
                        <option key={s.id} value={s.title}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Familia de Material
                    </label>
                    <select
                      value={form.material_category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    >
                      {materialCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Material Exacto
                    </label>
                    <select
                      value={form.material_id}
                      onChange={(e) => handleMaterialChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    >
                      {filteredMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.format})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2 */}
              <div className="space-y-4 pt-6 border-t border-zinc-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-6 h-6 rounded-lg bg-red-600 text-white text-xs flex items-center justify-center">
                      2
                    </span>
                    Dimensiones y Diseño
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleDimUnitChange('m')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          form.dimUnit === 'm'
                            ? 'bg-red-600 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Metros (m)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDimUnitChange('cm')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          form.dimUnit === 'cm'
                            ? 'bg-red-600 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Centímetros (cm)
                      </button>
                    </div>
                    {totalArea > 0 && (
                      <span className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-red-500" />
                        Superficie estimada:{' '}
                        <strong className="text-white">{totalArea.toFixed(2)} m²</strong>
                      </span>
                    )}
                  </div>
                </div>

                {suspiciousMeters && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200">
                    <span>
                      ⚠️ Ingresaste más de <strong>15 metros</strong>. Si tu medida está en centímetros (ej: 70 cm = 0.70 m), cámbiala a <strong>cm</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, dimUnit: 'cm' }))}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 transition-colors shrink-0"
                    >
                      Usar como cm
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Ancho ({form.dimUnit === 'cm' ? 'cm' : 'metros'})
                    </label>
                    <input
                      type="number"
                      step={form.dimUnit === 'cm' ? '1' : '0.01'}
                      min="0"
                      value={form.width}
                      onChange={(e) => setForm({ ...form, width: e.target.value })}
                      placeholder={form.dimUnit === 'cm' ? 'Ej: 70' : 'Ej: 1.50'}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border text-sm text-white focus:outline-none focus:border-red-500 ${
                        suspiciousMeters && (parseFloat(form.width) || 0) > 15
                          ? 'border-amber-500'
                          : 'border-zinc-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Alto ({form.dimUnit === 'cm' ? 'cm' : 'metros'})
                    </label>
                    <input
                      type="number"
                      step={form.dimUnit === 'cm' ? '1' : '0.01'}
                      min="0"
                      value={form.height}
                      onChange={(e) => setForm({ ...form, height: e.target.value })}
                      placeholder={form.dimUnit === 'cm' ? 'Ej: 100' : 'Ej: 0.80'}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border text-sm text-white focus:outline-none focus:border-red-500 ${
                        suspiciousMeters && (parseFloat(form.height) || 0) > 15
                          ? 'border-amber-500'
                          : 'border-zinc-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      ¿Tienes Diseño?
                    </label>
                    <select
                      value={form.has_design}
                      onChange={(e) => setForm({ ...form, has_design: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="si">Sí, archivo listo</option>
                      <option value="ajustes">Tengo logo, falta armado</option>
                      <option value="no">Necesito diseño completo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOQUE 3 */}
              <div className="space-y-4 pt-6 border-t border-zinc-800/80">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="w-6 h-6 rounded-lg bg-red-600 text-white text-xs flex items-center justify-center">
                    3
                  </span>
                  Modalidad de Entrega
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'instalacion',
                      title: 'Instalación en Terreno',
                      desc: 'Nuestro equipo instala en tu local u obra',
                      icon: Truck,
                    },
                    {
                      id: 'retiro',
                      title: 'Retiro en Taller',
                      desc: 'Camino Público S/N, Olivar (Sin recargo)',
                      icon: Store,
                    },
                    {
                      id: 'despacho',
                      title: 'Despacho a Domicilio',
                      desc: 'Envío directo a tu dirección comercial',
                      icon: Package,
                    },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = form.delivery_method === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm({ ...form, delivery_method: opt.id })}
                        className={`text-left p-4 rounded-2xl border transition flex items-start gap-3 ${
                          active
                            ? 'bg-red-600/10 border-red-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 mt-0.5 shrink-0 ${
                            active ? 'text-red-500' : 'text-zinc-500'
                          }`}
                        />
                        <div>
                          <div className="text-sm font-bold text-white">{opt.title}</div>
                          <div className="text-xs text-zinc-400 mt-0.5">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {form.delivery_method !== 'retiro' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Dirección de Instalación o Despacho (Comuna / Referencia)
                    </label>
                    <input
                      type="text"
                      required
                      value={form.delivery_address}
                      onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                      placeholder="Ej: Av. Independencia 480, Rancagua"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}
              </div>

              {/* BLOQUE 4 */}
              <div className="space-y-4 pt-6 border-t border-zinc-800/80">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="w-6 h-6 rounded-lg bg-red-600 text-white text-xs flex items-center justify-center">
                    4
                  </span>
                  Tus Datos de Contacto
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Nombre o Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.client_name}
                      onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                      placeholder="Ej: Comercial Olivar Ltda."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      WhatsApp / Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.client_phone}
                      onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                      placeholder="+56 9 1234 5678"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={form.client_email}
                      onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                      placeholder="correo@empresa.cl"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      RUT Empresa / Persona (Opcional)
                    </label>
                    <input
                      type="text"
                      value={form.client_rut}
                      onChange={(e) => setForm({ ...form, client_rut: e.target.value })}
                      placeholder="76.123.456-7"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Detalles adicionales (altura de instalación, iluminación, fecha ideal, etc.)
                  </label>
                  <textarea
                    rows={3}
                    value={form.comments}
                    onChange={(e) => setForm({ ...form, comments: e.target.value })}
                    placeholder="Cuéntanos cualquier detalle importante para evaluar tu proyecto..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Sin compromiso · Emitimos cotización formal en PDF con valores netos + IVA</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-red-600/25"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Enviando solicitud...' : 'Enviar Solicitud de Cotización'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER OFICIAL 4 COLUMNAS EQUITATIVAS */}
      <footer id="contacto" className="bg-black py-12 px-4 sm:px-8 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 pb-10 items-stretch">
          {/* Columna 1: Marca */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo-white.svg"
                  alt={COMPANY_INFO.name}
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-[10px] px-2 py-0.5 bg-red-600/10 text-red-500 rounded border border-red-600/30 font-mono font-bold">
                  SpA
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Fabricación propia de letreros comerciales, gráfica corporativa, cajones luminosos,
                corte CNC/láser y rotulación vehicular en la Región de O&apos;Higgins.
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-900 text-[11px] text-zinc-500 font-mono">
              RUT: <span className="text-zinc-300">{COMPANY_INFO.rut}</span>
            </div>
          </div>

          {/* Columna 2: Servicios */}
          <div className="flex flex-col space-y-3.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">Servicios</h4>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              {[
                { label: 'Gráfica Corporativa', mat: 'Acrílico Transparente 5mm' },
                { label: 'Letreros en General', mat: 'Aluminio Compuesto 3mm (ACM)' },
                { label: 'Cajones y Letreros Luminosos', mat: 'Cajón Luminoso Galvanizado' },
                { label: 'Señaléticas Viales', mat: 'Adhesivo Reflectante 1.24m' },
                { label: 'Gigantografías (Banner PVC)', mat: 'Tela PVC 380gr (3.20m Gran Formato)' },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => selectServiceAndScroll(item.label, item.mat)}
                    className="hover:text-red-500 transition text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3: Taller & Showroom */}
          <div className="flex flex-col space-y-3.5 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider">Taller & Showroom</h4>
            <div className="space-y-2.5 text-zinc-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <a
                  href={COMPANY_INFO.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition leading-relaxed"
                >
                  {COMPANY_INFO.address}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-zinc-200 font-semibold">
                    Lun a Vie: 10:00 - 20:00 hrs (Continuado)
                  </div>
                  <div className="text-zinc-500 mt-0.5">Sábados, Domingos y Festivos: Cerrado</div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <a
                  href={`tel:${COMPANY_INFO.phone.replace(/\s+/g, '')}`}
                  className="text-zinc-200 hover:text-white font-mono transition"
                >
                  Tel: {COMPANY_INFO.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <a
                  href={`mailto:${COMPANY_INFO.email}`}
                  className="text-red-500 hover:text-red-400 font-mono transition truncate"
                >
                  {COMPANY_INFO.email}
                </a>
              </div>
            </div>
          </div>

          {/* Columna 4: Contacto & Redes */}
          <div className="flex flex-col space-y-3.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
              Contacto & Redes
            </h4>
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${COMPANY_INFO.email}`}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-red-500/50 hover:bg-red-600/10 transition group"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-white shrink-0">
                  <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  Correo
                </span>
                <span className="text-[10px] text-zinc-400 font-mono truncate">
                  {COMPANY_INFO.email}
                </span>
              </a>

              <a
                href={COMPANY_INFO.social.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-600/10 transition group"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-emerald-400 shrink-0">
                  <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                  WhatsApp
                </span>
                <span className="text-[10px] text-zinc-300 font-mono">{COMPANY_INFO.phone}</span>
              </a>

              <a
                href={COMPANY_INFO.social.instagram}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-pink-500/50 hover:bg-pink-600/10 transition group"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-pink-400 shrink-0">
                  <Instagram className="w-3.5 h-3.5 shrink-0" />
                  Instagram
                </span>
                <span className="text-[10px] text-zinc-300">@letreros_olivar</span>
              </a>

              <a
                href={COMPANY_INFO.social.facebook}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-blue-500/50 hover:bg-blue-600/10 transition group"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-blue-400 shrink-0">
                  <Facebook className="w-3.5 h-3.5 shrink-0" />
                  Facebook
                </span>
                <span className="text-[10px] text-zinc-300">Letreros Olivar SpA</span>
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left text-zinc-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} {COMPANY_INFO.name}. RUT: {COMPANY_INFO.rut}. Todos los
            derechos reservados.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onOpenIntranet}
              className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition"
            >
              <Lock className="w-3 h-3" /> Intranet Interna
            </button>
            <span>Olivar, Región de O&apos;Higgins, Chile</span>
          </div>
        </div>
      </footer>

      {/* MODAL DETALLE PORTAFOLIO */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-48 sm:h-60 shrink-0">
              <img
                src={selectedProject.image}
                alt={selectedProject.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-black/75 text-white hover:bg-black transition"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold">
                {selectedProject.category}
              </span>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <span className="text-xs font-mono text-red-400 font-semibold">
                  {selectedProject.client}
                </span>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-white mt-1">
                  {selectedProject.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                  {selectedProject.description}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 sm:p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">
                    Materiales
                  </span>
                  <strong className="text-white">{selectedProject.specs.material}</strong>
                </div>
                {selectedProject.specs.dimensiones && (
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">
                      Dimensiones
                    </span>
                    <strong className="text-white">{selectedProject.specs.dimensiones}</strong>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">
                    Fabricación
                  </span>
                  <strong className="text-white">{selectedProject.specs.tiempoProduccion}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">
                    Garantía
                  </span>
                  <strong className="text-red-400">{selectedProject.specs.garantia}</strong>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    const title = selectedProject.title;
                    setSelectedProject(null);
                    setForm((prev) => ({ ...prev, comments: `Proyecto similar a: ${title}` }));
                    document.getElementById('cotizar')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
                >
                  Cotizar Trabajo Similar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
