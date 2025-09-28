import { DatasetRecord, UUID } from "../types/dataset";
import type { Db } from "../types/db";

export async function listRecordsDB(db: Db, args: {
  dataset_id: string; limit: number; offset: number; qData?: any | null;
}) : Promise<DatasetRecord[]> {
  const vals: any[] = [args.dataset_id, args.limit, args.offset];
  let where = `dataset_id = $1 AND deleted_at IS NULL`;
  if (args.qData) {
    vals.unshift(JSON.stringify(args.qData));
    where = `(data @> $1::jsonb) AND ` + where;
  }
  const sql = `
    SELECT record_id, dataset_id, activation_id, version, data,
           created_by, updated_by, created_at, updated_at, deleted_at
    FROM DatasetRecords
    WHERE ${where}
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT $${vals.length - 1} OFFSET $${vals.length}`;
  const { rows } = await db.query(sql, vals);
  return rows;
}

export async function getRecordDB(db: Db, record_id: string) : Promise<DatasetRecord | null> {
  const sql = `
    SELECT record_id, dataset_id, activation_id, version, data,
           created_by, updated_by, created_at, updated_at, deleted_at
    FROM DatasetRecords
    WHERE record_id = $1`;
  const { rows } = await db.query(sql, [record_id]);
  return rows[0] ?? null;
}

export async function createRecordDB(db: Db, userId: number, args: {
  dataset_id: string; activation_id: number; data: any;
  select_values: Record<string, string | string[]>;
  relations_dynamic: Array<{ field_id: string; target_record_id: string }>;
  relations_core: Array<{ field_id: string; target_core: string; target_id: number }>;
})  : Promise<DatasetRecord>{
  // 1) Inserta registro base
  const insertRec = `
    INSERT INTO DatasetRecords (dataset_id, activation_id, data, created_by)
    VALUES ($1, $2, $3::jsonb, $4)
    RETURNING record_id, dataset_id, activation_id, version, data, created_by, created_at`;
  const { rows } = await db.query(insertRec, [
    args.dataset_id, args.activation_id, JSON.stringify(args.data ?? {}), userId
  ]);
  const rec = rows[0];

  // 2) Opciones select/multi_select
  for (const [field_id, val] of Object.entries(args.select_values ?? {})) {
    const arr = Array.isArray(val) ? val : [val];
    for (const option_id of arr) {
      await db.query(
        `INSERT INTO DatasetRecordOptionValues (record_id, field_id, option_id) VALUES ($1,$2,$3)
         ON CONFLICT DO NOTHING`,
        [rec.record_id, field_id, option_id]
      );
    }
  }

  // 3) Relaciones dynamic
  for (const r of args.relations_dynamic ?? []) {
    await db.query(
      `INSERT INTO DatasetRecordRelations (record_id, field_id, target_record_id)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [rec.record_id, r.field_id, r.target_record_id]
    );
  }

  // 4) Relaciones core
  for (const r of args.relations_core ?? []) {
    await db.query(
      `INSERT INTO DatasetRecordCoreRelations (record_id, field_id, target_core, target_id)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [rec.record_id, r.field_id, r.target_core, r.target_id]
    );
  }

  return rec;
}

export async function updateRecordDB(db: Db, userId: number, args: {
  record_id: string; version: number;
  data?: any | null;
  select_values?: Record<string, string | string[]> | null;
  relations_dynamic?: Array<{ field_id: string; target_record_id: string }> | null;
  relations_core?: Array<{ field_id: string; target_core: string; target_id: number }> | null;
})  : Promise<DatasetRecord | null> {

  const sel = await db.query(
    `SELECT version, dataset_id FROM DatasetRecords WHERE record_id = $1 AND deleted_at IS NULL`,
    [args.record_id]
  );
  const cur = sel.rows[0];
  if (!cur || cur.version !== args.version) return null;

  if (args.data !== null && args.data !== undefined) {
    await db.query(
      `UPDATE DatasetRecords
       SET data = $1::jsonb, version = version + 1, updated_by = $3
       WHERE record_id = $2`,
      [JSON.stringify(args.data ?? {}), args.record_id, userId]
    );
  } else {
    await db.query(
      `UPDATE DatasetRecords SET version = version + 1, updated_by = $2 WHERE record_id = $1`,
      [args.record_id, userId]
    );
  }

  // 3) Reemplazo total (idempotente) de selects/relations si fueron provistos
  if (args.select_values) {
    await db.query(`DELETE FROM DatasetRecordOptionValues WHERE record_id = $1`, [args.record_id]);
    for (const [field_id, val] of Object.entries(args.select_values)) {
      const arr = Array.isArray(val) ? val : [val];
      for (const option_id of arr) {
        await db.query(
          `INSERT INTO DatasetRecordOptionValues (record_id, field_id, option_id)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [args.record_id, field_id, option_id]
        );
      }
    }
  }

  if (args.relations_dynamic) {
    await db.query(`DELETE FROM DatasetRecordRelations WHERE record_id = $1`, [args.record_id]);
    for (const r of args.relations_dynamic) {
      await db.query(
        `INSERT INTO DatasetRecordRelations (record_id, field_id, target_record_id)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [args.record_id, r.field_id, r.target_record_id]
      );
    }
  }

  if (args.relations_core) {
    await db.query(`DELETE FROM DatasetRecordCoreRelations WHERE record_id = $1`, [args.record_id]);
    for (const r of args.relations_core) {
      await db.query(
        `INSERT INTO DatasetRecordCoreRelations (record_id, field_id, target_core, target_id)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [args.record_id, r.field_id, r.target_core, r.target_id]
      );
    }
  }

  const { rows } = await db.query(
    `SELECT * FROM DatasetRecords WHERE record_id = $1`,
    [args.record_id]
  );
  return rows[0] ?? null;
}

export async function softDeleteRecordDB(db: Db, record_id: string) : Promise<UUID | null> {
  const sql = `
    UPDATE DatasetRecords
    SET deleted_at = now(), updated_at = now()
    WHERE record_id = $1 AND deleted_at IS NULL
    RETURNING record_id`;
  const { rows } = await db.query(sql, [record_id]);
  return rows[0]?.record_id ?? null;
}