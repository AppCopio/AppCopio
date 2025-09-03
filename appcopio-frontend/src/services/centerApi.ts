// src/services/centerApi.ts
import api from "../lib/api";
import { CenterData } from "../types/center";

// Crear centro
export const createCenter = async (centerData: CenterData) => {
  try {
    const { data } = await api.post(`/centers`, centerData);
    return data;
  } catch (error: any) {
    console.error("API Error:", error);
    const message = error?.response?.data?.message || "Error al crear el centro.";
    throw new Error(message);
  }
};

// Actualizar centro
export const updateCenter = async (centerId: string, centerData: CenterData) => {
  try {
    const { data } = await api.put(`/centers/${centerId}`, centerData);
    return data;
  } catch (error: any) {
    console.error("API Error:", error);
    const message = error?.response?.data?.message || "Error al actualizar el centro.";
    throw new Error(message);
  }
};

// Eliminar centro
export const deleteCenter = async (centerId: string) => {
  try {
    const { data } = await api.delete(`/centers/${centerId}`);
    return data;
  } catch (error: any) {
    console.error("API Error:", error);
    const message = error?.response?.data?.message || "Error al eliminar el centro.";
    throw new Error(message);
  }
};
