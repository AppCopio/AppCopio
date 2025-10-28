import type { JwtUser } from "@/auth/tokens";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}
export {};