import api from "./axios";

const BASE = "/master/stock-position";

export interface StockPositionListRow {
  unique_id?: string;
  form_main_unique_id?: string;
  po_unique_id?: string;
  po_num?: string;
  po_date?: string;
  department?: string;
  department_display?: string;
  executive_name?: string;
  executive_display?: string;
  no_of_consignee?: number | string;
  no_of_con?: number | string;
  no_of_po?: number | string;
  no_of_item?: number | string;
  qty?: number | string;
  total_qty?: number | string;
  stock_qty?: number | string;
  net_value?: number | string;
  stock_value?: number | string;
  status?: number;
  status_display?: string;
  s_no?: number;
}

export interface StockPositionProductRow {
  unique_id?: string;
  product_unique_id?: string;
  item_code?: string;
  product?: string;
  unit_price?: number | string;
  net_price?: number | string;
  product_tax?: number | string;
  tax?: number | string;
  billed_qty?: number | string;
  item_qty?: number | string;
  qty?: number | string;
  stock_qty?: number | string;
  remaining_qty?: number | string;
  remqty?: number | string;
  part_no?: string;
  stock_value?: number | string;
  update_stock_qty?: number | string;
  update_stock_value?: number | string;
}

export interface StockPositionSublistRow {
  s_no?: number;
  stock_id?: string;
  stock_date?: string;
  product_unique_id?: string;
  item_code?: string;
  product?: string;
  item_qty?: number | string;
  remqty?: number | string;
  stock_qty?: number | string;
  remaining_qty?: number | string;
  part_no?: string;
}

export async function fetchPendingStockPositions(payload?: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/pending/`, {
    draw: 1,
    start: 0,
    length: 10,
    search: { value: "" },
    ...payload,
  });
  return data;
}

export async function fetchProcessingStockPositions(payload?: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/processing/`, {
    draw: 1,
    start: 0,
    length: 10,
    ...payload,
  });
  return data;
}

export async function fetchCompleteStockPositions(payload?: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/complete/`, {
    draw: 1,
    start: 0,
    length: 10,
    search: { value: "" },
    ...payload,
  });
  return data;
}

export async function createStockPosition(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/create/`, payload);
  return data;
}

export async function fetchStockPositionDetail(uniqueId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/`);
  return data;
}

export async function deleteStockPosition(uniqueId: string) {
  const { data } = await api.delete(`${BASE}/${uniqueId}/delete/`);
  return data;
}

export async function updateStockPositionStatus(uniqueId: string, status: 1 | 2) {
  const { data } = await api.put(`${BASE}/${uniqueId}/update-status/`, { status });
  return data;
}

export async function updateStockPositionPartNo(uniqueId: string, payload: Record<string, unknown>) {
  const { data } = await api.put(`${BASE}/${uniqueId}/part-no/`, payload);
  return data;
}

export async function exportStockPosition(type: "pending" | "complete" | "all") {
  const { data } = await api.get(`${BASE}/export/`, { params: { type } });
  return data;
}
