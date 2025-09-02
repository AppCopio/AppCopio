// src/routes/assignmentRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { AssignmentRole } from "../types/user";

const router = Router();

// Mapea a la columna puntual en Centers
function centersPointerColumn(role: AssignmentRole): 'municipal_manager_id' | 'comunity_charge_id' {
  return role === 'trabajador municipal' ? 'municipal_manager_id' : 'comunity_charge_id';
}

function normalizeRole(input: string | null | undefined): AssignmentRole {
  const s = String(input || '').trim().toLowerCase();

  // Variantes comunes que llegan desde roles de app (Roles: 'Trabajador Municipal', 'Contacto Ciudadano')
  if (
    s.includes('trabajador') && s.includes('municipal')
    || s === 'municipal'
    || s.includes('manager')
  ) return 'trabajador municipal';

  if (
    s.includes('contacto') && (s.includes('ciudadan') || s.includes('comunidad'))
    || s.includes('comunity') || s.includes('community')
    || s === 'contacto'
  ) return 'contacto ciudadano';

  // Si no podemos mapear, forzamos error explícito:
  throw new Error('VALIDATION_ROLE');
}



// GET /api/assignments/active/by-user-role?user_id=123&role=contacto%20ciudadano[&exclude_center_id=C002]
const getActiveAssignmentsByUserRole: RequestHandler = async (req, res) => {
  const userId = Number(req.query.user_id);
  const role = String(req.query.role ?? "").trim().toLowerCase();
  const excludeCenterId = (req.query.exclude_center_id ? String(req.query.exclude_center_id) : "").trim() || null;

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ error: "user_id inválido" });
    return;
  }
  if (!role) {
    res.status(400).json({ error: "role requerido" });
    return;
  }

  try {
    const sql = `
      SELECT ca.center_id, c.name AS center_name
      FROM centerassignments ca
      JOIN centers c ON c.center_id = ca.center_id
      WHERE ca.valid_to IS NULL
        AND ca.user_id = $1
        AND lower(ca.role) = $2
        AND ($3::text IS NULL OR ca.center_id <> $3)
      ORDER BY c.name ASC NULLS LAST, ca.center_id ASC;
    `;
    const { rows } = await pool.query(sql, [userId, role, excludeCenterId]);
    res.json({ assignments: rows, count: rows.length });
  } catch (e) {
    console.error("GET /assignments/active/by-user-role error:", e);
    res.status(500).json({ error: "No se pudieron cargar las asignaciones activas" });
  }
};

/**
 * @route   POST /api/assignments
 * @desc    Asigna un centro a un usuario (crea nuevo tramo y cierra el anterior de ese centro+rol).
 * @body    { user_id: number, center_id: string, role: string, changed_by?: number }
 */
