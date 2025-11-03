import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook que hace scroll automático al tope de la página cuando:
 * 1. El componente se monta por primera vez
 * 2. Se navega desde otra ruta (opcional con checkNavigation)
 * 3. Se recibe un state específico desde navigate (opcional con checkState)
 */
export const useScrollToTop = (options?: {
  behavior?: ScrollBehavior; // 'smooth' | 'instant' | 'auto'
  checkNavigation?: boolean; // Si true, solo hace scroll cuando cambia la ruta
  checkState?: boolean; // Si true, verifica state.scrollToTop desde navigate
}) => {
  const location = useLocation();
  const { 
    behavior = 'smooth', 
    checkNavigation = false,
    checkState = false 
  } = options || {};

  useEffect(() => {
    // Si checkState está activado, verificar si viene el flag en el state
    if (checkState) {
      const state = location.state as any;
      if (!state?.scrollToTop) {
        return; // No hacer scroll si no viene el flag
      }
    }

    // Hacer scroll al tope
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: behavior
    });

    // Limpiar el state después de usarlo (opcional)
    if (checkState && location.state) {
      window.history.replaceState({}, document.title);
    }
  }, checkNavigation ? [location.pathname] : []); // Depende de pathname si checkNavigation es true
};

// Exportar también una versión imperativa
export const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: behavior
  });
};

export default useScrollToTop;