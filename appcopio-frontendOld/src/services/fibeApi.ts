// src/services/fibeApi.ts
import api from "../lib/api";
import type { FormData, ComposeResponse } from "../types/fibe";

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
      "/fibe/registration",
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