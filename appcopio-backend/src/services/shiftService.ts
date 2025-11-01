// src/services/shiftService.ts
import { PoolClient } from "pg";
import { Db } from "../types/db";
import { 
    CenterShift, 
    CreateShiftInput, 
    UpdateShiftInput, 
    ShiftValidationResult,
    ShiftConflict,
    ShiftHistoryEntry,
    ShiftListOptions,
    ShiftHistoryAction,
    Weekday
} from "../types/shift";

// =================================================================
// SECCIÓN 1: CONSULTAS (READ)
// =================================================================

/**
 * Obtiene todos los turnos de un centro específico
 */
export async function getShiftsByCenter(
    db: Db, 
    centerId: string, 
    options: ShiftListOptions = {}
): Promise<CenterShift[]> {
    const { includeHistory = false, fromDate, toDate } = options;
    
    let whereConditions = ['s.center_id = $1', 's.deleted_at IS NULL'];
    const params: any[] = [centerId];
    
    if (!includeHistory) {
        whereConditions.push("s.status IN ('programado', 'en_curso')");
    }
    
    if (fromDate) {
        params.push(fromDate);
        whereConditions.push(`s.shift_start >= $${params.length}`);
    }
    
    if (toDate) {
        params.push(toDate);
        whereConditions.push(`s.shift_end <= $${params.length}`);
    }
    
    const query = `
        SELECT 
            s.shift_id,
            s.center_id,
            c.name AS center_name,
            s.activation_id,
            s.assigned_user_id,
            u.nombre AS assigned_user_name,
            u.email AS assigned_user_email,
            s.shift_start,
            s.shift_end,
            s.weekdays,
            s.notes,
            s.status,
            s.created_by,
            s.updated_by,
            s.created_at,
            s.updated_at,
            s.deleted_at
        FROM CenterShifts s
        JOIN Centers c ON c.center_id = s.center_id
        JOIN Users u ON u.user_id = s.assigned_user_id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY s.shift_start ASC
    `;
    
    const result = await db.query(query, params);
    return result.rows.map(mapShiftFromDB);
}

/**
 * Obtiene los turnos asignados a un usuario específico
 */
export async function getShiftsByUser(
    db: Db,
    userId: number,
    options: ShiftListOptions = {}
): Promise<CenterShift[]> {
    const { includeHistory = false, fromDate } = options;
    
    let whereConditions = [
        's.assigned_user_id = $1', 
        's.deleted_at IS NULL'
    ];
    const params: any[] = [userId];
    
    if (!includeHistory) {
        whereConditions.push("s.status IN ('programado', 'en_curso')");
    }
    
    if (fromDate) {
        params.push(fromDate);
        whereConditions.push(`s.shift_start >= $${params.length}`);
    }
    
    const query = `
        SELECT 
            s.shift_id,
            s.center_id,
            c.name AS center_name,
            s.activation_id,
            s.assigned_user_id,
            u.nombre AS assigned_user_name,
            u.email AS assigned_user_email,
            s.shift_start,
            s.shift_end,
            s.weekdays,
            s.notes,
            s.status,
            s.created_by,
            s.updated_by,
            s.created_at,
            s.updated_at,
            s.deleted_at
        FROM CenterShifts s
        JOIN Centers c ON c.center_id = s.center_id
        JOIN Users u ON u.user_id = s.assigned_user_id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY s.shift_start ASC
    `;
    
    const result = await db.query(query, params);
    return result.rows.map(mapShiftFromDB);
}

/**
 * Obtiene un turno específico por ID
 */
export async function getShiftById(db: Db, shiftId: string): Promise<CenterShift | null> {
    const query = `
        SELECT 
            s.shift_id,
            s.center_id,
            c.name AS center_name,
            s.activation_id,
            s.assigned_user_id,
            u.nombre AS assigned_user_name,
            u.email AS assigned_user_email,
            s.shift_start,
            s.shift_end,
            s.weekdays,
            s.notes,
            s.status,
            s.created_by,
            s.updated_by,
            s.created_at,
            s.updated_at,
            s.deleted_at
        FROM CenterShifts s
        JOIN Centers c ON c.center_id = s.center_id
        JOIN Users u ON u.user_id = s.assigned_user_id
        WHERE s.shift_id = $1 AND s.deleted_at IS NULL
    `;
    
    const result = await db.query(query, [shiftId]);
    return result.rowCount > 0 ? mapShiftFromDB(result.rows[0]) : null;
}

