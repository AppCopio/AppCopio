// src/auth/middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./tokens";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.get("authorization") ?? "";
  const [scheme, rawToken] = header.split(" ");

  if ((scheme || "").toLowerCase() !== "bearer" || !rawToken?.trim()) {
    res.status(401)
      .set("WWW-Authenticate", 'Bearer error="invalid_request"')
      .json({ error: "Missing token" });
    return;
  }

  try {
    const payload = verifyAccessToken(rawToken.trim());
    req.user = payload;
    next();
  } catch (err: any) {
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