import { api } from "@/lib/api";
import type { Center } from "@/types/center";

export async function listCenters(signal?: AbortSignal): Promise<Center[]> {
  const { data } = await api.get<Center[]>("/centers", { signal });
  return data.map((c) => ({ ...c, center_id: String(c.center_id) }));
}

export async function getOneCenter(centerId: string, signal?: AbortSignal): Promise<Center> {
  const { data } = await api.get<Center>(`/centers/${centerId}`, { signal });
  return { ...data, center_id: String(data.center_id) };
}
