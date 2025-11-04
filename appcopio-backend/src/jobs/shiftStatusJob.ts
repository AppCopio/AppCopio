// src/jobs/shiftStatusJob.ts
import cron from 'node-cron';
import pool from '../config/db';
import { updateShiftStatuses } from '../services/shiftStatusService';

/**
 * Job que actualiza los estados de los turnos automáticamente
 * Se ejecuta todos los días a las 8:00 AM hora de Chile (America/Santiago)
 */
export function startShiftStatusJob() {
    // Cron expression: '0 8 * * *' = Todos los días a las 8:00 AM
    // Formato: segundo minuto hora día mes día-semana
    const cronExpression = '0 8 * * *';
    
    console.log('[ShiftStatusJob] Iniciando job de actualización de estados de turnos');
    console.log('[ShiftStatusJob] Programado para ejecutarse todos los días a las 8:00 AM');
    
    const job = cron.schedule(cronExpression, async () => {
        console.log('[ShiftStatusJob] Ejecutando actualización automática de estados...');
        
        try {
            const result = await updateShiftStatuses(pool);
            
            console.log('[ShiftStatusJob] ✅ Actualización completada:', {
                fecha: new Date().toISOString(),
                ...result
            });
        } catch (error) {
            console.error('[ShiftStatusJob] ❌ Error en actualización automática:', error);
        }
    }, {
        timezone: 'America/Santiago' // Zona horaria de Chile
    });
    
    // Ejecutar una vez al iniciar para actualizar estados pendientes
    console.log('[ShiftStatusJob] Ejecutando actualización inicial al arrancar el servidor...');
    updateShiftStatuses(pool)
        .then(result => {
            console.log('[ShiftStatusJob] ✅ Actualización inicial completada:', result);
        })
        .catch(error => {
            console.error('[ShiftStatusJob] ❌ Error en actualización inicial:', error);
        });
    
    return job;
}

/**
 * Ejecuta manualmente la actualización de estados
 * Útil para testing y debugging
 */
export async function runShiftStatusUpdateManually() {
    console.log('[ShiftStatusJob] Ejecutando actualización MANUAL de estados...');
    
    try {
        const result = await updateShiftStatuses(pool);
        
        console.log('[ShiftStatusJob] ✅ Actualización manual completada:', {
            fecha: new Date().toISOString(),
            ...result
        });
        
        return result;
    } catch (error) {
        console.error('[ShiftStatusJob] ❌ Error en actualización manual:', error);
        throw error;
    }
}
