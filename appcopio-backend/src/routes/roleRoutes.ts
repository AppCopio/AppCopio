import { Router, RequestHandler } from 'express';
import pool from '../config/db';

const router = Router();

const getRolesHandler: RequestHandler = async (req, res) => {
    try {
        const rs = await pool.query(
        "SELECT role_id, role_name FROM roles ORDER BY role_name ASC"
        );
        res.json({ roles: rs.rows });
    } catch (e) {
        //console.error("GET /users/roles error:", e);
        res.status(500).json({ error: "Error al listar roles" });
    }
};

router.get('/', getRolesHandler);

export default router;