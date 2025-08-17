// src/routes/userRoutes.ts
import { Router, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db";

const router = Router();

/** Helpers */
type ListUsersQuery = {
  search?: string;
  role_id?: string;
  role?: string;
  center_id?: string;
  active?: "1" | "0";
  page?: string;
  pageSize?: string;
};

const addVal = (params: any[], v: any) => {
  params.push(v);
  return `$${params.length}`;
};

/**
 * GET /api/users
 * Query: ?search=&role_id=&role=&center_id=&active=1&page=1&pageSize=20
 * Responde: { users: [...], total: number }
 */
const listUsersHandler: RequestHandler<unknown, any, any, ListUsersQuery> = async (req, res) => {
  const {
    search = "",
    role_id,
    role,
    center_id,
    active,
    page = "1",
    pageSize = "20",
  } = req.query;

  const p: any[] = [];
  const where: string[] = [];

  if (search) {
    const like = `%${search}%`;
    const a = addVal(p, like);
    const b = addVal(p, like);
    const c = addVal(p, like);
    const d = addVal(p, like);
    where.push(`(u.rut ILIKE ${a} OR u.nombre ILIKE ${b} OR u.email ILIKE ${c} OR u.username ILIKE ${d})`);
  }

  if (role_id) {
    const ph = addVal(p, Number(role_id));
    where.push(`u.role_id = ${ph}`);
  }

  if (role) {
    const ph = addVal(p, role);
    where.push(`r.role_name = ${ph}`);
  }

  if (center_id) {
    const ph = addVal(p, center_id);
    where.push(`u.center_id = ${ph}`);
  }

  if (active === "1" || active === "0") {
    const ph = addVal(p, active === "1");
    where.push(`u.is_active = ${ph}`);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSz = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const offset = (pageNum - 1) * pageSz;

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM users u
    LEFT JOIN roles r ON r.role_id = u.role_id
    ${whereSql}
  `;

  const listSql = `
    SELECT
      u.user_id, u.rut, u.username, u.email, u.role_id, u.center_id, u.created_at,
      u.imagen_perfil, u.nombre, u.genero, u.celular, u.is_active,
      r.role_name
    FROM users u
    LEFT JOIN roles r ON r.role_id = u.role_id
    ${whereSql}
    ORDER BY u.created_at DESC
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

/** GET /api/users/:id */
const getUserByIdHandler: RequestHandler<{ id: string }> = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const rs = await pool.query(
      `SELECT
         u.user_id, u.rut, u.username, u.email, u.role_id, u.center_id, u.created_at,
         u.imagen_perfil, u.nombre, u.genero, u.celular, u.is_active
       FROM users u
       WHERE u.user_id = $1`,
      [id]
    );
    if (!rs.rowCount) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json(rs.rows[0]);
  } catch (err) {
    console.error("GET /users/:id error:", err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
};

/**
 * POST /api/users
 * body: { rut, username, password, email, role_id, center_id?, nombre?, genero?, celular?, imagen_perfil? }
 */
const createUserHandler: RequestHandler = async (req, res) => {
  try {
    const {
      rut,
      username,
      password,
      email,
      role_id,
      center_id = null,
      nombre = null,
      genero = null,
      celular = null,
      imagen_perfil = null,
    } = req.body || {};

    if (!rut || !username || !password || !email || !role_id) {
      res.status(400).json({ error: "Faltan campos obligatorios" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password mínimo 8 caracteres" });
      return;
    }

    const hash = await bcrypt.hash(password, 10);

    const insertSql = `
      INSERT INTO users
        (rut, username, password_hash, email, role_id, center_id, nombre, genero, celular, imagen_perfil)
      VALUES
        ($1,  $2,       $3,            $4,   $5,     $6,       $7,     $8,     $9,      $10)
      RETURNING user_id, rut, username, email, role_id, center_id, created_at,
                imagen_perfil, nombre, genero, celular, is_active
    `;

    const rs = await pool.query(insertSql, [
      rut,
      username,
      hash,
      email,
      Number(role_id),
      center_id,
      nombre,
      genero,
      celular,
      imagen_perfil,
    ]);

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

/**
 * PUT /api/users/:id
 * body: { email?, username?, role_id?, center_id?, nombre?, genero?, celular?, imagen_perfil?, is_active? }
 */
const updateUserHandler: RequestHandler<{ id: string }> = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const {
      email,
      username,
      role_id,
      center_id,
      nombre,
      genero,
      celular,
      imagen_perfil,
      is_active,
    } = req.body || {};

    const fields: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (email !== undefined)         { fields.push(`email = $${idx++}`); vals.push(email); }
    if (username !== undefined)      { fields.push(`username = $${idx++}`); vals.push(username); }
    if (role_id !== undefined)       { fields.push(`role_id = $${idx++}`); vals.push(Number(role_id)); }
    if (center_id !== undefined)     { fields.push(`center_id = $${idx++}`); vals.push(center_id); }
    if (nombre !== undefined)        { fields.push(`nombre = $${idx++}`); vals.push(nombre); }
    if (genero !== undefined)        { fields.push(`genero = $${idx++}`); vals.push(genero); }
    if (celular !== undefined)       { fields.push(`celular = $${idx++}`); vals.push(celular); }
    if (imagen_perfil !== undefined) { fields.push(`imagen_perfil = $${idx++}`); vals.push(imagen_perfil); }
    if (is_active !== undefined)     { fields.push(`is_active = $${idx++}`); vals.push(!!is_active); }

    if (!fields.length) {
      res.status(400).json({ error: "Nada para actualizar" });
      return;
    }

    const sql = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE user_id = $${idx}
      RETURNING user_id, rut, username, email, role_id, center_id, created_at,
                imagen_perfil, nombre, genero, celular, is_active
    `;
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

/** PATCH /api/users/:id/password  body: { password } */
const changePasswordHandler: RequestHandler<{ id: string }, any, { password: string }> = async (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body || {};
  if (!password || password.length < 8) {
    res.status(400).json({ error: "Password requerido (mínimo 8 caracteres)" });
    return;
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const rs = await pool.query("UPDATE users SET password_hash = $1 WHERE user_id = $2", [hash, id]);
    if (!rs.rowCount) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /users/:id/password error:", e);
    res.status(500).json({ error: "Error al actualizar contraseña" });
  }
};

/** PATCH /api/users/:id/activate  body: { is_active: boolean } */
const toggleActiveHandler: RequestHandler<{ id: string }, any, { is_active: boolean }> = async (req, res) => {
  const id = Number(req.params.id);
  const { is_active } = req.body || {};
  if (typeof is_active !== "boolean") {
    res.status(400).json({ error: "is_active debe ser boolean" });
    return;
  }
  try {
    const rs = await pool.query(
      "UPDATE users SET is_active = $1 WHERE user_id = $2 RETURNING user_id, is_active",
      [is_active, id]
    );
    if (!rs.rowCount) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json(rs.rows[0]);
  } catch (e) {
    console.error("PATCH /users/:id/activate error:", e);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
};

/** DELETE /api/users/:id */
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

/** Registro de rutas */
router.get("/", listUsersHandler);
router.get("/:id", getUserByIdHandler);
router.post("/", createUserHandler);
router.put("/:id", updateUserHandler);
router.patch("/:id/password", changePasswordHandler);
router.patch("/:id/activate", toggleActiveHandler);
router.delete("/:id", deleteUserHandler);

export default router;
