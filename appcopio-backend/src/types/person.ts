// src/types/person.ts

export type Gender = "F" | "M" | "Otro";
export type Nationality = "CH" | "EXT";

/**
 * CAMBIO: Renombrado de 'Person' a 'FibePersonData'.
 * Representa los datos de una persona tal como se reciben desde el
 * formulario de la ficha FIBE. Incluye campos que no se guardan
 * directamente en la tabla 'Persons', como 'parentesco'.
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
 * NUEVO: Representa el objeto de una persona tal como existe en la
 * tabla 'Persons' de la base de datos. Este es el modelo de datos "real".
 */
export type Person = {
    person_id: number;
    rut: string;
    nombre: string;
    primer_apellido: string;
    segundo_apellido: string | null;
    genero: Gender | null;
    edad: number | null;
    created_at: string;
    updated_at: string | null;
    // Los otros campos de la ficha FIBE no se guardan en esta tabla.
};

/**
 * NUEVO: Representa los datos mínimos necesarios para crear o actualizar
 * una persona en la base de datos. Este es el tipo que usará 'personService'.
 */
export type PersonCreate = {
    rut: string;
    nombre: string;
    primer_apellido: string;
    segundo_apellido?: string | null;
    genero?: Gender | null;
    edad?: number | null;
    // Nota: El resto de los campos de FibePersonData se manejan en otras
    // tablas (como el parentesco) o no se persisten directamente.
};