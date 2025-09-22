// src/services/userService.ts
import pool from "../config/db";
import bcrypt from "bcryptjs";
import { Db } from "../types/db";

// Tipos para la creación y actualización de usuarios
export interface UserCreate {
    rut: string;
    username: string;
    password?: string; // Es opcional para no requerirlo en la actualización
    email: string;
    role_id: number;
    nombre?: string;
    genero?: string;
    celular?: string;
    imagen_perfil?: string;
    is_active?: boolean;
    es_apoyo_admin?: boolean;
}

export interface UserUpdate {
    username?: string;
    email?: string;
    role_id?: number;
    nombre?: string;
    genero?: string;
    celular?: string;
    imagen_perfil?: string;
    is_active?: boolean;
    es_apoyo_admin?: boolean;
}

/**
 * Obtiene una lista paginada y filtrada de usuarios.
 */
export async function getUsers(db: Db, filters: { search?: string; role_id?: number; active?: boolean; page: number; pageSize: number }) {
    const { search, role_id, active, page, pageSize } = filters;
    const params: any[] = [];
    const where: string[] = [];

    if (search) {
        const like = `%${search}%`;
        where.push(`(u.rut ILIKE $${params.length + 1} OR u.nombre ILIKE $${params.length + 2} OR u.email ILIKE $${params.length + 3})`);
        params.push(like, like, like);
    }
    if (role_id) {
        where.push(`u.role_id = $${params.length + 1}`);
        params.push(role_id);
    }
    if (active !== undefined) {
        where.push(`u.is_active = $${params.length + 1}`);
        params.push(active);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const listSql = `
        SELECT u.user_id, u.rut, u.username, u.email, u.role_id, u.created_at, u.nombre, u.is_active, r.role_name
        FROM users u JOIN roles r ON r.role_id = u.role_id
        ${whereSql} ORDER BY u.nombre ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    const countSql = `SELECT COUNT(*)::int AS total FROM users u ${whereSql}`;
    
    const [listResult, countResult] = await Promise.all([
        db.query(listSql, [...params, pageSize, offset]),
        db.query(countSql, params.slice(0, params.length)) // count no necesita limit/offset
    ]);

    return { users: listResult.rows, total: countResult.rows[0].total };
}

/**
 * Obtiene un usuario por su ID junto con sus centros asignados.
 */
export async function getUserWithAssignments(db: Db, id: number) {
    const userQuery = `
        SELECT u.user_id, u.rut, u.username, u.email, u.role_id, u.nombre, u.is_active, r.role_name
        FROM users u JOIN roles r ON r.role_id = u.role_id
        WHERE u.user_id = $1`;
    const assignmentsQuery = `SELECT center_id FROM centerassignments WHERE user_id = $1 AND valid_to IS NULL`;
    
    const [userResult, assignmentsResult] = await Promise.all([
        db.query(userQuery, [id]),
        db.query(assignmentsQuery, [id])
    ]);

    if (userResult.rowCount === 0) return null;
    
    return { ...userResult.rows[0], assignedCenters: assignmentsResult.rows.map(r => r.center_id) };
}

/**
 * Crea un nuevo usuario.
 */
export async function createUser(db: Db, data: UserCreate) {
    const hash = await bcrypt.hash(data.password!, 10);
    const sql = `
        INSERT INTO users (rut, username, password_hash, email, role_id, nombre, genero, celular, is_active, es_apoyo_admin)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING user_id, rut, username, email, role_id, nombre, is_active`;
    const params = [data.rut, data.username, hash, data.email, data.role_id, data.nombre, data.genero, data.celular, data.is_active ?? true, data.es_apoyo_admin ?? false];
    const result = await db.query(sql, params);
    return result.rows[0];
}

/**
 * Actualiza un usuario por su ID.
 */
export async function updateUserById(db: Db, id: number, data: UserUpdate) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            fields.push(`${key} = $${paramIndex++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) return null;

    const sql = `UPDATE users SET ${fields.join(", ")} WHERE user_id = $${paramIndex} RETURNING *`;
    values.push(id);

    const result = await db.query(sql, values);
    return result.rowCount > 0 ? result.rows[0] : null;
}

/**
 * Elimina un usuario por su ID.
 */
export async function deleteUserById(db: Db, id: number): Promise<number> {
    const result = await db.query("DELETE FROM users WHERE user_id = $1", [id]);
    return result.rowCount;
}

/**
 * Obtiene usuarios activos por un rol específico, incluyendo el conteo de sus asignaciones.
 */
export async function getActiveUsersByRole(db: Db, roleId: number) {
    const sql = `
        SELECT u.user_id, u.rut, u.nombre, r.role_id , r.role_name, COALESCE(a.active_assignments, 0)::int AS active_assignments
        FROM users u
        JOIN roles r ON r.role_id = u.role_id
        LEFT JOIN (
            SELECT user_id, COUNT(*) AS active_assignments
            FROM centerassignments WHERE valid_to IS NULL
            GROUP BY user_id
        ) a ON a.user_id = u.user_id
        WHERE u.is_active = TRUE AND u.role_id = $1
        ORDER BY u.nombre ASC;`;
    const result = await db.query(sql, [roleId]);
    return { users: result.rows, total: result.rowCount };
}