import express from 'express';
import { getAllZones, getZoneById, getOmzZoneForCenter } from '../services/zoneService';

const router = express.Router();

router.get('/', async (req, res) => {
  const { type } = req.query;
  try {
    const zones = await getAllZones(type as 'OMZ' | 'OMZ_OFFICE' | undefined);
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener zonas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const zone = await getZoneById(Number(req.params.id));
    if (!zone) return res.status(404).json({ error: 'Not found' });
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener zona' });
  }
});

export default router;

// Nuevo endpoint: obtener zona OMZ para un centro
router.get('/omz-for-center/:id', async (req, res) => {
  try {
    const result = await getOmzZoneForCenter(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener zona OMZ para el centro' });
  }
});
