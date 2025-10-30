// src/routes/assignmentRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { AssignmentRole } from "../types/user";
import { CreateActivationAssignmentInput, EndActivationAssignmentInput } from '../types/assignment';
import { getActiveAssignments, createOrUpdateAssignment, removeAssignment as removeAssignmentService, 
    createActivationAssignment, listActiveAssignmentsByActivation,  endActivationAssignment, listHistoryOfActiveAssignmentsByActivation } from '../services/assignmentService';
import { requireUser } from "../auth/requireUser";
import { requireAuth } from "../auth/middleware";

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

const createActivationAssignmentHandler: RequestHandler = async (req, res) => {
  const { activation_id, user_id } = req.body;
  
  const started_by = requireUser(req).user_id;

  if (typeof activation_id !== 'number' || typeof user_id !== 'number' || !started_by) {
    return res.status(400).json({ error: "Se requieren 'activation_id' (numérico), 'user_id' (numérico) y estar autenticado." });
  }
    
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const input: CreateActivationAssignmentInput = {
      activation_id,
      user_id,
      started_by,
    };
    
    const newAssignment = await createActivationAssignment(client, input);
    res.status(201).json(newAssignment);
    await client.query('COMMIT');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(`Error en createActivationAssignmentHandler:`, error);
    if (error.status === 409 || error.status === 403) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
  finally {
    client.release();
  }
};

/**
 * @route GET /api/assignments/activations/:activation_id
 * @desc Lista los encargados activos de una activación específica.
 */
const listActivationAssignmentsHandler: RequestHandler = async (req, res)  => {
  const activation_id = parseInt(req.params.activation_id);

  if (isNaN(activation_id)) {
    return res.status(400).json({ error: "Se requiere un 'activation_id' numérico en la URL." });
  }

  try {
    const assignments = await listActiveAssignmentsByActivation(pool, activation_id);
    res.json(assignments);

  } catch (error: any) {
    console.error(`Error en listActivationAssignmentsHandler (id: ${activation_id}):`, error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * @route PUT /api/assignments/activations/end
 * @desc Termina (des-asigna) la asignación activa de un encargado.
 */
const endActivationAssignmentHandler: RequestHandler = async (req, res)  => {
  const { activation_id, user_id } = req.body;
  const ended_by = requireUser(req).user_id;

  if (typeof activation_id !== 'number' || typeof user_id !== 'number' || !ended_by) {
    return res.status(400).json({ error: "Se requieren 'activation_id' (numérico), 'user_id' (numérico) y estar autenticado." });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const input: EndActivationAssignmentInput = {
      activation_id,
      user_id,
      ended_by,
      close_all: req.body.close_all,
    };
    
    // Llamamos al servicio con el pool
    const updatedAssignment = await endActivationAssignment(client, input);
    await client.query('COMMIT');
    res.status(200).json(updatedAssignment);

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(`Error en endActivationAssignmentHandler:`, error);
    // Manejo de errores de negocio (400 o 404)
    if (error.status === 404 || error.status === 400) {
      return res.status(error.status).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    client.release(); // <-- No olvides liberar el cliente
  }
};


const listHistoryOfActivationAssignmentsHandler: RequestHandler = async (req, res)  => {
  const activation_id = parseInt(req.params.activation_id);

  if (isNaN(activation_id)) {
    return res.status(400).json({ error: "Se requiere un 'activation_id' numérico en la URL." });
  }

  try {
    const assignments = await listHistoryOfActiveAssignmentsByActivation(pool, activation_id);
    res.json(assignments);

  } catch (error: any) {
    console.error(`Error en listActivationAssignmentsHandler (id: ${activation_id}):`, error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// =================================================================
// 3. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get("/active/by-user-role", listActiveAssignments);
router.post("/", createAssignment);
router.delete("/", removeAssignment);
router.post('/activations', requireAuth, createActivationAssignmentHandler);
router.get('/activations/:activation_id', requireAuth, listActivationAssignmentsHandler);
router.get('/activations/history/:activation_id', requireAuth, listHistoryOfActivationAssignmentsHandler);
router.put('/activations/end', requireAuth, endActivationAssignmentHandler);

export default router;