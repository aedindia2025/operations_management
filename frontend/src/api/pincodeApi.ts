const BASE = "/api/master/pincode";

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

export interface PincodeRecord {
  unique_id: string;
  state_name: string;
  district_name: string;
  city_name: string;
  pincode: string;
  is_active: number;
}

export interface PincodeListRow extends PincodeRecord {
  s_no?: number;
  state_name_display?: string;
  district_name_display?: string;
  city_name_display?: string;
  is_active_display?: string;
}

export interface PincodeListResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: PincodeListRow[];
}

export interface StateOption {
  unique_id: string;
  state_name: string;
}

export interface DistrictOption {
  unique_id: string;
  district_name: string;
}

export interface CityOption {
  unique_id: string;
  city_name: string;
}

export async function fetchPincodeList(params?: {
  search?: string;
  start?: number;
  length?: number;
}): Promise<PincodeListResponse> {
  const res = await fetch(`${BASE}/list/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      draw: 1,
      start: params?.start ?? 0,
      length: params?.length ?? 10,
      search: { value: params?.search ?? "" },
    }),
  });
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.message ?? "Failed to load pincode list");
  return json;
}

export async function fetchPincodeById(unique_id: string): Promise<PincodeRecord> {
  const res = await fetch(`${BASE}/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.message ?? "Pincode not found");
  return json.data;
}

export async function createPincode(payload: Omit<PincodeRecord, "unique_id">) {
  const res = await fetch(`${BASE}/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function updatePincode(unique_id: string, payload: Omit<PincodeRecord, "unique_id">) {
  const res = await fetch(`${BASE}/${unique_id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function deletePincode(unique_id: string) {
  const res = await fetch(`${BASE}/${unique_id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return safeJson(res);
}

export async function fetchPincodeStateOptions(): Promise<StateOption[]> {
  const res = await fetch(`${BASE}/options/states/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.message ?? "Failed to load states");
  return json.data ?? [];
}

export async function fetchPincodeDistrictOptions(state_name: string): Promise<DistrictOption[]> {
  const query = new URLSearchParams({ state_name });
  const res = await fetch(`${BASE}/options/districts/?${query}`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.message ?? "Failed to load districts");
  return json.data ?? [];
}

export async function fetchPincodeCityOptions(district_name: string, state_name?: string): Promise<CityOption[]> {
  const query = new URLSearchParams({ district_name });
  if (state_name) {
    query.set("state_name", state_name);
  }
  const res = await fetch(`${BASE}/options/cities/?${query}`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.message ?? "Failed to load cities");
  return json.data ?? [];
}
