const BASE = "/api/master";

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}
function authHeaders(): HeadersInit {
  return { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") };
}
async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`); }
}

export interface OptionRow { unique_id: string; label: string; }
export interface UserScreenRecord {
  unique_id: string; main_screen_unique_id: string; screen_section_unique_id: string; screen_name: string;
  folder_name: string; actions: string; action_list: string[]; icon_name: string; order_no: number;
  is_active: number; description: string; dashboard_setting_menu?: string;
  main_screen_display?: string; screen_section_display?: string;
}
export interface UserScreenListRow { s_no: number; screen_name: string; section_screen: string; main_screen: string; order_no: number; is_active: string; unique_id: string; }
export interface UserScreenListResponse { draw: number; recordsTotal: number; recordsFiltered: number; data: UserScreenListRow[]; }

export async function fetchUserScreenOptions() {
  const res = await fetch(`${BASE}/user-screen/options/`);
  return safeJson(res);
}
export async function fetchUserScreenSections(main_screen_unique_id: string) {
  const res = await fetch(`${BASE}/user-screen/sections/?main_screen_unique_id=${encodeURIComponent(main_screen_unique_id)}`);
  return safeJson(res);
}
export async function fetchUserScreenList(params?: { search?: string; start?: number; length?: number; }): Promise<UserScreenListResponse> {
  const query = new URLSearchParams({ search: params?.search ?? "", start: String(params?.start ?? 0), length: String(params?.length ?? 10), draw: "1" });
  const res = await fetch(`${BASE}/user-screen/list/?${query}`);
  return safeJson(res);
}
export async function fetchUserScreenById(unique_id: string): Promise<UserScreenRecord> {
  const res = await fetch(`${BASE}/user-screen/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json.error ?? "Not found");
  return json.data;
}
export async function saveUserScreen(payload: Partial<UserScreenRecord> & { actions: string[]; unique_id?: string }) {
  const res = await fetch(`${BASE}/user-screen/list/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  return safeJson(res);
}
export async function deleteUserScreen(unique_id: string) {
  const res = await fetch(`${BASE}/user-screen/${unique_id}/`, { method: "DELETE", headers: authHeaders() });
  return safeJson(res);
}
