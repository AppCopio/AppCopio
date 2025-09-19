import { api } from "@/lib/api";
// CAMBIO: Asegúrate de que tus tipos coincidan con la estructura que espera el backend.
// CreateFibeSubmissionDTO ahora debería ser básicamente { activation_id: number; data: FormData }
import type { CreateFibeSubmissionDTO, CreateFibeSubmissionResponse } from "@/types/fibe";

type CreateOpts = {
  idempotencyKey?: string;
  signal?: AbortSignal;
};

/**
 * Envía el formulario completo de la ficha FIBE al backend para su procesamiento.
 * @param dto El objeto de transferencia de datos con la información de la ficha.
 * @param opts Opciones adicionales como la clave de idempotencia.
 * @returns La respuesta del servidor tras procesar el registro.
 */
export async function createFibeSubmission(
  dto: CreateFibeSubmissionDTO,
  opts: CreateOpts = {}
): Promise<CreateFibeSubmissionResponse> {
  const headers: Record<string, string> = {};
  if (opts.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
  }

  try {
    // CAMBIO CRÍTICO: La ruta ahora es '/fibe/register' para coincidir con el backend.
    const { data } = await api.post<CreateFibeSubmissionResponse>("/fibe/register", dto, {
      headers,
      signal: opts.signal,
    });

    return data;
  } catch (error) {
    console.error("Error creating FIBE submission:", error);
    // Lanzamos el error para que el componente que llama (ej: el formulario)
    // pueda capturarlo y mostrar un mensaje de error detallado al usuario.
    throw error;
  }
}