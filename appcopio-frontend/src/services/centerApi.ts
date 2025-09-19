// src/services/centerApi.ts
import api from "../lib/api";
import { CenterData } from "../types/center";
import { ActiveActivation } from "../types/center";

// Crear centro
export const createCenter = async (centerData: CenterData) => {
  try {
    const { data } = await api.post(`/centers`, centerData);
    return data;
  } catch (error: any) {
    console.error("API Error:", error);
    const message = error?.response?.data?.message || "Error al crear el centro.";
    throw new Error(message);
  }
};

// Actualizar centro
export const updateCenter = async (centerId: string, centerData: CenterData) => {
  try {
    const { data } = await api.put(`/centers/${centerId}`, centerData);
    return data;
  } catch (error: any) {
    console.error("API Error:", error);
    const message = error?.response?.data?.message || "Error al actualizar el centro.";
    throw new Error(message);
  }
};

// Eliminar centro
export const deleteCenter = async (centerId: string) => {
  try {
    const { data } = await api.delete(`/centers/${centerId}`);
    return data;
  } catch (error: any) {
    console.error("API Error:", error);
    const message = error?.response?.data?.message || "Error al eliminar el centro.";
    throw new Error(message);
  }
};


/**
 * Devuelve la activación ACTIVA del centro o null si no hay.
 * GET /centers/:centerId/activation-active  -> 200 { activation_id, ... } | 204 No Content
 */
export async function getActiveActivation(
  centerId: string | number,
  opts?: { signal?: AbortSignal }
): Promise<ActiveActivation | null> {
  const id = String(centerId).trim();

  try {
    const res = await api.get<ActiveActivation | null>(
      `/centers/${encodeURIComponent(id)}/activation-active`,
      {
        signal: opts?.signal,
        // evitar que tome la respuesta de caché
        params: { t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' },
        validateStatus: (s) => (s >= 200 && s < 300) || s === 204,
      }
    );

    if (res.status === 204) return null;

    const data = res.data as any;
    if (!data || !data.activation_id) return null;
    return data as ActiveActivation;
  } catch (error: any) {
    console.error("API Error:", error);
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Error al obtener la activación activa.";
    throw new Error(msg);
  }
}

/** Helper: booleano si el centro tiene activación activa */
export async function hasActiveActivation(centerId: string | number, opts?: { signal?: AbortSignal }) {
  return !!(await getActiveActivation(centerId, opts));
}