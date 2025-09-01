const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** Querystring helper con soporte para arrays */
function qs(params: Record<string, any>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) {
      v.forEach((item) => s.append(k, String(item)));
    } else {
      s.append(k, String(v));
    }
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

/** Fetch helper con cookies, signal y mejor parsing de error/204 */
async function fetchJSON<T>(url: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",         
    ...init,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json();
        if (j?.error) msg = j.error;
        else if (j?.message) msg = j.message;
      } else {
        const t = await res.text();
        if (t) msg = t;
      }
    } catch {
    }
    throw new Error(msg);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

/** LIST */
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

/** GET ONE */
export async function getUser(userId: number | string, signal?: AbortSignal) {
  return fetchJSON<any>(`${API_BASE}/users/${userId}`, { signal });
}

/** CREATE  */
export async function createUser(payload: {
  rut: string;
  username: string;
  password: string;     
  email: string;
  role_id: number;
  nombre?: string | null;
  genero?: string | null;
  celular?: string | null;
  es_apoyo_admin?: boolean;   
  is_active?: boolean;      
}) {
  return fetchJSON<any>(`${API_BASE}/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** UPDATE */
export async function updateUser(id: number, payload: Partial<{
  email: string;
  username: string;
  role_id: number;
  nombre: string | null;
  genero: string | null;
  celular: string | null;
  es_apoyo_admin: boolean;
  is_active: boolean;
}>) {
  return fetchJSON<any>(`${API_BASE}/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** DELETE (204 OK) */
export async function deleteUser(id: number) {
  return fetchJSON<void>(`${API_BASE}/users/${id}`, { method: "DELETE" });
}

/** ASSIGN / UNASSIGN — usa role_name si tu backend lo espera así */
export async function assignCenterToUser(
  user_id: number,
  center_id: string | number,
  role: string
) {
  return fetchJSON<any>(`${API_BASE}/assignments`, {
    method: "POST",
    body: JSON.stringify({ user_id, center_id, role }),
  });
}

export async function removeCenterFromUser(user_id: number, center_id: string) {
  return fetchJSON<void>(`${API_BASE}/assignments`, {
    method: "DELETE",
    body: JSON.stringify({ user_id, center_id }),
  });
}

/** Toggles / acciones */
export async function setActive(id: number, is_active: boolean) {
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

/** Roles */
export async function getRoles(signal?: AbortSignal) {
  return fetchJSON<{ roles: { role_id: number; role_name: string }[] }>(`${API_BASE}/roles`, { signal });
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
