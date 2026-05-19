import api from "./axios";

const BASE = "/master/payment";

export type CustomerPaymentListParams = {
  status?: "pending" | "completed";
  from_date?: string;
  to_date?: string;
  opt?: string;
  search?: string;
  start?: number;
  length?: number;
  draw?: number;
};

export type CustomerPaymentRow = {
  s_no: number;
  unique_id: string;
  bill_no: string;
  po_num: string;
  customer: string;
  invoice_no: string;
  invoice_value: string;
  claim_percentage: string;
  claimamt: string;
  payment_status: number;
};

export type CustomerPaymentListResponse = {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: CustomerPaymentRow[];
};

export type CustomerPaymentDetailRow = {
  bill_no: string;
  invoice_no: string;
  customer: string;
  address: string;
  pincode: string;
  contact_name: string;
  contact_number: string;
  email: string;
  bill_created_date: string;
  bill_submission_date: string;
  po_num: string;
  po_date: string;
  invoice_date: string;
  invoice_value: string;
  trans_date: string;
  trans_id: string;
  tran_amt: string;
  payment_received: string;
  ld_amount: string;
  gst_value: string;
  tds_value: string;
  payment_date: string;
  claimamt: string;
  e_no: string;
  district: string;
  state_name: string;
  ttl_amount: string;
  balance_amount: string;
};

export type CustomerPaymentDetailResponse = {
  status: number;
  msg: string;
  data: CustomerPaymentDetailRow[];
};

export type CustomerPaymentSavePayload = {
  upload_only?: boolean;
  unique_id?: string;
  bill_no?: string;
  my_inv_no?: string;
  payement_receive?: string;
  payment_status?: number;
  payment_date?: string;
  ld_amount?: string;
  ld_days?: number;
  claim_amount?: string;
  gst?: string;
  gst_value?: string;
  tds?: string;
  tds_value?: string;
  ld?: string;
  tran_amt?: string;
  rem_amt?: string;
  file?: File | null;
  courier_pod_file?: File | null;
  dc_file?: File | null;
  einvoice_file?: File | null;
  ir_file?: File | null;
  bg_copy_file?: File | null;
  fire_insurance_file?: File | null;
  marine_insurance_file?: File | null;
  burglary_file?: File | null;
};

export async function fetchCustomerPayments(params: CustomerPaymentListParams) {
  const { data } = await api.get(`${BASE}/list/`, { params });
  return data as CustomerPaymentListResponse;
}

export async function fetchCustomerPaymentDetail(params: {
  unique_id: string;
  bill_no: string;
  invoice_no: string;
}) {
  const { data } = await api.get(`${BASE}/detail/`, { params });
  return data as CustomerPaymentDetailResponse;
}

export async function saveCustomerPayment(payload: CustomerPaymentSavePayload) {
  const formData = new FormData();
  if (payload.upload_only) formData.append("upload_only", "1");
  formData.append("unique_id", payload.unique_id || "");
  formData.append("bill_no", payload.bill_no || "");
  formData.append("my_inv_no", payload.my_inv_no || "");
  formData.append("payement_receive", payload.payement_receive || "0");
  formData.append("payment_status", String(payload.payment_status ?? 0));
  formData.append("payment_date", payload.payment_date || "");
  formData.append("ld_amount", payload.ld_amount || "0");
  formData.append("ld_days", String(payload.ld_days ?? 0));
  formData.append("claim_amount", payload.claim_amount || "0");
  formData.append("gst", payload.gst || "0");
  formData.append("gst_value", payload.gst_value || "0");
  formData.append("tds", payload.tds || "0");
  formData.append("tds_value", payload.tds_value || "0");
  formData.append("ld", payload.ld || "0");
  formData.append("tran_amt", payload.tran_amt || "0");
  formData.append("rem_amt", payload.rem_amt || "0");
  if (payload.file) formData.append("file", payload.file);
  if (payload.courier_pod_file) formData.append("courier_pod_file", payload.courier_pod_file);
  if (payload.dc_file) formData.append("dc_file", payload.dc_file);
  if (payload.einvoice_file) formData.append("einvoice_file", payload.einvoice_file);
  if (payload.ir_file) formData.append("ir_file", payload.ir_file);
  if (payload.bg_copy_file) formData.append("bg_copy_file", payload.bg_copy_file);
  if (payload.fire_insurance_file) formData.append("fire_insurance_file", payload.fire_insurance_file);
  if (payload.marine_insurance_file) formData.append("marine_insurance_file", payload.marine_insurance_file);
  if (payload.burglary_file) formData.append("burglary_file", payload.burglary_file);

  const { data } = await api.post(`${BASE}/save/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { status: number; msg: string; data?: unknown[]; error?: string };
}
