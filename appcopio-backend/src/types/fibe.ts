import type { Person } from "./person";
import type { HouseholdData } from "./family";

export type FormData = {
  hogar: HouseholdData;
  personas: Person[];
};

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
  "Materiales de construcción"];