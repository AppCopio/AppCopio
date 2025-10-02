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
export async function updateFieldDB(
  db: Db,
  field_id: string,
  payload: Record<string, any>
): Promise<DatasetField | null> {
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;

  const up = (col: string, val: any, cast?: string) => {
    sets.push(`${col} = $${i}${cast ?? ""}`);
    vals.push(val);
    i++;
  };

  if (payload.name !== undefined) up("name", payload.name);
  if (payload.key !== undefined) up("key", payload.key);
  if (payload.type !== undefined) up("type", payload.type);
  if (payload.required !== undefined) up("required", payload.required);
  if (payload.unique_field !== undefined) up("unique_field", payload.unique_field);
  if (payload.config !== undefined) up("config", JSON.stringify(payload.config ?? {}), "::jsonb");
  if (payload.is_active !== undefined) up("is_active", payload.is_active);
  if (payload.is_multi !== undefined) up("is_multi", payload.is_multi);
  if (payload.relation_target_kind !== undefined) up("relation_target_kind", payload.relation_target_kind);
  if (payload.relation_target_dataset_id !== undefined) up("relation_target_dataset_id", payload.relation_target_dataset_id);
  if (payload.relation_target_core !== undefined) up("relation_target_core", payload.relation_target_core);
  if (payload.deleted_at !== undefined) up("deleted_at", payload.deleted_at);

  if (sets.length === 0) {
    return await getFieldByIdDB(db, field_id);
  }

  vals.push(field_id);

  const sql = `
    UPDATE DatasetFields
       SET ${sets.join(", ")}
     WHERE field_id = $${i}
     RETURNING field_id, dataset_id, name, key, type, required, unique_field,
               config, position, is_active, is_multi,
               relation_target_kind, relation_target_dataset_id, relation_target_core,
               created_at, updated_at, deleted_at
  `;

  const { rows } = await db.query(sql, vals);
  return rows[0] ?? null;
}


export async function getFieldByIdDB(db: Db, field_id: string) {
  const { rows } = await db.query(
    `SELECT field_id, dataset_id, name, key, type, required, unique_field,
            config, position, is_active, relation_target_kind,
            relation_target_dataset_id, relation_target_core,
            created_at, updated_at, deleted_at
     FROM DatasetFields
     WHERE field_id = $1`,
    [field_id]
  );
  return rows[0] ?? null;
}

export async function moveFieldPositionDB(db: Db, field_id: string, toPosition: number) {
  // 1. Lock del campo a mover
  const qField = await db.query(
    `SELECT field_id, dataset_id, position, is_active, deleted_at
     FROM DatasetFields
     WHERE field_id = $1
     FOR UPDATE`,
    [field_id]
  );
  
  const f = qField.rows[0];
  if (!f) throw new Error("FIELD_NOT_FOUND");
  if (!f.is_active || f.deleted_at) throw new Error("FIELD_NOT_MOVABLE");

  const from = Number(f.position);
  const dataset_id = f.dataset_id;

  // 2. Obtener el rango válido de posiciones
  const qMax = await db.query(
    `SELECT COALESCE(MAX(position), 0) AS max_pos
     FROM DatasetFields
     WHERE dataset_id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [dataset_id]
  );
  
  const maxPos = Number(qMax.rows[0]?.max_pos ?? 0) || 1;
  const to = Math.max(1, Math.min(Number(toPosition), maxPos));

  // Si la posición no cambia, no hacer nada
  if (to === from) return;

  // 🔧 PASO CRÍTICO: Mover el campo a una posición temporal NEGATIVA
  // Esto lo saca del rango de posiciones activas y evita conflictos
  await db.query(
    `UPDATE DatasetFields
     SET position = -1
     WHERE field_id = $1`,
    [field_id]
  );

  // 3. Ajustar las posiciones de los otros campos
  if (to < from) {
    // Moviendo hacia la izquierda: desplazar campos hacia la derecha
    // para abrir espacio en la posición destino
    await db.query(
      `UPDATE DatasetFields
       SET position = position + 1
       WHERE dataset_id = $1
         AND is_active = TRUE 
         AND deleted_at IS NULL
         AND position >= $2 
         AND position < $3`,
      [dataset_id, to, from]
    );
  } else {
    // Moviendo hacia la derecha: desplazar campos hacia la izquierda
    // para cerrar el hueco dejado por el campo movido
    await db.query(
      `UPDATE DatasetFields
       SET position = position - 1
       WHERE dataset_id = $1
         AND is_active = TRUE 
         AND deleted_at IS NULL
         AND position <= $2 
         AND position > $3`,
      [dataset_id, to, from]
    );
  }

  // 4. Finalmente, mover el campo a su posición definitiva
  await db.query(
    `UPDATE DatasetFields
     SET position = $2
     WHERE field_id = $1`,
    [field_id, to]
  );
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
