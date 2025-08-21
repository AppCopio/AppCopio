import { Request, Response, Router, RequestHandler } from 'express';
import pool from '../config/db';

const router = Router();

const itemRatiosPerPerson: { [key: string]: number } = {
    'Alimentos y Bebidas': 1,
    'Ropa de Cama y Abrigo': 1,
    'Higiene Personal': 1,
    'Mascotas': 1,
    'Herramientas': 1
};

// GET /api/centers - Obtener todos los centros con su porcentaje de llenado
const getAllCentersHandler: RequestHandler = async (req, res) => {
    try {
        const centersResult = await pool.query(
            'SELECT center_id, name, address, type, capacity, is_active, operational_status, public_note, latitude, longitude FROM Centers'
        );
        const centers = centersResult.rows;

        const centersWithFullness = await Promise.all(centers.map(async (center) => {
            try {
                const peopleCapacity = center.capacity;
                if (peopleCapacity === 0) {
                    return { ...center, fullnessPercentage: 0 };
                }

                const inventoryByCategoryResult = await pool.query(
                    `SELECT cat.name AS category, COALESCE(SUM(ci.quantity), 0) AS category_quantity
                     FROM CenterInventories ci
                     JOIN Products p ON ci.item_id = p.item_id
                     JOIN Categories cat ON p.category_id = cat.category_id
                     WHERE ci.center_id = $1
                     GROUP BY cat.name`,
                    [center.center_id]
                );

                const inventoryMap = new Map<string, number>();
                inventoryByCategoryResult.rows.forEach(row => {
                    inventoryMap.set(row.category, parseInt(row.category_quantity, 10));
                });

                let totalSufficiencyScore = 0;
                let contributingCategoriesCount = 0;

                for (const category in itemRatiosPerPerson) {
                    const requiredPerPerson = itemRatiosPerPerson[category];
                    const neededForCategory = peopleCapacity * requiredPerPerson; 
                    const actualQuantity = inventoryMap.get(category) || 0;

                    if (neededForCategory > 0) {
                        const categorySufficiency = Math.min(actualQuantity / neededForCategory, 1.0);
                        totalSufficiencyScore += categorySufficiency;
                        if (actualQuantity > 0) {
                            contributingCategoriesCount++;
                        }
                    }
                }

                let overallFullnessPercentage = 0;
                if (contributingCategoriesCount > 0) {
                    overallFullnessPercentage = (totalSufficiencyScore / contributingCategoriesCount) * 100;
                }

                return {
                    ...center,
                    fullnessPercentage: parseFloat(overallFullnessPercentage.toFixed(2))
                };
            } catch (innerError) {
                console.error(`Error procesando el centro ${center.center_id}:`, innerError);
                return { ...center, fullnessPercentage: 0 }; 
            }
        }));
        res.json(centersWithFullness); 
    } catch (error) {
        console.error('Error al obtener centros:', error);
        if (!res.headersSent) { 
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    }
};

// GET /api/centers/:id - Obtener un centro específico
const getCenterByIdHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM Centers WHERE center_id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Centro no encontrado.' });
        } else {
            res.status(200).json(result.rows[0]);
        }
    } catch (error) {
        console.error(`Error al obtener el centro ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// POST /api/centers - Crear un nuevo centro
const createCenterHandler: RequestHandler = async (req, res) => {
    const { center_id, name, address, type, capacity, is_active = false, latitude, longitude } = req.body;
    if (!center_id || !name || !type) {
        res.status(400).json({ message: 'center_id, name, y type son campos requeridos.' });
        return;
    }
    try {
        const newCenter = await pool.query(
            `INSERT INTO Centers (center_id, name, address, type, capacity, is_active, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [center_id, name, address, type, capacity || 0, is_active, latitude, longitude]
        );
        res.status(201).json(newCenter.rows[0]);
    } catch (error: any) {
        console.error('Error al crear el centro:', error);
        if (error.code === '23505') {
            res.status(409).json({ message: `El center_id '${center_id}' ya existe.` });
        } else {
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    }
};

// PUT /api/centers/:id - Actualizar un centro existente
const updateCenterHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    const { name, address, type, capacity, is_active, latitude, longitude } = req.body;
    if (!name || !type) {
        res.status(400).json({ message: 'name y type son campos requeridos.' });
        return;
    }
    try {
        const updatedCenter = await pool.query(
            `UPDATE Centers
             SET name = $1, address = $2, type = $3, capacity = $4, is_active = $5, latitude = $6, longitude = $7, updated_at = CURRENT_TIMESTAMP
             WHERE center_id = $8 RETURNING *`,
            [name, address, type, capacity, is_active, latitude, longitude, id]
        );
        if (updatedCenter.rows.length === 0) {
            res.status(404).json({ message: 'Centro no encontrado para actualizar.' });
        } else {
            res.status(200).json(updatedCenter.rows[0]);
        }
    } catch (error) {
        console.error(`Error al actualizar el centro ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// DELETE /api/centers/:id - Eliminar un centro
const deleteCenterHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteOp = await pool.query('DELETE FROM Centers WHERE center_id = $1', [id]);
        if (deleteOp.rowCount === 0) {
            res.status(404).json({ message: 'Centro no encontrado para eliminar.' });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        console.error(`Error al eliminar el centro ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// PATCH /api/centers/:id/status - Activar o desactivar un centro
const updateStatusHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body; 
    if (typeof isActive !== 'boolean') {
        res.status(400).json({ message: 'El campo "isActive" es requerido y debe ser un booleano.' });
        return;
    }
    try {
        const updatedCenter = await pool.query(
            'UPDATE Centers SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE center_id = $2 RETURNING *',
            [isActive, id]
        );
        if (updatedCenter.rows.length === 0) {
            res.status(404).json({ message: 'Centro no encontrado.' });
        } else {
            res.status(200).json(updatedCenter.rows[0]);
        }
    } catch (error) {
        console.error(`Error al actualizar estado del centro ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// PATCH /api/centers/:id/operational-status - Actualizar estado operativo
const updateOperationalStatusHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    const { operationalStatus, publicNote } = req.body;
    const validStatuses = ['Abierto', 'Cerrado Temporalmente', 'Capacidad Máxima'];
    if (!operationalStatus || !validStatuses.includes(operationalStatus)) {
        res.status(400).json({ 
            message: 'El campo "operationalStatus" es requerido y debe ser uno de: ' + validStatuses.join(', ') 
        });
        return;
    }
    try {
        const noteToSave = operationalStatus === 'Cerrado Temporalmente' ? publicNote : null;
        const updatedCenterResult = await pool.query(
            `UPDATE Centers SET operational_status = $1, public_note = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE center_id = $3 RETURNING *`,
            [operationalStatus, noteToSave, id]
        );
        if (!updatedCenterResult || updatedCenterResult.rowCount === 0) {
            res.status(404).json({ message: 'Centro no encontrado para actualizar.' });
            return;
        }
        res.status(200).json({
            message: 'Estado operativo actualizado exitosamente',
            center: updatedCenterResult.rows[0]
        });
    } catch (error) {
        console.error(`Error al actualizar estado operativo del centro ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// GET /api/centers/:centerId/inventory - Obtener el inventario de un centro
const getInventoryHandler: RequestHandler = async (req, res) => {
    const { centerId } = req.params;
    try {
        const query = `
            SELECT ci.item_id, ci.quantity, p.name, cat.name AS category 
            FROM CenterInventories AS ci 
            JOIN Products AS p ON ci.item_id = p.item_id 
            LEFT JOIN Categories AS cat ON p.category_id = cat.category_id
            WHERE ci.center_id = $1 ORDER BY p.name`;
        const result = await pool.query(query, [centerId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(`Error al obtener inventario para el centro ${centerId}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// POST /api/centers/:centerId/inventory - Añadir un item al inventario
const addInventoryItemHandler: RequestHandler = async (req, res) => {
    const { centerId } = req.params;
    const { itemName, categoryId, quantity } = req.body;
    if (!itemName || !categoryId || !quantity || quantity <= 0) {
        res.status(400).json({ message: 'Se requieren itemName, categoryId y una quantity mayor a 0.' });
        return;
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let productResult = await client.query('SELECT item_id FROM Products WHERE name ILIKE $1', [itemName.trim()]);
        let itemId;
        if (productResult.rows.length === 0) {
            const newProductResult = await client.query(
                'INSERT INTO Products (name, category_id) VALUES ($1, $2) RETURNING item_id', 
                [itemName.trim(), categoryId]
            );
            itemId = newProductResult.rows[0].item_id;
        } else {
            itemId = productResult.rows[0].item_id;
        }
        const inventoryResult = await client.query(
            `INSERT INTO CenterInventories (center_id, item_id, quantity) VALUES ($1, $2, $3)
             ON CONFLICT (center_id, item_id) DO UPDATE SET quantity = CenterInventories.quantity + $3, last_updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [centerId, itemId, quantity]
        );
        await client.query('COMMIT');
        res.status(201).json(inventoryResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error en transacción de inventario para el centro ${centerId}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    } finally {
        client.release();
    }
};

// PUT /api/centers/:centerId/inventory/:itemId - Actualizar la cantidad de un item
const updateInventoryItemHandler: RequestHandler = async (req, res) => {
    const { centerId, itemId } = req.params;
    const { quantity } = req.body;
    if (typeof quantity !== 'number' || quantity < 0) {
        res.status(400).json({ message: 'Se requiere una "quantity" numérica y mayor o igual a 0.' });
        return;
    }
    try {
        const result = await pool.query(
            `UPDATE CenterInventories SET quantity = $1, last_updated_at = CURRENT_TIMESTAMP WHERE center_id = $2 AND item_id = $3 RETURNING *`,
            [quantity, centerId, itemId]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'No se encontró el item en el inventario de este centro.' });
        } else {
            res.status(200).json(result.rows[0]);
        }
    } catch (error) {
        console.error(`Error al actualizar el inventario para el centro ${centerId}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// DELETE /api/centers/:centerId/inventory/:itemId - Eliminar un item del inventario
const deleteInventoryItemHandler: RequestHandler = async (req, res) => {
    const { centerId, itemId } = req.params;
    try {
        const deleteOp = await pool.query(
            'DELETE FROM CenterInventories WHERE center_id = $1 AND item_id = $2',
            [centerId, itemId]
        );
        if (deleteOp.rowCount === 0) {
            res.status(404).json({ message: 'No se encontró el item en el inventario para eliminar.' });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        console.error(`Error al eliminar item del inventario para el centro ${centerId}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// --- REGISTRO DE TODAS LAS RUTAS ---
router.get('/', getAllCentersHandler);
router.get('/:id', getCenterByIdHandler);
router.post('/', createCenterHandler);
router.put('/:id', updateCenterHandler);
router.delete('/:id', deleteCenterHandler);
router.patch('/:id/status', updateStatusHandler);
router.patch('/:id/operational-status', updateOperationalStatusHandler);
router.get('/:centerId/inventory', getInventoryHandler);
router.post('/:centerId/inventory', addInventoryItemHandler);
router.put('/:centerId/inventory/:itemId', updateInventoryItemHandler);
router.delete('/:centerId/inventory/:itemId', deleteInventoryItemHandler);

export default router;