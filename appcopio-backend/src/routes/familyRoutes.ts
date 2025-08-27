// src/routes/familiesRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import type { HouseholdData } from '../types/family';
import { NEEDS_OPTIONS } from "../types/fibe";

const router = Router();


/**
 * PATCH /api/families/:familyId/depart - Registra la salida de un grupo familiar de un centro.
 * Body: {
 * "departure_reason": "motivo de la salida",
 * "destination_activation_id": id_opcional_si_es_traslado
 * }
 */
const departFamilyGroupHandler: RequestHandler = async (req, res) => {
    const { familyId } = req.params;
    const { departure_reason, destination_activation_id } = req.body;

    if (!departure_reason) {
        // ✅ CORRECCIÓN: Se eliminó la palabra "return" de esta línea.
        res.status(400).json({ message: 'El motivo de la salida es obligatorio.' });
        return; // Añadimos un return vacío para asegurar que la función se detenga aquí.
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Inicia la transacción

        // 1. Contar cuántos miembros tiene el grupo familiar.
        const membersCountResult = await client.query(
            'SELECT COUNT(*) as member_count FROM FamilyGroupMembers WHERE family_id = $1',
            [familyId]
        );
        const memberCount = parseInt(membersCountResult.rows[0].member_count, 10);

        // 2. Obtener la activación del centro de origen del grupo.
        const groupInfoResult = await client.query(
            'SELECT activation_id FROM FamilyGroups WHERE family_id = $1 FOR UPDATE',
            [familyId]
        );
        if (groupInfoResult.rows.length === 0) {
            throw new Error('Grupo familiar no encontrado.');
        }
        const originActivationId = groupInfoResult.rows[0].activation_id;

        // 3. Actualizar el estado del grupo familiar a 'inactivo' y registrar los detalles de la salida.
        await client.query(
            `UPDATE FamilyGroups 
             SET status = 'inactivo', 
                 departure_date = NOW(), 
                 departure_reason = $1, 
                 destination_activation_id = $2
             WHERE family_id = $3`,
            [departure_reason, destination_activation_id || null, familyId]
        );

        // 4. Restar el número de miembros de la capacidad actual del centro de origen.
        await client.query(
            `UPDATE CentersActivations 
             SET current_capacity = current_capacity - $1 
             WHERE activation_id = $2`,
            [memberCount, originActivationId]
        );
        
        // 5. Si es un traslado, sumar los miembros a la capacidad del centro de destino.
        if (departure_reason === 'traslado' && destination_activation_id) {
            await client.query(
                `UPDATE CentersActivations 
                 SET current_capacity = current_capacity + $1 
                 WHERE activation_id = $2`,
                [memberCount, destination_activation_id]
            );
        }

        await client.query('COMMIT'); // Si todo va bien, confirma los cambios
        res.status(200).json({ message: 'Salida del grupo familiar registrada con éxito.' });

    } catch (error) {
        await client.query('ROLLBACK'); // Si algo falla, revierte todos los cambios
        console.error('Error al registrar la salida del grupo familiar:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar la salida.' });
    } finally {
        client.release(); // Libera la conexión
    }
};



// Transforma selectedNeeds (string[]) a vector 14 de 0/1 (INTEGER[14])
function needsVectorFromSelected(selected: string[] | undefined | null): number[] {
  const vec = new Array(14).fill(0);
  if (!selected || selected.length === 0) return vec;
  const set = new Set(selected.map((s) => s.toLowerCase().trim()));
  NEEDS_OPTIONS.forEach((name, idx) => {
    if (set.has(name.toLowerCase())) vec[idx] = 1;
  });
  return vec;
}


// ---------- GET /families  (list) ----------
export const listFamiliesHandler: RequestHandler = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        family_id,
        activation_id,
        jefe_hogar_person_id,
        observaciones,
        necesidades_basicas
      FROM FamilyGroups
      ORDER BY family_id DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

