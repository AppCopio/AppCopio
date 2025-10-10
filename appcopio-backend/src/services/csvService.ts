// src/services/csvService.ts
import type { Db } from "../types/db";
import type {
  CSVUploadRequest, CSVUploadResponse, CSVUploadModule,
  RawUserRow, RawCenterRow, RawInventoryRow, RawResidentRow, RawAssignmentRow, RawUpdateRow
} from "../types/csv";

// Reusas lo de users (ya lo tenías):
import { createUser, getUserByName, getUserByRut, getUserByUsername } from "./userService";
import { createCenter, addInventoryItem } from "./centerService";
import { createPersonDB } from "./personService";
import { createOrUpdateAssignment } from "./assignmentService";
import { createUpdateRequest } from "./updateService";
import { getRoleByName } from "./roleService";
import { getCategoryByName, addCategory } from "./categoryService";

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
      return importInventory(db, body.data as RawInventoryRow[], body.uploadedBy);
    case "residents":
      return importResidents(db, body.data as RawResidentRow[]);
    case "assignments":
      return importAssignments(db, body.data as RawAssignmentRow[], body.uploadedBy);
    case "updates":
      return importUpdates(db, body.data as RawUpdateRow[]);
    default:
      return { success: false, message: `Módulo no soportado: ${body.module}` };
  }

}

/* ========== USERS ========== */
async function importUsers(db: Db, rows: RawUserRow[]): Promise<CSVUploadResponse> {
  let created = 0, errors = 0, skipped = 0; 
  const detail: any[] = [];
  
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]; 
      const n = {
        rut: normRut(r.rut), 
        nombre: cleanStr(r.nombre), 
        username: cleanStr(r.username),
        email: cleanStr(r.email).toLowerCase(), 
        role: cleanStr(r.role), // Cambiado de role_id a role (nombre)
        genero: r.genero ? cleanStr(r.genero).toUpperCase() : undefined, 
        celular: r.celular ? cleanStr(r.celular) : undefined,
        es_apoyo_admin: toBool(r.es_apoyo_admin), 
        is_active: toBool(r.is_active), 
        password: r.password ? String(r.password) : genTempPwd()
      };

      // Validaciones requeridas basadas en createUser
      const errs = [];
      if (!n.rut) errs.push({ column: "rut", message: "RUT requerido" });
      if (!n.nombre) errs.push({ column: "nombre", message: "Nombre requerido" });
      if (!n.username) errs.push({ column: "username", message: "Username requerido" });
      if (!n.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email)) errs.push({ column: "email", message: "Email válido requerido" });
      if (!n.role) errs.push({ column: "role", message: "Rol requerido" });

      // Buscar role_id por nombre
      let role_id: number | null = null;
      if (n.role) {
        const roleData = await getRoleByName(db, n.role);
        if (!roleData) {
          errs.push({ column: "role", message: `Rol "${n.role}" no encontrado` });
        } else {
          role_id = roleData.role_id;
        }
      }
      // Validar que password no esté vacío si se proporciona
      if (r.password !== undefined && !n.password) errs.push({ column: "password", message: "Password no puede estar vacío si se especifica" });
      
      if (errs.length) { 
        errors++; 
        errs.forEach(e => detail.push({ row: i + 2, ...e })); 
        continue; 
      }

      // Verificar si ya existe (solo CREATE, no UPDATE)
      const existing = await db.query(
        `SELECT user_id FROM users WHERE email=$1 OR username=$2 OR rut=$3 LIMIT 1`, 
        [n.email, n.username, n.rut]
      );
      
      if (existing.rowCount === 0) {
        try {
          await createUser(db, {
            rut: n.rut!,
            username: n.username!,
            password: n.password,
            email: n.email!,
            role_id: role_id!,
            nombre: n.nombre!,
            genero: n.genero,
            celular: n.celular,
            is_active: n.is_active ?? true,
            es_apoyo_admin: n.es_apoyo_admin ?? false
          });
          created++;
        } catch (createErr) {
          errors++;
          detail.push({ 
            row: i + 2, 
            column: "general", 
            message: `Error al crear usuario: ${(createErr as Error).message}` 
          });
        }
      } else {
        skipped++;
        detail.push({ 
          row: i + 2, 
          column: "general", 
          message: "Usuario ya existe (RUT, email o username duplicado)" 
        });
      }
    }
    await db.query("COMMIT");
  } catch (e) { 
    await db.query("ROLLBACK"); 
    throw e; 
  }
  
  return createResponse(rows.length, created, 0, errors, skipped, detail);
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
      // Buscar IDs de usuarios por username si se proporcionan
      let comunity_charge_id: number | null = null;
      let municipal_manager_id: number | null = null;
      
      if (r.comunity_charge_username) {
        const comUser = await getUserByUsername(db, cleanStr(r.comunity_charge_username));
        if (comUser) {
          comunity_charge_id = comUser.user_id;
        }
      }
      
      if (r.municipal_manager_username) {
        const munUser = await getUserByUsername(db, cleanStr(r.municipal_manager_username));
        if (munUser) {
          municipal_manager_id = munUser.user_id;
        }
      }

      const body = {
        name: cleanStr(r.name),
        address: cleanStr(r.address),
        type: cleanStr(r.type),
        capacity: Number.isFinite(+(r.capacity ?? 0)) ? toInt(r.capacity ?? 0) : 0,
        latitude: toFloat(r.latitude),
        longitude: toFloat(r.longitude),
        should_be_active: toBool(r.should_be_active),
        comunity_charge_id,
        municipal_manager_id,
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
        try {
          await createCenter(client, body);
          created++;
        } catch (createErr) {
          errors++;
          detail.push({ 
            row: i + 2, 
            column: "general", 
            message: `Error al crear centro: ${(createErr as Error).message}` 
          });
        }
      } else {
        // Solo CREATE, no UPDATE - registrar como duplicado
        detail.push({ 
          row: i + 2, 
          column: "general", 
          message: "Centro ya existe (mismo nombre+dirección o coordenadas)" 
        });
      }
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return createResponse(rows.length, created, 0, errors, 0, detail);
}

