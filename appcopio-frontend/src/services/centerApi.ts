// src/services/centerApi.ts
const API_URL = import.meta.env.VITE_API_URL ?? ""; //
import { CenterData } from "../types/center"; // Importamos la nueva interfaz

// La función ahora usa la interfaz importada
export const createCenter = async (centerData: CenterData, token: string) => {
  try {
    const response = await fetch(`${API_URL}/centers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(centerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al crear el centro.');
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const updateCenter = async (centerId: string, centerData: CenterData, token: string) => {
  try {
    const response = await fetch(`${API_URL}/centers/${centerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(centerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al actualizar el centro.');
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};