// src/services/familyService.ts
import type { HouseholdData } from "../types/family";
import { NEEDS_OPTIONS } from "../types/fibe";
import type { Db } from "../types/db";

/**
 * Transforma un array de strings de necesidades en un vector de 1s y 0s.
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
 * Crea un registro en FamilyGroups.
 * @param db Pool de conexión a la base de datos.
 * @param args Argumentos para la creación del grupo familiar.
 * @returns El ID del nuevo grupo familiar.
 */
export async function createFamilyGroupInDB(db: Db, args: {
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