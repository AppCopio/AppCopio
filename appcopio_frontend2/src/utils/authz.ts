import type { User } from "@/types/user";

export const ROLE_ID_ADMIN = 1;
export const ROLE_ID_TMO = 2; // trabajador municipal
export const ROLE_ID_CC  = 3; // contacto comunidad

export function isAdminOrSupport(u?: User | null) {
  if (!u) return false;
  return u.role_id === ROLE_ID_ADMIN || !!u.es_apoyo_admin;
}
export function isFieldUser(u?: User | null) {
  if (!u) return false;
  return (u.role_id === ROLE_ID_TMO || u.role_id === ROLE_ID_CC) && !u.es_apoyo_admin;
}

export function isMunicipalWorker(u?: User | null) {
  if (!u) return false;
  return u.role_id === ROLE_ID_TMO;
}
