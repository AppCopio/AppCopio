// src/lib/api.ts
import axios from "axios";

const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
// Incluye /api aquí para poder usar rutas cortas "/auth/..."
const api = axios.create({
  baseURL: `${base}`,
  withCredentials: true, // para mandar/recibir cookie refresh
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let isRefreshing = false;
let queue: Array<(t: string | null) => void> = [];

async function doRefresh() {
  const { data } = await api.post("/auth/refresh");
  return data.access_token as string;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const url = (original?.url || "").toString();

    // Rutas de auth: no intentes refrescar
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout");

    // Si no es 401 o es una ruta de auth, propaga el error
    if (error?.response?.status !== 401 || isAuthRoute) {
      return Promise.reject(error);
    }

    // Evita reintentar infinitamente la misma request
    if (original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    try {
      if (!isRefreshing) {
        isRefreshing = true;
        const newAccess = await doRefresh();
        setAccessToken(newAccess);
        queue.forEach((cb) => cb(newAccess));
        queue = [];
      } else {
        await new Promise<void>((resolve) => queue.push(() => resolve()));
      }
      // Reintenta con el nuevo token
      return api(original);
    } catch (e) {
      // Falla el refresh: limpia y deja que el caller maneje el 401
      queue.forEach((cb) => cb(null));
      queue = [];
      setAccessToken(null);
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
