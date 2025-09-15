// src/services/centerApi.ts
import { api } from "@/lib/api";
import type { Center, ActiveActivation, CenterData } from "@/types/center";

/* --- Normalización a valores de UI (según brief) --- */
type CenterTypeUI = Center["type"]; // "Acopio" | "Albergue"

function toUIType(raw: any): CenterTypeUI {
  const v = String(raw ?? "").toLowerCase();
  if (v === "acopio") return "Acopio";
  if (v === "albergue") return "Albergue";
  // fallback conservador
  return "Acopio";
}

function toUIOperationalStatus(raw: any): Center["operational_status"] {
  if (raw == null) return undefined;
  const v = String(raw).toLowerCase();
  if (v.includes("cerrado")) return "cerrado temporalmente";
  if (v.includes("capacidad")) return "capacidad maxima";
  return "abierto";
}

function normalizeCenter(raw: any): Center {
  return {
    center_id: String(raw.center_id ?? raw.id ?? ""),
    name: String(raw.name ?? ""),
    address: raw.address ?? null,
    type: toUIType(raw.type),
    is_active: Boolean(raw.is_active),
    operational_status: toUIOperationalStatus(raw.operational_status),
    public_note: raw.public_note ?? null,
    capacity: raw.capacity ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    fullnessPercentage:
      typeof raw.fullnessPercentage === "number" ? raw.fullnessPercentage : undefined,
  };
}

/** Helpers de mapeo (UI ↔ backend) para estado operativo */
export type OperationalStatusUI = "Abierto" | "Cerrado Temporalmente" | "Capacidad Máxima";

export function mapStatusToBackend(status: OperationalStatusUI): string {
  switch (status) {
    case "Abierto": return "abierto";
    case "Cerrado Temporalmente": return "cerrado temporalmente";
    case "Capacidad Máxima": return "capacidad maxima";
  }
}

export function mapStatusToFrontend(status?: string): OperationalStatusUI | undefined {
  if (!status) return;
  switch (status) {
    case "abierto": return "Abierto";
    case "cerrado temporalmente": return "Cerrado Temporalmente";
    case "capacidad maxima": return "Capacidad Máxima";
  }
  return undefined;
}

/* --- Endpoints --- */
export async function listCenters(signal?: AbortSignal): Promise<Center[]> {
  const { data } = await api.get("/centers", { signal });
  return Array.isArray(data) ? data.map(normalizeCenter) : [];
}

export async function getOneCenter(centerId: string, signal?: AbortSignal): Promise<Center> {
  const { data } = await api.get<Center>(`/centers/${centerId}`, { signal });
  return normalizeCenter(data);
}

// Alias para evitar duplicidad en el resto del código
export const getCenter = getOneCenter;

export async function getActiveActivation(
  centerId: string | number,
  signal?: AbortSignal
): Promise<ActiveActivation | null> {
  const { data } = await api.get<ActiveActivation | null>(
    `/centers/${centerId}/activation-active`,
    { signal }
  );
  return data;
}

export async function createCenter(payload: CenterData) {
  const { data } = await api.post("/centers", payload);
  // Si el backend devuelve el centro, normalizamos; si no, devolvemos tal cual
  return data?.center ? normalizeCenter(data.center) : data;
}

export async function updateCenterStatus(
  centerId: string,
  isActive: boolean,
  userId?: string | number
): Promise<void> {
  await api.patch(`/centers/${centerId}/status`, {
    isActive,
    userId: userId ?? null,
  });
}

export async function deleteCenter(centerId: string): Promise<void> {
  await api.delete(`/centers/${centerId}`);
}

export async function updateCenter(centerId: string, payload: CenterData) {
  const { data } = await api.put(`/centers/${centerId}`, payload);
  return data;
}

/** NUEVO: actualizar estado operativo + nota pública */
export async function updateOperationalStatus(
  centerId: string,
  newStatusUi: OperationalStatusUI,
  publicNote?: string
) {
  const operationalStatus = mapStatusToBackend(newStatusUi);
  const { data } = await api.patch(`/centers/${centerId}/operational-status`, {
    operationalStatus,
    publicNote: publicNote || "",
  });
  return data;
}
