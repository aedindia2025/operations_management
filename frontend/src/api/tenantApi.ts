import api from "./axios";

export interface TenantCompany {
  unique_id: string;
  company_code: string;
  company_name: string;
  legal_name: string;
  contact_name: string;
  contact_email: string;
  contact_no: string;
  gst_no: string;
  pan_no: string;
  address: string;
  db_name: string;
  db_host: string;
  db_port: string;
  db_user: string;
  subscription_plan: string;
  subscription_status: string;
  is_active: number;
  is_delete: number;
  created?: string;
  updated?: string;
}

export interface TenantAdminUser {
  unique_id: string;
  name: string;
  staff_id: string;
  username: string;
  password: string;
  email: string;
  mobile: string;
}

export interface TenantCreatePayload {
  company_code: string;
  company_name: string;
  legal_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_no?: string;
  gst_no?: string;
  pan_no?: string;
  address?: string;
  branch_name?: string;
  subscription_plan?: string;
  subscription_status?: string;
  admin_name?: string;
  admin_staff_id?: string;
  admin_mobile?: string;
  admin_email?: string;
  admin_username?: string;
  admin_password?: string;
}

export type TenantUpdatePayload = Omit<
  TenantCreatePayload,
  "branch_name" | "admin_name" | "admin_staff_id" | "admin_mobile" | "admin_email" | "admin_username" | "admin_password"
>;

export interface TenantCreateResponse {
  status: number;
  msg: string;
  detail?: string;
  errors?: Record<string, string[]>;
  company?: TenantCompany;
  branch?: {
    unique_id: string;
    branch_name: string;
    branch_code: string;
    company_id: string;
  };
  admin_user?: {
    unique_id: string;
    username: string;
    password: string;
    sess_company_id: string;
    sess_branch_id: string;
  };
  cloned_setup?: Record<string, number>;
}

export interface TenantCompanyDetailResponse {
  company: TenantCompany;
  admin_user?: TenantAdminUser | null;
}

export interface TenantDeletePayload {
  owner_password: string;
  confirm_company_code: string;
}

function extractTenantError(data: TenantCreateResponse) {
  if (data.detail) return data.detail;
  if (data.errors) {
    return Object.entries(data.errors)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : String(messages)}`)
      .join("\n");
  }
  return "Failed to save tenant.";
}

export async function fetchTenantCompanies() {
  const { data } = await api.get("/master/tenants/companies/");
  return (data?.data ?? []) as TenantCompany[];
}

export async function fetchTenantCompany(uniqueId: string) {
  const { data } = await api.get(`/master/tenants/companies/${encodeURIComponent(uniqueId)}/`);
  if (!data?.status) throw new Error(data?.detail || "Failed to load tenant.");
  return data.company as TenantCompany;
}

export async function fetchTenantCompanyDetail(uniqueId: string) {
  const { data } = await api.get(`/master/tenants/companies/${encodeURIComponent(uniqueId)}/`);
  if (!data?.status) throw new Error(data?.detail || "Failed to load tenant.");
  return {
    company: data.company as TenantCompany,
    admin_user: (data.admin_user ?? null) as TenantAdminUser | null,
  } satisfies TenantCompanyDetailResponse;
}

export async function createTenantCompany(payload: TenantCreatePayload) {
  const { data } = await api.post("/master/tenants/companies/", payload);
  if (!data?.status) throw new Error(extractTenantError(data));
  return data as TenantCreateResponse;
}

export async function updateTenantCompany(uniqueId: string, payload: TenantUpdatePayload) {
  const { data } = await api.patch(`/master/tenants/companies/${encodeURIComponent(uniqueId)}/`, payload);
  if (!data?.status) throw new Error(extractTenantError(data));
  return data as TenantCreateResponse;
}

export async function deleteTenantCompany(uniqueId: string, payload: TenantDeletePayload) {
  const { data } = await api.delete(`/master/tenants/companies/${encodeURIComponent(uniqueId)}/`, {
    data: payload,
  });
  if (!data?.status) throw new Error(data?.detail || "Failed to delete tenant.");
  return data as { status: number; msg: string; detail?: string; disabled?: Record<string, number> };
}
