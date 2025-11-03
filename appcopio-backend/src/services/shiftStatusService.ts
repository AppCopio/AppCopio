// src/services/shiftStatusService.ts
import { Db } from "../types/db";

/**
 * Actualiza automáticamente los estados de los turnos según las fechas/horas actuales
 * 
 * Lógica:
 * - programado -> en_curso: cuando shift_start <= now
 * - en_curso -> completado: cuando shift_end <= now
 * 
 * @returns Objeto con contadores de turnos actualizados
 */
export async function updateShiftStatuses(db: Db): Promise<{
    updatedToInProgress: number;
    updatedToCompleted: number;
    totalUpdated: number;
}> {
    try {
        const now = new Date().toISOString();
        
        // 1. Actualizar turnos de 'programado' a 'en_curso'
        const toInProgressQuery = `
            UPDATE CenterShifts
            SET 
                status = 'en_curso',
                updated_at = NOW(),
                updated_by = NULL
            WHERE 
                status = 'programado'
                AND deleted_at IS NULL
                AND shift_start <= $1::timestamptz
                AND shift_end > $1::timestamptz
            RETURNING shift_id, center_id, assigned_user_id
        `;
        
        const inProgressResult = await db.query(toInProgressQuery, [now]);
        const updatedToInProgress = inProgressResult.rowCount || 0;
        
        // 2. Actualizar turnos de 'en_curso' a 'completado'
        const toCompletedQuery = `
            UPDATE CenterShifts
            SET 
                status = 'completado',
                updated_at = NOW(),
                updated_by = NULL
            WHERE 
                status = 'en_curso'
                AND deleted_at IS NULL
                AND shift_end <= $1::timestamptz
            RETURNING shift_id, center_id, assigned_user_id
        `;
        
        const completedResult = await db.query(toCompletedQuery, [now]);
        const updatedToCompleted = completedResult.rowCount || 0;
        
        const totalUpdated = updatedToInProgress + updatedToCompleted;
        
        // Log de resultados
        if (totalUpdated > 0) {
            console.log(`[ShiftStatusService] Estados actualizados:`, {
                fecha: new Date().toISOString(),
                updatedToInProgress,
                updatedToCompleted,
                totalUpdated
            });
        }
        
        return {
            updatedToInProgress,
            updatedToCompleted,
            totalUpdated
        };
    } catch (error) {
        console.error('[ShiftStatusService] Error al actualizar estados:', error);
        throw error;
    }
}

/**
 * Obtiene estadísticas de turnos por estado
 * Útil para monitoreo y debugging
 */
export async function getShiftStatusStats(db: Db): Promise<{
    programado: number;
    en_curso: number;
    completado: number;
    cancelado: number;
    total: number;
}> {
    const query = `
        SELECT 
            status,
            COUNT(*) as count
        FROM CenterShifts
        WHERE deleted_at IS NULL
        GROUP BY status
    `;
    
    const result = await db.query(query);
    
    const stats = {
        programado: 0,
        en_curso: 0,
        completado: 0,
        cancelado: 0,
        total: 0
    };
    
    result.rows.forEach(row => {
        const status = row.status as keyof typeof stats;
        const count = parseInt(row.count, 10);
        if (status in stats) {
            stats[status] = count;
            stats.total += count;
        }
    });
    
    return stats;
}

/**
 * Obtiene turnos que necesitan actualización de estado
 * Útil para ver qué se actualizará antes de ejecutar
 */
export async function getShiftsNeedingUpdate(db: Db): Promise<{
    toInProgress: any[];
    toCompleted: any[];
}> {
    const now = new Date().toISOString();
    
    // Turnos que deberían estar en_curso
    const toInProgressQuery = `
        SELECT 
            shift_id,
            center_id,
            assigned_user_id,
            shift_start,
            shift_end,
            status
        FROM CenterShifts
        WHERE 
            status = 'programado'
            AND deleted_at IS NULL
            AND shift_start <= $1::timestamptz
            AND shift_end > $1::timestamptz
        ORDER BY shift_start ASC
    `;
    
    // Turnos que deberían estar completados
    const toCompletedQuery = `
        SELECT 
            shift_id,
            center_id,
            assigned_user_id,
            shift_start,
            shift_end,
            status
        FROM CenterShifts
        WHERE 
            status = 'en_curso'
            AND deleted_at IS NULL
            AND shift_end <= $1::timestamptz
        ORDER BY shift_end ASC
    `;
    
    const [inProgressResult, completedResult] = await Promise.all([
        db.query(toInProgressQuery, [now]),
        db.query(toCompletedQuery, [now])
    ]);
    
    return {
        toInProgress: inProgressResult.rows,
        toCompleted: completedResult.rows
    };
}
