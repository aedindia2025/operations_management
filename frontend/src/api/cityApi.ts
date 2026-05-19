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

export interface CityRecord {
  unique_id: string;
  state_name: string;
  district_name: string;
  city_name: string;
  is_active: number;
  is_delete?: number;
}

export interface CityListRow {
  s_no: number;
  unique_id: string;
  state_name: string;
  district_name: string;
  city_name: string;
  is_active: string;
}

export interface CityListResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: CityListRow[];
}

export interface CityPayload {
  state_name: string;
  district_name: string;
  city_name: string;
  is_active: number;
}

export interface StateOption {
  unique_id: string;
  state_name: string;
}

export interface DistrictOption {
  unique_id: string;
  district_name: string;
}

export async function fetchCityStateOptions(): Promise<StateOption[]> {
  const res = await fetch(`${BASE}/city/state-options/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.message ?? "Failed to load states");
  return json.data ?? [];
}

export async function fetchCityDistrictOptions(stateId: string): Promise<DistrictOption[]> {
  const query = new URLSearchParams({ state_name: stateId });
  const res = await fetch(`${BASE}/city/district-options/?${query}`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.message ?? "Failed to load districts");
  return json.data ?? [];
}

export async function fetchCityList(params?: {
  search?: string;
  start?: number;
  length?: number;
}): Promise<CityListResponse> {
  const res = await fetch(`${BASE}/city/list/`, {
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
  if (!res.ok) throw new Error(json.message ?? "Failed to load city list");
  return json;
}

export async function fetchCityById(unique_id: string): Promise<CityRecord> {
  const res = await fetch(`${BASE}/city/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.message ?? "City not found");
  return json.data;
}

export async function createCity(payload: CityPayload) {
  const res = await fetch(`${BASE}/city/create/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function updateCity(unique_id: string, payload: CityPayload) {
  const res = await fetch(`${BASE}/city/${unique_id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function deleteCity(unique_id: string) {
  const res = await fetch(`${BASE}/city/${unique_id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return safeJson(res);
}
