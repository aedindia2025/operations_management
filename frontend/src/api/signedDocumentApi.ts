import api from "./axios";

export type SignedDocumentPendingRow = {
  id: string;
  verificationUniqueId: string;
  consigneeUniqueId: string;
  formMainUniqueId: string;
  insUniqueId: string;
  poNo: string;
  poDate: string;
  followedBy: string;
  ledgerName: string;
  ledgerCity: string;
  ledgerState: string;
  invoiceNo: string;
  invoiceDate: string;
  dcNo: string;
  dcDate: string;
  dcRecStatus: string;
  dcSignAtt: boolean;
  dcFileUrl?: string;
  irRecStatus: string;
  irSignAtt: boolean;
  irFileUrl?: string;
  irPodDate: string;
  snrRecStatus: string;
  snrSignAtt: boolean;
  snrFileUrl?: string;
  snrPodDate: string;
  status: "Pending" | "Mismatch" | "Verified";
  canDelete: boolean;
  rejectReason: string;
  s_no: number;
};

export type SignedDocumentSavedRow = {
  id: string;
  verificationUniqueId: string;
  consigneeUniqueId: string;
  formMainUniqueId: string;
  insUniqueId: string;
  poNo: string;
  poDate: string;
  followedBy: string;
  ledgerName: string;
  ledgerCity: string;
  ledgerState: string;
  invoiceNo: string;
  invoiceDate: string;
  dcNo: string;
  dcDate: string;
  dcSignedDoc: boolean;
  dcFileUrl?: string;
  installSignedReport: boolean;
  installSignedReportUrl?: string;
  status: "Pending" | "Mismatch" | "Verified";
  rejectReason: string;
  canDelete: boolean;
  s_no: number;
};

export type SignedDocumentListResponse<T> = {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: T[];
};

export type SignedDocumentDetail = {
  verificationUniqueId: string;
  consigneeUniqueId: string;
  formMainUniqueId: string;
  insUniqueId: string;
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
  dcNumber: string;
  dcDate: string;
  deliveryDate: string;
  dcPodNo: string;
  dcPodDate: string;
  irPodNo: string;
  irPodDate: string;
  snrPodNo: string;
  snrPodDate: string;
  poAttachment: string | null;
  dcSignedDocument: string | null;
  installationSignedReport: string | null;
  items: Array<{
    id: number;
    itemName: string;
    itemDesc: string;
    dcQty: number;
    invoiceValue: number;
  }>;
  dcReceivedStatus: string;
  dcSignedDate: string;
  irReceivedStatus: string;
  irSignedDate: string;
  snrReceivedStatus: string;
  snrSignedDate: string;
  hoReceivedDate: string;
  docVerification: "Pending" | "Verified" | "Mismatch/Rejected";
  primaryProductForBg: string;
  processedWithBg: boolean;
  processedWithoutBg: boolean;
  rejectReason: string;
  docChn: string;
  sts: string;
  sts1: string;
  sts2: string;
  dcRequired: string;
  snrVerifyStatus: number;
};

export type SignedDocumentListParams = {
  draw?: number;
  start?: number;
  length?: number;
  search?: string;
  from_date?: string;
  to_date?: string;
  opt?: string;
  followed_by?: string;
  team_mem?: string;
  screen_id_val?: string;
  user_type_unique_id?: string;
  tab: "pending" | "mismatch" | "verified";
  pending_type?: "ir" | "snr";
};

function buildPayload(params: SignedDocumentListParams) {
  return {
    draw: params.draw ?? 1,
    start: params.start ?? 0,
    length: params.length ?? 10,
    search: { value: params.search ?? "" },
    from_date: params.from_date ?? "",
    to_date: params.to_date ?? "",
    opt: params.opt ?? "",
    followed_by: params.followed_by ?? "",
    team_mem: params.team_mem ?? params.followed_by ?? "",
    screen_id_val: params.screen_id_val ?? "",
    user_type_unique_id: params.user_type_unique_id ?? "",
    tab: params.tab,
    pending_type: params.pending_type ?? "ir",
  };
}

export async function fetchSignedDocumentList<T extends SignedDocumentPendingRow | SignedDocumentSavedRow>(
  params: SignedDocumentListParams
) {
  const { data } = await api.post("/master/signed-doc-verification/list/", buildPayload(params));
  return data as SignedDocumentListResponse<T>;
}

export async function fetchSignedDocumentDetail(params: {
  consigneeUniqueId: string;
  invoiceNo: string;
  dcNumber: string;
  insUniqueId: string;
}) {
  const { data } = await api.get(
    `/master/signed-doc-verification/${encodeURIComponent(params.consigneeUniqueId)}/`,
    {
      params: {
        invoice_no: params.invoiceNo,
        dc_number: params.dcNumber,
        ins_unique_id: params.insUniqueId,
      },
    }
  );
  return data as { status: boolean; data: SignedDocumentDetail; message?: string };
}

export async function saveSignedDocument(payload: SignedDocumentDetail) {
  const { data } = await api.post("/master/signed-doc-verification/save/", payload);
  return data as { status: boolean; message?: string; verificationUniqueId?: string };
}

export async function deleteSignedDocument(
  uniqueId: string,
  fallback?: {
    consigneeUniqueId?: string;
    invoiceNo?: string;
    dcNumber?: string;
    insUniqueId?: string;
    formMainUniqueId?: string;
  }
) {
  const params = new URLSearchParams();
  if (fallback?.consigneeUniqueId) params.set("consignee_unique_id", fallback.consigneeUniqueId);
  if (fallback?.invoiceNo) params.set("invoice_no", fallback.invoiceNo);
  if (fallback?.dcNumber) params.set("dc_number", fallback.dcNumber);
  if (fallback?.insUniqueId) params.set("ins_unique_id", fallback.insUniqueId);
  if (fallback?.formMainUniqueId) params.set("form_main_unique_id", fallback.formMainUniqueId);

  const query = params.toString();
  const url = `/master/signed-doc-verification/${encodeURIComponent(uniqueId)}/delete/${query ? `?${query}` : ""}`;
  const { data } = await api.delete(url);
  return data as { status: boolean; message?: string };
}
