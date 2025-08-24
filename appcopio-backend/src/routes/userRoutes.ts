// src/routes/userRoutes.ts
import { Router, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db";

const router = Router();

type ListUsersQuery = {
  search?: string;
  role_id?: string;
  active?: "1" | "0";
  page?: string;
  pageSize?: string;
};

const addVal = (params: any[], v: any) => {
  params.push(v);
  return `$${params.length}`;
};

// GET /api/users - Obtener y filtrar usuarios
const listUsersHandler: RequestHandler<unknown, any, any, ListUsersQuery> = async (req, res) => {
  const { search = "", role_id, active, page = "1", pageSize = "20" } = req.query;
  const p: any[] = [];
  const where: string[] = [];

  if (search) {
    const like = `%${search}%`;
    where.push(`(u.rut ILIKE ${addVal(p, like)} OR u.nombre ILIKE ${addVal(p, like)} OR u.email ILIKE ${addVal(p, like)} OR u.username ILIKE ${addVal(p, like)})`);
  }
  if (role_id) {
    where.push(`u.role_id = ${addVal(p, Number(role_id))}`);
  }
  if (active === "1" || active === "0") {
    where.push(`u.is_active_user = ${addVal(p, active === "1")}`);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSz = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const offset = (pageNum - 1) * pageSz;
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countSql = `SELECT COUNT(*)::int AS total FROM users u ${whereSql}`;
  const listSql = `
    SELECT
      u.user_id, u.rut, u.username, u.email, u.role_id, u.created_at,
      u.imagen_perfil, u.nombre, u.genero, u.celular, u.is_active_user, u.es_apoyo_admin,
      r.role_name
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    ${whereSql}
    ORDER BY u.nombre ASC
    LIMIT ${pageSz} OFFSET ${offset}
  `;

  try {
    const [countRs, listRs] = await Promise.all([
      pool.query(countSql, p),
      pool.query(listSql, p),
    ]);
    res.json({ users: listRs.rows, total: countRs.rows[0].total });
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
};

// GET /api/users/:id - Obtener un usuario y sus centros asignados
const getUserByIdHandler: RequestHandler<{ id: string }> = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const userQuery = `
        SELECT u.user_id, u.rut, u.username, u.email, u.role_id, u.created_at,
               u.imagen_perfil, u.nombre, u.genero, u.celular, u.is_active_user, u.es_apoyo_admin,
               r.role_name
        FROM users u
        JOIN roles r ON r.role_id = u.role_id
        WHERE u.user_id = $1`;
    
    const assignmentsQuery = `SELECT center_id FROM UserCenterAssignments WHERE user_id = $1`;
    
    const [userResult, assignmentsResult] = await Promise.all([
        pool.query(userQuery, [id]),
        pool.query(assignmentsQuery, [id])
    ]);

    if (userResult.rowCount === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    
    const user = userResult.rows[0];
    const assignedCenters = assignmentsResult.rows.map(row => row.center_id);
    res.json({ ...user, assignedCenters });
  } catch (err) {
    console.error("GET /users/:id error:", err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
};

// POST /api/users - Crear un nuevo usuario (CORREGIDO)
const createUserHandler: RequestHandler = async (req, res) => {
  try {
    // Se elimina 'center_id' de los parámetros a recibir.
    const { rut, username, password, email, role_id, nombre, genero, celular, imagen_perfil, es_apoyo_admin = false } = req.body || {};
    if (!rut || !username || !password || !email || !role_id) {
      res.status(400).json({ error: "Faltan campos obligatorios" });
      return;
    }
    const hash = await bcrypt.hash(password, 10);

    // Se elimina 'center_id' de la consulta de inserción.
    const insertSql = `
      INSERT INTO users
        (rut, username, password_hash, email, role_id, nombre, genero, celular, imagen_perfil, es_apoyo_admin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING user_id, rut, username, email, role_id, created_at, nombre, is_active_user, es_apoyo_admin
    `;
    const rs = await pool.query(insertSql, [rut, username, hash, email, Number(role_id), nombre, genero, celular, imagen_perfil, es_apoyo_admin]);
    res.status(201).json(rs.rows[0]);
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: "RUT, email o username ya existe" });
      return;
    }
    console.error("POST /users error:", e);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

// PUT /api/users/:id - Actualizar un usuario (CORREGIDO)
const updateUserHandler: RequestHandler<{ id: string }> = async (req, res) => {
  const id = Number(req.params.id);
  try {
    // Se elimina 'center_id'.
    const { email, username, role_id, nombre, genero, celular, imagen_perfil, is_active_user, es_apoyo_admin } = req.body || {};
    const fields: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    
    if (email !== undefined) { fields.push(`email = $${idx++}`); vals.push(email); }
    if (username !== undefined) { fields.push(`username = $${idx++}`); vals.push(username); }
    if (role_id !== undefined) { fields.push(`role_id = $${idx++}`); vals.push(Number(role_id)); }
    // Se elimina la lógica para 'center_id'.
    if (nombre !== undefined) { fields.push(`nombre = $${idx++}`); vals.push(nombre); }
    if (genero !== undefined) { fields.push(`genero = $${idx++}`); vals.push(genero); }
    if (celular !== undefined) { fields.push(`celular = $${idx++}`); vals.push(celular); }
    if (imagen_perfil !== undefined) { fields.push(`imagen_perfil = $${idx++}`); vals.push(imagen_perfil); }
    if (is_active_user !== undefined) { fields.push(`is_active_user = $${idx++}`); vals.push(!!is_active_user); }
    if (es_apoyo_admin !== undefined) { fields.push(`es_apoyo_admin = $${idx++}`); vals.push(!!es_apoyo_admin); }

    if (!fields.length) {
      res.status(400).json({ error: "Nada para actualizar" });
      return;
    }
    const sql = `UPDATE users SET ${fields.join(", ")} WHERE user_id = $${idx} RETURNING *`;
    vals.push(id);
    const rs = await pool.query(sql, vals);
    if (!rs.rowCount) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json(rs.rows[0]);
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: "Email o username ya existe" });
      return;
    }
    console.error("PUT /users/:id error:", e);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};

// POST /api/users/login - Manejador de inicio de sesión
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
        const assignmentsResult = await pool.query('SELECT center_id FROM centerassignments WHERE user_id = $1', [user.user_id]);
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

// DELETE /api/users/:id - Eliminar un usuario
const deleteUserHandler: RequestHandler<{ id: string }> = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const rs = await pool.query("DELETE FROM users WHERE user_id = $1", [id]);
    if (!rs.rowCount) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.status(204).send();
  } catch (e) {
    console.error("DELETE /users/:id error:", e);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
};

// --- REGISTRO DE TODAS LAS RUTAS ---
router.get("/", listUsersHandler);
router.get("/:id", getUserByIdHandler);
router.post("/", createUserHandler);
router.put("/:id", updateUserHandler);
router.delete("/:id", deleteUserHandler);
router.post('/login', loginHandler);

export default router;