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

router.put('/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { name, category } = req.body;

  if (!name || !category) {
    res.status(400).json({ message: 'Se requieren name y category.' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE Products SET name = $1, category = $2 WHERE item_id = $3 RETURNING *',
      [name, category, itemId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Producto no encontrado.' });
      return;
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error al actualizar el producto ${itemId}:`, error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

export default router;