// src/routes/userRoutes.ts
import { Router, RequestHandler } from "express";
import pool from "../config/db";
import { getUsers, getUserWithAssignments, createUser, updateUserById, deleteUserById, getActiveUsersByRole } from '../services/userService';
import { UserCreate, UserUpdate } from "../services/userService";

const router = Router();

// =================================================================
// 1. SECCIÓN DE CONTROLADORES (Logic Handlers)
// =================================================================

const listUsers: RequestHandler = async (req, res) => {
    try {
        const { search, role_id, active, page = "1", pageSize = "20" } = req.query;
        const result = await getUsers(pool, {
            search: search as string,
            role_id: role_id ? Number(role_id) : undefined,
            active: active ? active === "1" : undefined,
            page: Number(page),
            pageSize: Number(pageSize)
        });
        res.json(result);
    } catch (err) {
        console.error("Error en listUsers:", err);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

const getUser: RequestHandler = async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        res.status(400).json({ error: "El ID debe ser un número válido." });
        return;
    }
    try {
        const user = await getUserWithAssignments(pool, userId);
        if (!user) {
            res.status(404).json({ error: "Usuario no encontrado." });
        } else {
            res.json(user);
        }
    } catch (err) {
        console.error(`Error en getUser (id: ${userId}):`, err);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

const createNewUser: RequestHandler = async (req, res) => {
    const userData: UserCreate = req.body;
    if (!userData.rut || !userData.username || !userData.password || !userData.email || !userData.role_id) {
        res.status(400).json({ error: "Faltan campos obligatorios: rut, username, password, email, role_id." });
        return;
    }
    try {
        const newUser = await createUser(pool, userData);
        res.status(201).json(newUser);
    } catch (e: any) {
        if (e?.code === "23505") {
            res.status(409).json({ error: "El RUT, email o nombre de usuario ya existe." });
        } else {
            console.error("Error en createNewUser:", e);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    }
};

const updateUser: RequestHandler = async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        res.status(400).json({ error: "El ID debe ser un número válido." });
        return;
    }
    try {
        const updatedUser = await updateUserById(pool, userId, req.body as UserUpdate);
        if (!updatedUser) {
            res.status(404).json({ error: "Usuario no encontrado o no se proporcionaron campos para actualizar." });
        } else {
            res.json(updatedUser);
        }
    } catch (e: any) {
        if (e?.code === "23505") {
            res.status(409).json({ error: "El email o nombre de usuario ya existe." });
        } else {
            console.error(`Error en updateUser (id: ${userId}):`, e);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    }
};

const deleteUser: RequestHandler = async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        res.status(400).json({ error: "El ID debe ser un número válido." });
        return;
    }
    try {
        const deletedCount = await deleteUserById(pool, userId);
        if (deletedCount === 0) {
            res.status(404).json({ error: "Usuario no encontrado." });
        } else {
            res.status(204).send();
        }
    } catch (e) {
        console.error(`Error en deleteUser (id: ${userId}):`, e);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

const listByRole: RequestHandler = async (req, res) => {
    const roleId = parseInt(req.params.roleId, 10);
    if (isNaN(roleId)) {
        res.status(400).json({ error: "El ID del rol debe ser un número válido." });
        return;
    }
    try {
        const result = await getActiveUsersByRole(pool, roleId);
        res.json(result);
    } catch (e) {
        console.error(`Error en listByRole (roleId: ${roleId}):`, e);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};


// =================================================================
// 2. SECCIÓN DE RUTAS (Endpoints)
// =================================================================

router.get("/", listUsers);
router.post("/", createNewUser);
router.get("/active/by-role/:roleId", listByRole); // CAMBIO: Ruta más semántica
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;