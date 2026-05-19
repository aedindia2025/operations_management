import { getApiBaseUrl } from "./axios";

const BASE = `${getApiBaseUrl()}/auth`;

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
  }
}

export interface AuthMenuScreen {
  unique_id: string;
  name: string;
  folder_name: string;
  icon_name: string;
  main_screen_unique_id: string;
  section_unique_id: string;
  actions: string[];
}

export interface AuthMenuSection {
  unique_id: string;
  name: string;
  screens: AuthMenuScreen[];
}

export interface AuthMenuGroup {
  unique_id: string;
  name: string;
  sections: AuthMenuSection[];
}

export interface AuthUser {
  id: string;
  unique_id: string;
  staff_id?: string;
  staff_name?: string;
  username: string;
  name: string;
  role: string;
  user_type_unique_id: string;
  acc_year?: string;
  session_id?: string;
  sess_user_type?: string;
  sess_user_id?: string;
  sess_company_id?: string;
  company_code?: string;
  company_name?: string;
  sess_branch_id?: string;
  main_screens: string[];
  sections: string[];
  screens: string[];
  menus: AuthMenuGroup[];
}

export interface LoginResponse {
  status: number;
  msg: string;
  access_token?: string;
  detail?: string;
  user?: AuthUser;
}

export async function loginUser(companyCode: string, username: string, password: string): Promise<LoginResponse> {
  const trimmedCompanyCode = companyCode.trim();
  const payload = trimmedCompanyCode
    ? { company_code: trimmedCompanyCode, username, password }
    : { username, password };
  const res = await fetch(`${BASE}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await safeJson(res);
  if (!res.ok) {
    throw new Error(json.detail ?? "Login failed");
  }
  return json;
}

export async function fetchCurrentUser(token: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/me/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await safeJson(res);
  if (!res.ok) {
    throw new Error(json.detail ?? "Failed to refresh user");
  }
  return json;
}
