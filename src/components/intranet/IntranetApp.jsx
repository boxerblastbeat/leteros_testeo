import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  FileText,
  Inbox,
  Wrench,
  Calendar,
  Scissors,
  Users,
  Package,
  Globe,
  LogOut,
  Database,
  Plus,
  History,
  User,
  BarChart3,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { COMPANY_INFO } from '../../data/company';
import { erpService } from '../../lib/erpService';
import QuotesManager from './QuotesManager';
import WorkOrdersPanel from './WorkOrdersPanel';

const TAB_LOADERS = {
  solicitudes: () => import('./RequestsInbox'),
  calendario: () => import('./CalendarPanel'),
  clientes: () => import('./ClientsPanel'),
  tarifario: () => import('./MaterialsPanel'),
  bitacora: () => import('./ActivityLogPanel'),
  administracion: () => import('./AdminReportsPanel'),
  optimizador: () => import('./CutOptimizer2D'),
};

const MODAL_LOADERS = [
  () => import('./WeeklyScheduleModal'),
  () => import('./QuoteEditorModal'),
  () => import('./QuotePrintModal'),
];

const RequestsInbox = lazy(TAB_LOADERS.solicitudes);
const CalendarPanel = lazy(TAB_LOADERS.calendario);
const ClientsPanel = lazy(TAB_LOADERS.clientes);
const MaterialsPanel = lazy(TAB_LOADERS.tarifario);
const ActivityLogPanel = lazy(TAB_LOADERS.bitacora);
const AdminReportsPanel = lazy(TAB_LOADERS.administracion);
const QuoteEditorModal = lazy(MODAL_LOADERS[1]);
const QuotePrintModal = lazy(MODAL_LOADERS[2]);
const WeeklyScheduleModal = lazy(MODAL_LOADERS[0]);
const CutOptimizer2D = lazy(TAB_LOADERS.optimizador);

function PanelFallback({ label = 'Cargando módulo...' }) {
  return (
    <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500 shadow-xs">
      {label}
    </div>
  );
}