// ---------- GET /families/:id  (show) ----------
export const getFamilyHandler: RequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(
      `
      SELECT
        family_id,
        activation_id,
        jefe_hogar_person_id,
        observaciones,
        necesidades_basicas
      FROM FamilyGroups
      WHERE family_id = $1
      `,
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json({ message: "Family not found" });
      return;
    }
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// ---------- POST /families  (create) ----------
// Body: { activation_id: number; jefe_hogar_person_id?: number | null; data: HouseholdData }
export const createFamilyHandler: RequestHandler<
  any,
  { family_id: number } | { message: string },
  { activation_id: number; jefe_hogar_person_id?: number | null; data: HouseholdData }
> = async (req, res, next) => {
  try {
    const family_id = await createFamilyGroupFromHousehold(req.body);
    res.status(201).json({ family_id });
  } catch (e: any) {
    // 23505 = unique_violation por UNIQUE (activation_id, jefe_hogar_person_id)
    if (e?.code === "23505") {
      res
        .status(409)
        .json({ message: "Family head already registered for this activation" });
      return;
    }
    next(e);
  }
};


// Crea el registro en FamilyGroups y retorna el ID generado
export async function createFamilyGroupFromHousehold(args: {
  activation_id: number; jefe_hogar_person_id?: number | null; data: HouseholdData;
}): Promise<number> {
  return createFamilyGroupFromHouseholdDB(pool, {
    activation_id: args.activation_id,
    jefe_hogar_person_id: args.jefe_hogar_person_id ?? null,
    data: args.data,
  });
}

export type Db = { query: (q: string, p?: any[]) => Promise<{ rows: any[]; rowCount: number }> };
export async function createFamilyGroupFromHouseholdDB(
  db: Db,
  args: { activation_id: number; jefe_hogar_person_id: number | null; data: HouseholdData }
): Promise<number> {
  const necesidades = needsVectorFromSelected(args.data?.selectedNeeds);
  const sql = `
    INSERT INTO FamilyGroups (
      activation_id, jefe_hogar_person_id, observaciones, necesidades_basicas
    )
    VALUES ($1, $2, $3, $4::int[])
    RETURNING family_id
  `;
  const params = [args.activation_id, args.jefe_hogar_person_id, args.data?.observations ?? null, necesidades];
  const { rows } = await db.query(sql, params);
  return rows[0].family_id as number;
}


// ---------- PUT /families/:id  (replace -> retorna ID) ----------
// Body igual a POST
export const replaceFamilyHandler: RequestHandler<
  { id: string },
  { family_id: number } | { message: string },
  { activation_id: number; jefe_hogar_person_id?: number | null; data: HouseholdData }
> = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const family_id = await replaceFamilyGroupFromHousehold(id, req.body);
    res.json({ family_id });
  } catch (e: any) {
    if (e?.code === "23505") {
      res
        .status(409)
        .json({ message: "Family head already registered for this activation" });
      return;
    }
    if (e?.message === "FAMILY_NOT_FOUND") {
      res.status(404).json({ message: "Family not found" });
      return;
    }
    next(e);
  }
};

// Reemplaza el registro de FamilyGroups y retorna el ID
export async function replaceFamilyGroupFromHousehold(
  family_id: number,
  args: { activation_id: number; jefe_hogar_person_id?: number | null; data: HouseholdData }
): Promise<number> {
  const necesidades = needsVectorFromSelected(args.data?.selectedNeeds);
  const sql = `
    UPDATE FamilyGroups
    SET
      activation_id = $1,
      jefe_hogar_person_id = $2,
      observaciones = $3,
      necesidades_basicas = $4::int[]
    WHERE family_id = $5
    RETURNING family_id
  `;
  const params = [
    args.activation_id,
    args.jefe_hogar_person_id ?? null,
    args.data?.observations ?? null,
    necesidades,
    family_id,
  ];
  const { rows } = await pool.query<{ family_id: number }>(sql, params);
  if (rows.length === 0) {
    throw new Error("FAMILY_NOT_FOUND");
  }
  return rows[0].family_id;
}

// ---------- Enrutar ----------
router.get("/", listFamiliesHandler);
router.get("/:id", getFamilyHandler);
router.post("/", createFamilyHandler);
router.put("/:id", replaceFamilyHandler);
router.patch('/:familyId/depart', departFamilyGroupHandler);

export default router;