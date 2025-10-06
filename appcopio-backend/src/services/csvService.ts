// src/services/csvService.ts
import type { Db } from "../types/db";
import type {
  CSVUploadRequest, CSVUploadResponse, CSVModule,
  RawUserRow, RawCenterRow, RawInventoryRow, RawResidentRow, RawAssignmentRow, RawUpdateRow
} from "../types/csv";

// Reusas lo de users (ya lo tenías):
import { createUser } from "./userService";
import { createCenter, addInventoryItem } from "./centerService";
import { createPersonDB } from "./personService";
import { createOrUpdateAssignment } from "./assignmentService";
import { createUpdateRequest } from "./updateService";

// helpers comunes
const toBool = (v: any) => typeof v === "boolean" ? v : /^(1|true|si|sí)$/i.test(String(v ?? "").trim());
const toInt = (v: any) => Number.parseInt(String(v ?? ""), 10);
const toFloat = (v: any) => Number.parseFloat(String(v ?? ""));
const cleanStr = (v: any) => String(v ?? "").trim();
const normRut = (rut?: string) => rut ? cleanStr(rut).replace(/\./g, "").toUpperCase().replace(/^(.+)([0-9K])$/, "$1-$2") : null;

export async function handleCsvUpload(db: Db, body: CSVUploadRequest): Promise<CSVUploadResponse> {
  if (!body?.module || !Array.isArray(body?.data)) {
    return { success: false, message: "Payload inválido: { module, data[] } requerido" };
  }
  switch (body.module) {
    case "users":
      return importUsers(db, body.data as RawUserRow[]);
    case "centers":
      return importCenters(db, body.data as RawCenterRow[]);
    case "inventory":
      return importInventory(db, body.data as RawInventoryRow[]);
    case "residents":
      return importResidents(db, body.data as RawResidentRow[]);
    case "assignments":
      return importAssignments(db, body.data as RawAssignmentRow[]);
    case "updates":
      return importUpdates(db, body.data as RawUpdateRow[]);
    default:
      return { success: false, message: `Módulo no soportado: ${body.module}` };
  }

}

