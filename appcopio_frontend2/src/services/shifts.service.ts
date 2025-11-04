// src/services/shifts.service.ts
import { api } from '@/lib/api';
import type {
  CenterShift,
  CreateShiftInput,
  UpdateShiftInput,
  ShiftHistoryEntry,
  ShiftListOptions,
} from '@/types/shift';
import type { User } from '@/types/user';

/**
 * Obtiene trabajadores disponibles para asignar turnos en un centro
 * (usuarios asignados al centro o sin asignación)
 */
export async function getAvailableWorkers(
  centerId: string,
  signal?: AbortSignal
): Promise<{ users: User[] }> {
  const response = await api.get(`/centers/${centerId}/available-workers`, { signal });
  return response.data;
}

/**
 * Obtiene todos los turnos de un centro específico
 */
export async function getCenterShifts(
  centerId: string,
  options: ShiftListOptions = {},
  signal?: AbortSignal
): Promise<CenterShift[]> {
  const params = new URLSearchParams();
  
  if (options.include_history !== undefined) {
    params.append('include_history', String(options.include_history));
  }
  if (options.from_date) {
    params.append('from_date', options.from_date);
  }
  if (options.to_date) {
    params.append('to_date', options.to_date);
  }
  
  const queryString = params.toString();
  const url = `/shifts/center/${centerId}${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url, { signal });
  return response.data;
}

/**
 * Obtiene los turnos asignados a un usuario específico
 */
export async function getUserShifts(
  userId: number,
  options: ShiftListOptions = {},
  signal?: AbortSignal
): Promise<CenterShift[]> {
  const params = new URLSearchParams();
  
  if (options.include_history !== undefined) {
    params.append('include_history', String(options.include_history));
  }
  if (options.from_date) {
    params.append('from_date', options.from_date);
  }
  
  const queryString = params.toString();
  const url = `/shifts/user/${userId}${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url, { signal });
  return response.data;
}

/**
 * Obtiene un turno específico por ID
 */
export async function getShiftById(
  shiftId: string,
  signal?: AbortSignal
): Promise<CenterShift> {
  const response = await api.get(`/shifts/${shiftId}`, { signal });
  return response.data;
}

/**
 * Obtiene el historial de cambios de un turno
 */
export async function getShiftHistory(
  shiftId: string,
  signal?: AbortSignal
): Promise<ShiftHistoryEntry[]> {
  const response = await api.get(`/shifts/${shiftId}/history`, { signal });
  return response.data;
}

/**
 * Crea un nuevo turno
 */
export async function createShift(
  input: CreateShiftInput,
  signal?: AbortSignal
): Promise<CenterShift> {
  const response = await api.post('/shifts', input, { signal });
  return response.data;
}

/**
 * Actualiza un turno existente
 */
export async function updateShift(
  shiftId: string,
  input: UpdateShiftInput,
  signal?: AbortSignal
): Promise<CenterShift> {
  const response = await api.patch(`shifts/${shiftId}`, input, { signal });
  return response.data;
}

/**
 * Cancela un turno (soft delete)
 */
export async function cancelShift(
  shiftId: string,
  reason?: string,
  signal?: AbortSignal
): Promise<void> {
  await api.delete(`shifts/${shiftId}`, {
    data: { reason },
    signal,
  });
}

/**
 * Elimina completamente un turno (hard delete - solo admin)
 */
export async function deleteShift(
  shiftId: string,
  signal?: AbortSignal
): Promise<void> {
  await api.delete(`shifts/${shiftId}/hard`, { signal });
}

