// src/routes/familyRoutes.ts

/*
Este archivo tiene un cambio muy importante respecto a los demas, tenia una logica de manejo de 
capacidad la cual no corresponde muy bien que se maneje en familias, esta ahora esta en centerRoutes.ts

gemini me recomendo incoporar la siguiente logica en el frontend:

1)Acción del Usuario: El usuario en la página hace clic en el botón para dar de baja a una familia
de un centro.

2)Primera Llamada (PATCH): El frontend realiza la llamada a nuestra ruta refactorizada:
PATCH /api/families/:familyId/depart. El backend hace su única tarea: actualiza el
estado de la familia a "inactivo". Y responde con un "éxito".

3)Segunda Llamada (GET): Inmediatamente después de recibir la respuesta exitosa de la primera llamada,
el frontend realiza una segunda llamada para refrescar la información de la capacidad:
GET /api/centers/:centerId/capacity.

4)Actualización de la UI: El frontend recibe la capacidad actualizada (total, actual y disponible) del centro y 
actualiza los números que ve el usuario en la pantalla.



*/


import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import type { HouseholdData } from '../types/family';
import { NEEDS_OPTIONS } from "../types/fibe";
import { Db } from '../types/db';

const router = Router();

// =================================================================
// 1. SECCIÓN DE UTILIDADES (Helpers & DB Functions)
// =================================================================

/**
 * Transforma un array de strings de necesidades en un vector de 1s y 0s.
 * @param selectedNeeds Array con los nombres de las necesidades seleccionadas.
 * @returns Un array de 14 números (INTEGER[14]) representando el vector.
 */
function needsVectorFromSelected(selectedNeeds: string[] | undefined | null): number[] {
    const vec = new Array(NEEDS_OPTIONS.length).fill(0);
    if (!selectedNeeds || selectedNeeds.length === 0) return vec;
    const selectedSet = new Set(selectedNeeds.map((s) => s.toLowerCase().trim()));
    NEEDS_OPTIONS.forEach((name, idx) => {
        if (selectedSet.has(name.toLowerCase())) vec[idx] = 1;
    });
    return vec;
}

/**
 * Crea un registro en FamilyGroups usando una transacción de DB.
 * @param db Pool de conexión a la base de datos.
 * @param args Argumentos para la creación del grupo familiar.
 * @returns El ID del nuevo grupo familiar.
 */
async function createFamilyGroupInDB(db: Db, args: {
    activation_id: number;
    jefe_hogar_person_id: number | null;
    data: HouseholdData;
}): Promise<number> {
    const necesidades = needsVectorFromSelected(args.data?.selectedNeeds);
    const sql = `
        INSERT INTO FamilyGroups (activation_id, jefe_hogar_person_id, observaciones, necesidades_basicas)
        VALUES ($1, $2, $3, $4::int[])
        RETURNING family_id`;
    const params = [args.activation_id, args.jefe_hogar_person_id ?? null, args.data?.observations ?? null, necesidades];
    const { rows } = await db.query(sql, params);
    return rows[0].family_id as number;
}

// =================================================================
// 2. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

/**
 * @controller GET /api/families
 * @description Obtiene una lista de los últimos 100 grupos familiares.
 */