/* ========== INVENTORY ITEMS ========== */
async function importInventory(db: Db, rows: RawInventoryRow[], uploadedBy?: { user_id: number; username: string }): Promise<CSVUploadResponse> {
  let created = 0, updated = 0, errors = 0; const detail: any[] = [];
  const client = db as any;
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      
      // Buscar category_id por nombre, crear si no existe
      let categoryId: number | null = null;
      if (r.category) {
        const categoryName = cleanStr(r.category);
        let categoryData = await getCategoryByName(db, categoryName);
        
        if (!categoryData) {
          // Crear la categoría si no existe
          try {
            categoryData = await addCategory(db, categoryName);
            detail.push({ 
              row: i + 2, 
              column: "category", 
              message: `Categoría "${categoryName}" creada automáticamente` 
            });
          } catch (createCategoryErr) {
            errors++;
            detail.push({ 
              row: i + 2, 
              column: "category", 
              message: `Error al crear categoría "${categoryName}": ${(createCategoryErr as Error).message}` 
            });
            continue;
          }
        }
        categoryId = categoryData.category_id;
      }
      
      // Buscar user_id por updated_by o usar el usuario que sube el archivo
      let userId: number | null = null;
      if (r.updated_by) {
        // Si se especifica updated_by, buscar ese usuario
        const userData = await getUserByUsername(db, cleanStr(r.updated_by));
        if (!userData) {
          errors++;
          detail.push({ 
            row: i + 2, 
            column: "updated_by", 
            message: `Usuario con username "${r.updated_by}" no encontrado` 
          });
          continue;
        }
        userId = userData.user_id;
      } else if (uploadedBy) {
        // Si no se especifica updated_by, usar el usuario que sube el archivo
        userId = uploadedBy.user_id;
      }

      const n = {
        center_id: cleanStr(r.center_id),
        itemName: cleanStr(r.item_name),
        categoryId,
        quantity: toFloat(r.quantity),
        unit: cleanStr(r.unit),
        notes: r.notes ? cleanStr(r.notes) : undefined,
        userId,
      };
      
      const errs = [];
      if (!n.center_id) errs.push({ column: "center_id", message: "center_id requerido" });
      if (!n.itemName) errs.push({ column: "item_name", message: "item_name requerido" });
      if (!n.categoryId) errs.push({ column: "category", message: "category requerida" });
      if (!(Number.isFinite(n.quantity) && n.quantity > 0)) errs.push({ column: "quantity", message: "quantity > 0 requerido" });
      if (!n.unit) errs.push({ column: "unit", message: "unit requerido" });
      if (!n.userId) errs.push({ column: "updated_by", message: "updated_by requerido o usuario de sesión no disponible" });
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      // addInventoryItem hace UPSERT - necesitamos crear solo si no existe
      try {
        await addInventoryItem(client, n.center_id, {
          itemName: n.itemName, 
          categoryId: n.categoryId!, 
          quantity: n.quantity, 
          unit: n.unit, 
          notes: n.notes, 
          userId: n.userId!
        });
        created++; // Consideramos como creado ya que addInventoryItem maneja la lógica
      } catch (createErr) {
        errors++;
        detail.push({ 
          row: i + 2, 
          column: "general", 
          message: `Error al agregar item al inventario: ${(createErr as Error).message}` 
        });
      }
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return createResponse(rows.length, created, 0, errors, 0, detail);
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
      if (!p.rut) errs.push({ column: "rut", message: "RUT requerido" });
      if (!p.nombre) errs.push({ column: "nombre", message: "Nombre requerido" });
      if (!p.primer_apellido) errs.push({ column: "primer_apellido", message: "Primer apellido requerido" });
      if (!p.nacionalidad) errs.push({ column: "nacionalidad", message: "Nacionalidad requerida" });
      if (!p.genero) errs.push({ column: "genero", message: "Género requerido" });
      if (!Number.isInteger(p.edad) || p.edad <= 0) errs.push({ column: "edad", message: "Edad numérica positiva requerida" });
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      // Verificar si ya existe (solo CREATE, no UPDATE)
      const existing = await db.query(`SELECT person_id FROM persons WHERE rut=$1 LIMIT 1`, [p.rut]);
      if (existing.rowCount === 0) {
        try {
          await createPersonDB(db, p as any);
          created++;
        } catch (createErr) {
          errors++;
          detail.push({ 
            row: i + 2, 
            column: "general", 
            message: `Error al crear persona: ${(createErr as Error).message}` 
          });
        }
      } else {
        // Solo CREATE, no UPDATE - registrar como duplicado
        detail.push({ 
          row: i + 2, 
          column: "rut", 
          message: "Persona ya existe con este RUT" 
        });
      }
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return createResponse(rows.length, created, 0, errors, 0, detail);
}

