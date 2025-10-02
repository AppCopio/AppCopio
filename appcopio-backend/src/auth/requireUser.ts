// src/auth/requireUser.ts
import type { Request } from "express";
import type { JwtUser } from "./tokens";

export function requireUser(req: Request): JwtUser {
  if (!req.user) {
    const e = new Error("AUTH_REQUIRED");
    (e as any).status = 401;
    throw e;
  }
  return req.user;
}
