import api from "./axios";

const BASE = "/master/vendor-allocation-zone";
const REVENDOR_BASE = "/master/revendor-allocation";
const REVISIT_BASE = "/master/revisit-payment";

export interface VendorAllocationPendingRow {
  unique_id: string;
  s_no?: number;
  po_num?: string;
  po_date?: string;
  inv_no?: string;
  invoice_date?: string;
  dc_number?: string;
  dc_date?: string;
  department_name?: string;
  district?: string;
  state?: string;
  cons_details?: string;
  team_member?: string;
  eng_name_id?: string;
  eng_type?: string;
  invoice_qty?: number | string;
  vendor_timeline?: string;
  vendor_bulk_sts?: number;
  partial_sts?: string | number;
  consignee_unique_id?: string;
  form_main_unique_id?: string;
}

export interface VendorAllocationCompletedRow extends VendorAllocationPendingRow {
  ageing?: string;
  assign_date?: string;
  vendor_ins_date?: string;
  installation_com_date?: string;
  form_main_unique_id?: string;
}

export interface VendorAllocationListResponse<T> {
  status: boolean;
  recordsTotal: number;
  recordsFiltered: number;
  data: T[];
}

export interface VendorAllocationListParams {
  from_date?: string;
  to_date?: string;
  opt1?: string;
  team_mem?: string;
  search?: string;
  page?: number;
  length?: number;
  skip_count?: number;
}

export interface VendorAllocationMetaResponse {
  status: boolean;
  data: {
    assign_no: string;
    assign_date: string;
    assign_date_display: string;
  };
}

export interface VendorAllocationDetailResponse {
  status: boolean;
  data: {
    unique_id: string;
    form_main_unique_id: string;
    invoice_no: string;
    dc_number: string;
    vendor_bulk_sts: number;
    bulk_eng_type: string;
    bulk_eng_name: string;
    team_mem: string;
    ven_assign_no: string;
    ven_assign_date: string;
    ven_assign_date_display: string;
    vendor_ins_date: string;
    vendor_bulk_timeline: string;
    vendor_bulk_rate: string;
    vendor_bulk_gst: string;
    bulk_total_amount: string;
    rows: VendorAllocationPendingRow[];
  };
}

export interface VendorAllocationProductRow {
  id: string;
  s_no: number;
  po_unique_id: string;
  invoice_no: string;
  product_unique_id: string;
  item_code: string;
  product: string;
  qty: number;
  rate: string;
  gst_percent: number | null;
  tax_amount: string;
  total_amount: string;
  already_assign_qty?: number | string;
  remaining_qty?: number | string;
  partial_qty?: number | string;
  dc_numbers: string[];
  dc_qty_map: Record<string, number>;
}

export interface VendorAllocationProductDetailsResponse {
  status: boolean;
  data: VendorAllocationProductRow[];
  grand_total: string;
}

export async function fetchVendorAllocationPending(params?: VendorAllocationListParams) {
  const { data } = await api.get<VendorAllocationListResponse<VendorAllocationPendingRow>>(`${BASE}/pending/`, {
    params,
  });
  return data;
}

export async function fetchRevendorAllocationPending(params?: VendorAllocationListParams) {
  const { data } = await api.get<VendorAllocationListResponse<VendorAllocationPendingRow>>(`${REVENDOR_BASE}/pending/`, {
    params,
  });
  return data;
}

export async function fetchRevisitPaymentPending(params?: VendorAllocationListParams) {
  const { data } = await api.get<VendorAllocationListResponse<VendorAllocationPendingRow>>(`${REVISIT_BASE}/pending/`, {
    params,
  });
  return data;
}

export async function fetchVendorAllocationCompleted(params?: VendorAllocationListParams) {
  const { data } = await api.get<VendorAllocationListResponse<VendorAllocationCompletedRow>>(`${BASE}/completed/`, {
    params,
  });
  return data;
}

export async function fetchVendorAllocationMeta() {
  const { data } = await api.get<VendorAllocationMetaResponse>(`${BASE}/meta/`);
  return data;
}

export async function fetchVendorAllocationDetail(uniqueId: string) {
  const { data } = await api.get<VendorAllocationDetailResponse>(`${BASE}/${uniqueId}/`);
  return data;
}

export async function fetchVendorAllocationProductDetails(payload: {
  po_id: string;
  invoice_no?: string;
  dc_numbers: string[];
  gst_type?: string;
}) {
  const { data } = await api.post<VendorAllocationProductDetailsResponse>(`${BASE}/product-details/`, payload);
  return data;
}

export async function fetchRevendorAllocationProductDetails(payload: {
  po_id: string;
  invoice_no?: string;
  dc_numbers: string[];
  gst_type?: string;
}) {
  const { data } = await api.post<VendorAllocationProductDetailsResponse>(`${REVENDOR_BASE}/product-details/`, payload);
  return data;
}

export async function fetchRevisitPaymentProductDetails(payload: {
  po_id: string;
  invoice_no?: string;
  dc_numbers: string[];
  gst_type?: string;
}) {
  const { data } = await api.post<VendorAllocationProductDetailsResponse>(`${REVISIT_BASE}/product-details/`, payload);
  return data;
}

export async function createVendorBulkAssign(payload: {
  invoice_ids: string[];
  bulk_eng_type: string;
  bulk_eng_name: string;
  vendor_bulk_timeline: string;
  team_mem?: string;
  ven_assign_date?: string;
  assign_no?: string;
  vendor_ins_date?: string;
  rate?: string;
  gst?: string;
  total_amount?: string;
  partial_sts?: string;
  product_rows?: Array<{
    po_unique_id: string;
    invoice_no?: string;
    product_unique_id: string;
    item_code: string;
    product: string;
    qty: number;
    assigned_qty?: number;
    partial_qty?: number;
    remaining_qty?: number;
    already_assign_qty?: number;
    rate: string;
    gst: string;
    tax_amount: string;
    total_amount: string;
    dc_qty_map: Record<string, number>;
  }>;
}) {
  const { data } = await api.post(`${BASE}/bulk-assign/`, payload);
  return data;
}

export async function createRevendorBulkAssign(payload: Parameters<typeof createVendorBulkAssign>[0]) {
  const { data } = await api.post(`${REVENDOR_BASE}/bulk-assign/`, payload);
  return data;
}

export async function createRevisitPaymentBulkAssign(payload: Parameters<typeof createVendorBulkAssign>[0]) {
  const { data } = await api.post(`${REVISIT_BASE}/bulk-assign/`, payload);
  return data;
}

export async function exportVendorAllocationData(type: "all" | "pending" | "complete" | "transit") {
  const { data } = await api.get(`${BASE}/export/`, { params: { type } });
  return data;
}