const ROLE_META = {
  admin: { label: 'Admin', badge: 'bg-red-50 text-red-700 border-red-200' },
  ventas: { label: 'Ventas', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  taller: { label: 'Taller', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const ROLE_ALLOWED_TABS = {
  admin: ['cotizaciones', 'solicitudes', 'taller', 'calendario', 'optimizador', 'clientes', 'tarifario', 'administracion', 'bitacora'],
  ventas: ['cotizaciones', 'solicitudes', 'taller', 'calendario', 'clientes', 'tarifario'],
  taller: ['taller', 'calendario', 'optimizador'],
};

const resolveUserRole = (session) => {
  const raw =
    session?.user?.app_metadata?.role ||
    session?.user?.user_metadata?.role ||
    'admin';
  const normalized = String(raw).toLowerCase().trim();
  return ROLE_ALLOWED_TABS[normalized] ? normalized : 'admin';
};

export default function IntranetApp({ onGoPublic }) {
  const { session, erpSyncing, quotes, quoteRequests, workOrders, isCloud, signOut, showToast, recordAudit } = useErp();

  // Precarga silenciosa en segundo plano de pestañas y modales secundarios para cambio instantáneo
  useEffect(() => {
    const prefetchAll = () => {
      MODAL_LOADERS.forEach((fn) => fn().catch(() => {}));
      Object.values(TAB_LOADERS).forEach((fn) => fn().catch(() => {}));
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetchAll, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(prefetchAll, 450);
    return () => clearTimeout(timer);
  }, []);

  const userRole = resolveUserRole(session);
  const roleMeta = ROLE_META[userRole] || ROLE_META.admin;
  const allowedTabs = ROLE_ALLOWED_TABS[userRole] || ROLE_ALLOWED_TABS.admin;
  const canCreateQuote = userRole !== 'taller';

  const mustChangePassword = Boolean(session?.user?.user_metadata?.must_change_password);
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleForcePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (pwdForm.password.length < 6) {
      setPwdError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pwdForm.password !== pwdForm.confirm) {
      setPwdError('Las contraseñas no coinciden.');
      return;
    }
    setPwdSaving(true);
    try {
      await erpService.completeFirstPasswordChange(pwdForm.password);
      await recordAudit?.({
        action: 'sesion',
        entity_type: 'sesion',
        entity_ref: session?.user?.email || '',
        summary: 'Definió su contraseña personal desde clave temporal',
      });
      setPwdForm({ password: '', confirm: '' });
      showToast('¡Contraseña personal actualizada correctamente!');
    } catch (err) {
      setPwdError(err?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setPwdSaving(false);
    }
  };

  const [activeTab, setActiveTab] = useState(() => (userRole === 'taller' ? 'taller' : 'cotizaciones'));
  const [editorState, setEditorState] = useState({ open: false, quote: null, request: null });
  const [printQuote, setPrintQuote] = useState(null);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [focusedOtId, setFocusedOtId] = useState(null);
  const [optimizerPayload, setOptimizerPayload] = useState(null);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, activeTab]);

  useEffect(() => {
    if (!session) return;
    const key = `olivar_weekly_seen_${session.user?.email || 'local'}`;
    if (!sessionStorage.getItem(key)) {
      setShowWeeklyModal(true);
      sessionStorage.setItem(key, '1');
    }
  }, [session]);

  const activeQuotesCount = quotes.filter((q) => !['pagada', 'rechazada'].includes(q.status)).length;
  const pendingRequestsCount = quoteRequests.filter((r) => r.status === 'nueva').length;
  const activeOtsCount = workOrders.filter(
    (w) => !['despachado', 'entregado', 'pagada'].includes(w.status)
  ).length;

  const navItems = [
    { id: 'cotizaciones', label: 'Cotizaciones ERP', icon: FileText, badge: activeQuotesCount },
    { id: 'solicitudes', label: 'Solicitudes Web', icon: Inbox, badge: pendingRequestsCount },
    { id: 'taller', label: 'Taller & OTs', icon: Wrench, badge: activeOtsCount },
    { id: 'calendario', label: 'Agenda & Despachos', icon: Calendar },
    { id: 'optimizador', label: 'Cortes 2D', icon: Scissors },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'tarifario', label: 'Tarifario', icon: Package },
    { id: 'administracion', label: 'Administración', icon: BarChart3 },
    { id: 'bitacora', label: 'Bitácora', icon: History },
  ].filter((item) => allowedTabs.includes(item.id));

  return (
    <div className="intranet-theme min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* TOP BAR (Tema Claro Corporativo) */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 min-h-[60px] py-2 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/logo.svg"
              alt={COMPANY_INFO.name}
              className="h-8 sm:h-9 w-auto object-contain shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="border-l border-slate-200 pl-2.5 sm:pl-3 min-w-0">
              <div className="font-heading font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate">
                Intranet Mini-ERP
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500">
                <Database className={`w-3 h-3 shrink-0 ${erpSyncing ? 'text-amber-500 animate-pulse' : isCloud ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span className="sm:hidden truncate">
                  {erpSyncing ? 'Sincronizando...' : isCloud ? 'Supabase Cloud' : 'Modo Demo'}
                </span>
                <span className="hidden sm:inline truncate">
                  {erpSyncing
                    ? 'Sincronizando datos en vivo...'
                    : isCloud
                      ? 'Supabase Cloud Activo'
                      : 'Modo Local Demo (Listo para Supabase)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {session?.user?.email && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{session.user.email}</span>
                <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.badge}`}>
                  {roleMeta.label}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowWeeklyModal(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-full sm:rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              title="Ver Cronograma Semanal de Pedidos"
            >
              <Calendar className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-red-600" />
              <span className="hidden md:inline">Cronograma</span>
            </button>
            {canCreateQuote && (
              <button
                onClick={() => setEditorState({ open: true, quote: null, request: null })}
                className="px-3 sm:px-3.5 py-2 rounded-full sm:rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-red-600/20"
                title="Nueva Cotización"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva Cotización</span>
              </button>
            )}
            <button
              onClick={onGoPublic}
              className="p-2 sm:px-3 sm:py-2 rounded-full sm:rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              title="Ver Web Pública"
            >
              <Globe className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Web Pública</span>
            </button>
            <button
              onClick={async () => {
                const key = `olivar_weekly_seen_${session?.user?.email || 'local'}`;
                sessionStorage.removeItem(key);
                await signOut();
                onGoPublic();
              }}
              className="p-2 rounded-full sm:rounded-xl bg-white hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 pb-2.5 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onMouseEnter={() => TAB_LOADERS[item.id]?.().catch(() => {})}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 sm:gap-2 border shrink-0 ${
                    active
                      ? 'bg-red-50 border-red-200 text-red-700 shadow-xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-red-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeTab === 'cotizaciones' && (
          <QuotesManager
            onNewQuote={() => setEditorState({ open: true, quote: null, request: null })}
            onEditQuote={(q) => setEditorState({ open: true, quote: q, request: null })}
            onPrintQuote={(q) => setPrintQuote(q)}
            onGoToWorkshop={() => setActiveTab('taller')}
          />
        )}
        {activeTab === 'solicitudes' && (
          <Suspense fallback={<PanelFallback label="Cargando Solicitudes Web..." />}>
            <RequestsInbox
              onConvertRequest={(req) => {
                setEditorState({ open: true, quote: null, request: req });
              }}
            />
          </Suspense>
        )}
        {activeTab === 'taller' && (
          <WorkOrdersPanel
            focusedOtId={focusedOtId}
            onClearFocus={() => setFocusedOtId(null)}
            onOpenInOptimizer={(payload) => {
              setOptimizerPayload(payload);
              setActiveTab('optimizador');
            }}
          />
        )}
        {activeTab === 'calendario' && (
          <Suspense fallback={<PanelFallback label="Cargando Agenda & Despachos..." />}>
            <CalendarPanel />
          </Suspense>
        )}
        {activeTab === 'optimizador' && (
          <Suspense fallback={<PanelFallback label="Cargando Optimizador 2D..." />}>
            <CutOptimizer2D initialPayload={optimizerPayload} />
          </Suspense>
        )}
        {activeTab === 'clientes' && (
          <Suspense fallback={<PanelFallback label="Cargando Clientes..." />}>
            <ClientsPanel />
          </Suspense>
        )}
        {activeTab === 'tarifario' && (
          <Suspense fallback={<PanelFallback label="Cargando Tarifario & Bodega..." />}>
            <MaterialsPanel />
          </Suspense>
        )}
        {activeTab === 'administracion' && (
          <Suspense fallback={<PanelFallback label="Cargando Dashboard de Administración..." />}>
            <AdminReportsPanel />
          </Suspense>
        )}
        {activeTab === 'bitacora' && (
          <Suspense fallback={<PanelFallback label="Cargando Bitácora..." />}>
            <ActivityLogPanel />
          </Suspense>
        )}
      </main>

      {/* MODALS (cargados bajo demanda) */}
      <Suspense fallback={null}>
        {editorState.open && (
          <QuoteEditorModal
            open={editorState.open}
            initialQuote={editorState.quote}
            fromRequest={editorState.request}
            onClose={() => setEditorState({ open: false, quote: null, request: null })}
            onSaved={() => setActiveTab('cotizaciones')}
          />
        )}

        {printQuote && <QuotePrintModal quote={printQuote} onClose={() => setPrintQuote(null)} />}

        {showWeeklyModal && !mustChangePassword && (
          <WeeklyScheduleModal
            onClose={() => setShowWeeklyModal(false)}
            onSelectOt={(ot) => {
              setFocusedOtId(ot.id);
              setShowWeeklyModal(false);
              setActiveTab('taller');
            }}
          />
        )}
      </Suspense>

      {/* MODAL OBLIGATORIO DE CAMBIO DE CLAVE TEMPORAL (NO SE PUEDE SALTAR) */}
      {mustChangePassword && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleForcePasswordSubmit}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900"
          >
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-base sm:text-lg">
                  Crea tu Contraseña Personal
                </h3>
                <p className="text-xs text-slate-500">
                  Ingresaste con una clave temporal. Define tu contraseña definitiva para continuar.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-mono">
                Cuenta: <strong className="text-slate-900">{session?.user?.email}</strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Nueva contraseña (mín. 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoFocus
                  value={pwdForm.password}
                  onChange={(e) => setPwdForm({ ...pwdForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={pwdForm.confirm}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              {pwdError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {pwdError}
                </div>
              )}

              <button
                type="submit"
                disabled={pwdSaving}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-red-600/20"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{pwdSaving ? 'Guardando...' : 'Guardar Contraseña e Ingresar'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
