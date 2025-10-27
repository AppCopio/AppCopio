// src/services/assignmentService.ts
import { PoolClient } from "pg";
import { Db } from "../types/db";
import { AssignmentRole } from "../types/user";
import { ActivationAssignment, CreateActivationAssignmentInput, ActivationAssignmentDB, EndActivationAssignmentInput } from '../types/assignment';
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

export async function createActivationAssignment(
  db: Db,
  input: CreateActivationAssignmentInput
): Promise<ActivationAssignment> {
  const {
    activation_id,
    user_id,
    started_by
  } = input;

    // ¿Es TM?
  const roleCheckQ = `
    SELECT u.role_id
    FROM Users u
    WHERE u.user_id = $1;
  `;
  const { rows: roleRows } = await db.query(roleCheckQ, [user_id]);

  if (roleRows.length === 0) {
    const err = new Error('Usuario no encontrado.') as any;
    err.status = 404; // Not Found
    throw err;
  }

  const userRole = roleRows[0].role_id;
  
  // (Ajusta 'trabajador municipal' si el nombre exacto en tu BD es otro)
  if (userRole !== 2) {
    const err = new Error('Error: Solo los usuarios con rol "trabajador municipal" pueden ser asignados como encargados de albergue.') as any;
    err.status = 403; 
    throw err;
  }

  // Chequeo de asignación activa previa
  const checkQ = `
    SELECT assignment_id FROM ActivationAssignments
    WHERE user_id = $1 AND end_date IS NULL;
  `;
  const { rows: checkRows } = await db.query(checkQ, [user_id]);

  if (checkRows.length > 0) {
    const err = new Error('Conflicto: Este usuario ya está asignado a otro centro activo.') as any;
    err.status = 409;
    throw err;
  }

  // Crear asignación
  const q = `
    INSERT INTO ActivationAssignments
      (activation_id, user_id, start_date, started_by)
    VALUES ($1, $2, NOW(), $3)
    RETURNING *;
  `;
  const { rows } = await db.query(q, [
    activation_id,
    user_id,
    started_by,
  ]);

  const r: ActivationAssignmentDB = rows[0];

  const out: ActivationAssignment = {
    assignment_id: r.assignment_id,
    activation_id: r.activation_id,
    user_id: r.user_id,
    user_name: undefined, 
    start_date: r.start_date, 
    started_by_name: undefined,
    end_date: r.end_date,
    ended_by_name: undefined,
  };

  return out;
}

export async function listActiveAssignmentsByActivation(
  db: Db, 
  activation_id: number
): Promise<ActivationAssignment[]> {

  const q = `
    SELECT 
      a.assignment_id,
      a.activation_id,
      a.user_id,
      u.nombre as user_name, -- Nombre del usuario asignado
      a.start_date,
      s.nombre as started_by_name, -- Nombre de quién lo asignó
      a.end_date,
      e.nombre as ended_by_name -- Nombre de quién lo terminó
    FROM 
      ActivationAssignments a
    LEFT JOIN 
      Users u ON a.user_id = u.user_id
    LEFT JOIN 
      Users s ON a.started_by = s.user_id
    LEFT JOIN 
      Users e ON a.ended_by = e.user_id
    WHERE 
      a.activation_id = $1 
      AND a.end_date IS NULL -- Solo las activas
    ORDER BY 
      a.start_date DESC;
  `;

  const { rows } = await db.query(q, [activation_id]);

  // Mapeamos los resultados de la BD al tipo de dominio
  const results: ActivationAssignment[] = rows.map(r => ({
    assignment_id: r.assignment_id,
    activation_id: r.activation_id,
    user_id: r.user_id,
    user_name: r.user_name || undefined, // Asigna el nombre si existe
    start_date: r.start_date,
    started_by_name: r.started_by_name || undefined,
    end_date: r.end_date, // Será null por el WHERE
    ended_by_name: r.ended_by_name || undefined,
  }));

  return results;
}

export async function endActivationAssignment(
  db: Db, 
  input: EndActivationAssignmentInput
): Promise<ActivationAssignment> {
  
  const {
    activation_id,
    user_id,
    ended_by,
  } = input;


  // ¿Centro aún está activo?
  const checkActivationQ = `
    SELECT ca.activation_id
    FROM CentersActivations ca
    JOIN Centers c ON ca.center_id = c.center_id
    WHERE ca.activation_id = $1 AND ca.ended_at IS NULL AND c.is_active = TRUE;
  `;
  const { rows: activeRows } = await db.query(checkActivationQ, [activation_id]);

  if (activeRows.length === 0) {
    const err = new Error('La asignación no se puede terminar porque el centro no está activo o la activación ha finalizado.') as any;
    err.status = 400;
    throw err;
  }

  // Buscar la asignación activa
  const findQ = `
    SELECT * FROM ActivationAssignments
    WHERE user_id = $1 AND activation_id = $2 AND end_date IS NULL;
  `;
  const { rows: findRows } = await db.query(findQ, [user_id, activation_id]);

  if (findRows.length === 0) {
    const err = new Error('No se encontró una asignación activa para este usuario en la activación especificada.') as any;
    err.status = 404;
    throw err;
  }

  const assignment: ActivationAssignmentDB = findRows[0];
  const assignment_id = assignment.assignment_id;

  // No quitar al último encargado
  const countQ = `
    SELECT COUNT(*) FROM ActivationAssignments
    WHERE activation_id = $1 AND end_date IS NULL;
  `;
  const { rows: countRows } = await db.query(countQ, [activation_id]);
  
  if (parseInt(countRows[0].count, 10) <= 1) {
    const err = new Error('No se puede quitar el último encargado de una activación activa.') as any;
    err.status = 400;
    throw err;
  }

  // Cerrar la asignación
  const q = `
    UPDATE ActivationAssignments
    SET 
      end_date = NOW(),
      ended_by = $1
    WHERE 
      assignment_id = $2
    RETURNING *;
  `;
  const { rows } = await db.query(q, [ended_by, assignment_id]);

  const r: ActivationAssignmentDB = rows[0];

  const out: ActivationAssignment = {
    assignment_id: r.assignment_id,
    activation_id: r.activation_id,
    user_id: r.user_id,
    start_date: r.start_date,
    end_date: r.end_date,
  };

  return out;
}