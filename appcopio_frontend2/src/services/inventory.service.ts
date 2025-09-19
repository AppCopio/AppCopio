import { api } from "@/lib/api";
import type {
  InventoryItem,
  InventoryCreateDTO,
  InventoryUpdateDTO,
  InventoryLog,
} from "@/types/inventory";

export async function listCenterInventory(
  centerId: string,
  signal?: AbortSignal
): Promise<InventoryItem[]> {
  const { data } = await api.get<InventoryItem[]>(`/centers/${centerId}/inventory`, { signal });
  return data ?? [];
}

export async function createInventoryItem(
  centerId: string,
  payload: InventoryCreateDTO,
  signal?: AbortSignal
): Promise<void> {
  await api.post(`/centers/${centerId}/inventory`, payload, { signal });
}

export async function updateInventoryItemQuantity(
  centerId: string,
  itemId: number,
  payload: InventoryUpdateDTO,
  signal?: AbortSignal
): Promise<void> {
  await api.put(`/centers/${centerId}/inventory/${itemId}`, payload, { signal });
}

export async function deleteInventoryItem(
  centerId: string,
  itemId: number,
  signal?: AbortSignal
): Promise<void> {
  await api.delete(`/centers/${centerId}/inventory/${itemId}`, { signal });
}

export async function listInventoryLogs(
  centerId: string,
  signal?: AbortSignal
): Promise<InventoryLog[]> {
  const { data } = await api.get<InventoryLog[]>(`/inventory/log/${centerId}`, { signal });
  return data ?? [];
}