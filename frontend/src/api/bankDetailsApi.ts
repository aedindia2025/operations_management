import api from "./axios";

const BASE = "/master/bank-details";

export type BankDetailsRow = {
  s_no: number;
  id: number;
  unique_id: string;
  vendor_name: string;
  acc_holder_name: string;
  bank_name: string;
  branch_name: string;
  account_no: string;
  ifsc_code: string;
  entered_by: string;
  accounts_approval: number;
  management_approval: number;
  finance_approval: number;
  accounts_status: string;
  management_status: string;
  finance_status: string;
  final_status: string;
  action_type: string;
  can_approve: boolean;
};

function extractError(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: { message?: string; msg?: string; detail?: string } } }).response?.data;
  if (typeof responseData?.message === "string" && responseData.message.trim()) return responseData.message;
  if (typeof responseData?.msg === "string" && responseData.msg.trim()) return responseData.msg;
  if (typeof responseData?.detail === "string" && responseData.detail.trim()) return responseData.detail;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export async function fetchBankDetails(search = "") {
  try {
    const { data } = await api.get(`${BASE}/list/`, { params: { search } });
    return data as { status: boolean; data: BankDetailsRow[]; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to load bank details."));
  }
}

export async function approveBankDetails(id: number, type: string) {
  try {
    const { data } = await api.post(`${BASE}/approve/`, { id, type });
    if (!data?.status) throw new Error(data?.message || "Approval failed.");
    return data as { status: boolean; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Approval failed."));
  }
}
