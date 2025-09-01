// src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  withCredentials: true, // para mandar/recibir cookie refresh
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;
export function setAccessToken(token: string | null) { accessToken = token; }

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

    const isAuthRoute =
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/refresh") ||
      url.includes("/api/auth/logout");

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);



export default api;
