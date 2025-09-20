import { api } from "@/lib/api";
import type { Category } from "@/types/inventory";

export async function listCategories(signal?: AbortSignal): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories", { signal });
  return (data ?? []).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCategory(name: string, signal?: AbortSignal): Promise<Category> {
  const { data } = await api.post<Category>("/categories", { name }, { signal });
  return data;
}

export async function deleteCategory(categoryId: string | number, signal?: AbortSignal): Promise<void> {
  await api.delete(`/categories/${categoryId}`, { signal });
}

