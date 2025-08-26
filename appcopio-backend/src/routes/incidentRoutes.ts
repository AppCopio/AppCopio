// src/routes/incidentRoutes.ts
import { Router } from 'express';
import pool from '../config/db';

const router = Router();


// Obtener incidencias filtradas por estado
router.get('/', async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const result = await pool.query(
      `
      SELECT 
        i.incident_id,
        i.description,
        i.status,
        i.registered_at,
        i.center_id,
        i.assigned_to,
        i.resolution_comment,
        u.username AS assigned_username
      FROM incidents i
      LEFT JOIN users u ON i.assigned_to = u.user_id
      WHERE i.status = $1
      ORDER BY i.registered_at DESC
      LIMIT $2 OFFSET $3
      `,
      [status, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM incidents WHERE status = $1`,
      [status]
    );

    res.json({
      total: Number(countResult.rows[0].count),
      incidents: result.rows
    });
  } catch (error) {
    console.error('Error al obtener incidencias:', error);
    res.status(500).json({ error: 'Error al obtener incidencias' });
  }
});



router.get('/center/:centerId', async (req, res) => {
  const { centerId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
         i.incident_id AS id,
         i.description,
         i.urgency,
         i.status,
         i.registered_at AS created_at,
         i.resolution_comment,
         i.resolved_at,
         u.username AS assigned_to_username
       FROM incidents i
       LEFT JOIN users u ON i.assigned_to = u.user_id
       WHERE i.center_id = $1
       ORDER BY i.registered_at DESC`,
      [centerId]
    );

    res.json(result.rows);
    console.log('Incidencias obtenidas:', result.rows);
  } catch (error) {
    console.error('Error al obtener incidencias:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});





// Asignar una incidencia a un usuario
router.post('/:id/assign', async (req, res) => {
    const incidentId = req.params.id;
    const { userId } = req.body;

    try {
        await pool.query(
            `UPDATE "incidents" SET assigned_to = $1 WHERE incident_id = $2`,
            [userId, incidentId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error al asignar incidencia:', error);
        res.status(500).json({ error: 'Error al asignar incidencia' });
    }
});

router.post('/:id/approve', async (req, res) => {
  const incidentId = req.params.id;
  const { userId } = req.body;

  try {
    await pool.query(
      `UPDATE "incidents"
       SET status = 'aceptada',
           assigned_to = COALESCE(assigned_to, $1)
       WHERE incident_id = $2`,
      [userId, incidentId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error al aprobar incidencia:', error);
    res.status(500).json({ error: 'Error al aprobar incidencia' });
  }
});


router.post('/:id/reject', async (req, res) => {
  const incidentId = req.params.id;
  const { userId, comment } = req.body;

  try {
    await pool.query(
      `UPDATE "incidents"
       SET status = 'rechazada',
           assigned_to = COALESCE(assigned_to, $1),
           resolution_comment = $2,
           resolved_at = NOW()
       WHERE incident_id = $3`,
      [userId, comment, incidentId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error al rechazar incidencia:', error);
    res.status(500).json({ error: 'Error al rechazar incidencia' });
  }
});

router.post('/',  async (req, res) => {
  const { center_id, description, urgency } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO Incidents (center_id, description, urgency, status, registered_at)
       VALUES ($1, $2, $3, 'pendiente', NOW())
       RETURNING *`,
      [center_id, description, urgency]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear incidencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});




export default router;
