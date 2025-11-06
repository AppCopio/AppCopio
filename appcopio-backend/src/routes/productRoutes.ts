// src/routes/productRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';

const router = Router();

// =================================================================
// 1. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

/**
 * @controller GET /api/products
 * @description Obtiene todos los items de la tabla Products
 */
const getAllProducts: RequestHandler = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.item_id,
                p.name,
                c.name as category,
                p.category_id,
                p.unit
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            ORDER BY p.name ASC
        `;
        
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en getAllProducts:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener los productos.' });
    }
};

// =================================================================
// 2. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get('/', getAllProducts);

export default router;
