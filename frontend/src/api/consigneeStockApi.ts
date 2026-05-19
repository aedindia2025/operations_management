import api from "./axios";

const BASE = "/master/consignee-stock";

export async function fetchConsigneeStockPending(payload?: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/pending/`, {
    draw: 1,
    start: 0,
    length: 10,
    search: { value: "" },
    ...payload,
  });
  return data;
}

export async function fetchConsigneeStockCompleted(payload?: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/list/`, {
    draw: 1,
    start: 0,
    length: 10,
    search: { value: "" },
    ...payload,
  });
  return data;
}

export async function fetchConsigneeStockDetail(uniqueId: string, stockId: string) {
  const { data } = await api.get(`${BASE}/${encodeURIComponent(uniqueId)}/`, {
    params: { stock_id: stockId },
  });
  return data;
}

export async function fetchConsigneePopupData(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/create/`, {
    action: "get_consignee",
    ...payload,
  });
  return data;
}

export async function assignConsigneeStock(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/create/`, {
    action: "assign_stock",
    ...payload,
  });
  return data;
}

export async function deleteConsigneeStock(payload: { form_main_unique_id: string; stock_id: string }) {
  const { data } = await api.post(`${BASE}/${encodeURIComponent(payload.form_main_unique_id)}/delete/`, {
    action: "delete",
    ...payload,
  });
  return data as { status: boolean; message?: string };
}
