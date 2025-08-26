// Tipos
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
  return fetchJSON<Array<{
    person_id: number;
    rut: string;
    nombre: string;
    primer_apellido: string;
    segundo_apellido: string | null;
    nacionalidad: "CH" | "EXT" | "";
    genero: "F" | "M" | "Otro" | "";
    edad: number | null;
    estudia: boolean;
    trabaja: boolean;
    perdida_trabajo: boolean;
    rubro: string | null;
    discapacidad: boolean;
    dependencia: boolean;
    created_at: string;
    updated_at: string;
  }>>(url);
}

// ---------- GET by ID ----------
export async function getPerson(id: number) {
  return fetchJSON<{
    person_id: number;
    rut: string;
    nombre: string;
    primer_apellido: string;
    segundo_apellido: string | null;
    nacionalidad: "CH" | "EXT" | "";
    genero: "F" | "M" | "Otro" | "";
    edad: number | null;
    estudia: boolean;
    trabaja: boolean;
    perdida_trabajo: boolean;
    rubro: string | null;
    discapacidad: boolean;
    dependencia: boolean;
    created_at: string;
    updated_at: string;
  }>(`${API_BASE}/persons/${id}`);
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