const listFamilies: RequestHandler = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT family_id, activation_id, jefe_hogar_person_id, observaciones, necesidades_basicas
            FROM FamilyGroups
            ORDER BY family_id DESC
            LIMIT 100`);
        res.json(rows);
    } catch (e) {
        console.error("Error en listFamilies:", e);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

/**
 * @controller GET /api/families/:id
 * @description Obtiene un grupo familiar por su ID.
 */
const getFamilyById: RequestHandler = async (req, res) => {
    const familyId = parseInt(req.params.id, 10);
    if (isNaN(familyId)) {
        res.status(400).json({ error: "El ID de la familia debe ser un número válido." });
        return;
    }

    try {
        const { rows } = await pool.query(
            `SELECT * FROM FamilyGroups WHERE family_id = $1`,
            [familyId]
        );
        if (rows.length === 0) {
            res.status(404).json({ error: "Grupo familiar no encontrado." });
        } else {
            res.json(rows[0]);
        }
    } catch (e) {
        console.error(`Error en getFamilyById (id: ${familyId}):`, e);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

/**
 * @controller POST /api/families
 * @description Crea un nuevo grupo familiar.
 */
const createFamily: RequestHandler = async (req, res) => {
    const { activation_id, data } = req.body;
    if (!activation_id || !data) {
        res.status(400).json({ error: "Se requieren 'activation_id' y 'data'." });
        return;
    }

    try {
        const familyId = await createFamilyGroupInDB(pool, req.body);
        res.status(201).json({ family_id: familyId });
    } catch (e: any) {
        if (e?.code === "23505") { // unique_violation
            res.status(409).json({ error: "El jefe de hogar ya está registrado en esta activación." });
        } else {
            console.error("Error en createFamily:", e);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    }
};

/**
 * @controller PUT /api/families/:id
 * @description Actualiza un grupo familiar existente.
 */
const updateFamily: RequestHandler = async (req, res) => {
    const familyId = parseInt(req.params.id, 10);
    if (isNaN(familyId)) {
        res.status(400).json({ error: "El ID de la familia debe ser un número válido." });
        return;
    }

    const { activation_id, data, jefe_hogar_person_id } = req.body;
    if (!activation_id || !data) {
        res.status(400).json({ error: "Se requieren 'activation_id' y 'data'." });
        return;
    }

    try {
        const necesidades = needsVectorFromSelected(data?.selectedNeeds);
        const sql = `
            UPDATE FamilyGroups
            SET activation_id = $1, jefe_hogar_person_id = $2, observaciones = $3, necesidades_basicas = $4::int[]
            WHERE family_id = $5
            RETURNING *`;
        const params = [activation_id, jefe_hogar_person_id ?? null, data?.observations ?? null, necesidades, familyId];
        const { rows, rowCount } = await pool.query(sql, params);

        if (rowCount === 0) {
            res.status(404).json({ error: "Grupo familiar no encontrado." });
        } else {
            res.json(rows[0]);
        }
    } catch (e: any) {
        if (e?.code === "23505") {
            res.status(409).json({ error: "El jefe de hogar ya está registrado en esta activación." });
        } else {
            console.error(`Error en updateFamily (id: ${familyId}):`, e);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    }
};

// TODO: revisar departFamilyGroup, hay mucha lógica de la versión anterior que simplemente se borró.

/**
 * @controller PATCH /api/families/:familyId/depart
 * @description Registra la salida de un grupo familiar de un centro.
 */
const departFamilyGroup: RequestHandler = async (req, res) => {
    const familyId = parseInt(req.params.familyId, 10);
    if (isNaN(familyId)) {
        res.status(400).json({ error: "El ID de la familia debe ser un número válido." });
        return;
    }

    const { departure_reason } = req.body;
    if (!departure_reason) {
        res.status(400).json({ error: 'El motivo de la salida es obligatorio.' });
        return;
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Actualizar el estado del grupo a 'inactivo'
        const updateResult = await client.query(
            `UPDATE FamilyGroups 
             SET status = 'inactivo', departure_date = NOW(), departure_reason = $1
             WHERE family_id = $2`,
            [departure_reason, familyId]
        );

        if (updateResult.rowCount === 0) {
            throw new Error('Grupo familiar no encontrado.');
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Salida del grupo familiar registrada con éxito.' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Error en departFamilyGroup (id: ${familyId}):`, error);
        res.status(500).json({ error: error.message || 'Error interno del servidor.' });
    } finally {
        client.release();
    }
};


