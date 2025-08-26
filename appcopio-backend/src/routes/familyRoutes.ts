// src/routes/familiesRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { PoolClient } from 'pg';

// import addPersonHandler from './personRoutes';
import { insertPersonTx, PersonInsert } from './personsRoutes';

const router = Router();

/* ===================================================
   Helpers básicos (validación y normalización)
=================================================== */

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim() !== '';

const toIntOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

const normalizeParentesco = (v: unknown): string => {
  if (!isNonEmptyString(v)) throw new Error('VALIDATION_PARENTESCO');
  return v.trim();
};

const isHeadParentesco = (p: string) => {
  const s = p.trim().toLowerCase();
  return (
    s === 'jefe de hogar'
  );
};

const validateNecesidades = (arr?: unknown): number[] | null => {
  if (arr === undefined || arr === null) return null;
  if (!Array.isArray(arr)) throw new Error('VALIDATION_NECESIDADES');
  if (arr.length !== 14) throw new Error('VALIDATION_NECESIDADES_LEN');
  const casted = arr.map((x) => {
    const n = toIntOrNull(x);
    if (n === null) throw new Error('VALIDATION_NECESIDADES');
    return n;
  });
  return casted;
};

/* ================================
   POST /families  (FamilyGroups)
================================ */
const addFamilyGroupHandler: RequestHandler = async (req, res) => {
  const { activation_id, jefe_hogar_person_id, observaciones, necesidades_basicas } = req.body ?? {};

  try {
    const sql = `
      INSERT INTO FamilyGroups (
        activation_id, jefe_hogar_person_id, observaciones, necesidades_basicas
      ) VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const params = [activation_id, jefe_hogar_person_id ?? null, observaciones ?? null, necesidades_basicas ?? null];
    const { rows } = await pool.query(sql, params);
    res.status(201).json(rows[0]);
    return;
  } catch (err) {
    console.error('Error al crear FamilyGroup:', err);
    res.status(500).send('Error del servidor');
    return;
  }
};

/* ============================================
   POST /families/:family_id/members (Members)
============================================ */
const addFamilyGroupMemberHandler: RequestHandler = async (req, res) => {
  const { family_id } = req.params;
  const { person_id, parentesco } = req.body ?? {};

  try {
    const sql = `
      INSERT INTO FamilyGroupMembers (family_id, person_id, parentesco)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const params = [Number(family_id), person_id, parentesco];
    const { rows } = await pool.query(sql, params);
    res.status(201).json(rows[0]);
    return;
  } catch (err) {
    console.error('Error al crear FamilyGroupMember:', err);
    res.status(500).send('Error del servidor');
    return;
  }
};

/* ===========================================================
   POST /families/full  (flujo completo en una transacción)
   Body esperado (base, sin validaciones):

   {
     "activation_id": 123,
     "observaciones": "texto opcional",
     "necesidades_basicas": [ ...14 enteros... ] // opcional
     "members": [
       {
         "parentesco": "Jefe de hogar",
         "es_jefe": true,              // usar para marcar jefe
         "person": { ...payload addPerson... }
       },
       {
         "parentesco": "Hijo",
         "person": { ...payload addPerson... }
       }
     ]
   }
=========================================================== */
const createFamilyWithMembersHandler: RequestHandler = async (req, res) => {
  const { activation_id, observaciones, necesidades_basicas, members } = req.body ?? {};

  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Insertar personas y recolectar sus IDs
    //    Se asume que addPersonTx(client, payload) -> Promise<number>
    const resolved = await Promise.all(
      (members ?? []).map(async (m: any) => {
        const pid = await insertPersonTx(client, m.person as PersonInsert);
        return { person_id: pid, parentesco: m.parentesco, es_jefe: !!m.es_jefe };
      })
    );

    // 2) Determinar jefe de hogar (si hay varios marcados, se usa el primero; si ninguno, el primero del array)
    const jefe = resolved.find((r) => r.es_jefe) ?? resolved[0];
    const jefeId = jefe ? jefe.person_id : null;

    // 3) Crear FamilyGroup
    const insertFamilySql = `
      INSERT INTO FamilyGroups (activation_id, jefe_hogar_person_id, observaciones, necesidades_basicas)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const familyParams = [activation_id, jefeId, observaciones ?? null, necesidades_basicas ?? null];
    const { rows: familyRows } = await client.query(insertFamilySql, familyParams);
    const family = familyRows[0];

    // 4) Insertar miembros
    const insertMemberSql = `
      INSERT INTO FamilyGroupMembers (family_id, person_id, parentesco)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const insertedMembers = [];
    for (const r of resolved) {
      const { rows } = await client.query(insertMemberSql, [family.family_id, r.person_id, r.parentesco]);
      insertedMembers.push(rows[0]);
    }

    await client.query('COMMIT');

    // 5) Respuesta
    res.status(201).json({ family, members: insertedMembers });
    return;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en creación completa de familia:', err);
    res.status(500).send('Error del servidor');
    return;
  } finally {
    client.release();
  }
};

/* =======================
   Rutas
======================= */
router.post('/', addFamilyGroupHandler);
router.post('/full', createFamilyWithMembersHandler);
router.post('/:family_id/members', addFamilyGroupMemberHandler);

export default router;