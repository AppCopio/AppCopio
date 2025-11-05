// src/services/resourceBoxService.ts
import { PoolClient } from "pg";
import pool from "../config/db";
import { Db } from "../types/db";

export interface ResourceBoxCreate {
    name: string;
    description?: string;
    items: ResourceBoxItemCreate[];
    userId: number;
}

export interface ResourceBoxItemCreate {
    item_id?: number; // Referencia a Products.item_id (opcional si se crea nuevo)
    item_name?: string; // Nombre del item para crear nuevo producto
    category_id?: number; // Categoría para nuevo producto
    unit?: string; // Unidad para nuevo producto
    quantity: number;
    notes?: string;
}

export interface ResourceBox {
    box_id: number;
    name: string;
    description?: string;
    created_at: string;
    created_by_user_id: number;
    created_by_user_name?: string;
    updated_at: string;
    is_active: boolean;
    items?: ResourceBoxItem[];
}

export interface ResourceBoxItem {
    box_item_id: number;
    box_id: number;
    item_id: number;
    item_name: string;
    category_id: number;
    category_name?: string;
    quantity: number;
    unit: string;
    notes?: string;
}

/**
 * Crea una nueva caja de recursos con sus items
 */
export async function createResourceBox(
    db: Db,
    data: ResourceBoxCreate
): Promise<ResourceBox> {
    const client = db instanceof pool.constructor ? await (db as any).connect() : db;
    
    try {
        if (client !== db) await client.query('BEGIN');

        // Insertar la caja
        const boxQuery = `
            INSERT INTO ResourceBoxes (name, description, created_by_user_id)
            VALUES ($1, $2, $3)
            RETURNING box_id, name, description, created_at, created_by_user_id, updated_at, is_active
        `;
        const boxResult = await client.query(boxQuery, [
            data.name,
            data.description || null,
            data.userId
        ]);

        const box = boxResult.rows[0];

        // Insertar los items de la caja
        if (data.items && data.items.length > 0) {
            const items: ResourceBoxItem[] = [];
            
            for (const item of data.items) {
                let finalItemId = item.item_id;
                
                // Si no tiene item_id, crear el producto primero
                if (!finalItemId && item.item_name) {
                    const productInsertQuery = `
                        INSERT INTO Products (name, unit, category_id)
                        VALUES ($1, $2, $3)
                        RETURNING item_id
                    `;
                    const productResult = await client.query(productInsertQuery, [
                        item.item_name,
                        item.unit || 'unidad',
                        item.category_id
                    ]);
                    finalItemId = productResult.rows[0].item_id;
                }
                
                const itemsQuery = `
                    INSERT INTO ResourceBoxItems (box_id, item_id, quantity, notes)
                    VALUES ($1, $2, $3, $4)
                    RETURNING box_item_id, box_id, item_id, quantity, notes
                `;
                
                const itemResult = await client.query(itemsQuery, [
                    box.box_id,
                    finalItemId,
                    item.quantity,
                    item.notes || null
                ]);
                
                // Obtener información del producto
                const productQuery = `
                    SELECT p.name, p.unit, p.category_id, c.name as category_name
                    FROM Products p
                    LEFT JOIN Categories c ON p.category_id = c.category_id
                    WHERE p.item_id = $1
                `;
                const productResult = await client.query(productQuery, [finalItemId]);
                const product = productResult.rows[0];
                
                items.push({
                    ...itemResult.rows[0],
                    item_name: product.name,
                    unit: product.unit,
                    category_id: product.category_id,
                    category_name: product.category_name
                });
            }
            box.items = items;
        }

        if (client !== db) await client.query('COMMIT');

        return box;
    } catch (error) {
        if (client !== db) await client.query('ROLLBACK');
        console.error('Error creating resource box:', error);
        throw error;
    } finally {
        if (client !== db) client.release();
    }
}

/**
 * Obtiene todas las cajas de recursos activas con sus items
 */
export async function getAllResourceBoxes(db: Db): Promise<ResourceBox[]> {
    const query = `
        SELECT 
            rb.box_id,
            rb.name,
            rb.description,
            rb.created_at,
            rb.created_by_user_id,
            rb.updated_at,
            rb.is_active,
            u.nombre AS created_by_user_name
        FROM ResourceBoxes rb
        LEFT JOIN Users u ON rb.created_by_user_id = u.user_id
        WHERE rb.is_active = true
        ORDER BY rb.created_at DESC
    `;

    const result = await db.query(query);
    const boxes = result.rows;

    // Cargar los items de cada caja
    for (const box of boxes) {
        const itemsQuery = `
            SELECT 
                rbi.box_item_id,
                rbi.box_id,
                rbi.item_id,
                rbi.quantity,
                rbi.notes,
                p.name AS item_name,
                p.unit,
                p.category_id,
                c.name AS category_name
            FROM ResourceBoxItems rbi
            INNER JOIN Products p ON rbi.item_id = p.item_id
            LEFT JOIN Categories c ON p.category_id = c.category_id
            WHERE rbi.box_id = $1
            ORDER BY p.name
        `;
        
        const itemsResult = await db.query(itemsQuery, [box.box_id]);
        box.items = itemsResult.rows;
    }

    return boxes;
}

