import { api } from "@/lib/api";

export interface Person {
  person_id: number;                // 🆕 agregado (clave primaria del registro)
  rut: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;        // opcional, algunas personas pueden no tener
  fecha_ingreso?: string;           // opcional (algunas filas no tienen)
  fecha_salida?: string;            // opcional
  edad?: number;
  genero?: string;
  nacionalidad?: string;
  estudia?: boolean;
  trabaja?: boolean;
  perdida_trabajo?: boolean;
  rubro?: string;
  discapacidad?: boolean;
  dependencia?: boolean;
  created_at?: string;              // 🆕 para mostrar “Ingreso al Centro”
}

export interface FamilyMembership {
  family_id: number;
  parentesco: string;
  family_status: string;
  activation_id: number;
  es_jefe_hogar: boolean;
}
export interface PersonDetailsEnriched {
  person_details: Person;
  family_memberships: FamilyMembership[];
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

   
  async getDetailsEnriched(id: number, signal?: AbortSignal): Promise<PersonDetailsEnriched | null> {
    const r = await api.get(`/persons/${id}`, { signal });
    // Dado que el backend ya fue configurado para devolver la estructura enriquecida 
    // en esta ruta, simplemente devolvemos la respuesta completa.
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