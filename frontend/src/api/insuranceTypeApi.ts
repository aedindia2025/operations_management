import api from "./axios";

export interface InsuranceTypeRecord {
  unique_id: string;
  insurance_name: string;
  is_active: boolean | number;
  is_active_display?: string;
  is_delete?: boolean | number;
  created_at?: string;
}

export interface InsuranceTypePayload {
  insurance_name: string;
  is_active: boolean | number;
}

export interface InsuranceTypeApiResponse {
  status?: boolean | number;
  msg?: string;
  message?: string;
  error?: string | Record<string, string[]>;
  data?: unknown;
}

function normalizeListResponse(data: unknown): InsuranceTypeRecord[] {
  if (Array.isArray(data)) {
    return data as InsuranceTypeRecord[];
  }

  if (data && typeof data === "object") {
    const maybeData = (data as { data?: unknown }).data;
    if (Array.isArray(maybeData)) {
      return maybeData as InsuranceTypeRecord[];
    }
  }

  return [];
}

export async function fetchInsuranceTypeList(): Promise<InsuranceTypeRecord[]> {
  const { data } = await api.get("/master/insurance-type/list/");
  return normalizeListResponse(data);
}

export async function fetchInsuranceTypeById(uniqueId: string): Promise<InsuranceTypeRecord> {
  const { data } = await api.get(`/master/insurance-type/${uniqueId}/`);
  return data;
}

export async function createInsuranceType(payload: InsuranceTypePayload): Promise<InsuranceTypeApiResponse> {
  const { data } = await api.post("/master/insurance-type/create/", payload);
  return data;
}

export async function updateInsuranceType(
  uniqueId: string,
  payload: InsuranceTypePayload
): Promise<InsuranceTypeApiResponse> {
  const { data } = await api.put(`/master/insurance-type/${uniqueId}/update/`, payload);
  return data;
}

export async function deleteInsuranceType(uniqueId: string): Promise<InsuranceTypeApiResponse> {
  const { data } = await api.delete(`/master/insurance-type/${uniqueId}/delete/`);
  return data;
}
