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
  try { return JSON.parse(text); }
  catch { throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`); }
}

// ── Interfaces ───────────────────────────────────────────────────────

export interface AccountSectorRecord {
  unique_id   : string;
  sector_name : string;
  is_active   : number;
}

export interface AccountSectorListRow {
  s_no        : number;
  sector_name : string;
  is_active   : string;
  unique_id   : string;
}

export interface AccountSectorListResponse {
  draw            : number;
  recordsTotal    : number;
  recordsFiltered : number;
  data            : AccountSectorListRow[];
}

export interface AccountSectorPayload {
  sector_name : string;
  is_active   : number;
}

// ── API Functions ────────────────────────────────────────────────────

// GET /api/master/account-sector/list/
export async function fetchAccountSectorList(params?: {
  search? : string;
  start?  : number;
  length? : number;
}): Promise<AccountSectorListResponse> {
  const query = new URLSearchParams({
    search : params?.search        ?? "",
    start  : String(params?.start  ?? 0),
    length : String(params?.length ?? 10),
    draw   : "1",
  });
  const res = await fetch(`${BASE}/account-sector/list/?${query}`);
  return safeJson(res);
}

// GET /api/master/account-sector/<unique_id>/
export async function fetchAccountSectorById(
  unique_id: string
): Promise<AccountSectorRecord> {
  const res  = await fetch(`${BASE}/account-sector/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.error ?? "Not found");
  return json.data;
}

// POST /api/master/account-sector/list/
export async function createAccountSector(payload: AccountSectorPayload) {
  const res = await fetch(`${BASE}/account-sector/list/`, {
    method  : "POST",
    headers : authHeaders(),
    body    : JSON.stringify(payload),
  });
  return safeJson(res);
}

// PUT /api/master/account-sector/<unique_id>/
export async function updateAccountSector(
  unique_id: string,
  payload: AccountSectorPayload
) {
  const res = await fetch(`${BASE}/account-sector/${unique_id}/`, {
    method  : "PUT",
    headers : authHeaders(),
    body    : JSON.stringify(payload),
  });
  return safeJson(res);
}

// DELETE /api/master/account-sector/<unique_id>/
export async function deleteAccountSector(unique_id: string) {
  const res = await fetch(`${BASE}/account-sector/${unique_id}/`, {
    method  : "DELETE",
    headers : authHeaders(),
  });
  return safeJson(res);
}