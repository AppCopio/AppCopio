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
        const result = await pool.query(
            `SELECT c.*, d.*
             FROM Centers c
             LEFT JOIN CentersDescription d ON c.center_id = d.center_id
             WHERE c.center_id = $1`, [id]
        );
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

const createCenterHandler: RequestHandler = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            name, address, type, capacity, latitude, longitude, should_be_active,
            comunity_charge_id, municipal_manager_id,
            // Extraemos los datos del catastro
            ...catastroData
        } = req.body;

        if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
            await client.query('ROLLBACK');
            res.status(400).json({ message: 'Campos principales requeridos: name, type, latitude, longitude.' });
            return;
        }

        // 1. Insertar en Centers, dejando que el ID se genere automáticamente
        const insertCenterQuery = `
            INSERT INTO Centers (name, address, type, capacity, is_active, latitude, longitude, should_be_active, comunity_charge_id, municipal_manager_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING center_id`;

        const centerValues = [
            name, address || null, type, capacity || 0, false, latitude, longitude, should_be_active || false,
            comunity_charge_id || null, municipal_manager_id || null
        ];

        const result = await client.query(insertCenterQuery, centerValues);
        const newCenterId = result.rows[0].center_id;

        const mappedCatastroData: { [key: string]: any } = {
            center_id: newCenterId,
            nombre_organizacion: catastroData.organizationName || null,
            nombre_dirigente: catastroData.directorName || null,
            cargo_dirigente: catastroData.directorRole || null,
            telefono_contacto: catastroData.contactPhones || null,
            tipo_inmueble: catastroData.tipo_inmueble || null,
            numero_habitaciones: catastroData.numero_habitaciones || null,
            estado_conservacion: catastroData.estado_conservacion || null,
            muro_hormigon: catastroData.muro_hormigon,
            muro_albaneria: catastroData.muro_albaneria,
            muro_tabique: catastroData.muro_tabique,
            muro_adobe: catastroData.muro_adobe,
            muro_mat_precario: catastroData.muro_mat_precario,
            piso_parquet: catastroData.piso_parquet,
            piso_ceramico: catastroData.piso_ceramico,
            piso_alfombra: catastroData.piso_alfombra,
            piso_baldosa: catastroData.piso_baldosa,
            piso_radier: catastroData.piso_radier,
            piso_enchapado: catastroData.piso_enchapado,
            piso_tierra: catastroData.piso_tierra,
            techo_tejas: catastroData.techo_tejas,
            techo_losa: catastroData.techo_losa,
            techo_planchas: catastroData.techo_planchas,
            techo_fonolita: catastroData.techo_fonolita,
            techo_mat_precario: catastroData.techo_mat_precario,
            techo_sin_cubierta: catastroData.techo_sin_cubierta,
            espacio_10_afectados: catastroData.espacio_10_afectados || null,
            diversidad_funcional: catastroData.diversidad_funcional || null,
            areas_comunes_accesibles: catastroData.areas_comunes_accesibles || null,
            espacio_recreacion: catastroData.espacio_recreacion || null,
            observaciones_espacios_comunes: catastroData.observaciones_espacios_comunes || null,
            agua_potable: catastroData.agua_potable || null,
            agua_estanques: catastroData.agua_estanques || null,
            electricidad: catastroData.electricidad || null,
            calefaccion: catastroData.calefaccion || null,
            alcantarillado: catastroData.alcantarillado || null,
            observaciones_servicios_basicos: catastroData.observaciones_servicios_basicos || null,
            estado_banos: catastroData.estado_banos || null,
            wc_proporcion_personas: catastroData.wc_proporcion_personas || null,
            banos_genero: catastroData.banos_genero || null,
            banos_grupos_prioritarios: catastroData.banos_grupos_prioritarios || null,
            cierre_banos_emergencia: catastroData.cierre_banos_emergencia || null,
            lavamanos_proporcion_personas: catastroData.lavamanos_proporcion_personas || null,
            dispensadores_jabon: catastroData.dispensadores_jabon,
            dispensadores_alcohol_gel: catastroData.dispensadores_alcohol_gel,
            papeleros_banos: catastroData.papeleros_banos,
            papeleros_cocina: catastroData.papeleros_cocina,
            duchas_proporcion_personas: catastroData.duchas_proporcion_personas || null,
            lavadoras_proporcion_personas: catastroData.lavadoras_proporcion_personas || null,
            observaciones_banos_y_servicios_higienicos: catastroData.observaciones_banos_y_servicios_higienicos || null,
            posee_habitaciones: catastroData.posee_habitaciones || null,
            separacion_familias: catastroData.separacion_familias || null,
            sala_lactancia: catastroData.sala_lactancia || null,
            observaciones_distribucion_habitaciones: catastroData.observaciones_distribucion_habitaciones || null,
            cuenta_con_mesas_sillas: catastroData.cuenta_con_mesas_sillas || null,
            cocina_comedor_adecuados: catastroData.cocina_comedor_adecuados || null,
            cuenta_equipamiento_basico_cocina: catastroData.cuenta_equipamiento_basico_cocina || null,
            cuenta_con_refrigerador: catastroData.cuenta_con_refrigerador || null,
            cuenta_set_extraccion: catastroData.cuenta_set_extraccion || null,
            observaciones_herramientas_mobiliario: catastroData.observaciones_herramientas_mobiliario || null,
            sistema_evacuacion_definido: catastroData.sistema_evacuacion_definido || null,
            cuenta_con_senaleticas_adecuadas: catastroData.cuenta_con_senaleticas_adecuadas || null,
            observaciones_condiciones_seguridad_proteccion_generales: catastroData.observaciones_condiciones_seguridad_proteccion_generales || null,
            existe_lugar_animales_dentro: catastroData.existe_lugar_animales_dentro || null,
            existe_lugar_animales_fuera: catastroData.existe_lugar_animales_fuera || null,
            existe_jaula_mascota: catastroData.existe_jaula_mascota,
            existe_recipientes_mascota: catastroData.existe_recipientes_mascota,
            existe_correa_bozal: catastroData.existe_correa_bozal,
            reconoce_personas_dentro_de_su_comunidad: catastroData.reconoce_personas_dentro_de_su_comunidad,
            no_reconoce_personas_dentro_de_su_comunidad: catastroData.no_reconoce_personas_dentro_de_su_comunidad,
            observaciones_dimension_animal: catastroData.observaciones_dimension_animal || null,
            existen_cascos: catastroData.existen_cascos,
            existen_gorros_cabello: catastroData.existen_gorros_cabello,
            existen_gafas: catastroData.existen_gafas,
            existen_caretas: catastroData.existen_caretas,
            existen_mascarillas: catastroData.existen_mascarillas,
            existen_respiradores: catastroData.existen_respiradores,
            existen_mascaras_gas: catastroData.existen_mascaras_gas,
            existen_guantes_latex: catastroData.existen_guantes_latex,
            existen_mangas_protectoras: catastroData.existen_mangas_protectoras,
            existen_calzados_seguridad: catastroData.existen_calzados_seguridad,
            existen_botas_impermeables: catastroData.existen_botas_impermeables,
            existen_chalecos_reflectantes: catastroData.existen_chalecos_reflectantes,
            existen_overoles_trajes: catastroData.existen_overoles_trajes,
            existen_camillas_catre: catastroData.existen_camillas_catre,
            existen_alarmas_incendios: catastroData.existen_alarmas_incendios,
            existen_hidrantes_mangueras: catastroData.existen_hidrantes_mangueras,
            existen_senaleticas: catastroData.existen_senaleticas,
            existen_luces_emergencias: catastroData.existen_luces_emergencias,
            existen_extintores: catastroData.existen_extintores,
            existen_generadores: catastroData.existen_generadores,
            existen_baterias_externas: catastroData.existen_baterias_externas,
            existen_altavoces: catastroData.existen_altavoces,
            existen_botones_alarmas: catastroData.existen_botones_alarmas,
            existen_sistemas_monitoreo: catastroData.existen_sistemas_monitoreo,
            existen_radio_recargable: catastroData.existen_radio_recargable,
            existen_barandillas_escaleras: catastroData.existen_barandillas_escaleras,
            existen_puertas_emergencia_rapida: catastroData.existen_puertas_emergencia_rapida,
            existen_rampas: catastroData.existen_rampas,
            existen_ascensores_emergencia: catastroData.existen_ascensores_emergencia,
            existen_botiquines: catastroData.existen_botiquines,
            existen_camilla_emergencia: catastroData.existen_camilla_emergencia,
            existen_sillas_ruedas: catastroData.existen_sillas_ruedas,
            existen_muletas: catastroData.existen_muletas,
            existen_desfibriladores: catastroData.existen_desfibriladores,
            existen_senales_advertencia: catastroData.existen_senales_advertencia,
            existen_senales_informativas: catastroData.existen_senales_informativas,
            existen_senales_exclusivas: catastroData.existen_senales_exclusivas,
            observaciones_seguridad_comunitaria: catastroData.observaciones_seguridad_comunitaria || null,
            importa_elementos_seguridad: catastroData.importa_elementos_seguridad,
            observaciones_importa_elementos_seguridad: catastroData.observaciones_importa_elementos_seguridad || null,
            importa_conocimientos_capacitaciones: catastroData.importa_conocimientos_capacitaciones,
            observaciones_importa_conocimientos_capacitaciones: catastroData.observaciones_importa_conocimientos_capacitaciones || null,
        };

        // 2. Insertar en CentersDescription, usando el nuevo ID
        const catastroColumns = Object.keys(mappedCatastroData);
        if (catastroColumns.length > 1) { // El campo center_id siempre estará presente
            const catastroValues = Object.values(mappedCatastroData);
            const catastroPlaceholders = catastroValues.map((_, i) => `$${i + 1}`).join(', ');

            const insertCatastroQuery = `
                INSERT INTO CentersDescription (
                    ${catastroColumns.join(', ')}
                ) VALUES (
                    ${catastroPlaceholders}
                ) RETURNING *`;
            
            await client.query(insertCatastroQuery, catastroValues);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Centro y descripción de catastro creados exitosamente.', center_id: newCenterId });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error al crear el centro:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    } finally {
        client.release();
    }
};
// PUT /api/centers/:id - Actualizar un centro existente
const updateCenterHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    // Lista de columnas válidas para la tabla CentersDescription
    const validDescriptionColumns = [
        "nombre_organizacion", "nombre_dirigente", "cargo_dirigente", "telefono_contacto",
        "tipo_inmueble", "numero_habitaciones", "estado_conservacion", "muro_hormigon",
        "muro_albaneria", "muro_tabique", "muro_adobe", "muro_mat_precario", "piso_parquet",
        "piso_ceramico", "piso_alfombra", "piso_baldosa", "piso_radier", "piso_enchapado",
        "piso_tierra", "techo_tejas", "techo_losa", "techo_planchas", "techo_fonolita",
        "techo_mat_precario", "techo_sin_cubierta", "espacio_10_afectados", "diversidad_funcional",
        "areas_comunes_accesibles", "espacio_recreacion", "observaciones_espacios_comunes",
        "agua_potable", "agua_estanques", "electricidad", "calefaccion", "alcantarillado",
        "observaciones_servicios_basicos", "estado_banos", "wc_proporcion_personas",
        "banos_genero", "banos_grupos_prioritarios", "cierre_banos_emergencia",
        "lavamanos_proporcion_personas", "dispensadores_jabon", "dispensadores_alcohol_gel",
        "papeleros_banos", "papeleros_cocina", "duchas_proporcion_personas",
        "lavadoras_proporcion_personas", "observaciones_banos_y_servicios_higienicos",
        "posee_habitaciones", "separacion_familias", "sala_lactancia",
        "observaciones_distribucion_habitaciones", "cuenta_con_mesas_sillas",
        "cocina_comedor_adecuados", "cuenta_equipamiento_basico_cocina", "cuenta_con_refrigerador",
        "cuenta_set_extraccion", "observaciones_herramientas_mobiliario",
        "sistema_evacuacion_definido", "cuenta_con_senaleticas_adecuadas",
        "observaciones_condiciones_seguridad_proteccion_generales", "existe_lugar_animales_dentro",
        "existe_lugar_animales_fuera", "existe_jaula_mascota", "existe_recipientes_mascota",
        "existe_correa_bozal", "reconoce_personas_dentro_de_su_comunidad",
        "no_reconoce_personas_dentro_de_su_comunidad", "observaciones_dimension_animal",
        "existen_cascos", "existen_gorros_cabello", "existen_gafas", "existen_caretas",
        "existen_mascarillas", "existen_respiradores", "existen_mascaras_gas",
        "existen_guantes_latex", "existen_mangas_protectoras", "existen_calzados_seguridad",
        "existen_botas_impermeables", "existen_chalecos_reflectantes", "existen_overoles_trajes",
        "existen_camillas_catre", "existen_alarmas_incendios", "existen_hidrantes_mangueras",
        "existen_senaleticas", "existen_luces_emergencias", "existen_extintores", "existen_generadores",
        "existen_baterias_externas", "existen_altavoces", "existen_botones_alarmas",
        "existen_sistemas_monitoreo", "existen_radio_recargable", "existen_barandillas_escaleras",
        "existen_puertas_emergencia_rapida", "existen_rampas", "existen_ascensores_emergencia",
        "existen_botiquines", "existen_camilla_emergencia", "existen_sillas_ruedas", "existen_muletas",
        "existen_desfibriladores", "existen_senales_advertencia", "existen_senales_informativas",
        "existen_senales_exclusivas", "observaciones_seguridad_comunitaria", "importa_elementos_seguridad",
        "observaciones_importa_elementos_seguridad", "importa_conocimientos_capacitaciones",
        "observaciones_importa_conocimientos_capacitaciones"
    ];

    try {
        await client.query('BEGIN');
        
        const {
            // Se separan explícitamente los campos de Centers del body, el resto va a catastroData
            center_id, name, address, type, capacity, is_active, latitude, longitude, should_be_active,
            comunity_charge_id, municipal_manager_id,
            ...otherData
        } = req.body;

        const catastroData = Object.entries(otherData)
            .filter(([key, _]) => validDescriptionColumns.includes(key))
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        const catastroColumns = Object.keys(catastroData);
        const catastroValues = Object.values(catastroData);
        
        // La actualización de Centers se maneja aquí si es necesario
        // En este caso, no se modifica nada en Centers
        
        if (catastroColumns.length > 0) {
            const updateParts = catastroColumns.map((col, i) => `${col} = $${i + 2}`).join(', ');
            
            const updateCatastroQuery = `
                INSERT INTO CentersDescription (center_id, ${catastroColumns.join(', ')})
                VALUES ($1, ${catastroValues.map((_, i) => `$${i + 2}`).join(', ')})
                ON CONFLICT (center_id) DO UPDATE SET ${updateParts}, updated_at = CURRENT_TIMESTAMP
                RETURNING *`;
            
            const allCatastroValues = [id, ...catastroValues];

            await client.query(updateCatastroQuery, allCatastroValues);
        }

        await client.query('COMMIT');
        
        const finalResult = await pool.query(
            `SELECT c.*, d.*
             FROM Centers c
             LEFT JOIN CentersDescription d ON c.center_id = d.center_id
             WHERE c.center_id = $1`, [id]
        );
        res.status(200).json(finalResult.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error al actualizar el centro ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    } finally {
        client.release();
    }
};

