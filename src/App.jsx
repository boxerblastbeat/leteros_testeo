import React, { useState, lazy, Suspense } from 'react';
import { ErpProvider, useErp } from './context/ErpContext';
import PublicSite from './components/public/PublicSite';
import LoginModal from './components/common/LoginModal';
import Toast from './components/common/Toast';

const IntranetApp = lazy(() => import('./components/intranet/IntranetApp'));

function MainRouter() {
  const { session, loading } = useErp();
  const [view, setView] = useState(() =>
    window.location.pathname.startsWith('/intranet') ? 'intranet' : 'public'
  );
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
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        Cargando Letreros Olivar...
      </div>
    );
  }

  return (
    <>
      {view === 'intranet' && session ? (
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
    <ErpProvider>
      <MainRouter />
    </ErpProvider>
  );
}
