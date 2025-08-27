/////////////////////// REVISAR SI SE USARÁ, YA QUE POR ATOMICIDAD DEBIERA CREARSE UN ÚINCO SERVICIO "FIBE" QUE MANEJE TODO
import type { Person } from "../types/person"; // usa la ruta real de tu proyecto

const API_BASE = import.meta.env.VITE_API_URL ?? "";

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
      if (j?.message) msg = j.message; // ajusta según backend
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

// ---------- LIST ----------
export async function listPersons(params?: { search?: string; limit?: number }) {
  const url = `${API_BASE}/persons${qs(params ?? {})}`;
  // Ajusta el tipo de retorno si tu backend devuelve otro formato
  return fetchJSON<Array<Person>>(url);
}

// ---------- GET by ID ----------
export async function getPerson(id: number) {
  return fetchJSON<Person>(`${API_BASE}/persons/${id}`);
}

// ---------- POST (retorna ID) ----------
export async function createPerson(payload: Person) {
  // Nota: el backend ignora `parentesco` (no existe en Persons), y está OK.
  return fetchJSON<{ person_id: number }>(`${API_BASE}/persons`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------- PUT (reemplazo total, retorna ID) ----------
export async function replacePerson(id: number, payload: Person) {
  return fetchJSON<{ person_id: number }>(`${API_BASE}/persons/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
