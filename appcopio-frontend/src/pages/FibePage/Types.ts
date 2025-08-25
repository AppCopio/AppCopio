// src/components/fibe/types.ts
export type Gender = "F" | "M" | "Otro";
export type Nationality = "CH" | "EXT";

export type HouseholdData = {
  fibeFolio: string;
  observations: string;
  selectedNeeds: string[]; // máx 3
};

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

export type FormData = {
  hogar: HouseholdData;
  personas: Person[];
};

export const NEEDS_OPTIONS = ["Alimentos", "Agua", "Alimentación lactantes","Colchones/frazadas","Art{iculos de higiene personal","Solución habitacional transitoria","Pañales adulto","Pañales niño","Vestuario","Calefacción",
  "Artículos de aseo", "Materiales de cocina", "Materiales de construcción"];

export const initialPerson = (isHead = false): Person => ({
  rut: "",
  nombre: "",
  primer_apellido: "",
  segundo_apellido: "",
  nacionalidad: "",
  genero: "",
  edad: "",
  estudia: false,
  trabaja: false,
  perdida_trabajo: false,
  rubro: "",
  discapacidad: false,
  dependencia: false,
  parentesco: isHead ? "Jefe de hogar" : "",
});

export const initialData: FormData = {
  hogar: { fibeFolio: "", observations: "", selectedNeeds: [] },
  personas: [initialPerson(true)],
};

export const parentescoOpciones = [
  "Jefe de hogar",
  "Cónyuge / Pareja",
  "Hijo/a",
  "Padre / Madre",
  "Hermano/a",
  "Otro",
];

// API que expone cada paso al padre
export type StepHandle = {
  validate: () => boolean; // o Promise<boolean> si quisieras validar async
};
