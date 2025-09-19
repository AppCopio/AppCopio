// src/services/roleService.ts
import pool from "../config/db";
import { Db } from "../types/db";

export interface Role {
    role_id: number;
    role_name: string;
}

/**
 * Obtiene todos los roles de usuario de la base de datos.
 * @param db Pool de conexión a la base de datos.
 * @returns Un array de objetos Role.
 */
export async function getAllRoles(db: Db): Promise<Role[]> {
    const result = await db.query("SELECT role_id, role_name FROM roles ORDER BY role_name ASC");
    return result.rows;
}