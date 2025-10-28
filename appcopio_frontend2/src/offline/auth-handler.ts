// src/offline/auth-handler.ts
// Manejo de autenticación en el contexto de sincronización offline

import { api, setAccessToken } from '@/lib/api';

/**
 * Intenta renovar el token de acceso usando el refresh token
 * Utiliza el contexto de autenticación si está disponible
 * @returns true si el token fue renovado exitosamente, false en caso contrario
 */
export async function tryRefreshToken(): Promise<boolean> {
  try {
    console.log('[AuthHandler] 🔄 Intentando renovar token...');
    
    // Intentar usar AuthContext si está disponible (enfoque preferido)
    try {
      // Nota: En un contexto real de React, esto debería llamarse desde un hook
      // Por ahora, usamos el enfoque directo con API
      const refreshTokenValue = localStorage.getItem('appcopio:refresh_token');
      if (!refreshTokenValue) {
        console.warn('[AuthHandler] ❌ No hay refresh token disponible');
        return false;
      }

      const response = await api.post('/auth/refresh', {
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

  } catch (error: any) {
    console.error('[AuthHandler] ❌ Error inesperado renovando token:', error);
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
 * @param originalError - El error 401 original
 * @returns Promise que resuelve con { success: true } si el token fue renovado, 
 *          o { success: false, shouldLogout: boolean } si falló
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
    // Si no se pudo renovar, probablemente necesitamos logout
    return { 
      success: false, 
      shouldLogout: true 
    };
  }
}

/**
 * Ejecuta una petición con manejo automático de renovación de token
 * @param requestFn - Función que ejecuta la petición original
 * @param maxRetries - Máximo número de intentos de renovación (default: 1)
 * @returns Resultado de la petición o error si falla después de renovar token
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
          // El refresh token también expiró
          throw new Error('AUTHENTICATION_EXPIRED');
        } else {
          // Error diferente a 401
          throw error;
        }
      } else {
        // No es error 401, o ya agotamos reintentos
        throw error;
      }
    }
  }
  
  throw new Error('MAX_TOKEN_REFRESH_ATTEMPTS_EXCEEDED');
}