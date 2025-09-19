// src/services/users.service.ts
import axios from 'axios';
import { api } from '@/lib/api';
import { msgFromError } from '@/lib/errors';
import type {
  User,
  UsersApiResponse,
  UserWithCenters,
  UserCreateDTO,
  UserUpdateDTO,
  UserActivationResponse,
  UserPasswordResponse,
} from '@/types/user';

/* ========= LIST & GET ========= */

export async function list(params?: {
  search?: string;
  role_id?: number;
  active?: 0 | 1;
  page?: number;
  pageSize?: number;
}) {
  try {
    const { data } = await api.get<UsersApiResponse>('/users', { params });
    return data; // { users, total }
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al listar usuarios.'));
  }
}

export async function getOne(userId: number | string, signal?: AbortSignal) {
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
    throw new Error(msgFromError(err, 'Error al obtener el usuario.'));
  }
}

/* ======= CREATE / UPDATE / DELETE ======= */

export async function create(payload: UserCreateDTO) {
  try {
    const { data } = await api.post<User>('/users', payload);
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al crear el usuario.'));
  }
}

export async function update(id: number, payload: UserUpdateDTO) {
  try {
    const { data } = await api.put<User>(`/users/${id}`, payload);
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al actualizar el usuario.'));
  }
}

export async function remove(id: number) {
  try {
    const { data } = await api.delete<void>(`/users/${id}`);
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al eliminar el usuario.'));
  }
}

/* ========= ACCIONES ESPECÍFICAS ========= */

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

/* ============== ROLES ============== */

export type Role = { role_id: number; role_name: string };

export async function getRoles(signal?: AbortSignal) {
  try {
    const { data } = await api.get<{ roles: Role[] }>('/roles', { signal });
    return data.roles;
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al obtener roles.'));
  }
}

/* ============ ASSIGNMENTS ============ */

export async function assignCenterToUser(
  user_id: number,
  center_id: string | number,
  role: string,
) {
  try {
    const { data } = await api.post('/assignments', { user_id, center_id, role });
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al asignar el centro al usuario.'));
  }
}

/** DELETE con body: axios usa { data } */
export async function removeCenterFromUser(user_id: number, center_id: string) {
  try {
    const { data } = await api.delete<void>('/assignments', {
      data: { user_id, center_id },
    });
    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al desasignar el centro del usuario.'));
  }
}

export async function listActiveUsersByRole(roleId: number) {
  try {
    const { data } = await api.get<{ users: User[]; total: number }>(
      `/users/active/role/${roleId}`,
    );
    return data.users;
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al listar usuarios activos por rol.'));
  }
}

export async function getActiveAssignmentsByUserRole(
  user_id: number,
  role: 'trabajador municipal' | 'contacto ciudadano',
  opts?: { exclude_center_id?: string },
) {
  try {
    const params: Record<string, string> = { user_id: String(user_id), role };
    if (opts?.exclude_center_id) params.exclude_center_id = opts.exclude_center_id;

    const { data } = await api.get<{
      assignments: { center_id: string; center_name: string }[];
      count: number;
    }>('/assignments/active/by-user-role', { params });

    return data;
  } catch (err: any) {
    throw new Error(msgFromError(err, 'Error al obtener asignaciones activas por rol.'));
  }
}
