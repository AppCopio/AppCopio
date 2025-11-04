// src/routes/authRoutes.ts
import { Router, RequestHandler } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../config/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtUser, verifyAccessToken } from "../auth/tokens";

const router = Router();

/** Schemas */
const LoginSchema = z.object({
    username: z.string(),
    password: z.string(),
});

function cookieOpts() {
  const prod = process.env.NODE_ENV === "production";
  const crossSite = process.env.CROSS_SITE_COOKIES === "1"; 
  const sameSite = crossSite ? "none" : "lax";

  // Nota: SameSite=None exige Secure siempre
  const secure = crossSite ? true : prod;

  return {
    httpOnly: true,
    secure,                 
    sameSite,               
    path: "/",
    // No usar partitioned en development
    ...(crossSite && { partitioned: true }),
  } as any;
}

const getClientIp = (req: Parameters<RequestHandler>[0]) =>
    ((req.headers["x-forwarded-for"] as string) || req.ip || "").toString();

/** Handlers */

// POST /api/auth/login
const loginHandler: RequestHandler = async (req, res): Promise<void> => {
  try {
    // console.log('🔍 Login attempt:', req.body);
    // Validación equivalente a "se requieren usuario y contraseña"
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      // console.log('❌ Validation failed:', parsed.error);
      res.status(400).json({ message: "Se requieren usuario y contraseña." });
      return;
    }
    const { username, password } = parsed.data;
    // console.log('✅ Validation passed for user:', username);

    // Trae datos del usuario y el nombre del rol (equivale al role query del handler viejo)
    const qUser = `
      SELECT u.user_id, u.username, u.password_hash, u.is_active, u.role_id, u.es_apoyo_admin,
         u.rut, u.email, u.nombre, u.genero, u.celular, u.imagen_perfil, u.created_at,
         r.role_name
      FROM Users u
      LEFT JOIN Roles r ON r.role_id = u.role_id
      WHERE u.username = $1
    `;
    const { rows } = await pool.query(qUser, [username]);
    const user = rows[0];

    // console.log('🔍 User query result:', user);

    if (!user || !user.is_active) {
      // console.log('❌ User not found or inactive');
      res.status(401).json({ message: "Credenciales inválidas." });
      return;
    }

    // Verifica contraseña (equivale a isMatch del handler viejo)
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ message: "Credenciales inválidas." });
      return;
    }

    // Centros asignados activos (equivalente al assignmentsResult del handler viejo)
    const qAssignments = `
      SELECT center_id
      FROM CenterAssignments
      WHERE user_id = $1 AND valid_to IS NULL
    `;
    const assignRes = await pool.query(qAssignments, [user.user_id]);
    const assignedCenters: string[] = assignRes.rows.map((r: any) => r.center_id);

    // Construye el "sessionUser" tal como en el handler viejo (con campos extra)
    const sessionUser = {
      user_id: user.user_id,
      username: user.username,
      role_id: user.role_id,
      role_name: user.role_name as string,
      es_apoyo_admin: !!user.es_apoyo_admin,
      is_active: !!user.is_active,
      assignedCenters, // <-- NUEVO EN LA RESPUESTA (no va dentro del JWT)
      nombre: user.nombre,           // ← AGREGAR
    genero: user.genero,           // ← AGREGAR
    celular: user.celular,         // ← AGREGAR
    imagen_perfil: user.imagen_perfil, // ← AGREGAR
    };

    // JWTs reales (manteniendo tu flujo nuevo)
    const payload: JwtUser = {
      user_id: user.user_id,
      username: user.username,
      role_id: user.role_id,
      role_name: user.role_name,
      is_active: user.is_active,
      es_apoyo_admin: user.es_apoyo_admin,
      
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Persistir hash del refresh + metadata
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TOKEN_TTL_DAYS));

    await pool.query(
      `INSERT INTO RefreshTokens (user_id, token_hash, user_agent, ip, expires_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [user.user_id, tokenHash, req.headers["user-agent"] || null, getClientIp(req), expiresAt]
    );
    res.setHeader("Cache-Control", "no-store");
    
    // Log para debug - Comentado en producción
    // console.log('[Login] ✅ Estableciendo cookie refresh con opciones:', cookieOpts());
    // console.log('[Login] ⏱️ TTL del access token:', process.env.ACCESS_TOKEN_TTL_MIN, 'minutos');
    
    // Cookie httpOnly con refresh y body con access + user enriquecido (incluye assignedCenters)
    res
      .cookie("refresh", refreshToken, { ...cookieOpts(), maxAge: expiresAt.getTime() - Date.now() })
      .json({ access_token: accessToken, user: sessionUser });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};


// POST /api/auth/refresh
const refreshHandler: RequestHandler = async (req, res): Promise<void> => {
    // Debug: ver todas las cookies recibidas - Comentado en producción
    // console.log('[Refresh] 🔍 Cookies recibidas:', req.cookies);
    // console.log('[Refresh] 🔍 Headers cookie:', req.headers.cookie);
    
    const token = (req as any).cookies?.refresh;
    if (!token) {
        // console.log('[Refresh] ❌ No refresh token en cookie');
        res.status(401).json({ error: "Missing refresh token" });
        return;
    }

    try {
        // Verificar y decodificar el token
        const payload = verifyRefreshToken(token);
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        // Buscar el token en la base de datos
        const { rows } = await pool.query(
            `SELECT id, user_id, expires_at, revoked_at
             FROM RefreshTokens
             WHERE user_id=$1 AND token_hash=$2`,
            [payload.user_id, tokenHash]
        );
        
        const row = rows[0];
        
        // Validar que el token existe, no está revocado y no ha expirado
        if (!row) {
            // console.log('[Refresh] ❌ Token no encontrado en BD');
            res.status(401).json({ error: "Refresh token not found" });
            return;
        }
        
        if (row.revoked_at) {
            // console.log('[Refresh] ❌ Token ya revocado');
            res.status(401).json({ error: "Refresh token has been revoked" });
            return;
        }
        
        if (new Date(row.expires_at) < new Date()) {
            // console.log('[Refresh] ❌ Token expirado');
            res.status(401).json({ error: "Refresh token has expired" });
            return;
        }

        // ✅ REVOCAR EL TOKEN ACTUAL ANTES DE CREAR UNO NUEVO
        // console.log('[Refresh] 🔄 Revocando token anterior...');
        await pool.query(
            `UPDATE RefreshTokens 
             SET revoked_at = now() 
             WHERE id = $1`,
            [row.id]
        );

        // Crear nuevos tokens (rotación)
        const newPayload: JwtUser = {
            user_id: payload.user_id,
            username: payload.username,
            role_id: payload.role_id,
            role_name: payload.role_name,
            is_active: payload.is_active,
            es_apoyo_admin: payload.es_apoyo_admin
        };
        
        const newAccess = signAccessToken(newPayload);
        const newRefresh = signRefreshToken(newPayload);
        const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7));

        // Insertar el nuevo token
        await pool.query(
            `INSERT INTO RefreshTokens (user_id, token_hash, user_agent, ip, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [payload.user_id, newHash, req.headers["user-agent"] || null, getClientIp(req), expiresAt]
        );
        
        // console.log('[Refresh] ✅ Tokens renovados exitosamente');
        
        res.setHeader("Cache-Control", "no-store");
        res
            .cookie("refresh", newRefresh, { ...cookieOpts(), maxAge: expiresAt.getTime() - Date.now() })
            .json({ access_token: newAccess, user: newPayload });
            
    } catch (error: any) {
        // console.error('[Refresh] ❌ Error:', error.message);
        
        // Manejar errores específicos de JWT
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: "Refresh token has expired" });
        } else if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ error: "Invalid refresh token" });
        } else {
            res.status(401).json({ error: "Refresh token validation failed" });
        }
    }
};

