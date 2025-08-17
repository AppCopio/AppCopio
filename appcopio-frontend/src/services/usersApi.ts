const API_BASE = import.meta.env.VITE_API_BASE ?? ""; 

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
  return res.json();
}

export async function listUsers(params: {
  search?: string;
  role_id?: number;
  role?: string;
  center_id?: string;
  active?: 0 | 1;
  page?: number;
  pageSize?: number;
}) {
  const url = `${API_BASE}/api/users${qs(params)}`;
  return fetchJSON<{ users: any[]; total: number }>(url);
}

export async function getUser(id: number) {
  return fetchJSON<any>(`${API_BASE}/api/users/${id}`);
}

export async function createUser(payload: {
  rut: string;
  username: string;
  password: string;
  email: string;
  role_id: number;
  center_id?: string | null;
  nombre?: string | null;
  genero?: string | null;
  celular?: string | null;
  imagen_perfil?: string | null;
}) {
  return fetchJSON<any>(`${API_BASE}/api/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: number, payload: Partial<{
  email: string;
  username: string;
  role_id: number;
  center_id: string | null;
  nombre: string | null;
  genero: string | null;
  celular: string | null;
  imagen_perfil: string | null;
  is_active: boolean;
}>) {
  return fetchJSON<any>(`${API_BASE}/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: number) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
}

export async function setActive(id: number, is_active: boolean) {
  return fetchJSON<{ user_id: number; is_active: boolean }>(
    `${API_BASE}/api/users/${id}/activate`,
    { method: "PATCH", body: JSON.stringify({ is_active }) }
  );
}

export async function setPassword(id: number, password: string) {
  return fetchJSON<{ ok: true }>(`${API_BASE}/api/users/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}