import type { Db } from "../types/db";
import type { Dataset, DatasetInfo, DatasetField, DatasetRecord, CellValue, UUID } from "../types/dataset";

export async function listDatasetsDB(db: Db,  activation_id: number) : Promise<Dataset[]> {
  const sql = `
    SELECT dataset_id, activation_id, center_id, name, key, config, config->>'template_key' AS template_key, schema_snapshot,
           created_by, updated_by, created_at, updated_at, deleted_at
    FROM Datasets
    WHERE activation_id = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC`;
  const { rows } = await db.query(sql, [ activation_id ]);
  return rows;
}

export async function getDatasetByIdDB(db: Db, dataset_id: string) : Promise<Dataset | null> {
  const sql = `
    SELECT dataset_id, activation_id, center_id, name, key, config, config->>'template_key' AS template_key,  schema_snapshot,
           created_by, updated_by, created_at, updated_at, deleted_at
    FROM Datasets
    WHERE dataset_id = $1`;
  const { rows } = await db.query(sql, [dataset_id]);
  return rows[0] ?? null;
}

export async function createDatasetDB(db: Db, userId: number, args: {
  activation_id: number; center_id: string; name: string; key: string; config?: any;
}) : Promise<Dataset>{
  const sql = `
    INSERT INTO Datasets (activation_id, center_id, name, key, config, created_by)
    VALUES ($1, $2, $3, $4, COALESCE($5, '{}'::jsonb), $6)
    RETURNING dataset_id, activation_id, center_id, name, key, config,config->>'template_key' AS template_key, created_at`;
  const { rows } = await db.query(sql, [
    args.activation_id, args.center_id, args.name, args.key, args.config ?? {}, userId
  ]);
  return rows[0];
}

export async function updateDatasetDB(db: Db, userId: number, dataset_id: string, 
  args: { name?: string; config?: any; deleted_at?: string | null; }) : Promise<Dataset | null> {
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;

  if (args.name !== undefined) { sets.push(`name = $${i++}`); vals.push(args.name); }
  if (args.config !== undefined) { sets.push(`config = $${i++}::jsonb`); vals.push(JSON.stringify(args.config ?? {})); }
  if (args.deleted_at !== undefined) { sets.push(`deleted_at = $${i++}`); vals.push(args.deleted_at); }
  sets.push(`updated_by = $${i++}`);
  vals.push(userId);
  sets.push(`updated_at = now()`);

  if (sets.length === 0) {
    return await getDatasetByIdDB(db, dataset_id); 
  }
  const sql = `
    UPDATE Datasets
    SET ${sets.join(", ")}
    WHERE dataset_id = $${i}
    RETURNING dataset_id, activation_id, center_id, name, key, config, schema_snapshot,
              created_by, updated_by, created_at, updated_at, deleted_at`;
  vals.push(dataset_id);

  const { rows } = await db.query(sql, vals);
  return rows[0] ?? null;
}

export async function softDeleteDatasetDB(db: Db, dataset_id: string) : Promise<UUID> {
  const sql = `
    UPDATE Datasets
    SET deleted_at = now(), updated_at = now()
    WHERE dataset_id = $1 AND deleted_at IS NULL
    RETURNING dataset_id`;
  const { rows } = await db.query(sql, [dataset_id]);
  return (rows[0]?.dataset_id ?? null) as UUID;
}

// TO DO: service que tome el id de un dataset y traiga todos sus registros!
/**
 * Devuelve metadatos del dataset, columnas actuales y todos los registros,
 * agregando una vista "cells" que respeta el orden de columnas.
 */
