// src/routes/productRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';

const router = Router();

const getCategoriesHandler: RequestHandler = async (req, res) => {
    try {
        // Esta consulta no necesita parámetros.
        const result = await pool.query('SELECT * FROM Categories ORDER BY name ASC');
        // A diferencia de antes, ahora devolvemos el objeto completo con ID y nombre.
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener las categorías:', err);
        res.status(500).send('Error del servidor');
    }
};

router.get('/categories', getCategoriesHandler);

export default router;