// src/services/inventoryService.ts
import pool from "../config/db";
import { Db } from "../types/db";

export interface InventoryLogCreate {
    center_id: string;
    item_id: number;
    action_type: 'ADD' | 'SUB' | 'ADJUST';
    quantity: number;
    reason?: string;
    notes?: string;
    created_by: number;
}

/**
 * Inserta un nuevo registro en el historial de inventario.
 * @param db Pool de conexión a la base de datos.
 * @param logData Datos del log a crear.
 */
export async function createLogEntry(db: Db, logData: InventoryLogCreate): Promise<void> {
    const query = `
        INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, reason, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    
    await db.query(query, [
        logData.center_id,
        logData.item_id,
        logData.action_type,
        logData.quantity,
        logData.reason,
        logData.notes,
        logData.created_by
    ]);
}

/**
 * Obtiene todos los registros del historial de inventario para un centro específico.
 * @param db Pool de conexión a la base de datos.
 * @param centerId El ID del centro.
 * @returns Un array con los registros del historial.
 */
export async function getLogsByCenterId(db: Db, centerId: string): Promise<any[]> {
    const query = `
        SELECT 
            log.log_id, log.action_type, log.quantity, log.reason,
            log.notes, log.created_at, p.name AS product_name, u.nombre AS user_name
        FROM InventoryLog AS log
        JOIN Products AS p ON log.item_id = p.item_id
        LEFT JOIN users AS u ON log.created_by = u.user_id
        WHERE log.center_id = $1
        ORDER BY log.created_at DESC`;
    
    const result = await db.query(query, [centerId]);
    return result.rows;
}