/**
 * Obtiene el historial de cambios de un turno
 */
export async function getShiftHistory(
    db: Db,
    shiftId: string
): Promise<ShiftHistoryEntry[]> {
    const query = `
        SELECT 
            h.history_id,
            h.shift_id,
            h.action,
            h.changed_by,
            u.nombre AS changed_by_name,
            h.changed_at,
            h.previous_data,
            h.new_data,
            h.reason
        FROM CenterShiftHistory h
        LEFT JOIN Users u ON u.user_id = h.changed_by
        WHERE h.shift_id = $1
        ORDER BY h.changed_at DESC
    `;
    
    const result = await db.query(query, [shiftId]);
    return result.rows.map(row => ({
        history_id: row.history_id,
        shift_id: row.shift_id,
        action: row.action as ShiftHistoryAction,
        changed_by: row.changed_by,
        changed_by_name: row.changed_by_name,
        changed_at: new Date(row.changed_at).toISOString(),
        previous_data: row.previous_data,
        new_data: row.new_data,
        reason: row.reason
    }));
}

// =================================================================
// SECCIÓN 2: VALIDACIONES
// =================================================================

/**
 * Valida que un turno no se solape con otros turnos del mismo usuario
 */
export async function validateShiftOverlap(
    client: PoolClient,
    input: CreateShiftInput | (UpdateShiftInput & { shift_id: string; assigned_user_id: number; shift_start: string; shift_end: string; weekdays: Weekday[] })
): Promise<ShiftValidationResult> {
    const conflicts: ShiftConflict[] = [];
    
    // Construir query para buscar solapamientos
    let query = `
        SELECT 
            s.shift_id,
            s.center_id,
            c.name AS center_name,
            s.shift_start,
            s.shift_end,
            s.weekdays,
            s.status
        FROM CenterShifts s
        JOIN Centers c ON c.center_id = s.center_id
        WHERE s.assigned_user_id = $1
        AND s.deleted_at IS NULL
        AND s.status IN ('programado', 'en_curso')
        AND (
            (s.shift_start, s.shift_end) OVERLAPS ($2::timestamptz, $3::timestamptz)
        )
        AND s.weekdays && $4::int[]
    `;
    
    const params: any[] = [
        input.assigned_user_id,
        input.shift_start,
        input.shift_end,
        input.weekdays
    ];
    
    // Si es actualización, excluir el turno actual
    if ('shift_id' in input && input.shift_id) {
        query += ` AND s.shift_id != $5`;
        params.push(input.shift_id);
    }
    
    const result = await client.query(query, params);
    
    if (result.rowCount && result.rowCount > 0) {
        const conflictingShifts = result.rows.map(mapShiftFromDB);
        conflicts.push({
            conflictType: 'overlap',
            message: `El trabajador ya tiene ${result.rowCount} turno(s) asignado(s) que se solapa(n) con este horario en: ${conflictingShifts.map(s => s.center_name).join(', ')}`,
            conflictingShifts
        });
    }
    
    return {
        isValid: conflicts.length === 0,
        conflicts
    };
}

/**
 * Obtiene el activation_id de un centro activo
 */
export async function getCenterActiveActivation(
    client: PoolClient,
    centerId: string
): Promise<number> {
    const result = await client.query(`
        SELECT ca.activation_id
        FROM Centers c
        JOIN CentersActivations ca ON ca.center_id = c.center_id
        WHERE c.center_id = $1 
        AND c.is_active = true 
        AND ca.ended_at IS NULL
        LIMIT 1
    `, [centerId]);
    
    if (result.rowCount === 0) {
        throw new Error('El centro no está activo o no tiene una activación vigente');
    }
    
    return result.rows[0].activation_id;
}

// =================================================================
// SECCIÓN 3: CREACIÓN Y ACTUALIZACIÓN
// =================================================================

/**
 * Crea un nuevo turno con validaciones completas
 */
