// src/services/familyMemberService.ts
import type { FamilyMemberCreate } from "../types/family";
import type { Db } from "../types/db";

const normalizeRut = (v: string) => (v || "").replace(/[^0-9kK]/g, "").toUpperCase();

/**
 * Crea una nueva relación miembro-familia.
 * @param db Pool de conexión a la base de datos.
 * @param args Datos de la relación a crear.
 * @returns El ID del nuevo miembro.
 */
export async function createFamilyMemberDB(db: Db, args: FamilyMemberCreate): Promise<number> {
    const sql = `
        INSERT INTO FamilyGroupMembers (family_id, person_id, parentesco)
        VALUES ($1, $2, $3)
        RETURNING member_id`;
    const { rows } = await db.query(sql, [args.family_id, args.person_id, args.parentesco]);
    return rows[0].member_id as number;
}

/**
 * Verifica si una persona ya es miembro activo de alguna familia en una activación.
 * @param db Pool de conexión a la base de datos.
 * @param activation_id ID de la activación del centro.
 * @param rutRaw RUT de la persona a buscar.
 * @returns El ID de la familia y del miembro si se encuentra, o null.
 */
export async function hasActiveMembershipByRutInActivationDB(
    db: Db,
    activation_id: number,
    rutRaw: string
): Promise<{ family_id: number; member_id: number } | null> {
    const cleanRut = normalizeRut(rutRaw);
    const sql = `
        SELECT fg.family_id, fgm.member_id
        FROM Persons p
        JOIN FamilyGroupMembers fgm ON fgm.person_id = p.person_id
        JOIN FamilyGroups fg ON fg.family_id = fgm.family_id
        WHERE fg.activation_id = $1
          AND upper(regexp_replace(p.rut, '[^0-9Kk]', '', 'g')) = $2
        LIMIT 1`;
    const { rows } = await db.query(sql, [activation_id, cleanRut]);
    return rows[0] ?? null;
}

/**
 * Encuentra si una persona ya es jefe de hogar activo en una activación.
 * @param db Pool de conexión a la base de datos.
 * @param activation_id ID de la activación del centro.
 * @param person_id ID de la persona a buscar.
 * @returns El ID de la familia si se encuentra, o null.
 */
export async function findActiveHeadFamilyInActivationDB(
    db: Db,
    activation_id: number,
    person_id: number
): Promise<{ family_id: number } | null> {
    const sql = `
        SELECT family_id
        FROM FamilyGroups
        WHERE activation_id = $1 AND jefe_hogar_person_id = $2
        LIMIT 1`;
    const { rows } = await db.query(sql, [activation_id, person_id]);
    return rows[0] ?? null;
}