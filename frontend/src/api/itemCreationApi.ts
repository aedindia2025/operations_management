import api from "./axios";

const BASE = "/master/item-creation";

export interface ApiResult<T = unknown> {
  status: boolean;
  msg?: string;
  message?: string;
  error?: string | Record<string, unknown>;
  data?: T;
}

export interface ItemCreationRecord {
  unique_id: string;
  tender_name: string;
  tender_code: string;
  tender_no: string;
  tender_type: number | string;
  tender_type_display?: string;
  validity_from: string;
  validity_to: string;
  validity_date_extension: string;
  is_active?: number;
  is_active_display?: string;
  is_delete?: number;
  s_no?: number;
}

export interface ItemCreationPayload {
  tender_name: string;
  tender_code: string;
  tender_no: string;
  tender_type: number;
  validity_from: string;
  validity_to: string;
  validity_date_extension?: string | null;
}

export interface ItemCreationListResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: ItemCreationRecord[];
}

export interface ItemSubRecord {
  unique_id: string;
  tender_code: string;
  item_code: string;
  item_description: string;
  item_specification: string;
  brand: string;
  product_category: string;
  short_category: string;
  rc_net_price: string;
  gst: string;
  rc_unit_price: string;
  warranty_in_yrs: string;
  is_active?: number;
  s_no?: number;
}

export interface ItemSubPayload {
  tender_code: string;
  item_code: string;
  item_description: string;
  item_specification: string;
  brand: string;
  product_category: string;
  short_category: string;
  rc_net_price: string;
  gst: string;
  rc_unit_price?: string;
  warranty_in_yrs: string;
  is_active?: number;
}

export interface ItemSubListResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: ItemSubRecord[];
}

export interface ImportItemSubResponse {
  status: boolean;
  message: string;
  inserted?: number;
  skipped?: number;
  errors?: string[];
}

function extractError(error: unknown, fallback: string): string {
  if (typeof error === "object" && error && "response" in error) {
    const responseData = (error as { response?: { data?: { message?: string; error?: unknown } } }).response?.data;
    if (typeof responseData?.message === "string") return responseData.message;
    if (typeof responseData?.error === "string") return responseData.error;
    if (responseData?.error && typeof responseData.error === "object") {
      const firstValue = Object.values(responseData.error)[0];
      if (Array.isArray(firstValue) && typeof firstValue[0] === "string") return firstValue[0];
      if (typeof firstValue === "string") return firstValue;
    }
  }
  return fallback;
}

export async function fetchItemCreationList(params: {
  search?: string;
  start?: number;
  length?: number;
  draw?: number;
}): Promise<ItemCreationListResponse> {
  const response = await api.post(`${BASE}/list/`, {
    draw: params.draw ?? 1,
    start: params.start ?? 0,
    length: params.length ?? 10,
    search: params.search ?? "",
  });
  return response.data;
}

export async function fetchItemCreationById(unique_id: string): Promise<ItemCreationRecord> {
  const response = await api.get(`${BASE}/${unique_id}/`);
  return response.data.data;
}

export async function createItemCreation(payload: ItemCreationPayload): Promise<ApiResult<ItemCreationRecord>> {
  try {
    const response = await api.post(`${BASE}/create/`, payload);
    return response.data;
  } catch (error) {
    return {
      status: false,
      msg: "error",
      message: extractError(error, "Failed to create item creation."),
      error: extractError(error, "Failed to create item creation."),
    };
  }
}

export async function updateItemCreation(
  unique_id: string,
  payload: ItemCreationPayload
): Promise<ApiResult<ItemCreationRecord>> {
  try {
    const response = await api.put(`${BASE}/${unique_id}/update/`, payload);
    return response.data;
  } catch (error) {
    return {
      status: false,
      msg: "error",
      message: extractError(error, "Failed to update item creation."),
      error: extractError(error, "Failed to update item creation."),
    };
  }
}

export async function deleteItemCreation(unique_id: string): Promise<ApiResult> {
  try {
    const response = await api.delete(`${BASE}/${unique_id}/delete/`);
    return response.data;
  } catch (error) {
    return {
      status: false,
      msg: "error",
      message: extractError(error, "Failed to delete item creation."),
      error: extractError(error, "Failed to delete item creation."),
    };
  }
}

export async function fetchItemSubList(params: {
  tender_code: string;
  search?: string;
  start?: number;
  length?: number;
  draw?: number;
}): Promise<ItemSubListResponse> {
  const response = await api.post(`${BASE}/sub/`, {
    draw: params.draw ?? 1,
    start: params.start ?? 0,
    length: params.length ?? 10,
    search: params.search ?? "",
    tender_code: params.tender_code,
  });
  return response.data;
}

export async function fetchItemSubById(unique_id: string): Promise<ItemSubRecord> {
  const response = await api.get(`${BASE}/sub/${unique_id}/`);
  return response.data.data;
}

export async function createItemSub(payload: ItemSubPayload): Promise<ApiResult<ItemSubRecord>> {
  try {
    const response = await api.post(`${BASE}/sub/create/`, payload);
    return response.data;
  } catch (error) {
    return {
      status: false,
      msg: "error",
      message: extractError(error, "Failed to create item details."),
      error: extractError(error, "Failed to create item details."),
    };
  }
}

export async function updateItemSub(
  unique_id: string,
  payload: ItemSubPayload
): Promise<ApiResult<ItemSubRecord>> {
  try {
    const response = await api.post(`${BASE}/sub/create/`, {
      ...payload,
      unique_id,
    });
    return response.data;
  } catch (error) {
    return {
      status: false,
      msg: "error",
      message: extractError(error, "Failed to update item details."),
      error: extractError(error, "Failed to update item details."),
    };
  }
}

export async function deleteItemSub(unique_id: string): Promise<ApiResult> {
  try {
    const response = await api.delete(`${BASE}/sub/${unique_id}/delete/`);
    return response.data;
  } catch (error) {
    return {
      status: false,
      msg: "error",
      message: extractError(error, "Failed to delete item details."),
      error: extractError(error, "Failed to delete item details."),
    };
  }
}

export async function importItemSubExcel(file: File): Promise<ImportItemSubResponse> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await api.post(`${BASE}/import/`, formData);
    return response.data;
  } catch (error) {
    return {
      status: false,
      message: extractError(error, "Failed to import item details."),
      inserted: 0,
      skipped: 0,
      errors: [],
    };
  }
}

