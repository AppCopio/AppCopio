// src/services/csvService.ts
import type { Db } from "../types/db";
import type {
    CSVUploadRequest, CSVUploadResponse, CSVModule, RawUserRow
} from "../types/csv";
import { createUser } from "./userService";
import bcrypt from "bcryptjs";

// ============== API PÚBLICA (usada por la route) ==============
export async function handleCsvUpload(db: Db, body: CSVUploadRequest): Promise<CSVUploadResponse> {
    if (!body?.module || !Array.isArray(body?.data)) {
        return { success: false, message: "Payload inválido: { module, data[] } requerido" };
    }
    switch (body.module) {
        case "users":
            return importUsers(db, body.data as RawUserRow[]);
        default:
            return { success: false, message: `Módulo no soportado: ${body.module}` };
    }
}

// ============== Implementación módulo: users ===================

function toBool(v: any): boolean {
    if (typeof v === "boolean") return v;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "si" || s === "sí";
}

function toIntOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isInteger(n) ? n : null;
}

function cleanRut(rut?: string): string | null {
    if (!rut) return null;
    let r = rut.replace(/\./g, "").replace(/\s+/g, "").toUpperCase();
    if (!r.includes("-") && r.length >= 2) r = `${r.slice(0, -1)}-${r.slice(-1)}`;
    return r;
}

function normalizeGenero(g?: string): "M" | "F" | "X" | null {
    if (!g) return null;
    const s = g.toString().trim().toUpperCase();
    return (["M", "F", "X"] as const).includes(s as any) ? (s as any) : null;
}

function normalizeUserRow(r: RawUserRow) {
    const rut = cleanRut(r.rut);
    const nombre = (r.nombre ?? "").toString().trim();
    const username = (r.username ?? "").toString().trim();
    const email = (r.email ?? "").toString().trim().toLowerCase();
    const role_id = toIntOrNull(r.role_id);
    const genero = normalizeGenero(r.genero);
    const celular = r.celular ? r.celular.toString().trim() : null;
    const es_apoyo_admin = toBool(r.es_apoyo_admin);
    const is_active = toBool(r.is_active);
    const password = (r.password ?? "").toString();
    return { rut, nombre, username, email, role_id, genero, celular, es_apoyo_admin, is_active, password };
}

function validateUserRow(n: ReturnType<typeof normalizeUserRow>) {
    const errors: Array<{ column?: string; message: string }> = [];
    if (!n.rut) errors.push({ column: "rut", message: "RUT requerido" });
    if (!n.nombre) errors.push({ column: "nombre", message: "Nombre requerido" });
    if (!n.username) errors.push({ column: "username", message: "Username requerido" });
    if (!n.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email))
        errors.push({ column: "email", message: "Email inválido" });
    if (!Number.isInteger(n.role_id))
        errors.push({ column: "role_id", message: "role_id numérico requerido" });
    return errors;
}



/** Inserta con createUser si no existe; si existe, UPDATE parcial sin tocar password_hash */
async function importUsers(db: Db, rows: RawUserRow[]): Promise<CSVUploadResponse> {
    let created = 0, updated = 0, errorRows = 0;
    const errors: Array<{ row: number; message: string; column?: string }> = [];

    await db.query("BEGIN");
    try {
        for (let i = 0; i < rows.length; i++) {
            const raw = rows[i];
            const norm = normalizeUserRow(raw);
            const rowNum = i + 2;

            const rowErrors = validateUserRow(norm);
            if (rowErrors.length) {
                errorRows++;
                rowErrors.forEach(e => errors.push({ row: rowNum, ...e }));
                continue;
            }
            let password = norm.password || '12345'
            const hash = await bcrypt.hash(password, 10);
            
            try {
                await createUser(db, {
                    rut: norm.rut!,
                    username: norm.username!,
                    password: hash, 
                    email: norm.email!,
                    role_id: norm.role_id!,     
                    nombre: norm.nombre!,
                    genero: norm.genero ?? undefined,
                    celular: norm.celular ?? undefined,
                    is_active: norm.is_active ?? true,
                    es_apoyo_admin: norm.es_apoyo_admin ?? false
                });
                created++;
            } catch (e: any) {
                errorRows++;
                errors.push({ row: rowNum, message: e?.detail || e?.message || "Error al crear usuario" });
            }
        }

        await db.query("COMMIT");
    } catch (e) {
        await db.query("ROLLBACK");
        throw e;
    }

    return {
        success: errors.length === 0,
        message: errors.length ? "Importación con errores parciales" : "Importación exitosa",
        results: {
            totalRows: rows.length,
            processedRows: rows.length - errorRows,
            createdRows: created,
            updatedRows: updated,
            errorRows,
            errors
        }
    };
}
