import api from "./axios";

const BASE = "/master/onsite-engineer-payment";

export interface OnsiteEngineerPaymentRow {
  s_no: number;
  unique_id: string;
  bill_no: string;
  bill_date: string;
  engineer_id: string;
  engineer_name: string;
  engineer_type: string;
  services_charges: string;
  rate: number;
  gst: number;
  amount: number;
  total_amount: number;
  bill_copy_url: string;
  vendor_po_copy_url: string;
  status: string;
  accounts_entry_status: string;
  accounts_approval_status: string;
  management_status: string;
  payment_status: string;
}

export async function fetchOnsiteEngineerPayments(params?: { search?: string; page?: number; length?: number }) {
  const { data } = await api.get<{ status: boolean; data: OnsiteEngineerPaymentRow[]; total: number; page: number; pages: number }>(`${BASE}/list/`, { params });
  return data;
}

export async function createOnsiteEngineerPayment(payload: FormData) {
  const { data } = await api.post(`${BASE}/create/`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
