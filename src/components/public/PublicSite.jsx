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

  const [form, setForm] = useState({
    service_type: PUBLIC_SERVICES[0].title,
    material_category: 'Acrílicos y Rígidos',
    material_id: 'mat-3',
    material_name: 'Acrílico Transparente 5mm',
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
    const w = parseFloat(form.width) || 0;
    const h = parseFloat(form.height) || 0;
    return w * h;
  }, [form.width, form.height]);

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
      const payload = {
        service_type: form.service_type,
        material_id: form.material_id,
        material_name: form.material_name,
        width: parseFloat(form.width) || null,
        height: parseFloat(form.height) || null,
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
      {/* BARRA SUPERIOR CORPORATIVA (Estilo oficial letrerosolivar.com) */}
      <div className="bg-zinc-950 border-b border-zinc-900 text-xs py-2.5 px-4 sm:px-8 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3 text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-white font-medium">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              Taller Matriz: Olivar, Región de O&apos;Higgins
            </span>
            <span className="hidden lg:inline text-zinc-700">|</span>
            <a
              href={COMPANY_INFO.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center gap-1 text-zinc-300 hover:text-red-500 transition underline underline-offset-4 decoration-red-600/50"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              {COMPANY_INFO.address}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <a
              href={`mailto:${COMPANY_INFO.email}`}
              className="text-zinc-300 hover:text-red-500 transition font-mono hidden md:flex items-center gap-1.5"
              title={`Enviar correo a ${COMPANY_INFO.email}`}
            >
              <Mail className="w-3.5 h-3.5 text-red-500" />
              <span>{COMPANY_INFO.email}</span>
            </a>
            <a
              href={`tel:${COMPANY_INFO.phone.replace(/\s+/g, '')}`}
              className="hover:text-red-500 transition font-mono flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5 text-red-500" />
              <span>{COMPANY_INFO.phone}</span>
            </a>
            <a
              href={COMPANY_INFO.social.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <a
              href={COMPANY_INFO.social.instagram}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-pink-500 hidden sm:flex items-center gap-1 transition"
              title="Instagram @letreros_olivar"
            >
              <Instagram className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Instagram</span>
            </a>
            <a
              href={COMPANY_INFO.social.facebook}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-blue-500 hidden sm:flex items-center gap-1 transition"
              title="Facebook Letreros Olivar"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Facebook</span>
            </a>

            <div className="border-l border-zinc-800 pl-3 sm:pl-4">
              <button
                onClick={onOpenIntranet}
                className="text-red-500 hover:text-red-400 font-bold flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 px-3 py-1.5 rounded-xl border border-red-600/30 text-xs transition"
                title="Acceso directo a la Intranet de Taller y Cotizaciones"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{session ? 'Ir a Intranet' : 'Acceso Intranet'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NAVBAR PRINCIPAL STICKY (Estilo oficial letrerosolivar.com) */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-4 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="#inicio" className="flex items-center gap-3 group">
            <img
              src="/logo-white.svg"
              alt={COMPANY_INFO.name}
              className="h-10 sm:h-12 w-auto object-contain group-hover:scale-105 transition"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 bg-red-600/10 text-red-500 rounded border border-red-600/30 font-mono font-bold">
              SpA
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-zinc-300">
            <a href="#servicios" className="hover:text-red-500 transition">
              Servicios
            </a>
            <a href="#portafolio" className="hover:text-red-500 transition">
              Galería de Trabajos
            </a>
            <a
              href="#cotizar"
              className="flex items-center gap-1.5 text-red-500 hover:text-red-400 transition font-bold"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              Solicitar Cotización
            </a>
            <a
              href={COMPANY_INFO.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-red-500 transition flex items-center gap-1"
            >
              <MapPin className="w-4 h-4 text-red-500" />
              Cómo Llegar
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href={COMPANY_INFO.social.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/35 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
            <a
              href="#cotizar"
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl text-xs tracking-wide shadow-lg shadow-red-600/25 transition hover:shadow-red-600/40 flex items-center gap-2"
            >
              <span>Cotizar mi Proyecto</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION (Estilo oficial letrerosolivar.com) */}
      <section
        id="inicio"
        className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-8 border-b border-zinc-900"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/35 via-black to-black pointer-events-none" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
          <div className="lg:col-span-7 space-y-6">
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
                href={COMPANY_INFO.social.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition text-sm flex items-center gap-2"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>WhatsApp Taller</span>
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
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-zinc-900">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-white font-heading">
                  +1,800
                </span>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">Letreros Instalados</p>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-red-600 font-heading">
                  Corte CNC
                </span>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">Láser & Ruteado 3D</p>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-white font-heading">
                  3.20m
                </span>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">Impresión Ecosolvente</p>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-6 h-6 rounded-lg bg-red-600 text-white text-xs flex items-center justify-center">
                      2
                    </span>
                    Dimensiones y Diseño
                  </div>
                  {totalArea > 0 && (
                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-red-500" />
                      Superficie estimada:{' '}
                      <strong className="text-white">{totalArea.toFixed(2)} m²</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Ancho (metros)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.width}
                      onChange={(e) => setForm({ ...form, width: e.target.value })}
                      placeholder="Ej: 2.40"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Alto (metros)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.height}
                      onChange={(e) => setForm({ ...form, height: e.target.value })}
                      placeholder="Ej: 1.20"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500"
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
                  <span>Sin compromiso · Emitimos cotización formal con RUT {COMPANY_INFO.rut}</span>
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

      {/* FOOTER OFICIAL CON TARJETAS DE CONTACTO & REDES */}
      <footer id="contacto" className="bg-black py-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10 pb-10">
          <div className="space-y-3">
            <img
              src="/logo-white.svg"
              alt={COMPANY_INFO.name}
              className="h-10 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <p className="text-xs text-zinc-400 leading-relaxed">{COMPANY_INFO.tagline}</p>
            <div className="space-y-1.5 text-xs text-zinc-400 pt-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <a
                  href={COMPANY_INFO.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition"
                >
                  {COMPANY_INFO.address}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>{COMPANY_INFO.hours}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider">Cobertura Regional</h4>
            <p className="text-zinc-400 leading-relaxed">
              Atendemos fabricación, despachos e instalaciones en terreno en{' '}
              <strong className="text-zinc-200">
                Olivar, Rancagua, Machalí, Gultro, Requínoa, Rengo, Graneros, Mostazal, Doñihue,
                Coltauco, Coinco y San Vicente
              </strong>
              .
            </p>
            <a
              href={COMPANY_INFO.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-500/40 text-zinc-300 hover:text-white font-semibold transition"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              Abrir ubicación en Google Maps
            </a>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">
              Contacto & Redes
            </h4>
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${COMPANY_INFO.email}`}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-red-500/50 hover:bg-red-600/10 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center group-hover:scale-110 transition">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-xs text-white">Correo Oficial</strong>
                  <span className="text-[11px] text-zinc-400 font-mono">{COMPANY_INFO.email}</span>
                </div>
              </a>

              <a
                href={COMPANY_INFO.social.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-600/10 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                  <WhatsAppIcon className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-xs text-white">WhatsApp Taller</strong>
                  <span className="text-[11px] text-zinc-300 font-mono">{COMPANY_INFO.phone}</span>
                </div>
              </a>

              <a
                href={COMPANY_INFO.social.instagram}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-pink-500/50 hover:bg-pink-600/10 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-pink-600/20 text-pink-500 flex items-center justify-center group-hover:scale-110 transition">
                  <Instagram className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-xs text-white">Instagram</strong>
                  <span className="text-[11px] text-zinc-300">@letreros_olivar</span>
                </div>
              </a>

              <a
                href={COMPANY_INFO.social.facebook}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-blue-500/50 hover:bg-blue-600/10 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-500 flex items-center justify-center group-hover:scale-110 transition">
                  <Facebook className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-xs text-white">Facebook</strong>
                  <span className="text-[11px] text-zinc-300">Letreros Olivar SpA</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-zinc-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} {COMPANY_INFO.name}. RUT: {COMPANY_INFO.rut}. Todos los
            derechos reservados.
          </div>
          <div className="flex items-center gap-4">
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

      {/* BOTÓN FLOTANTE DE WHATSAPP */}
      <a
        href={COMPANY_INFO.social.whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        className="no-print fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xl shadow-emerald-600/40 border border-emerald-400/40 transition hover:scale-105"
      >
        <WhatsAppIcon className="w-5 h-5" />
        <span className="hidden sm:inline">WhatsApp Taller</span>
      </a>

      {/* MODAL DETALLE PORTAFOLIO */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-60">
              <img
                src={selectedProject.image}
                alt={selectedProject.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/75 text-white hover:bg-black transition"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="absolute bottom-4 left-6 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold">
                {selectedProject.category}
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-mono text-red-400 font-semibold">
                  {selectedProject.client}
                </span>
                <h3 className="font-heading text-xl font-bold text-white mt-1">
                  {selectedProject.title}
                </h3>
                <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                  {selectedProject.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs">
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
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition"
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
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
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
