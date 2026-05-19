const BASE = "/api/master/vendor-bill-creation";

export interface VendorBillPendingRow {
  s_no: number;
  vendor_id: string;
  vendor_name: string;
  vendor_code: string;
  contact_no: string;
  address: string;
  dc_count: number;
  total_amount: number;
  status: string;
  reject_reason: string;
  rejected_by: string;
}

export interface VendorBillRejectedRow {
  s_no: number;
  bill_no: string;
  bill_date: string;
  vendor_name: string;
  vendor_id: string;
  dc_count: number;
  total_amount: number;
  vendor_bill_created_by: string;
  rejected_stage: string;
  rejected_by: string;
  reject_reason: string;
}

export interface VendorBillCreatedRow {
  s_no: number;
  bill_no: string;
  bill_date: string;
  vendor_invoice_id: string;
  vendor_invoice_date: string;
  vendor_name: string;
  vendor_id: string;
  dc_count: number;
  total_amount: number;
  additional_charges?: number;
  grand_total_amount?: number;
  vendor_details?: {
    company_name?: string;
    contact_no?: string;
    address?: string;
    mail_id?: string;
  };
}

export interface VendorBillSummary {
  vendor_id?: string;
  company_name: string;
  contact_person: string;
  contact_no: string;
  mail_id: string;
  pan_no: string;
  gst_no: string;
  address: string;
  account_no: string;
  ifsc_code: string;
  bank_name: string;
  branch_name: string;
  bank_proof: string;
  pan_attach_file_name: string;
  acc_holder_name: string;
}

export interface VendorBillPendingDetailRow {
  s_no: number;
  unique_id: string;
  vendor_id: string;
  po_num: string;
  po_date: string;
  invoice_no: string;
  invoice_date: string;
  dc_number: string;
  dc_date: string;
  consignee_address: string;
  customer_name: string;
  invoice_qty: number;
  rate: number;
  gst: number;
  basic_amount: number;
  gst_amount: number;
  total_amount: number;
  form_main_unique_id: string;
  vendor_company_name: string;
  generated_vendor_invoice_id: string;
  user_vendor_invoice_id: string;
  invoice_file: string;
  invoice_file_org_name: string;
  po_file: string;
  po_file_org_name: string;
}

export interface VendorBillCreatedDetailSummary extends VendorBillSummary {
  bill_no: string;
  bill_date: string;
  vendor_name: string;
  vendor_id: string;
  vendor_invoice_id: string;
  vendor_invoice_date: string;
  invoice_file: string;
  invoice_file_name: string;
  po_file: string;
  po_file_name: string;
  bill_created_by: string;
  bill_created_date: string;
  reject_reason: string;
}

export interface VendorBillCreatedDetailRow {
  s_no: number;
  dc_number: string;
  dc_date: string;
  invoice_no: string;
  invoice_date: string;
  po_num: string;
  po_date: string;
  consignee_address?: string;
  invoice_qty: number;
  rate: number;
  gst: number;
  basic_amount: number;
  gst_amount: number;
  total_amount: number;
}

export interface VendorBillCreatedLineItem {
  s_no: number;
  dc_no: string;
  dc_date: string;
  invoice_no: string;
  invoice_date: string;
  po_no: string;
  po_date: string;
  consignee_address: string;
  invoice_qty: number;
  unit_price: number;
  basic_amount: number;
  gst: string;
  gst_amount: number;
  total_amount: number;
}

export interface VendorBillApprovalItem {
  s_no: number;
  bill_created_by: string;
  bill_created_at: string;
  bill_created_status: string;
  operation_by: string;
  operation_at: string;
  operation_status: string;
  account_entry_by: string;
  account_entry_at: string;
  account_entry_status: string;
  accounts_approval_by: string;
  accounts_approval_at: string;
  accounts_approval_status: string;
  management_by: string;
  management_at: string;
  management_status: string;
  payment_ref: string;
  payment_date: string;
  payment_amount: string;
  payment_status: string;
}
export interface VendorBillCreatedDetail {
  status: boolean;
  id: string;
  vendor_name: string;
  vendor_address: string;
  vendor_gst: string;
  vendor_pan: string;
  vendor_email: string;
  vendor_phone: string;
  vendor_bill_no: string;
  vendor_bill_date: string;
  vendor_invoice_no: string;
  vendor_invoice_date: string;
  invoice_attach_url: string;
  po_attach_url: string;
  bank_name: string;
  branch: string;
  account_no: string;
  ifsc_code: string;
  account_holder: string;
  pan_copy_url: string;
  bank_proof_url: string;
  reject_reason: string;
  dc_items: VendorBillCreatedLineItem[];
  rows: VendorBillCreatedDetailRow[];
  total_amount: number;
  additional_charges?: number;
  grand_total_amount?: number;
  tds_deduction: number;
  others_deduction: number;
  advance_amount: number;
  total_payable: number;
  approvals: VendorBillApprovalItem[];
  summary: VendorBillCreatedDetailSummary;
}

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : "";
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
  }
}

export async function fetchVendorBillCreationList(params: {
  tab: "pending" | "created" | "rejected";
  search?: string;
  page?: number;
  length?: number;
  from_date?: string;
  to_date?: string;
}) {
  const query = new URLSearchParams({
    tab: params.tab,
    search: params.search ?? "",
    page: String(params.page ?? 1),
    length: String(params.length ?? 10),
    from_date: params.from_date ?? "",
    to_date: params.to_date ?? "",
  });
  const res = await fetch(`${BASE}/list/?${query}`);
  return safeJson(res);
}

export async function fetchVendorBillPendingDetail(vendorId: string) {
  const res = await fetch(`${BASE}/pending-detail/?vendor_id=${encodeURIComponent(vendorId)}`);
  return safeJson(res) as Promise<{
    status: boolean;
    summary: VendorBillSummary;
    rows: VendorBillPendingDetailRow[];
    generated_vendor_invoice_id: string;
    user_vendor_invoice_id: string;
    invoice_issue_date: string;
  }>;
}

export async function createVendorBill(payload: FormData) {
  const res = await fetch(`${BASE}/create-bill/`, {
    method: "POST",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: payload,
  });
  return safeJson(res);
}

export async function fetchVendorCreatedBillDetail(billNo: string) {
  const res = await fetch(`${BASE}/bill-detail/?bill_no=${encodeURIComponent(billNo)}`);
  return safeJson(res) as Promise<VendorBillCreatedDetail>;
}

export async function createVendorBillCreation(payload: { name: string; is_active: number }) {
  const res = await fetch(`${BASE}/create/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

export async function fetchVendorBillCreationById(id: string) {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}/`);
  return safeJson(res);
}

export async function updateVendorBillCreation(id: string, payload: { name: string; is_active: number }) {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}/update/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}
