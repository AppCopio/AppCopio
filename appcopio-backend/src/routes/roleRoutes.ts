// src/routes/roleRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
import { getAllRoles } from '../services/roleService';

const router = Router();

// =================================================================
// 1. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

/**
 * @controller GET /api/roles
 * @description Obtiene una lista de todos los roles de usuario.
 */
const listRoles: RequestHandler = async (req, res) => {
    try {
        const roles = await getAllRoles(pool);
        res.status(200).json({ roles: roles });
    } catch (e) {
        console.error("Error en listRoles:", e);
        res.status(500).json({ error: "Error interno del servidor al listar los roles." });
    }
};

// =================================================================
// 2. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get('/', listRoles);

export default router;