/* ========== ASSIGNMENTS ========== */
async function importAssignments(db: Db, rows: RawAssignmentRow[], uploadedBy?: { user_id: number; username: string }): Promise<CSVUploadResponse> {
  let created = 0, updated = 0, errors = 0; const detail: any[] = [];
  const client = db as any;
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      
      // Buscar user_id por username
      let user_id: number | null = null;
      if (r.username) {
        const userData = await getUserByUsername(db, cleanStr(r.username));
        if (!userData) {
          errors++;
          detail.push({ 
            row: i + 2, 
            column: "username", 
            message: `Usuario con username "${r.username}" no encontrado` 
          });
          continue;
        }
        user_id = userData.user_id;
      }
      
      // Buscar changed_by por username o usar el usuario que sube el archivo
      let changed_by: number | null = null;
      if (r.changed_by_username) {
        // Si se especifica changed_by_username, buscar ese usuario
        const changedByUser = await getUserByUsername(db, cleanStr(r.changed_by_username));
        if (!changedByUser) {
          errors++;
          detail.push({ 
            row: i + 2, 
            column: "changed_by_username", 
            message: `Usuario changed_by con username "${r.changed_by_username}" no encontrado` 
          });
          continue;
        }
        changed_by = changedByUser.user_id;
      } else if (uploadedBy) {
        // Si no se especifica changed_by_username, usar el usuario que sube el archivo
        changed_by = uploadedBy.user_id;
      }

      const data = {
        user_id,
        center_id: cleanStr(r.center_id),
        normRole: cleanStr(r.role).toLowerCase(), // tu función espera normRole
        changed_by
      };
      
      const errs = [];
      if (!data.user_id) errs.push({ column: "username", message: "username requerido" });
      if (!data.center_id) errs.push({ column: "center_id", message: "ID de centro requerido" });
      if (!data.normRole) errs.push({ column: "role", message: "Rol requerido" });
      // Validar roles permitidos
      const validRoles = ['trabajador municipal', 'contacto ciudadano'];
      if (data.normRole && !validRoles.includes(data.normRole)) {
        errs.push({ column: "role", message: `Rol debe ser uno de: ${validRoles.join(', ')}` });
      }
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      try {
        const out = await createOrUpdateAssignment(client, data as any);
        // out.isNew dice si creó tramo nuevo o reasignó
        if (out?.isNew) {
          created++;
        } else {
          // Si no es nuevo, significa que el usuario ya estaba asignado a ese centro con ese rol
          updated++; // Contamos como actualizado aunque no hubo cambio real
          detail.push({ 
            row: i + 2, 
            column: "general", 
            message: `Usuario "${data.user_id}" ya estaba asignado como "${data.normRole}" en centro "${data.center_id}"` 
          });
        }
      } catch (createErr) {
        errors++;
        detail.push({ 
          row: i + 2, 
          column: "general", 
          message: `Error al crear asignación: ${(createErr as Error).message}` 
        });
      }
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return createResponse(rows.length, created, updated, errors, 0, detail);
}

