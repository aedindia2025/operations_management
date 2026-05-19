import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { fetchAccountsApprovalPending } from "../../api/accountsApprovalApi";
import { fetchConsigneeStockPending } from "../../api/consigneeStockApi";
import { fetchPendingDeliveryList } from "../../api/deliveryConfirmationApi";
import { fetchDispatchDelivery, fetchDispatchPending, fetchDispatchTransit } from "../../api/dispatchApi";
import { fetchInstallationList } from "../../api/installationApi";
import { fetchInvoiceList } from "../../api/invoiceApi";
import { fetchMaterialQcList } from "../../api/materialQcApi";
import { fetchPendingOperationApprovalList } from "../../api/operationApprovalApi";
import { fetchPurchaseOrderList } from "../../api/purchaseOrderApi";
import { fetchSignedDocumentList } from "../../api/signedDocumentApi";

type DashboardSectionKey = "operation" | "accounts" | "stores" | "purchase";
type DashboardWidgetKey =
  | "operationApprovalPending"
  | "deliveryConfirmationPending"
  | "signedDocumentIrPending"
  | "signedDocumentSnrPending"
  | "signedDocumentMismatch"
  | "signedDocumentVerified"
  | "installationPending"
  | "installationDcirPending"
  | "accountsApprovalPending"
  | "accountsBillEntryPending"
  | "accountsBillApprovalPending"
  | "consigneeStockPending"
  | "invoiceDcPending"
  | "materialQcPending"
  | "dispatchPending"
  | "dispatchTransit"
  | "dispatchDelivered"
  | "purchaseTotalPo"
  | "purchaseAmcPo";

type DashboardTextAlign = "left" | "center" | "right";

interface DashboardColumn {
  key: string;
  label: string;
  align?: DashboardTextAlign;
}

interface DashboardRow {
  id: string;
  [key: string]: string | number;
}

interface DashboardCountResult {
  count: number;
  value?: string;
}

interface DashboardRowsResult {
  rows: DashboardRow[];
  truncated?: boolean;
}

interface DashboardWidgetState {
  count: number;
  value?: string;
  countLoading: boolean;
  rowsLoading: boolean;
  rowsLoaded: boolean;
  rows: DashboardRow[];
  countError?: string;
  rowsError?: string;
  truncated?: boolean;
}

interface DashboardContextValue {
  userType: string;
  userId: string;
  accYear: string;
}

interface PurchaseSummaryRow {
  team?: string;
  count?: number;
  value?: string;
}

interface PurchaseSummaryResponse {
  status?: boolean;
  po_upload?: PurchaseSummaryRow[];
}

interface DashboardWidgetConfig {
  key: DashboardWidgetKey;
  section: DashboardSectionKey;
  label: string;
  columns: DashboardColumn[];
  isVisible?: (ctx: DashboardContextValue) => boolean;
  fetchCount: (ctx: DashboardContextValue, summary?: PurchaseSummaryResponse | null) => Promise<DashboardCountResult>;
  fetchRows: (ctx: DashboardContextValue) => Promise<DashboardRowsResult>;
}

const OPERATION_USER_TYPES = ["65efd97b4df4040205", "68cba503472bd48995"];
const ACCOUNTS_USER_TYPES = ["6986d6e18a16169083", "65efd985bc61873552", "6618e6e774c7b26263"];
const STORES_USER_TYPES = ["65efd994b203619378", "6718ec397131038891"];
const PURCHASE_USER_TYPES = ["661f525561f5c34413", "65efd9a0b2e8b80472"];
const ALL_ACCESS_USER_TYPES = ["65deef78ba17d65741", "5f97fc3257f2525529", "62b55fe64789d40213", "65fac54da3aac66007"];
const ALL_ACCESS_ROLES = new Set(["productowner", "superadmin"]);
const CONSIGNEE_STOCK_SCREEN_ID = "641ad605643eb62575";
const MODAL_ROW_LIMIT = 200;

const SECTION_TITLES: Record<DashboardSectionKey, string> = {
  operation: "Operation Team",
  accounts: "Accounts Team",
  stores: "Stores Team",
  purchase: "Purchase Team",
};

const SECTION_META: Record<
  DashboardSectionKey,
  {
    eyebrow: string;
    icon: string;
    shellClass: string;
    badgeClass: string;
    ringClass: string;
    cardGlowClass: string;
    iconWrapClass: string;
  }
