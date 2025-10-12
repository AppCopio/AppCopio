// src/auth/middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./tokens";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.get("authorization") ?? "";
  const [scheme, rawToken] = header.split(" ");

  console.log(`[AUTH] ${req.method} ${req.path} - Authorization header: ${header ? 'Present' : 'Missing'}`);

  if ((scheme || "").toLowerCase() !== "bearer" || !rawToken?.trim()) {
    console.log(`[AUTH] Missing token - scheme: "${scheme}", rawToken: "${rawToken}"`);
    res.status(401)
      .set("WWW-Authenticate", 'Bearer error="invalid_request"')
      .json({ error: "Missing token" });
    return;
  }

  try {
    const payload = verifyAccessToken(rawToken.trim());
    console.log(`[AUTH] Token valid for user ${payload.userId}`);
    req.user = payload;
    next();
  } catch (err: any) {
    console.log(`[AUTH] Token verification failed:`, err.name, err.message);
    if (err?.name === "TokenExpiredError") {
      res.status(401)
        .set("WWW-Authenticate", 'Bearer error="invalid_token", error_description="expired"')
        .json({ error: "TOKEN_EXPIRED" });
      return;
    }
    res.status(401)
      .set("WWW-Authenticate", 'Bearer error="invalid_token"')
      .json({ error: "Invalid/expired token" });
    return;
  }
}

export function requireRole(...roleIds: number[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = req.user;
    if (!u) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roleIds.includes(u.role_id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}