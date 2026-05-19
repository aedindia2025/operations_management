import type { AuthUser } from "../api/authApi";

export function normalizeAuthRole(value?: string) {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isProductOwnerUser(user: AuthUser | null | undefined) {
  if (!user) return false;
  return !user.sess_company_id || normalizeAuthRole(user.role) === "productowner";
}
