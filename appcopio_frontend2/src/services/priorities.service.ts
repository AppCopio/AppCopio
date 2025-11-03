// src/services/priorities.service.ts
import { api } from "@/lib/api";
import type { Priority, CenterPriority, InventoryPriorityItem } from "@/types/priorities";

/**
 * Obtiene todas las prioridades de un centro
 */
export async function getPrioritiesByCenter(centerId: string): Promise<CenterPriority[]> {
  const res = await api.get(`/centers/${centerId}/priorities`);
  return res.data;
}

/**
 * Crea o actualiza la prioridad de un ítem
 */
export async function upsertPriority(
  centerId: string,
  itemId: string,
  priority: Priority
): Promise<CenterPriority> {
  const res = await api.post(`/centers/${centerId}/priorities/${itemId}`, { priority });
  return res.data;
}

/**
 * Elimina la prioridad de un ítem
 */
export async function deletePriority(centerId: string, itemId: string): Promise<void> {
  await api.delete(`/centers/${centerId}/priorities/${itemId}`);
}


export async function getInventoryWithPriorities(centerId: string): Promise<InventoryPriorityItem[]> {
  const res = await api.get(`/centers/${centerId}/itemsPriorities`);
  return res.data;
}

