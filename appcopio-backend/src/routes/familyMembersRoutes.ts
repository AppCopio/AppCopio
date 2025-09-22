// src/routes/familyMembersRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import type { FamilyMemberCreate } from "../types/family";
import type { Db } from "../types/db";

const router = Router();

// =================================================================
// 1. SECCIÓN DE UTILIDADES (Helpers & DB Functions)
// =================================================================

const normalizeRut = (v: string) => (v || "").replace(/[^0-9kK]/g, "").toUpperCase();

/**
 * Verifica si una persona ya es miembro activo de alguna familia en una activación específica.
 * @param db Conexión a la base de datos.
 * @param activation_id ID de la activación del centro.
 * @param rutRaw RUT de la persona a buscar.
 * @returns El ID de la familia y del miembro si se encuentra, o null.
 */
export async function hasActiveMembershipByRutInActivationDB(
    db: Db,
    activation_id: number,
    rutRaw: string
): Promise<{ family_id: number; member_id: number } | null> {
    const cleanRut = normalizeRut(rutRaw);
    const sql = `
        SELECT fg.family_id, fgm.member_id
        FROM Persons p
        JOIN FamilyGroupMembers fgm ON fgm.person_id = p.person_id
        JOIN FamilyGroups fg ON fg.family_id = fgm.family_id
        WHERE fg.activation_id = $1
          AND upper(regexp_replace(p.rut, '[^0-9Kk]', '', 'g')) = $2
        LIMIT 1`;
    const { rows } = await db.query(sql, [activation_id, cleanRut]);
    return rows[0] ?? null;
}

// =================================================================
// 2. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

/**
 * @controller GET /api/family-members
 * @description Obtiene una lista de los últimos 100 miembros de familias.
 */
const listFamilyMembers: RequestHandler = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT member_id, family_id, person_id, parentesco
            FROM FamilyGroupMembers
            ORDER BY member_id DESC
            LIMIT 100`);
        res.json(rows);
    } catch (e) {
        console.error("Error en listFamilyMembers:", e);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

/**
 * @controller GET /api/family-members/:id
 * @description Obtiene un miembro de familia por su ID.
 */
const getFamilyMemberById: RequestHandler = async (req, res) => {
    const memberId = parseInt(req.params.id, 10);
    if (isNaN(memberId)) {
        res.status(400).json({ error: "El ID del miembro debe ser un número válido." });
        return;
    }

    try {
        const { rows } = await pool.query(
            `SELECT member_id, family_id, person_id, parentesco
             FROM FamilyGroupMembers WHERE member_id = $1`,
            [memberId]
        );

        if (rows.length === 0) {
            res.status(404).json({ error: "Miembro de familia no encontrado." });
        } else {
            res.json(rows[0]);
        }
    } catch (e) {
        console.error(`Error en getFamilyMemberById (id: ${memberId}):`, e);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

/**
 * @controller POST /api/family-members
 * @description Crea una nueva relación de miembro de familia.
 */
const createFamilyMember: RequestHandler = async (req, res) => {
    const { family_id, person_id, parentesco }: FamilyMemberCreate = req.body;

    if (!family_id || !person_id || !parentesco) {
        res.status(400).json({ error: "Se requieren 'family_id', 'person_id' y 'parentesco'."});
        return;
    }

    try {
        const sql = `
            INSERT INTO FamilyGroupMembers (family_id, person_id, parentesco)
            VALUES ($1, $2, $3)
            RETURNING *`;
        const { rows } = await pool.query(sql, [family_id, person_id, parentesco]);
        res.status(201).json(rows[0]);
    } catch (e: any) {
        if (e?.code === "23505") { // unique_violation
            res.status(409).json({ error: "Esta persona ya es miembro de esta familia." });
        } else {
            console.error("Error en createFamilyMember:", e);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    }
};

/**
 * @controller PUT /api/family-members/:id
 * @description Actualiza la información de un miembro de familia.
 */
const updateFamilyMember: RequestHandler = async (req, res) => {
    const memberId = parseInt(req.params.id, 10);
    if (isNaN(memberId)) {
        res.status(400).json({ error: "El ID del miembro debe ser un número válido." });
        return;
    }

    const { family_id, person_id, parentesco }: FamilyMemberCreate = req.body;
    if (!family_id || !person_id || !parentesco) {
        res.status(400).json({ error: "Se requieren 'family_id', 'person_id' y 'parentesco'."});
        return;
    }

    try {
        const sql = `
            UPDATE FamilyGroupMembers
            SET family_id = $1, person_id = $2, parentesco = $3
            WHERE member_id = $4
            RETURNING *`;
        const { rows, rowCount } = await pool.query(sql, [family_id, person_id, parentesco, memberId]);

        if (rowCount === 0) {
            res.status(404).json({ error: "Miembro de familia no encontrado." });
        } else {
            res.json(rows[0]);
        }
    } catch (e: any) {
        if (e?.code === "23505") {
            res.status(409).json({ error: "Conflicto: La relación de persona y familia ya existe." });
        } else {
            console.error(`Error en updateFamilyMember (id: ${memberId}):`, e);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    }
};

// =================================================================
// 3. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get("/", listFamilyMembers);
router.post("/", createFamilyMember);
router.get("/:id", getFamilyMemberById);
router.put("/:id", updateFamilyMember);

export default router;