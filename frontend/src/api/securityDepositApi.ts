import api from "./axios";

const BASE = "/master/security-deposit";

export type SecurityDepositListParams = {
  search?: string;
  length?: number;
  start?: number;
  draw?: number;
  from_date?: string;
  to_date?: string;
  opt?: string;
};

export type SecurityDepositRow = {
  s_no: number;
  unique_id: string;
  bill_form_unique_id: string;
  bill_no: string;
  invoice_no: string;
  po_num: string;
  po_date: string;
  invoice_date: string;
  bill_created_date: string;
  partial_bill_status: string;
  bill_details: string;
  po_details: string;
  invoice_details: string;
  customer_details: string;
  invoice_value: string;
  claim_percentage: string;
  claim_value: string;
};

export type SecurityDepositListResponse = {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: SecurityDepositRow[];
};

export type SecurityDepositCompletedRow = {
  s_no: number;
  bill_details: string;
  po_num: string;
  customer_details: string;
  invcount: number;
  invoice_value: string;
  claim_amount: string;
  claimamnt: string;
  bg_num: string;
  view: string;
  invoice_no: string;
  invoice_date: string;
  bill_status: string;
  po_date: string;
  bill_no: string;
  bill_form_main_unique_id: string;
  bill_created_dates: string;
};

export type SecurityDepositFormOption = {
  id: string;
  value: string;
};

export type SecurityDepositFormData = {
  po_num: string;
  po_date: string;
  invoice_no: string;
  invoice_date: string;
  invoice_value: string;
  invoice_qty: string;
  bill_no: string;
  e_no: string;
  bg: string;
  bill_submission_date: string;
  department: string;
  customer_address: string;
  customer_district: string;
  customer_state: string;
  customer_pincode: string;
  customer_contact: string;
  customer_email: string;
  existing_unique_id: string;
  existing_claim_amount: string;
  claim_amount_options: SecurityDepositFormOption[];
};

export type SecurityDepositSavePayload = {
  bill_form_main_unique_id: string;
  po_num: string;
  po_date: string;
  invoice_no: string;
  invoice_date: string;
  invoice_value: number;
  invoice_qty: string;
  claim_amount: string;
  bill_status?: string;
  unique_id?: string;
};

export async function fetchSecurityDepositList(params: SecurityDepositListParams) {
  const { data } = await api.get(`${BASE}/list/`, { params });
  return data as SecurityDepositListResponse;
}

export async function fetchSecurityDepositCompletedList(params: SecurityDepositListParams) {
  const { data } = await api.get(`${BASE}/bill-generate-list/`, {
    params: {
      ...params,
      opt1: params.opt,
    },
  });
  return data as {
    draw: number;
    recordsTotal: number;
    recordsFiltered: number;
    data: SecurityDepositCompletedRow[];
  };
}

export async function fetchSecurityDepositFormData(params: {
  unique_id: string;
  invoice_no: string;
}) {
  const { data } = await api.get(`${BASE}/form-data/`, { params });
  return data as SecurityDepositFormData;
}

export async function saveSecurityDeposit(payload: SecurityDepositSavePayload) {
  const { data } = await api.post(`${BASE}/create-update/`, {
    ...payload,
    bill_status: payload.bill_status ?? "1",
    unique_id: payload.unique_id ?? "",
  });
  return data as { status: boolean; msg: string; error?: string | Record<string, unknown> };
}

export async function deleteSecurityDeposit(unique_id: string) {
  const { data } = await api.delete(`${BASE}/${encodeURIComponent(unique_id)}/delete/`);
  return data as { status: boolean; msg: string; error?: string };
}
