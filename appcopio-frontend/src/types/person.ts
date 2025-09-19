export type Gender = "F" | "M" | "Otro";
export type Nationality = "CH" | "EXT";

export type Person = {
  rut: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;

  nacionalidad: Nationality | "";
  genero: Gender | "";

  edad: number | ""; // importante para controlar TextField

  estudia: boolean;
  trabaja: boolean;
  perdida_trabajo: boolean;
  discapacidad: boolean;
  dependencia: boolean;

  parentesco?: string; // "Jefe de hogar" para index 0
  rubro?: string;
};
