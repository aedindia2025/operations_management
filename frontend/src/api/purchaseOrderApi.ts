import api from "./axios";

const BASE = "/master/purchase-order";

export async function fetchPurchaseOrderOptions(params?: { tender_code?: string; state_name?: string }) {
  const { data } = await api.get(`${BASE}/options/`, { params });
  return data;
}

export async function fetchPurchaseOrderList(params?: Record<string, string | number>) {
  const { data } = await api.get(`${BASE}/list/`, { params });
  return data;
}

export async function fetchPurchaseOrderCancelList(params?: Record<string, string | number>) {
  const { data } = await api.get(`${BASE}/cancel-list/`, { params });
  return data;
}

export async function fetchPurchaseOrderById(uniqueId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/`);
  return data;
}

export async function createPurchaseOrder(payload: FormData | Record<string, unknown>) {
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const { data } = await api.post(`${BASE}/create/`, payload, config);
  return data;
}

export async function updatePurchaseOrder(uniqueId: string, payload: FormData | Record<string, unknown>) {
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const { data } = await api.put(`${BASE}/${uniqueId}/update/`, payload, config);
  return data;
}

export async function deletePurchaseOrder(uniqueId: string) {
  const { data } = await api.delete(`${BASE}/${uniqueId}/delete/`);
  return data;
}

export async function fetchPurchaseOrderProducts(uniqueId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/products/`);
  return data;
}

export async function createPurchaseOrderProduct(uniqueId: string, payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/${uniqueId}/products/create/`, payload);
  return data;
}

export async function fetchPurchaseOrderProduct(subId: string) {
  const { data } = await api.get(`${BASE}/products/${subId}/`);
  return data;
}

export async function updatePurchaseOrderProduct(subId: string, payload: Record<string, unknown>) {
  const { data } = await api.put(`${BASE}/products/${subId}/`, payload);
  return data;
}

export async function deletePurchaseOrderProduct(subId: string) {
  const { data } = await api.delete(`${BASE}/products/${subId}/delete/`);
  return data;
}

export async function fetchPurchaseOrderConsignees(uniqueId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/consignees/`);
  return data;
}

export async function createPurchaseOrderConsignee(uniqueId: string, payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/${uniqueId}/consignees/create/`, payload);
  return data;
}

export async function fetchPurchaseOrderConsignee(subId: string) {
  const { data } = await api.get(`${BASE}/consignees/${subId}/`);
  return data;
}

export async function updatePurchaseOrderConsignee(subId: string, payload: Record<string, unknown>) {
  const { data } = await api.put(`${BASE}/consignees/${subId}/`, payload);
  return data;
}

export async function deletePurchaseOrderConsignee(subId: string) {
  const { data } = await api.delete(`${BASE}/consignees/${subId}/delete/`);
  return data;
}

export async function fetchPurchaseOrderConsigneeBatches(uniqueId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/consignee-batches/`);
  return data;
}

export async function deletePurchaseOrderConsigneeBatch(uniqueId: string, batchId: string) {
  const { data } = await api.delete(`${BASE}/${uniqueId}/consignee-batches/${batchId}/delete/`);
  return data;
}

export async function updatePurchaseOrderConsigneeBatchDate(uniqueId: string, batchId: string, payload: { consignee_received_date: string }) {
  const { data } = await api.post(`${BASE}/${uniqueId}/consignee-batches/${batchId}/received-date/`, payload);
  return data;
}

export async function importPurchaseOrderConsignees(uniqueId: string, formData: FormData) {
  const { data } = await api.post(`${BASE}/${uniqueId}/consignees/import/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchPurchaseOrderAmcSublist(uniqueId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/amc-sublist/`);
  return data;
}

export async function createPurchaseOrderAmcSublist(uniqueId: string, formData: FormData) {
  const { data } = await api.post(`${BASE}/${uniqueId}/amc-sublist/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deletePurchaseOrderAmcSublist(subId: string) {
  const { data } = await api.delete(`${BASE}/amc-sublist/${subId}/delete/`);
  return data;
}

export async function fetchPendingVerifyBatches(uniqueId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/consignee-batches/pending-verify/`);
  return data;
}

export async function verifyPurchaseOrderBatches(batchIds: string[]) {
  const { data } = await api.post(`${BASE}/consignee-batches/verify/`, { batch_ids: batchIds });
  return data;
}

export async function fetchPurchaseOrderAssign(uniqueId: string, batchId: string) {
  const { data } = await api.get(`${BASE}/${uniqueId}/assign/${batchId}/`);
  return data;
}

export async function importPurchaseOrderAssign(uniqueId: string, formData: FormData) {
  const { data } = await api.post(`${BASE}/${uniqueId}/assign/import/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function savePurchaseOrderAssign(uniqueId: string, payload: { batch_id: string; rows: Array<Record<string, unknown>> }) {
  const { data } = await api.post(`${BASE}/${uniqueId}/assign/save/`, payload);
  return data;
}

export async function savePurchaseOrderCancel(uniqueId: string, formData: FormData) {
  const { data } = await api.post(`${BASE}/${uniqueId}/cancel/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
