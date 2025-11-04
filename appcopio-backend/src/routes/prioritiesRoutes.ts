// ============================================================================
// 1. IMPORTS Y CONFIGURACIÓN
// ============================================================================

import { Router, RequestHandler } from 'express';
import { requireUser } from '../auth/requireUser';
import { requireAuth } from '../auth/middleware';
import {
  getPrioritiesByCenter,
  upsertPriority,
  deletePriority,
  getItemsWithPriorities 

} from '../services/prioritiesService';

const router = Router();
type Priority = 'bajo' | 'medio' | 'alto';

// ============================================================================
// 2. SECCIÓN DE RUTAS (Endpoints)
// ============================================================================
// GET /api/centers/:centerId/priorities
const getItemsPriorityByCenter: RequestHandler = async (req, res) => {
  try {
    const centerId = String(req.params.centerId);
    const priorities = await getPrioritiesByCenter(centerId);
    res.json(priorities);
  } catch (err) {
    console.error('❌ Error al obtener prioridades:', err);
    res.status(500).json({ message: 'Error al obtener prioridades' });
  }
};

// POST /api/centers/:centerId/priorities/:itemId
// Require authentication so `req.user` is populated for requireUser()
const updateItemsPriorityByCenter: RequestHandler = async (req, res) => {
  try {
    const user = requireUser(req);
    const userId =  String(user.user_id);

    const centerId = String(req.params.centerId);
    const itemId = String(req.params.itemId);
    const { priority } = req.body;

    if (typeof priority !== 'string' || !['bajo', 'medio', 'alto'].includes(priority)) {
      return res.status(400).json({ message: 'Prioridad inválida' });
    }

    const updated = await upsertPriority(centerId, itemId, priority as Priority, userId);
    res.json(updated);
  } catch (err) {
    console.error('❌ Error al guardar prioridad:', err);
    res.status(500).json({ message: 'Error al guardar prioridad' });
  }
};

// DELETE /api/centers/:centerId/priorities/:itemId
const deleteItemsPriorityByCenter: RequestHandler = async (req, res) => {
  try {
    requireUser(req);
    const centerId = String(req.params.centerId);
    const itemId = String(req.params.itemId);
    await deletePriority(centerId, itemId);
    res.status(204).end();
  } catch (err) {
    console.error('❌ Error al eliminar prioridad:', err);
    res.status(500).json({ message: 'Error al eliminar prioridad' });
  }
};

// GET /api/priorities/:centerId/items
const getInventoryWithPriorities: RequestHandler = async (req, res) => {
    try {
        const centerId =  String(req.params.centerId);
        const items = await getItemsWithPriorities(centerId);
        res.json(items);
    } catch (err) {
        console.error(`Error en getInventoryWithPriorities:`, err);
        res.status(500).json({ message: 'Error interno al obtener inventario con prioridades.' });
    }
};
// ============================================================================
// 3. EXPORT
// ============================================================================
router.get('/:centerId/priorities', getItemsPriorityByCenter);
router.post('/:centerId/priorities/:itemId', requireAuth, updateItemsPriorityByCenter);
router.delete('/:centerId/priorities/:itemId', requireAuth,  deleteItemsPriorityByCenter);
router.get('/:centerId/itemsPriorities',  getInventoryWithPriorities);


export default router;
