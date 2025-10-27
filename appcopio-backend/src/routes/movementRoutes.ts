// src/routes/movementRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { requireAuth } from '../auth/middleware';
import { 
    createEntryMovement, 
    createExitMovement, 
    getMovementHistory, 
    validateStockForExit,
    validateItemDeletion
} from '../services/movementService';
import { getLogsByCenterId } from '../services/inventoryService';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(requireAuth);

/**
 * POST /api/centers/:centerId/movements/entries
 * Crea un movimiento de entrada
 */
const createEntry: RequestHandler = async (req, res) => {
    try {
        const { centerId } = req.params;
        const { reason, notes, items } = req.body;
        const user_id = req.user?.userId;

        if (!reason || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Se requiere motivo y al menos un item' 
            });
        }

        // Validar estructura de items
        for (const item of items) {
            if (!item.item_name || !item.category_id || !item.quantity || !item.unit) {
                return res.status(400).json({ 
                    error: 'Cada item debe tener name, category_id, quantity y unit' 
                });
            }
            if (item.quantity <= 0) {
                return res.status(400).json({ 
                    error: 'La cantidad debe ser mayor a 0' 
                });
            }
        }

        const movement_id = await createEntryMovement(pool, {
            center_id: centerId,
            movement_type: 'ENTRY',
            reason,
            notes,
            user_id,
            items
        });

        res.status(201).json({ 
            movement_id, 
            message: 'Entrada registrada exitosamente' 
        });

    } catch (error: any) {
        console.error('Error creating entry movement:', error);
        res.status(500).json({ 
            error: error.message || 'Error interno del servidor' 
        });
    }
};

/**
 * POST /api/centers/:centerId/movements/exits
 * Crea un movimiento de salida
 */
const createExit: RequestHandler = async (req, res) => {
    try {
        const { centerId } = req.params;
        const { reason, recipient, notes, items } = req.body;
        const user_id = req.user?.userId;

        if (!reason || !recipient || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Se requiere motivo, destinatario y al menos un item' 
            });
        }

        // Validar estructura de items
        for (const item of items) {
            if (!item.item_id || !item.quantity) {
                return res.status(400).json({ 
                    error: 'Cada item debe tener item_id y quantity' 
                });
            }
            if (item.quantity <= 0) {
                return res.status(400).json({ 
                    error: 'La cantidad debe ser mayor a 0' 
                });
            }
        }

        const movement_id = await createExitMovement(pool, {
            center_id: centerId,
            movement_type: 'EXIT',
            reason,
            recipient,
            notes,
            user_id,
            items
        });

        res.status(201).json({ 
            movement_id, 
            message: 'Salida registrada exitosamente' 
        });

    } catch (error: any) {
        console.error('Error creating exit movement:', error);
        
        // Errores específicos de stock
        if (error.message.includes('Stock insuficiente')) {
            return res.status(400).json({ 
                error: error.message,
                type: 'INSUFFICIENT_STOCK'
            });
        }

        res.status(500).json({ 
            error: error.message || 'Error interno del servidor' 
        });
    }
};

/**
 * POST /api/centers/:centerId/movements/validate-stock
 * Valida stock disponible para una salida
 */
const validateStock: RequestHandler = async (req, res) => {
    try {
        const { centerId } = req.params;
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Se requiere al menos un item para validar' 
            });
        }

        const validation = await validateStockForExit(pool, centerId, items);
        
        res.json({
            is_valid: validation.is_valid,
            errors: validation.errors
        });

    } catch (error: any) {
        console.error('Error validating stock:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
};

/**
 * GET /api/centers/:centerId/movements/history
 * Obtiene el historial de movimientos
 */
const getHistory: RequestHandler = async (req, res) => {
    try {
        const { centerId } = req.params;
        console.log(`🔍 Backend: Solicitando historial para centro ${centerId}`);
        
        const history = await getLogsByCenterId(pool, centerId);
        console.log(`📊 Backend: Se encontraron ${history.length} registros de historial`);
        console.log(`📝 Backend: Datos a enviar:`, history);
        
        res.json(history);

    } catch (error: any) {
        console.error('❌ Backend: Error fetching movement history:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
};

/**
 * POST /api/centers/:centerId/items/:itemId/validate-deletion
 * Valida si un item puede ser eliminado
 */
const validateDeletion: RequestHandler = async (req, res) => {
    try {
        const { centerId, itemId } = req.params;
        
        const validation = await validateItemDeletion(pool, centerId, parseInt(itemId));
        
        res.json(validation);

    } catch (error: any) {
        console.error('Error validating item deletion:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
};

// Definir rutas
router.post('/:centerId/movements/entries', createEntry);
router.post('/:centerId/movements/exits', createExit);
router.post('/:centerId/movements/validate-stock', validateStock);
router.get('/:centerId/movements/history', getHistory);
router.post('/:centerId/items/:itemId/validate-deletion', validateDeletion);

/**
 * POST /api/centers/:centerId/movements/box-entries
 * Crea una entrada usando una caja de recursos
 */
const createBoxEntry: RequestHandler = async (req, res) => {
    try {
        const { centerId } = req.params;
        const { box_id, reason, notes } = req.body;
        const user_id = req.user?.userId;

        if (!box_id || !reason) {
            return res.status(400).json({ 
                error: 'Se requiere box_id y motivo' 
            });
        }

        // 1. Obtener los items de la caja
        const boxQuery = `
            SELECT 
                rb.name as box_name,
                bit.item_name,
                bit.category_id,
                bit.quantity,
                bit.unit
            FROM ResourceBoxes rb
            JOIN BoxItemTemplates bit ON rb.box_id = bit.box_id
            WHERE rb.box_id = $1
        `;

        const boxResult = await pool.query(boxQuery, [box_id]);
        
        if (boxResult.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Caja de recursos no encontrada' 
            });
        }

        const boxName = boxResult.rows[0].box_name;
        const items = boxResult.rows;

        // 2. Crear la entrada usando el servicio
        const { createEntryMovement } = await import('../services/movementService');
        
        const movement_id = await createEntryMovement(pool, {
            center_id: centerId,
            movement_type: 'ENTRY',
            reason: `${reason} (Caja: ${boxName})`,
            notes,
            user_id,
            items: items.map(item => ({
                item_name: item.item_name,
                category_id: item.category_id,
                quantity: item.quantity,
                unit: item.unit
            }))
        });

        res.status(201).json({ 
            movement_id, 
            message: `Entrada desde caja "${boxName}" registrada exitosamente` 
        });

    } catch (error: any) {
        console.error('Error creating box entry:', error);
        res.status(500).json({ 
            error: error.message || 'Error interno del servidor' 
        });
    }
};

router.post('/:centerId/movements/box-entries', createBoxEntry);

export default router;