/**
const departFamilyGroupHandler: RequestHandler = async (req, res) => {
  const { familyId } = req.params;
  const { departure_reason, destination_activation_id } = req.body;

  if (!departure_reason) {
    res.status(400).json({ message: 'El motivo de la salida es obligatorio.' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Contar cuántos miembros tiene el grupo familiar
    const membersCountResult = await client.query(
      'SELECT COUNT(*) as member_count FROM FamilyGroupMembers WHERE family_id = $1',
      [familyId]
    );
    const memberCount = parseInt(membersCountResult.rows[0].member_count, 10);

    // 2. Obtener la activación y centro de origen del grupo
    const groupInfoResult = await client.query(
      'SELECT activation_id FROM FamilyGroups WHERE family_id = $1 FOR UPDATE',
      [familyId]
    );
    if (groupInfoResult.rows.length === 0) {
      throw new Error('Grupo familiar no encontrado.');
    }
    const originActivationId = groupInfoResult.rows[0].activation_id;

    // 3. Obtener el center_id del centro de origen
    const originCenterResult = await client.query(
      'SELECT center_id FROM CentersActivations WHERE activation_id = $1',
      [originActivationId]
    );
    const originCenterId = originCenterResult.rows[0]?.center_id;

    // 4. Actualizar el estado del grupo familiar a 'inactivo' y registrar la salida
    await client.query(
      `UPDATE FamilyGroups 
      SET status = 'inactivo', 
          departure_date = NOW(), 
          departure_reason = $1, 
          destination_activation_id = $2
      WHERE family_id = $3`,
      [departure_reason, destination_activation_id || null, familyId]
    );


    // 5. Calcular capacidad actual del centro de origen
    const originCapacityResult = await client.query(
      `SELECT c.capacity - COALESCE(SUM(fgm.integrantes), 0) AS current_capacity
      FROM Centers c
      LEFT JOIN CentersActivations ca ON ca.center_id = c.center_id
      LEFT JOIN FamilyGroups fg ON fg.activation_id = ca.activation_id AND fg.status = 'activo'
      LEFT JOIN (
        SELECT family_id, COUNT(*) AS integrantes
        FROM FamilyGroupMembers
        GROUP BY family_id
      ) fgm ON fgm.family_id = fg.family_id
      WHERE c.center_id = $1
      GROUP BY c.capacity`,
      [originCenterId]
    );
    const originCurrentCapacity = originCapacityResult.rows[0]?.current_capacity ?? null;

    // 6. Si es un traslado, calcular capacidad del centro de destino
    let destinationCurrentCapacity: number | null = null;
    if (departure_reason === 'traslado' && destination_activation_id) {
      const destinationCenterResult = await client.query(
        'SELECT center_id FROM CentersActivations WHERE activation_id = $1',
        [destination_activation_id]
      );
      if (destinationCenterResult.rows.length === 0) {
        res.status(400).json({ message: `destination_activation_id ${destination_activation_id} no existe en CentersActivations.` });
        return;
      }

      const destinationCenterId = destinationCenterResult.rows[0].center_id;

      const destinationCapacityResult = await client.query(
        `SELECT c.capacity - COALESCE(COUNT(fg.family_id), 0) AS current_capacity
         FROM Centers c
         LEFT JOIN CentersActivations ca ON ca.center_id = c.center_id
         LEFT JOIN FamilyGroups fg ON fg.activation_id = ca.activation_id AND fg.status = 'activo'
         WHERE c.center_id = $1
         GROUP BY c.capacity`,
        [destinationCenterId]
      );
      destinationCurrentCapacity = destinationCapacityResult.rows[0]?.current_capacity ?? null;

      // 7. Actualizar el estado de la familia en el centro de destino
      await client.query(
        `UPDATE FamilyGroups
        SET status = 'activo',
            activation_id = $1
        WHERE family_id = $2`,
        [destination_activation_id, familyId]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({
        message: 'Salida del grupo familiar registrada con éxito.',
        origin_current_capacity: originCurrentCapacity,
        ...(destinationCurrentCapacity !== null && {
            destination_current_capacity: destinationCurrentCapacity
        })
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al registrar la salida del grupo familiar:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar la salida.' });
    } finally {
        client.release();
    }
};
 */


// =================================================================
// 3. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get("/", listFamilies);
router.post("/", createFamily);
router.get("/:id", getFamilyById);
router.put("/:id", updateFamily);
router.patch('/:familyId/depart', departFamilyGroup);

export default router;