// src/services/movementService.ts
import { Pool, PoolClient } from 'pg';
import { Db } from '../types/db';

export interface MovementCreateData {
    center_id: string;
    movement_type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
    reason: string;
    recipient?: string; // para EXIT
    notes?: string;
    user_id: number;
    items: MovementItemData[];
}

export interface MovementItemData {
    item_id?: number; // null para items nuevos en ENTRY
    item_name: string;
    category_id: number;
    quantity: number;
    unit: string;
    unit_cost?: number;
}

export interface StockValidationResult {
    is_valid: boolean;
    errors: { item_id: number; item_name: string; requested: number; available: number }[];
}

/**
 * Valida si hay suficiente stock para una salida
 */
export async function validateStockForExit(
    db: Pool, 
    center_id: string, 
    items: { item_id: number; quantity: number }[]
): Promise<StockValidationResult> {
    const result: StockValidationResult = { is_valid: true, errors: [] };
    
    for (const item of items) {
        const stockQuery = `
            SELECT p.name, COALESCE(ci.quantity, 0) as current_stock
            FROM CenterInventoryItems ci
            JOIN Products p ON ci.item_id = p.item_id
            WHERE ci.center_id = $1 AND ci.item_id = $2
        `;
        
        const stockResult = await db.query(stockQuery, [center_id, item.item_id]);
        
        if (stockResult.rows.length === 0) {
            result.is_valid = false;
            result.errors.push({
                item_id: item.item_id,
                item_name: 'Item no encontrado',
                requested: item.quantity,
                available: 0
            });
            continue;
        }
        
        const currentStock = parseInt(stockResult.rows[0].current_stock);
        if (currentStock < item.quantity) {
            result.is_valid = false;
            result.errors.push({
                item_id: item.item_id,
                item_name: stockResult.rows[0].name,
                requested: item.quantity,
                available: currentStock
            });
        }
    }
    
    return result;
}

/**
 * Crea un movimiento de entrada con sus items
 */
