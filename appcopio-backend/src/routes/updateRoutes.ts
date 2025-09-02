
// src/routes/updateRoutes.ts
import { Router, Request, Response, RequestHandler } from 'express';
import pool from '../config/db';

// Interfaz para extender el objeto Request de Express y añadir la propiedad user
interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
    };
}

const router = Router();

/**
 * GET /api/updates - Obtener todas las solicitudes de actualización con filtros y paginación.
 * Query Params:
 * - status: 'pending' | 'approved' | 'rejected' | 'canceled'
 * - page: número de página
 * - limit: resultados por página
 */
const getAllUpdatesHandler: RequestHandler = async (req, res) => {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    try {
        const result = await pool.query(
            `SELECT 
                ur.request_id,
              
                ur.center_id, 
                ur.description,
                ur.status,
                ur.urgency,
                ur.registered_at,
                ur.resolution_comment,
                c.name AS center_name,
                requester.nombre AS requested_by_name,
                assignee.nombre AS assigned_to_name
            FROM UpdateRequests ur
            JOIN Centers c ON ur.center_id = c.center_id
            LEFT JOIN Users requester ON ur.requested_by = requester.user_id
            LEFT JOIN Users assignee ON ur.assigned_to = assignee.user_id
            WHERE ur.status = $1
            ORDER BY ur.registered_at DESC
            LIMIT $2 OFFSET $3`,
            [status, limit, offset]
        );

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM UpdateRequests WHERE status = $1`,
            [status]
        );

        res.json({
            total: Number(countResult.rows[0].count),
            requests: result.rows
        });
    } catch (error) {
        console.error('Error al obtener solicitudes de actualización:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * POST /api/updates - Crear una nueva solicitud de actualización.
 * Requiere autenticación para identificar al solicitante.
 */
const createUpdateHandler: RequestHandler = async (req: AuthenticatedRequest, res) => {
    const { center_id, description, urgency } = req.body;
    const requested_by = req.user?.id;

    if (!requested_by) {
        res.status(401).json({ message: 'No autorizado. Se requiere iniciar sesión.' });
        return;
    }

    if (!center_id || !description || !urgency) {
        res.status(400).json({ message: 'center_id, description, y urgency son campos requeridos.' });
        return;
    }

    try {
        const result = await pool.query(
            `INSERT INTO UpdateRequests (center_id, description, urgency, requested_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [center_id, description, urgency, requested_by]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear la solicitud de actualización:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * PATCH /api/updates/:id - Actualizar una solicitud (asignar, cambiar estado, etc.).
 * Requiere autenticación para identificar quién resuelve.
 */
const updateRequestHandler: RequestHandler = async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { status, assigned_to, resolution_comment } = req.body;
    const resolved_by = req.user?.id;

    /* if (!resolved_by) {
        res.status(401).json({ message: 'No autorizado. Se requiere iniciar sesión.' });
        return;
    } */

    // Construcción dinámica de la consulta para evitar actualizar campos no deseados
    const fields: any[] = [];
    const queryParts: string[] = [];
    let paramIndex = 1;

    if (status) {
        queryParts.push(`status = $${paramIndex++}`);
        fields.push(status);
    }
    if (assigned_to) {
        queryParts.push(`assigned_to = $${paramIndex++}`);
        fields.push(assigned_to);
    }
    if (resolution_comment) {
        queryParts.push(`resolution_comment = $${paramIndex++}`);
        fields.push(resolution_comment);
    }
    // Si se aprueba, rechaza o cancela, se marca como resuelta
    if (status && ['approved', 'rejected', 'canceled'].includes(status)) {
        queryParts.push(`resolved_at = CURRENT_TIMESTAMP`);
        queryParts.push(`resolved_by = $${paramIndex++}`);
        fields.push(resolved_by);
    }

    if (queryParts.length === 0) {
        res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        return;
    }

    fields.push(id); // El ID de la solicitud siempre es el último parámetro

    try {
        const result = await pool.query(
            `UPDATE UpdateRequests SET ${queryParts.join(', ')} WHERE request_id = $${paramIndex} RETURNING *`,
            fields
        );

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Solicitud no encontrada.' });
        } else {
            res.status(200).json(result.rows[0]);
        }
    } catch (error) {
        console.error(`Error al actualizar la solicitud ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * DELETE /api/updates/:id - Eliminar una solicitud de actualización.
 */
const deleteUpdateHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteOp = await pool.query('DELETE FROM UpdateRequests WHERE request_id = $1', [id]);
        if (deleteOp.rowCount === 0) {
            res.status(404).json({ message: 'Solicitud no encontrada para eliminar.' });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        console.error(`Error al eliminar la solicitud ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// --- REGISTRO DE RUTAS ---
router.get('/', getAllUpdatesHandler);
router.post('/', createUpdateHandler);
router.patch('/:id', updateRequestHandler);
router.delete('/:id', deleteUpdateHandler);

export default router;