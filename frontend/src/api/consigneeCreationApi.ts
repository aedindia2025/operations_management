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

function getCurrentAcademicYear() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
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

export interface ConsigneeCreationRecord {
  id: number;
  unique_id: string;
  consignee_address: string;
  consignee_district: string;
  consignee_district_name?: string;
  consignee_pincode: string;
  consignee_contactnumber: string;
  is_active: number;
  is_active_display?: string;
}

export interface ConsigneeCreationPayload {
  consignee_address: string;
  consignee_district: string;
  consignee_pincode: string;
  consignee_contactnumber: string;
  is_active: number;
  acc_year?: string;
  session_id?: string;
  sess_user_type?: string;
  sess_user_id?: string;
  sess_company_id?: string;
  sess_branch_id?: string;
}

export interface ConsigneeCreationListResponse {
  status: boolean;
  recordsTotal: number;
  recordsFiltered: number;
  data: ConsigneeCreationRecord[];
}

export interface DistrictOption {
  value: string;
  label: string;
}

export function getConsigneeSessionPayload() {
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

export async function fetchConsigneeCreationList(params?: {
  search?: string;
  page?: number;
  length?: number;
}): Promise<ConsigneeCreationListResponse> {
  const query = new URLSearchParams({
    search: params?.search ?? "",
    page: String(params?.page ?? 1),
    length: String(params?.length ?? 10),
  });
  const res = await fetch(`${BASE}/consignee-creation/list/?${query}`);
  return safeJson(res);
}

export async function fetchConsigneeCreationById(
  unique_id: string
): Promise<ConsigneeCreationRecord> {
  const res = await fetch(`${BASE}/consignee-creation/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok || !json.status) {
    throw new Error(json.error ?? "Consignee not found");
  }
  return json.data;
}

export async function createConsigneeCreation(payload: ConsigneeCreationPayload) {
  const res = await fetch(`${BASE}/consignee-creation/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, ...getConsigneeSessionPayload() }),
  });
  return safeJson(res);
}

export async function updateConsigneeCreation(
  unique_id: string,
  payload: ConsigneeCreationPayload
) {
  const res = await fetch(`${BASE}/consignee-creation/${unique_id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, ...getConsigneeSessionPayload() }),
  });
  return safeJson(res);
}

export async function deleteConsigneeCreation(unique_id: string) {
  const res = await fetch(`${BASE}/consignee-creation/${unique_id}/`, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify(getConsigneeSessionPayload()),
  });
  return safeJson(res);
}

export async function fetchConsigneeDistrictOptions(): Promise<DistrictOption[]> {
  const res = await fetch(`${BASE}/consignee-creation/options/districts/`);
  const json = await safeJson(res);
  return json.data ?? [];
}
