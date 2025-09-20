// src/routes/inventoryRoutes.ts
import { Router, Request, Response, RequestHandler } from 'express';
import pool from '../config/db';

// Interfaz para extender el objeto Request de Express y añadir la propiedad user
interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
    };
}

const router = Router();

// POST: Registrar una acción en el historial de inventario
const logInventoryActionHandler: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    const { center_id, item_id, action_type, quantity, reason, notes } = req.body;
    
    const created_by = req.user?.id;
    if (!created_by) {
        // CORREGIDO: Se elimina la palabra 'return'. La respuesta se envía y la función termina.
        res.status(401).json({ message: 'No autorizado. Se requiere iniciar sesión.' });
        return; 
    }

    if (!center_id || !item_id || !action_type || quantity === undefined) {
        res.status(400).json({ message: 'Los campos center_id, item_id, action_type y quantity son requeridos.' });
        return;
    }

    console.log('📥 Log de inventario recibido:', { ...req.body, created_by });

    try {
        const query = `
            INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, reason, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await pool.query(query, [center_id, item_id, action_type, quantity, reason, notes, created_by]);
        
        res.status(201).json({ message: 'Historial de inventario registrado exitosamente.' });
    } catch (error) {
        console.error('Error registrando historial de inventario:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar el historial.' });
    }
};

// GET: Obtener historial de inventario por centro
const getLogByCenterHandler: RequestHandler = async (req: Request, res: Response) => {
    const { centerId } = req.params;
    try {
        const query = `
            SELECT 
                log.log_id,
                log.action_type,
                log.quantity,
                log.reason,
                log.notes,
                log.created_at,
                p.name AS product_name,
                u.nombre AS user_name
            FROM InventoryLog AS log
            JOIN Products AS p ON log.item_id = p.item_id
            LEFT JOIN users AS u ON log.created_by = u.user_id
            WHERE log.center_id = $1
            ORDER BY log.created_at DESC
        `;
        const result = await pool.query(query, [centerId]);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error obteniendo historial de inventario:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el historial.' });
    }
};


// --- REGISTRO DE RUTAS ---
router.post('/log', logInventoryActionHandler);
router.get('/log/:centerId', getLogByCenterHandler);

export default router;