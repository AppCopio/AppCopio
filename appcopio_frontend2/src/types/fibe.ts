
import type { Person } from "@/types/person";
import type { HouseholdData } from "@/types/family";

export type CreateFibeSubmissionDTO = {
  activation_id: number;
  data: FibeFormData;
};

export type CreateFibeSubmissionResponse = {
  family_id: number;
  // ...lo que tu backend devuelva además
  [k: string]: unknown;
};


// === Tipos del formulario (tus nombres) ===
export type FormData = {
  hogar: HouseholdData;
  personas: Person[];
};

// Opciones predefinidas
export const NEEDS_OPTIONS = [
  "Alimentos",
  "Agua",
  "Alimentación lactantes",
  "Colchones/frazadas",
  "Artículos de higiene personal",
  "Solución habitacional transitoria",
  "Pañales adulto",
  "Pañales niño",
  "Vestuario",
  "Calefacción",
  "Artículos de aseo",
  "Materiales de cocina",
  "Materiales de construcción",
];

export type FibeFormData = FormData;

// Persona inicial (jefe si isHead = true)
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

// Estado inicial del formulario
export const initialData: FormData = {
  hogar: { fibeFolio: "", observations: "", selectedNeeds: [] },
  personas: [initialPerson(true)],
};

// Parentescos
export const parentescoOpciones = [
  "Jefe de hogar",
  "Cónyuge/Pareja",
  "Hijo/a",
  "Padre/Madre",
  "Hermano/a",
  "Otro",
];

// API que expone cada paso al padre
export type StepHandle = {
  validate: () => boolean; // o Promise<boolean> si quisieras async
};

// Respuesta compuesta del backend (ajústala si tu API cambia)
export type ComposeResponse = {
  family_id: number;
  jefe_person_id: number;
  jefe_member_id: number;
  members: Array<{ index: number; person_id: number; member_id: number }>;
};
