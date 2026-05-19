import api from "./axios";

const BASE = "/master/accounts-approval";

export type AccountsApprovalItem = {
  id: number;
  itemName: string;
  itemDesc: string;
  dcQty: number;
  invoiceValue: number;
  serialNo: string;
};

export type AccountsApprovalListParams = {
  search?: string;
  length?: number;
  start?: number;
  draw?: number;
  from_date?: string;
  to_date?: string;
  opt?: string;
  team_mem?: string;
  order_dir?: "asc" | "desc";
};

export type AccountsApprovalRow = {
  sno: number;
  unique_id: string;
  po_num: string;
  po_date: string;
  department_name: string;
  con_address: string;
  team_member: string;
  invoice_no: string;
  invoice_date: string;
  dc_number: string;
  dc_date: string;
  invoice_value: string;
  invoice_value_fmt: string;
  po_file: string;
  dc_file: string;
  ir_file: string;
  invoice_file: string;
  ac_verify_status: string;
  ac_team_verifiy_status: string | number;
  approved_by_name: string;
  ac_team_approved_by: string;
};

export type AccountsApprovalDetailRow = AccountsApprovalRow & {
  department_name: string;
  customer_address: string;
  vendor_contact: string;
  vendor_email: string;
  consignee_name: string;
  consignee_address: string;
  consignee_contact: string;
  approved_date: string;
  reject_reason: string;
  items: AccountsApprovalItem[];
};

export type AccountsApprovalPendingListRow = {
  sno: number;
  unique_id: string;
  po_num: string;
  department_name: string;
  dc_number: string;
  dc_date: string;
  invoice_no: string;
  invoice_date: string;
  po_date: string;
  con_address: string;
  po_file: string;
  dc_file: string;
  ir_file: string;
  invoice_file: string;
  compare_file: string;
  ac_team_verifiy_status: string | number;
  ac_verify_status: string;
  ac_team_approved_by: string;
  approved_by_name: string;
  doc_approval_sts: string | number;
};

export type AccountsApprovalListResponse<T> = {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: T[];
};

function extractError(error: unknown, fallback: string): string {
  const responseData = (error as { response?: { data?: { message?: string; error?: unknown; detail?: string } } }).response?.data;
  if (typeof responseData?.message === "string" && responseData.message.trim()) return responseData.message;
  if (typeof responseData?.detail === "string" && responseData.detail.trim()) return responseData.detail;
  if (typeof responseData?.error === "string" && responseData.error.trim()) return responseData.error;
  if (responseData?.error && typeof responseData.error === "object") return JSON.stringify(responseData.error);
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

async function getList<T>(url: string, params: AccountsApprovalListParams, fallback: string) {
  try {
    const { data } = await api.get(url, { params });
    return data as AccountsApprovalListResponse<T>;
  } catch (error) {
    throw new Error(extractError(error, fallback));
  }
}

export async function fetchAccountsApprovalPending(params: AccountsApprovalListParams) {
  return getList<AccountsApprovalRow>(`${BASE}/pending/`, params, "Failed to load pending accounts approval records.");
}

export async function fetchAccountsApprovalCompleted(params: AccountsApprovalListParams) {
  return getList<AccountsApprovalRow>(`${BASE}/completed/`, params, "Failed to load completed accounts approval records.");
}

export async function fetchAccountsApprovalPendingList(params: AccountsApprovalListParams) {
  return getList<AccountsApprovalPendingListRow>(`${BASE}/pending-list/`, params, "Failed to load accounts approval pending list.");
}

export async function fetchAccountsApprovalDetail(uniqueId: string) {
  try {
    const { data } = await api.get(`${BASE}/${uniqueId}/`);
    if (!data?.status) throw new Error(data?.error || data?.msg || "Failed to load accounts approval detail.");
    return data as { status: boolean; msg: string; error?: string; data: AccountsApprovalDetailRow };
  } catch (error) {
    throw new Error(extractError(error, "Failed to load accounts approval detail."));
  }
}

export async function submitAccountsApprovalDecision(payload: {
  invoice_unique_id: string;
  dc_number: string;
  ac_team_verifiy_status: "1" | "2";
  ac_reason_reject?: string;
  approved_by: string;
}) {
  try {
    const { data } = await api.post(`${BASE}/approve-reject/`, payload);
    if (!data?.status) throw new Error(data?.error || data?.msg || "Failed to save accounts approval.");
    return data as { status: boolean; msg: string; error?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to save accounts approval."));
  }
}

export async function submitAccountsOverallApproval(payload: {
  invoice_unique_ids: string[];
  dc_numbers: string[];
  approved_by: string;
}) {
  try {
    const { data } = await api.post(`${BASE}/overall-approval/`, payload);
    if (!data?.status) throw new Error(data?.error || data?.msg || "Failed to approve selected records.");
    return data as { status: boolean; msg: string; error?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to approve selected records."));
  }
}

export async function deleteAccountsApproval(uniqueId: string) {
  try {
    const { data } = await api.delete(`${BASE}/${uniqueId}/delete/`);
    if (!data?.status) throw new Error(data?.error || data?.msg || "Failed to delete accounts approval record.");
    return data as { status: boolean; msg?: string; error?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to delete accounts approval record."));
  }
}