// DELETE /api/centers/:id - Eliminar un centro
const deleteCenterHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciar la transacción
        // La eliminación en cascada se encargará de las tablas dependientes.
        const deleteOp = await client.query('DELETE FROM Centers WHERE center_id = $1', [id]);

        if (deleteOp.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ message: 'Centro no encontrado para eliminar.' });
            return;
        }
        await client.query('COMMIT'); // Confirmar la transacción
        res.status(204).send();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error al eliminar el centro ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    } finally {
        client.release();
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
    const { itemName, categoryId, quantity, unit, notes,user } = req.body;
    const userId = user?.user_id; 
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

const getCurrentResidentsHandler: RequestHandler = async (req, res) => {
  const { centerId } = req.params;

  const query = `
    SELECT 
      fg.family_id,
      p.rut,
      CONCAT(p.nombre, ' ', p.primer_apellido) AS nombre_completo,
      COUNT(fgm.person_id) AS integrantes_grupo
    FROM CentersActivations ca
    JOIN FamilyGroups fg ON fg.activation_id = ca.activation_id
    JOIN FamilyGroupMembers fgm ON fgm.family_id = fg.family_id
    JOIN Persons p ON p.person_id = fg.jefe_hogar_person_id
    WHERE ca.center_id = $1 
      AND ca.ended_at IS NULL
      AND fg.status = 'activo'  -- Filtra por familias activas
    GROUP BY fg.family_id, p.rut, p.nombre, p.primer_apellido
    ORDER BY nombre_completo
  `;

  try {
    const result = await pool.query(query, [centerId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error al obtener residentes del centro ${centerId}:`, error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};




const getCenterCapacityHandler: RequestHandler = async (req, res) => {
  const { centerId } = req.params;

  try {
    // Consultar la capacidad total del centro
    const centerResult = await pool.query(
      'SELECT capacity FROM Centers WHERE center_id = $1',
      [centerId]
    );

    // Si no se encuentra el centro
    if (centerResult.rows.length === 0) {
        res.status(404).json({ message: 'Centro no encontrado' });
        return;
    }

    const capacity = centerResult.rows[0].capacity;

    // Consultar la cantidad de familias activas en el centro
    const currentCapacityResult = await pool.query(
      `SELECT COALESCE(SUM(fgm.integrantes), 0) AS current_capacity
        FROM Centers c
        LEFT JOIN CentersActivations ca ON ca.center_id = c.center_id AND ca.ended_at IS NULL
        LEFT JOIN FamilyGroups fg ON fg.activation_id = ca.activation_id AND fg.status = 'activo'
        LEFT JOIN (
            SELECT family_id, COUNT(*) AS integrantes
            FROM FamilyGroupMembers
            GROUP BY family_id
        ) fgm ON fgm.family_id = fg.family_id
        WHERE c.center_id = $1`,
      [centerId]
    );

    // Calculando la capacidad ocupada y disponible
    const currentCapacity = currentCapacityResult.rows[0].current_capacity || 0;
    const availableCapacity = capacity - currentCapacity;

    // Enviar la respuesta con la capacidad total, ocupada y disponible
    res.json({
      capacity, // Capacidad total
      current_capacity: currentCapacity, // Capacidad ocupada
      available_capacity: availableCapacity // Capacidad disponible
    });

  } catch (error) {
    console.error('Error al obtener la capacidad del centro:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener la capacidad del centro' });
  }
};

// GET /api/active-centers - Listar centros activos
const getActiveCenters: RequestHandler = async (req, res) => {
    try {
    const result = await pool.query(`
      SELECT ca.activation_id, ca.center_id, c.name AS center_name
      FROM CentersActivations ca
      JOIN Centers c ON ca.center_id = c.center_id
      WHERE ca.ended_at IS NULL
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener centros activos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }

}
const getCurrentResidentsPersonsHandler: RequestHandler = async (req, res) => {
  const { centerId } = req.params;

  if (!centerId) {
    res.status(400).json({ error: 'El ID del centro es requerido' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT p.person_id, p.rut, p.nombre, p.primer_apellido, p.segundo_apellido, p.nacionalidad, 
              p.genero, p.edad, p.created_at, p.updated_at
       FROM Persons p
       JOIN FamilyGroupMembers fgm ON fgm.person_id = p.person_id
       JOIN FamilyGroups fg ON fg.family_id = fgm.family_id
       JOIN CentersActivations ca ON ca.activation_id = fg.activation_id
       WHERE ca.center_id = $1`,
      [centerId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No se encontraron personas albergadas en este centro' });
      return;
    }

    const persons = result.rows;
    res.json(persons);
  } catch (err) {
    console.error('Error al obtener las personas albergadas:', err);
    res.status(500).json({ error: 'Error interno del servidor al obtener las personas albergadas' });
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

//Para obtener los residentes / capacidades / activos del centro
router.get('/:centerId/residents', getCurrentResidentsHandler);
router.get('/:centerId/capacity', getCenterCapacityHandler);
router.get('/:centerId/active-centers', getActiveCenters);
router.get('/:centerId/people', getCurrentResidentsPersonsHandler);  // Aquí añades el nuevo endpoint




export default router;