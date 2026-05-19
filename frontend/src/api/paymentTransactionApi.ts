import api from "./axios";

const BASE = "/master/payment-transaction";

export type PaymentTransactionTab = "pending" | "approved";

export type PaymentTransactionListParams = {
  tab?: PaymentTransactionTab;
  search?: string;
  page?: number;
  length?: number;
  from_date?: string;
  to_date?: string;
};

export type PaymentTransactionRow = {
  unique_id: string;
  bill_no: string;
  vendor_id: string;
  bill_date: string;
  vendor_invoice_date: string;
  vendor_invoice_no: string;
  vendor_name: string;
  vendor_company_name: string;
  vendor_address: string;
  vendor_contact: string;
  total_amount: number | string;
  additional_charges?: number | string;
  grand_total_amount?: number | string;
  acctdsvalue: number | string;
  accotherdeduction: number | string;
  advancepayment: number | string;
  acctotalpaybleamount: number | string;
  bill_created_by?: string;
  vendor_bill_approval: string;
  vendor_bill_approval_date: string;
  account_entry_by: string;
  account_entry_date: string;
  finance_approved_by: string;
  finance_approved_date: string;
  management_approved_by: string;
  management_approval_date: string;
  account_remark: string;
  transaction_type: number | string;
  transaction_id: string;
  transaction_date: string;
  cash_receipt_file_name: string;
  cash_receipt_file_org?: string;
  accounts_approved_by: string;
  accounts_approved_date: string;
  bank_name?: string;
  banknamenew?: string;
  ifsc_code?: string;
  account_no?: string;
  branch_name?: string;
  upi_method?: string;
  upi_id?: string;
  upi_mobile_no?: string;
  payment_id?: string;
};

export type PaymentTransactionListResponse = {
  status: boolean;
  recordsTotal: number;
  recordsFiltered: number;
  data: PaymentTransactionRow[];
};

export type PaymentVendorSummary = {
  name: string;
  company_name: string;
  contact_no: string;
  mail_id: string;
  pan_no: string;
  gst_no: string;
  address: string;
  account_no: string;
  ifsc_code: string;
  bank_name: string;
  branch_name: string;
  pincode?: string;
  acc_holder_name: string;
  bank_proof: string;
  pan_attach_file_name: string;
};

export type PaymentTransactionItem = {
  s_no: number;
  unique_id: string;
  po_num: string;
  po_date: string;
  invoice_no: string;
  invoice_date: string;
  dc_num: string;
  dc_date: string;
  invoice_qty: number;
  rate: number;
  basic_amount: number;
  gst: number;
  gst_amount: number;
  amount: number;
};

export type PaymentTransactionDetail = {
  summary: PaymentTransactionRow & {
    inv_verfiy_attach?: string;
  };
  vendor_summary: PaymentVendorSummary;
  items: PaymentTransactionItem[];
};

export type PaymentTransactionRemarkPayload = {
  bill_no: string;
  remark: string;
  user_id?: string;
};

export type SubmitPaymentTransactionPayload = {
  bill_no: string;
  vendor_name: string;
  transaction_type: string;
  transaction_date: string;
  bank_name?: string;
  bank_name_new?: string;
  ifsc_code?: string;
  account_no?: string;
  branch_name?: string;
  online_type?: string;
  upi_id?: string;
  upi_mobile?: string;
  transaction_id_1?: string;
  transaction_id_2?: string;
  payment_id?: string;
  cash_receipt?: File | null;
  user_id?: string;
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

export async function fetchPaymentTransactionList(params: PaymentTransactionListParams) {
  try {
    const { data } = await api.get(`${BASE}/list/`, { params });
    return data as PaymentTransactionListResponse;
  } catch (error) {
    throw new Error(extractError(error, "Failed to load payment transaction records."));
  }
}

export async function fetchPaymentTransactionDetail(uniqueId: string, params: { tab: PaymentTransactionTab; bill_no: string; vendor_id: string }) {
  try {
    const { data } = await api.get(`${BASE}/${uniqueId}/`, { params });
    if (!data?.status) throw new Error(data?.message || data?.msg || "Failed to load payment transaction detail.");
    return data as { status: boolean; data: PaymentTransactionDetail };
  } catch (error) {
    throw new Error(extractError(error, "Failed to load payment transaction detail."));
  }
}

export async function updatePaymentTransactionRemark(uniqueId: string, payload: PaymentTransactionRemarkPayload) {
  try {
    const { data } = await api.post(`${BASE}/${uniqueId}/update/`, {
      action: "update_remark",
      ...payload,
    });
    if (!data?.status) throw new Error(data?.message || data?.msg || "Failed to update payment remark.");
    return data as { status: boolean; msg?: string; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to update payment remark."));
  }
}

export async function submitPaymentTransaction(uniqueId: string, payload: SubmitPaymentTransactionPayload) {
  try {
    const formData = new FormData();
    formData.append("action", "submit_payment");
    formData.append("bill_no", payload.bill_no);
    formData.append("vendor_name", payload.vendor_name);
    formData.append("transaction_type", payload.transaction_type);
    formData.append("transaction_date", payload.transaction_date);
    formData.append("bank_name", payload.bank_name || "");
    formData.append("banknamenew", payload.bank_name_new || "");
    formData.append("ifsc_code", payload.ifsc_code || "");
    formData.append("account_no", payload.account_no || "");
    formData.append("branch_name", payload.branch_name || "");
    formData.append("online_type", payload.online_type || "");
    formData.append("upi_id", payload.upi_id || "");
    formData.append("upi_mobile", payload.upi_mobile || "");
    formData.append("transaction_id_1", payload.transaction_id_1 || "");
    formData.append("transaction_id_2", payload.transaction_id_2 || "");
    formData.append("payment_id", payload.payment_id || "");
    formData.append("user_id", payload.user_id || "");
    if (payload.cash_receipt) {
      formData.append("cash_receipt", payload.cash_receipt);
    }

    const { data } = await api.post(`${BASE}/${uniqueId}/update/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (!data?.status) throw new Error(data?.message || data?.msg || "Failed to submit payment transaction.");
    return data as { status: boolean; msg?: string; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to submit payment transaction."));
  }
}
