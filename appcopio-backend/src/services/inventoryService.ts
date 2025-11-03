// src/services/inventoryService.ts
import { PoolClient } from "pg";
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
    family_id?: number;
}

export interface InventoryItemExit {
    itemId: number;
    quantity: number;
    familyId: number;
    reason: string;
    notes?: string;
    userId: number;
}

export interface BoxCreate {
    name: string;
    description?: string;
    items: Array<{
        itemId?: number;      // Si el ítem ya existe
        itemName?: string;    // Si se crea nuevo ítem
        categoryId?: number;  // Para nuevo ítem
        unit?: string;        // Para nuevo ítem
        quantity: number;
    }>;
    userId: number;
}

/**
 * Inserta un nuevo registro en el historial de inventario.
 * @param db Pool de conexión a la base de datos.
 * @param logData Datos del log a crear.
 */
export async function createLogEntry(db: Db, logData: InventoryLogCreate): Promise<void> {
    const query = `
        INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, reason, notes, created_by, family_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    
    await db.query(query, [
        logData.center_id,
        logData.item_id,
        logData.action_type,
        logData.quantity,
        logData.reason,
        logData.notes,
        logData.created_by,
        logData.family_id || null
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
            log.log_id, 
            log.action_type, 
            log.quantity, 
            log.reason,
            log.notes, 
            log.created_at, 
            log.family_id,
            p.name AS product_name,
            p.unit AS product_unit,
            u.nombre AS user_name,
            cat.name AS category_name,
            CASE 
                WHEN fg.family_id IS NOT NULL THEN CONCAT('Familia #', fg.family_id)
                ELSE NULL 
            END AS family_name
        FROM InventoryLog AS log
        JOIN Products AS p ON log.item_id = p.item_id
        LEFT JOIN Categories cat ON p.category_id = cat.category_id
        LEFT JOIN Users AS u ON log.created_by = u.user_id
        LEFT JOIN FamilyGroups fg ON log.family_id = fg.family_id
        WHERE log.center_id = $1
        ORDER BY log.created_at DESC`;
    
    const result = await db.query(query, [centerId]);
    return result.rows;
}

/**
 * Registra la salida de un recurso a un grupo familiar
 */
export async function registerInventoryExit(
    client: PoolClient,
    centerId: string,
    exitData: InventoryItemExit
) {
    // 1. Verificar stock actual
    const currentStock = await client.query(
        'SELECT quantity FROM CenterInventoryItems WHERE center_id = $1 AND item_id = $2',
        [centerId, exitData.itemId]
    );

    if (currentStock.rowCount === 0) {
        throw { status: 404, message: 'Ítem no encontrado en el inventario.' };
    }

    const availableQuantity = currentStock.rows[0].quantity;

    // Criterio 6: Validar stock suficiente
    if (exitData.quantity > availableQuantity) {
        throw { 
            status: 400, 
            message: `Stock insuficiente. Disponible: ${availableQuantity}, Solicitado: ${exitData.quantity}` 
        };
    }

    // 2. Descontar del inventario
    const newQuantity = availableQuantity - exitData.quantity;
    await client.query(
        `UPDATE CenterInventoryItems 
         SET quantity = $1, updated_at = NOW(), updated_by = $2
         WHERE center_id = $3 AND item_id = $4`,
        [newQuantity, exitData.userId, centerId, exitData.itemId]
    );

    // 3. Registrar en el historial con destinatario (Criterio 3 y 5)
    await createLogEntry(client, {
        center_id: centerId,
        item_id: exitData.itemId,
        action_type: 'SUB',
        quantity: exitData.quantity,
        reason: exitData.reason,
        notes: exitData.notes || `Salida a grupo familiar ID: ${exitData.familyId}`,
        created_by: exitData.userId,
        family_id: exitData.familyId
    });

    return {
        item_id: exitData.itemId,
        previous_quantity: availableQuantity,
        new_quantity: newQuantity,
        exit_quantity: exitData.quantity
    };
}

/**
 * Registra múltiples salidas de inventario en una sola operación
 */
export async function registerMultipleExits(
    client: PoolClient,
    centerId: string,
    exits: InventoryItemExit[]
) {
    const results = [];
    
    for (const exit of exits) {
        const result = await registerInventoryExit(client, centerId, exit);
        results.push(result);
    }

    return results;
}

/**
 * Crea una "caja" con múltiples recursos
 */
export async function createBox(
    client: PoolClient,
    centerId: string,
    boxData: BoxCreate
) {
    const results = [];

    for (const item of boxData.items) {
        let itemId: number;

        // Si se proporciona itemId, usar ese; si no, crear o buscar por nombre
        if (item.itemId) {
            itemId = item.itemId;
        } else if (item.itemName) {
            // Buscar o crear el producto
            let productResult = await client.query(
                'SELECT item_id FROM Products WHERE name ILIKE $1',
                [item.itemName.trim()]
            );

            if (productResult.rowCount === 0) {
                // Crear nuevo producto
                const newProduct = await client.query(
                    'INSERT INTO Products (name, category_id, unit) VALUES ($1, $2, $3) RETURNING item_id',
                    [item.itemName.trim(), item.categoryId!, item.unit!]
                );
                itemId = newProduct.rows[0].item_id;
            } else {
                itemId = productResult.rows[0].item_id;
            }
        } else {
            throw { status: 400, message: 'Debe proporcionar itemId o itemName para cada ítem' };
        }

        // Añadir al inventario
        const inventoryResult = await client.query(
            `INSERT INTO CenterInventoryItems (center_id, item_id, quantity, updated_by) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (center_id, item_id) 
             DO UPDATE SET 
                quantity = CenterInventoryItems.quantity + EXCLUDED.quantity, 
                updated_at = NOW(), 
                updated_by = EXCLUDED.updated_by
             RETURNING *`,
            [centerId, itemId, item.quantity, boxData.userId]
        );

        // Registrar en el historial
        await createLogEntry(client, {
            center_id: centerId,
            item_id: itemId,
            action_type: 'ADD',
            quantity: item.quantity,
            notes: `Caja: ${boxData.name}${boxData.description ? ' - ' + boxData.description : ''}`,
            created_by: boxData.userId
        });

        results.push(inventoryResult.rows[0]);
    }

    return {
        box_name: boxData.name,
        description: boxData.description,
        items_added: results.length,
        items: results
    };
}

/**
 * Obtiene estadísticas de movimientos de inventario
 */
export async function getInventoryStats(db: Db, centerId: string, days: number = 30) {
    const query = `
        SELECT 
            log.action_type,
            COUNT(*) as total_operations,
            SUM(log.quantity) as total_quantity,
            p.name as product_name,
            cat.name as category_name
        FROM InventoryLog log
        JOIN Products p ON log.item_id = p.item_id
        LEFT JOIN Categories cat ON p.category_id = cat.category_id
        WHERE log.center_id = $1 
        AND log.created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY log.action_type, p.name, cat.name
        ORDER BY total_operations DESC`;
    
    const result = await db.query(query, [centerId]);
    return result.rows;
}