> = {
  operation: {
    eyebrow: "Approvals & Verification",
    icon: "fa-sitemap",
    shellClass: "border-[#d7e3ba] bg-[linear-gradient(145deg,#fcfff7_0%,#f4f8e8_42%,#edf4dc_100%)]",
    badgeClass: "border-[#d5dfb5] bg-white/90 text-[#506018]",
    ringClass: "from-[#6f8428] via-[#89a13a] to-[#c7d69a]",
    cardGlowClass: "shadow-[0_22px_55px_rgba(92,116,33,0.16)]",
    iconWrapClass: "bg-[linear-gradient(145deg,#5f7423_0%,#7f9732_100%)] text-white",
  },
  accounts: {
    eyebrow: "Finance Workflow",
    icon: "fa-file-invoice-dollar",
    shellClass: "border-[#d7ddf4] bg-[linear-gradient(145deg,#fcfdff_0%,#f1f5ff_40%,#e7eefb_100%)]",
    badgeClass: "border-[#d7ddf4] bg-white/90 text-[#35507d]",
    ringClass: "from-[#4466a3] via-[#6b87c0] to-[#bfd0f3]",
    cardGlowClass: "shadow-[0_22px_55px_rgba(74,96,154,0.14)]",
    iconWrapClass: "bg-[linear-gradient(145deg,#4564a0_0%,#6c88bf_100%)] text-white",
  },
  stores: {
    eyebrow: "Stock, QC & Dispatch",
    icon: "fa-boxes-stacked",
    shellClass: "border-[#dfd8c0] bg-[linear-gradient(145deg,#fffdf8_0%,#fbf5e8_42%,#f2ecde_100%)]",
    badgeClass: "border-[#e0d7bf] bg-white/90 text-[#7b6035]",
    ringClass: "from-[#8a6a33] via-[#aa8343] to-[#e4d2ae]",
    cardGlowClass: "shadow-[0_22px_55px_rgba(128,95,41,0.14)]",
    iconWrapClass: "bg-[linear-gradient(145deg,#85622f_0%,#aa7f42_100%)] text-white",
  },
  purchase: {
    eyebrow: "Orders & AMC",
    icon: "fa-receipt",
    shellClass: "border-[#d9d6ee] bg-[linear-gradient(145deg,#fdfcff_0%,#f4f1fd_40%,#ebe7f8_100%)]",
    badgeClass: "border-[#dbd7f1] bg-white/90 text-[#5c4b84]",
    ringClass: "from-[#6c58a1] via-[#8b74c0] to-[#d6caf1]",
    cardGlowClass: "shadow-[0_22px_55px_rgba(103,81,156,0.14)]",
    iconWrapClass: "bg-[linear-gradient(145deg,#6a579d_0%,#8b74c0_100%)] text-white",
  },
};

function formatDateLabel(value?: string | number | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const [yyyy, mm, dd] = raw.slice(0, 10).split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  return raw;
}

