import { api, setAccessToken } from "@/lib/api";
import type { User } from "@/types/user";

export async function login(username: string, password: string) {
  const { data } = await api.post<{ access_token: string; user: User }>("/auth/login", {
    username,
    password,
  });
  
  // Configurar el token de acceso
  setAccessToken(data.access_token);
  
  // Guardar el token y usuario en localStorage para persistencia
  localStorage.setItem('appcopio:access_token', data.access_token);
  localStorage.setItem('appcopio:user', JSON.stringify(data.user));
  
  console.log('✅ Login exitoso, token configurado');
  
  return data.user;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    // Limpiar todo el estado de autenticación
    setAccessToken(null);
    localStorage.removeItem('appcopio:access_token');
    localStorage.removeItem('appcopio:user');
    console.log('✅ Logout completado, estado limpiado');
  }
}

// Función para restaurar el token desde localStorage al inicializar la app
export function restoreAuthState() {
  const token = localStorage.getItem('appcopio:access_token');
  if (token) {
    setAccessToken(token);
    console.log('✅ Token restaurado desde localStorage');
  }
}
