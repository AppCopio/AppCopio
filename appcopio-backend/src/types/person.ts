export type Gender = "F" | "M" | "Otro";
export type Nationality = "CH" | "EXT";

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
  parentesco: string; // 1ra persona fijo "Jefe de hogar"
};