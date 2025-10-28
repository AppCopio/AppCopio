import { api } from "@/lib/api";

export interface FamilyGroup {
  family_id: number;
  activation_id: number;
  jefe_hogar_person_id: number;
  observaciones: string;
  necesidades_basicas: number[];
  status: string;
  created_at: string;
  updated_at: string;
}

export const familyService = {
  async list(signal?: AbortSignal): Promise<FamilyGroup[]> {
    const r = await api.get(`/family`, { signal });
    return r.data ?? [];
  },

  async getById(id: number, signal?: AbortSignal): Promise<FamilyGroup | null> {
    const r = await api.get(`/family/${id}`, { signal });
    return r.data ?? null;
  },

  /**
   * Devuelve un "display name" para mostrar en el UI
   */
  getDisplayName(family: FamilyGroup): string {
    return `Familia #${family.family_id}`;
  }
};