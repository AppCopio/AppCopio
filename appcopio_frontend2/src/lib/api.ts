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
  e => Promise.reject(e)
);