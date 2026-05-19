import api from "./axios";

export interface ProductCategoryRecord {
  unique_id: string | number;
  category_name: string;
  description?: string | null;
  is_active: boolean | number;
  is_active_display?: string;
  is_delete?: boolean | number;
  created_at?: string;
}

export interface ProductCategoryPayload {
  category_name: string;
  description?: string;
  is_active: boolean | number;
}

export interface ProductCategoryApiResponse {
  status?: boolean | number;
  msg?: string;
  message?: string;
  error?: string | Record<string, string[]>;
  data?: unknown;
}

function normalizeListResponse(data: unknown): ProductCategoryRecord[] {
  if (Array.isArray(data)) return data as ProductCategoryRecord[];

  if (data && typeof data === "object") {
    const maybeData = (data as { data?: unknown }).data;
    if (Array.isArray(maybeData)) return maybeData as ProductCategoryRecord[];
  }

  return [];
}

function normalizeDetailResponse(data: unknown): ProductCategoryRecord {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: ProductCategoryRecord }).data;
  }
  return data as ProductCategoryRecord;
}

export async function fetchProductCategoryList(): Promise<ProductCategoryRecord[]> {
  const { data } = await api.get("/master/product-category/list/");
  return normalizeListResponse(data);
}

export async function fetchProductCategoryById(uniqueId: string): Promise<ProductCategoryRecord> {
  const { data } = await api.get(`/master/product-category/${uniqueId}/`);
  return normalizeDetailResponse(data);
}

export async function createProductCategory(payload: ProductCategoryPayload): Promise<ProductCategoryApiResponse> {
  const { data } = await api.post("/master/product-category/create/", payload);
  return data;
}

export async function updateProductCategory(
  uniqueId: string,
  payload: ProductCategoryPayload
): Promise<ProductCategoryApiResponse> {
  const { data } = await api.put(`/master/product-category/${uniqueId}/update/`, payload);
  return data;
}

export async function deleteProductCategory(uniqueId: string): Promise<ProductCategoryApiResponse> {
  const { data } = await api.delete(`/master/product-category/${uniqueId}/delete/`);
  return data;
}
