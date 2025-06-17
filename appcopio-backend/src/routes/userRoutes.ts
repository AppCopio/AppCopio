import { Router } from 'express';
import pool from '../config/db';

const router = Router();

// Obtener usuarios por rol
router.get('/', async (req, res) => {
  const { role } = req.query;

  try {
    const result = await pool.query(
    `
    SELECT u.user_id, u.username 
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE r.role_name = $1
    `,
    [role]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

export default router;
