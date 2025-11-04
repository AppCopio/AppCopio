import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { setupOfflineInterceptor } from '@/offline/interceptor';

const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: base,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let accessToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

// Procesar cola de peticiones esperando refresh
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Función para renovar token usando cookie httpOnly
async function refreshAccessToken(): Promise<string | null> {
  try {
    console.log('[API] 🔄 Intentando renovar access token...');
    
    // La cookie de refresh se envía automáticamente (httpOnly, withCredentials: true)
    const response = await apiNoRetry.post('/auth/refresh');
    
    const newAccessToken = response.data.access_token;
    
    if (newAccessToken) {
      setAccessToken(newAccessToken);
      console.log('[API] ✅ Access token renovado exitosamente');
      return newAccessToken;
    }
    
    return null;
  } catch (error) {
    console.error('[API] ❌ Error renovando token:', error);
    return null;
  }
}

// Request interceptor
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Response interceptor con refresh automático
api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Verificar si es un error 401 por token expirado
    const isTokenExpired = error.response?.status === 401 && 
                          (error.response?.data as any)?.error === 'TOKEN_EXPIRED';
    
    // Solo intentar refresh si:
    // 1. Es un 401 de token expirado
    // 2. No es la ruta de refresh
    // 3. No hemos intentado ya (_retry)
    if (isTokenExpired && 
        !originalRequest.url?.includes('/auth/refresh') && 
        !originalRequest._retry) {
      
      if (isRefreshing) {
        // Ya hay un refresh en curso, poner en cola
        console.log('[API] ⏳ Refresh en curso, agregando petición a la cola...');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        
        if (newToken) {
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          // Refresh falló - limpiar sesión
          processQueue(new Error('Refresh token expirado'), null);
          handleLogout();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Función para limpiar sesión cuando el refresh falla
function handleLogout() {
  console.log('[API] 🚪 Sesión expirada - limpiando autenticación...');
  setAccessToken(null);
  localStorage.removeItem('appcopio:access_token');
  localStorage.removeItem('appcopio:refresh_token');
  localStorage.removeItem('appcopio:user');
  
  // Redirigir al login si no estamos ya ahí
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login?session_expired=true';
  }
}

// =====================================================
// SETUP OFFLINE INTERCEPTOR (FASE 2)
// =====================================================
setupOfflineInterceptor(api);

// Cliente sin interceptores offline (para sync y testing)
export const apiNoRetry = axios.create({
  baseURL: base,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Añadir interceptor de autenticación a apiNoRetry también
apiNoRetry.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});