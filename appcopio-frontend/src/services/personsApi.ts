// src/services/personApi.ts
import api from "../lib/api";
import type { Person } from "../types/person";

// Helper de errores consistente (opcional)
const msgFromError = (err: any, fallback: string) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;

// ---------- LIST ----------
export async function listPersons(params?: { search?: string; limit?: number }) {
  try {
    const { data } = await api.get<Person[]>("/persons", { params });
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al listar personas."));
  }
}

// ---------- GET by ID ----------
export async function getPerson(id: number) {
  try {
    const { data } = await api.get<Person>(`/persons/${id}`);
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al obtener la persona."));
  }
}

// ---------- POST (retorna ID) ----------
export async function createPerson(payload: Person) {
  try {
    const { data } = await api.post<{ person_id: number }>("/persons", payload);
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al crear la persona."));
  }
}

// ---------- PUT (reemplazo total, retorna ID) ----------
export async function replacePerson(id: number, payload: Person) {
  try {
    const { data } = await api.put<{ person_id: number }>(`/persons/${id}`, payload);
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al reemplazar la persona."));
  }
}
