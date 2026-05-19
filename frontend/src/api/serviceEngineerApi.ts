const BASE = "/api/master/service-engineer";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
  }
}

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

export interface ServiceEngineerRow {
  unique_id: string;
  engineer_name: string;
  emp_id: string;
  is_active: number;
  is_delete?: number;
  engineer_name_display: string;
  emp_id_display: string;
  is_active_display: string;
}

export interface EngineerOption {
  unique_id: string;
  staff_name: string;
  staff_id: string;
}

export async function fetchServiceEngineerList(): Promise<ServiceEngineerRow[]> {
  const res = await fetch(`${BASE}/list/`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchServiceEngineerById(unique_id: string): Promise<ServiceEngineerRow> {
  const res = await fetch(`${BASE}/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok || !json.status) throw new Error(json.message ?? "Record not found");
  return json.data;
}

export async function fetchEngineerNameOptions(): Promise<EngineerOption[]> {
  const res = await fetch(`${BASE}/options/engineer-names/`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchEmpIdOptions(engineer_name: string): Promise<EngineerOption[]> {
  const query = new URLSearchParams({ engineer_name });
  const res = await fetch(`${BASE}/options/emp-id/?${query}`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function createServiceEngineer(payload: {
  engineer_name: string;
  emp_id: string;
  is_active: number;
}) {
  const res = await fetch(`${BASE}/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function updateServiceEngineer(
  unique_id: string,
  payload: { engineer_name: string; emp_id: string; is_active: number }
) {
  const res = await fetch(`${BASE}/${unique_id}/update/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function deleteServiceEngineer(unique_id: string) {
  const res = await fetch(`${BASE}/${unique_id}/delete/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return safeJson(res);
}
