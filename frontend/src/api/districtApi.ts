const BASE = "/api/master";

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-CSRFToken" : getCookie("csrftoken"),
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

export async function importDistrict(formData: FormData) {
  const res = await fetch("/api/master/district/import/", {
    method: "POST",
    body: formData, // DO NOT set Content-Type — browser sets it automatically
  });
  return res.json();
}

// ── Interfaces ───────────────────────────────────────────────────────

export interface DistrictRecord {
  unique_id     : string;
  district_name : string;
  state_name    : string;   // state unique_id
  is_active     : number;
}

export interface DistrictListRow {
  s_no          : number;
  district_name : string;
  state_name    : string;   // display name (joined)
  state_uid     : string;   // state unique_id
  is_active     : string;
  unique_id     : string;
}

export interface DistrictListResponse {
  draw            : number;
  recordsTotal    : number;
  recordsFiltered : number;
  data            : DistrictListRow[];
}

export interface DistrictPayload {
  district_name : string;
  state_name    : string;   // state unique_id
  is_active     : number;
}

export interface StateOption {
  unique_id  : string;
  state_name : string;
}

// ── API Functions ────────────────────────────────────────────────────

// GET /api/master/district/state-options/
export async function fetchStateOptions(): Promise<StateOption[]> {
  const res  = await fetch(`${BASE}/district/state-options/`);
  const json = await safeJson(res);
  return json.data;
}

// GET /api/master/district/list/
export async function fetchDistrictList(params?: {
  search? : string;
  start?  : number;
  length? : number;
}): Promise<DistrictListResponse> {
  const query = new URLSearchParams({
    search : params?.search        ?? "",
    start  : String(params?.start  ?? 0),
    length : String(params?.length ?? 10),
    draw   : "1",
  });
  const res = await fetch(`${BASE}/district/list/?${query}`);
  return safeJson(res);
}

// GET /api/master/district/<unique_id>/
export async function fetchDistrictById(unique_id: string): Promise<DistrictRecord> {
  const res  = await fetch(`${BASE}/district/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.error ?? "District not found");
  return json.data;
}

// POST /api/master/district/list/
export async function createDistrict(payload: DistrictPayload) {
  const res = await fetch(`${BASE}/district/list/`, {
    method  : "POST",
    headers : authHeaders(),
    body    : JSON.stringify(payload),
  });
  return safeJson(res);
}

// PUT /api/master/district/<unique_id>/
export async function updateDistrict(unique_id: string, payload: DistrictPayload) {
  const res = await fetch(`${BASE}/district/${unique_id}/`, {
    method  : "PUT",
    headers : authHeaders(),
    body    : JSON.stringify(payload),
  });
  return safeJson(res);
}

// DELETE /api/master/district/<unique_id>/
export async function deleteDistrict(unique_id: string) {
  const res = await fetch(`${BASE}/district/${unique_id}/`, {
    method  : "DELETE",
    headers : authHeaders(),
  });
  return safeJson(res);
}