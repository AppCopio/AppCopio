// src/routes/inventoryRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { createLogEntry, getLogsByCenterId } from '../services/inventoryService';

const router = Router();

// =================================================================
// 1. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

/**
 * @controller POST /api/inventory/log
 * @description Registra una nueva acción en el historial de inventario.
 */
const createInventoryLog: RequestHandler = async (req, res) => {
    const { center_id, item_id, action_type, quantity } = req.body;
    // Asumimos que el middleware de autenticación ya inyectó el usuario en req.
    const created_by = (req as any).user?.id; 
    
    // La validación de autenticación ahora es responsabilidad del middleware.
    // El controlador solo valida los datos del cuerpo de la petición.
    if (!center_id || !item_id || !action_type || quantity === undefined) {
        res.status(400).json({ error: 'Los campos center_id, item_id, action_type y quantity son requeridos.' });
        return;
    }

    try {
        await createLogEntry(pool, { ...req.body, created_by });
        res.status(201).json({ message: 'Historial de inventario registrado exitosamente.' });
    } catch (error) {
        console.error('Error en createInventoryLog:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar el historial.' });
    }
};

/**
 * @controller GET /api/inventory/log/:centerId
 * @description Obtiene el historial de inventario para un centro específico.
 */
const getInventoryLogsByCenter: RequestHandler = async (req, res) => {
    const { centerId } = req.params;

    try {
        const logs = await getLogsByCenterId(pool, centerId);
        res.status(200).json(logs);
    } catch (error) {
        console.error(`Error en getInventoryLogsByCenter (centerId: ${centerId}):`, error);
        res.status(500).json({ error: 'Error interno del servidor al obtener el historial.' });
    }
};


// =================================================================
// 2. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.post('/log', createInventoryLog);
router.get('/log/:centerId', getInventoryLogsByCenter);

export default router;