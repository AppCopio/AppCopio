// src/services/centerService.ts
import { PoolClient } from "pg";
import { Db } from "../types/db";
import { ActiveActivationRow, ActivationHistoryItem } from "../types/center";
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
    // Incluimos fullness_percentage directamente de la base de datos
    const centersResult = await db.query(
        'SELECT center_id, name, address, type, capacity, is_active, operational_status, public_note, latitude, longitude, fullness_percentage FROM Centers ORDER BY center_id ASC'
    );
    
    // Mapeamos fullness_percentage a fullnessPercentage para mantener consistencia con el frontend
    const centers = centersResult.rows.map(center => ({
        ...center,
        fullnessPercentage: center.fullness_percentage ?? 0
    }));
    
    return centers;
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
    
    // Validación de campos requeridos básicos
    if (!name || typeof latitude !== 'number' || typeof longitude !== 'number' || !type) {
        throw new Error('Campos requeridos: name, type, latitude, longitude.');
    }
    
    const centerQuery = `
        INSERT INTO Centers (name, address, type, capacity, is_active, latitude, longitude, should_be_active, comunity_charge_id, municipal_manager_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING center_id`;
    const centerValues = [
        name, 
        restOfBody.address || null, 
        type, 
        restOfBody.capacity || 0, 
        false, // is_active siempre false al crear
        latitude, 
        longitude, 
        restOfBody.should_be_active || false, 
        restOfBody.comunity_charge_id || null, 
        restOfBody.municipal_manager_id || null
    ];
    
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

