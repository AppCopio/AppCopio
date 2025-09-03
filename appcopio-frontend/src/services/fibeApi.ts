// src/services/fibeApi.ts
import type { FormData } from "../types/fibe"; // ajusta la ruta si tu type vive en otro archivo

// --- Helpers (borra si ya los importas desde un apiClient central) ---
const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers as any) },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

export type ComposeResponse = {
  family_id: number;
  jefe_person_id: number;
  jefe_member_id: number;
  members: Array<{ index: number; person_id: number; member_id: number }>;
};

/**
 * Crea familia + personas + membresías en una sola transacción.
 * Requiere que tu backend tenga montado: POST /api/fibe/compose
 *
 * @param payload  { activation_id, data }
 * @param opts     { idempotencyKey? } opcional, recomendado para reintentos
 */
export async function createFibeSubmission(
  payload: { activation_id: number; data: FormData },
  opts?: { idempotencyKey?: string }
): Promise<ComposeResponse> {
  const headers =
    opts?.idempotencyKey
      ? { "Content-Type": "application/json", "Idempotency-Key": opts.idempotencyKey }
      : { "Content-Type": "application/json" };

  return fetchJSON<ComposeResponse>(`${API_BASE}/fibe/compose`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}