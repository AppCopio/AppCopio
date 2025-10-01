// src/auth/tokens.ts
import jwt from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET!;
const accessTtlMin = Number(process.env.ACCESS_TOKEN_TTL_MIN || 180);
const refreshTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);

export type JwtUser = { user_id: number; username: string; role_id: number; role_name: string; is_active: boolean, es_apoyo_admin: boolean };

export function signAccessToken(payload: JwtUser) {
  return jwt.sign(payload, accessSecret, { expiresIn: `${accessTtlMin}m` });
}
export function signRefreshToken(payload: JwtUser) {
  return jwt.sign(payload, refreshSecret, { expiresIn: `${refreshTtlDays}d` });
}
export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as JwtUser & jwt.JwtPayload;
}
export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as JwtUser & jwt.JwtPayload;
}
