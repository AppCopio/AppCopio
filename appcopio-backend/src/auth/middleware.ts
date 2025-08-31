// src/auth/middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./tokens";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.header("authorization");
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = payload; 
    next();
  } catch {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}

export function requireRole(...roleIds: number[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user;
    if (!u) return res.status(401).json({ error: "Unauthorized" });
    if (!roleIds.includes(u.role_id)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
