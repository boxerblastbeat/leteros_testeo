import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ModalBackdrop({
  onClose,
  confirmOnOutsideClick = false,
  className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4',
  children,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleMouseDown = (e) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleClick = (e) => {
    if (e.target !== e.currentTarget || !mouseDownOnBackdrop.current) return;
    mouseDownOnBackdrop.current = false;
    if (confirmOnOutsideClick) {
      setShowConfirm(true);
    } else {
      onClose?.();
    }
  };

  return (
    <div className={className} onMouseDown={handleMouseDown} onClick={handleClick}>
      {children}

      {showConfirm && (
        <div
          className="no-print fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs p-5 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-slate-900">
                  ¿Cerrar esta ventana?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Si cierras ahora, los cambios no guardados se perderán.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Seguir aquí
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  onClose?.();
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
              >
                Sí, cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
