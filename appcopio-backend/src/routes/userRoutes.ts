// src/routes/userRoutes.ts
import { Router, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db";

const router = Router();

// ... (Aquí van TODAS las funciones para GET, POST, PUT, DELETE de usuarios)

// POST /api/users/login - La ruta que necesitamos
const loginHandler: RequestHandler = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ message: 'Se requieren usuario y contraseña.' });
        return;
    }
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = userResult.rows[0];
        if (!user) {
            res.status(401).json({ message: 'Credenciales inválidas.' });
            return;
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            res.status(401).json({ message: 'Credenciales inválidas.' });
            return;
        }
        const roleResult = await pool.query('SELECT role_name FROM roles WHERE role_id = $1', [user.role_id]);
        const assignmentsResult = await pool.query('SELECT center_id FROM UserCenterAssignments WHERE user_id = $1', [user.user_id]);
        const assignedCenters = assignmentsResult.rows.map(r => r.center_id);
        const role_name = roleResult.rows[0]?.role_name;
        const sessionUser = {
            user_id: user.user_id,
            username: user.username,
            role_name: role_name,
            es_apoyo_admin: user.es_apoyo_admin,
            assignedCenters: assignedCenters,
        };
        res.json({ token: 'un-token-jwt-simulado', user: sessionUser });
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// --- REGISTRO DE RUTAS ---
// router.get("/", getAllUsersHandler); // Asegúrate de tener todas tus rutas aquí
router.post("/login", loginHandler);

export default router;