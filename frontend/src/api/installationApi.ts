import api from "./axios";

const BASE = "/master/installation";

export type InstallationTab = "pending" | "uploaded" | "dcir_pending" | "dcir_completed";

export type InstallationRow = {
  s_no: number;
  source_unique_id: string;
  unique_id: string;
  canDelete: boolean;
  po_form_unique_id: string;
  po_auto_id: string;
  po_num: string;
  po_date: string;
  ledger_name: string;
  district: string;
  state: string;
  team_member: string;
  team_member_id: string;
  engineer_name: string;
  engineer_name_id: string;
  invoice_no: string;
  invoice_date: string;
  dc_number: string;
  dc_date: string;
  invoice_value: string;
  installation_alloc_date: string;
  consignee_unique_id: string;
  consignee_name: string;
  con_address: string;
  po_file_url: string;
  dc_file_url: string;
  ir_file_url: string;
  invoice_file_url: string;
  snr_file_url: string;
  documents_type: string;
  documents_type1: string;
  documents_type2: string;
  dc_required: string;
  dc_received_sts: string;
  ir_rec_status: string;
  snr_rec_status: string;
  status: string;
  dc_delivery_status: string;
};

export type InstallationDetail = InstallationRow & {
  invoice_auto_id: string;
  con_pincode: string;
  engg_type: string;
  installation_com_date: string;
  eng_remarks: string;
  in_charge: string;
  gst_percent: string;
  ttl_amnt: string;
  bill_address: string;
  customer_phone: string;
  customer_email: string;
  consignee_phone: string;
  customer_district: string;
  customer_state: string;
  document_type_label: string;
  vendor_engineer_type: string;
  vendor_engineer_name: string;
  vendor_engineer_id: string;
  vendor_installation_date: string;
  vendor_rate: string;
  vendor_gst: string;
  vendor_total_amount: string;
  vendor_assign_no: string;
  vendor_assign_date: string;
  vendor_assign_datetime: string;
  vendor_timeline: string;
  documents_type: string;
  documents_type1: string;
  documents_type2: string;
  dc_received_sts: string;
  dc_cus_signed_date: string;
  ir_rec_status: string;
  ir_cus_signed_date: string;
  snr_rec_status: string;
  snr_cus_signed_date: string;
  team_mem: string;
  dc_original_name: string;
  ir_original_name: string;
  snr_original_name: string;
  snr_file_url: string;
  dc_required: string;
  dc_delivery_status: string;
  without_snr: string;
  items?: Array<{
    item_code: string;
    product: string;
    item_qty: string;
    stock_qty: string;
    delivery_date: string;
    installation_date: string;
  }>;
};

export type InstallationDispatchDetail = Omit<InstallationDetail, "without_snr"> & {
  dispatch_unique_id: string;
  dc_dispatch_mode: string;
  name_of_courier: string;
  dc_pod_no: string;
  dc_pod_date: string;
  ir_dispatch_mode: string;
  ins_name_of_courier: string;
  ir_pod_no: string;
  ir_pod_date: string;
  snr_dispatch_mode: string;
  snr_name_courier: string;
  snr_pod_no: string;
  snr_pod_date: string;
  without_snr: boolean;
};

export type InstallationOption = {
  unique_id: string;
  label: string;
};

export async function fetchInstallationList(params: Record<string, string | number>) {
  const { data } = await api.get(`${BASE}/list/`, { params });
  return data as { status: boolean; data: InstallationRow[]; recordsTotal: number; recordsFiltered: number };
}

export async function fetchInstallationTeamMemberOptions() {
  const { data } = await api.get(`${BASE}/team-member-options/`);
  return data as { status: boolean; team_members: InstallationOption[] };
}

export async function fetchInstallationSourceDetail(sourceUniqueId: string) {
  const { data } = await api.get(`${BASE}/source/${sourceUniqueId}/`);
  return data as { status: boolean; data: InstallationDetail };
}

export async function fetchInstallationDetail(uniqueId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/`);
  return data as { status: boolean; data: InstallationDetail };
}

export async function createInstallation(payload: FormData) {
  const { data } = await api.post(`${BASE}/create/`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateInstallation(uniqueId: string, payload: FormData) {
  const { data } = await api.put(`${BASE}/${uniqueId}/update/`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchInstallationDispatchDetail(uniqueId: string) {
  const { data } = await api.get(`${BASE}/dispatch/${uniqueId}/`);
  return data as { status: boolean; data: InstallationDispatchDetail };
}

export async function saveInstallationDispatch(uniqueId: string, payload: Record<string, string | boolean>) {
  const { data } = await api.put(`${BASE}/dispatch/${uniqueId}/`, payload);
  return data as { status: boolean; message: string; dispatch_unique_id?: string };
}

export async function deleteInstallation(uniqueId: string, tab?: InstallationTab) {
  const { data } = await api.delete(`${BASE}/${encodeURIComponent(uniqueId)}/delete/`, {
    params: tab ? { tab } : undefined,
  });
  return data;
}