export async function createEntryMovement(db: Pool, data: MovementCreateData): Promise<number> {
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Crear el movimiento
        const movementQuery = `
            INSERT INTO inventory_movements 
            (center_id, movement_type, reason, notes, created_by_user_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING movement_id
        `;
        
        const movementResult = await client.query(movementQuery, [
            data.center_id,
            data.movement_type,
            data.reason,
            data.notes,
            data.user_id
        ]);
        
        const movement_id = movementResult.rows[0].movement_id;
        
        // 2. Procesar cada item
        for (const item of data.items) {
            let item_id = item.item_id;
            
            // Si no existe item_id, crear nuevo item en Products y en CenterInventoryItems
            if (!item_id) {
                // Primero crear el producto
                const createProductQuery = `
                    INSERT INTO Products (name, category_id, unit)
                    VALUES ($1, $2, $3)
                    RETURNING item_id
                `;
                
                const productResult = await client.query(createProductQuery, [
                    item.item_name,
                    item.category_id,
                    item.unit
                ]);
                
                item_id = productResult.rows[0].item_id;
                
                // Luego crear la entrada en el inventario del centro
                const createInventoryQuery = `
                    INSERT INTO CenterInventoryItems (center_id, item_id, quantity, updated_by)
                    VALUES ($1, $2, $3, $4)
                `;
                
                await client.query(createInventoryQuery, [
                    data.center_id,
                    item_id,
                    item.quantity,
                    data.user_id
                ]);
            } else {
                // Item existe, incrementar cantidad
                const updateItemQuery = `
                    UPDATE CenterInventoryItems 
                    SET quantity = quantity + $1, 
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = $2
                    WHERE center_id = $3 AND item_id = $4
                `;
                
                await client.query(updateItemQuery, [
                    item.quantity,
                    data.user_id,
                    data.center_id,
                    item_id
                ]);
            }
            
            // 3. Registrar el item del movimiento
            const movementItemQuery = `
                INSERT INTO movement_items 
                (movement_id, item_id, item_name, category_id, quantity, unit, unit_cost)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            
            await client.query(movementItemQuery, [
                movement_id,
                item_id,
                item.item_name,
                item.category_id,
                item.quantity,
                item.unit,
                item.unit_cost
            ]);
            
                // 4. Crear log para trazabilidad
            const logQuery = `
                INSERT INTO InventoryLog 
                (center_id, item_id, product_name, quantity, action_type, created_by, reason, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            
            await client.query(logQuery, [
                data.center_id,
                item_id,
                item.item_name,
                item.quantity,
                'ADD',
                data.user_id,
                data.reason,
                data.notes
            ]);
        }
        
        await client.query('COMMIT');
        return movement_id;
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Crea un movimiento de salida con validación de stock
 */
export async function createExitMovement(db: Pool, data: MovementCreateData): Promise<number> {
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Validar stock antes de proceder
        const validation = await validateStockForExit(
            db, 
            data.center_id, 
            data.items.map(item => ({ item_id: item.item_id!, quantity: item.quantity }))
        );
        
        if (!validation.is_valid) {
            throw new Error(`Stock insuficiente: ${validation.errors.map(e => 
                `${e.item_name} (solicitado: ${e.requested}, disponible: ${e.available})`
            ).join(', ')}`);
        }
        
        // 2. Crear el movimiento
        const movementQuery = `
            INSERT INTO inventory_movements 
            (center_id, movement_type, reason, recipient, notes, created_by_user_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING movement_id
        `;
        
        const movementResult = await client.query(movementQuery, [
            data.center_id,
            data.movement_type,
            data.reason,
            data.recipient,
            data.notes,
            data.user_id
        ]);
        
        const movement_id = movementResult.rows[0].movement_id;
        
        // 3. Procesar cada item
        for (const item of data.items) {
            // Obtener info del item antes de modificar
            const itemInfoQuery = `
                SELECT p.name, p.category_id, p.unit 
                FROM Products p
                JOIN CenterInventoryItems ci ON p.item_id = ci.item_id
                WHERE ci.center_id = $1 AND ci.item_id = $2
            `;
            const itemInfo = await client.query(itemInfoQuery, [data.center_id, item.item_id]);
            
            if (itemInfo.rows.length === 0) {
                throw new Error(`Item ${item.item_id} no encontrado`);
            }
            
            const { name, category_id, unit } = itemInfo.rows[0];
            
            // Decrementar cantidad
            const updateItemQuery = `
                UPDATE CenterInventoryItems 
                SET quantity = quantity - $1, 
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = $2
                WHERE center_id = $3 AND item_id = $4
            `;
            
            await client.query(updateItemQuery, [
                item.quantity,
                data.user_id,
                data.center_id,
                item.item_id
            ]);
            
            // Registrar el item del movimiento
            const movementItemQuery = `
                INSERT INTO movement_items 
                (movement_id, item_id, item_name, category_id, quantity, unit)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            
            await client.query(movementItemQuery, [
                movement_id,
                item.item_id,
                name,
                category_id,
                item.quantity,
                unit
            ]);
            
            // Crear log para trazabilidad
            const logQuery = `
                INSERT INTO InventoryLog 
                (center_id, item_id, product_name, quantity, action_type, created_by, reason, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            
            await client.query(logQuery, [
                data.center_id,
                item.item_id,
                name,
                item.quantity,
                'SUB',
                data.user_id,
                `${data.reason} - Entregado a: ${data.recipient}`,
                data.notes
            ]);
        }
        
        await client.query('COMMIT');
        return movement_id;
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Obtiene el historial de movimientos de un centro
 */
export async function getMovementHistory(db: Pool, center_id: string): Promise<any[]> {
    const query = `
        SELECT 
            m.movement_id,
            m.movement_type,
            m.created_at,
            m.reason,
            m.recipient,
            m.notes,
            u.username as created_by_user_name,
            json_agg(
                json_build_object(
                    'item_name', mi.item_name,
                    'category_name', c.name,
                    'quantity', mi.quantity,
                    'unit', mi.unit,
                    'unit_cost', mi.unit_cost
                ) ORDER BY mi.item_name
            ) as items
        FROM InventoryMovements m
        LEFT JOIN Users u ON m.created_by_user_id = u.user_id
        LEFT JOIN MovementItems mi ON m.movement_id = mi.movement_id
        LEFT JOIN Categories c ON mi.category_id = c.category_id
        WHERE m.center_id = $1
        GROUP BY m.movement_id, m.movement_type, m.created_at, m.reason, m.recipient, m.notes, u.username
        ORDER BY m.created_at DESC
    `;
    
    const result = await db.query(query, [center_id]);
    return result.rows;
}

/**
 * Valida si un item puede ser eliminado (debe tener stock 0)
 */
export async function validateItemDeletion(db: Pool, center_id: string, item_id: number): Promise<{ can_delete: boolean; current_stock: number; item_name: string }> {
    const query = `
        SELECT p.name, ci.quantity 
        FROM CenterInventoryItems ci
        JOIN Products p ON ci.item_id = p.item_id
        WHERE ci.center_id = $1 AND ci.item_id = $2
    `;
    
    const result = await db.query(query, [center_id, item_id]);
    
    if (result.rows.length === 0) {
        return { can_delete: false, current_stock: 0, item_name: 'Item no encontrado' };
    }
    
    const { name, quantity } = result.rows[0];
    return {
        can_delete: quantity === 0,
        current_stock: quantity,
        item_name: name
    };
}