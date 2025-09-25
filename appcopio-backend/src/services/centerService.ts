// src/services/centerService.ts
import { PoolClient } from "pg";
import pool from "../config/db";
import { Db } from "../types/db";
import { ActiveActivationRow } from "../types/center";
import { getValidDescriptionColumns, mapCatastroDataFromRequest } from '../utils/centerHelpers';

// --- Helpers Internos del Servicio ---

const itemRatiosPerPerson: { [key: string]: number } = {
    'Alimentos y Bebidas': 1, 'Ropa de Cama y Abrigo': 1,
    'Higiene Personal': 1, 'Mascotas': 1, 'Herramientas': 1
};

async function calculateFullnessPercentage(db: Db, center: { center_id: string; capacity: number }): Promise<number> {
    if (center.capacity === 0) return 0;
    const inventoryResult = await db.query(
        `SELECT cat.name AS category, COALESCE(SUM(cii.quantity), 0) AS category_quantity
         FROM CenterInventoryItems cii
         JOIN Products p ON cii.item_id = p.item_id
         JOIN Categories cat ON p.category_id = cat.category_id
         WHERE cii.center_id = $1 GROUP BY cat.name`,
        [center.center_id]
    );
    const inventoryMap = new Map<string, number>(inventoryResult.rows.map(row => [row.category, parseInt(row.category_quantity, 10)]));
    let totalScore = 0, count = 0;
    for (const category in itemRatiosPerPerson) {
        const needed = center.capacity * itemRatiosPerPerson[category];
        if (needed > 0) {
            const actual = inventoryMap.get(category) || 0;
            totalScore += Math.min(actual / needed, 1.0);
            if (actual > 0) count++;
        }
    }
    return count > 0 ? parseFloat(((totalScore / count) * 100).toFixed(2)) : 0;
}

// =================================================================
// SECCIÓN 1: CRUD y Gestión de Centros
// =================================================================

export async function getAllCenters(db: Db) {
    const centersResult = await db.query('SELECT center_id, name, address, type, capacity, is_active, operational_status, public_note, latitude, longitude FROM Centers ORDER BY center_id ASC');
    const centersWithFullness = await Promise.all(centersResult.rows.map(async (center) => {
        const fullnessPercentage = await calculateFullnessPercentage(db, center);
        return { ...center, fullnessPercentage };
    }));
    return centersWithFullness;
}

export async function getCenterById(db: Db, id: string) {
    const result = await db.query(
        `SELECT c.*, d.* FROM Centers c LEFT JOIN CentersDescription d ON c.center_id = d.center_id WHERE c.center_id = $1`,
        [id]
    );
    return result.rowCount > 0 ? result.rows[0] : null;
}

export async function createCenter(client: PoolClient, body: any) {
    const { name, latitude, longitude, type, ...restOfBody } = body;
    const centerQuery = `
        INSERT INTO Centers (name, address, type, capacity, is_active, latitude, longitude, should_be_active, comunity_charge_id, municipal_manager_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING center_id`;
    const centerValues = [name, restOfBody.address, type, restOfBody.capacity || 0, false, latitude, longitude, restOfBody.should_be_active, restOfBody.comunity_charge_id, restOfBody.municipal_manager_id];
    const centerResult = await client.query(centerQuery, centerValues);
    const newCenterId = centerResult.rows[0].center_id;

    const mappedCatastroData = mapCatastroDataFromRequest(newCenterId, restOfBody);
    const catastroColumns = Object.keys(mappedCatastroData);

    if (catastroColumns.length > 1) {
        const catastroValues = Object.values(mappedCatastroData);
        const placeholders = catastroValues.map((_, i) => `$${i + 1}`).join(', ');
        const catastroQuery = `INSERT INTO CentersDescription (${catastroColumns.join(', ')}) VALUES (${placeholders})`;
        await client.query(catastroQuery, catastroValues);
    }
    return { center_id: newCenterId, name: name };
}

