// src/types/residents.ts
export interface ResidentGroup {
  rut: string;
  nombre_completo: string;
  integrantes_grupo: number;
  family_id: number;
}

export interface Person {
  rut: string;
  nombre: string;
  fecha_ingreso: string;
  fecha_salida: string;
  edad: number;
  genero: string;
  primer_apellido: string;
  segundo_apellido: string;
  nacionalidad: string;
  estudia: boolean;
  trabaja: boolean;
  perdida_trabajo: boolean;
  rubro: string;
  discapacidad: boolean;
  dependencia: boolean;
}

export interface ActiveCenter {
  activation_id: number;
  center_id: string;
  center_name: string;
}

export interface CapacityInfo {
  capacity: number;
  current_capacity: number;
  available_capacity: number;
}

// Define el tipo para la respuesta del nuevo endpoint
export interface FamilyMembership {
  family_id: number;
  family_name: string;
  is_head: boolean;
  relationship: string; // Parentesco
  // ... otros campos
}

export interface PersonDetailsEnriched {
    person_details: Person; // La persona principal (Person ya debe estar definido)
    family_memberships: FamilyMembership[]; // Los grupos familiares a los que pertenece
}
// ...

export type DepartureReason = "traslado" | "regreso" | "reubicacion";
