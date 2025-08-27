// src/routes/assignmentRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";

const router = Router();

/**
 * @route   POST /api/assignments
 * @desc    Asigna un centro a un usuario (Trabajador Municipal).
 * @access  Private (Admin)
 * @body    { "user_id": number, "center_id": "string" }
 */
const addAssignmentHandler: RequestHandler = async (req, res) => {
    const { user_id, center_id, role } = req.body;

    if (!user_id || !center_id || !role) {
        res.status(400).json({ error: "Se requieren user_id, center_id y role." });
        return;
    }
    

    try {
        const newAssignment = await pool.query(
            `
            INSERT INTO centerassignments (user_id, center_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, center_id, role)
            DO NOTHING
            RETURNING *;
            `,
            [user_id, center_id, role]
        );
        res.status(201).json(newAssignment.rows[0]);
    } catch (e: any) {
        // Código '23505' es para violación de llave primaria (la asignación ya existe)
        if (e?.code === "23505") {
            res.status(409).json({ error: "Este centro ya está asignado a este usuario." });
            return;
        }
        // Código '23503' es para violación de llave foránea (el usuario o el centro no existen)
        if (e?.code === "23503") {
            res.status(404).json({ error: "El usuario o el centro especificado no existen." });
            return;
        }
        console.error("POST /assignments error:", e);
        res.status(500).json({ error: "Error al crear la asignación." });
    }
};

/**
 * @route   DELETE /api/assignments
 * @desc    Desasigna un centro de un usuario.
 * @access  Private (Admin)
 * @body    { "user_id": number, "center_id": "string" }
 */
const removeAssignmentHandler: RequestHandler = async (req, res) => {
    const { user_id, center_id } = req.body;

    if (!user_id || !center_id) {
        res.status(400).json({ error: "Se requieren user_id y center_id." });
        return;
    }

    try {
        const deleteOp = await pool.query(
            `DELETE FROM centerassignments 
             WHERE user_id = $1 AND center_id = $2`,
            [user_id, center_id]
        );

        if (deleteOp.rowCount === 0) {
            res.status(404).json({ error: "No se encontró la asignación para eliminar." });
            return;
        }

        res.status(204).send(); // Éxito, sin contenido
    } catch (e) {
        console.error("DELETE /assignments error:", e);
        res.status(500).json({ error: "Error al eliminar la asignación." });
    }
};


// Registro de rutas
router.post("/", addAssignmentHandler);
router.delete("/", removeAssignmentHandler);

export default router;