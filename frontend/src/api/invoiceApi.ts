import api from "./axios";

const BASE = "/master/invoice-dc";

export type InvoiceTab = "pending" | "completed";

export type InvoiceItemRow = {
  s_no: number;
  unique_id: string;
  item_code: string;
  name: string;
  part_no: string;
  order_qty: number;
  bill_qty: number;
  stock_qty: number;
  invoice_bill_qty: number;
  remaining_qty: number;
  serial_selection: string;
  serial_numbers: string;
  spec_serial_count: number;
  mon_serial_numbers: string;
  stock_id: string;
  product_unique_id: string;
};

export type InvoiceDocRow = {
  s_no: number;
  unique_id: string;
  consignee_name: string;
  ledger_display: string;
  dc_display: string;
  invoice_display: string;
  dc_file_url: string;
  dc_original_name: string;
  ir_file_url: string;
  ir_original_name: string;
  invoice_file_url: string;
  invoice_original_name: string;
};

export type ApprovalBlock = {
  status: string;
  status_icon: string;
  label_by: string;
  label_date: string;
  by: string;
  date: string;
  reason: string;
};


export type InvoiceRow = {
  s_no: number;
  unique_id: string;
  po_num: string;
  po_date: string;
  stock_id: string;
  customer_name: string;
  customer_location: string;
  billing_address: string;
  billing_gst_no: string;
  consignee_name: string;
  consignee_address: string;
  branch: string;
  branch_code: string;
  district_name: string;
  zone: string;
  state_name: string;
  pincode: string;
  contact_name: string;
  contact_number: string;
  alternate_contact_name: string;
  alternate_contact_number: string;
  consignee_gst_no: string;
  executive_name: string;
  executive_display: string;
  team_member: string;
  dc_number: string;
  invoice_no: string;
  assign_qty: number;
  remaining_qty: number;
  bill_qty: number;
  balance_qty: number;
  invoice_qty: number;
  invoice_value: string;
  invoice_doc_status: string;
  invoice_doc_status_label: string;
  consignee_verify_status?: string;
  doc_approval_status?: string;
  ac_approval_status?: string;
  reject_reason_elcot: string;
  status: string;
};

export type InvoiceDetail = {
  unique_id: string;
  source_unique_id: string;
  form_main_unique_id: string;
  po_unique_id: string;
  po_num: string;
  po_date: string;
  stock_id: string;
  stock_date: string;
  department: string;
  department_display: string;
  gst_option: string;
  customer_name: string;
  customer_details: string;
  district_name: string;
  state_name: string;
  customer_location: string;
  executive_name: string;
  executive_display: string;
  team_member: string;
  billing_address: string;
  billing_gst_no: string;
  consignee_name: string;
  consignee_address: string;
  branch: string;
  branch_code: string;
  zone: string;
  pincode: string;
  contact_name: string;
  contact_number: string;
  alternate_contact_name: string;
  alternate_contact_number: string;
  consignee_gst_no: string;
  email: string;
  ledger_name: string;
  ledger_display: string;
  ledger_no: string;
  invoice_auto_id: string;
  no_of_items: number;
  dc_number: string;
  dc_date: string;
  invoice_no: string;
  invoice_date: string;
  invoice_qty: number;
  invoice_value: string;
  invoice_doc_status: string;
  invoice_doc_status_label: string;
  doc_approval_sts: string;
  acc_team_status: string;
  approved_by: string;
  approved_date: string;
  ac_team_approved_by: string;
  ac_approved_date: string;
  reject_reason_elcot: string;
  po_file_url: string;
  dc_file_url: string;
  ir_file_url: string;
  invoice_file_url: string;
  dc_original_name: string;
  ir_original_name: string;
  invoice_original_name: string;
  operation_team: ApprovalBlock;
  accounts_team: ApprovalBlock;
  doc_rows: InvoiceDocRow[];
  items: InvoiceItemRow[];
};

export type LedgerOption = {
  unique_id: string;
  ledger_name: string;
  ledger_no: string;
};

export async function fetchLedgerOptions(department: string) {
  const { data } = await api.get(`${BASE}/ledger-options/`, { params: { department } });
  return data as { status: boolean; data: LedgerOption[] };
}

export async function fetchInvoiceList(params: Record<string, string | number>) {
  const { data } = await api.get(`${BASE}/list/`, { params });
  return data as { status: boolean; data: InvoiceRow[]; recordsTotal: number; recordsFiltered: number };
}

export async function fetchInvoiceSourceDetail(sourceUniqueId: string) {
  const { data } = await api.get(`${BASE}/source/${sourceUniqueId}/`);
  return data as { status: boolean; data: InvoiceDetail };
}

export async function fetchInvoiceDetail(uniqueId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/`);
  return data as { status: boolean; data: InvoiceDetail };
}

export async function createInvoice(payload: FormData) {
  const { data } = await api.post(`${BASE}/create/`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateInvoice(uniqueId: string, payload: FormData) {
  const { data } = await api.put(`${BASE}/${uniqueId}/update/`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteInvoiceDocRow(uniqueId: string) {
  const { data } = await api.delete(`${BASE}/doc-row/${uniqueId}/delete/`);
  return data as { status: boolean; message?: string };
}

export async function deleteInvoice(uniqueId: string) {
  const { data } = await api.delete(`${BASE}/${encodeURIComponent(uniqueId)}/delete/`);
  return data as { status: boolean; message?: string };
}

export async function saveInvoiceSerialNumbers(payload: Record<string, string | number>) {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => form.append(key, String(value)));
  const { data } = await api.post(`${BASE}/create/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { status: boolean; msg?: string; error?: string; message?: string };
}

export async function updateInvoiceSerialNumbers(payload: Record<string, string | number>) {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => form.append(key, String(value)));
  const { data } = await api.post(`${BASE}/create/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { status: boolean; msg?: string; error?: string; message?: string };
}
