import { useEffect, useCallback } from 'react';

/**
 * Control estandarizado e inteligente de cierre para modales:
 * - Tecla Escape y botón X cierran de inmediato sin confirmación.
 * - Click fuera del marco (backdrop):
 *   - Si `confirm` es true (formularios), pide confirmación para evitar cierres accidentales.
 *   - Si `confirm` es false (vistas de solo lectura / impresión), cierra de inmediato.
 */
export function useModalClose(
  isOpen,
  onClose,
  {
    confirm = false,
    message = '¿Seguro que deseas cerrar este formulario? Los cambios no guardados se perderán.',
  } = {}
) {
  const handleClose = useCallback(() => {
    if (!onClose) return;
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        if (confirm && !window.confirm(message)) return;
        onClose?.();
      }
    },
    [onClose, confirm, message]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return { handleClose, handleBackdropClick };
}
