// src/routes/updateRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { getUpdateRequests, createUpdateRequest, updateRequestById, deleteUpdateRequestById } from '../services/updateService';

const router = Router();

// =================================================================
// 1. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

/**
 * @controller GET /api/updates
 * @description Obtiene todas las solicitudes de actualización, con filtros y paginación.
 */
const listUpdates: RequestHandler = async (req, res) => {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    try {
        const result = await getUpdateRequests(pool, {
            status: status as string,
            page: Number(page),
            limit: Number(limit)
        });
        res.json(result);
    } catch (error) {
        console.error('Error en listUpdates:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * @controller GET /api/updates/center/:centerId
 * @description Obtiene las solicitudes de un centro específico.
 */
const listUpdatesByCenter: RequestHandler = async (req, res) => {
    const { centerId } = req.params;
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    try {
        const result = await getUpdateRequests(pool, {
            status: status as string,
            page: Number(page),
            limit: Number(limit),
            centerId: centerId
        });
        res.json(result);
    } catch (error) {
        console.error(`Error en listUpdatesByCenter (centerId: ${centerId}):`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * @controller POST /api/updates
 * @description Crea una nueva solicitud de actualización.
 */
const createUpdate: RequestHandler = async (req, res) => {
    const { center_id, description, urgency } = req.body;
    const requested_by = (req as any).user?.id; // Proporcionado por el middleware de autenticación

    if (!center_id || !description || !urgency) {
        res.status(400).json({ error: 'Se requieren: center_id, description y urgency.' });
        return;
    }

    try {
        const newRequest = await createUpdateRequest(pool, { center_id, description, urgency, requested_by });
        res.status(201).json(newRequest);
    } catch (error) {
        console.error('Error en createUpdate:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * @controller PATCH /api/updates/:id
 * @description Actualiza una solicitud (ej. la asigna, cambia su estado).
 */
const updateRequest: RequestHandler = async (req, res) => {
    const requestId = parseInt(req.params.id, 10);
    const resolved_by = (req as any).user?.id;
    const { status, assigned_to, resolution_comment } = req.body;

    if (isNaN(requestId)) {
        return res.status(400).json({ error: 'El ID de la solicitud debe ser un número válido.' });
    }
    // LÓGICA ANTIGUA RESTAURADA: El servicio ahora maneja el caso de "no hay campos",
    // pero mantenemos la validación aquí por si acaso.
    if (!status && !assigned_to && !resolution_comment) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
    }

    try {
        const updatedRequest = await updateRequestById(pool, requestId, { ...req.body, resolved_by });

        // El servicio devuelve null si no hay nada que hacer, lo que coincide con la validación de arriba.
        if (!updatedRequest) {
            // Este caso puede ocurrir si el body está vacío, lo cual es un error del cliente.
            return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar.' });
        }

        res.status(200).json(updatedRequest);

    } catch (error: any) {
        // Si el servicio lanza un error con status (ej: 404), lo usamos.
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error(`Error en updateRequest (id: ${requestId}):`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * @controller DELETE /api/updates/:id
 * @description Elimina una solicitud de actualización.
 */
const deleteUpdate: RequestHandler = async (req, res) => {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
        res.status(400).json({ error: 'El ID de la solicitud debe ser un número válido.' });
        return;
    }

    try {
        const deletedCount = await deleteUpdateRequestById(pool, requestId);
        if (deletedCount === 0) {
            res.status(404).json({ error: 'Solicitud no encontrada.' });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        console.error(`Error en deleteUpdate (id: ${requestId}):`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// =================================================================
// 2. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get('/', listUpdates);
router.post('/', createUpdate);
router.get('/center/:centerId', listUpdatesByCenter);
router.patch('/:id', updateRequest);
router.delete('/:id', deleteUpdate);

export default router;