import { Request, Response, Router, RequestHandler } from 'express';
import pool from '../config/db';

// Interfaz para extender el objeto Request de Express y añadir la propiedad user
interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
    };
}

const router = Router();

const itemRatiosPerPerson: { [key: string]: number } = {
    'Alimentos y Bebidas': 1,
    'Ropa de Cama y Abrigo': 1,
    'Higiene Personal': 1,
    'Mascotas': 1,
    'Herramientas': 1
};

//
// Por lo que entendí esto es para verificar el rol de administrador (DIDECO)
const isAdmin: RequestHandler = (req, res, next) => {
    // Implementación de autenticación con token JWT
    // Por ahora, un placeholder
    const userRole = (req as any).user.role; 
    if (userRole === 'Administrador') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Administrador.' });
    }
};

// GET /api/centers - (Sin cambios en esta función)
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
                    `SELECT cat.name AS category, COALESCE(SUM(cii.quantity), 0) AS category_quantity
                     FROM CenterInventoryItems cii
                     JOIN Products p ON cii.item_id = p.item_id
                     JOIN Categories cat ON p.category_id = cat.category_id
                     WHERE cii.center_id = $1
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

// --- RUTAS DE CENTROS (Sin cambios) ---

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

// POST /api/centers - Crear un nuevo centro y su descrpción en una transacción
const createCenterHandler: RequestHandler = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciar la transacción

        const {
            center_id, name, address, type, capacity, latitude, longitude, should_be_active,
            comunity_charge_id, municipal_manager_id,
            // Campos de la sección "Detalles del inmueble y la organización"
            tipo_inmueble, numero_habitaciones, estado_conservacion,
            material_muros, material_pisos, material_techo, observaciones_acceso_y_espacios_comunes,
            // Campos de la sección "Accesos y espacios comunes"
            espacio_10_afectados, diversidad_funcional, areas_comunes_accesibles,
            espacio_recreacion, observaciones_espacios_comunes,
            // Campos de la sección "Servicios básicos"
            agua_potable, agua_estanques, electricidad, calefaccion, alcantarillado,
            observaciones_servicios_basicos,
            // Campos de la sección "Baños y servicios higiénicos"
            estado_banos, wc_proporcion_personas, banos_genero, banos_grupos_prioritarios,
            cierre_banos_emergencia, lavamanos_proporcion_personas, dispensadores_jabon,
            dispensadores_alcohol_gel, papeleros_banos, papeleros_cocina, duchas_proporcion_personas,
            lavadoras_proporcion_personas, observaciones_banos_y_servicios_higienicos,
            // Campos de la sección "Distribución de Habitaciones"
            posee_habitaciones, separacion_familias, sala_lactancia,
            observaciones_distribucion_habitaciones,
            // Campos de la sección "Herramientas y Mobiliario"
            cuenta_con_mesas_sillas, cocina_comedor_adecuados, cuenta_equipamiento_basico_cocina,
            cuenta_con_refrigerador, cuenta_set_extraccion, observaciones_herramientas_mobiliario,
            // Campos de la sección "Condiciones de Seguridad y Protección Generales"
            sistema_evacuacion_definido, cuenta_con_senaleticas_adecuadas,
            observaciones_condiciones_seguridad_proteccion_generales,
            // Campos de la sección "Dimensión Animal"
            existe_lugar_animales_dentro, existe_lugar_animales_fuera, existe_jaula_mascota,
            existe_recipientes_mascota, existe_correa_bozal, reconoce_personas_dentro_de_su_comunidad,
            no_reconoce_personas_dentro_de_su_comunidad, observaciones_dimension_animal,
            // Campos de la sección "Elementos de Protección Personal (EPP)" y "Seguridad Comunitaria"
            existen_cascos, existen_gorros_cabello, existen_gafas, existen_caretas,
            existen_mascarillas, existen_respiradores, existen_mascaras_gas,
            existen_guantes_latex, existen_mangas_protectoras, existen_calzados_seguridad,
            existen_botas_impermeables, existen_chalecos_reflectantes, existen_overoles_trajes,
            existen_camillas_catre, existen_alarmas_incendios, existen_hidrantes_mangueras,
            existen_senaleticas, existen_luces_emergencias, existen_extintores,
            existen_generadores, existen_baterias_externas, existen_altavoces,
            existen_botones_alarmas, existen_sistemas_monitoreo, existen_radio_recargable,
            existen_barandillas_escaleras, existen_puertas_emergencia_rapida,
            existen_rampas, existen_ascensores_emergencia, observaciones_seguridad_comunitaria,
            // Campos de la sección "Necesidades Adicionales"
            importa_elementos_seguridad, observaciones_importa_elementos_seguridad,
            importa_conocimientos_capacitaciones, observaciones_importa_conocimientos_capacitaciones,
            catastroData
        } = req.body;

        if (!center_id || !name || !type || typeof latitude !== 'number' || typeof longitude !== 'number') {
            await client.query('ROLLBACK');
            res.status(400).json({ message: 'Campos principales requeridos: center_id, name, type, latitude, longitude.' });
            return;
        }

        // 1. Insertar en la tabla Centers con el ID proporcionado
        const insertCenterQuery = `
            INSERT INTO Centers (center_id, name, address, type, capacity, is_active, latitude, longitude, should_be_active, comunity_charge_id, municipal_manager_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`;
        
        const centerValues = [
            center_id, name, address || null, type, capacity || 0, false, latitude, longitude, should_be_active || false,
            comunity_charge_id || null, municipal_manager_id || null
        ];
        
        await client.query(insertCenterQuery, centerValues);

        // 2. Insertar en la tabla CentersDescription
        const catastroColumns = Object.keys(catastroData);
        const catastroValues = Object.values(catastroData);
        const catastroPlaceholders = catastroValues.map((_, i) => `$${i + 2}`).join(', ');

        const insertCatastroQuery = `
            INSERT INTO CentersDescription (
                center_id,
                ${catastroColumns.join(', ')}
            ) VALUES (
                $1,
                ${catastroPlaceholders}
            ) RETURNING *`;
        
        const allCatastroValues = [center_id, ...catastroValues];

        await client.query(insertCatastroQuery, allCatastroValues);

        await client.query('COMMIT'); // Confirmar la transacción
        res.status(201).json({ message: 'Centro y descripción de catastro creados exitosamente.', center_id: center_id });
    } catch (error: any) {
        await client.query('ROLLBACK'); // Revertir la transacción si algo falla
        console.error('Error al crear el centro:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    } finally {
        client.release();
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
    // NOTA: Los valores válidos ahora vienen del nuevo modelo de BDD.
    const validStatuses = ['capacidad maxima', 'cerrado temporalmente', 'abierto'];
    if (!operationalStatus || !validStatuses.includes(operationalStatus)) {
        res.status(400).json({ 
            message: 'El campo "operationalStatus" es requerido y debe ser uno de: ' + validStatuses.join(', ') 
        });
        return;
    }
    try {
        const noteToSave = operationalStatus === 'cerrado temporalmente' ? publicNote : null;
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


// GET /api/centers/:centerId/inventory - (Sin cambios en esta función)
const getInventoryHandler: RequestHandler = async (req, res) => {
    const { centerId } = req.params;
    try {
        const query = `
            SELECT 
                cii.item_id, cii.quantity, cii.updated_at,
                p.name, p.unit,
                cat.name AS category,
                u.nombre AS updated_by_user
            FROM CenterInventoryItems AS cii
            JOIN Products AS p ON cii.item_id = p.item_id
            LEFT JOIN Categories AS cat ON p.category_id = cat.category_id
            LEFT JOIN users AS u ON cii.updated_by = u.user_id
            WHERE cii.center_id = $1 
            ORDER BY p.name`;
        const result = await pool.query(query, [centerId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(`Error al obtener inventario para el centro ${centerId}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// POST /api/centers/:centerId/inventory - Añadir un item al inventario
const addInventoryItemHandler: RequestHandler = async (req: AuthenticatedRequest, res) => {
    const { centerId } = req.params;
    const { itemName, categoryId, quantity, unit, notes } = req.body;
    
    const userId = req.user?.id; 
    if (!userId) {
        res.status(401).json({ message: 'No autorizado.' });
        return;
    }
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
                'INSERT INTO Products (name, category_id, unit) VALUES ($1, $2, $3) RETURNING item_id', 
                [itemName.trim(), categoryId, unit]
            );
            itemId = newProductResult.rows[0].item_id;
        } else {
            itemId = productResult.rows[0].item_id;
        }

        const inventoryResult = await client.query(
            `INSERT INTO CenterInventoryItems (center_id, item_id, quantity, updated_by) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (center_id, item_id) 
             DO UPDATE SET 
                quantity = CenterInventoryItems.quantity + EXCLUDED.quantity, 
                updated_at = CURRENT_TIMESTAMP,
                updated_by = EXCLUDED.updated_by
             RETURNING *`,
            [centerId, itemId, quantity, userId]
        );

        // MODIFICADO: Se añade el registro en InventoryLog
        await client.query(
            `INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, created_by, notes)
             VALUES ($1, $2, 'ADD', $3, $4, $5)`,
            [centerId, itemId, quantity, userId, notes]
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
const updateInventoryItemHandler: RequestHandler = async (req: AuthenticatedRequest, res) => {
    const { centerId, itemId } = req.params;
    const { quantity, reason, notes } = req.body;
    
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'No autorizado.' });
        return;
    }
    if (typeof quantity !== 'number' || quantity < 0) {
        res.status(400).json({ message: 'Se requiere una "quantity" numérica y mayor o igual a 0.' });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE CenterInventoryItems 
             SET quantity = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
             WHERE center_id = $3 AND item_id = $4 RETURNING *`,
            [quantity, userId, centerId, itemId]
        );
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ message: 'No se encontró el item en el inventario de este centro.' });
            return;
        }

        // MODIFICADO: Se añade el registro en InventoryLog
        await client.query(
            `INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, created_by, reason, notes)
             VALUES ($1, $2, 'ADJUST', $3, $4, $5, $6)`,
            [centerId, itemId, quantity, userId, reason, notes]
        );

        await client.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error al actualizar el inventario para el centro ${centerId}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    } finally {
        client.release();
    }
};

// DELETE /api/centers/:centerId/inventory/:itemId - Eliminar un item del inventario
const deleteInventoryItemHandler: RequestHandler = async (req: AuthenticatedRequest, res) => {
    const { centerId, itemId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'No autorizado.' });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // MODIFICADO: Primero obtenemos la cantidad para poder registrarla
        const itemData = await client.query(
            'SELECT quantity FROM CenterInventoryItems WHERE center_id = $1 AND item_id = $2',
            [centerId, itemId]
        );

        if (itemData.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ message: 'No se encontró el item en el inventario para eliminar.' });
            return;
        }
        const quantityToDelete = itemData.rows[0].quantity;

        // MODIFICADO: Se añade el registro en InventoryLog ANTES de eliminar
        await client.query(
            `INSERT INTO InventoryLog (center_id, item_id, action_type, quantity, created_by, notes)
             VALUES ($1, $2, 'SUB', $3, $4, 'Eliminación completa del stock')`,
            [centerId, itemId, quantityToDelete, userId]
        );

        const deleteOp = await client.query(
            'DELETE FROM CenterInventoryItems WHERE center_id = $1 AND item_id = $2',
            [centerId, itemId]
        );
        
        await client.query('COMMIT');
        res.status(204).send();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error al eliminar item del inventario para el centro ${centerId}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    } finally {
        client.release();
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

// Rutas de inventario que fueron modificadas
router.get('/:centerId/inventory', getInventoryHandler);
router.post('/:centerId/inventory', addInventoryItemHandler);
router.put('/:centerId/inventory/:itemId', updateInventoryItemHandler);
router.delete('/:centerId/inventory/:itemId', deleteInventoryItemHandler);

export default router;