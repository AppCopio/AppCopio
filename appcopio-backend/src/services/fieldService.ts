// src/services/fieldsService.ts
import type { Db } from "../types/db";
import { Dataset, DatasetField, DatasetFieldOption, UUID } from "../types/dataset";

export async function listFieldsByDatasetDB(db: Db, dataset_id: string) : Promise<DatasetField[]> {
  const sql = `
    SELECT field_id, dataset_id, name, key, type, required, unique_field, config, position,
           is_active, is_multi, relation_target_kind, relation_target_dataset_id, relation_target_core,
           created_at, updated_at, deleted_at
    FROM DatasetFields
    WHERE dataset_id = $1 AND deleted_at IS NULL
    ORDER BY position ASC, created_at ASC`;
  const { rows } = await db.query(sql, [dataset_id]);
  return rows;
}

export async function createFieldDB(db: Db, args: any) : Promise<DatasetField> {
  const sql = `
    INSERT INTO DatasetFields
    (dataset_id, name, key, type, required, unique_field, config, position, is_active,
     is_multi, relation_target_kind, relation_target_dataset_id, relation_target_core)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13)
    RETURNING field_id, dataset_id, name, key, type, required, unique_field, config, position, is_active,
              is_multi, relation_target_kind, relation_target_dataset_id, relation_target_core, created_at`;
  const { rows } = await db.query(sql, [
    args.dataset_id, args.name, args.key, args.type, !!args.required, !!args.unique_field,
    JSON.stringify(args.config ?? {}), args.position ?? 0, args.is_active !== false,
    !!args.is_multi, args.relation_target_kind ?? null, args.relation_target_dataset_id ?? null, args.relation_target_core ?? null
  ]);
  return rows[0];
}

// Se le pasa en Payload los campos a actualizar junto a su nuevo valor
export async function updateFieldDB(db: Db, field_id: string, payload: any) : Promise<DatasetField> {
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  const up = (col: string, val: any, cast?: string) => {
    sets.push(`${col} = $${i}${cast ? `::${cast}` : ""}`); vals.push(val); i++;
  };

  for (const k of ["name","key","type","position","is_active","required","unique_field","is_multi","relation_target_kind","relation_target_dataset_id","relation_target_core"]) {
    if (payload[k] !== undefined) {
      up(k, payload[k]);
    }
  }
  if (payload.config !== undefined) up("config", JSON.stringify(payload.config ?? {}), "jsonb");

  if (sets.length === 0) {
    const { rows } = await db.query(`SELECT * FROM DatasetFields WHERE field_id = $1`, [field_id]);
    return rows[0] ?? null;
  }

  const sql = `
    UPDATE DatasetFields
    SET ${sets.join(", ")}, updated_at = now()
    WHERE field_id = $${i}
    RETURNING *`;
  vals.push(field_id);

  const { rows } = await db.query(sql, vals);
  return rows[0] ?? null;
}

export async function softDeleteFieldDB(db: Db, field_id: string) : Promise<UUID> {
  const sql = `
    UPDATE DatasetFields
    SET deleted_at = now(), is_active = FALSE, updated_at = now()
    WHERE field_id = $1 AND deleted_at IS NULL
    RETURNING field_id`;
  const { rows } = await db.query(sql, [field_id]);
  return rows[0]?.field_id ?? null;
}

// Options
export async function listOptionsByFieldDB(db: Db, field_id: string) : Promise<DatasetFieldOption[]> {
  const sql = `
    SELECT option_id, field_id, label, value, color, position, is_active, created_at, updated_at
    FROM DatasetFieldOptions
    WHERE field_id = $1 AND is_active = TRUE
    ORDER BY position ASC, created_at ASC`;
  const { rows } = await db.query(sql, [field_id]);
  return rows;
}

export async function createOptionDB(db: Db, args: any) : Promise<DatasetFieldOption>{
  const sql = `
    INSERT INTO DatasetFieldOptions (field_id, label, value, color, position, is_active)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING option_id, field_id, label, value, color, position, is_active, created_at`;
  const { rows } = await db.query(sql, [
    args.field_id, args.label, args.value, args.color, args.position ?? 0, args.is_active !== false
  ]);
  return rows[0];
}

export async function updateOptionDB(db: Db, option_id: string, payload: any) : Promise<DatasetFieldOption | null> {
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  if (payload.label !== undefined) { sets.push(`label = $${i++}`); vals.push(payload.label); }
  if (payload.value !== undefined) { sets.push(`value = $${i++}`); vals.push(String(payload.value).toLowerCase()); }
  if (payload.color !== undefined) { sets.push(`color = $${i++}`); vals.push(payload.color); }
  if (payload.position !== undefined) { sets.push(`position = $${i++}`); vals.push(Number(payload.position)); }
  if (payload.is_active !== undefined) { sets.push(`is_active = $${i++}`); vals.push(!!payload.is_active); }

  if (sets.length === 0) {
    const { rows } = await db.query(`SELECT * FROM DatasetFieldOptions WHERE option_id = $1`, [option_id]);
    return rows[0] ?? null;
  }

  const sql = `
    UPDATE DatasetFieldOptions
    SET ${sets.join(", ")}
    WHERE option_id = $${i}
    RETURNING *`;
  vals.push(option_id);

  const { rows } = await db.query(sql, vals);
  return rows[0] ?? null;
}

export async function softDeleteOptionDB (db: Db, option_id: string) : Promise<UUID> {
  const sql = `
    UPDATE DatasetFieldOptions
    SET is_active = FALSE, updated_at = now()
    WHERE option_id = $1 AND is_active = TRUE
    RETURNING option_id`;
  const { rows } = await db.query(sql, [option_id]);
  return rows[0]?.option_id ?? null;
}
