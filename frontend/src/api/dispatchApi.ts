import api from "./axios";

const BASE = "/master/dispatch";

export interface DispatchPendingRow {
  unique_id: string;
  s_no?: number;
  form_main_unique_id?: string;
  consignee_unique_id?: string;
  dc_number?: string;
  po_num?: string;
  po_date?: string;
  con_address?: string;
  team_member?: string;
  invoice_auto_id?: string;
  dc_date?: string;
  invoice_qty?: number | string;
  invoice_value?: string;
  doc_approval_status?: string;
  ac_team_status?: string;
  material_qc_status?: string;
  invoice_no?: string;
  invoice_date?: string;
  ledger_name?: string;
  action_mode?: string;
}

export interface DispatchTransitRow {
  unique_id: string;
  s_no?: number;
  po_form_unique_id?: string;
  consignee_unique_id?: string;
  po_num?: string;
  po_date?: string;
  con_address?: string;
  team_member?: string;
  invoice_date?: string;
  dc_date?: string;
  dispatch_date?: string;
  mode_of_delivery?: string | number;
  mode_of_delivery_text?: string;
  name_of_courier?: string;
  pod_no?: string;
  status?: string | number;
  delivery_status_text?: string;
  einvoice?: string;
  einvoice_url?: string;
  invoice_auto_id?: string;
  invoice_no?: string;
  ledger_name?: string;
  dc_number?: string;
  action_mode?: string;
}

export interface DispatchDeliveryRow {
  unique_id: string;
  s_no?: number;
  po_form_unique_id?: string;
  consignee_unique_id?: string;
  po_num?: string;
  po_date?: string;
  con_address?: string;
  team_member?: string;
  invoice_no?: string;
  dc_date?: string;
  pod_no?: string;
  dc_file?: string;
  ir_file_org_name?: string;
  invoice_file_org_name?: string;
  einvoice?: string;
  delivery_status_text?: string;
  delivery_date?: string;
  delivery_proof?: string;
  pod_proof?: string;
  invoice_auto_id?: string;
  invoice_date?: string;
  ledger_name?: string;
  dc_number?: string;
  dc_file_url?: string;
  ir_file_url?: string;
  invoice_file_url?: string;
  einvoice_url?: string;
  delivery_proof_url?: string;
  pod_proof_url?: string;
  action_mode?: string;
}

export interface DispatchListResponse<T> {
  status: boolean;
  recordsTotal: number;
  recordsFiltered: number;
  data: T[];
}

export type DispatchTransitDetail = {
  po_num: string;
  po_date: string;
  invoice_no: string;
  invoice_date: string;
  dc_no: string;
  dc_date: string;
  customer_name: string;
  customer_address: string;
  customer_district: string;
  customer_state: string;
  customer_pincode: string;
  customer_contact: string;
  customer_email: string;
  consignee_name: string;
  consignee_address: string;
  consignee_district: string;
  consignee_state: string;
  consignee_pincode: string;
  consignee_contact: string;
  consignee_landline: string;
  dispatch_date: string;
  mode_of_delivery: string;
  name_of_courier: string;
  pod_no: string;
  delivery_status: string;
  delivery_date: string;
  delivery_proof: string;
  pod_proof: string;
  po_form_unique_id: string;
  consignee_unique_id: string;
  unique_id: string;
};

export type DispatchDeliveryDetail = {
  po_num: string;
  po_date: string;
  invoice_no: string;
  invoice_date: string;
  dc_no: string;
  dc_date: string;
  customer_name: string;
  customer_address: string;
  customer_district: string;
  customer_state: string;
  customer_pincode: string;
  customer_contact: string;
  customer_email: string;
  consignee_name: string;
  consignee_address: string;
  consignee_district: string;
  consignee_state: string;
  consignee_pincode: string;
  consignee_contact: string;
  consignee_landline: string;
  dispatch_date: string;
  mode_of_delivery: string;
  name_of_courier: string;
  pod_no: string;
  delivery_status: string;
  delivery_date: string;
  delivery_proof: string;
  pod_proof: string;
  delivery_proof_url: string;
  pod_proof_url: string;
  po_form_unique_id: string;
  consignee_unique_id: string;
  unique_id: string;
};

export async function fetchDispatchPending(params?: Record<string, string | number | undefined>) {
  const { data } = await api.get<DispatchListResponse<DispatchPendingRow>>(`${BASE}/pending/`, { params });
  return data;
}

export async function fetchDispatchTransit(params?: Record<string, string | number | undefined>) {
  const { data } = await api.get<DispatchListResponse<DispatchTransitRow>>(`${BASE}/transit/`, { params });
  return data;
}

export async function fetchDispatchDelivery(params?: Record<string, string | number | undefined>) {
  const { data } = await api.get<DispatchListResponse<DispatchDeliveryRow>>(`${BASE}/delivery/`, { params });
  return data;
}

export async function createDispatch(payload: FormData) {
  const { data } = await api.post(`${BASE}/create/`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { status: boolean; msg?: string; message?: string };
}

export async function fetchDispatchTransitDetail(params: {
  unique_id: string;
  consignee_unique_id: string;
  dc_no: string;
}) {
  const { data } = await api.get<{ status: boolean; data: DispatchTransitDetail; error?: string }>(`${BASE}/transit/detail/`, {
    params,
  });
  return data;
}

export async function updateDispatchTransit(payload: FormData) {
  const { data } = await api.post(`${BASE}/transit/update/`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { status: boolean; msg?: string; message?: string; error?: string };
}

export async function fetchDispatchDeliveryDetail(params: {
  unique_id: string;
  consignee_unique_id: string;
  dc_no: string;
}) {
  const { data } = await api.get<{ status: boolean; data: DispatchDeliveryDetail; error?: string }>(`${BASE}/delivery/detail/`, {
    params,
  });
  return data;
}

export async function updateDispatchDelivery(payload: FormData) {
  const { data } = await api.post(`${BASE}/delivery/update/`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { status: boolean; msg?: string; message?: string; error?: string };
}

export async function deleteDispatch(uniqueId: string) {
  const { data } = await api.delete(`${BASE}/${encodeURIComponent(uniqueId)}/delete/`);
  return data as { status: boolean; msg?: string; message?: string; error?: string };
}
