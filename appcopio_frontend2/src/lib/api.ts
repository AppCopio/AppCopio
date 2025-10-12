import axios from 'axios';
import { setupOfflineInterceptor } from '@/offline/interceptor';

const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: base,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

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

// Interceptor de errores genérico
api.interceptors.response.use(
  r => r,
  async (error) => {
    const originalRequest = error.config;
    
    // Si es un error 401 y no hemos intentado renovar el token ya
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.warn('[API] 401 detected, attempting token refresh...');
      
      try {
        // Intentar obtener el contexto de auth para renovar el token
        const refreshTokenValue = localStorage.getItem('appcopio:refresh_token');
        if (refreshTokenValue) {
          const { data } = await apiNoRetry.post('/auth/refresh', {
            refresh_token: refreshTokenValue,
          });
          
          // Actualizar token
          setAccessToken(data.access_token);
          localStorage.setItem('appcopio:access_token', data.access_token);
          
          if (data.refresh_token) {
            localStorage.setItem('appcopio:refresh_token', data.refresh_token);
          }
          
          console.log('[API] ✅ Token refreshed, retrying original request');
          
          // Reintentar la petición original
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('[API] ❌ Failed to refresh token:', refreshError);
        
        // Si falla el refresh, limpiar tokens y redirigir al login
        setAccessToken(null);
        localStorage.removeItem('appcopio:access_token');
        localStorage.removeItem('appcopio:refresh_token');
        localStorage.removeItem('appcopio:user');
        
        // Redirigir al login si estamos en el navegador
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);