const addAssignmentHandler: RequestHandler = async (req, res) => {
  const { user_id, center_id, role, changed_by } = req.body || {};
  if (!user_id || !center_id || !role) {
    res.status(400).json({ error: "Se requieren user_id, center_id y role." });
    return;
  }

  let normRole: AssignmentRole;
  try {
    normRole = normalizeRole(role);
  } catch {
    res.status(400).json({ error: "Rol inválido. Use 'Trabajador Municipal' o 'Contacto Ciudadano'." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Si ya hay una asignación ACTIVA para este centro+rol:
    const activeRs = await client.query(
      `SELECT assignment_id, user_id
         FROM centerassignments
        WHERE center_id = $1 AND role = $2 AND valid_to IS NULL
        LIMIT 1`,
      [center_id, normRole]
    );

    if (activeRs.rowCount) {
      const currentUserId = activeRs.rows[0].user_id;
      if (Number(currentUserId) === Number(user_id)) {
        // Ya está asignado el mismo usuario: no generamos un nuevo tramo, devolvemos 200 con el actual.
        await client.query('COMMIT');
        res.status(200).json({ message: "Asignación ya vigente para este usuario.", assignment_id: activeRs.rows[0].assignment_id });
        return;
      }
      // Cerramos el tramo activo actual
      await client.query(
        `UPDATE centerassignments
            SET valid_to = NOW(), changed_at = NOW(), changed_by = $3
          WHERE center_id = $1 AND role = $2 AND valid_to IS NULL`,
        [center_id, normRole, changed_by ?? null]
      );
    }

    // 2) Creamos el nuevo tramo
    const insertRs = await client.query(
      `INSERT INTO centerassignments (center_id, user_id, role, valid_from, changed_by)
       VALUES ($1, $2, $3, NOW(), $4)
       RETURNING assignment_id, center_id, user_id, role, valid_from, valid_to`,
      [center_id, user_id, normRole, changed_by ?? null]
    );

    // 3) Actualizamos el puntero en Centers (columna derivada)
    const col = centersPointerColumn(normRole);
    await client.query(
      `UPDATE centers
          SET ${col} = $2, updated_at = NOW()
        WHERE center_id = $1`,
      [center_id, user_id]
    );

    if (normRole === 'contacto ciudadano') {
      // 1) Cierra tramos activos de este usuario en OTROS centros para ese rol
      await client.query(
        `UPDATE centerassignments
            SET valid_to = NOW(), changed_at = NOW(), changed_by = $3
          WHERE user_id = $1
            AND role = $2
            AND valid_to IS NULL
            AND center_id <> $4`,
        [user_id, normRole, changed_by ?? null, center_id]
      );

      // 2) Limpia punteros en Centers donde ese usuario esté como contacto comunidad
      const col = centersPointerColumn(normRole); // 'comunity_charge_id'
      await client.query(
        `UPDATE centers
            SET ${col} = NULL, updated_at = NOW()
          WHERE ${col} = $1
            AND center_id <> $2`,
        [user_id, center_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(insertRs.rows[0]);
  } catch (e: any) {
    await pool.query('ROLLBACK');
    // Errores típicos
    if (e?.code === '23503') {
      res.status(404).json({ error: "Usuario o Centro no existen." });
      return;
    }
    if (e?.code === '23505') {
      // Protección por índice único parcial (center_id,role WHERE valid_to IS NULL)
      res.status(409).json({ error: "Ya existe una asignación activa para ese centro y rol." });
      return;
    }
    console.error("POST /assignments error:", e);
    res.status(500).json({ error: "Error al crear/actualizar la asignación." });
  } finally {
    client.release();
  }
};

/**
 * @route   DELETE /api/assignments
 * @desc    Desactiva (cierra) la(s) asignación(es) activa(s) del usuario en ese centro.
 * @body    { user_id: number, center_id: string, role?: string, changed_by?: number }
 *
 * Nota: Tu front no envía 'role' aquí. Soportamos ambos casos:
 *  - Sin role: se cierran todas las activas de ese user+center (si en el futuro agregas más tipos).
 *  - Con role: se cierra solo la de ese role.
 */
const removeAssignmentHandler: RequestHandler = async (req, res) => {
  const { user_id, center_id, role, changed_by } = req.body || {};
  if (!user_id || !center_id) {
    res.status(400).json({ error: "Se requieren user_id y center_id." });
    return;
  }

  let roleFilterSql = '';
  const params: any[] = [center_id, user_id];

  if (role) {
    try {
      const normRole = normalizeRole(role);
      roleFilterSql = ' AND role = $3';
      params.push(normRole);
    } catch {
      res.status(400).json({ error: "Rol inválido." });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cerramos tramo(s) activo(s) y recuperamos los roles cerrados para actualizar punteros en Centers
    const closeRs = await client.query(
      `UPDATE centerassignments
          SET valid_to = NOW(), changed_at = NOW(), changed_by = $${role ? 4 : 3}
        WHERE center_id = $1
          AND user_id = $2
          AND valid_to IS NULL
          ${roleFilterSql}
        RETURNING role`,
      role ? [...params, changed_by ?? null] : [...params, changed_by ?? null]
    );

    if (closeRs.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: "No se encontró asignación activa para cerrar." });
      return;
    }

    // Para cada rol cerrado, si el puntero en Centers apunta a este usuario, ponerlo NULL
    for (const r of closeRs.rows as { role: AssignmentRole }[]) {
      const col = centersPointerColumn(r.role);
      await client.query(
        `UPDATE centers
            SET ${col} = NULL, updated_at = NOW()
          WHERE center_id = $1 AND ${col} = $2`,
        [center_id, user_id]
      );
    }

    await client.query('COMMIT');
    res.status(204).send();
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("DELETE /assignments error:", e);
    res.status(500).json({ error: "Error al desactivar la asignación." });
  } finally {
    client.release();
  }
};

// Registro de rutas
router.post("/", addAssignmentHandler);
router.delete("/", removeAssignmentHandler);
router.get("/active/by-user-role", getActiveAssignmentsByUserRole);

export default router;


/*
* A N T I G U O   C Ó D I G O
*/ 
/**
 * @route   POST /api/assignments
 * @desc    Asigna un centro a un usuario (Trabajador Municipal).
 * @access  Private (Admin)
 * @body    { "user_id": number, "center_id": "string" }
 *
const addAssignmentHandler: RequestHandler = async (req, res) => {
    const { user_id, center_id, role } = req.body;

    if (!user_id || !center_id || !role) {
        res.status(400).json({ error: "Se requieren user_id, center_id y role." });
        return;
    }
    

    try {
        const newAssignment = await pool.query(
            `
            INSERT INTO centerassignments (user_id, center_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, center_id, role)
            DO NOTHING
            RETURNING *;
            `,
            [user_id, center_id, role]
        );
        res.status(201).json(newAssignment.rows[0]);
    } catch (e: any) {
        // Código '23505' es para violación de llave primaria (la asignación ya existe)
        if (e?.code === "23505") {
            res.status(409).json({ error: "Este centro ya está asignado a este usuario." });
            return;
        }
        // Código '23503' es para violación de llave foránea (el usuario o el centro no existen)
        if (e?.code === "23503") {
            res.status(404).json({ error: "El usuario o el centro especificado no existen." });
            return;
        }
        console.error("POST /assignments error:", e);
        res.status(500).json({ error: "Error al crear la asignación." });
    }
};

/**
 * @route   DELETE /api/assignments
 * @desc    Desasigna un centro de un usuario.
 * @access  Private (Admin)
 * @body    { "user_id": number, "center_id": "string" }
 *
const removeAssignmentHandler: RequestHandler = async (req, res) => {
    const { user_id, center_id } = req.body;

    if (!user_id || !center_id) {
        res.status(400).json({ error: "Se requieren user_id y center_id." });
        return;
    }

    try {
        const deleteOp = await pool.query(
            `DELETE FROM centerassignments 
             WHERE user_id = $1 AND center_id = $2`,
            [user_id, center_id]
        );

        if (deleteOp.rowCount === 0) {
            res.status(404).json({ error: "No se encontró la asignación para eliminar." });
            return;
        }

        res.status(204).send(); // Éxito, sin contenido
    } catch (e) {
        console.error("DELETE /assignments error:", e);
        res.status(500).json({ error: "Error al eliminar la asignación." });
    }
};


// Registro de rutas
router.post("/", addAssignmentHandler);
router.delete("/", removeAssignmentHandler);

export default router; */