// src/routes/userRoutes.ts
import { Router, RequestHandler } from 'express';
import pool from '../config/db';
// Asumo que tienes una dependencia para hashear contraseñas, como bcrypt
import bcrypt from 'bcryptjs'; 

const router = Router();

// GET /api/users - Obtener todos los usuarios
const getAllUsersHandler: RequestHandler = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.user_id, u.username, u.email, u.center_id, r.role_name 
             FROM Users u 
             JOIN Roles r ON u.role_id = r.role_id`
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// GET /api/users/:id - Obtener un usuario por ID
const getUserByIdHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT u.user_id, u.username, u.email, u.center_id, r.role_name 
             FROM Users u 
             JOIN Roles r ON u.role_id = r.role_id 
             WHERE u.user_id = $1`, [id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Usuario no encontrado.' });
        } else {
            res.status(200).json(result.rows[0]);
        }
    } catch (error) {
        console.error(`Error al obtener el usuario ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// POST /api/users - Crear un nuevo usuario
const createUserHandler: RequestHandler = async (req, res) => {
    const { username, password, email, role_id, center_id } = req.body;
    if (!username || !password || !role_id) {
        res.status(400).json({ message: 'username, password y role_id son requeridos.' });
        return;
    }
    try {
        // Es fundamental hashear la contraseña antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            `INSERT INTO Users (username, password_hash, email, role_id, center_id) 
             VALUES ($1, $2, $3, $4, $5) RETURNING user_id, username, email, role_id, center_id`,
            [username, password_hash, email, role_id, center_id]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (error: any) {
        console.error('Error al crear usuario:', error);
        if (error.code === '23505') { // Error de constraint UNIQUE
            res.status(409).json({ message: 'El nombre de usuario o email ya existen.' });
        } else {
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    }
};

// PUT /api/users/:id - Actualizar un usuario
const updateUserHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    const { username, email, role_id, center_id } = req.body;
    if (!username || !role_id) {
        res.status(400).json({ message: 'username y role_id son requeridos.' });
        return;
    }
    try {
        const updatedUser = await pool.query(
            `UPDATE Users SET username = $1, email = $2, role_id = $3, center_id = $4 
             WHERE user_id = $5 RETURNING user_id, username, email, role_id, center_id`,
            [username, email, role_id, center_id, id]
        );
        if (updatedUser.rowCount === 0) {
            res.status(404).json({ message: 'Usuario no encontrado.' });
        } else {
            res.status(200).json(updatedUser.rows[0]);
        }
    } catch (error: any) {
        console.error(`Error al actualizar usuario ${id}:`, error);
        if (error.code === '23505') {
            res.status(409).json({ message: 'El nombre de usuario o email ya existen.' });
        } else {
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    }
};


// DELETE /api/users/:id - Eliminar un usuario
const deleteUserHandler: RequestHandler = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteOp = await pool.query('DELETE FROM Users WHERE user_id = $1', [id]);
        if (deleteOp.rowCount === 0) {
            res.status(404).json({ message: 'Usuario no encontrado.' });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        console.error(`Error al eliminar usuario ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// Registro de las rutas
router.get('/', getAllUsersHandler);
router.get('/:id', getUserByIdHandler);
router.post('/', createUserHandler);
router.put('/:id', updateUserHandler);
router.delete('/:id', deleteUserHandler);

export default router;