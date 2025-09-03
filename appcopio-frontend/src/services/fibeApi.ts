// src/services/fibeApi.ts
import api from "../lib/api";
import type { FormData } from "../types/fibe"; 

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
  try {
    const { data } = await api.post<ComposeResponse>(
      "/fibe/compose",
      payload,
      opts?.idempotencyKey
        ? { headers: { "Idempotency-Key": opts.idempotencyKey } }
        : undefined
    );
    return data;
  } catch (error: any) {
    console.error("API Error:", error);
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Error al crear la familia compuesta.";
    throw new Error(msg);
  }
}