// POST /api/auth/logout
const logoutHandler: RequestHandler = async (req, res): Promise<void> => {
    const token = (req as any).cookies?.refresh;
    if (token) {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        await pool.query(`UPDATE RefreshTokens SET revoked_at = now() WHERE token_hash=$1`, [tokenHash]);
    }
    res.clearCookie("refresh", cookieOpts()).json({ ok: true });
};

// GET /api/auth/me
const meHandler: RequestHandler = async (req, res) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    
    if (!token) { 
        res.status(401).json({ error: "No token provided" }); 
        return; 
    }
    
    try {
        const payload = verifyAccessToken(token);
        
        // Verificar que el usuario sigue activo
        const { rows } = await pool.query(
            `SELECT u.user_id, u.username, u.role_id, u.is_active, r.role_name
             FROM Users u
             LEFT JOIN Roles r ON r.role_id = u.role_id
             WHERE u.user_id = $1`,
            [payload.user_id]
        );
        
        const user = rows[0];
        
        if (!user || !user.is_active) {
            res.status(401).json({ error: "User inactive or not found" });
            return;
        }
        
        res.json({ 
            user: { 
                user_id: user.user_id, 
                username: user.username, 
                role_id: user.role_id,
                role_name: user.role_name,
                is_active: user.is_active
            } 
        });
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: "TOKEN_EXPIRED" });
        } else if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ error: "Invalid token" });
        } else {
            res.status(401).json({ error: "Token verification failed" });
        }
    }
};

/** Registro de rutas */
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.get("/me", meHandler);

export default router;
