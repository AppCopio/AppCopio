// src/routes/assignmentRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { AssignmentRole } from "../types/user";

// CAMBIO: Importamos las funciones desde el nuevo servicio
import { getActiveAssignments, createOrUpdateAssignment, removeAssignment as removeAssignmentService } from '../services/assignmentService';

const router = Router();

// =================================================================
// 1. SECCIÓN DE UTILIDADES (Helpers)
// =================================================================

/**
 * Normaliza un string de rol a un tipo `AssignmentRole` definido.
 * @param input El rol recibido en la solicitud.
 * @returns El rol normalizado.
 * @throws Error si el rol no es válido.
 */
function normalizeRole(input: string | null | undefined): AssignmentRole {
  const s = String(input || '').trim().toLowerCase();
  if ((s.includes('trabajador') && s.includes('municipal')) || s === 'municipal' || s.includes('manager')) {
    return 'trabajador municipal';
  }
  if ((s.includes('contacto') && (s.includes('ciudadan') || s.includes('comunidad'))) || s.includes('comunidad') || s.includes('community') || s === 'contacto') {
    return 'contacto ciudadano';
  }
  throw new Error('VALIDATION_ROLE');
}

// =================================================================
// 2. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

const listActiveAssignments: RequestHandler = async (req, res) => {
    const userId = Number(req.query.user_id);
    const role = String(req.query.role ?? "").trim().toLowerCase();
    const excludeCenterId = (req.query.exclude_center_id as string) || null;

    if (!Number.isInteger(userId) || userId <= 0) {
        res.status(400).json({ error: "El parámetro 'user_id' es inválido." });
        return;
    }
    if (!role) {
        res.status(400).json({ error: "El parámetro 'role' es requerido." });
        return;
    }

    try {
        // CAMBIO: El controlador llama al servicio para obtener los datos.
        const assignments = await getActiveAssignments(pool, userId, role, excludeCenterId);
        res.json({ assignments: assignments, count: assignments.length });
    } catch (e) {
        console.error("Error en listActiveAssignments:", e);
        res.status(500).json({ error: "No se pudieron cargar las asignaciones activas." });
    }
};

const createAssignment: RequestHandler = async (req, res) => {
    const { user_id, center_id, role, changed_by } = req.body;
    if (!user_id || !center_id || !role) {
        res.status(400).json({ error: "Los campos 'user_id', 'center_id' y 'role' son requeridos." });
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
        
        // CAMBIO: El controlador llama al servicio para ejecutar la lógica de negocio.
        const result = await createOrUpdateAssignment(client, { user_id, center_id, normRole, changed_by });

        await client.query('COMMIT');

        if (!result.isNew) {
            res.status(200).json({ message: "Asignación ya vigente para este usuario.", ...result.data });
        } else {
            res.status(201).json(result.data);
        }
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Error en createAssignment:", error);
        if (error.status) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Error interno al crear la asignación." });
        }
    } finally {
        client.release();
    }
};

const removeAssignment: RequestHandler = async (req, res) => {
    const { user_id, center_id, role, changed_by } = req.body;
    if (!user_id || !center_id) {
        res.status(400).json({ error: "Se requieren user_id y center_id." });
        return;
    }

    let normRole: AssignmentRole | undefined;
    if (role) {
        try {
            normRole = normalizeRole(role);
        } catch {
            res.status(400).json({ error: "Rol inválido." });
            return;
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // CAMBIO: El controlador llama al servicio para ejecutar la lógica.
        await removeAssignmentService(client, { user_id, center_id, normRole, changed_by });

        await client.query('COMMIT');
        res.status(204).send();
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Error en removeAssignment:", error);
        if (error.status) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Error interno al desactivar la asignación." });
        }
    } finally {
        client.release();
    }
};

// =================================================================
// 3. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get("/active/by-user-role", listActiveAssignments);
router.post("/", createAssignment);
router.delete("/", removeAssignment);

export default router;