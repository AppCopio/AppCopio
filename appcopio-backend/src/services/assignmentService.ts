// src/services/assignmentService.ts
import { PoolClient } from "pg";
import { Db } from "../types/db";
import { AssignmentRole } from "../types/user";

// --- Helpers específicos para este servicio ---

const centersPointerColumn = (role: AssignmentRole): 'municipal_manager_id' | 'comunity_charge_id' => {
    return role === 'trabajador municipal' ? 'municipal_manager_id' : 'comunity_charge_id';
};

// --- Funciones del Servicio ---

/**
 * Obtiene las asignaciones activas de un usuario para un rol específico.
 */
export async function getActiveAssignments(db: Db, userId: number, role: string, excludeCenterId: string | null) {
    const sql = `
      SELECT ca.center_id, c.name AS center_name
      FROM centerassignments ca JOIN centers c ON c.center_id = ca.center_id
      WHERE ca.valid_to IS NULL AND ca.user_id = $1 AND lower(ca.role) = $2
        AND ($3::text IS NULL OR ca.center_id <> $3)
      ORDER BY c.name ASC NULLS LAST, ca.center_id ASC;
    `;
    const { rows } = await db.query(sql, [userId, role, excludeCenterId]);
    return rows;
}

/**
 * Crea una nueva asignación de centro a usuario.
 * Maneja la lógica de cerrar tramos anteriores si es necesario.
 * @param db Cliente de la pool de PostgreSQL para la transacción.
 * @returns Un objeto indicando si la asignación era nueva y los datos de la misma.
 */
export async function createOrUpdateAssignment(client: PoolClient, data: {
    user_id: number;
    center_id: string;
    normRole: AssignmentRole;
    changed_by?: number | null;
}) {
    const { user_id, center_id, normRole, changed_by } = data;

    // 1. Validaciones previas de existencia
    const userRs = await client.query('SELECT is_active FROM users WHERE user_id = $1', [user_id]);
    if (userRs.rowCount === 0) throw { status: 404, message: 'Usuario no existe.' };
    if (!userRs.rows[0].is_active) throw { status: 400, message: 'Usuario inactivo.' };

    const centerRs = await client.query('SELECT 1 FROM centers WHERE center_id = $1', [center_id]);
    if (centerRs.rowCount === 0) throw { status: 404, message: 'Centro no existe.' };

    // 2. Buscar si ya existe una asignación activa para este centro y rol
    const activeRs = await client.query(
      `SELECT assignment_id, user_id FROM centerassignments
       WHERE center_id = $1 AND role = $2 AND valid_to IS NULL LIMIT 1`,
      [center_id, normRole]
    );

    // Si el mismo usuario ya está asignado, no hacemos nada y devolvemos la asignación existente.
    if (activeRs.rowCount && Number(activeRs.rows[0].user_id) === Number(user_id)) {
        return { isNew: false, data: activeRs.rows[0] };
    }

    // Si hay otro usuario, cerramos su tramo
    if (activeRs.rowCount) {
      await client.query(
        `UPDATE centerassignments SET valid_to = NOW(), changed_by = $3
         WHERE center_id = $1 AND role = $2 AND valid_to IS NULL`,
        [center_id, normRole, changed_by]
      );
    }

    // 3. Crear el nuevo tramo de asignación
    const insertRs = await client.query(
      `INSERT INTO centerassignments (center_id, user_id, role, valid_from, changed_by)
       VALUES ($1, $2, $3, NOW(), $4) RETURNING *`,
      [center_id, user_id, normRole, changed_by]
    );

    // 4. Actualizar el puntero denormalizado en la tabla `centers`
    const col = centersPointerColumn(normRole);
    await client.query(
      `UPDATE centers SET ${col} = $2, updated_at = NOW() WHERE center_id = $1`,
      [center_id, user_id]
    );

    // 5. Lógica especial si el rol es 'contacto ciudadano'
    if (normRole === 'contacto ciudadano') {
      // Cierra asignaciones del mismo usuario en OTROS centros
      await client.query(
        `UPDATE centerassignments SET valid_to = NOW(), changed_by = $3
         WHERE user_id = $1 AND role = $2 AND valid_to IS NULL AND center_id <> $4`,
        [user_id, normRole, changed_by, center_id]
      );
      // Limpia punteros en OTROS centros que apunten a este usuario
      await client.query(
        `UPDATE centers SET ${col} = NULL, updated_at = NOW()
         WHERE ${col} = $1 AND center_id <> $2`,
        [user_id, center_id]
      );
    }
    
    return { isNew: true, data: insertRs.rows[0] };
}

/**
 * Desactiva (cierra) una o más asignaciones activas para un usuario en un centro.
 * @param db Cliente de la pool de PostgreSQL para la transacción.
 * @returns El número de asignaciones que fueron cerradas.
 */
export async function removeAssignment(client: PoolClient, data: {
    user_id: number;
    center_id: string;
    normRole?: AssignmentRole;
    changed_by?: number | null;
}) {
    const { user_id, center_id, normRole, changed_by } = data;
    
    const queryParams: any[] = [center_id, user_id];
    let roleFilterSql = '';

    if (normRole) {
        queryParams.push(normRole);
        roleFilterSql = `AND role = $${queryParams.length}`;
    }
    
    queryParams.push(changed_by);
    const changedByIndex = queryParams.length;

    const closeRs = await client.query(
      `UPDATE centerassignments
       SET valid_to = NOW(), changed_at = NOW(), changed_by = $${changedByIndex}
       WHERE center_id = $1 AND user_id = $2 AND valid_to IS NULL ${roleFilterSql}
       RETURNING role`,
      queryParams
    );

    if (closeRs.rowCount === 0) {
      throw { status: 404, message: "No se encontró una asignación activa para cerrar." };
    }

    // Limpiar punteros en la tabla `centers` para los roles afectados
    for (const r of closeRs.rows as { role: AssignmentRole }[]) {
      const col = centersPointerColumn(r.role);
      await client.query(
        `UPDATE centers SET ${col} = NULL, updated_at = NOW()
         WHERE center_id = $1 AND ${col} = $2`,
        [center_id, user_id]
      );
    }
    
    return closeRs.rowCount;
}