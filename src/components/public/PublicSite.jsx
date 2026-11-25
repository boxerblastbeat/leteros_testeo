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
  MessageCircle,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { COMPANY_INFO, PUBLIC_SERVICES } from '../../data/company';
import { PORTFOLIO_PROJECTS } from '../../data/portfolioData';
import { useErp } from '../../context/ErpContext';
import { DELIVERY_LABELS, DESIGN_LABELS } from '../../lib/formatters';

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

  const materialCategories = useMemo(() => {
    const cats = [...new Set(materials.map((m) => m.category))];
    return cats;
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => m.category === form.material_category);
  }, [materials, form.material_category]);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#inicio" className="flex items-center gap-3 group">
            <img
              src="/logo-white.svg"
              alt={COMPANY_INFO.name}
              className="h-9 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="hidden sm:block leading-tight">
              <span className="font-heading font-bold text-white tracking-tight block text-sm">
                LETREROS OLIVAR
              </span>
              <span className="text-[11px] text-zinc-400">Gráfica & Publicidad SpA</span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-300">
            <a href="#servicios" className="hover:text-white transition">
              Servicios
            </a>
            <a href="#portafolio" className="hover:text-white transition">
              Portafolio
            </a>
            <a href="#cotizar" className="hover:text-white transition">
              Cotizar Proyecto
            </a>
            <a href="#contacto" className="hover:text-white transition">
              Taller
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href="#cotizar"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold transition shadow-lg shadow-red-600/20"
            >
              Solicitar Cotización
            </a>
            <button
              onClick={onOpenIntranet}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5"
              title="Acceso interno Taller y Administración"
            >
              <Lock className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">{session ? 'Ir a Intranet' : 'Intranet'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="inicio" className="relative overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.16),_transparent_55%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-12 gap-12 items-center relative">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/10 border border-red-500/25 text-red-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Taller matriz en Olivar · Cobertura Región de O&apos;Higgins
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.08]">
              Fabricamos la imagen que hace{' '}
              <span className="text-red-500">destacar tu negocio</span>.
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Especialistas en letreros luminosos, letras corpóreas 3D, corte láser en acrílico,
              ruteado CNC en aluminio compuesto e impresión gran formato hasta 3.20 metros.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#cotizar"
                className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition flex items-center gap-2 shadow-xl shadow-red-600/25"
              >
                Configurar mi Cotización
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={COMPANY_INFO.social.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-sm transition flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                Hablar por WhatsApp
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-800/80 max-w-lg">
              <div>
                <div className="font-heading text-2xl font-bold text-white">3.20m</div>
                <div className="text-xs text-zinc-400">Impresión gran formato</div>
              </div>
              <div>
                <div className="font-heading text-2xl font-bold text-white">CNC + Láser</div>
                <div className="text-xs text-zinc-400">Acrílico, ACM y PVC</div>
              </div>
              <div>
                <div className="font-heading text-2xl font-bold text-white">En Terreno</div>
                <div className="text-xs text-zinc-400">Instalación garantizada</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Proceso Simple en 3 Pasos
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                  Respuesta rápida
                </span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: '01',
                    title: 'Elige material y medidas',
                    desc: 'Selecciona el sustrato exacto (ACM, Acrílico, Tela PVC, Vinilo, Caja de Luz) y tus dimensiones.',
                  },
                  {
                    step: '02',
                    title: 'Define entrega o instalación',
                    desc: 'Indica si retiras en nuestro taller en Olivar o necesitas instalación en terreno.',
                  },
                  {
                    step: '03',
                    title: 'Recibe cotización formal PDF',
                    desc: 'Evaluamos factibilidad técnica y te enviamos presupuesto oficial con valores netos + IVA.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex gap-3.5 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/70"
                  >
                    <span className="font-mono text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">
              Capacidades de Taller
            </span>
            <h2 className="font-heading text-3xl font-bold text-white mt-1">
              Soluciones en Publicidad Gráfica
            </h2>
          </div>
          <p className="text-sm text-zinc-400 max-w-md">
            Haz clic en cualquier especialidad para precargar el material recomendado en el
            cotizador.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PUBLIC_SERVICES.map((svc) => (
            <button
              key={svc.id}
              type="button"
              onClick={() => selectServiceAndScroll(svc.title, svc.defaultMaterial)}
              className="text-left group p-6 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 hover:border-red-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/25 flex items-center justify-center text-red-500 mb-4 group-hover:scale-105 transition">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-heading text-lg font-bold text-white group-hover:text-red-400 transition">
                  {svc.title}
                </h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{svc.description}</p>
              </div>
              <div className="mt-5 pt-4 border-t border-zinc-800/70 flex items-center justify-between text-xs font-semibold text-zinc-300 group-hover:text-white">
                <span>Cotizar con {svc.defaultMaterial}</span>
                <ArrowRight className="w-4 h-4 text-red-500 group-hover:translate-x-1 transition" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* PORTAFOLIO */}
      <section id="portafolio" className="border-y border-zinc-900 bg-zinc-900/20 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                Proyectos Recientes
              </span>
              <h2 className="font-heading text-3xl font-bold text-white mt-1">
                Trabajos Realizados
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
                className="cursor-pointer group rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col"
              >
                <div className="relative h-52 overflow-hidden bg-zinc-900">
                  <img
                    src={project.image}
                    alt={project.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[11px] font-bold text-white border border-white/10">
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
      <section id="cotizar" className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">
            Cotizador de Proyectos
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-1">
            Solicita tu Presupuesto a Medida
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            Especifica el material, medidas aproximadas y modalidad de entrega. Tu requerimiento
            ingresa directo a nuestra Intranet para emitir tu cotización formal.
          </p>
        </div>

        {submittedRequest ? (
          <div className="rounded-3xl bg-zinc-900/70 border border-emerald-500/30 p-8 sm:p-10 text-center space-y-5 shadow-2xl">
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
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Acelerar por WhatsApp
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
            className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-8"
          >
            {/* BLOQUE 1: SERVICIO Y MATERIAL */}
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

            {/* BLOQUE 2: MEDIDAS Y CANTIDAD */}
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
                    Superficie estimada: <strong className="text-white">{totalArea.toFixed(2)} m²</strong>
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

            {/* BLOQUE 3: MÉTODO DE ENTREGA */}
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
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${active ? 'text-red-500' : 'text-zinc-500'}`} />
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

            {/* BLOQUE 4: DATOS DE CONTACTO */}
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
      </section>

      {/* FOOTER & CONTACTO */}
      <footer id="contacto" className="border-t border-zinc-900 bg-zinc-950 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-10">
          <div className="space-y-3">
            <h3 className="font-heading text-lg font-bold text-white">{COMPANY_INFO.name}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{COMPANY_INFO.tagline}</p>
            <p className="text-xs font-mono text-zinc-500">RUT: {COMPANY_INFO.rut}</p>
          </div>

          <div className="space-y-2.5 text-sm text-zinc-300">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-red-500 shrink-0" />
              <a
                href={COMPANY_INFO.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition"
              >
                {COMPANY_INFO.address}
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-red-500 shrink-0" />
              <span>{COMPANY_INFO.phone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-red-500 shrink-0" />
              <span>{COMPANY_INFO.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-red-500 shrink-0" />
              <span>{COMPANY_INFO.hours}</span>
            </div>
          </div>

          <div className="flex flex-col md:items-end justify-between gap-4">
            <button
              onClick={onOpenIntranet}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition w-fit"
            >
              <Lock className="w-3.5 h-3.5 text-red-500" />
              Acceso Intranet Taller
            </button>
            <p className="text-xs text-zinc-500">
              © {new Date().getFullYear()} {COMPANY_INFO.name}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

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
