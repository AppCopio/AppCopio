// src/routes/familyMembersRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";

const router = Router();

export type FamilyMemberCreate = {
  family_id: number;
  person_id: number;
  parentesco: string; // ej: 'Jefe de hogar', 'Hijo', etc.
};

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
export const createFamilyMemberHandler: RequestHandler<
  any,
  { member_id: number },
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

// Crea el miembro y retorna el ID generado
export async function createFamilyMember(p: FamilyMemberCreate): Promise<number> {
  const sql = `
    INSERT INTO FamilyGroupMembers (
      family_id, person_id, parentesco
    )
    VALUES ($1, $2, $3)
    RETURNING member_id
  `;
  const params = [p.family_id, p.person_id, p.parentesco];
  const { rows } = await pool.query<{ member_id: number }>(sql, params);
  return rows[0].member_id;
}

// ---------- PUT /family-members/:id (replace -> retorna ID) ----------
export const replaceFamilyMemberHandler: RequestHandler<
  { id: string },
  { member_id: number },
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
