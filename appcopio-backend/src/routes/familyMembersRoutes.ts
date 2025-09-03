// src/routes/familyMembersRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";

const router = Router();

import type { FamilyMemberCreate } from "../types/family";

const normalizeRut = (v: string) => (v || "").replace(/[^0-9kK]/g, "").toUpperCase();

/* * * * * * * * * *   F X ' S   D E   A P O Y O   * * * * * * * * * * */

/** ¿La persona ya es miembro “activo” de alguna familia en esta activación? */
export async function hasActiveMembershipByRutInActivationDB(
  db: Db,
  activation_id: number,
  rutRaw: string
): Promise<{ family_id: number; member_id: number } | null> {
  const clean = normalizeRut(rutRaw);
  const sql = `
    SELECT fg.family_id, fgm.member_id
    FROM Persons p
    JOIN FamilyGroupMembers fgm ON fgm.person_id = p.person_id
    JOIN FamilyGroups fg ON fg.family_id = fgm.family_id
    WHERE fg.activation_id = $1
      AND upper(regexp_replace(p.rut, '[^0-9Kk]', '', 'g')) = $2
    LIMIT 1
  `;
  const { rows } = await db.query(sql, [activation_id, clean]);
  return rows[0] ?? null;
}

/** ¿Ya es jefe de hogar “activo” en esta activación? */
export async function findActiveHeadFamilyInActivationDB(
  db: Db,
  activation_id: number,
  person_id: number
): Promise<{ family_id: number } | null> {
  const sql = `
    SELECT family_id
    FROM FamilyGroups
    WHERE activation_id = $1
      AND jefe_hogar_person_id = $2
    LIMIT 1
  `;
  const { rows } = await db.query(sql, [activation_id, person_id]);
  return rows[0] ?? null;
}


// ---------- GET /family-members (list) ----------
export const listFamilyMembersHandler: RequestHandler = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        member_id,
        family_id,
        person_id,
        parentesco
      FROM FamilyGroupMembers
      ORDER BY member_id DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

// ---------- GET /family-members/:id (show) ----------
export const getFamilyMemberHandler: RequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(
      `
      SELECT
        member_id,
        family_id,
        person_id,
        parentesco
      FROM FamilyGroupMembers
      WHERE member_id = $1
      `,
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json({ message: "Family member not found" });
      return;
    }
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// ---------- POST /family-members (create -> retorna ID) ----------
export type Db = { query: (q: string, p?: any[]) => Promise<{ rows: any[]; rowCount: number }> };

export async function createFamilyMemberDB(
  db: Db,
  args: FamilyMemberCreate
): Promise<number> {
  const sql = `
    INSERT INTO FamilyGroupMembers (family_id, person_id, parentesco)
    VALUES ($1, $2, $3)
    RETURNING member_id
  `;
  const { rows } = await db.query(sql, [args.family_id, args.person_id, args.parentesco]);
  return rows[0].member_id as number;
}

export async function createFamilyMember(p: FamilyMemberCreate): Promise<number> {
  return createFamilyMemberDB(pool, p);
}

export const createFamilyMemberHandler: RequestHandler<
  any,
  { member_id: number } | { message: string },
  FamilyMemberCreate
> = async (req, res, next) => {
  try {
    const member_id = await createFamilyMember(req.body);
    res.status(201).json({ member_id });
  } catch (e: any) {
    // 23505 = unique_violation por UNIQUE(family_id, person_id)
    if (e?.code === "23505") {
      res.status(409).json({ message: "Member already exists for this family" });
      return;
    }
    next(e);
  }
};

// ---------- PUT /family-members/:id (replace -> retorna ID) ----------
export const replaceFamilyMemberHandler: RequestHandler<
  { id: string },
  { member_id: number } | { message: string },
  FamilyMemberCreate
> = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const p = req.body;

    const sql = `
      UPDATE FamilyGroupMembers
      SET
        family_id = $1,
        person_id = $2,
        parentesco = $3
      WHERE member_id = $4
      RETURNING member_id
    `;
    const params = [p.family_id, p.person_id, p.parentesco, id];

    const { rows } = await pool.query<{ member_id: number }>(sql, params);
    if (rows.length === 0) {
      res.status(404).json({ message: "Family member not found" });
      return;
    }
    res.json({ member_id: rows[0].member_id });
    return;
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ message: "Member already exists for this family" });
      return;
    }
    next(e);
  }
};

// ---------- Enrutar ----------
router.get("/", listFamilyMembersHandler);
router.get("/:id", getFamilyMemberHandler);
router.post("/", createFamilyMemberHandler);
router.put("/:id", replaceFamilyMemberHandler);

export default router;
