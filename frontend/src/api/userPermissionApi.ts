const BASE = "/api/master";

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}
function authHeaders(): HeadersInit {
  return { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") };
}
async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`); }
}

export interface UserPermissionListRow { s_no: number; user_type: string; unique_id: string; }
export interface UserPermissionListResponse { draw: number; recordsTotal: number; recordsFiltered: number; data: UserPermissionListRow[]; }
export interface PermissionMatrixAction { unique_id: string; label: string; checked: boolean; }
export interface PermissionMatrixRow {
  s_no: number; screen_unique_id: string; screen_name: string; section_unique_id: string;
  main_screen_unique_id: string; actions: PermissionMatrixAction[];
}

export async function fetchUserPermissionOptions() {
  const res = await fetch(`${BASE}/user-permission/options/`);
  return safeJson(res);
}
export async function fetchUserPermissionList(params?: { search?: string; start?: number; length?: number; }): Promise<UserPermissionListResponse> {
  const query = new URLSearchParams({ search: params?.search ?? "", start: String(params?.start ?? 0), length: String(params?.length ?? 10), draw: "1" });
  const res = await fetch(`${BASE}/user-permission/list/?${query}`);
  return safeJson(res);
}
export async function fetchUserPermissionById(user_type: string) {
  const res = await fetch(`${BASE}/user-permission/${user_type}/`);
  return safeJson(res);
}
export async function fetchUserPermissionMatrix(user_type: string, main_screen_unique_id: string) {
  const query = new URLSearchParams({ user_type, main_screen_unique_id });
  const res = await fetch(`${BASE}/user-permission/matrix/?${query}`);
  return safeJson(res);
}
export async function saveUserPermission(payload: { user_type: string; main_screen_unique_id: string; permissions: Array<Record<string, string>>; unique_id?: string; }) {
  const res = await fetch(`${BASE}/user-permission/list/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  return safeJson(res);
}
export async function deleteUserPermission(user_type: string) {
  const res = await fetch(`${BASE}/user-permission/${user_type}/`, { method: "DELETE", headers: authHeaders() });
  return safeJson(res);
}
