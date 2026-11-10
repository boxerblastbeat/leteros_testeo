import React, { useState, useEffect, useMemo } from 'react';
import { PRODUCTS_CATALOG } from './data/products';
import { PORTFOLIO_PROJECTS } from './data/portfolioData';

// Formato de moneda CLP (Pesos Chilenos)
const formatCLP = (val) => '$' + Math.round(val || 0).toLocaleString('es-CL');

// SVG Icons
const Icon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    printer: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />,
    trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
    plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    history: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    sparkles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />,
    layers: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
    'file-text': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    'arrow-right': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
    eye: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>,
    'map-pin': <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    lock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
    truck: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></>,
    store: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  };

  if (name === 'whatsapp') {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.676.15s-.777.979-.953 1.18c-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.897-.8-1.503-1.788-1.68-2.089-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.2-.301.301-.502.1-.2.05-.376-.025-.527-.075-.15-.676-1.63-.927-2.233-.244-.588-.492-.508-.676-.517-.175-.009-.376-.011-.577-.011s-.527.075-.803.376c-.276.301-1.054 1.03-1.054 2.51 0 1.48 1.079 2.91 1.23 3.111.15.2 2.122 3.24 5.141 4.544.718.31 1.278.496 1.715.635.722.23 1.38.197 1.9.12.58-.087 1.78-.727 2.03-1.43.25-.703.25-1.306.175-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.981-1.307A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.608 0-3.112-.455-4.394-1.246l-.315-.194-2.96.776.79-2.885-.213-.339A8.156 8.156 0 013.8 12c0-4.521 3.679-8.2 8.2-8.2s8.2 3.679 8.2 8.2c0 4.521-3.679 8.2-8.2 8.2z" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[name] || null}
    </svg>
  );
};

