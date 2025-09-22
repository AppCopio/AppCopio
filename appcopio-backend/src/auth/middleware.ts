// src/auth/middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./tokens";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.header("authorization");
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return; // Agrega un return vacío para detener la ejecución
  }
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = payload; 
    next();
  } catch {
    res.status(401).json({ error: "Invalid/expired token" });
    return; // Agrega un return vacío para detener la ejecución
  }
}

export function requireRole(...roleIds: number[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user;
    if (!u) {
        res.status(401).json({ error: "Unauthorized" });
        return; // Agrega un return vacío para detener la ejecución
    }
    if (!roleIds.includes(u.role_id)) {
        res.status(403).json({ error: "Forbidden" });
        return; // Agrega un return vacío para detener la ejecución
    }
    next();
  };
}