import { api } from "@/lib/api";

export interface Person {
  person_id: number;
  rut: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  nacionalidad: string;
  genero: string;
  edad: number;
  created_at: string;
  updated_at: string;
}

export const personsService = {
  async list(signal?: AbortSignal): Promise<Person[]> {
    const r = await api.get(`/persons`, { signal });
    return r.data ?? [];
  },

  async getById(id: number, signal?: AbortSignal): Promise<Person | null> {
    const r = await api.get(`/persons/${id}`, { signal });
    return r.data ?? null;
  },

  /**
   * Devuelve un "display name" para mostrar en el UI
   */
  getDisplayName(person: Person): string {
    const parts = [person.nombre, person.primer_apellido, person.segundo_apellido].filter(Boolean);
    return parts.join(' ');
  },

  /**
   * Devuelve una representación completa para el selector
   */
  getFullDisplay(person: Person): string {
    const name = this.getDisplayName(person);
    return `${name} - ${person.rut}`;
  }
};