// src/services/userApi.ts
import api from "../lib/api";
import { UserWithCenters } from "../types/user";

export type AppUser = {
  user_id: number;
  username: string;
  email: string | null;
  nombre: string | null;
  role_id: number;
  role_name?: string;
  is_active: boolean;
  active_assignments?: number; // si lo expone tu backend
};

// Helper de errores consistente
function msgFromError(err: any, fallback: string) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

/** LIST */
export async function listUsers(params: {
  search?: string;
  role_id?: number;
  active?: 0 | 1; // 0|1 según tu API
  page?: number;
  pageSize?: number;
}) {
  try {
    const { data } = await api.get<{ users: any[]; total: number }>(
      "/users",
      { params }
    );
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al listar usuarios."));
  }
}

/** GET ONE */
export async function getUser(
  userId: number | string,
  signal?: AbortSignal
): Promise<UserWithCenters> {
  try {
    const { data } = await api.get<UserWithCenters>(`/users/${userId}`, {
      signal,
    });
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al obtener el usuario."));
  }
}

/** CREATE */
export async function createUser(payload: {
  rut: string;
  username: string;
  password: string;
  email: string;
  role_id: number;
  nombre?: string | null;
  genero?: string | null;
  celular?: string | null;
  es_apoyo_admin?: boolean;
  is_active?: boolean;
}) {
  try {
    const { data } = await api.post("/users", payload);
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al crear el usuario."));
  }
}

/** UPDATE */
export async function updateUser(
  id: number,
  payload: Partial<{
    email: string;
    username: string;
    role_id: number;
    nombre: string | null;
    genero: string | null;
    celular: string | null;
    es_apoyo_admin: boolean;
    is_active: boolean;
  }>
) {
  try {
    const { data } = await api.put(`/users/${id}`, payload);
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al actualizar el usuario."));
  }
}

/** DELETE (204 OK posible) */
export async function deleteUser(id: number) {
  try {
    const { data } = await api.delete<void>(`/users/${id}`);
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al eliminar el usuario."));
  }
}

/** ASSIGN / UNASSIGN */
export async function assignCenterToUser(
  user_id: number,
  center_id: string | number,
  role: string
) {
  try {
    const { data } = await api.post(`/assignments`, { user_id, center_id, role });
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al asignar el centro al usuario."));
  }
}

// DELETE con body: axios usa { data: ... }
export async function removeCenterFromUser(user_id: number, center_id: string) {
  try {
    const { data } = await api.delete<void>(`/assignments`, {
      data: { user_id, center_id },
    });
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al desasignar el centro del usuario."));
  }
}

/** Toggles / acciones */
export async function setActive(id: number, is_active: boolean) {
  try {
    const { data } = await api.patch<{ user_id: number; is_active: boolean }>(
      `/users/${id}/activate`,
      { is_active }
    );
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al actualizar estado activo del usuario."));
  }
}

export async function setPassword(id: number, password: string) {
  try {
    const { data } = await api.patch<{ ok: true }>(`/users/${id}/password`, {
      password,
    });
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al actualizar la contraseña."));
  }
}

/** Roles */
export async function getRoles(signal?: AbortSignal) {
  try {
    const { data } = await api.get<{ roles: { role_id: number; role_name: string }[] }>(
      `/roles`,
      { signal }
    );
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al obtener roles."));
  }
}

// Nueva función específica del backend nuevo
export async function listActiveUsersByRole(roleId: number) {
  try {
    const { data } = await api.get<{ users: AppUser[]; total: number }>(
      `/users/active/role/${roleId}`
    );
    return data.users;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al listar usuarios activos por rol."));
  }
}

export async function getActiveAssignmentsByUserRole(
  user_id: number,
  role: "trabajador municipal" | "contacto ciudadano",
  opts?: { exclude_center_id?: string }
) {
  try {
    const params: Record<string, string> = {
      user_id: String(user_id),
      role,
    };
    if (opts?.exclude_center_id) params.exclude_center_id = opts.exclude_center_id;

    const { data } = await api.get<{
      assignments: { center_id: string; center_name: string }[];
      count: number;
    }>(`/assignments/active/by-user-role`, { params });

    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, "Error al obtener asignaciones activas por rol."));
  }
}
