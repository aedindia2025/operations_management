import api from "./axios";

export type DeliveryConfirmationStatus = "Pending" | "Completed" | "Not Delivered";
export type DeliveryConfirmationFormStatus = "Pending" | "Confirmation" | "Not_deliverd";

export type DeliveryConfirmationRow = {
  id: string;
  s_no: number;
  po_form_unique_id: string;
  consignee_unique_id: string;
  dc_number: string;
  poNo: string;
  poDate: string;
  location: string;
  followedBy: string;
  followedById: string;
  invoice: string;
  invoiceDate: string;
  dc: string;
  dcDate: string;
  deliveryMode: string;
  deliveryDate: string;
  hasAttachment: boolean;
  attachmentName: string;
  attachmentUrl?: string;
  status: DeliveryConfirmationStatus;
  canDelete: boolean;
};

export type DeliveryConfirmationListResponse = {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: DeliveryConfirmationRow[];
};

export type DeliveryConfirmationListParams = {
  draw?: number;
  start?: number;
  length?: number;
  search?: string;
  from_date?: string;
  to_date?: string;
  opt3?: string;
  team_mem3?: string;
  user_type_unique_id?: string;
};

export type DeliveryConfirmationItem = {
  id: number;
  itemName: string;
  itemDesc: string;
  dcQty: number;
  invoiceValue: number;
};

export type DeliveryConfirmationDetail = {
  uniqueId: string;
  poFormUniqueId: string;
  consigneeUniqueId: string;
  dcNumber: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneePhone: string;
  consigneeCity: string;
  poNumber: string;
  poDate: string;
  invoiceNo: string;
  invoiceDate: string;
  dcNo: string;
  dcDate: string;
  deliveryMode: string;
  deliveryDate: string;
  deliveryProof: string | null;
  deliveryProofUrl?: string | null;
  items: DeliveryConfirmationItem[];
  deliveryConfirmationStatus: DeliveryConfirmationFormStatus;
  remarks: string;
  deliveryConfirmedBy: string;
  deliveryConfirmationDate: string;
  personName: string;
  contactNo: string;
  productReceivedDate: string;
};

export async function fetchPendingDeliveryList(params: DeliveryConfirmationListParams) {
  const { data } = await api.post("/master/delivery-confirmation/pending/", {
    draw: params.draw ?? 1,
    start: params.start ?? 0,
    length: params.length ?? 10,
    search: { value: params.search ?? "" },
    from_date: params.from_date ?? "",
    to_date: params.to_date ?? "",
    opt3: params.opt3 ?? "",
    team_mem3: params.team_mem3 ?? "",
    user_type_unique_id: params.user_type_unique_id ?? "",
  });
  return data as DeliveryConfirmationListResponse;
}

export async function fetchCompletedDeliveryList(params: DeliveryConfirmationListParams) {
  const { data } = await api.post("/master/delivery-confirmation/completed/", {
    draw: params.draw ?? 1,
    start: params.start ?? 0,
    length: params.length ?? 10,
    search: { value: params.search ?? "" },
    from_date: params.from_date ?? "",
    to_date: params.to_date ?? "",
    opt3: params.opt3 ?? "",
    team_mem3: params.team_mem3 ?? "",
    user_type_unique_id: params.user_type_unique_id ?? "",
  });
  return data as DeliveryConfirmationListResponse;
}

export async function fetchDeliveryConfirmationDetail(uniqueId: string) {
  const { data } = await api.get(`/master/delivery-confirmation/${encodeURIComponent(uniqueId)}/`);
  return data as { status: boolean; data: DeliveryConfirmationDetail; error?: string };
}

export async function saveDeliveryConfirmation(
  uniqueId: string,
  payload: {
    deliveryConfirmationStatus: DeliveryConfirmationFormStatus;
    remarks?: string;
    personName?: string;
    contactNo?: string;
    productReceivedDate?: string;
  }
) {
  const { data } = await api.post(`/master/delivery-confirmation/${encodeURIComponent(uniqueId)}/update/`, payload);
  return data as { status: boolean; msg: string; error?: string | Record<string, unknown> };
}

export async function bulkConfirmDelivery(payload: {
  records: Array<{ id: string }>;
  personName: string;
  contactNo: string;
  productReceivedDate: string;
  remarks?: string;
}) {
  const { data } = await api.post("/master/delivery-confirmation/bulk-confirm/", payload);
  return data as { status: boolean; msg: string; success_count?: number; error?: string | Record<string, unknown> };
}

export async function deleteDeliveryConfirmation(uniqueId: string) {
  const { data } = await api.delete(`/master/delivery-confirmation/${encodeURIComponent(uniqueId)}/delete/`);
  return data as { status: boolean; msg: string; error?: string };
}
