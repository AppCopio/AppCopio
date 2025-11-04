// src/routes/shiftRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { requireAuth } from '../auth/middleware';
import {
    getShiftsByCenter,
    getShiftsByUser,
    getShiftById,
    getShiftHistory,
    createShift,
    updateShift,
    cancelShift,
    deleteShift,
    // exportShiftsToCSV // Comentado - para implementación futura
} from '../services/shiftService';
import { sendNotification } from '../services/notificationService';
import { runShiftStatusUpdateManually } from '../jobs/shiftStatusJob';
import { updateShiftStatuses, getShiftStatusStats, getShiftsNeedingUpdate } from '../services/shiftStatusService';

const router = Router();

// =================================================================
// CONTROLADORES
// =================================================================

/**
 * GET /api/shifts/center/:centerId
 * Obtiene turnos de un centro específico
 * Query params:
 *  - include_history: boolean (incluir turnos completados/cancelados)
 *  - from_date: string ISO (filtrar desde esta fecha)
 *  - to_date: string ISO (filtrar hasta esta fecha)
 */
const listCenterShifts: RequestHandler = async (req, res) => {
    try {
        const { centerId } = req.params;
        const includeHistory = req.query.include_history === 'true';
        const fromDate = req.query.from_date as string;
        const toDate = req.query.to_date as string;
        
        const shifts = await getShiftsByCenter(pool, centerId, {
            includeHistory,
            fromDate,
            toDate
        });
        
        res.json(shifts);
    } catch (error) {
        console.error('Error en listCenterShifts:', error);
        res.status(500).json({ error: 'Error al obtener turnos del centro' });
    }
};

/**
 * GET /api/shifts/user/:userId
 * Obtiene turnos asignados a un usuario
 * Query params:
 *  - include_history: boolean (incluir turnos completados/cancelados)
 *  - from_date: string ISO (filtrar desde esta fecha)
 */
const listUserShifts: RequestHandler = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        
        if (isNaN(userId)) {
            res.status(400).json({ error: 'ID de usuario inválido' });
            return;
        }
        
        const includeHistory = req.query.include_history === 'true';
        const fromDate = req.query.from_date as string;
        
        const shifts = await getShiftsByUser(pool, userId, {
            includeHistory,
            fromDate
        });
        
        res.json(shifts);
    } catch (error) {
        console.error('Error en listUserShifts:', error);
        res.status(500).json({ error: 'Error al obtener turnos del usuario' });
    }
};

/**
 * GET /api/shifts/:shiftId
 * Obtiene un turno específico por ID
 */
const getShift: RequestHandler = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const shift = await getShiftById(pool, shiftId);
        
        if (!shift) {
            res.status(404).json({ error: 'Turno no encontrado' });
            return;
        }
        
        res.json(shift);
    } catch (error) {
        console.error('Error en getShift:', error);
        res.status(500).json({ error: 'Error al obtener el turno' });
    }
};

/**
 * GET /api/shifts/:shiftId/history
 * Obtiene el historial de cambios de un turno
 */
const getHistory: RequestHandler = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const history = await getShiftHistory(pool, shiftId);
        
        res.json(history);
    } catch (error) {
        console.error('Error en getHistory:', error);
        res.status(500).json({ error: 'Error al obtener historial del turno' });
    }
};

/**
 * POST /api/shifts
 * Crea un nuevo turno
 * Body:
 *  - center_id: string (requerido)
 *  - assigned_user_id: number (requerido)
 *  - shift_start: string ISO (requerido)
 *  - shift_end: string ISO (requerido)
 *  - weekdays: number[] (opcional, default: [0,1,2,3,4,5,6])
 *  - notes: string (opcional)
 *  - activation_id: number (opcional, se obtiene automáticamente)
 */
const createNewShift: RequestHandler = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Validar campos requeridos
        if (!req.body.center_id || !req.body.assigned_user_id || !req.body.shift_start || !req.body.shift_end) {
            res.status(400).json({ 
                error: 'Campos requeridos: center_id, assigned_user_id, shift_start, shift_end' 
            });
            return;
        }
        
        const input = {
            center_id: req.body.center_id,
            activation_id: req.body.activation_id,
            assigned_user_id: req.body.assigned_user_id,
            shift_start: req.body.shift_start,
            shift_end: req.body.shift_end,
            weekdays: req.body.weekdays,
            notes: req.body.notes,
            created_by: req.user?.user_id || req.body.created_by
        };
        
        const newShift = await createShift(client, input);
        
        // Enviar notificación al trabajador asignado
        const startDate = new Date(newShift.shift_start);
        const endDate = new Date(newShift.shift_end);
        
        await sendNotification(client, {
            center_id: newShift.center_id,
            activation_id: newShift.activation_id,
            destinatary: newShift.assigned_user_id,
            title: '🗓️ Nuevo turno asignado',
            message: `Se te ha asignado un turno en ${newShift.center_name} desde ${startDate.toLocaleString('es-CL')} hasta ${endDate.toLocaleString('es-CL')}`,
            channel: 'system',
            event_at: new Date().toISOString()
        });
        
        await client.query('COMMIT');
        res.status(201).json(newShift);
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error en createNewShift:', error);
        res.status(400).json({ error: error.message || 'Error al crear turno' });
    } finally {
        client.release();
    }
};