/* ========== USERS (igual al que ya te dejé, resumido) ========== */
async function importUsers(db: Db, rows: RawUserRow[]): Promise<CSVUploadResponse> {
  let created = 0, updated = 0, errors = 0; const detail: any[] = [];
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]; const n = {
        rut: normRut(r.rut), nombre: cleanStr(r.nombre), username: cleanStr(r.username),
        email: cleanStr(r.email).toLowerCase(), role_id: toInt(r.role_id),
        genero: r.genero ? cleanStr(r.genero).toUpperCase() : undefined, celular: r.celular ? cleanStr(r.celular) : undefined,
        es_apoyo_admin: toBool(r.es_apoyo_admin), is_active: toBool(r.is_active), password: r.password ? String(r.password) : ""
      };
      // validación mínima
      const errs = [];
      if (!n.rut) errs.push({ column: "rut", message: "RUT requerido" });
      if (!n.nombre) errs.push({ column: "nombre", message: "Nombre requerido" });
      if (!n.username) errs.push({ column: "username", message: "Username requerido" });
      if (!n.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email)) errs.push({ column: "email", message: "Email inválido" });
      if (!Number.isInteger(n.role_id)) errs.push({ column: "role_id", message: "role_id numérico requerido" });
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      const ex = await db.query(`SELECT user_id FROM users WHERE email=$1 OR username=$2 OR rut=$3 LIMIT 1`, [n.email, n.username, n.rut]);
      if (ex.rowCount === 0) {
        await createUser(db, {
          rut: n.rut!, username: n.username!, password: n.password || genTempPwd(),
          email: n.email!, role_id: n.role_id!, nombre: n.nombre!, genero: n.genero, celular: n.celular,
          is_active: n.is_active ?? true, es_apoyo_admin: n.es_apoyo_admin ?? false
        });
        created++;
      } else {
        await db.query(
          `UPDATE users SET rut=$1,nombre=$2,role_id=$3,genero=$4,celular=$5,is_active=$6,es_apoyo_admin=$7,
                            username=$8,email=$9,updated_at=NOW() WHERE user_id=$10`,
          [n.rut, n.nombre, n.role_id, n.genero, n.celular, n.is_active, n.es_apoyo_admin, n.username, n.email, ex.rows[0].user_id]
        );
        updated++;
      }
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return ok(rows.length, created, updated, errors, detail);
}
function genTempPwd(len = 12) { const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"; let s = ""; for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

/* ========== CENTERS ========== */
async function importCenters(db: Db, rows: RawCenterRow[]): Promise<CSVUploadResponse> {
  let created = 0, updated = 0, errors = 0; const detail: any[] = [];
  const client = db as any; // PoolClient-compatible
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const body = {
        name: cleanStr(r.name),
        address: cleanStr(r.address),
        type: cleanStr(r.type),
        capacity: Number.isFinite(+(r.capacity ?? 0)) ? toInt(r.capacity ?? 0) : 0,
        latitude: toFloat(r.latitude),
        longitude: toFloat(r.longitude),
        should_be_active: toBool(r.should_be_active),
        comunity_charge_id: r.comunity_charge_id ? toInt(r.comunity_charge_id) : null,
        municipal_manager_id: r.municipal_manager_id ? toInt(r.municipal_manager_id) : null,
        // “restOfBody” (catastro y extras): copia el resto tal cual
        public_note: r.public_note ?? null,
        operational_status: r.operational_status ?? null,
      };

      const errs = [];
      if (!body.name) errs.push({ column: "name", message: "name requerido" });
      if (!body.address) errs.push({ column: "address", message: "address requerido" });
      if (!body.type) errs.push({ column: "type", message: "type requerido" });
      if (Number.isNaN(body.latitude)) errs.push({ column: "latitude", message: "latitude requerido numérico" });
      if (Number.isNaN(body.longitude)) errs.push({ column: "longitude", message: "longitude requerido numérico" });
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      // ¿Existe? (por nombre+address o por coordenadas — ajusta tu regla si tienes unique)
      const ex = await db.query(
        `SELECT center_id FROM centers WHERE (LOWER(name)=LOWER($1) AND LOWER(address)=LOWER($2)) OR (latitude=$3 AND longitude=$4) LIMIT 1`,
        [body.name, body.address, body.latitude, body.longitude]
      );

      if (ex.rowCount === 0) {
        await createCenter(client, body);
        created++;
      } else {
        // UPDATE básico si quieres permitirlo:
        await db.query(
          `UPDATE centers SET type=$3, capacity=$4, should_be_active=$5,
                              comunity_charge_id=$6, municipal_manager_id=$7,
                              public_note=$8, operational_status=$9,
                              updated_at=NOW()
           WHERE center_id=$1`,
          [ex.rows[0].center_id, body.name, body.type, body.capacity, body.should_be_active,
          body.comunity_charge_id, body.municipal_manager_id, body.public_note, body.operational_status]
        );
        updated++;
      }
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return ok(rows.length, created, updated, errors, detail);
}

/* ========== INVENTORY ITEMS ========== */
async function importInventory(db: Db, rows: RawInventoryRow[]): Promise<CSVUploadResponse> {
  let created = 0, updated = 0, errors = 0; const detail: any[] = [];
  const client = db as any;
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const n = {
        center_id: cleanStr(r.center_id),
        itemName: cleanStr(r.item_name),
        categoryId: toInt(r.category_id),
        quantity: toFloat(r.quantity),
        unit: cleanStr(r.unit),
        notes: r.notes ? cleanStr(r.notes) : undefined,
        userId: toInt(r.user_id),
      };
      const errs = [];
      if (!n.center_id) errs.push({ column: "center_id", message: "center_id requerido" });
      if (!n.itemName) errs.push({ column: "item_name", message: "item_name requerido" });
      if (!Number.isInteger(n.categoryId)) errs.push({ column: "category_id", message: "category_id numérico" });
      if (!(Number.isFinite(n.quantity) && n.quantity > 0)) errs.push({ column: "quantity", message: "quantity > 0 requerido" });
      if (!n.unit) errs.push({ column: "unit", message: "unit requerido" });
      if (!Number.isInteger(n.userId)) errs.push({ column: "user_id", message: "user_id numérico" });
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      // addInventoryItem ya hace UPSERT por (center_id,item_id)
      await addInventoryItem(client, n.center_id, {
        itemName: n.itemName, categoryId: n.categoryId, quantity: n.quantity, unit: n.unit, notes: n.notes, userId: n.userId
      });
      // No sabemos si creó o sumó; contemos como updated si existía
      updated++; // o incrementa created si quieres separar, pero el método hace upsert
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return ok(rows.length, created, updated, errors, detail);
}

/* ========== RESIDENTS (Persons) ========== */
async function importResidents(db: Db, rows: RawResidentRow[]): Promise<CSVUploadResponse> {
  let created = 0, updated = 0, errors = 0; const detail: any[] = [];
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const p = {
        rut: normRut(r.rut)!, nombre: cleanStr(r.nombre), primer_apellido: cleanStr(r.primer_apellido),
        segundo_apellido: cleanStr(r.segundo_apellido || ""), nacionalidad: cleanStr(r.nacionalidad),
        genero: cleanStr(r.genero || ""), edad: toInt(r.edad),
        estudia: toBool(r.estudia), trabaja: toBool(r.trabaja), perdida_trabajo: toBool(r.perdida_trabajo),
        rubro: cleanStr(r.rubro || ""), discapacidad: toBool(r.discapacidad), dependencia: toBool(r.dependencia),
      };

      const errs = [];
      if (!p.rut) errs.push({ column: "rut", message: "rut requerido" });
      if (!p.nombre) errs.push({ column: "nombre", message: "nombre requerido" });
      if (!p.primer_apellido) errs.push({ column: "primer_apellido", message: "primer_apellido requerido" });
      if (!p.nacionalidad) errs.push({ column: "nacionalidad", message: "nacionalidad requerida" });
      if (!p.genero) errs.push({ column: "genero", message: "genero requerido" });
      if (!Number.isInteger(p.edad)) errs.push({ column: "edad", message: "edad numérica requerida" });
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      // ¿Existe persona? (si tu tabla Persons tiene unique por rut)
      const ex = await db.query(`SELECT person_id FROM persons WHERE rut=$1 LIMIT 1`, [p.rut]);
      if (ex.rowCount === 0) {
        await createPersonDB(db, p as any);
        created++;
      } else {
        await db.query(
          `UPDATE persons SET nombre=$2, primer_apellido=$3, segundo_apellido=$4, nacionalidad=$5, genero=$6, edad=$7,
                              estudia=$8, trabaja=$9, perdida_trabajo=$10, rubro=$11, discapacidad=$12, dependencia=$13,
                              updated_at=NOW()
           WHERE person_id=$1`,
          [ex.rows[0].person_id, p.nombre, p.primer_apellido, p.segundo_apellido, p.nacionalidad, p.genero, p.edad,
          p.estudia, p.trabaja, p.perdida_trabajo, p.rubro, p.discapacidad, p.dependencia]
        );
        updated++;
      }
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return ok(rows.length, created, updated, errors, detail);
}

/* ========== ASSIGNMENTS ========== */
async function importAssignments(db: Db, rows: RawAssignmentRow[]): Promise<CSVUploadResponse> {
  let created = 0, updated = 0, errors = 0; const detail: any[] = [];
  const client = db as any;
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const data = {
        user_id: toInt(r.user_id),
        center_id: cleanStr(r.center_id),
        normRole: cleanStr(r.role).toLowerCase(), // tu función espera normRole
        changed_by: r.changed_by ? toInt(r.changed_by) : null
      };
      const errs = [];
      if (!Number.isInteger(data.user_id)) errs.push({ column: "user_id", message: "user_id numérico requerido" });
      if (!data.center_id) errs.push({ column: "center_id", message: "center_id requerido" });
      if (!data.normRole) errs.push({ column: "role", message: "role requerido" });
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      const out = await createOrUpdateAssignment(client, data as any);
      // out.isNew dice si creó tramo nuevo
      if (out?.isNew) created++; else updated++;
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return ok(rows.length, created, updated, errors, detail);
}

/* ========== UPDATE REQUESTS ========== */
async function importUpdates(db: Db, rows: RawUpdateRow[]): Promise<CSVUploadResponse> {
  let created = 0, updated = 0, errors = 0; const detail: any[] = [];
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const data = {
        center_id: cleanStr(r.center_id),
        description: cleanStr(r.description),
        urgency: cleanStr(r.urgency).toLowerCase(), // asume 'baja|media|alta' o tu catálogo
        requested_by: toInt(r.requested_by),
      };
      const errs = [];
      if (!data.center_id) errs.push({ column: "center_id", message: "center_id requerido" });
      if (!data.description) errs.push({ column: "description", message: "description requerida" });
      if (!data.urgency) errs.push({ column: "urgency", message: "urgency requerida" });
      if (!Number.isInteger(data.requested_by)) errs.push({ column: "requested_by", message: "requested_by numérico" });
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      await createUpdateRequest(db, data as any);
      created++;
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return ok(rows.length, created, updated, errors, detail);
}

/* ---------- helper de respuesta ---------- */
function ok(total: number, created: number, updated: number, err: number, detail: any[]): CSVUploadResponse {
  return {
    success: err === 0,
    message: err ? "Importación con errores parciales" : "Importación exitosa",
    results: { totalRows: total, processedRows: total - err, createdRows: created, updatedRows: updated, errorRows: err, errors: detail }
  };
}
