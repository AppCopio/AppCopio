import { api } from "@/lib/api";

export type Gender = 'F' | 'M' | 'Otro';

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
  genero: Gender;
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

/**
 * Filtros para búsqueda de personas (HdU31)
 */
export interface PersonSearchFilters {
  rut?: string;
  nombre?: string;
  center_id?: string;
}

/**
 * Resultado de búsqueda con información de persona + familia + centro (HdU31)
 */
export interface PersonSearchResult {
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
  // Familia
  family_id: number | null;
  observaciones: string | null;
  necesidades_basicas: number[] | null;
  family_status: string | null;
  parentesco: string | null;
  // Centro
  center_id: string | null;
  center_name: string | null;
  activation_id: number | null;
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
   * Busca personas por RUT, nombre o centro (HdU31)
   * @param filters Filtros de búsqueda (al menos uno requerido)
   * @param signal Señal de cancelación opcional
   * @returns Array de resultados con información completa
   */
  async search(filters: PersonSearchFilters, signal?: AbortSignal): Promise<PersonSearchResult[]> {
    const params = new URLSearchParams();
    if (filters.rut) params.set('rut', filters.rut);
    if (filters.nombre) params.set('nombre', filters.nombre);
    if (filters.center_id) params.set('center_id', filters.center_id);
    
    const r = await api.get(`/persons/search?${params.toString()}`, { signal });
    return r.data ?? [];
  },

  /**
   * Devuelve un "display name" para mostrar en el UI
   */
  getDisplayName(person: Person | PersonSearchResult): string {
    const parts = [person.nombre, person.primer_apellido, person.segundo_apellido].filter(Boolean);
    return parts.join(' ');
  },

  /**
   * Devuelve una representación completa para el selector
   */
  getFullDisplay(person: Person | PersonSearchResult): string {
    const name = this.getDisplayName(person);
    return `${name} - ${person.rut}`;
  },

  /**
   * Formatea nombre completo desde PersonSearchResult
   */
  formatFullName(person: Partial<PersonSearchResult>): string {
    const parts = [
      person.nombre,
      person.primer_apellido,
      person.segundo_apellido
    ].filter(Boolean);
    return parts.join(' ');
  }
};