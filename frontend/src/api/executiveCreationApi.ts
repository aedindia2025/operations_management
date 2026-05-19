const BASE = "/api/master/executive-creation";

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

export interface ExecutiveCreationRecord {
  id?: number;
  unique_id: string;
  executive_name: string;
  user_name: string;
  email_id: string;
  mobile_no: string;
  is_active: number;
  is_active_display?: string;
}

export interface ExecutiveCreationPayload {
  executive_name: string;
  user_name: string;
  email_id: string;
  mobile_no: string;
  password: string;
  confirm_password: string;
  is_active: number;
}

export async function fetchExecutiveCreationList(): Promise<ExecutiveCreationRecord[]> {
  const res = await fetch(`${BASE}/list/`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchExecutiveCreationById(unique_id: string): Promise<ExecutiveCreationRecord> {
  const res = await fetch(`${BASE}/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok || !json.status) throw new Error(json.error ?? "Executive not found");
  return json.data;
}

export async function createExecutiveCreation(payload: ExecutiveCreationPayload) {
  const res = await fetch(`${BASE}/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function updateExecutiveCreation(unique_id: string, payload: ExecutiveCreationPayload) {
  const res = await fetch(`${BASE}/${unique_id}/update/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function deleteExecutiveCreation(unique_id: string) {
  const res = await fetch(`${BASE}/${unique_id}/delete/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return safeJson(res);
}