export async function createShift(
    client: PoolClient,
    input: CreateShiftInput
): Promise<CenterShift> {
    // 1. Validar usuario existe y está activo (patrón existente del proyecto)
    const userRs = await client.query(
        'SELECT user_id, is_active, role_id FROM Users WHERE user_id = $1', 
        [input.assigned_user_id]
    );
    if (userRs.rowCount === 0) {
        throw new Error('Usuario no encontrado');
    }
    if (!userRs.rows[0].is_active) {
        throw new Error('El usuario está inactivo');
    }
    
    // 2. Obtener activation_id del centro activo
    let activationId: number;
    if (input.activation_id) {
        activationId = input.activation_id;
    } else {
        activationId = await getCenterActiveActivation(client, input.center_id);
    }
    
    // 3. Preparar weekdays (por defecto todos los días)
    const weekdays = input.weekdays || [0, 1, 2, 3, 4, 5, 6];
    
    // 4. Validar solapamientos
    const overlapValidation = await validateShiftOverlap(client, {
        ...input,
        activation_id: activationId,
        weekdays
    });
    if (!overlapValidation.isValid) {
        throw new Error(overlapValidation.conflicts[0]?.message || 'Conflicto de horarios');
    }
    
    // 5. Insertar turno
    const query = `
        INSERT INTO CenterShifts (
            center_id, activation_id, assigned_user_id,
            shift_start, shift_end, weekdays, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING shift_id
    `;
    
    const result = await client.query(query, [
        input.center_id,
        activationId,
        input.assigned_user_id,
        input.shift_start,
        input.shift_end,
        weekdays,
        input.notes || null,
        input.created_by
    ]);
    
    const shiftId = result.rows[0].shift_id;
    
    // 6. Registrar en historial
    const newShift = await getShiftById(client, shiftId);
    await logShiftHistory(
        client, 
        shiftId, 
        'created', 
        input.created_by, 
        null, 
        newShift,
        'Creación inicial de turno'
    );
    
    return newShift!;
}

/**
 * Actualiza un turno existente
 */
export async function updateShift(
    client: PoolClient,
    shiftId: string,
    input: UpdateShiftInput
): Promise<CenterShift> {
    // 1. Obtener turno actual
    const currentShift = await getShiftById(client, shiftId);
    if (!currentShift) {
        throw new Error('Turno no encontrado');
    }
    
    // 2. Si se cambian fechas/días, validar solapamientos
    if (input.shift_start || input.shift_end || input.weekdays) {
        const validationInput = {
            shift_id: shiftId,
            assigned_user_id: currentShift.assigned_user_id,
            shift_start: input.shift_start || currentShift.shift_start,
            shift_end: input.shift_end || currentShift.shift_end,
            weekdays: input.weekdays || currentShift.weekdays,
            updated_by: input.updated_by
        };
        
        const overlapValidation = await validateShiftOverlap(client, validationInput);
        if (!overlapValidation.isValid) {
            throw new Error(overlapValidation.conflicts[0]?.message || 'Conflicto de horarios');
        }
    }
    
    // 3. Construir query de actualización dinámica
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (input.shift_start !== undefined) {
        updates.push(`shift_start = $${paramIndex++}`);
        values.push(input.shift_start);
    }
    if (input.shift_end !== undefined) {
        updates.push(`shift_end = $${paramIndex++}`);
        values.push(input.shift_end);
    }
    if (input.weekdays !== undefined) {
        updates.push(`weekdays = $${paramIndex++}`);
        values.push(input.weekdays);
    }
    if (input.notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(input.notes);
    }
    if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(input.status);
    }
    
    if (updates.length === 0) {
        return currentShift; // No hay cambios
    }
    
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(input.updated_by);
    updates.push(`updated_at = now()`);
    
    values.push(shiftId);
    
    const query = `
        UPDATE CenterShifts
        SET ${updates.join(', ')}
        WHERE shift_id = $${paramIndex}
    `;
    
    await client.query(query, values);
    
    // 4. Obtener turno actualizado
    const updatedShift = await getShiftById(client, shiftId);
    
    // 5. Registrar en historial
    await logShiftHistory(
        client, 
        shiftId, 
        'updated', 
        input.updated_by, 
        currentShift, 
        updatedShift,
        'Actualización de turno'
    );
    
    return updatedShift!;
}

/**
 * Cancela un turno (soft delete)
 */
