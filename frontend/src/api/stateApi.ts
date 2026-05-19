const BASE = "/api/master";

// ── CSRF helper (Django requires this for POST/PUT/DELETE) ────────────
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

// ── Safe JSON parser ─────────────────────────────────────────────────
async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Django returned an HTML error page — surface the status
    throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
  }
}

// ── Interfaces ───────────────────────────────────────────────────────
export interface StateRecord {
  unique_id  : string;
  state_name : string;
  short_name : string;
  is_active  : number;
}

export interface StateListResponse {
  draw            : number;
  recordsTotal    : number;
  recordsFiltered : number;
  data            : {
    s_no       : number;
    state_name : string;
    short_name : string;
    is_active  : string;
    unique_id  : string;
  }[];
}

export interface StatePayload {
  state_name : string;
  short_name : string;
  is_active  : number;
}

// ── API functions ────────────────────────────────────────────────────

// GET /api/master/state/list/
export async function fetchStateList(params?: {
  search?: string;
  start?  : number;
  length? : number;
}): Promise<StateListResponse> {
  const query = new URLSearchParams({
    search : params?.search        ?? "",
    start  : String(params?.start  ?? 0),
    length : String(params?.length ?? 10),
    draw   : "1",
  });
  const res = await fetch(`${BASE}/state/list/?${query}`);
  return safeJson(res);
}

// GET /api/master/state/<unique_id>/
export async function fetchStateById(unique_id: string): Promise<StateRecord> {
  const res  = await fetch(`${BASE}/state/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.error ?? "State not found");
  return json.data;
}

// POST /api/master/state/list/
export async function createState(payload: StatePayload) {
  const res = await fetch(`${BASE}/state/list/`, {
    method  : "POST",
    headers : authHeaders(),
    body    : JSON.stringify(payload),
  });
  return safeJson(res);
}

// PUT /api/master/state/<unique_id>/
export async function updateState(unique_id: string, payload: StatePayload) {
  const res = await fetch(`${BASE}/state/${unique_id}/`, {
    method  : "PUT",
    headers : authHeaders(),
    body    : JSON.stringify(payload),
  });
  return safeJson(res);
}

// DELETE /api/master/state/<unique_id>/
export async function deleteState(unique_id: string) {
  const res = await fetch(`${BASE}/state/${unique_id}/`, {
    method  : "DELETE",
    headers : authHeaders(),
  });
  return safeJson(res);
}