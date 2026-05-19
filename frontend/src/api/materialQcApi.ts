import api from "./axios";

const BASE = "/master/material-qc";

export type MaterialQcTab = "pending" | "completed";

export type MaterialQcListParams = {
  tab?: MaterialQcTab;
  search?: string;
  page?: number;
  length?: number;
  from_date?: string;
  to_date?: string;
  opt?: string;
  team_mem?: string;
};

export type MaterialQcListRow = {
  id: string;
  invoice_unique_id: string;
  po_num: string;
  po_date: string;
  con_address: string;
  team_member: string;
  invoice_no: string;
  invoice_date: string;
  dc_number: string;
  dc_date: string;
  invoice_value: number | string;
  po_file_name: string;
  dc_file_name: string;
  ir_file_name: string;
  invoice_file_name: string;
  has_po: boolean;
  has_dc: boolean;
  has_ir: boolean;
  has_invoice: boolean;
  has_compare: boolean;
  ac_team_verifiy_status: number | string;
  ac_team_status_label: string;
  ac_team_approved_by: string;
  ac_team_approved_name: string;
  material_qc: number | string;
  material_qc_status_label: string;
  material_qc_reject_reason: string;
  material_qc_approved: string;
  material_qc_approved_name: string;
  ledger_name: string;
};

export type MaterialQcListResponse = {
  status: boolean;
  recordsTotal: number;
  recordsFiltered: number;
  data: MaterialQcListRow[];
};

export type MaterialQcItemRow = {
  s_no: number;
  unique_id: string;
  item_code: string;
  product: string;
  qty: number;
  value: number;
};

export type MaterialQcDetail = {
  id: number;
  invoice_unique_id: string;
  form_main_unique_id: string;
  invoice_auto_id: string;
  invoice_no: string;
  invoice_date: string;
  consignee_unique_id: string;
  dc_number: string;
  dc_date: string;
  material_qc: number | string;
  material_qc_status_label: string;
  material_qc_reject_reason: string;
  material_qc_approved: string;
  material_qc_approved_name: string;
  material_qc_editable: boolean;
  approved_date: string;
  po_num: string;
  po_date: string;
  department: string;
  executive_name: string;
  ledger_name: string;
  ledger_no: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  customer_email: string;
  consignee_name: string;
  consignee_address: string;
  consignee_phone1: string;
  consignee_phone2: string;
  items: MaterialQcItemRow[];
};

export type MaterialQcDecisionPayload = {
  dc_number: string;
  material_qc_status: number;
  approved_by: string;
  ac_reason_reject?: string;
};

function extractError(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: { message?: string; msg?: string; error?: unknown; detail?: string } } }).response?.data;
  if (typeof responseData?.message === "string" && responseData.message.trim()) return responseData.message;
  if (typeof responseData?.msg === "string" && responseData.msg.trim()) return responseData.msg;
  if (typeof responseData?.detail === "string" && responseData.detail.trim()) return responseData.detail;
  if (typeof responseData?.error === "string" && responseData.error.trim()) return responseData.error;
  if (responseData?.error && typeof responseData.error === "object") return JSON.stringify(responseData.error);
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export async function fetchMaterialQcList(params: MaterialQcListParams) {
  try {
    const { data } = await api.get(`${BASE}/list/`, { params });
    return data as MaterialQcListResponse;
  } catch (error) {
    throw new Error(extractError(error, "Failed to load material QC records."));
  }
}

export async function fetchMaterialQcDetail(id: string | number) {
  try {
    const { data } = await api.get(`${BASE}/${id}/`);
    if (!data?.status) throw new Error(data?.message || data?.msg || "Failed to load material QC detail.");
    return data as { status: boolean; data: MaterialQcDetail; message?: string; msg?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to load material QC detail."));
  }
}

export async function createMaterialQc(payload: MaterialQcDecisionPayload) {
  try {
    const { data } = await api.post(`${BASE}/create/`, payload);
    if (!data?.status) throw new Error(data?.message || data?.msg || "Failed to save material QC.");
    return data as { status: boolean; msg?: string; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to save material QC."));
  }
}

export async function updateMaterialQc(id: string | number, payload: MaterialQcDecisionPayload) {
  try {
    const { data } = await api.put(`${BASE}/${id}/update/`, payload);
    if (!data?.status) throw new Error(data?.message || data?.msg || "Failed to update material QC.");
    return data as { status: boolean; msg?: string; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to update material QC."));
  }
}

export async function deleteMaterialQc(id: string | number) {
  try {
    const { data } = await api.delete(`${BASE}/${id}/delete/`);
    if (!data?.status) throw new Error(data?.message || data?.msg || "Failed to delete material QC.");
    return data as { status: boolean; msg?: string; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to delete material QC."));
  }
}