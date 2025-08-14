// src/routes/productRoutes.ts

import { Router, Request, Response } from 'express';
import pool from '../config/db';

const router = Router();

/**
 * @route   GET /api/products/categories
 * @desc    Obtiene una lista de todos los nombres de categorías existentes.
 * @access  Public
 */
router.get('/categories', async (req: Request, res: Response) => {
    try {
        // CORRECCIÓN: La consulta ahora lee directamente de la nueva tabla 'Categories'.
        const result = await pool.query(
            'SELECT name FROM Categories ORDER BY name ASC'
        );
        
        // Se extraen solo los nombres para que la respuesta sea un arreglo de strings,
        // como el frontend esperaba originalmente.
        const categoryNames = result.rows.map(row => row.name);
        
        res.json(categoryNames);

    } catch (err) {
        console.error('Error al obtener las categorías:', err);
        res.status(500).send('Error del servidor');
    }
});

// Puedes añadir aquí otras rutas relacionadas con productos si las necesitas en el futuro.

export default router;