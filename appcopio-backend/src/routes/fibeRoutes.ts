import { Router, RequestHandler } from "express";
import pool from "../config/db";

import { createPersonDB } from "./personsRoutes";
import { createFamilyGroupFromHouseholdDB } from "./familyRoutes";
import { createFamilyMemberDB } from "./familyMembersRoutes";

import type { FormData } from "../types/fibe";

const router = Router();

// ---------- POST /fibe/compose (operación atómica) ----------
// Body: { activation_id: number; data: FormData }
export const createFibeSubmissionHandler: RequestHandler<
  any,
  {
    family_id: number;
    jefe_person_id: number;
    jefe_member_id: number;
    members: Array<{ index: number; person_id: number; member_id: number }>;
  } | { message: string, detail: string },
  { activation_id: number; data: FormData }
> = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { activation_id, data } = req.body;
    const { hogar, personas } = data;

    // 1) Jefe de hogar (posición 0)
    const jefe = personas[0];
    const jefe_person_id = await createPersonDB(client, jefe);

    // 2) FamilyGroup con jefe_hogar_person_id
    const family_id = await createFamilyGroupFromHouseholdDB(client, {
      activation_id,
      jefe_hogar_person_id: jefe_person_id,
      data: hogar,
    });

    // 3) Miembro: jefe en FamilyGroupMembers
    const jefe_member_id = await createFamilyMemberDB(client, {
      family_id,
      person_id: jefe_person_id,
      parentesco: jefe.parentesco, // "Jefe de hogar"
    });

    // 4) Resto de personas
    const members: Array<{ index: number; person_id: number; member_id: number }> = [];
    for (let i = 1; i < personas.length; i++) {
      const p = personas[i];
      const person_id = await createPersonDB(client, p);
      const member_id = await createFamilyMemberDB(client, {
        family_id,
        person_id,
        parentesco: p.parentesco,
      });
      members.push({ index: i, person_id, member_id });
    }

    await client.query("COMMIT");
    res.status(201).json({ family_id, jefe_person_id, jefe_member_id, members });
  } catch (e: any) {
    await client.query("ROLLBACK");
    if (e?.code === "23505") {
      // Personas.rut UNIQUE; FamilyGroups(activation_id,jefe_hogar_person_id) UNIQUE; FamilyGroupMembers(family_id,person_id) UNIQUE
      res.status(409).json({ message: "Unique constraint violation", detail: e.detail });
      return;
    }
    next(e);
  } finally {
    client.release();
  }
};

router.post("/compose", createFibeSubmissionHandler);

export default router;