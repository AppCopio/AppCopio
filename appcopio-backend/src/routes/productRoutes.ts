// src/routes/productRoutes.ts
import { Router, Request, Response } from 'express';
import pool from '../config/db';

const router = Router();

// GET /api/products/categories - Obtener todas las categorías únicas
router.get('/categories', async (req: Request, res: Response) => {
  try {
    // SELECT DISTINCT asegura que solo obtengamos cada nombre de categoría una vez
    const result = await pool.query('SELECT DISTINCT category FROM Products ORDER BY category');
    // Mapeamos el resultado para devolver un array de strings simple: ["Alimentos", "Higiene", ...]
    const categories = result.rows.map(row => row.category);
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error al obtener las categorías:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

export default router;