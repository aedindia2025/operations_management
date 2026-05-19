import api from "./axios";

export type OperationApprovalRow = {
  id: string;
  s_no: number;
  poNo: string;
  poDate: string;
  customer: string;
  location: string;
  branchName: string;
  followedBy: string;
  invoiceNo: string;
  invoiceDate: string;
  dcNo: string;
  dcDate: string;
  dcValue: string;
  hasPO: boolean;
  hasDC: boolean;
  hasIR: boolean;
  hasInv: boolean;
  poFileUrl: string;
  dcFileUrl: string;
  irFileUrl: string;
  invFileUrl: string;
  hasCompare: boolean;
  status: "Pending" | "Approved" | "Not Approved";
  approved: string;
  state: string;
  zone: string;
};

export type OperationApprovalListResponse = {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: OperationApprovalRow[];
};

export type OperationApprovalFilterOption = {
  value: string;
  label: string;
};

export type OperationApprovalListParams = {
  draw?: number;
  start?: number;
  length?: number;
  search?: string;
  from_date?: string;
  to_date?: string;
  opt?: string;
  team_mem?: string;
  state?: string;
  zone?: string;
  doc_approval_sts?: string;
};

export type OperationApprovalItem = {
  id: number;
  itemName: string;
  itemDesc: string;
  dcQty: number;
  invoiceValue: number;
  serialNo: string;
};

export type OperationApprovalDetail = {
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  consigneeName: string;
  consigneeAddress: string;
  conbranch: string;
  consigneePhone: string;
  consigneeCity: string;
  poNumber: string;
  poDate: string;
  executiveName: string;
  invoiceNo: string;
  invoiceDate: string;
  dcNo: string;
  dcDate: string;
  items: OperationApprovalItem[];
  approvalStatus: "Pending" | "Approved" | "Not Approved";
  rejectedReason: string;
  approvedBy: string;
  approvedDate: string;
};

function buildPayload(params: OperationApprovalListParams) {
  return {
    draw: params.draw ?? 1,
    start: params.start ?? 0,
    length: params.length ?? 10,
    search: { value: params.search ?? "" },
    from_date: params.from_date ?? "",
    to_date: params.to_date ?? "",
    opt: params.opt ?? "",
    team_mem: params.team_mem ?? "",
    state: params.state ?? "",
    zone: params.zone ?? "",
    doc_approval_sts: params.doc_approval_sts ?? "",
  };
}

export async function fetchPendingOperationApprovalList(params: OperationApprovalListParams) {
  const { data } = await api.post("/master/operation-approval/pending/", buildPayload(params));
  return data as OperationApprovalListResponse;
}

export async function fetchCompletedOperationApprovalList(params: OperationApprovalListParams) {
  const { data } = await api.post("/master/operation-approval/list/", buildPayload(params));
  return data as OperationApprovalListResponse;
}

export async function fetchOperationApprovalFilterOptions() {
  const { data } = await api.get("/master/operation-approval/filter-options/");
  return data as {
    status: boolean;
    states: OperationApprovalFilterOption[];
    zones: OperationApprovalFilterOption[];
  };
}

export async function fetchOperationApprovalDetail(uniqueId: string) {
  const { data } = await api.get(`/master/operation-approval/${encodeURIComponent(uniqueId)}/`);
  return data as { status: boolean; data: OperationApprovalDetail; message?: string };
}

export async function saveOperationApproval(
  uniqueId: string,
  payload: { approvalStatus: "Pending" | "Approved" | "Not Approved"; rejectedReason?: string }
) {
  const { data } = await api.put(`/master/operation-approval/${encodeURIComponent(uniqueId)}/approve/`, payload);
  return data as { status: boolean; msg: string; message?: string; error?: string };
}

export async function deleteOperationApproval(uniqueId: string) {
  const { data } = await api.delete(`/master/operation-approval/${encodeURIComponent(uniqueId)}/delete/`);
  return data as { status: boolean; msg: string; message?: string };
}

export async function bulkApproveOperationApproval(invoiceIds: string[]) {
  const { data } = await api.post("/master/operation-approval/bulk-approve/", {
    invoice_ids: invoiceIds,
  });
  return data as { status: boolean; msg?: string; message?: string; error?: string };
}
