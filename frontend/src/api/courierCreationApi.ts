const BASE = "/api/master/courier";

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

function getCurrentAcademicYear() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export interface CourierSessionPayload {
  acc_year?: string;
  session_id?: string;
  sess_user_type?: string;
  sess_user_id?: string;
  sess_company_id?: string;
  sess_branch_id?: string;
}

export function getCourierSessionPayload(): CourierSessionPayload {
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

export interface CourierRecord {
  id?: number;
  unique_id: string;
  courier_name: string;
  is_active: number | boolean;
  is_active_display?: string;
}

export interface CourierPayload {
  courier_name: string;
  is_active: number;
}

export async function fetchCourierList(search = "", page = 1, length = 10): Promise<CourierRecord[]> {
  const query = new URLSearchParams({ search, page: String(page), length: String(length) });
  const res = await fetch(`${BASE}/list/?${query.toString()}`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchCourierById(unique_id: string): Promise<CourierRecord> {
  const res = await fetch(`${BASE}/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok || !json.status) throw new Error(json.error ?? "Courier not found");
  return json.data;
}

export async function createCourier(payload: CourierPayload) {
  const res = await fetch(`${BASE}/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, ...getCourierSessionPayload() }),
  });
  return safeJson(res);
}

export async function updateCourier(unique_id: string, payload: CourierPayload) {
  const res = await fetch(`${BASE}/${unique_id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, ...getCourierSessionPayload() }),
  });
  return safeJson(res);
}

export async function deleteCourier(unique_id: string) {
  const res = await fetch(`${BASE}/${unique_id}/`, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify(getCourierSessionPayload()),
  });
  return safeJson(res);
}