export default function App() {
  const [companyInfo] = useState({
    name: 'LETREROS OLIVAR SpA',
    tagline: 'Letreros Comerciales, Corpóreos 3D & Publicidad Gráfica',
    rut: '77.880.952-4',
    phone: '+56 9 5158 5884',
    whatsapp: '56951585884',
    email: 'contacto@letrerosolivar.com',
    address: 'Ruta H-40, Olivar, Región de O\'Higgins, Chile',
    mapsUrl: 'https://maps.app.goo.gl/CAhXECLhAJ12AzEC9',
    web: 'www.letrerosolivar.com'
  });

  const [currentView, setCurrentView] = useState('public');
  const [isIntranetLoggedIn, setIsIntranetLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [intranetTab, setIntranetTab] = useState('cotizador');

  // Formulario público cliente (sin precios)
  const [clientRequest, setClientRequest] = useState({
    serviceType: '1. Gráfica Corporativa (Placas de Recepción, Acrílico, Distanciadores)',
    material: 'Acrílico cristal 5mm con distanciadores de acero inoxidable',
    width: '', height: '', quantity: 1,
    deliveryMethod: 'instalacion', hasDesign: 'si', comments: '',
    clientName: '', clientRUT: '', clientPhone: '', clientEmail: '', deliveryAddress: ''
  });

  // Bandeja de solicitudes
  const [receivedRequests, setReceivedRequests] = useState(() => {
    const saved = localStorage.getItem('olivar_client_requests');
    return saved ? JSON.parse(saved) : [
      {
        id: 'REQ-2026-0001',
        date: '08/11/2026',
        clientName: 'Restobar Plaza Olivar',
        clientRUT: '76.890.123-5',
        clientPhone: '+56 9 8765 4321',
        clientEmail: 'contacto@plazolivar.cl',
        serviceType: '1. Gráfica Corporativa (Placas de Recepción, Acrílico, Distanciadores)',
        material: 'Acrílico cristal 8mm con gráfica corporativa y distanciadores',
        width: '3.5', height: '1.2', quantity: 1,
        deliveryMethod: 'instalacion', deliveryAddress: 'Plaza Esmeralda #45, Olivar Alto',
        hasDesign: 'si', comments: 'Instalación en fachada a 4m de altura.', status: 'Pendiente'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('olivar_client_requests', JSON.stringify(receivedRequests));
  }, [receivedRequests]);

  // Cotizador privado en Intranet
  const [correlativeNumber, setCorrelativeNumber] = useState(() => {
    const saved = localStorage.getItem('olivar_correlative');
    return saved ? parseInt(saved, 10) : 101;
  });

  const [quoteHistory, setQuoteHistory] = useState(() => {
    const saved = localStorage.getItem('olivar_quotes_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [intranetClientData, setIntranetClientData] = useState({
    name: '', documentId: '', phone: '', email: '', deliveryAddress: '',
    deliveryMethod: 'instalacion', validDays: 15, paymentTerms: '50% Anticipo y 50% contra entrega'
  });

  const [quoteItems, setQuoteItems] = useState([{
    id: 'item-1', productId: 'grafica-corporativa-prod',
    name: 'Placa de Recepción en Acrílico con Distanciadores',
    calcType: 'unit', width: null, height: null, quantity: 1,
    unitPrice: 95000, unitLabel: 'conjunto',
    selectedOptions: ['distanciadores-inox', 'instalacion-obra'],
    optionsTotal: 40000, subtotal: 135000
  }]);

  const [newItemProductId, setNewItemProductId] = useState('grafica-corporativa-prod');
  const [newItemWidth, setNewItemWidth] = useState(3.0);
  const [newItemHeight, setNewItemHeight] = useState(1.2);
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCustomName, setNewItemCustomName] = useState('');
  const [newItemCustomPrice, setNewItemCustomPrice] = useState(80000);
  const [newItemOptions, setNewItemOptions] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxRate, setTaxRate] = useState(19);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [currentQuoteToPrint, setCurrentQuoteToPrint] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3500); };

  useEffect(() => { localStorage.setItem('olivar_correlative', correlativeNumber.toString()); }, [correlativeNumber]);
  useEffect(() => { localStorage.setItem('olivar_quotes_history', JSON.stringify(quoteHistory)); }, [quoteHistory]);

  const selectedProductConfig = useMemo(() => PRODUCTS_CATALOG.find(p => p.id === newItemProductId) || PRODUCTS_CATALOG[0], [newItemProductId]);

  const financialTotals = useMemo(() => {
    const subtotal = quoteItems.reduce((acc, item) => acc + item.subtotal, 0);
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round((taxableSubtotal * taxRate) / 100);
    return { subtotal, discountAmount, taxableSubtotal, taxAmount, total: taxableSubtotal + taxAmount };
  }, [quoteItems, discountPercent, taxRate]);

  const currentCorrelativeCode = useMemo(() => `COT-${new Date().getFullYear()}-${String(correlativeNumber).padStart(4, '0')}`, [correlativeNumber]);

  // Auth Intranet
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginPassword === 'olivar2026' || loginPassword === 'admin' || loginPassword === '1234') {
      setIsIntranetLoggedIn(true);
      setCurrentView('intranet');
      setShowLoginModal(false);
      setLoginPassword('');
      setLoginError('');
      showToast('🔓 Sesión de Intranet iniciada');
    } else {
      setLoginError('Contraseña incorrecta. Acceso denegado.');
    }
  };

  const handleLogout = () => {
    setIsIntranetLoggedIn(false);
    setCurrentView('public');
    showToast('🔒 Sesión cerrada');
  };

  // Envío cliente desde web pública
  const handleCustomerRequestSubmit = (e) => {
    e.preventDefault();
    if (!clientRequest.clientName.trim() || !clientRequest.clientPhone.trim()) {
      alert('Ingresa al menos tu nombre y teléfono.'); return;
    }
    const newReq = {
      id: `REQ-${new Date().getFullYear()}-${String(receivedRequests.length + 1).padStart(4, '0')}`,
      date: new Date().toLocaleDateString('es-CL'),
      timestamp: Date.now(),
      ...clientRequest,
      status: 'Pendiente'
    };
    setReceivedRequests([newReq, ...receivedRequests]);

    let msg = `*🛠️ NUEVA SOLICITUD DE COTIZACIÓN (${newReq.id})*\n*👤 Cliente:* ${clientRequest.clientName} ${clientRequest.clientRUT ? `(RUT: ${clientRequest.clientRUT})` : ''}\n*📞 Tel:* ${clientRequest.clientPhone}\n\n*📐 DETALLES:*\n• *Servicio:* ${clientRequest.serviceType}\n• *Material:* ${clientRequest.material || 'A definir'}\n`;
    if (clientRequest.width && clientRequest.height) msg += `• *Medidas:* ${clientRequest.width}m x ${clientRequest.height}m (${clientRequest.quantity} ud)\n`;
    msg += `• *Modalidad:* ${clientRequest.deliveryMethod === 'instalacion' ? '🚚 Instalación en Terreno' : '🏬 Retiro en Taller (Olivar)'}\n`;
    if (clientRequest.deliveryMethod === 'instalacion' && clientRequest.deliveryAddress) msg += `• *Lugar:* ${clientRequest.deliveryAddress}\n`;
    if (clientRequest.comments) msg += `• *Notas:* ${clientRequest.comments}\n`;

    showToast(`🎉 Solicitud ${newReq.id} enviada`);
    window.open(`https://wa.me/${companyInfo.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleImportRequestToQuote = (req) => {
    setIntranetClientData({
      name: req.clientName, documentId: req.clientRUT || '',
      phone: req.clientPhone || '', email: req.clientEmail || '',
      deliveryAddress: req.deliveryAddress || '', deliveryMethod: req.deliveryMethod || 'instalacion',
      validDays: 15, paymentTerms: '50% Anticipo y 50% contra entrega'
    });
    const matched = PRODUCTS_CATALOG.find(p => p.name.toLowerCase().includes(req.serviceType.toLowerCase())) || PRODUCTS_CATALOG[0];
    setNewItemProductId(matched.id);
    if (req.width) setNewItemWidth(parseFloat(req.width) || 3.0);
    if (req.height) setNewItemHeight(parseFloat(req.height) || 1.2);
    if (req.quantity) setNewItemQty(parseInt(req.quantity) || 1);
    setIntranetTab('cotizador');
    showToast(`📋 Requerimiento de ${req.clientName} cargado`);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const p = selectedProductConfig;
    let itemSubtotal = 0, optionsCost = 0;

    if (p.calcType === 'sqm') {
      const area = (parseFloat(newItemWidth) || 0) * (parseFloat(newItemHeight) || 0);
      optionsCost = newItemOptions.reduce((a, id) => a + (p.options.find(o => o.id === id)?.price || 0), 0);
      itemSubtotal = (p.defaultPrice + optionsCost) * area * (parseInt(newItemQty) || 1);
    } else if (p.calcType === 'custom') {
      itemSubtotal = (parseFloat(newItemCustomPrice) || 0) * (parseInt(newItemQty) || 1);
    } else {
      optionsCost = newItemOptions.reduce((a, id) => a + (p.options.find(o => o.id === id)?.price || 0), 0);
      itemSubtotal = (p.defaultPrice + optionsCost) * (parseInt(newItemQty) || 1);
    }

    setQuoteItems([...quoteItems, {
      id: 'item-' + Date.now(), productId: p.id,
      name: p.calcType === 'custom' && newItemCustomName.trim() ? newItemCustomName : p.name,
      calcType: p.calcType,
      width: p.calcType === 'sqm' ? parseFloat(newItemWidth) : null,
      height: p.calcType === 'sqm' ? parseFloat(newItemHeight) : null,
      quantity: parseInt(newItemQty) || 1,
      unitPrice: p.calcType === 'custom' ? parseFloat(newItemCustomPrice) : p.defaultPrice,
      unitLabel: p.unitLabel, selectedOptions: [...newItemOptions], optionsTotal: optionsCost,
      subtotal: Math.round(itemSubtotal)
    }]);
    setNewItemOptions([]); setNewItemCustomName('');
    showToast('✅ Ítem añadido a la cotización interna');
  };

  const handleEmitQuote = () => {
    if (!intranetClientData.name.trim()) { alert('Ingresa el nombre o razón social.'); return; }
    if (quoteItems.length === 0) { alert('La cotización debe tener al menos un ítem.'); return; }
    const rec = {
      correlative: currentCorrelativeCode, numericCorrelative: correlativeNumber,
      date: new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      timestamp: Date.now(), client: { ...intranetClientData }, items: [...quoteItems],
      totals: { ...financialTotals }, discountPercent, taxRate, status: 'Emitida'
    };
    setQuoteHistory([rec, ...quoteHistory]);
    setCorrelativeNumber(prev => prev + 1);
    setCurrentQuoteToPrint(rec); setShowPrintModal(true);
    showToast(`🎉 Cotización ${rec.correlative} emitida con éxito.`);
  };

  const handleSendWhatsAppQuote = (quote) => {
    const q = quote || { correlative: currentCorrelativeCode, client: intranetClientData, items: quoteItems, totals: financialTotals };
    let msg = `*📋 COTIZACIÓN: ${q.correlative}*\n*🏢* ${companyInfo.name}\n*👤* ${q.client.name} ${q.client.documentId ? `(RUT: ${q.client.documentId})` : ''}\n*📅* ${q.date || new Date().toLocaleDateString()}\n*🚚* ${q.client.deliveryMethod === 'instalacion' ? 'Instalación en Terreno' : 'Retiro en Taller (Olivar)'}\n\n*📦 DETALLE:*\n`;
    q.items.forEach((item, i) => {
      const spec = item.calcType === 'sqm' ? `(${item.width}m x ${item.height}m = ${(item.width * item.height * item.quantity).toFixed(2)} m²)` : `(${item.quantity} ${item.unitLabel})`;
      msg += `${i + 1}. *${item.name}* ${spec} ➔ ${formatCLP(item.subtotal)}\n`;
    });
    msg += `\n*💵 Subtotal Neto:* ${formatCLP(q.totals.subtotal)}`;
    if (q.totals.taxAmount > 0) msg += `\n*🏛️ IVA (19%):* ${formatCLP(q.totals.taxAmount)}`;
    msg += `\n*💰 TOTAL FINAL: ${formatCLP(q.totals.total)} CLP*\n\n*⏱️ Fabricación:* 3-5 días hábiles\n*📍 Taller:* ${companyInfo.address}`;
    const phone = (q.client.phone || '').replace(/\D/g, '') || companyInfo.whatsapp;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredProjects = useMemo(() => activeCategory === 'Todos' ? PORTFOLIO_PROJECTS : PORTFOLIO_PROJECTS.filter(p => p.category === activeCategory), [activeCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100 selection:bg-red-600 selection:text-white">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-5 py-3 rounded-xl font-bold shadow-2xl border border-red-400 animate-bounce">{toastMessage}</div>
      )}

      {/* BARRA SUPERIOR */}
      <div className="bg-zinc-950 border-b border-zinc-900 text-xs py-2.5 px-4 sm:px-8 flex flex-wrap justify-between items-center text-zinc-400 no-print">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-white font-medium">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            Taller: Olivar, Región de O'Higgins
          </span>
          <span className="hidden md:inline text-zinc-600">|</span>
          <a href={companyInfo.mapsUrl} target="_blank" rel="noreferrer" className="hidden md:inline text-zinc-300 hover:text-red-500 transition underline underline-offset-4 decoration-red-600/50">
            📍 {companyInfo.address}
          </a>
        </div>
        <div className="flex items-center gap-5">
          <a href={`tel:${companyInfo.phone}`} className="hover:text-red-500 transition font-mono">📞 {companyInfo.phone}</a>
          <a href={`https://wa.me/${companyInfo.whatsapp}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition">
            <Icon name="whatsapp" className="w-3.5 h-3.5" /> WhatsApp
          </a>
          {isIntranetLoggedIn ? (
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
              <button onClick={() => setCurrentView(currentView === 'intranet' ? 'public' : 'intranet')} className="text-red-500 hover:text-red-400 font-bold flex items-center gap-1 bg-red-600/10 px-2.5 py-1 rounded-lg border border-red-600/30">
                <Icon name="lock" className="w-3 h-3" /><span>{currentView === 'intranet' ? 'Ver Web' : 'Intranet'}</span>
              </button>
              <button onClick={handleLogout} className="text-zinc-500 hover:text-white" title="Cerrar Sesión"><Icon name="x" className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="text-zinc-500 hover:text-white border-l border-zinc-800 pl-4 flex items-center gap-1 transition">
              <Icon name="lock" className="w-3 h-3 text-red-600" /><span>Intranet</span>
            </button>
          )}
        </div>
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-4 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="#" onClick={() => setCurrentView('public')} className="flex items-center gap-3 group">
            <img src="/logo-white.svg" alt="Letreros Olivar SpA" className="h-10 sm:h-12 w-auto group-hover:scale-105 transition" />
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 bg-red-600/10 text-red-500 rounded border border-red-600/30 font-mono font-bold">SpA</span>
          </a>

          {currentView === 'public' ? (
            <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-zinc-300">
              <a href="#servicios" className="hover:text-red-500 transition">Servicios</a>
              <a href="#portafolio" className="hover:text-red-500 transition">Portafolio</a>
              <a href="#solicitud-cotizacion" className="flex items-center gap-1.5 text-red-500 hover:text-red-400 transition font-bold">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>Solicitar Cotización
              </a>
              <a href={companyInfo.mapsUrl} target="_blank" rel="noreferrer" className="hover:text-red-500 transition flex items-center gap-1 text-zinc-400">
                <Icon name="map-pin" className="w-4 h-4 text-red-500" /><span>Ubicación</span>
              </a>
            </nav>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full bg-red-600 text-white font-bold flex items-center gap-1.5">
              <Icon name="lock" className="w-3 h-3" /> INTRANET TALLER ACTIVA
            </span>
          )}

          <div>
            {currentView === 'public' ? (
              <a href="#solicitud-cotizacion" className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl text-xs tracking-wide shadow-lg shadow-red-600/25 transition flex items-center gap-2">
                <span>Cotizar mi Proyecto</span><Icon name="arrow-right" className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button onClick={() => setCurrentView('public')} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 py-2 rounded-xl text-xs border border-zinc-700 transition">
                ← Volver a la Web Pública
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MODO PÚBLICO */}
      {currentView === 'public' && (
        <main>
          {/* HERO */}
          <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-8 border-b border-zinc-900 no-print">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/30 via-black to-black"></div>
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-xs font-bold uppercase tracking-wider">
                  <Icon name="sparkles" className="w-4 h-4" /> Instalación en Terreno o Retiro en Taller
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-none font-heading">
                  Letreros y Publicidad Gráfica de <span className="text-red-600">Alto Impacto</span>
                </h1>
                <p className="text-base sm:text-lg text-zinc-300 max-w-2xl leading-relaxed">
                  En <strong className="text-white">Letreros Olivar SpA</strong> fabricamos e instalamos letreros en general, gráfica corporativa, cajones luminosos, gigantografías, cortes láser en acrílico y mecanizado CNC en aluminio compuesto. Selecciona tu proyecto y recibe una propuesta a la medida de tu negocio.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a href="#solicitud-cotizacion" className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-6 py-3.5 rounded-xl shadow-xl shadow-red-600/30 transition flex items-center gap-2 text-sm">
                    <span>Solicitar Presupuesto Online</span><Icon name="arrow-right" className="w-4 h-4" />
                  </a>
                  <a href={companyInfo.mapsUrl} target="_blank" rel="noreferrer" className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-6 py-3.5 rounded-xl border border-zinc-700 transition text-sm flex items-center gap-2">
                    <Icon name="map-pin" className="w-4 h-4 text-red-500" /><span>Ver Taller en Olivar</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* FORMULARIO PÚBLICO (SIN PRECIOS) */}
          <section id="solicitud-cotizacion" className="py-20 px-4 sm:px-8 bg-zinc-950 border-b border-zinc-900 no-print">
            <div className="max-w-4xl mx-auto space-y-10">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-xs font-bold">
                  <Icon name="file-text" className="w-4 h-4" /> Formulario de Requerimientos
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading">Solicita tu Cotización a Medida</h2>
                <p className="text-zinc-400 text-sm max-w-2xl mx-auto">Indica las características de tu proyecto (materiales, medidas y modalidad). Nuestro equipo calculará la mejor alternativa y te enviará la propuesta oficial.</p>
              </div>

              <form onSubmit={handleCustomerRequestSubmit} className="bg-black p-6 sm:p-10 rounded-2xl border border-zinc-800 shadow-2xl space-y-8">
                {/* 1. SERVICIO Y MATERIAL */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-heading">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>1. Servicio y Materiales
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">Servicio Publicitario *</label>
                      <select value={clientRequest.serviceType} onChange={(e) => setClientRequest({ ...clientRequest, serviceType: e.target.value })} className="w-full bg-zinc-950 text-white px-3.5 py-3 rounded-xl border border-zinc-800 focus:border-red-600 focus:outline-none" required>
                        <option value="1. Gráfica Corporativa (Placas de Recepción, Acrílico, Distanciadores)">1. Gráfica Corporativa (Placas de recepción, acrílico, distanciadores)</option>
                        <option value="2. Señéticas Viales (Reglamentarias, Faena, Reflectantes)">2. Señéticas Viales (Reglamentarias, faenas, reflectantes)</option>
                        <option value="3. Gigantografías (Banner PVC, Palomas Publicitarias)">3. Gigantografías (Banner PVC, palomas publicitarias)</option>
                        <option value="4. Letreros en General (Bastidores Metálicos, Placas Rígidas)">4. Letreros en General (Bastidores metálicos, placas rígidas)</option>
                        <option value="5. Cajones Luminosos (Cajas de Luz para Fachadas)">5. Cajones Luminosos (Cajas de luz para fachadas)</option>
                        <option value="6. Corte y Grabado Láser en Acrílico">6. Corte y Grabado Láser en Acrílico</option>
                        <option value="7. Cortes con CNC en Aluminio Compuesto (ACM)">7. Cortes con CNC en Aluminio Compuesto (ACM)</option>
                        <option value="8. Impresión de Gran Formato (Plotter Ecosolvente 3.20m)">8. Impresión de Gran Formato (Plotter ecosolvente 3.20m)</option>
                        <option value="9. Todo lo que sea Publicitario (Estructuras y Letreros a Medida)">9. Todo lo que sea Publicitario (Estructuras y letreros a medida)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">Material o Acabado Preferido</label>
                      <input type="text" placeholder="Acrílico cristal, lona backlight, aluminio compuesto ACM..." value={clientRequest.material} onChange={(e) => setClientRequest({ ...clientRequest, material: e.target.value })} className="w-full bg-zinc-950 text-white px-3.5 py-3 rounded-xl border border-zinc-800" />
                    </div>
                  </div>
                </div>

                {/* 2. MEDIDAS Y CANTIDAD */}
                <div className="space-y-4 pt-4 border-t border-zinc-900">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-heading">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>2. Dimensiones Estimadas y Cantidad
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-400 mb-1">Ancho (metros):</label>
                      <input type="number" step="0.01" placeholder="Ej: 3.5" value={clientRequest.width} onChange={(e) => setClientRequest({ ...clientRequest, width: e.target.value })} className="w-full bg-zinc-950 text-white px-3 py-2.5 rounded-xl border border-zinc-800 font-mono" />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Alto (metros):</label>
                      <input type="number" step="0.01" placeholder="Ej: 1.2" value={clientRequest.height} onChange={(e) => setClientRequest({ ...clientRequest, height: e.target.value })} className="w-full bg-zinc-950 text-white px-3 py-2.5 rounded-xl border border-zinc-800 font-mono" />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Cantidad:</label>
                      <input type="number" min="1" value={clientRequest.quantity} onChange={(e) => setClientRequest({ ...clientRequest, quantity: parseInt(e.target.value) || 1 })} className="w-full bg-zinc-950 text-white px-3 py-2.5 rounded-xl border border-zinc-800 font-mono" required />
                    </div>
                  </div>
                </div>

                {/* 3. MODALIDAD DE ENTREGA */}
                <div className="space-y-4 pt-4 border-t border-zinc-900">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-heading">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>3. Modalidad de Entrega
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${clientRequest.deliveryMethod === 'instalacion' ? 'bg-red-600/10 border-red-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                      <input type="radio" name="deliveryMethod" value="instalacion" checked={clientRequest.deliveryMethod === 'instalacion'} onChange={(e) => setClientRequest({ ...clientRequest, deliveryMethod: e.target.value })} className="mt-1 text-red-600" />
                      <div>
                        <div className="flex items-center gap-2 font-bold text-sm text-white font-heading"><Icon name="truck" className="w-4 h-4 text-red-500" /><span>Instalación en Terreno / Obra</span></div>
                        <p className="text-xs text-zinc-400 mt-1">Montaje profesional en altura, fachada o local comercial.</p>
                      </div>
                    </label>
                    <label className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${clientRequest.deliveryMethod === 'retiro' ? 'bg-red-600/10 border-red-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                      <input type="radio" name="deliveryMethod" value="retiro" checked={clientRequest.deliveryMethod === 'retiro'} onChange={(e) => setClientRequest({ ...clientRequest, deliveryMethod: e.target.value })} className="mt-1 text-red-600" />
                      <div>
                        <div className="flex items-center gap-2 font-bold text-sm text-white font-heading"><Icon name="store" className="w-4 h-4 text-white" /><span>Retiro en Taller (Olivar)</span></div>
                        <p className="text-xs text-zinc-400 mt-1">Retiras en taller matriz en Ruta H-40, Olivar.</p>
                      </div>
                    </label>
                  </div>
                  {clientRequest.deliveryMethod === 'instalacion' && (
                    <div className="pt-2 text-xs">
                      <label className="block text-zinc-300 font-semibold mb-1">Dirección o Comuna de Instalación *</label>
                      <input type="text" placeholder="Ej: Rancagua Centro / Av. Einstein #320" value={clientRequest.deliveryAddress} onChange={(e) => setClientRequest({ ...clientRequest, deliveryAddress: e.target.value })} className="w-full bg-zinc-950 text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:border-red-600 focus:outline-none" required />
                    </div>
                  )}
                </div>

                {/* 4. DATOS CONTACTO */}
                <div className="space-y-4 pt-4 border-t border-zinc-900">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-heading">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>4. Tus Datos de Contacto
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">Nombre o Razón Social *</label>
                      <input type="text" placeholder="Marcelo Gómez / Comercial del Sur" value={clientRequest.clientName} onChange={(e) => setClientRequest({ ...clientRequest, clientName: e.target.value })} className="w-full bg-zinc-950 text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:border-red-600 focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">RUT</label>
                      <input type="text" placeholder="76.123.456-7" value={clientRequest.clientRUT} onChange={(e) => setClientRequest({ ...clientRequest, clientRUT: e.target.value })} className="w-full bg-zinc-950 text-white px-3.5 py-2.5 rounded-xl border border-zinc-800" />
                    </div>
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">WhatsApp de Contacto *</label>
                      <input type="text" placeholder="+56 9 1234 5678" value={clientRequest.clientPhone} onChange={(e) => setClientRequest({ ...clientRequest, clientPhone: e.target.value })} className="w-full bg-zinc-950 text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:border-red-600 focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">Correo Electrónico</label>
                      <input type="email" placeholder="tunombre@empresa.cl" value={clientRequest.clientEmail} onChange={(e) => setClientRequest({ ...clientRequest, clientEmail: e.target.value })} className="w-full bg-zinc-950 text-white px-3.5 py-2.5 rounded-xl border border-zinc-800" />
                    </div>
                  </div>
                  <div className="text-xs pt-2">
                    <label className="block text-zinc-300 font-semibold mb-1">Detalles o Notas</label>
                    <textarea rows="3" placeholder="Superficie, altura, dudas..." value={clientRequest.comments} onChange={(e) => setClientRequest({ ...clientRequest, comments: e.target.value })} className="w-full bg-zinc-950 text-white p-3 rounded-xl border border-zinc-800 focus:border-red-600 focus:outline-none"></textarea>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-zinc-500">Se abrirá un chat directo con nuestro WhatsApp comercial para seguimiento.</p>
                  <button type="submit" className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-extrabold px-8 py-3.5 rounded-xl shadow-xl shadow-red-600/30 transition flex items-center justify-center gap-2 text-sm">
                    <Icon name="whatsapp" className="w-4 h-4" /><span>Enviar Solicitud a Taller</span>
                  </button>
                </div>
              </form>
            </div>
          </section>
        </main>
      )}

      {/* MODO INTRANET */}
      {currentView === 'intranet' && (
        <main className="flex-1 bg-zinc-950 py-8 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="p-6 rounded-2xl bg-black border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold mb-2">
                  <Icon name="lock" className="w-3 h-3" /> PANEL PRIVADO DE COTIZACIONES
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white font-heading">Intranet Taller Letreros Olivar SpA</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setIntranetTab('cotizador')} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${intranetTab === 'cotizador' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
                  <Icon name="file-text" className="w-4 h-4" /><span>Cotizador Correlativo</span>
                </button>
                <button onClick={() => setIntranetTab('solicitudes')} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${intranetTab === 'solicitudes' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
                  <Icon name="truck" className="w-4 h-4" /><span>Solicitudes Web ({receivedRequests.length})</span>
                </button>
                <button onClick={() => setIntranetTab('historial')} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${intranetTab === 'historial' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
                  <Icon name="history" className="w-4 h-4" /><span>Historial ({quoteHistory.length})</span>
                </button>
              </div>
            </div>

            {/* TAB SOLICITUDES */}
            {intranetTab === 'solicitudes' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white font-heading">Bandeja de Requerimientos Web</h2>
                {receivedRequests.map(req => (
                  <div key={req.id} className="p-6 rounded-2xl bg-black border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-red-500">{req.id}</span>
                        <span className="text-xs text-zinc-500">📅 {req.date}</span>
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full font-bold bg-red-600/10 text-red-500 border border-red-600/30">
                        {req.deliveryMethod === 'instalacion' ? '🚚 Requiere Instalación' : '🏬 Retiro en Taller'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div><strong className="text-white block">{req.clientName}</strong><p className="text-zinc-400">Tel: {req.clientPhone}</p></div>
                      <div><strong className="text-white block">{req.serviceType}</strong><p className="text-zinc-400">{req.width}m x {req.height}m ({req.quantity} ud)</p></div>
                      <div><p className="text-zinc-300">Entrega: {req.deliveryAddress || 'Retiro en Taller'}</p></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-zinc-900">
                      <button onClick={() => handleImportRequestToQuote(req)} className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition">
                        <Icon name="file-text" className="w-3.5 h-3.5" /><span>Convertir en Cotización Correlativa</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* MODAL LOGIN */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <h3 className="font-heading font-bold text-white text-base">Acceso Intranet Taller</h3>
              <button onClick={() => setShowLoginModal(false)} className="text-zinc-500 hover:text-white"><Icon name="x" className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Contraseña:</label>
                <input type="password" placeholder="Clave del taller..." value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-black text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:border-red-600 focus:outline-none text-sm" autoFocus required />
                {loginError && <p className="text-xs text-red-500 mt-1.5">{loginError}</p>}
                <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5">
                  <Icon name="lock" className="w-3 h-3 text-zinc-600" />
                  <span>Área restringida exclusiva para personal y administración.</span>
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold rounded-xl transition shadow-lg shadow-red-600/30">Ingresar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
