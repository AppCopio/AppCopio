import type { Db } from "../types/db";
import type { AuditLog } from "../types/dataset";

export async function listAuditLogDB(db: Db, args: {
  activation_id?: number | null;
  entity_type?: string | null;
  entity_id?: string | null;
}): Promise<AuditLog[]> {
  const where: string[] = [];
  const vals: any[] = [];
  let i = 1;

  if (args.activation_id != null) { where.push(`activation_id = $${i++}`); vals.push(args.activation_id); }
  if (args.entity_type)           { where.push(`entity_type = $${i++}`);   vals.push(args.entity_type);   }
  if (args.entity_id)             { where.push(`entity_id = $${i++}::uuid`); vals.push(args.entity_id);   }

  const sql = `
    SELECT audit_id, activation_id, actor_user_id, action, entity_type, entity_id, at, before, after
    FROM AuditLog
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY at DESC`;

  const { rows } = await db.query(sql, vals);
  return rows;
}

/**
 * Lista TODOS los eventos de auditoría asociados a UN dataset (dataset_id),
 * sin paginación ni filtros de fecha.
 */
export async function listAuditLogByDatasetDB(db: Db, args: { dataset_id: string }) : Promise<AuditLog[]>{
  const sql = `
    WITH unioned AS (
      -- 1) Cambios al propio dataset
      SELECT al.audit_id, al.activation_id, al.actor_user_id, al.action,
             al.entity_type, al.entity_id, al.at, al.before, al.after
      FROM AuditLog al
      WHERE al.entity_type = 'datasets'
        AND al.entity_id   = $1::uuid

      UNION ALL

      -- 2) Cambios a campos del dataset
      SELECT al.audit_id, al.activation_id, al.actor_user_id, al.action,
             al.entity_type, al.entity_id, al.at, al.before, al.after
      FROM AuditLog al
      JOIN DatasetFields df
        ON al.entity_type = 'dataset_fields'
       AND al.entity_id   = df.field_id
      WHERE df.dataset_id = $1::uuid

      UNION ALL

      -- 3) Cambios a registros del dataset
      SELECT al.audit_id, al.activation_id, al.actor_user_id, al.action,
             al.entity_type, al.entity_id, al.at, al.before, al.after
      FROM AuditLog al
      JOIN DatasetRecords dr
        ON al.entity_type = 'dataset_records'
       AND al.entity_id   = dr.record_id
      WHERE dr.dataset_id = $1::uuid

      UNION ALL

      -- 4) Cambios a opciones de campos del dataset
      SELECT al.audit_id, al.activation_id, al.actor_user_id, al.action,
             al.entity_type, al.entity_id, al.at, al.before, al.after
      FROM AuditLog al
      JOIN DatasetFieldOptions dfo
        ON al.entity_type = 'dataset_field_options'
       AND al.entity_id   = dfo.option_id
      JOIN DatasetFields df
        ON df.field_id = dfo.field_id
      WHERE df.dataset_id = $1::uuid
    )
    SELECT *
    FROM unioned
    ORDER BY at DESC;`;
  const { rows } = await db.query(sql, [args.dataset_id]);
  return rows;
}
