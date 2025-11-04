import { api } from "@/lib/api";
import { NEEDS_OPTIONS } from "@/types/fibe";

export interface FamilyGroup {
  family_id: number;
  activation_id: number;
  jefe_hogar_person_id: number;
  observaciones: string;
  necesidades_basicas: number[];
  status: string;
  created_at: string;
  updated_at: string;
  headOfHouseholdName?: string; // Nombre del jefe de hogar
}

/**
 * Miembro de familia con todos sus datos (HdU31)
 */
export interface FullFamilyMember {
  member_id: number;
  parentesco: string;
  person_id: number;
  rut: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  nacionalidad: string;
  genero: string;
  edad: number;
  estudia: boolean;
  trabaja: boolean;
  perdida_trabajo: boolean;
  rubro: string | null;
  discapacidad: boolean;
  dependencia: boolean;
}

/**
 * Familia completa con miembros y datos del centro (HdU31)
 */
export interface FullFamily {
  family_id: number;
  activation_id: number;
  jefe_hogar_person_id: number;
  observaciones: string | null;
  necesidades_basicas: number[];
  status: string;
  center_id: string;
  center_name: string;
  miembros: FullFamilyMember[];
}

/**
 * Datos para actualizar familia completa (HdU31)
 */
export interface UpdateFullFamilyData {
  observaciones: string;
  necesidades_basicas: number[];
  miembros: FullFamilyMember[];
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
   * Obtiene una familia completa con todos sus miembros (HdU31)
   * @param familyId ID del grupo familiar
   * @param signal Señal de cancelación opcional
   * @returns Familia completa con miembros
   */
  async getFull(familyId: number, signal?: AbortSignal): Promise<FullFamily> {
    const r = await api.get(`/family/${familyId}/full`, { signal });
    return r.data;
  },

  /**
   * Actualiza una familia completa de forma transaccional (HdU31)
   * @param familyId ID del grupo familiar
   * @param data Datos a actualizar (familia + miembros)
   * @returns Respuesta del servidor
   */
  async updateFull(familyId: number, data: UpdateFullFamilyData): Promise<void> {
    await api.put(`/family/${familyId}/full`, data);
  },

  /**
   * Convierte array de necesidades [1,0,1,...] a nombres seleccionados
   * @param arr Array de 13 enteros (0 o 1)
   * @returns Array de strings con nombres de necesidades
   */
  needsArrayToSelected(arr: number[]): string[] {
    const selected: string[] = [];
    arr.forEach((val, idx) => {
      if (val === 1 && NEEDS_OPTIONS[idx]) {
        selected.push(NEEDS_OPTIONS[idx]);
      }
    });
    return selected;
  },

  /**
   * Convierte nombres seleccionados a array [1,0,1,...]
   * @param selected Array de strings con nombres de necesidades
   * @returns Array de 13 enteros (0 o 1)
   */
  selectedToNeedsArray(selected: string[]): number[] {
    const arr = new Array(NEEDS_OPTIONS.length).fill(0);
    const selectedSet = new Set(selected.map(s => s.toLowerCase()));
    NEEDS_OPTIONS.forEach((name, idx) => {
      if (selectedSet.has(name.toLowerCase())) {
        arr[idx] = 1;
      }
    });
    return arr;
  },

  /**
   * Devuelve un "display name" para mostrar en el UI
   */
  getDisplayName(family: FamilyGroup): string {
    return `Familia #${family.family_id}`;
  },

  /**
   * Obtiene el nombre completo de una persona por su ID
   * @param personId ID de la persona
   * @returns Nombre completo de la persona
   */
  async getPersonName(personId: number): Promise<string> {
    try {
      const r = await api.get(`/persons/${personId}`);
      const person = r.data;
      if (person) {
        const { nombre, primer_apellido, segundo_apellido } = person;
        return [nombre, primer_apellido, segundo_apellido].filter(Boolean).join(' ');
      }
      return "Desconocido";
    } catch (error) {
      console.error(`Error fetching person with ID ${personId}:`, error);
      return "Desconocido";
    }
  },
};