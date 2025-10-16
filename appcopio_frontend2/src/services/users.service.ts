// src/services/users.service.ts
import { api } from '@/lib/api';
import { msgFromError, isCancelError } from '@/lib/errors';
import axios from 'axios';
import type {
  User,
  UsersApiResponse,
  UserWithCenters,
  UserCreateDTO,
  UserUpdateDTO,
  UserActivationResponse,
  UserPasswordResponse,
  Role,
  WorkerUser
} from '@/types/user'; // Usamos tus tipos exactos

import type {
  ActiveAssignment
} from '@/types/assignment';

// =================================================================
// SECCIÓN 1: CRUD de Usuarios
// =================================================================

/**
 * Obtiene una lista paginada y filtrada de usuarios.
 */
export async function listUsers(params?: {
  search?: string;
  role_id?: number;
  active?: 0 | 1;
  page?: number;
  pageSize?: number;
}, signal?: AbortSignal): Promise<UsersApiResponse> {
  try {
    const { data } = await api.get<UsersApiResponse>('/users', { params, signal });
    return data ?? { users: [], total: 0 };
  } catch (error) {
    console.error('Error fetching users:', error);
    // Devolvemos una respuesta vacía válida para no romper la UI.
    return { users: [], total: 0 };
  }
}

/**
 * Obtiene los detalles de un único usuario, incluyendo sus centros asignados.
 */
export async function getUser(userId: number | string, signal?: AbortSignal): Promise<UserWithCenters | null> {
  try {
    const { data } = await api.get<UserWithCenters>(`/users/${userId}`, { signal });
    return data;
  } catch (err: any) {
    if (
      axios.isCancel?.(err) ||
      err?.code === 'ERR_CANCELED' ||
      err?.message === 'canceled' ||
      err?.name === 'CanceledError' ||
      err?.name === 'AbortError'
    ) {
      // señal para el caller si decide ignorar cancelaciones
      throw { aborted: true };
    }
    //throw new Error(msgFromError(err, 'Error al obtener el usuario.'));
    console.error(`Error fetching user ${userId}:`, err);
    return null;
  }
}

/**
 * Crea un nuevo usuario.
 */
export async function createUser(payload: UserCreateDTO, signal?: AbortSignal): Promise<User> {
  try {
    // El backend devuelve el usuario creado (sin la contraseña).
    const { data } = await api.post<User>('/users', payload, { signal });
    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    // Relanzamos el error para que el formulario pueda mostrar un mensaje específico.
    throw error;
  }
}

/**
 * Actualiza los datos de un usuario.
 */
export async function updateUser(id: number, payload: UserUpdateDTO, signal?: AbortSignal): Promise<User> {
  try {
    const { data } = await api.put<User>(`/users/${id}`, payload, { signal });
    return data;
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }
}

/**
 * Elimina un usuario por su ID.
 */
export async function deleteUser(id: number, signal?: AbortSignal): Promise<void> {
  try {
    await api.delete(`/users/${id}`, { signal });
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
}

export async function setActive(id: number, is_active: boolean) {
  try {
    const { data } = await api.patch<UserActivationResponse>(`/users/${id}/activate`, {
      is_active,
    });
    return data; // { user_id, is_active }
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al actualizar estado activo del usuario.'));
  }
}

export async function setPassword(id: number, password: string) {
  try {
    const { data } = await api.patch<UserPasswordResponse>(`/users/${id}/password`, {
      password,
    });
    return data; // { ok: true }
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al actualizar la contraseña.'));
  }
}

// =================================================================
// SECCIÓN 2: Roles y Asignaciones
// =================================================================

/**
 * Obtiene la lista completa de roles de usuario.
 */
export async function listRoles(signal?: AbortSignal): Promise<Role[]> {
  try {
    const { data } = await api.get<{ roles: Role[] }>('/roles', { signal });
    return data?.roles ?? [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
}

/**
 * Asigna un centro a un usuario con un rol específico.
 */
export async function assignCenterToUser(payload: { user_id: number; center_id: string; role: string; }, signal?: AbortSignal) {
  try {
    const { data } = await api.post('/assignments', payload, { signal });
    return data;
  } catch (error) {
    console.error(`Error assigning center to user ${payload.user_id}:`, error);
    throw error;
  }
}

/**
 * Desasigna un centro de un usuario.
 */
export async function removeCenterFromUser(payload: { user_id: number; center_id: string; }, signal?: AbortSignal): Promise<void> {
  try {
    await api.delete('/assignments', { data: payload, signal });
  } catch (error) {
    console.error(`Error removing center from user ${payload.user_id}:`, error);
    throw error;
  }
}

/**
 * Obtiene una lista de usuarios activos filtrados por su rol.
 */
export async function listActiveUsersByRole(roleId: number, signal?: AbortSignal): Promise<User[]> {
  try {
    // CAMBIO CRÍTICO: La ruta ahora es '/users/active/by-role/:roleId'
    const { data } = await api.get<{ users: User[] }>(`/users/active/by-role/${roleId}`, { signal });
    return data?.users ?? [];
  } catch (error: any) {
    // Ignorar errores de cancelación (cuando se aborta la petición)
    if (isCancelError(error)) return [];
    console.error(`Error fetching active users for role ${roleId}:`, error);
    return [];
  }
}

export async function listActiveWorkersByRole(roleId: number, signal?: AbortSignal): Promise<WorkerUser[]> {
  try {
    const { data } = await api.get<{ users: WorkerUser[] }>(`/users/active/by-role/${roleId}`, { signal });
    return data?.users ?? [];
  } catch (error: any) {
    // Ignorar errores de cancelación (cuando se aborta la petición)
    if (isCancelError(error)) return [];
    console.error(`Error fetching active workers for role ${roleId}:`, error);
    return [];
  }
}

export async function getActiveAssignmentsByUserRole(
  userId: number,
  role: string,
  options?: { excludeCenterId?: string; signal?: AbortSignal }
): Promise<ActiveAssignment[]> {
  const { excludeCenterId, signal } = options ?? {};
  try {
    const { data } = await api.get<{ assignments: ActiveAssignment[]; count: number }>(
      '/assignments/active/by-user-role',
      {
        params: {
          user_id: userId,
          role, // el backend ya hace trim/lowercase
          ...(excludeCenterId ? { exclude_center_id: excludeCenterId } : {}),
        },
        signal,
      }
    );
    return data?.assignments ?? [];
  } catch (error) {
    console.error(`Error fetching active assignments for user ${userId} and role ${role}:`, error);
    return [];
  }
}