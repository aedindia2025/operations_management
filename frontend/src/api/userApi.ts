const BASE = "/api/master";

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("otm_token") || sessionStorage.getItem("otm_token") || "";
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": getCookie("csrftoken"),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`); }
}

export interface UserTypeOption { unique_id: string; label: string; }
export interface UserRecord {
  unique_id: string; staff_name: string; staff_id: string; user_type_unique_id: string;
  mobile_no: string; email_id: string; user_name: string; address?: string; password: string; is_active: number;
}
export interface UserListRow extends UserRecord { s_no: number; user_type_display: string; is_active: string; }
export interface UserListResponse { draw: number; recordsTotal: number; recordsFiltered: number; data: UserListRow[]; }

export async function fetchUserTypeOptions(): Promise<UserTypeOption[]> {
  const res = await fetch(`${BASE}/user/options/user-types/`, { headers: authHeaders() });
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchUserList(params?: { search?: string; start?: number; length?: number; user_type_unique_id?: string; }): Promise<UserListResponse> {
  const query = new URLSearchParams({ search: params?.search ?? "", start: String(params?.start ?? 0), length: String(params?.length ?? 10), draw: "1" });
  if (params?.user_type_unique_id) query.set("user_type_unique_id", params.user_type_unique_id);
  const res = await fetch(`${BASE}/user/list/?${query}`, { headers: authHeaders() });
  return safeJson(res);
}

export async function fetchUserById(unique_id: string): Promise<UserRecord> {
  const res = await fetch(`${BASE}/user/${unique_id}/`, { headers: authHeaders() });
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.error ?? "Not found");
  return json.data;
}

export async function saveUser(payload: Omit<UserRecord, "unique_id"> & { unique_id?: string }) {
  const res = await fetch(`${BASE}/user/list/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  return safeJson(res);
}

export async function deleteUser(unique_id: string) {
  const res = await fetch(`${BASE}/user/${unique_id}/`, { method: "DELETE", headers: authHeaders() });
  return safeJson(res);
}
