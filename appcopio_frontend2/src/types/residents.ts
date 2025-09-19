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

export type DepartureReason = "traslado" | "regreso" | "reubicacion";
