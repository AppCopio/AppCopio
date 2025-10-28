// src/types/person.ts

export type Gender = "F" | "M" | "Otro";
export type Nationality = "CH" | "EXT";

/**
 * Ocupar al crear Personas desde la FIBE + al llamar para mostrar los datos en tablas (pues incluye parentesco).
 */
export type FibePersonData = {
  rut: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  nacionalidad: Nationality | "";
  genero: Gender | "";
  edad: number | "";
  estudia: boolean;
  trabaja: boolean;
  perdida_trabajo: boolean;
  rubro: string;
  discapacidad: boolean;
  dependencia: boolean;
  parentesco: string; // ej: "Jefe de hogar"
};

/**
 * Ocupar al llamar solo de la tabla Persons (verificaciones de si ya estaba inscrito, ya era jefe de familia, etc.)
 */
export type Person = {
  rut: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  nacionalidad: Nationality | "";
  genero: Gender | "";
  edad: number | "";
  estudia: boolean;
  trabaja: boolean;
  perdida_trabajo: boolean;
  rubro: string;
  discapacidad: boolean;
  dependencia: boolean;
  created_at: string;
  updated_at: string;
};