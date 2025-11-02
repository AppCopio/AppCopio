// src/routes/resourceBoxRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { requireAuth } from '../auth/middleware';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(requireAuth);

/**
 * GET /api/resource-boxes
 * Obtiene todas las cajas de recursos disponibles
 */
const getResourceBoxes: RequestHandler = async (req, res) => {
    try {
        const query = `
            SELECT 
                rb.box_id,
                rb.name,
                rb.description,
                rb.created_at,
                u.username as created_by_user_name,
                json_agg(
                    json_build_object(
                        'item_name', bit.item_name,
                        'category_id', bit.category_id,
                        'quantity', bit.quantity,
                        'unit', bit.unit,
                        'notes', bit.notes
                    ) ORDER BY bit.item_name
                ) as items
            FROM ResourceBoxes rb
            LEFT JOIN Users u ON rb.created_by_user_id = u.user_id
            LEFT JOIN BoxItemTemplates bit ON rb.box_id = bit.box_id
            GROUP BY rb.box_id, rb.name, rb.description, rb.created_at, u.username
            ORDER BY rb.created_at DESC
        `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error: any) {
        console.error('Error fetching resource boxes:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
};

/**
 * POST /api/resource-boxes
 * Crea una nueva caja de recursos
 */
const createResourceBox: RequestHandler = async (req, res) => {
    try {
        const { name, description, items } = req.body;
        const user_id = req.user?.userId;

        if (!name || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Se requiere nombre y al menos un item' 
            });
        }

        // Validar estructura de items
        for (const item of items) {
            if (!item.item_name || !item.category_id || !item.quantity || !item.unit) {
                return res.status(400).json({ 
                    error: 'Cada item debe tener item_name, category_id, quantity y unit' 
                });
            }
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Crear la caja
            const boxQuery = `
                INSERT INTO ResourceBoxes (name, description, created_by_user_id)
                VALUES ($1, $2, $3)
                RETURNING box_id, created_at
            `;

            const boxResult = await client.query(boxQuery, [name, description, user_id]);
            const { box_id, created_at } = boxResult.rows[0];

            // 2. Agregar los items template
            for (const item of items) {
                const itemQuery = `
                    INSERT INTO BoxItemTemplates 
                    (box_id, item_name, category_id, quantity, unit, notes)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `;

                await client.query(itemQuery, [
                    box_id,
                    item.item_name,
                    item.category_id,
                    item.quantity,
                    item.unit,
                    item.notes
                ]);
            }

            await client.query('COMMIT');

            res.status(201).json({
                box_id,
                name,
                description,
                created_at,
                items,
                message: 'Caja de recursos creada exitosamente'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error: any) {
        console.error('Error creating resource box:', error);
        res.status(500).json({ 
            error: error.message || 'Error interno del servidor' 
        });
    }
};

// Definir rutas
router.get('/', getResourceBoxes);
router.post('/', createResourceBox);

export default router;