export async function cancelShift(
    client: PoolClient,
    shiftId: string,
    userId: number,
    reason?: string
): Promise<void> {
    const currentShift = await getShiftById(client, shiftId);
    if (!currentShift) {
        throw new Error('Turno no encontrado');
    }
    
    await client.query(`
        UPDATE CenterShifts
        SET status = 'cancelado', updated_by = $2, updated_at = now()
        WHERE shift_id = $1
    `, [shiftId, userId]);
    
    await logShiftHistory(
        client, 
        shiftId, 
        'cancelled', 
        userId, 
        currentShift, 
        { ...currentShift, status: 'cancelado' }, 
        reason || 'Turno cancelado'
    );
}

/**
 * Elimina completamente un turno (hard delete - solo para admin)
 */
export async function deleteShift(
    client: PoolClient,
    shiftId: string
): Promise<void> {
    const result = await client.query(
        'DELETE FROM CenterShifts WHERE shift_id = $1',
        [shiftId]
    );
    
    if (result.rowCount === 0) {
        throw new Error('Turno no encontrado');
    }
}

// =================================================================
// SECCIÓN 4: EXPORTACIÓN A CSV (COMENTADO - PARA IMPLEMENTACIÓN FUTURA)
// =================================================================

/**
 * Exporta turnos a formato CSV
 * 
 */
/*
export async function exportShiftsToCSV(
    db: Db,
    centerId: string,
    options: {
        fromDate?: string;
        toDate?: string;
    } = {}
): Promise<string> {
    const shifts = await getShiftsByCenter(db, centerId, {
        includeHistory: true,
        ...options
    });
    
    // Encabezados CSV
    const headers = [
        'Centro',
        'Encargado',
        'Email',
        'Fecha Inicio',
        'Fecha Fin',
        'Hora Inicio',
        'Hora Fin',
        'Días Semana',
        'Estado',
        'Notas'
    ].join(',');
    
    // Nombres de días
    const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    // Filas CSV
    const rows = shifts.map(shift => {
        const startDate = new Date(shift.shift_start);
        const endDate = new Date(shift.shift_end);
        
        const daysStr = shift.weekdays
            .sort((a, b) => a - b)
            .map(d => weekdayNames[d])
            .join(' ');
        
        return [
            escapeCSV(shift.center_name || ''),
            escapeCSV(shift.assigned_user_name || ''),
            escapeCSV(shift.assigned_user_email || ''),
            startDate.toLocaleDateString('es-CL'),
            endDate.toLocaleDateString('es-CL'),
            startDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            endDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            daysStr,
            shift.status,
            escapeCSV(shift.notes || '')
        ].join(',');
    });
    
    return [headers, ...rows].join('\n');
}
*/

// =================================================================
// UTILIDADES INTERNAS
// =================================================================

/**
 * Mapea una fila de la BD al tipo CenterShift
 */
function mapShiftFromDB(row: any): CenterShift {
    return {
        shift_id: row.shift_id,
        center_id: row.center_id,
        center_name: row.center_name,
        activation_id: row.activation_id,
        assigned_user_id: row.assigned_user_id,
        assigned_user_name: row.assigned_user_name,
        assigned_user_email: row.assigned_user_email,
        shift_start: new Date(row.shift_start).toISOString(),
        shift_end: new Date(row.shift_end).toISOString(),
        weekdays: row.weekdays,
        notes: row.notes,
        status: row.status,
        created_by: row.created_by,
        updated_by: row.updated_by,
        created_at: new Date(row.created_at).toISOString(),
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    };
}

/**
 * Registra un cambio en el historial de un turno
 */
async function logShiftHistory(
    client: PoolClient,
    shiftId: string,
    action: ShiftHistoryAction,
    userId: number,
    previousData: any,
    newData: any,
    reason?: string
): Promise<void> {
    await client.query(`
        INSERT INTO CenterShiftHistory (shift_id, action, changed_by, previous_data, new_data, reason)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [
        shiftId, 
        action, 
        userId, 
        previousData ? JSON.stringify(previousData) : null,
        newData ? JSON.stringify(newData) : null,
        reason
    ]);
}

/**
 * Escapa caracteres especiales para CSV
 * 
 * NOTA: Comentado para implementación futura de exportación CSV.
 */
/*
function escapeCSV(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
*/
