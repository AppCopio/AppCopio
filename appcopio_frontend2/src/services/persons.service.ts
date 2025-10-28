import { api } from "@/lib/api";

export interface Person {
  // --- CLAVES Y METADATOS (Obligatorios y NO opcionales) ---
  person_id: number;
  rut: string;
  nombre: string;
  primer_apellido: string;
  created_at: string; // 💡 CRÍTICO: Debe ser obligatorio. Fija error TS2339.
  updated_at: string; // 💡 CRÍTICO: Debe ser obligatorio.
  
  // --- BOOLEANOS (Asumidos NOT NULL, deben ser obligatorios) ---
  estudia: boolean;
  trabaja: boolean;
  perdida_trabajo: boolean;
  discapacidad: boolean;
  dependencia: boolean;

  // --- CAMPOS OPCIONALES EN BD (Usamos '| null' para corregir TS2345) ---
  segundo_apellido: string | null; // 💡 CRÍTICO: Usar '| null' para valor de SQL NULL.
  fecha_ingreso: string | null;    // 💡 CRÍTICO: Fija el error TS2345.
  fecha_salida: string | null;
  edad: number | null;
  genero: string | null;
  nacionalidad: string | null;
  rubro: string | null;
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