const BASE = "/api/master";

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": getCookie("csrftoken"),
  };
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
  }
}

export interface UserTypeRecord {
  unique_id: string;
  user_type: string;
  under_user_type: string;
  is_active: number;
}

export interface UserTypeListRow {
  s_no: number;
  user_type: string;
  under_user_type: string;
  is_active: string;
  unique_id: string;
}

export interface UserTypeListResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: UserTypeListRow[];
}

export interface UserTypePayload {
  user_type: string;
  under_user_type: string;
  is_active: number;
}

export async function fetchUserTypeList(params?: {
  search?: string;
  start?: number;
  length?: number;
}): Promise<UserTypeListResponse> {
  const query = new URLSearchParams({
    search: params?.search ?? "",
    start: String(params?.start ?? 0),
    length: String(params?.length ?? 10),
    draw: "1",
  });
  const res = await fetch(`${BASE}/user-type/list/?${query}`);
  return safeJson(res);
}

export async function fetchUserTypeById(unique_id: string): Promise<UserTypeRecord> {
  const res = await fetch(`${BASE}/user-type/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.error ?? "Not found");
  return json.data;
}

export async function createUserType(payload: UserTypePayload) {
  const res = await fetch(`${BASE}/user-type/list/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function updateUserType(unique_id: string, payload: UserTypePayload) {
  const res = await fetch(`${BASE}/user-type/${unique_id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function deleteUserType(unique_id: string) {
  const res = await fetch(`${BASE}/user-type/${unique_id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return safeJson(res);
}
