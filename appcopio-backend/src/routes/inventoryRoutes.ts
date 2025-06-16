// src/routes/inventorytRoutes.ts
import { Router, Request, Response } from 'express';
import pool from '../config/db';

const router = Router();

// POST: Registrar una acción en el historial de inventario (sin user_id)
router.post('/log', async (req, res) => {
  const { center_id, product_name, quantity, action_type } = req.body;
  console.log('📥 Log recibido:', req.body); // 👈 ¡Debe imprimirse al recibir!

  try {
    await pool.query(`
      INSERT INTO InventoryLog (center_id, product_name, quantity, action_type)
      VALUES ($1, $2, $3, $4)
    `, [center_id, product_name, quantity, action_type]);
    res.sendStatus(201);
  } catch (error) {
    console.error('Error registrando historial:', error);
    res.status(500).send('Error registrando historial');
  }
});

// GET: Obtener historial por centro
router.get('/log/:centerId', async (req, res) => {
  const { centerId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM InventoryLog
      WHERE center_id = $1
      ORDER BY created_at DESC
    `, [centerId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).send('Error obteniendo historial');
  }
});

export default router;