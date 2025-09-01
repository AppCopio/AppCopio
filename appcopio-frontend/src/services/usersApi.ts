const API_BASE = import.meta.env.VITE_API_URL ?? ""; // Se usa VITE_API_URL por consistencia

function qs(params: Record<string, any>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  // Para respuestas 204 No Content, no hay JSON que parsear
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

// MODIFICADO: Se elimina center_id de los parámetros de filtro
export async function listUsers(params: {
  search?: string;
  role_id?: number;
  active?: 0 | 1;
  page?: number;
  pageSize?: number;
}) {
  const url = `${API_BASE}/users${qs(params)}`;
  return fetchJSON<{ users: any[]; total: number }>(url);
}


export async function getUser(userId: number | string, signal?: AbortSignal) {
  const r = await fetch(`${API_BASE}/users/${userId}`, { signal });
  if (!r.ok) throw new Error('getUser failed');
  return r.json();
}

// MODIFICADO: Se elimina center_id del payload de creación
export async function createUser(payload: {
  rut: string;
  username: string;
  password: string;
  email: string;
  role_id: number;
  nombre?: string | null;
  // ... otros campos opcionales ...
}) {
  return fetchJSON<any>(`${API_BASE}/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// MODIFICADO: Se elimina center_id y se añade es_apoyo_admin
export async function updateUser(id: number, payload: Partial<{
  email: string;
  username: string;
  role_id: number;
  nombre: string | null;
  es_apoyo_admin: boolean; 
  is_active: boolean
  // ... otros campos ...
}>) {
  return fetchJSON<any>(`${API_BASE}/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: number) {
    // Se usa fetchJSON pero se maneja el caso de no respuesta (204)
    return fetchJSON<void>(`${API_BASE}/users/${id}`, { method: "DELETE" });
}

// --- NUEVAS FUNCIONES PARA ASIGNACIONES ---

/**
 * Asigna un centro a un usuario.
 * @param user_id - ID del usuario
 * @param center_id - ID del centro a asignar
 */
export async function assignCenterToUser(user_id: number, center_id: string, role: string) {
  return fetchJSON<any>(`${API_BASE}/assignments`, {
    method: "POST",
    body: JSON.stringify({ user_id, center_id, role }),
  });
}

/**
 * Desasigna un centro de un usuario.
 * @param user_id - ID del usuario
 * @param center_id - ID del centro a desasignar
 */
export async function removeCenterFromUser(user_id: number, center_id: string) {
  return fetchJSON<void>(`${API_BASE}/assignments`, {
    method: "DELETE",
    body: JSON.stringify({ user_id, center_id }),
  });
}


// --- FUNCIONES EXISTENTES (pueden necesitar revisión de nombres de columna) ---

export async function setActive(id: number, is_active: boolean) {
  // Nota: La columna en la BD es 'is_active'. El backend debe manejar esta traducción.
  return fetchJSON<{ user_id: number; is_active: boolean }>(
    `${API_BASE}/users/${id}/activate`,
    { method: "PATCH", body: JSON.stringify({ is_active }) }
  );
}

export async function setPassword(id: number, password: string) {
  return fetchJSON<{ ok: true }>(`${API_BASE}/users/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}

export async function getRoles(signal?: AbortSignal) {
  const res = await fetch(`${API_BASE}/roles`, { signal });
  if (!res.ok) throw new Error("No se pudieron cargar los roles");
  return res.json() as Promise<{ roles: { role_id: number; role_name: string }[] }>;
}

export type AppUser = {
  user_id: number;
  username: string;
  email: string | null;
  nombre: string | null;
  role_id: number;
  role_name?: string;
  is_active: boolean;
  active_assignments?: number; // viene de la ruta nueva
};

// Nueva función específica del backend nuevo
export async function listActiveUsersByRole(roleId: number) {
  const url = `${API_BASE}/users/active/role/${roleId}`;
  // El backend responde { users: AppUser[], total: number }
  const { users } = await fetchJSON<{ users: AppUser[]; total: number }>(url);
  return users; // devolvemos el array directo para que el componente lo use como options
}

export async function getActiveAssignmentsByUserRole(
  user_id: number,
  role: "trabajador municipal" | "contacto ciudadano",
  opts?: { exclude_center_id?: string }
) {
  const params = new URLSearchParams({
    user_id: String(user_id),
    role,
  });
  if (opts?.exclude_center_id) params.set("exclude_center_id", opts.exclude_center_id);

  const url = `${API_BASE}/assignments/active/by-user-role?${params.toString()}`;
  return fetchJSON<{ assignments: { center_id: string; center_name: string }[]; count: number }>(url);
}