export async function updateCenter(client: PoolClient, id: string, body: any) {
    const { name, address, type, capacity, is_active, latitude, longitude, ...otherData } = body;
    
    const centerData = { name, address, type, capacity, is_active, latitude, longitude };
    const centerUpdates: string[] = [];
    const centerValues: any[] = [];
    let paramIndex = 1;
    for (const [key, value] of Object.entries(centerData)) {
        if (value !== undefined) {
            centerUpdates.push(`${key} = $${paramIndex++}`);
            centerValues.push(value);
        }
    }
    if (centerUpdates.length > 0) {
        const updateCenterQuery = `UPDATE Centers SET ${centerUpdates.join(', ')} WHERE center_id = $${paramIndex}`;
        await client.query(updateCenterQuery, [...centerValues, id]);
    }

    const validCols = getValidDescriptionColumns();
    const catastroData = Object.entries(otherData).filter(([key]) => validCols.includes(key)).reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    if (Object.keys(catastroData).length > 0) {
        const catastroColumns = Object.keys(catastroData);
        const catastroValues = Object.values(catastroData);
        const updateParts = catastroColumns.map((col, i) => `${col} = $${i + 2}`).join(', ');
        const placeholders = catastroValues.map((_, i) => `$${i + 2}`).join(', ');
        const upsertQuery = `
            INSERT INTO CentersDescription (center_id, ${catastroColumns.join(', ')}) VALUES ($1, ${placeholders})
            ON CONFLICT (center_id) DO UPDATE SET ${updateParts}, updated_at = NOW()`;
        await client.query(upsertQuery, [id, ...catastroValues]);
    }

    return getCenterById(client, id);
}

export async function deleteCenterById(db: Db, id: string): Promise<number> {
    // FIX 2: Usar '?? 0' para manejar el caso en que rowCount sea null.
    const result = await db.query('DELETE FROM Centers WHERE center_id = $1', [id]);
    return result.rowCount ?? 0;
}
// =================================================================
// SECCIÓN 2: ESTADO Y ACTIVACIÓN
// =================================================================

export async function updateActivationStatus(client: PoolClient, id: string, isActive: boolean, userId: number) {
    const centerResult = await client.query('UPDATE Centers SET is_active = $1, updated_at = NOW() WHERE center_id = $2 RETURNING *', [isActive, id]);
    if (centerResult.rowCount === 0) return null;

    if (isActive) {
        await client.query('INSERT INTO CentersActivations (center_id, activated_by, notes) VALUES ($1, $2, $3)', [id, userId, 'Activación del centro.']);
    } else {
        await client.query('UPDATE CentersActivations SET ended_at = NOW(), deactivated_by = $2 WHERE center_id = $1 AND ended_at IS NULL', [id, userId]);
    }
    return centerResult.rows[0];
}

export async function updateOperationalStatus(db: Db, id: string, status: string, note: string | null) {
    const result = await db.query(
        `UPDATE Centers SET operational_status = $1, public_note = $2, updated_at = NOW() WHERE center_id = $3 RETURNING *`,
        [status, note, id]
    );
    return result.rowCount > 0 ? result.rows[0] : null;
}

export async function getActiveCenters(db: Db) {
    const result = await db.query(`
        SELECT ca.activation_id, ca.center_id, c.name AS center_name
        FROM CentersActivations ca JOIN Centers c ON ca.center_id = c.center_id
        WHERE ca.ended_at IS NULL`);
    return result.rows;
}

