const BASE = "/api/master/department";

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
  if (!text.trim()) {
    return {
      status: res.ok,
      message: res.ok ? "Success" : `Server error ${res.status}`,
    };
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const message =
      typeof json?.error === "string"
        ? json.error
        : Object.values(json?.error ?? json?.errors ?? {}).flat().join(" ") ||
          json?.message ||
          `Server error ${res.status}`;
    throw new Error(message);
  }

  return json;
}

export interface DepartmentRecord {
  unique_id: string;
  acc_sector: string;
  department: string;
  description?: string;
  ledger_name?: string;
  ledger_no?: string;
  is_active: number;
  acc_sector_display?: string;
  is_active_display?: string;
}

export interface DepartmentPayload {
  acc_sector: string;
  department: string;
  description?: string;
  ledger_name?: string;
  ledger_no?: string;
  is_active: number;
  acc_year?: string;
  session_id?: string;
  sess_user_type?: string;
  sess_user_id?: string;
  sess_company_id?: string;
  sess_branch_id?: string;
}

export interface DepartmentSessionPayload {
  acc_year?: string;
  session_id?: string;
  sess_user_type?: string;
  sess_user_id?: string;
  sess_company_id?: string;
  sess_branch_id?: string;
}

export interface DepartmentSublistRow {
  unique_id?: string;
  form_main_unique_id: string;
  ledger_name: string;
  ledger_no: string;
  s_no?: number;
}

export interface AccountSectorOption {
  unique_id: string;
  acc_sector: string;
}

function getCurrentAcademicYear() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function getDepartmentSessionPayload(): DepartmentSessionPayload {
  const token = localStorage.getItem("otm_token") || "";
  const user = JSON.parse(localStorage.getItem("otm_user") || "{}");

  return {
    acc_year: user?.acc_year || getCurrentAcademicYear(),
    session_id: user?.session_id || token,
    sess_user_type: user?.user_type_unique_id || user?.sess_user_type || "",
    sess_user_id: user?.unique_id || user?.staff_id || user?.user_id || user?.sess_user_id || "",
    sess_company_id: user?.sess_company_id || "",
    sess_branch_id: user?.sess_branch_id || "",
  };
}

export async function fetchDepartmentList(): Promise<DepartmentRecord[]> {
  const res = await fetch(`${BASE}/list/`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchDepartmentSuggestions(search: string): Promise<DepartmentRecord[]> {
  const res = await fetch(`${BASE}/list/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      draw: 1,
      start: 0,
      length: 8,
      search: { value: search },
    }),
  });
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchDepartmentById(unique_id: string): Promise<DepartmentRecord> {
  const res = await fetch(`${BASE}/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok || !json.status) throw new Error(json.message ?? "Department not found");
  return json.data;
}

export async function createDepartment(payload: DepartmentPayload) {
  const res = await fetch(`${BASE}/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function updateDepartment(unique_id: string, payload: DepartmentPayload) {
  const res = await fetch(`${BASE}/${unique_id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function deleteDepartment(unique_id: string) {
  const res = await fetch(`${BASE}/${unique_id}/`, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify(getDepartmentSessionPayload()),
  });
  return safeJson(res);
}

export async function fetchDepartmentAccountSectorOptions(): Promise<AccountSectorOption[]> {
  const res = await fetch(`${BASE}/options/account-sectors/`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchDepartmentSublist(form_main_unique_id: string): Promise<DepartmentSublistRow[]> {
  const res = await fetch(`${BASE}/sublist/datatable/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ draw: 1, start: 0, length: -1, form_main_unique_id }),
  });
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function createOrUpdateDepartmentSublist(payload: {
  form_main_unique_id: string;
  ledger_name: string;
  ledger_no: string;
  sub_unique_id?: string;
} & DepartmentSessionPayload) {
  const res = await fetch(`${BASE}/sublist/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, ...getDepartmentSessionPayload() }),
  });
  return safeJson(res);
}

export async function deleteDepartmentSublist(unique_id: string) {
  const res = await fetch(`${BASE}/sublist/${unique_id}/delete/`, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify(getDepartmentSessionPayload()),
  });
  return safeJson(res);
}
