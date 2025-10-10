// src/offline/offline-core.ts  
// Funciones core consolidadas: autenticación + utilidades

import { api, apiNoRetry, setAccessToken } from '@/lib/api';

// =====================================================
// MANEJO DE AUTENTICACIÓN
// =====================================================

/**
 * Intenta renovar el token de acceso usando el refresh token
 */
export async function tryRefreshToken(): Promise<boolean> {
  try {
    console.log('[AuthHandler] 🔄 Intentando renovar token...');
    
    const refreshTokenValue = localStorage.getItem('appcopio:refresh_token');
    if (!refreshTokenValue) {
      console.warn('[AuthHandler] ❌ No hay refresh token disponible');
      return false;
    }

    // Usar apiNoRetry para evitar bucles de interceptores
    const response = await apiNoRetry.post('/auth/refresh', {
      refresh_token: refreshTokenValue
    });

    const { access_token, refresh_token: newRefreshToken } = response.data;
    
    // Actualizar tokens en storage y API
    setAccessToken(access_token);
    localStorage.setItem('appcopio:access_token', access_token);
    
    if (newRefreshToken) {
      localStorage.setItem('appcopio:refresh_token', newRefreshToken);
    }

    console.log('[AuthHandler] ✅ Token renovado exitosamente');
    return true;

  } catch (error: any) {
    console.error('[AuthHandler] ❌ Error renovando token:', error);
    
    // Si el refresh token también expiró, limpiar todo
    if (error.response?.status === 401) {
      console.warn('[AuthHandler] 🚨 Refresh token expirado - limpiando autenticación');
      clearAuthTokens();
    }
    
    return false;
  }
}

/**
 * Limpia todos los tokens de autenticación
 */
export function clearAuthTokens(): void {
  localStorage.removeItem('appcopio:access_token');
  localStorage.removeItem('appcopio:refresh_token');
  localStorage.removeItem('appcopio:user');
  setAccessToken(null);
}

/**
 * Verifica si un error es debido a token expirado (401 Unauthorized)
 */
export function isTokenExpiredError(error: any): boolean {
  return error.response?.status === 401;
}

/**
 * Maneja errores 401 intentando renovar el token
 */
export async function handle401Error(originalError: any): Promise<{
  success: boolean;
  shouldLogout?: boolean;
}> {
  if (!isTokenExpiredError(originalError)) {
    return { success: false };
  }

  console.log('[AuthHandler] 🔍 Detectado error 401 - intentando renovar token');
  
  const refreshSuccess = await tryRefreshToken();
  
  if (refreshSuccess) {
    return { success: true };
  } else {
    return { 
      success: false, 
      shouldLogout: true 
    };
  }
}

/**
 * Ejecuta una petición con manejo automático de renovación de token
 */
export async function executeWithTokenRefresh<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    try {
      return await requestFn();
    } catch (error: any) {
      if (isTokenExpiredError(error) && attempts < maxRetries) {
        console.log(`[AuthHandler] 🔄 Intento ${attempts + 1} de renovación de token`);
        
        const handleResult = await handle401Error(error);
        
        if (handleResult.success) {
          attempts++;
          continue; // Reintentar con el nuevo token
        } else if (handleResult.shouldLogout) {
          throw new Error('AUTHENTICATION_EXPIRED');
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('MAX_TOKEN_REFRESH_ATTEMPTS_EXCEEDED');
}

// =====================================================
// UTILIDADES GENERALES
// =====================================================

/**
 * Genera un UUID v4 simple
 */
export function generateUUID(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

/**
 * Verifica si el navegador está online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Crear un delay/sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function para evitar llamadas excesivas
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => func(...args), delay);
  };
}