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
  console.log("safeJson raw →", res.status, text);
  try { return JSON.parse(text); }
  catch { throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`); }
}

export interface AccountVerticalRecord {
  unique_id    : string;
  account_name : string;
  is_active    : number;
}

export interface AccountVerticalListRow {
  s_no         : number;
  account_name : string;
  is_active    : string;
  unique_id    : string;
}

export interface AccountVerticalListResponse {
  draw            : number;
  recordsTotal    : number;
  recordsFiltered : number;
  data            : AccountVerticalListRow[];
}

export interface AccountVerticalPayload {
  account_name : string;
  is_active    : number;
}

export async function fetchAccountVerticalList(params?: {
  search? : string;
  start?  : number;
  length? : number;
}): Promise<AccountVerticalListResponse> {
  const query = new URLSearchParams({
    search : params?.search        ?? "",
    start  : String(params?.start  ?? 0),
    length : String(params?.length ?? 10),
    draw   : "1",
  });
  const res = await fetch(`${BASE}/account-vertical/list/?${query}`);
  return safeJson(res);
}

export async function fetchAccountVerticalById(
  unique_id: string
): Promise<AccountVerticalRecord> {
  const res  = await fetch(`${BASE}/account-vertical/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.error ?? "Not found");
  return json.data;
}

export async function createAccountVertical(payload: AccountVerticalPayload) {
  const res = await fetch(`${BASE}/account-vertical/list/`, {
    method  : "POST",
    headers : authHeaders(),
    body    : JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function updateAccountVertical(
  unique_id: string,
  payload: AccountVerticalPayload
) {
  const res = await fetch(`${BASE}/account-vertical/${unique_id}/`, {
    method  : "PUT",
    headers : authHeaders(),
    body    : JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function deleteAccountVertical(unique_id: string) {
  const res = await fetch(`${BASE}/account-vertical/${unique_id}/`, {
    method  : "DELETE",
    headers : authHeaders(),
  });
  return safeJson(res);
}