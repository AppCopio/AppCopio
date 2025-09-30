import { useState, useEffect, useCallback } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationState {
  location: UserLocation | null;
  error: string | null;
  loading: boolean;
  supported: boolean;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000, // 10 segundos
  maximumAge: 300000, // 5 minutos
  watch: false,
};

/**
 * Hook personalizado para manejar la geolocalización del usuario
 * Maneja permisos, errores, y actualizaciones de ubicación
 */
export function useGeolocation(options: UseGeolocationOptions = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    supported: 'geolocation' in navigator,
  });

  const getCurrentPosition = useCallback(() => {
    if (!state.supported) {
      setState(prev => ({
        ...prev,
        error: 'La geolocalización no está soportada en este dispositivo',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const success = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      setState(prev => ({
        ...prev,
        location: { latitude, longitude, accuracy },
        error: null,
        loading: false,
      }));
    };

    const error = (error: GeolocationPositionError) => {
      let errorMessage = 'Error desconocido al obtener la ubicación';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Permiso de geolocalización denegado. Por favor, habilítelo en la configuración del navegador.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'La ubicación no está disponible en este momento.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Tiempo de espera agotado al obtener la ubicación.';
          break;
      }

      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    };

    if (mergedOptions.watch) {
      const watchId = navigator.geolocation.watchPosition(success, error, {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      });

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      });
    }
  }, [state.supported, mergedOptions]);

  const requestLocation = useCallback(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  const clearLocation = useCallback(() => {
    setState(prev => ({
      ...prev,
      location: null,
      error: null,
      loading: false,
    }));
  }, []);

  return {
    ...state,
    requestLocation,
    clearLocation,
  };
}