export async function updateActivationStatus(client: PoolClient, 
    id: string, 
    isActive: boolean, 
    userId: number, 
    notes?: string, 
    assignedUserId?: number) {
    const centerResult = await client.query('UPDATE Centers SET is_active = $1, updated_at = NOW() WHERE center_id = $2 RETURNING *', [isActive, id]);
    if (centerResult.rowCount === 0) return null;

    if (isActive) {
        const activationNotes = notes || 'Activación del centro.';
            const { rows: activationRows } = await client.query(
                'INSERT INTO CentersActivations (center_id, activated_by, notes) VALUES ($1, $2, $3) RETURNING activation_id', 
                [id, userId, activationNotes]
            );
            
            const activationId = activationRows[0].activation_id;
            
            if (assignedUserId) {
                await client.query(
                    'INSERT INTO ActivationAssignments (activation_id, user_id, started_by) VALUES ($1, $2, $3)',
                    [activationId, assignedUserId, userId]
                );
            }
        } else {
            // 1. Obtener el activation_id de la activación activa
            const { rows: activationRows } = await client.query(
                'SELECT activation_id FROM CentersActivations WHERE center_id = $1 AND ended_at IS NULL',
                [id]
            );
            // Cerrar todas las asignaciones activas de esta activación
            await client.query(
                `UPDATE ActivationAssignments 
                 SET end_date = NOW(), ended_by = $1 
                 WHERE activation_id = $2 AND end_date IS NULL`,
                [userId, activationRows.length > 0 ? activationRows[0].activation_id : null]
            );
            // Cerrar la activación
            await client.query(
                'UPDATE CentersActivations SET ended_at = NOW(), deactivated_by = $2 WHERE center_id = $1 AND ended_at IS NULL', 
                [id, userId]
            );   
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

export async function getAllActivationsByCenter(db: Db, centerId: string) : Promise<ActivationHistoryItem[]> {
  const result = await db.query(
    `SELECT 
      ca.activation_id,
      ca.center_id,
      ca.started_at,
      ca.ended_at,
      ca.notes,
      u1.nombre as activated_by_name,
      u1.user_id as activated_by,
      u2.nombre as deactivated_by_name,
      u2.user_id as deactivated_by,
      
      -- Duración de la activación en días
      CASE 
        WHEN ca.ended_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (ca.ended_at - ca.started_at)) / 86400
        ELSE 
          EXTRACT(EPOCH FROM (NOW() - ca.started_at)) / 86400
      END as duration_days,
      
      -- Estadísticas: Contar familias
      (SELECT COUNT(*) 
       FROM FamilyGroups fg 
       WHERE fg.activation_id = ca.activation_id) as total_families,
      
      -- Estadísticas: Contar personas totales
      (SELECT COUNT(DISTINCT fgm.person_id) 
       FROM FamilyGroups fg 
       JOIN FamilyGroupMembers fgm ON fg.family_id = fgm.family_id 
       WHERE fg.activation_id = ca.activation_id) as total_people,
      
      -- Estadísticas: Contar encargados únicos (activos + históricos)
      (SELECT COUNT(DISTINCT aa.user_id) 
       FROM ActivationAssignments aa 
       WHERE aa.activation_id = ca.activation_id) as total_managers,
       
      -- Estadísticas: Contar bases de datos creadas
      (SELECT COUNT(*) 
       FROM Datasets ds 
       WHERE ds.activation_id = ca.activation_id) as total_databases
       
    FROM CentersActivations ca
    LEFT JOIN Users u1 ON ca.activated_by = u1.user_id
    LEFT JOIN Users u2 ON ca.deactivated_by = u2.user_id
    WHERE ca.center_id = $1
    ORDER BY ca.started_at DESC`,
    [centerId]
  );
  
  return result.rows;
}

/**
 * Obtiene el detalle completo de UNA activación específica
 * Incluye toda la información relacionada: familias, encargados, bases de datos
 */
export async function getActivationDetail(db: Db, activationId: number) {
  // 1. Información básica de la activación (Sin cambios, esta consulta estaba bien)
  const activationResult = await db.query(
    `SELECT 
       ca.activation_id,
       ca.center_id,
       ca.started_at,
       ca.ended_at,
       ca.notes,
       c.name as center_name,
       c.address as center_address,
       c.type as center_type,
       c.capacity as center_capacity,
       u1.nombre as activated_by_name,
       u1.user_id as activated_by,
       u2.nombre as deactivated_by_name,
       u2.user_id as deactivated_by,
       
       -- Duración
       CASE 
         WHEN ca.ended_at IS NOT NULL THEN 
           EXTRACT(EPOCH FROM (ca.ended_at - ca.started_at)) / 86400
         ELSE 
           EXTRACT(EPOCH FROM (NOW() - ca.started_at)) / 86400
       END as duration_days
       
     FROM CentersActivations ca
     JOIN Centers c ON ca.center_id = c.center_id
     LEFT JOIN Users u1 ON ca.activated_by = u1.user_id
     LEFT JOIN Users u2 ON ca.deactivated_by = u2.user_id
     WHERE ca.activation_id = $1`,
    [activationId]
  );
  
  if (activationResult.rowCount === 0) {
    return null;
  }
  
  // 2. Familias de esta activación con conteo de miembros
  const familiesResult = await db.query(
    `SELECT 
       fg.family_id,
       fg.activation_id,
       fg.observaciones,
       fg.status,
       fg.departure_date,
       fg.departure_reason,
       p.person_id as head_person_id,
       p.nombre as head_nombre,
       p.primer_apellido as head_apellido,
       p.rut as head_rut,
       COUNT(fgm.person_id) as members_count
     FROM FamilyGroups fg
     LEFT JOIN Persons p ON fg.jefe_hogar_person_id = p.person_id
     LEFT JOIN FamilyGroupMembers fgm ON fg.family_id = fgm.family_id
     WHERE fg.activation_id = $1
     -- CORRECCIÓN: Agregamos todas las columnas no agregadas al GROUP BY
     GROUP BY fg.family_id, p.person_id, p.nombre, p.primer_apellido, p.rut 
     ORDER BY fg.family_id`,
    [activationId]
  );
  
  // 3. Encargados (Sin cambios, esta consulta estaba bien)
  const managersResult = await db.query(
    `SELECT 
       aa.assignment_id,
       aa.user_id,
       u.nombre as user_name,
       u.rut as user_rut,
       u.celular as user_phone,
       aa.start_date,
       aa.end_date,
       su.nombre as started_by_name,
       eu.nombre as ended_by_name
     FROM ActivationAssignments aa
     JOIN Users u ON aa.user_id = u.user_id
     LEFT JOIN Users su ON aa.started_by = su.user_id
     LEFT JOIN Users eu ON aa.ended_by = eu.user_id
     WHERE aa.activation_id = $1
     ORDER BY aa.start_date DESC`,
    [activationId]
  );
  
  // 4. Bases de datos creadas en esta activación
  const databasesResult = await db.query(
    `SELECT 
       ds.dataset_id,
       ds.name as database_name,
       -- CORRECCIÓN: 'description' no existe, la sacamos del JSON 'config'
       ds.config->>'description' as description, 
       ds.created_at,
       u.nombre as created_by_name,
       (SELECT COUNT(*) 
        FROM DatasetRecords dr 
        WHERE dr.dataset_id = ds.dataset_id 
          -- No es necesario filtrar por activation_id aquí, ya que ds.dataset_id es único
          AND dr.deleted_at IS NULL) as records_count
     FROM Datasets ds
     LEFT JOIN Users u ON ds.created_by = u.user_id
     WHERE ds.activation_id = $1
       AND ds.deleted_at IS NULL
     ORDER BY ds.created_at DESC`,
    [activationId]
  );
  
  // 5. Estadísticas de inventario (Sin cambios, esta consulta estaba bien)
  const inventoryStatsResult = await db.query(
    `SELECT 
       COUNT(*) as total_movements,
       SUM(CASE WHEN il.action_type = 'ADD' THEN 1 ELSE 0 END) as additions,
       SUM(CASE WHEN il.action_type = 'SUB' THEN 1 ELSE 0 END) as subtractions,
       SUM(CASE WHEN il.action_type = 'ADJUST' THEN 1 ELSE 0 END) as adjustments
     FROM InventoryLog il
     JOIN CentersActivations ca ON il.center_id = ca.center_id
     WHERE ca.activation_id = $1
       AND il.created_at >= ca.started_at
       AND (ca.ended_at IS NULL OR il.created_at <= ca.ended_at)`,
    [activationId]
  );
  
  // 6. Ensamblaje (Sin cambios, estaba bien)
  return {
    activation: activationResult.rows[0],
    families: familiesResult.rows,
    managers: managersResult.rows,
    databases: databasesResult.rows,
    inventory_stats: inventoryStatsResult.rows[0] || {
      total_movements: 0,
      additions: 0,
      subtractions: 0,
      adjustments: 0
    },
    summary: {
      total_families: familiesResult.rowCount || 0,
      total_people: familiesResult.rows.reduce((sum, f) => sum + parseInt(f.members_count || 0), 0),
      total_managers: managersResult.rowCount || 0,
      total_databases: databasesResult.rowCount || 0,
      active_managers: managersResult.rows.filter(m => !m.end_date).length
    }
  };
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
    // Primero obtener la cantidad actual para calcular la diferencia
    const currentQuantityResult = await client.query(
        `SELECT quantity FROM CenterInventoryItems WHERE center_id = $1 AND item_id = $2`,
        [centerId, itemId]
    );

    if (currentQuantityResult.rowCount === 0) return null;

    const currentQuantity = currentQuantityResult.rows[0].quantity;
    const quantityDifference = data.quantity - currentQuantity;

    // Solo proceder si hay una diferencia real
    if (quantityDifference === 0) {
        return currentQuantityResult.rows[0];
    }

    // Actualizar la cantidad en la tabla de inventario
    const result = await client.query(
        `UPDATE CenterInventoryItems SET quantity = $1, updated_at = NOW(), updated_by = $2
         WHERE center_id = $3 AND item_id = $4 RETURNING *`,
        [data.quantity, data.userId, centerId, itemId]
    );

    // Registrar en el log la DIFERENCIA, no la cantidad total
    await client.query(
        `INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, created_by, reason, notes) VALUES ($1, $2, 'ADJUST', $3, $4, $5, $6)`,
        [centerId, itemId, quantityDifference, data.userId, data.reason || 'Ajuste manual desde inventario', data.notes]
    );
    
    return result.rows[0];
}

export async function deleteInventoryItem(client: PoolClient, centerId: string, itemId: string, userId: number): Promise<number> {
   
    const itemData = await client.query(
        'SELECT quantity FROM CenterInventoryItems WHERE center_id = $1 AND item_id = $2',
        [centerId, itemId]
    );

    
    if (itemData.rowCount === 0) {
        throw { status: 404, message: 'Ítem no encontrado en el inventario.' };
    }
    
    const currentQuantity = itemData.rows[0].quantity;

    if (currentQuantity > 0) {
        throw { 
            status: 400, 
            message: `No se puede eliminar un recurso que aún tiene stock. Stock actual: ${currentQuantity}` 
        };
    }
    
    await client.query(
        `INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, created_by, notes)
         VALUES ($1, $2, 'SUB', $3, $4, 'Eliminación de ítem del inventario (stock en 0)')`,
        [centerId, itemId, 0, userId]
    );

   
    const deleteOp = await client.query(
        'DELETE FROM CenterInventoryItems WHERE center_id = $1 AND item_id = $2',
        [centerId, itemId]
    );
    
    return deleteOp.rowCount ?? 0;
}


// SECCIÓN 5: USUARIOS ASIGNADOS
// =================================================================

 //Obtiene todos los usuarios asignados a un centro específico, 


export async function getAssignedUsersByCenter(db: Db, centerId: string) {
    const query = `
        -- 1. Usuarios asignados como Encargado Comunitario (1:N)
        SELECT
            U.user_id, U.nombre, U.rut, U.username, U.email, U.genero, U.celular, U.is_active, U.es_apoyo_admin, U.created_at,
            R.role_name
        FROM Centers AS C
        JOIN Users AS U ON C.comunity_charge_id = U.user_id
        JOIN Roles AS R ON U.role_id = R.role_id
        WHERE C.center_id = $1

        UNION
        -- UNION elimina duplicados automáticamente si todas las columnas son idénticas

        -- 2. Usuarios asignados como Trabajador Municipal Manager (1:N)
        SELECT
            U.user_id, U.nombre, U.rut, U.username, U.email, U.genero, U.celular, U.is_active, U.es_apoyo_admin, U.created_at,
            R.role_name
        FROM Centers AS C
        JOIN Users AS U ON C.municipal_manager_id = U.user_id
        JOIN Roles AS R ON U.role_id = R.role_id
        WHERE C.center_id = $1

        UNION
        
        -- 3. Usuarios asignados por la tabla M:N (CenterAssignments)
        SELECT
            U.user_id, U.nombre, U.rut, U.username, U.email, U.genero, U.celular, U.is_active, U.es_apoyo_admin, U.created_at,
            R.role_name
        FROM CenterAssignments AS CA 
        JOIN Users AS U ON CA.user_id = U.user_id
        JOIN Roles AS R ON U.role_id = R.role_id
        WHERE CA.center_id = $1;
    `;

    const result = await db.query(query, [centerId]);
    return result.rows; 
}

/**
 * Actualiza el porcentaje de llenado/abastecimiento de un centro.
 */
export async function updateCenterFullness(db: Db, centerId: string, fullnessPercentage: number) {
    const result = await db.query(
        `UPDATE Centers 
         SET fullness_percentage = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE center_id = $2 
         RETURNING center_id, name, fullness_percentage, updated_at`,
        [fullnessPercentage, centerId]
    );
    return result.rows[0] || null;
}