// src/routes/resourceBoxRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { requireUser } from "../auth/requireUser";
import { requireAuth } from '../auth/middleware';

import {
    createResourceBox as createResourceBoxService,
    getAllResourceBoxes,
    getResourceBoxById,
    updateResourceBox as updateResourceBoxService,
    deleteResourceBox as deleteResourceBoxService
} from '../services/resourceBoxService';

const router = Router();

/**
 * GET /resource-boxes
 * Obtiene todas las cajas de recursos activas
 */
const listResourceBoxes: RequestHandler = async (req, res) => {
    try {
        const boxes = await getAllResourceBoxes(pool);
        res.json(boxes);
    } catch (error) {
        console.error('Error en listResourceBoxes:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * GET /resource-boxes/:boxId
 * Obtiene una caja de recursos específica con sus items
 */
const getResourceBox: RequestHandler = async (req, res) => {
    try {
        const boxId = parseInt(req.params.boxId);
        if (isNaN(boxId)) {
            res.status(400).json({ error: 'ID de caja inválido.' });
            return;
        }

        const box = await getResourceBoxById(pool, boxId);
        if (!box) {
            res.status(404).json({ error: 'Caja no encontrada.' });
            return;
        }

        res.json(box);
    } catch (error) {
        console.error(`Error en getResourceBox (boxId: ${req.params.boxId}):`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * POST /resource-boxes
 * Crea una nueva caja de recursos
 */
const createResourceBox: RequestHandler = async (req, res) => {
    const userId = requireUser(req).user_id;
    const { name, description, items } = req.body;

    // Validaciones
    if (!name || !name.trim()) {
        res.status(400).json({ error: 'El nombre de la caja es requerido.' });
        return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Se requiere al menos un item en la caja.' });
        return;
    }

    // Validar cada item
    for (const item of items) {
        // Los items pueden tener item_id (para referencias existentes) o item_name (para nuevos items)
        if (!item.item_id && !item.item_name) {
            res.status(400).json({ 
                error: 'Cada item debe tener: item_id (referencia a Products) o item_name (para nuevos items).' 
            });
            return;
        }
        if (!item.quantity || item.quantity <= 0) {
            res.status(400).json({ error: 'La cantidad de cada item debe ser mayor a 0.' });
            return;
        }
        
        // Si es un item nuevo (tiene item_name pero no item_id), validar campos adicionales
        if (!item.item_id && item.item_name) {
            if (!item.category_id || !item.unit) {
                res.status(400).json({ 
                    error: 'Los items nuevos deben incluir: item_name, category_id, unit y quantity.' 
                });
                return;
            }
        }
    }

    try {
        const newBox = await createResourceBoxService(pool, {
            name,
            description,
            items,
            userId
        });

        res.status(201).json(newBox);
    } catch (error: any) {
        console.error('Error en createResourceBox:', error);
        
        // Manejo específico de errores de FK
        if (error.code === '23503') { // Foreign key violation
            res.status(400).json({ 
                error: 'Uno o más items no existen en el inventario. Verifique los item_id.' 
            });
            return;
        }
        
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * PUT /resource-boxes/:boxId
 * Actualiza una caja de recursos existente
 */
const updateResourceBox: RequestHandler = async (req, res) => {
    const boxId = parseInt(req.params.boxId);
    
    if (isNaN(boxId)) {
        res.status(400).json({ error: 'ID de caja inválido.' });
        return;
    }

    const { name, description, items } = req.body;

    // Validar que al menos un campo esté presente
    if (!name && !description && !items) {
        res.status(400).json({ error: 'Se requiere al menos un campo para actualizar.' });
        return;
    }

    // Si se proporcionan items, validarlos
    if (items) {
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'Items debe ser un array con al menos un elemento.' });
            return;
        }

        for (const item of items) {
            if (!item.item_id || !item.quantity) {
                res.status(400).json({ 
                    error: 'Cada item debe tener: item_id (referencia a Products) y quantity.' 
                });
                return;
            }
            if (item.quantity <= 0) {
                res.status(400).json({ error: 'La cantidad de cada item debe ser mayor a 0.' });
                return;
            }
        }
    }

    try {
        const updatedBox = await updateResourceBoxService(pool, boxId, {
            name,
            description,
            items
        } as any);

        if (!updatedBox) {
            res.status(404).json({ error: 'Caja no encontrada.' });
            return;
        }

        res.json(updatedBox);
    } catch (error: any) {
        console.error(`Error en updateResourceBox (boxId: ${boxId}):`, error);
        
        // Manejo específico de errores de FK
        if (error.code === '23503') {
            res.status(400).json({ 
                error: 'Uno o más items no existen en el inventario. Verifique los item_id.' 
            });
            return;
        }
        
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * DELETE /resource-boxes/:boxId
 * Marca una caja de recursos como inactiva (soft delete)
 */
const deleteResourceBox: RequestHandler = async (req, res) => {
    const boxId = parseInt(req.params.boxId);
    
    if (isNaN(boxId)) {
        res.status(400).json({ error: 'ID de caja inválido.' });
        return;
    }

    try {
        const deleted = await deleteResourceBoxService(pool, boxId);
        
        if (!deleted) {
            res.status(404).json({ error: 'Caja no encontrada.' });
            return;
        }

        res.json({ message: 'Caja eliminada exitosamente.' });
    } catch (error) {
        console.error(`Error en deleteResourceBox (boxId: ${boxId}):`, error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Definir rutas
router.get('/', requireAuth, listResourceBoxes);
router.get('/:boxId', requireAuth, getResourceBox);
router.post('/', requireAuth, createResourceBox);
router.put('/:boxId', requireAuth, updateResourceBox);
router.delete('/:boxId', requireAuth, deleteResourceBox);

export default router;