function formatAmount(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCount(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function stringifyCell(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function cellClass(align: DashboardTextAlign = "left") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function buildLocation(title?: string, detail?: string) {
  const parts = [String(title || "").trim(), String(detail || "").trim()].filter(Boolean);
  return parts.join(" | ") || "-";
}

function buildWidgetState(): DashboardWidgetState {
  return {
    count: 0,
    value: undefined,
    countLoading: true,
    rowsLoading: false,
    rowsLoaded: false,
    rows: [],
    countError: undefined,
    rowsError: undefined,
    truncated: false,
  };
}

function sectionMeta(section: DashboardSectionKey) {
  return SECTION_META[section];
}

function summaryValue(summary: PurchaseSummaryResponse | null | undefined, teamName: string) {
  const row = (summary?.po_upload || []).find((item) => String(item.team || "").trim().toLowerCase() === teamName.toLowerCase());
  return row || null;
}

async function fetchPurchaseSummary(accYear: string) {
  const { data } = await api.get("/master/dashboard/summary/", {
    params: accYear ? { acc_year: accYear } : {},
  });
  return data as PurchaseSummaryResponse;
}

function normalizeRole(value?: string) {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sectionOrderForUser(userType: string, role?: string, companyId?: string) {
  if (!companyId || ALL_ACCESS_USER_TYPES.includes(userType) || ALL_ACCESS_ROLES.has(normalizeRole(role))) {
    return ["operation", "accounts", "stores", "purchase"] as DashboardSectionKey[];
  }
  const sections: DashboardSectionKey[] = [];
  if (OPERATION_USER_TYPES.includes(userType)) sections.push("operation");
  if (ACCOUNTS_USER_TYPES.includes(userType)) sections.push("accounts");
  if (STORES_USER_TYPES.includes(userType)) sections.push("stores");
  if (PURCHASE_USER_TYPES.includes(userType)) sections.push("purchase");
  return sections;
}

const DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  {
    key: "operationApprovalPending",
    section: "operation",
    label: "Operation Approval Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer / Location" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount() {
      const response = await fetchPendingOperationApprovalList({ start: 0, length: 1, draw: 1 });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows() {
      const response = await fetchPendingOperationApprovalList({ start: 0, length: MODAL_ROW_LIMIT, draw: 1 });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.id,
          poNo: `${stringifyCell(row.poNo)} / ${formatDateLabel(row.poDate)}`,
          customer: buildLocation(row.customer, `${row.branchName || ""} ${row.location || ""}`.trim()),
          invoiceNo: `${stringifyCell(row.invoiceNo)} / ${formatDateLabel(row.invoiceDate)}`,
          dcNo: `${stringifyCell(row.dcNo)} / ${formatDateLabel(row.dcDate)}`,
          status: stringifyCell(row.status),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "deliveryConfirmationPending",
    section: "operation",
    label: "Delivery Confirmation Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "location", label: "Location" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount(ctx) {
      const response = await fetchPendingDeliveryList({ draw: 1, start: 0, length: 1, user_type_unique_id: ctx.userType });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows(ctx) {
      const response = await fetchPendingDeliveryList({ draw: 1, start: 0, length: MODAL_ROW_LIMIT, user_type_unique_id: ctx.userType });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.id,
          poNo: `${stringifyCell(row.poNo)} / ${formatDateLabel(row.poDate)}`,
          location: row.location || "-",
          invoiceNo: `${stringifyCell(row.invoice)} / ${formatDateLabel(row.invoiceDate)}`,
          dcNo: `${stringifyCell(row.dc)} / ${formatDateLabel(row.dcDate)}`,
          status: stringifyCell(row.status),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "signedDocumentIrPending",
    section: "operation",
    label: "Signed Document IR Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "followedBy", label: "Followed By" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount(ctx) {
      const response = await fetchSignedDocumentList({ tab: "pending", pending_type: "ir", draw: 1, start: 0, length: 1, user_type_unique_id: ctx.userType });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows(ctx) {
      const response = await fetchSignedDocumentList({ tab: "pending", pending_type: "ir", draw: 1, start: 0, length: MODAL_ROW_LIMIT, user_type_unique_id: ctx.userType });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.id,
          poNo: `${stringifyCell(row.poNo)} / ${formatDateLabel(row.poDate)}`,
          customer: stringifyCell(row.ledgerName),
          followedBy: stringifyCell(row.followedBy),
          invoiceNo: `${stringifyCell(row.invoiceNo)} / ${formatDateLabel(row.invoiceDate)}`,
          dcNo: `${stringifyCell(row.dcNo)} / ${formatDateLabel(row.dcDate)}`,
          status: stringifyCell(row.status),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "signedDocumentSnrPending",
    section: "operation",
    label: "Signed Document SNR Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "followedBy", label: "Followed By" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount(ctx) {
      const response = await fetchSignedDocumentList({ tab: "pending", pending_type: "snr", draw: 1, start: 0, length: 1, user_type_unique_id: ctx.userType });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows(ctx) {
      const response = await fetchSignedDocumentList({ tab: "pending", pending_type: "snr", draw: 1, start: 0, length: MODAL_ROW_LIMIT, user_type_unique_id: ctx.userType });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.id,
          poNo: `${stringifyCell(row.poNo)} / ${formatDateLabel(row.poDate)}`,
          customer: stringifyCell(row.ledgerName),
          followedBy: stringifyCell(row.followedBy),
          invoiceNo: `${stringifyCell(row.invoiceNo)} / ${formatDateLabel(row.invoiceDate)}`,
          dcNo: `${stringifyCell(row.dcNo)} / ${formatDateLabel(row.dcDate)}`,
          status: stringifyCell(row.status),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "signedDocumentMismatch",
    section: "operation",
    label: "Signed Document Mismatch",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "followedBy", label: "Followed By" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "reason", label: "Reject Reason" },
    ],
    async fetchCount(ctx) {
      const response = await fetchSignedDocumentList({ tab: "mismatch", draw: 1, start: 0, length: 1, user_type_unique_id: ctx.userType });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows(ctx) {
      const response = await fetchSignedDocumentList({ tab: "mismatch", draw: 1, start: 0, length: MODAL_ROW_LIMIT, user_type_unique_id: ctx.userType });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.id,
          poNo: `${stringifyCell(row.poNo)} / ${formatDateLabel(row.poDate)}`,
          customer: stringifyCell(row.ledgerName),
          followedBy: stringifyCell(row.followedBy),
          invoiceNo: `${stringifyCell(row.invoiceNo)} / ${formatDateLabel(row.invoiceDate)}`,
          dcNo: `${stringifyCell(row.dcNo)} / ${formatDateLabel(row.dcDate)}`,
          reason: stringifyCell("rejectReason" in row ? row.rejectReason : ""),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "signedDocumentVerified",
    section: "operation",
    label: "Signed Document Verified",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "followedBy", label: "Followed By" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount(ctx) {
      const response = await fetchSignedDocumentList({ tab: "verified", draw: 1, start: 0, length: 1, user_type_unique_id: ctx.userType });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows(ctx) {
      const response = await fetchSignedDocumentList({ tab: "verified", draw: 1, start: 0, length: MODAL_ROW_LIMIT, user_type_unique_id: ctx.userType });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.id,
          poNo: `${stringifyCell(row.poNo)} / ${formatDateLabel(row.poDate)}`,
          customer: stringifyCell(row.ledgerName),
          followedBy: stringifyCell(row.followedBy),
          invoiceNo: `${stringifyCell(row.invoiceNo)} / ${formatDateLabel(row.invoiceDate)}`,
          dcNo: `${stringifyCell(row.dcNo)} / ${formatDateLabel(row.dcDate)}`,
          status: stringifyCell(row.status),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "installationPending",
    section: "operation",
    label: "Installation Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "teamMember", label: "Team Member" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount(ctx) {
      const response = await fetchInstallationList({ tab: "pending", page: 1, length: 1, user_type_unique_id: ctx.userType, user_unique_id: ctx.userId });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows(ctx) {
      const response = await fetchInstallationList({ tab: "pending", page: 1, length: MODAL_ROW_LIMIT, user_type_unique_id: ctx.userType, user_unique_id: ctx.userId });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.unique_id || row.source_unique_id,
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          customer: stringifyCell(row.ledger_name),
          teamMember: stringifyCell(row.team_member),
          invoiceNo: `${stringifyCell(row.invoice_no)} / ${formatDateLabel(row.invoice_date)}`,
          dcNo: `${stringifyCell(row.dc_number)} / ${formatDateLabel(row.dc_date)}`,
          status: stringifyCell(row.status),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "installationDcirPending",
    section: "operation",
    label: "Installation DC & IR Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "teamMember", label: "Team Member" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount(ctx) {
      const response = await fetchInstallationList({ tab: "dcir_pending", page: 1, length: 1, user_type_unique_id: ctx.userType, user_unique_id: ctx.userId });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows(ctx) {
      const response = await fetchInstallationList({ tab: "dcir_pending", page: 1, length: MODAL_ROW_LIMIT, user_type_unique_id: ctx.userType, user_unique_id: ctx.userId });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.unique_id || row.source_unique_id,
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          customer: stringifyCell(row.ledger_name),
          teamMember: stringifyCell(row.team_member),
          invoiceNo: `${stringifyCell(row.invoice_no)} / ${formatDateLabel(row.invoice_date)}`,
          dcNo: `${stringifyCell(row.dc_number)} / ${formatDateLabel(row.dc_date)}`,
          status: stringifyCell(row.dc_delivery_status || row.status),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "accountsApprovalPending",
    section: "accounts",
    label: "Accounts Approval Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount() {
      const response = await fetchAccountsApprovalPending({ start: 0, length: 1 });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows() {
      const response = await fetchAccountsApprovalPending({ start: 0, length: MODAL_ROW_LIMIT });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.unique_id,
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          customer: buildLocation(row.department_name, row.con_address),
          invoiceNo: `${stringifyCell(row.invoice_no)} / ${formatDateLabel(row.invoice_date)}`,
          dcNo: `${stringifyCell(row.dc_number)} / ${formatDateLabel(row.dc_date)}`,
          status: stringifyCell(row.ac_verify_status),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "accountsBillEntryPending",
    section: "accounts",
    label: "Accounts Team Bill Entry Pending",
    columns: [
      { key: "billNo", label: "Bill No / Date" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "vendor", label: "Vendor" },
      { key: "dcCount", label: "DC Count", align: "center" },
      { key: "billValue", label: "Bill Value", align: "right" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount() {
      const response = await api.get("/master/accounts-bill-entry/list/", { params: { tab: "pending", page: 1, length: 1 } });
      return { count: parseCount(response.data?.total) };
    },
    async fetchRows() {
      const response = await api.get("/master/accounts-bill-entry/list/", { params: { tab: "pending", page: 1, length: MODAL_ROW_LIMIT } });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      return {
        rows: rows.map((row: Record<string, unknown>) => ({
          id: stringifyCell(row.id),
          billNo: `${stringifyCell(row.bill_no)} / ${formatDateLabel(row.vendor_bill_date)}`,
          invoiceNo: `${stringifyCell(row.invoice_no)} / ${formatDateLabel(row.vendor_invoice_date)}`,
          vendor: stringifyCell(row.vendor_name),
          dcCount: parseCount(row.dc_count),
          billValue: formatAmount(row.bill_value),
          status: stringifyCell(row.status),
        })),
        truncated: parseCount(response.data?.total) > rows.length,
      };
    },
  },
  {
    key: "accountsBillApprovalPending",
    section: "accounts",
    label: "Accounts Bill Approval Pending",
    columns: [
      { key: "billNo", label: "Bill No / Date" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "vendor", label: "Vendor" },
      { key: "dcCount", label: "DC Count", align: "center" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount() {
      const response = await api.get("/master/accounts-bill-approval/list/", { params: { tab: "pending", page: 1, length: 1 } });
      return { count: parseCount(response.data?.total) };
    },
    async fetchRows() {
      const response = await api.get("/master/accounts-bill-approval/list/", { params: { tab: "pending", page: 1, length: MODAL_ROW_LIMIT } });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      return {
        rows: rows.map((row: Record<string, unknown>) => ({
          id: stringifyCell(row.id),
          billNo: `${stringifyCell(row.bill_no)} / ${formatDateLabel(row.bill_date)}`,
          invoiceNo: `${stringifyCell(row.invoice_no)} / ${formatDateLabel(row.invoice_date)}`,
          vendor: stringifyCell(row.vendor_name),
          dcCount: parseCount(row.dc_count),
          amount: formatAmount(row.amount),
          status: stringifyCell(row.status),
        })),
        truncated: parseCount(response.data?.total) > rows.length,
      };
    },
  },
  {
    key: "consigneeStockPending",
    section: "stores",
    label: "Consignee Stock Assign Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "stockId", label: "Stock ID" },
      { key: "customer", label: "Customer" },
      { key: "executive", label: "Executive" },
      { key: "balanceQty", label: "Balance Qty", align: "right" },
      { key: "status", label: "Status", align: "center" },
    ],
    async fetchCount(ctx) {
      const response = await fetchConsigneeStockPending({ draw: 1, start: 0, length: 1, search: { value: "" }, screen_id_val: CONSIGNEE_STOCK_SCREEN_ID, user_type_unique_id: ctx.userType });
      return { count: parseCount(response?.recordsTotal || response?.recordsFiltered) };
    },
    async fetchRows(ctx) {
      const response = await fetchConsigneeStockPending({ draw: 1, start: 0, length: MODAL_ROW_LIMIT, search: { value: "" }, screen_id_val: CONSIGNEE_STOCK_SCREEN_ID, user_type_unique_id: ctx.userType });
      const rows = Array.isArray(response?.data) ? response.data : [];
      return {
        rows: rows.map((row: Record<string, unknown>) => ({
          id: stringifyCell(row.form_main_unique_id || row.unique_id || row.stock_id),
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          stockId: stringifyCell(row.stock_id),
          customer: stringifyCell(row.customer_name || row.department),
          executive: stringifyCell(row.executive_name),
          balanceQty: parseCount(row.remain_qty ?? row.balance_qty),
          status: stringifyCell(row.status || "Pending"),
        })),
        truncated: parseCount(response?.recordsTotal || response?.recordsFiltered) > rows.length,
      };
    },
  },
  {
    key: "invoiceDcPending",
    section: "stores",
    label: "Invoice & DC Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "stockId", label: "Stock ID" },
      { key: "customer", label: "Customer" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "value", label: "Value", align: "right" },
    ],
    async fetchCount() {
      const response = await fetchInvoiceList({ tab: "pending" });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows() {
      const response = await fetchInvoiceList({ tab: "pending" });
      const rows = Array.isArray(response.data) ? response.data.slice(0, MODAL_ROW_LIMIT) : [];
      return {
        rows: rows.map((row) => ({
          id: row.unique_id,
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          stockId: stringifyCell(row.stock_id),
          customer: stringifyCell(row.customer_name),
          invoiceNo: stringifyCell(row.invoice_no),
          dcNo: stringifyCell(row.dc_number),
          value: formatAmount(row.invoice_value),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > rows.length,
      };
    },
  },
  {
    key: "materialQcPending",
    section: "stores",
    label: "Material QC Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "followedBy", label: "Followed By" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Accounts Status", align: "center" },
    ],
    async fetchCount() {
      const response = await fetchMaterialQcList({ tab: "pending", page: 1, length: 1 });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows() {
      const response = await fetchMaterialQcList({ tab: "pending", page: 1, length: MODAL_ROW_LIMIT });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.id,
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          customer: stringifyCell(row.ledger_name || row.con_address),
          followedBy: stringifyCell(row.team_member),
          invoiceNo: `${stringifyCell(row.invoice_no)} / ${formatDateLabel(row.invoice_date)}`,
          dcNo: `${stringifyCell(row.dc_number)} / ${formatDateLabel(row.dc_date)}`,
          status: stringifyCell(row.ac_team_status_label),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "dispatchPending",
    section: "stores",
    label: "Dispatch Pending",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "teamMember", label: "Team Member" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "value", label: "Value", align: "right" },
    ],
    async fetchCount() {
      const response = await fetchDispatchPending({ page: 1, length: 1 });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows() {
      const response = await fetchDispatchPending({ page: 1, length: MODAL_ROW_LIMIT });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.unique_id,
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          customer: stringifyCell(row.ledger_name || row.con_address),
          teamMember: stringifyCell(row.team_member),
          invoiceNo: `${stringifyCell(row.invoice_no)} / ${formatDateLabel(row.invoice_date)}`,
          dcNo: `${stringifyCell(row.dc_number)} / ${formatDateLabel(row.dc_date)}`,
          value: formatAmount(row.invoice_value),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "dispatchTransit",
    section: "stores",
    label: "Dispatch Transit",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "teamMember", label: "Team Member" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "status", label: "Delivery Status", align: "center" },
    ],
    async fetchCount() {
      const response = await fetchDispatchTransit({ page: 1, length: 1 });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows() {
      const response = await fetchDispatchTransit({ page: 1, length: MODAL_ROW_LIMIT });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.unique_id,
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          customer: stringifyCell(row.ledger_name || row.con_address),
          teamMember: stringifyCell(row.team_member),
          invoiceNo: `${stringifyCell(row.invoice_no)} / ${formatDateLabel(row.invoice_date)}`,
          dcNo: `${stringifyCell(row.dc_number)} / ${formatDateLabel(row.dc_date)}`,
          status: stringifyCell(row.delivery_status_text || row.status),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "dispatchDelivered",
    section: "stores",
    label: "Dispatch Delivered",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "teamMember", label: "Team Member" },
      { key: "invoiceNo", label: "Invoice" },
      { key: "dcNo", label: "DC" },
      { key: "deliveryDate", label: "Delivery Date", align: "center" },
    ],
    async fetchCount() {
      const response = await fetchDispatchDelivery({ page: 1, length: 1 });
      return { count: parseCount(response.recordsTotal || response.recordsFiltered) };
    },
    async fetchRows() {
      const response = await fetchDispatchDelivery({ page: 1, length: MODAL_ROW_LIMIT });
      return {
        rows: (response.data || []).map((row) => ({
          id: row.unique_id,
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          customer: stringifyCell(row.ledger_name || row.con_address),
          teamMember: stringifyCell(row.team_member),
          invoiceNo: `${stringifyCell(row.invoice_no)} / ${formatDateLabel(row.invoice_date)}`,
          dcNo: `${stringifyCell(row.dc_number)} / ${formatDateLabel(row.dc_date)}`,
          deliveryDate: formatDateLabel(row.delivery_date),
        })),
        truncated: parseCount(response.recordsTotal || response.recordsFiltered) > (response.data || []).length,
      };
    },
  },
  {
    key: "purchaseTotalPo",
    section: "purchase",
    label: "Total PO List",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "executive", label: "Executive" },
      { key: "value", label: "PO Value", align: "right" },
    ],
    async fetchCount(_ctx, summary) {
      const row = summaryValue(summary, "Total Purchase Order");
      return { count: parseCount(row?.count), value: row?.value ? `Rs ${row.value}` : undefined };
    },
    async fetchRows(ctx) {
      const response = await fetchPurchaseOrderList({ draw: 1, start: 0, length: MODAL_ROW_LIMIT, user_type_unique_id: ctx.userType, user_unique_id: ctx.userId });
      const rows = Array.isArray(response?.data) ? response.data : [];
      return {
        rows: rows.map((row: Record<string, unknown>) => ({
          id: stringifyCell(row.unique_id),
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          customer: stringifyCell(row.customer_name || row.department_display || row.department),
          executive: stringifyCell(row.executive_label || row.executive_name_display || row.executive_name),
          value: formatAmount(row.total_value || row.total_amount),
        })),
        truncated: parseCount(response?.recordsTotal || response?.recordsFiltered) > rows.length,
      };
    },
  },
  {
    key: "purchaseAmcPo",
    section: "purchase",
    label: "AMC PO",
    columns: [
      { key: "poNo", label: "PO No / Date" },
      { key: "customer", label: "Customer" },
      { key: "executive", label: "Executive" },
      { key: "value", label: "AMC Value", align: "right" },
    ],
    async fetchCount(_ctx, summary) {
      const row = summaryValue(summary, "AMC");
      return { count: parseCount(row?.count), value: row?.value ? `Rs ${row.value}` : undefined };
    },
    async fetchRows(ctx) {
      const response = await fetchPurchaseOrderList({ draw: 1, start: 0, length: MODAL_ROW_LIMIT, user_type_unique_id: ctx.userType, user_unique_id: ctx.userId, amc_only: 1 });
      const rows = Array.isArray(response?.data) ? response.data : [];
      return {
        rows: rows.map((row: Record<string, unknown>) => ({
          id: stringifyCell(row.unique_id),
          poNo: `${stringifyCell(row.po_num)} / ${formatDateLabel(row.po_date)}`,
          customer: stringifyCell(row.customer_name || row.department_display || row.department),
          executive: stringifyCell(row.executive_label || row.executive_name_display || row.executive_name),
          value: formatAmount(row.amcvalue || row.total_value || row.total_amount),
        })),
        truncated: parseCount(response?.recordsTotal || response?.recordsFiltered) > rows.length,
      };
    },
  },
];

function formatMetricCount(count: number) {
  return count.toLocaleString("en-IN");
}

function statusMeta(count: number, loading: boolean, error?: string) {
  if (loading) return { label: "Loading", className: "border-sky-200 bg-sky-50 text-sky-700", dotClass: "bg-sky-500" };
  if (error) return { label: "Error", className: "border-red-200 bg-red-50 text-red-700", dotClass: "bg-red-500" };
  if (count > 0) return { label: "Needs Review", className: "border-amber-200 bg-amber-50 text-amber-700", dotClass: "bg-amber-500" };
  return { label: "No Pending", className: "border-emerald-200 bg-emerald-50 text-emerald-700", dotClass: "bg-emerald-500" };
}


function MetricCard({ section, label, count, value, loading, error, onOpen }: { section: DashboardSectionKey; label: string; count: number; value?: string; loading: boolean; error?: string; onOpen: () => void; }) {
  const meta = sectionMeta(section);
  const status = statusMeta(count, loading, error);
  return (
    <article className="group relative overflow-hidden rounded-[16px] border border-[#e3e7d9] bg-white shadow-[0_14px_34px_rgba(20,31,16,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b9c99a] hover:shadow-[0_18px_42px_rgba(20,31,16,0.1)]">
      <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${meta.ringClass}`} />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.iconWrapClass}`}>
                <i className={`fa ${meta.icon} text-[14px]`} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[#87906f]">{meta.eyebrow}</p>
                <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-5 text-[#202a17]">{label}</h3>
              </div>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${status.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
            {status.label}
          </span>
        </div>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[30px] font-extrabold leading-none text-[#1f2b16]">{loading ? "..." : formatMetricCount(count)}</p>
            {value ? <p className="mt-2 text-[12px] font-bold text-[#617042]">{value}</p> : <p className="mt-2 text-[12px] font-semibold text-[#8b9478]">Pending records</p>}
          </div>
          <button
            type="button"
            onClick={onOpen}
            disabled={loading || count <= 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe7d2] bg-[#fbfcf7] text-[#5d6c20] transition-all hover:border-[#9aad6f] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
            title="View records"
          >
            <i className="fa fa-eye text-[14px]" />
          </button>
        </div>
        {error ? <p className="mt-3 rounded-[8px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-danger">{error}</p> : null}
      </div>
    </article>
  );
}

function SectionCard({ section, title, widgetCount, children }: { section: DashboardSectionKey; title: string; widgetCount: number; children: ReactNode }) {
  const meta = sectionMeta(section);
  return (
    <section className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${meta.iconWrapClass}`}>
            <i className={`fa ${meta.icon} text-[15px]`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7d8665]">{meta.eyebrow}</p>
            <h2 className="mt-0.5 text-[18px] font-bold text-[#202a17]">{title}</h2>
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-[11px] font-bold ${meta.badgeClass}`}>
          {widgetCount} metric{widgetCount === 1 ? "" : "s"}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">{children}</div>
    </section>
  );
}

function RecordsModal({ title, columns, rows, loading, error, truncated, onClose }: { title: string; columns: DashboardColumn[]; rows: DashboardRow[]; loading: boolean; error?: string; truncated?: boolean; onClose: () => void; }) {
  const [search, setSearch] = useState("");
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => columns.some((column) => stringifyCell(row[column.key]).toLowerCase().includes(query)));
  }, [columns, rows, search]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(30,36,18,0.52)] px-4 py-6 backdrop-blur-[3px]">
      <div className="w-full max-w-[96vw] overflow-hidden rounded-[28px] border border-[#dfe6c9] bg-[linear-gradient(180deg,#ffffff_0%,#fcfdf8_100%)] shadow-[0_30px_90px_rgba(29,37,17,0.28)]">
        <div className="relative border-b border-[#e0e6cb] px-6 py-5" style={{ background: "linear-gradient(135deg, #eef4da 0%, #fbfdf4 100%)" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b9166]">Popup Records</p>
              <h3 className="mt-1 text-[18px] font-bold text-[#31401a]">{title}</h3>
            </div>
            <div className="pr-12 text-right text-[12px] text-[#69734b]">
              {loading ? "Loading records..." : `${filteredRows.length} visible row(s)`}
            </div>
          </div>
          <button type="button" onClick={onClose} className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#c0392b] text-white shadow-[0_10px_22px_rgba(192,57,43,0.28)] transition-colors hover:bg-[#a93226]">
            <i className="fa fa-xmark text-[18px]" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#e1e7cf] bg-[linear-gradient(135deg,#fffffc_0%,#f6faec_100%)] px-4 py-4">
            <div className="text-[13px] text-ink-secondary">
              {loading ? "Loading records..." : `${filteredRows.length} record(s) shown`}
              {truncated && !loading ? ` - Showing first ${rows.length} rows` : ""}
            </div>
            <input name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records..."
              className="w-full max-w-xs rounded-2xl border border-[#d0d8b3] bg-white px-4 py-2.5 text-[13px] outline-none transition focus:border-[#7b962f] focus:ring-4 focus:ring-[#9fba4d]/15"
            />
          </div>
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-danger">{error}</div> : null}
          <div className="overflow-hidden rounded-[24px] border border-[#dfe5c9] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="max-h-[62vh] overflow-auto">
            <table className="min-w-full border-collapse text-[13px]">
              <thead>
                <tr className="sticky top-0 z-10 bg-[linear-gradient(180deg,#f8fbe9_0%,#eef4da_100%)]">
                  {columns.map((column) => <th key={column.key} className={`border-b border-line px-4 py-3 font-semibold text-[#4c5c1a] ${cellClass(column.align)}`}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-ink-muted">Loading records...</td></tr>
                ) : filteredRows.length ? (
                  filteredRows.map((row, index) => (
                    <tr key={`${row.id}-${index}`} className="border-b border-line/70 odd:bg-white even:bg-[#fbfcf6]">
                      {columns.map((column) => <td key={column.key} className={`px-4 py-3 align-top text-[#283118] ${cellClass(column.align)}`}>{stringifyCell(row[column.key])}</td>)}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-ink-muted">No records found.</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const userType = user?.user_type_unique_id || "";
  const ctx = useMemo<DashboardContextValue>(() => ({ userType, userId: user?.unique_id || "", accYear: user?.acc_year || "" }), [user?.acc_year, user?.unique_id, userType]);
  const sectionOrder = useMemo(() => sectionOrderForUser(userType, user?.role, user?.sess_company_id), [user?.role, user?.sess_company_id, userType]);
  const activeWidgets = useMemo(
    () => DASHBOARD_WIDGETS.filter((widget) => sectionOrder.includes(widget.section) && (widget.isVisible ? widget.isVisible(ctx) : true)),
    [ctx, sectionOrder]
  );
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummaryResponse | null>(null);
  const [widgetState, setWidgetState] = useState<Record<DashboardWidgetKey, DashboardWidgetState>>(() => {
    const state = {} as Record<DashboardWidgetKey, DashboardWidgetState>;
    DASHBOARD_WIDGETS.forEach((widget) => { state[widget.key] = buildWidgetState(); });
    return state;
  });
  const [activeWidgetKey, setActiveWidgetKey] = useState<DashboardWidgetKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sectionOrder.includes("purchase")) {
      setPurchaseSummary(null);
      return () => { cancelled = true; };
    }
    const loadSummary = async () => {
      try {
        const data = await fetchPurchaseSummary(ctx.accYear);
        if (!cancelled) setPurchaseSummary(data);
      } catch {
        if (!cancelled) setPurchaseSummary({ po_upload: [] });
      }
    };
    void loadSummary();
    return () => { cancelled = true; };
  }, [ctx.accYear, sectionOrder]);

  useEffect(() => {
    let cancelled = false;
    activeWidgets.forEach((widget) => {
      const isPurchaseMetric = widget.section === "purchase";
      if (isPurchaseMetric && !purchaseSummary) {
        setWidgetState((prev) => ({ ...prev, [widget.key]: { ...prev[widget.key], countLoading: true } }));
        return;
      }
      setWidgetState((prev) => ({ ...prev, [widget.key]: { ...prev[widget.key], countLoading: true, countError: undefined } }));
      void widget.fetchCount(ctx, purchaseSummary).then((result) => {
        if (cancelled) return;
        setWidgetState((prev) => ({ ...prev, [widget.key]: { ...prev[widget.key], count: result.count, value: result.value, countLoading: false, countError: undefined } }));
      }).catch((error) => {
        if (cancelled) return;
        setWidgetState((prev) => ({ ...prev, [widget.key]: { ...prev[widget.key], countLoading: false, countError: error instanceof Error ? error.message : "Failed to load count." } }));
      });
    });
    return () => { cancelled = true; };
  }, [activeWidgets, ctx, purchaseSummary]);

  const openWidget = async (widgetKey: DashboardWidgetKey) => {
    const widget = DASHBOARD_WIDGETS.find((item) => item.key === widgetKey);
    if (!widget) return;
    setActiveWidgetKey(widgetKey);
    const current = widgetState[widgetKey];
    if (current.rowsLoaded || current.rowsLoading) return;
    setWidgetState((prev) => ({ ...prev, [widgetKey]: { ...prev[widgetKey], rowsLoading: true, rowsError: undefined } }));
    try {
      const result = await widget.fetchRows(ctx);
      setWidgetState((prev) => ({ ...prev, [widgetKey]: { ...prev[widgetKey], rowsLoading: false, rowsLoaded: true, rows: result.rows, rowsError: undefined, truncated: result.truncated } }));
    } catch (error) {
      setWidgetState((prev) => ({ ...prev, [widgetKey]: { ...prev[widgetKey], rowsLoading: false, rowsLoaded: true, rowsError: error instanceof Error ? error.message : "Failed to load records." } }));
    }
  };

  const groupedWidgets = useMemo(() => sectionOrder.map((section) => ({
    section,
    title: SECTION_TITLES[section],
    widgets: activeWidgets.filter((widget) => widget.section === section),
  })), [activeWidgets, sectionOrder]);

  const activeWidget = activeWidgetKey ? DASHBOARD_WIDGETS.find((widget) => widget.key === activeWidgetKey) || null : null;
  const activeState = activeWidgetKey ? widgetState[activeWidgetKey] : null;

  return (
    <div className="min-h-full bg-[#f3f4f0] p-5">
      {groupedWidgets.length ? (
        <div className="space-y-6">
          {groupedWidgets.map((group) => (
            group.widgets.length ? (
              <SectionCard key={group.section} section={group.section} title={group.title} widgetCount={group.widgets.length}>
                {group.widgets.map((widget) => {
                  const state = widgetState[widget.key];
                  return <MetricCard key={widget.key} section={group.section} label={widget.label} count={state.count} value={state.value} loading={state.countLoading} error={state.countError} onOpen={() => { void openWidget(widget.key); }} />;
                })}
              </SectionCard>
            ) : null
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-[#d7dfbc] bg-white px-6 py-10 text-center text-[14px] text-ink-secondary shadow-card">No dashboard is configured yet for this user type.</div>
      )}
      {activeWidget && activeState ? <RecordsModal title={activeWidget.label} columns={activeWidget.columns} rows={activeState.rows} loading={activeState.rowsLoading} error={activeState.rowsError} truncated={activeState.truncated} onClose={() => setActiveWidgetKey(null)} /> : null}
    </div>
  );
}
