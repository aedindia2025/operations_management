const BASE = "/api/master/vendor";

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

function toVendorFormData(payload: VendorCreationPayload): FormData {
  const form = new FormData();
  const entries: Array<[keyof VendorCreationPayload, string | number | undefined]> = [
    ["vendor_id", payload.vendor_id],
    ["company_name", payload.company_name],
    ["name", payload.name],
    ["contact_no", payload.contact_no],
    ["alt_contact_no", payload.alt_contact_no],
    ["mail_id", payload.mail_id],
    ["pan_no", payload.pan_no],
    ["gst_no", payload.gst_no],
    ["address", payload.address],
    ["state_name", payload.state_name],
    ["district_name", payload.district_name],
    ["zone_name", payload.zone_name],
    ["pincode", payload.pincode],
    ["bank_name", payload.bank_name],
    ["branch_name", payload.branch_name],
    ["account_no", payload.account_no],
    ["ifsc_code", payload.ifsc_code],
    ["acc_holder_name", payload.acc_holder_name],
    ["user_name", payload.user_name],
    ["password", payload.password],
    ["confirm_password", payload.confirm_password],
    ["is_active", payload.is_active],
  ];

  entries.forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });

  if (payload.pan_copy) {
    form.append("pan_file", payload.pan_copy);
  }
  if (payload.bank_proof) {
    form.append("bank_file", payload.bank_proof);
  }

  return form;
}

export interface VendorCreationRecord {
  unique_id: string;
  vendor_id?: string;
  company_name: string;
  name: string;
  contact_no: string;
  alt_contact_no?: string;
  mail_id?: string;
  pan_no?: string;
  gst_no?: string;
  address?: string;
  state_name?: string;
  district_name?: string;
  zone_name?: string;
  pincode?: string;
  bank_name?: string;
  branch_name?: string;
  account_no?: string;
  ifsc_code?: string;
  acc_holder_name?: string;
  user_name?: string;
  password?: string;
  confirm_password?: string;
  is_active: number;
  pan_attach_file_name?: string;
  pan_attach_file_org_name?: string;
  bank_proof?: string;
  bank_proof_org_name?: string;
  state_name_display?: string;
  district_name_display?: string;
  is_active_display?: string;
}

export interface VendorCreationPayload {
  vendor_id?: string;
  company_name: string;
  name: string;
  contact_no: string;
  alt_contact_no?: string;
  mail_id?: string;
  pan_no?: string;
  gst_no?: string;
  address?: string;
  state_name?: string;
  district_name?: string;
  zone_name?: string;
  pincode?: string;
  bank_name?: string;
  branch_name?: string;
  account_no?: string;
  ifsc_code?: string;
  acc_holder_name?: string;
  user_name?: string;
  password?: string;
  confirm_password?: string;
  is_active: number;
  pan_copy?: File | null;
  bank_proof?: File | null;
}

export interface VendorStateOption {
  unique_id: string;
  state_name: string;
}

export interface VendorDistrictOption {
  unique_id: string;
  district_name: string;
}

export async function fetchVendorCreationList(): Promise<VendorCreationRecord[]> {
  const res = await fetch(`${BASE}/list/`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchVendorCreationById(unique_id: string): Promise<VendorCreationRecord> {
  const res = await fetch(`${BASE}/${unique_id}/`);
  const json = await safeJson(res);
  if (!res.ok || !json.status) throw new Error(json.error ?? "Vendor not found");
  return json.data;
}

export async function createVendorCreation(payload: VendorCreationPayload) {
  const res = await fetch(`${BASE}/create/`, {
    method: "POST",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: toVendorFormData(payload),
  });
  return safeJson(res);
}

export async function updateVendorCreation(unique_id: string, payload: VendorCreationPayload) {
  const res = await fetch(`${BASE}/${unique_id}/`, {
    method: "PUT",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: toVendorFormData(payload),
  });
  return safeJson(res);
}

export async function deleteVendorCreation(unique_id: string) {
  const res = await fetch(`${BASE}/${unique_id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return safeJson(res);
}

export async function fetchVendorStateOptions(): Promise<VendorStateOption[]> {
  const res = await fetch(`${BASE}/options/states/`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchVendorDistrictOptions(state_name: string): Promise<VendorDistrictOption[]> {
  const query = new URLSearchParams({ state_name });
  const res = await fetch(`${BASE}/options/districts/?${query}`);
  const json = await safeJson(res);
  return json.data ?? [];
}

export async function fetchVendorId(state_name: string): Promise<string> {
  const query = new URLSearchParams({ state_name });
  const res = await fetch(`${BASE}/generate-id/?${query}`);
  const json = await safeJson(res);
  return json.vendor_id ?? "";
}
