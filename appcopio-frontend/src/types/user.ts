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
}

export interface UsersApiResponse {
  users: User[];
  total: number;
}