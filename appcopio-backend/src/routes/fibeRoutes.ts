// src/routes/fibeRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";

import { createPersonDB } from "./personsRoutes";
import { createFamilyGroupFromHouseholdDB } from "./familyRoutes";
import { createFamilyMemberDB, hasActiveMembershipByRutInActivationDB, findActiveHeadFamilyInActivationDB } from "./familyMembersRoutes";

import type { FormData } from "../types/fibe";
import type { Db } from "../types/db";

const router = Router();

// ---------- F X ' S   D E   A P O Y O ----------
/** ¿Existe la activación y está vigente? */
export async function assertActivationOpenDB(db: Db, activation_id: number): Promise<void> {
  const { rows } = await db.query(
    `SELECT 1 FROM CentersActivations WHERE activation_id = $1 AND ended_at IS NULL`,
    [activation_id]
  );
  if (!rows.length) {
    const err: any = new Error("Activation not found or closed");
    err.http = 400;
    throw err;
  }
}

// ---------- F I B E ----------

// POST /fibe/registration/:id (operación atómica)
export const createFibeSubmissionHandler: RequestHandler<
  any,
  {
    family_id: number;
    jefe_person_id: number;
    jefe_member_id: number;
    members: Array<{ index: number; person_id: number; member_id: number }>;
  } | { message: string; detail?: unknown },
  { activation_id: number; data: FormData }
> = async (req, res, next): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { activation_id, data } = req.body;
    const { hogar, personas } = data;

    // sanity check
    if (!Array.isArray(personas) || personas.length < 1) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "No persons provided" });
      return; // ← no devolvemos Response
    }

    // Activación abierta
    await assertActivationOpenDB(client, activation_id);

    // 1) Jefe de hogar (posición 0)
    const jefe = personas[0];
    const jefe_person_id = await createPersonDB(client, jefe);

    // ¿ya es jefe activo en esta activación?
    const headHit = await findActiveHeadFamilyInActivationDB(client, activation_id, jefe_person_id);
    if (headHit) {
      await client.query("ROLLBACK");
      res.status(409).json({
        message: "Head of household already registered for this activation",
        detail: { family_id: headHit.family_id, rut: jefe.rut }
      });
      return;
    }

    // ¿está ya como miembro activo en esta activación? (valido por RUT string)
    const jefeMemberHit = await hasActiveMembershipByRutInActivationDB(client, activation_id, jefe.rut);
    if (jefeMemberHit) {
      await client.query("ROLLBACK");
      res.status(409).json({
        message: "Head person is already member of another family in this activation",
        detail: { family_id: jefeMemberHit.family_id, rut: jefe.rut }
      });
      return;
    }

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

      // validar por RUT antes de crear
      const hit = await hasActiveMembershipByRutInActivationDB(client, activation_id, p.rut);
      if (hit) {
        await client.query("ROLLBACK");
        res.status(409).json({
          message: "Person already registered in another family for this activation",
          detail: { index: i, rut: p.rut, family_id: hit.family_id }
        });
        return;
      }

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
    return;
  } catch (e: any) {
    await client.query("ROLLBACK");
    if (e?.code === "23505") {
      // UNIQUE violations
      res.status(409).json({ message: "Unique constraint violation", detail: e.detail });
      return;
    }
    next(e); 
    return;
  } finally {
    client.release();
  }
};

router.post("/registration", createFibeSubmissionHandler);

export default router;
