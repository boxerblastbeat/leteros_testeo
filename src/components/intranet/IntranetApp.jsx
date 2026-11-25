import React, { useState, lazy, Suspense } from 'react';
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
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { COMPANY_INFO } from '../../data/company';
import QuotesManager from './QuotesManager';
import RequestsInbox from './RequestsInbox';
import WorkOrdersPanel from './WorkOrdersPanel';
import CalendarPanel from './CalendarPanel';
import ClientsPanel from './ClientsPanel';
import MaterialsPanel from './MaterialsPanel';
import QuoteEditorModal from './QuoteEditorModal';
import QuotePrintModal from './QuotePrintModal';

const CutOptimizer2D = lazy(() => import('./CutOptimizer2D'));

export default function IntranetApp({ onGoPublic }) {
  const { quoteRequests, workOrders, isCloud, signOut } = useErp();

  const [activeTab, setActiveTab] = useState('cotizaciones');
  const [editorState, setEditorState] = useState({ open: false, quote: null, request: null });
  const [printQuote, setPrintQuote] = useState(null);

  const pendingRequestsCount = quoteRequests.filter((r) => r.status === 'nueva').length;
  const activeOtsCount = workOrders.filter((w) => w.status !== 'pagada').length;

  const navItems = [
    { id: 'cotizaciones', label: 'Cotizaciones ERP', icon: FileText },
    { id: 'solicitudes', label: 'Solicitudes Web', icon: Inbox, badge: pendingRequestsCount },
    { id: 'taller', label: 'Taller & OTs', icon: Wrench, badge: activeOtsCount },
    { id: 'calendario', label: 'Agenda & Despachos', icon: Calendar },
    { id: 'optimizador', label: 'Cortes 2D', icon: Scissors },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'tarifario', label: 'Tarifario', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
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
                <Database className={`w-3 h-3 shrink-0 ${isCloud ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span className="sm:hidden truncate">{isCloud ? 'Supabase Cloud' : 'Modo Demo'}</span>
                <span className="hidden sm:inline truncate">
                  {isCloud ? 'Supabase Cloud Activo' : 'Modo Local Demo (Listo para Supabase)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setEditorState({ open: true, quote: null, request: null })}
              className="px-3 sm:px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-red-600/20"
              title="Nueva Cotización"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Cotización</span>
            </button>
            <button
              onClick={onGoPublic}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              title="Ver Web Pública"
            >
              <Globe className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Web Pública</span>
            </button>
            <button
              onClick={async () => {
                await signOut();
                onGoPublic();
              }}
              className="p-2 rounded-xl bg-white hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition"
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
          />
        )}
        {activeTab === 'solicitudes' && (
          <RequestsInbox
            onConvertRequest={(req) => {
              setEditorState({ open: true, quote: null, request: req });
            }}
          />
        )}
        {activeTab === 'taller' && <WorkOrdersPanel />}
        {activeTab === 'calendario' && <CalendarPanel />}
        {activeTab === 'optimizador' && (
          <Suspense
            fallback={
              <div className="p-10 text-center text-xs text-slate-500">
                Cargando Optimizador 2D...
              </div>
            }
          >
            <CutOptimizer2D />
          </Suspense>
        )}
        {activeTab === 'clientes' && <ClientsPanel />}
        {activeTab === 'tarifario' && <MaterialsPanel />}
      </main>

      {/* MODALS */}
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
    </div>
  );
}
