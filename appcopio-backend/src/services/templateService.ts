import type { Template, TemplateField } from "../types/dataset";
import type { Db } from "../types/db";

export async function listTemplatesDB(db: Db) : Promise<Template[]> {
  const { rows } = await db.query(
    `SELECT template_id, name, description, is_public, created_by, created_at, updated_at
     FROM Templates
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function getTemplateDB(db: Db, template_id: string) : Promise<Template | null> {
  const { rows } = await db.query(
    `SELECT template_id, name, description, is_public, created_by, created_at, updated_at
     FROM Templates WHERE template_id = $1`,
    [template_id]
  );
  return rows[0] ?? null;
}

export async function createTemplateDB(db: Db, args: { name: string; description: string | null; is_public: boolean; }) : Promise<Template> {
  const { rows } = await db.query(
    `INSERT INTO Templates (name, description, is_public)
     VALUES ($1,$2,$3)
     RETURNING template_id, name, description, is_public, created_at`,
    [args.name, args.description, args.is_public]
  );
  return rows[0];
}

export async function updateTemplateDB(db: Db, template_id: string, payload: any) : Promise<Template | null> {
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  for (const k of ["name","description","is_public"]) {
    if (payload[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(payload[k]); }
  }
  if (sets.length === 0) return await getTemplateDB(db, template_id);

  const sql = `
    UPDATE Templates SET ${sets.join(", ")}, updated_at = now()
    WHERE template_id = $${i}
    RETURNING template_id, name, description, is_public, created_at, updated_at`;
  vals.push(template_id);

  const { rows } = await db.query(sql, vals);
  return rows[0] ?? null;
}

export async function listTemplateFieldsDB(db: Db, template_id: string) : Promise<TemplateField[]> {
  const { rows } = await db.query(
    `SELECT template_field_id, template_id, name, key, field_type, is_required, is_multi, position,
            settings, relation_target_kind, relation_target_template_id, relation_target_core,
            created_at, updated_at
     FROM TemplateFields
     WHERE template_id = $1
     ORDER BY position ASC, created_at ASC`,
    [template_id]
  );
  return rows;
}

export async function createTemplateFieldDB(db: Db, args: any) : Promise<TemplateField> {
  const { rows } = await db.query(
    `INSERT INTO TemplateFields
     (template_id, name, key, field_type, is_required, is_multi, position, settings,
      relation_target_kind, relation_target_template_id, relation_target_core)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
     RETURNING *`,
    [
      args.template_id, args.name, args.key, args.field_type,
      !!args.is_required, !!args.is_multi, Number(args.position ?? 0), JSON.stringify(args.settings ?? {}),
      args.relation_target_kind ?? null, args.relation_target_template_id ?? null, args.relation_target_core ?? null
    ]
  );
  return rows[0];
}

export async function updateTemplateFieldDB(db: Db, template_field_id: string, payload: any) : Promise<TemplateField | null> {
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  for (const k of ["name","key","field_type","is_required","is_multi","position","relation_target_kind","relation_target_template_id","relation_target_core"]) {
    if (payload[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(payload[k]); }
  }
  if (payload.settings !== undefined) { sets.push(`settings = $${i++}::jsonb`); vals.push(JSON.stringify(payload.settings ?? {})); }

  if (sets.length === 0) {
    const { rows } = await db.query(`SELECT * FROM TemplateFields WHERE template_field_id = $1`, [template_field_id]);
    return rows[0] ?? null;
  }

  const sql = `
    UPDATE TemplateFields
    SET ${sets.join(", ")}
    WHERE template_field_id = $${i}
    RETURNING *`;
  vals.push(template_field_id);

  const { rows } = await db.query(sql, vals);
  return rows[0] ?? null;
}

export async function deleteTemplateFieldDB(db: Db, template_field_id: string) : Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM TemplateFields WHERE template_field_id = $1`,
    [template_field_id]
  );
  return rowCount > 0;
}