/* ========== UPDATE REQUESTS ========== */
async function importUpdates(db: Db, rows: RawUpdateRow[]): Promise<CSVUploadResponse> {
  let created = 0, updated = 0, errors = 0; const detail: any[] = [];
  await db.query("BEGIN");
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      
      // Buscar requested_by por username
      let requested_by: number | null = null;
      if (r.requested_by_username) {
        const userData = await getUserByUsername(db, cleanStr(r.requested_by_username));
        if (!userData) {
          errors++;
          detail.push({ 
            row: i + 2, 
            column: "requested_by_username", 
            message: `Usuario solicitante con username "${r.requested_by_username}" no encontrado` 
          });
          continue;
        }
        requested_by = userData.user_id;
      }

      const data = {
        center_id: cleanStr(r.center_id),
        description: cleanStr(r.description),
        urgency: cleanStr(r.urgency).toLowerCase(), // asume 'baja|media|alta' o tu catálogo
        requested_by,
      };
      
      const errs = [];
      if (!data.center_id) errs.push({ column: "center_id", message: "ID de centro requerido" });
      if (!data.description) errs.push({ column: "description", message: "Descripción requerida" });
      if (!data.urgency) errs.push({ column: "urgency", message: "Nivel de urgencia requerido" });
      if (!data.requested_by) errs.push({ column: "requested_by_username", message: "requested_by_username requerido" });
      // Validar niveles de urgencia permitidos
      const validUrgencies = ['baja', 'media', 'alta'];
      if (data.urgency && !validUrgencies.includes(data.urgency)) {
        errs.push({ column: "urgency", message: `Urgencia debe ser una de: ${validUrgencies.join(', ')}` });
      }
      if (errs.length) { errors++; errs.forEach(e => detail.push({ row: i + 2, ...e })); continue; }

      try {
        await createUpdateRequest(db, data as any);
        created++;
      } catch (createErr) {
        errors++;
        detail.push({ 
          row: i + 2, 
          column: "general", 
          message: `Error al crear solicitud de actualización: ${(createErr as Error).message}` 
        });
      }
    }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
  return createResponse(rows.length, created, 0, errors, 0, detail);
}

/* ---------- helper de respuesta ---------- */
function createResponse(
  total: number, 
  created: number, 
  updated: number, 
  errors: number, 
  skipped: number, 
  detail: any[]
): CSVUploadResponse {
  const processedRows = total - errors;
  const hasErrors = errors > 0;
  
  let message = "Importación exitosa";
  if (hasErrors && processedRows > 0) {
    message = "Importación con errores parciales";
  } else if (hasErrors) {
    message = "Importación fallida";
  } else if (skipped > 0) {
    message = `Importación exitosa (${skipped} registros omitidos por duplicados)`;
  }

  return {
    success: !hasErrors,
    message,
    results: {
      totalRows: total,
      processedRows,
      createdRows: created,
      updatedRows: updated,
      errorRows: errors,
      errors: detail
    }
  };
}
