export interface User {
  user_id: number;
  rut: string;
  username: string;
  email: string;
  role_id: number;
  center_id: string | null;
  created_at: string;
  imagen_perfil?: string | null;
  nombre?: string | null;
  genero?: string | null;
  celular?: string | null;
  is_active: boolean;
  role_name?: string | null; 
  es_apoyo_admin?: boolean;
  active_assignments?: number; 
};

export interface UsersApiResponse {
  users: User[];
  total: number;
}

export interface UserWithCenters extends User {
  assignedCenters: string[]; 
}

// src/types/user.ts

/** Payload para crear usuario */
export interface UserCreateDTO {
  rut: string;
  username: string;
  password: string; // normalmente requerido al crear
  email: string;
  role_id: number;
  nombre?: string | null;
  genero?: string | null;
  celular?: string | null;
  es_apoyo_admin?: boolean;
  is_active?: boolean;
}

/** Payload para actualizar usuario */
export type UserUpdateDTO = Partial<
  Omit<UserCreateDTO, 'rut' | 'password'>
>;

/** Respuesta al activar/desactivar */
export interface UserActivationResponse {
  user_id: number;
  is_active: boolean;
}

/** Respuesta al cambiar contraseña */
export interface UserPasswordResponse {
  ok: true;
}

//tuve que agregar esto para el service de usuarios, segun yo no afecta pero cualquier wea ta x eso juju
export interface Role {
  role_id: number;
  role_name: string;
}