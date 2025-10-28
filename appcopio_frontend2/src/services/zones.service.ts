// Devuelve el nombre de la zona OMZ para un centro
export async function getOmzZoneForCenter(centerId: string): Promise<string | null> {
  try {
    const res = await api.get(`/zones/omz-for-center/${centerId}`);
    return res.data.zoneName ?? null;
  } catch (err) {
    return null;
  }
}
import { api } from "@/lib/api";

export interface MunicipalZone {
  id: number;
  name: string;
  type: string;
  geojson: any;
  icon: string | null;
  color: string | null;
  fill: string | null;
  stroke: string | null;
  metadata: any;
}

export async function fetchZones(type: 'OMZ' | 'OMZ_OFFICE', signal?: AbortSignal): Promise<MunicipalZone[]> {
  const { data } = await api.get<MunicipalZone[]>(`/zones?type=${type}`, { signal });
  return data;
}
