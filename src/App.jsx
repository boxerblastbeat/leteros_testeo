import React, { useState, lazy, Suspense, Component } from 'react';
import { ErpProvider, useErp } from './context/ErpContext';
import PublicSite from './components/public/PublicSite';
import LoginModal from './components/common/LoginModal';
import Toast from './components/common/Toast';

const IntranetApp = lazy(() => import('./components/intranet/IntranetApp'));
const OrderTrackingView = lazy(() => import('./components/public/OrderTrackingView'));

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Error inesperado en la vista.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-lg text-center space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Ocurrió un error al mostrar esta vista</h2>
            <p className="text-xs font-mono text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Recargar Plataforma
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainRouter() {
  const { session, loading } = useErp();
  const [view, setView] = useState(() => {
    const p = window.location.pathname;
    if (p.startsWith('/intranet')) return 'intranet';
    if (p.startsWith('/seguimiento')) return 'tracking';
    return 'public';
  });
  const [trackingCode] = useState(() => {
    const match = window.location.pathname.match(/^\/seguimiento\/([^/]+)/i);
    return match ? decodeURIComponent(match[1]) : '';
  });
  const [loginOpen, setLoginOpen] = useState(false);

  const handleOpenIntranet = () => {
    if (session) {
      setView('intranet');
      window.history.replaceState({}, '', '/intranet');
    } else {
      setLoginOpen(true);
    }
  };

  const handleGoPublic = () => {
    setView('public');
    window.history.replaceState({}, '', '/');
  };

  if (loading) {
    const isIntranetPath = view === 'intranet';
    return (
      <div
        className={`min-h-screen flex items-center justify-center text-sm font-medium ${
          isIntranetPath ? 'bg-slate-50 text-slate-600' : 'bg-zinc-950 text-zinc-400'
        }`}
      >
        {isIntranetPath ? 'Cargando Intranet Mini-ERP...' : 'Cargando Letreros Olivar...'}
      </div>
    );
  }

  return (
    <>
      {view === 'tracking' ? (
        <Suspense
          fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
              Cargando seguimiento...
            </div>
          }
        >
          <OrderTrackingView initialCode={trackingCode} onGoHome={handleGoPublic} />
        </Suspense>
      ) : view === 'intranet' && session ? (
        <Suspense
          fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm font-medium">
              Cargando Intranet Mini-ERP...
            </div>
          }
        >
          <IntranetApp onGoPublic={handleGoPublic} />
        </Suspense>
      ) : (
        <PublicSite onOpenIntranet={handleOpenIntranet} />
      )}

      <LoginModal
        open={loginOpen || (view === 'intranet' && !session)}
        onClose={() => {
          setLoginOpen(false);
          if (view === 'intranet' && !session) handleGoPublic();
        }}
        onSuccess={() => {
          setLoginOpen(false);
          setView('intranet');
          window.history.replaceState({}, '', '/intranet');
        }}
      />

      <Toast />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ErpProvider>
        <MainRouter />
      </ErpProvider>
    </ErrorBoundary>
  );
}
