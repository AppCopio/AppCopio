import type { Person, PersonDetailsEnriched } from "@/services/persons.service";
// src/types/residents.ts
export interface ResidentGroup {
  rut: string;
  nombre_completo: string;
  integrantes_grupo: number;
  family_id: number;
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


export type DepartureReason = "traslado" | "regreso" | "reubicacion";

export type { Person, PersonDetailsEnriched };