/**
 * PATCH /api/shifts/:shiftId
 * Actualiza un turno existente
 * Body (todos opcionales):
 *  - shift_start: string ISO
 *  - shift_end: string ISO
 *  - weekdays: number[]
 *  - notes: string
 *  - status: 'programado' | 'en_curso' | 'completado' | 'cancelado'
 */
const updateExistingShift: RequestHandler = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { shiftId } = req.params;
        const input = {
            shift_start: req.body.shift_start,
            shift_end: req.body.shift_end,
            weekdays: req.body.weekdays,
            notes: req.body.notes,
            status: req.body.status,
            updated_by: req.user?.user_id || req.body.updated_by
        };
        
        const updatedShift = await updateShift(client, shiftId, input);
        
        await client.query('COMMIT');
        res.json(updatedShift);
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error en updateExistingShift:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar turno' });
    } finally {
        client.release();
    }
};

/**
 * DELETE /api/shifts/:shiftId
 * Cancela un turno (soft delete - cambia status a 'cancelado')
 * Body:
 *  - reason: string (opcional)
 */
const cancelExistingShift: RequestHandler = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { shiftId } = req.params;
        const userId = req.user?.user_id || req.body.cancelled_by;
        const reason = req.body.reason;
        
        await cancelShift(client, shiftId, userId, reason);
        
        await client.query('COMMIT');
        res.json({ message: 'Turno cancelado exitosamente' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error en cancelExistingShift:', error);
        res.status(400).json({ error: error.message || 'Error al cancelar turno' });
    } finally {
        client.release();
    }
};

/**
 * DELETE /api/shifts/:shiftId/hard
 * Elimina completamente un turno (hard delete)
 * ADVERTENCIA: Solo para administradores, elimina permanentemente
 */
const hardDeleteShift: RequestHandler = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { shiftId } = req.params;
        
        await deleteShift(client, shiftId);
        
        await client.query('COMMIT');
        res.json({ message: 'Turno eliminado permanentemente' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error en hardDeleteShift:', error);
        res.status(400).json({ error: error.message || 'Error al eliminar turno' });
    } finally {
        client.release();
    }
};

/**
 * GET /api/shifts/center/:centerId/export
 * Exporta turnos a CSV
 * 
 * COMENTADO - Para implementación futura
 * Query params:
 *  - from_date: string ISO
 *  - to_date: string ISO
 */
/*
const exportCenterShifts: RequestHandler = async (req, res) => {
    try {
        const { centerId } = req.params;
        const fromDate = req.query.from_date as string;
        const toDate = req.query.to_date as string;
        
        const csv = await exportShiftsToCSV(pool, centerId, {
            fromDate,
            toDate
        });
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="turnos_${centerId}_${Date.now()}.csv"`);
        res.send('\uFEFF' + csv); // BOM para UTF-8
    } catch (error) {
        console.error('Error en exportCenterShifts:', error);
        res.status(500).json({ error: 'Error al exportar turnos' });
    }
};
*/

// =================================================================
// CONTROLADORES DE ACTUALIZACIÓN AUTOMÁTICA DE ESTADOS
// =================================================================

/**
 * POST /api/shifts/update-statuses
 * Ejecuta manualmente la actualización de estados de turnos
 * Útil para testing y debugging
 */
const manualStatusUpdate: RequestHandler = async (req, res) => {
    try {
        console.log('[API] Solicitud de actualización manual de estados de turnos');
        
        const result = await runShiftStatusUpdateManually();
        
        res.json({
            success: true,
            message: 'Estados actualizados exitosamente',
            ...result
        });
    } catch (error: any) {
        console.error('[API] Error en actualización manual:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Error al actualizar estados' 
        });
    }
};

/**
 * GET /api/shifts/status-stats
 * Obtiene estadísticas de estados de turnos
 */
const getStatusStats: RequestHandler = async (req, res) => {
    try {
        const stats = await getShiftStatusStats(pool);
        res.json(stats);
    } catch (error: any) {
        console.error('[API] Error al obtener estadísticas:', error);
        res.status(500).json({ 
            error: error.message || 'Error al obtener estadísticas' 
        });
    }
};

/**
 * GET /api/shifts/pending-updates
 * Obtiene turnos que necesitan actualización de estado
 */
const getPendingUpdates: RequestHandler = async (req, res) => {
    try {
        const pending = await getShiftsNeedingUpdate(pool);
        res.json(pending);
    } catch (error: any) {
        console.error('[API] Error al obtener turnos pendientes:', error);
        res.status(500).json({ 
            error: error.message || 'Error al obtener turnos pendientes' 
        });
    }
};

// =================================================================
// RUTAS
// =================================================================

// Rutas de actualización automática (primero para evitar conflictos de rutas)
router.post('/update-statuses', requireAuth, manualStatusUpdate);
router.get('/status-stats', requireAuth, getStatusStats);
router.get('/pending-updates', requireAuth, getPendingUpdates);

// Rutas normales de turnos
router.get('/center/:centerId', requireAuth, listCenterShifts);
router.get('/user/:userId', requireAuth, listUserShifts);
router.get('/:shiftId/history', requireAuth, getHistory);
router.get('/:shiftId', requireAuth, getShift);
router.post('/', requireAuth, createNewShift);
router.patch('/:shiftId', requireAuth, updateExistingShift);
router.delete('/:shiftId', requireAuth, cancelExistingShift);
router.delete('/:shiftId/hard', requireAuth, hardDeleteShift);

// Ruta de exportación CSV - comentada para implementación futura
// router.get('/center/:centerId/export', requireAuth, exportCenterShifts);

export default router;
