import { useEffect, useCallback } from 'react';

/**
 * Control estandarizado de cierre para modales:
 * - Cierra con tecla Escape, click en el fondo (backdrop) o botón X.
 * - Si `confirm` es true (formularios con ingreso de datos), solicita confirmación antes de cerrar.
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
    if (confirm) {
      if (!window.confirm(message)) return;
    }
    onClose();
  }, [onClose, confirm, message]);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  return { handleClose, handleBackdropClick };
}
