import React, { useState } from 'react';
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
import CutOptimizer2D from './CutOptimizer2D';
import ClientsPanel from './ClientsPanel';
import MaterialsPanel from './MaterialsPanel';
import QuoteEditorModal from './QuoteEditorModal';
import QuotePrintModal from './QuotePrintModal';

export default function IntranetApp({ onGoPublic }) {
  const { quoteRequests, workOrders, isCloud, signOut } = useErp();

  const [activeTab, setActiveTab] = useState('cotizaciones');
  const [editorState, setEditorState] = useState({ open: false, quote: null, request: null });
  const [printQuote, setPrintQuote] = useState(null);

  const pendingRequestsCount = quoteRequests.filter((r) => r.status === 'nueva').length;
  const activeOtsCount = workOrders.filter((w) => w.status !== 'entregado').length;

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* TOP BAR */}
      <header className="no-print sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo-white.svg"
              alt={COMPANY_INFO.name}
              className="h-8 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <div className="font-heading font-bold text-white text-sm leading-tight">
                Intranet Mini-ERP
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Database className={`w-3 h-3 ${isCloud ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>{isCloud ? 'Supabase Cloud Activo' : 'Modo Local Demo (Listo para Supabase)'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditorState({ open: true, quote: null, request: null })}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-600/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Cotización</span>
            </button>
            <button
              onClick={onGoPublic}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Web Pública</span>
            </button>
            <button
              onClick={async () => {
                await signOut();
                onGoPublic();
              }}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-red-500/15 border border-zinc-800 text-zinc-400 hover:text-red-400 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 overflow-x-auto">
          <div className="flex items-center gap-1 pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                    active
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-red-500' : 'text-zinc-500'}`} />
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
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
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
        {activeTab === 'optimizador' && <CutOptimizer2D />}
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