export async function getDatasetSnapshot(db: Db, datasetId: string): Promise<DatasetInfo | null> {
  // 1) Dataset
  let dataset: any | undefined;
  try {
    const dsq = await db.query(
      `SELECT dataset_id, activation_id, center_id, name, key, config, schema_snapshot,
              created_by, updated_by, created_at, updated_at, deleted_at
       FROM Datasets
       WHERE dataset_id = $1 AND deleted_at IS NULL`,
      [datasetId]
    );
    dataset = dsq.rows[0];
  } catch {
    throw new Error("SQL_DATASET_FAILED");
  }
  if (!dataset) return null; // route hará 404

  // 2) Columnas actuales (orden y metadata)
  let columns: DatasetField[] = [];
  try {
    const colq = await db.query(
      `SELECT field_id, dataset_id, name, key, type, required, unique_field, config,
              position, is_active, is_multi, relation_target_kind, relation_target_dataset_id,
              relation_target_core, created_at, updated_at, deleted_at
       FROM DatasetFields
       WHERE dataset_id = $1 AND is_active = TRUE AND deleted_at IS NULL
       ORDER BY position ASC, created_at ASC`,
      [datasetId]
    );
    columns = colq.rows as unknown as DatasetField[];
  } catch {
    throw new Error("SQL_FIELDS_FAILED");
  }

  // 3) Registros "vivos"
  let records: DatasetRecord[] = [];
  try {
    const recq = await db.query(
      `SELECT record_id, dataset_id, activation_id, version, data,
              created_by, updated_by, created_at, updated_at, deleted_at
       FROM DatasetRecords
       WHERE dataset_id = $1 AND deleted_at IS NULL
       ORDER BY updated_at DESC NULLS LAST, created_at DESC`,
      [datasetId]
    );
    records = recq.rows as unknown as DatasetRecord[];
  } catch {
    throw new Error("SQL_RECORDS_FAILED");
  }

  const recordIds = records.map((r) => r.record_id);
  const hasRecords = recordIds.length > 0;

  type OptAgg = { record_id: string; field_id: string; options: any[] };
  type DynRelAgg = { record_id: string; field_id: string; targets: string[] };
  type CoreRelAgg = { record_id: string; field_id: string; targets: { target_core: string; target_id: number }[] };

  let optAgg: OptAgg[] = [];
  let dynAgg: DynRelAgg[] = [];
  let coreAgg: CoreRelAgg[] = [];

  // 4) Agregados auxiliares (solo si hay registros)
  if (hasRecords) {
    try {
      const optq = await db.query(
        `SELECT v.record_id, v.field_id,
                json_agg(json_build_object(
                  'option_id', o.option_id,
                  'value', o.value,
                  'label', o.label,
                  'color', o.color,
                  'position', o.position
                ) ORDER BY o.position ASC) AS options
         FROM DatasetRecordOptionValues v
         JOIN DatasetFieldOptions o ON o.option_id = v.option_id
         WHERE v.record_id = ANY($1)
         GROUP BY v.record_id, v.field_id`,
        [recordIds]
      );
      optAgg = optq.rows as OptAgg[];
    } catch {
      throw new Error("SQL_OPTIONS_FAILED");
    }

    try {
      const dynq = await db.query(
        `SELECT record_id, field_id, json_agg(target_record_id) AS targets
         FROM DatasetRecordRelations
         WHERE record_id = ANY($1)
         GROUP BY record_id, field_id`,
        [recordIds]
      );
      dynAgg = dynq.rows as DynRelAgg[];
    } catch {
      throw new Error("SQL_REL_DYNAMIC_FAILED");
    }

    try {
      const coreq = await db.query(
        `SELECT record_id, field_id,
                json_agg(json_build_object('target_core', target_core, 'target_id', target_id)) AS targets
         FROM DatasetRecordCoreRelations
         WHERE record_id = ANY($1)
         GROUP BY record_id, field_id`,
        [recordIds]
      );
      coreAgg = coreq.rows as CoreRelAgg[];
    } catch {
      throw new Error("SQL_REL_CORE_FAILED");
    }
  }

  // 5) Indexar agregados
  const optMap = new Map<string, any[]>();
  for (const r of optAgg) optMap.set(`${r.record_id}|${r.field_id}`, r.options ?? []);

  const dynMap = new Map<string, string[]>();
  for (const r of dynAgg) dynMap.set(`${r.record_id}|${r.field_id}`, r.targets ?? []);

  const coreMap = new Map<string, any[]>();
  for (const r of coreAgg) coreMap.set(`${r.record_id}|${r.field_id}`, r.targets ?? []);

  // 6) Construir celdas por registro
  const columnKeys = columns.map((c) => c.key);
  const columnIds = columns.map((c) => c.field_id);

  let enrichedRecords: (DatasetRecord & { cells: CellValue[] })[];
  try {
    enrichedRecords = records.map((rec) => {
      const cells: CellValue[] = columns.map((col) => {
        if (col.type === "text" || col.type === "number" || col.type === "bool"
         || col.type === "date" || col.type === "time" || col.type === "datetime") {
          return (rec.data as any)?.[col.key] ?? null;
        }
        if (col.type === "select" || col.type === "multi_select") {
          return optMap.get(`${rec.record_id}|${col.field_id}`) ?? [];
        }
        if (col.type === "relation") {
          if (col.relation_target_kind === "dynamic") {
            return dynMap.get(`${rec.record_id}|${col.field_id}`) ?? [];
          }
          if (col.relation_target_kind === "core") {
            return coreMap.get(`${rec.record_id}|${col.field_id}`) ?? [];
          }
        }
        return null;
      });
      return { ...rec, cells };
    });
  } catch {
    throw new Error("BUILD_CELLS_FAILED");
  }

  const rows_matrix = enrichedRecords.map((r) => r.cells);

  return {
    dataset,
    columns,
    column_keys: columnKeys,
    column_ids: columnIds,
    records: enrichedRecords,
    rows_matrix,
    total_records: records.length,
  };
}