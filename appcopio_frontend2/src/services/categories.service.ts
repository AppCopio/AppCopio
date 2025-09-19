//le saque el sort pq en la ruta que arregle ya vienen ordenados alfabeticamente
//le meti trycatch a las cosas



import { api } from "@/lib/api";
import type { Category } from "@/types/inventory";

/**
 * Obtiene la lista de todas las categorías desde la API.
 * La lista ya viene ordenada alfabéticamente desde el backend.
 */
export async function listCategories(signal?: AbortSignal): Promise<Category[]> {
  try {
    const { data } = await api.get<Category[]>("/categories", { signal });
    // MEJORA: Se elimina el .sort() ya que el backend garantiza el orden.
    return data ?? [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    // En caso de error, devolvemos un array vacío para que la UI no se rompa.
    return []; 
  }
}

/**
 * Crea una nueva categoría.
 * @param name El nombre de la categoría a crear.
 */
export async function createCategory(name: string, signal?: AbortSignal): Promise<Category> {
  try {
    const { data } = await api.post<Category>("/categories", { name }, { signal });
    return data;
  } catch (error) {
    console.error("Error creating category:", error);
    // Lanzamos el error de nuevo para que el componente que llamó a la función
    // pueda manejarlo (ej: mostrar un toast de error).
    throw error;
  }
}

/**
 * Elimina una categoría por su ID.
 */
export async function deleteCategory(categoryId: string | number, signal?: AbortSignal): Promise<void> {
  try {
    await api.delete(`/categories/${categoryId}`, { signal });
  } catch (error) {
    console.error(`Error deleting category ${categoryId}:`, error);
    throw error;
  }
}