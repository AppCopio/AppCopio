/**
 * Interceptor Axios para funcionalidad offline-first
 * 
 * Intercepta TODAS las peticiones HTTP y:
 * - Cachea respuestas GET automáticamente
 * - Encola mutaciones (POST/PUT/DELETE) cuando offline
 * - Devuelve cache cuando offline
 */

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { cacheResponse, getCachedResponse } from './db';
import { addMutationToQueue } from './offline-sync';
import { emitMutationQueued } from './events';
import { getTTLForEndpoint, shouldCacheEndpoint } from './config';
import { generateUUID } from './offline-core';

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

/**
 * Interceptor de REQUEST:
 * - Si offline + GET → buscar en cache
 * - Si offline + mutación → encolar
 * - Si online → continuar normal
 */
async function handleOfflineRequest(
  config: InternalAxiosRequestConfig
): Promise<InternalAxiosRequestConfig> {
  const isOnline = navigator.onLine;
  const method = config.method?.toUpperCase() || 'GET';
  const url = config.url || '';

  // Si estamos ONLINE → continuar normal
  if (isOnline) {
    return config;
  }

  // =====================================================
  // ESTAMOS OFFLINE
  // =====================================================

  //console.log(`[Interceptor] OFFLINE detectado - ${method} ${url}`);

  // Caso 1: GET Request → Buscar en cache
  if (method === 'GET') {
    //console.log('[Interceptor] Intentando recuperar del cache...');
    
    const cached = await getCachedResponse(url);
    
    if (cached) {
      //console.log('[Interceptor] ✅ Datos encontrados en cache');
      
      // Crear una respuesta falsa que axios pueda manejar
      // Esto evitará que axios intente hacer la request real
      const fakeResponse: any = {
        data: cached.data,
        status: 200,
        statusText: 'OK (from cache)',
        headers: {},
        config: config,
        fromCache: true, // Flag especial
      };

      // Lanzamos un error especial que capturaremos en el interceptor de errores
      return Promise.reject({
        response: fakeResponse,
        config: config,
        isOfflineCache: true, // Flag para identificar que es cache offline
      });
    } else {
      //console.warn('[Interceptor] ❌ No hay datos en cache');
      
      // No hay cache → Lanzar error descriptivo
      return Promise.reject({
        message: 'No hay datos en cache y estás offline',
        config: config,
        isOfflineError: true,
        code: 'OFFLINE_NO_CACHE',
      });
    }
  }

  // Caso 2: POST/PUT/DELETE → Encolar mutación
  //console.log('[Interceptor] Encolando mutación...');
  
  try {
    await addMutationToQueue({
      method: method as 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      url: url,
      data: config.data,
      headers: config.headers as Record<string, string>,
      status: 'pending',
    });

    //console.log('[Interceptor] ✅ Mutación encolada exitosamente');

    // Emitir evento para notificación al usuario
    emitMutationQueued(method, url, config.data);

    // Lanzar error para que el servicio sepa que está encolado
    return Promise.reject({
      message: 'Mutación encolada - se sincronizará cuando estés online',
      config: config,
      isOfflineMutation: true,
      code: 'OFFLINE_QUEUED',
    });
  } catch (error) {
    //console.error('[Interceptor] ❌ Error al encolar mutación:', error);
    return Promise.reject({
      message: 'Error al encolar mutación offline',
      config: config,
      isOfflineError: true,
      originalError: error,
    });
  }
}

/**
 * Interceptor de REQUEST ERROR:
 * Maneja errores antes de enviar la request
 */
function handleRequestError(error: any): Promise<never> {
  //console.error('[Interceptor] Error en request interceptor:', error);
  return Promise.reject(error);
}

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

/**
 * Interceptor de RESPONSE exitosa:
 * - Si GET → cachear respuesta
 * - Actualizar metadata
 */
async function handleSuccessResponse(
  response: AxiosResponse
): Promise<AxiosResponse> {
  const method = response.config.method?.toUpperCase() || 'GET';
  const url = response.config.url || '';

  // Solo cachear GET requests
  if (method === 'GET') {
    // Verificar si debemos cachear este endpoint
    if (!shouldCacheEndpoint(url)) {
      //console.log(`[Interceptor] Endpoint ${url} no se cachea (configuración)`);
      return response;
    }

    // Obtener TTL para este endpoint
    const ttl = getTTLForEndpoint(url);
    
    if (ttl > 0) {
      try {
        // Construir objeto CachedResponse
        const cachedResponse = {
          url,
          data: response.data,
          timestamp: Date.now(),
          expiresAt: Date.now() + (ttl * 1000), // TTL en ms
          headers: response.headers as Record<string, string>,
        };

        await cacheResponse(cachedResponse);
        //console.log(`[Interceptor] ✅ Respuesta cacheada: ${url} (TTL: ${ttl}s)`);
      } catch (error) {
        //console.error('[Interceptor] Error al cachear respuesta:', error);
        // No lanzar error, solo log
      }
    }
  }

  return response;
}

/**
 * Interceptor de RESPONSE ERROR:
 * Maneja errores en las respuestas
 */
function handleResponseError(error: any): Promise<any> {
  // Caso especial: Es un cache offline exitoso
  if (error.isOfflineCache && error.response) {
    //console.log('[Interceptor] Devolviendo datos del cache como respuesta válida');
    return Promise.resolve(error.response);
  }

  // Caso especial: Es una mutación encolada
  if (error.isOfflineMutation) {
    //console.log('[Interceptor] Mutación encolada, devolviendo error controlado');
    // El servicio debe manejar este error específico
    return Promise.reject(error);
  }

  // Ignorar errores de cancelación (AbortController)
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.message === 'canceled') {
    return Promise.reject(error);
  }

  // Error normal de red u otro
  //console.error('[Interceptor] Error en response:', error.message || error);
  return Promise.reject(error);
}

// =====================================================
// SETUP PRINCIPAL
// =====================================================

/**
 * Configura los interceptores offline en una instancia de Axios
 * 
 * @param axiosInstance - Instancia de axios a interceptar
 * 
 * @example
 * ```typescript
 * import { api } from './lib/api';
 * import { setupOfflineInterceptor } from './offline/interceptor';
 * 
 * setupOfflineInterceptor(api);
 * ```
 */
export function setupOfflineInterceptor(axiosInstance: AxiosInstance): void {
  //console.log('[Interceptor] 🔧 Configurando interceptores offline...');

  // Request Interceptor
  axiosInstance.interceptors.request.use(
    handleOfflineRequest,
    handleRequestError
  );

  // Response Interceptor
  axiosInstance.interceptors.response.use(
    handleSuccessResponse,
    handleResponseError
  );

  //console.log('[Interceptor] ✅ Interceptores offline configurados correctamente');
}