/**
 * Obtiene una caja de recursos específica con sus items
 */
export async function getResourceBoxById(
    db: Db,
    boxId: number
): Promise<ResourceBox | null> {
    // Obtener la caja
    const boxQuery = `
        SELECT 
            rb.box_id,
            rb.name,
            rb.description,
            rb.created_at,
            rb.created_by_user_id,
            rb.updated_at,
            rb.is_active,
            u.nombre AS created_by_user_name
        FROM ResourceBoxes rb
        LEFT JOIN Users u ON rb.created_by_user_id = u.user_id
        WHERE rb.box_id = $1
    `;

    const boxResult = await db.query(boxQuery, [boxId]);
    
    if (boxResult.rows.length === 0) {
        return null;
    }

    const box = boxResult.rows[0];

    // Obtener los items de la caja con información del producto
    const itemsQuery = `
        SELECT 
            rbi.box_item_id,
            rbi.box_id,
            rbi.item_id,
            rbi.quantity,
            rbi.notes,
            p.name AS item_name,
            p.unit,
            p.category_id,
            c.name AS category_name
        FROM ResourceBoxItems rbi
        INNER JOIN Products p ON rbi.item_id = p.item_id
        LEFT JOIN Categories c ON p.category_id = c.category_id
        WHERE rbi.box_id = $1
        ORDER BY rbi.box_item_id
    `;

    const itemsResult = await db.query(itemsQuery, [boxId]);
    box.items = itemsResult.rows;

    return box;
}

/**
 * Actualiza una caja de recursos
 */
export async function updateResourceBox(
    db: Db,
    boxId: number,
    data: Partial<ResourceBoxCreate>
): Promise<ResourceBox | null> {
    const client = db instanceof pool.constructor ? await (db as any).connect() : db;

    try {
        if (client !== db) await client.query('BEGIN');

        // Actualizar la caja principal
        const boxQuery = `
            UPDATE ResourceBoxes
            SET name = COALESCE($1, name),
                description = COALESCE($2, description)
            WHERE box_id = $3 AND is_active = true
            RETURNING box_id, name, description, created_at, created_by_user_id, updated_at, is_active
        `;

        const boxResult = await client.query(boxQuery, [
            data.name || null,
            data.description || null,
            boxId
        ]);

        if (boxResult.rows.length === 0) {
            if (client !== db) await client.query('ROLLBACK');
            return null;
        }

        const box = boxResult.rows[0];

        // Si se proporcionan items, reemplazar todos los items existentes
        if (data.items && data.items.length > 0) {
            // Eliminar items anteriores
            await client.query('DELETE FROM ResourceBoxItems WHERE box_id = $1', [boxId]);

            // Insertar nuevos items
            const itemsQuery = `
                INSERT INTO ResourceBoxItems (box_id, item_id, quantity, notes)
                VALUES ($1, $2, $3, $4)
                RETURNING box_item_id, box_id, item_id, quantity, notes
            `;

            const items: ResourceBoxItem[] = [];
            for (const item of data.items) {
                const itemResult = await client.query(itemsQuery, [
                    box.box_id,
                    item.item_id,
                    item.quantity,
                    item.notes || null
                ]);
                
                // Obtener información del producto
                const productQuery = `
                    SELECT p.name, p.unit, p.category_id, c.name as category_name
                    FROM Products p
                    LEFT JOIN Categories c ON p.category_id = c.category_id
                    WHERE p.item_id = $1
                `;
                const productResult = await client.query(productQuery, [item.item_id]);
                const product = productResult.rows[0];
                
                items.push({
                    ...itemResult.rows[0],
                    item_name: product.name,
                    unit: product.unit,
                    category_id: product.category_id,
                    category_name: product.category_name
                });
            }
            box.items = items;
        }

        if (client !== db) await client.query('COMMIT');

        return box;
    } catch (error) {
        if (client !== db) await client.query('ROLLBACK');
        console.error('Error updating resource box:', error);
        throw error;
    } finally {
        if (client !== db) client.release();
    }
}

/**
 * Marca una caja de recursos como inactiva (soft delete)
 */
export async function deleteResourceBox(
    db: Db,
    boxId: number
): Promise<boolean> {
    const query = `
        UPDATE ResourceBoxes
        SET is_active = false
        WHERE box_id = $1
        RETURNING box_id
    `;

    const result = await db.query(query, [boxId]);
    return result.rows.length > 0;
}

/**
 * Obtiene los items de una caja específica
 */
export async function getResourceBoxItems(
    db: Db,
    boxId: number
): Promise<ResourceBoxItem[]> {
    const query = `
        SELECT 
            rbi.box_item_id,
            rbi.box_id,
            rbi.item_id,
            rbi.quantity,
            rbi.notes,
            p.name AS item_name,
            p.unit,
            p.category_id,
            c.name AS category_name
        FROM ResourceBoxItems rbi
        INNER JOIN Products p ON rbi.item_id = p.item_id
        LEFT JOIN Categories c ON p.category_id = c.category_id
        WHERE rbi.box_id = $1
        ORDER BY rbi.box_item_id
    `;

    const result = await db.query(query, [boxId]);
    return result.rows;
}