export async function getActiveActivation(db: Db, centerId: string): Promise<ActiveActivationRow | null> {
    
    const { rows } = await db.query(
        `SELECT activation_id, center_id, started_at, ended_at FROM CentersActivations
         WHERE center_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
        [centerId]
    );
    return rows.length > 0 ? rows[0] as ActiveActivationRow : null;
}


// =================================================================
// SECCIÓN 3: RESIDENTES Y CAPACIDAD
// =================================================================

export async function getCenterCapacity(db: Db, centerId: string) {
    const centerResult = await db.query('SELECT capacity FROM Centers WHERE center_id = $1', [centerId]);
    if (centerResult.rowCount === 0) return null;
    const totalCapacity = centerResult.rows[0].capacity;

    const currentCapacityResult = await db.query(
        `SELECT COALESCE(COUNT(fgm.person_id), 0) AS current_capacity
         FROM FamilyGroupMembers fgm
         JOIN FamilyGroups fg ON fg.family_id = fgm.family_id AND fg.status = 'activo'
         JOIN CentersActivations ca ON ca.activation_id = fg.activation_id AND ca.ended_at IS NULL
         WHERE ca.center_id = $1`,
        [centerId]
    );
    const currentCapacity = parseInt(currentCapacityResult.rows[0].current_capacity, 10);

    return { total_capacity: totalCapacity, current_capacity: currentCapacity, available_capacity: totalCapacity - currentCapacity };
}

export async function getCenterPeople(db: Db, centerId: string) {
    const result = await db.query(
        `SELECT p.* FROM Persons p
         JOIN FamilyGroupMembers fgm ON fgm.person_id = p.person_id
         JOIN FamilyGroups fg ON fg.family_id = fgm.family_id AND fg.status = 'activo'
         JOIN CentersActivations ca ON ca.activation_id = fg.activation_id AND ca.ended_at IS NULL
         WHERE ca.center_id = $1`,
        [centerId]
    );
    return result.rows;
}

// =================================================================
// SECCIÓN 4: INVENTARIO (Lógica completada)
// =================================================================

export async function getInventoryByCenterId(db: Db, centerId: string) {
    const query = `
        SELECT cii.item_id, cii.quantity, cii.updated_at, p.name, p.unit, cat.name AS category, u.nombre AS updated_by_user
        FROM CenterInventoryItems cii
        JOIN Products p ON cii.item_id = p.item_id
        LEFT JOIN Categories cat ON p.category_id = cat.category_id
        LEFT JOIN users u ON cii.updated_by = u.user_id
        WHERE cii.center_id = $1 ORDER BY p.name`;
    const result = await db.query(query, [centerId]);
    return result.rows;
}

export async function addInventoryItem(client: PoolClient, centerId: string, item: { itemName: string, categoryId: number, quantity: number, unit: string, notes?: string, userId: number }) {
    let productResult = await client.query('SELECT item_id FROM Products WHERE name ILIKE $1', [item.itemName.trim()]);
    let itemId;
    if (productResult.rowCount === 0) {
        const newProduct = await client.query('INSERT INTO Products (name, category_id, unit) VALUES ($1, $2, $3) RETURNING item_id', [item.itemName.trim(), item.categoryId, item.unit]);
        itemId = newProduct.rows[0].item_id;
    } else {
        itemId = productResult.rows[0].item_id;
    }

    const inventoryResult = await client.query(
        `INSERT INTO CenterInventoryItems (center_id, item_id, quantity, updated_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (center_id, item_id) DO UPDATE SET quantity = CenterInventoryItems.quantity + EXCLUDED.quantity, updated_at = NOW(), updated_by = EXCLUDED.updated_by
         RETURNING *`,
        [centerId, itemId, item.quantity, item.userId]
    );

    await client.query(`INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, created_by, notes) VALUES ($1, $2, 'ADD', $3, $4, $5)`, [centerId, itemId, item.quantity, item.userId, item.notes]);
    
    return inventoryResult.rows[0];
}

export async function updateInventoryItem(client: PoolClient, centerId: string, itemId: string, data: { quantity: number, reason?: string, notes?: string, userId: number }) {
    const result = await client.query(
        `UPDATE CenterInventoryItems SET quantity = $1, updated_at = NOW(), updated_by = $2
         WHERE center_id = $3 AND item_id = $4 RETURNING *`,
        [data.quantity, data.userId, centerId, itemId]
    );

    if (result.rowCount === 0) return null;

    await client.query(
        `INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, created_by, reason, notes) VALUES ($1, $2, 'ADJUST', $3, $4, $5, $6)`,
        [centerId, itemId, data.quantity, data.userId, data.reason, data.notes]
    );
    
    return result.rows[0];
}

export async function deleteInventoryItem(client: PoolClient, centerId: string, itemId: string, userId: number): Promise<number> {
    // LÓGICA ANTIGUA RESTAURADA:
    // 1. Primero, obtenemos la cantidad para poder registrarla en el log.
    const itemData = await client.query(
        'SELECT quantity FROM CenterInventoryItems WHERE center_id = $1 AND item_id = $2',
        [centerId, itemId]
    );

    // 2. Si no se encuentra el ítem, lanzamos un error para detener la transacción.
    if (itemData.rowCount === 0) {
        // Este error será capturado por el controlador, que enviará el 404.
        throw { status: 404, message: 'Ítem no encontrado en el inventario.' };
    }
    
    // 3. Añadimos el registro en InventoryLog ANTES de eliminar.
    await client.query(
        `INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, created_by, notes)
         VALUES ($1, $2, 'SUB', $3, $4, 'Eliminación completa del stock')`,
        [centerId, itemId, itemData.rows[0].quantity, userId]
    );

    // 4. Finalmente, eliminamos el ítem.
    const deleteOp = await client.query(
        'DELETE FROM CenterInventoryItems WHERE center_id = $1 AND item_id = $2',
        [centerId, itemId]
    );
    
    return deleteOp.rowCount ?? 0;
}