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
    const { status = 'pending', page = 1, limit = 10, assignedTo, userCentersOnly } = req.query;
    try {
        const result = await getUpdateRequests(pool, {
            status: status as string,
            page: Number(page),
            limit: Number(limit),
            assignedTo: assignedTo ? Number(assignedTo) : undefined,
            userCentersOnly: userCentersOnly ? Number(userCentersOnly) : undefined
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
    // CAMBIO: Se corrige .id por .user_id para que coincida con el objeto del middleware.
    const requested_by = (req as any).user?.user_id; 

    if (!center_id || !description || !urgency) {
        return res.status(400).json({ error: 'Se requieren: center_id, description y urgency.' });
    }
    // Añadimos una validación para asegurarnos de que el usuario está autenticado
    if (!requested_by) {
        return res.status(401).json({ error: 'No se pudo identificar al solicitante. Se requiere autenticación.' });
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
    // CORRECCIÓN FINAL: Se usa .user_id para que coincida con el objeto del middleware.
    const resolved_by = (req as any).user?.user_id;
    const { status, assigned_to, resolution_comment } = req.body;
    try {
        const updatedRequest = await updateRequestById(pool, requestId, { ...req.body, resolved_by });

        if (!updatedRequest) {
            return res.status(404).json({ error: 'Solicitud no encontrada o sin campos válidos para actualizar.' });
        }

        // --- Notificaciones al resolver ---
        // Solo si la solicitud fue aprobada o rechazada
        if (status === "approved" || status === "rejected") {
            // Importar aquí para evitar ciclos si es necesario
            const { sendNotification } = require("../services/notificationService");

            // Notificación al contacto ciudadano
            if (updatedRequest.requested_by) {
                await sendNotification(pool, {
                    center_id: updatedRequest.center_id,
                    destinatary: updatedRequest.requested_by,
                    title: `Tu solicitud fue ${status === "approved" ? "aprobada" : "rechazada"}`,
                    message: `La solicitud "${updatedRequest.description}" fue ${status === "approved" ? "aprobada" : "rechazada"} por el trabajador municipal. Motivo: ${resolution_comment || ""}`,
                });
            }

            // Notificación al TM (resolutor)
            if (resolved_by) {
                await sendNotification(pool, {
                    center_id: updatedRequest.center_id,
                    destinatary: resolved_by,
                    title: "Notificación enviada al ciudadano",
                    message: `Se notificó al contacto ciudadano sobre la resolución de la solicitud "${updatedRequest.description}".`,
                });
            }
        }

        res.status(200).json(updatedRequest);
    } catch (error: any) {
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