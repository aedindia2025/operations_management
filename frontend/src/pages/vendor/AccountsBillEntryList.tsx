import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import api from "../../api/axios";
import PageTopbar from "../../components/common/PageTopbar";
import PageTabs from "../../components/common/PageTabs";
import TableToolbar from "../../components/common/TableToolbar";
import { showErrorAlert, showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import ApprovalStepsCard, { type ApprovalStep } from "../../components/common/ApprovalStepsCard";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import VendorPaymentPageIntro from "../../components/common/VendorPaymentPageIntro";

type TabType = "Pending" | "Complete";
type ModalMode = "edit" | "view";
type ActionStatus = "" | "Approved" | "Reject";

interface DCItem {
  s_no: number;
  dc_no: string;
  dc_date: string;
  invoice_no: string;
  invoice_date: string;
  po_no: string;
  po_date: string;
  consignee_address: string;
  unit_price: number;
  basic_amount: number;
  gst: string;
  gst_amount: number;
  total_amount: number;
}

interface ApprovalRow {
  s_no: number;
  bill_created_by: string;
  bill_created_at: string;
  bill_created_status: string;
  operation_by: string;
  operation_at: string;
  operation_status: string;
  account_entry_by: string;
  account_entry_at: string;
  account_entry_status: string;
  accounts_approval_by: string;
  accounts_approval_at: string;
  accounts_approval_status: string;
  management_by: string;
  management_at: string;
  management_status: string;
  payment_amount: string;
  payment_status: string;
}

interface BillDetail {
  id: string;
  vendor_name: string;
  vendor_company_name: string;
  vendor_address: string;
  vendor_gst: string;
  vendor_pan: string;
  vendor_email: string;
  vendor_phone: string;
  vendor_bill_no: string;
  vendor_bill_date: string;
  vendor_invoice_no: string;
  vendor_invoice_date: string;
  account_bill_id: string;
  remarks: string;
  invoice_attach_url: string;
  po_attach_url: string;
  bank_name: string;
  branch: string;
  account_no: string;
  ifsc_code: string;
  account_holder: string;
  pan_copy_url: string;
  bank_proof_url: string;
  dc_items: DCItem[];
  basic_amount: number;
  gst_percentage: string;
  gst_amount: number;
  with_gst_total_amount: number;
  total_amount: number;
  tds_deduction: number;
  total_tds_amount: number;
  others_deduction: number;
  advance_amount: number;
  additional_charges: number;
  total_payable: number;
  approvals: ApprovalRow[];
}

interface Row {
  id: string;
  vendor_bill_date: string;
  bill_no: string;
  vendor_invoice_date: string;
  invoice_no: string;
  vendor_name: string;
  vendor_address: string;
  vendor_phone: string;
  vendor_details: string;
  dc_count: number;
  bill_value: number;
  tds_deduction: number;
  other_deduction: number;
  advance_amount: number;
  deduction_payable_bill_value: number;
  approved_by: string;
  approved_date: string;
  status: "Pending" | "Approved" | "Rejected";
  reject_reason: string;
  rejected_by: string;
}

interface EntryFormState {
  tdsPercentage: string;
  tdsDeduction: string;
  othersDeduction: string;
  advanceAmount: string;
  additionalCharges: string;
  remarks: string;
}

const pendingHeaders = [
  "S.No",
  "Vendor Bill Date / Bill No",
  "Vendor Invoice Date / Invoice No",
  "Vendor Details",
  "DC Count",
  "Bill Value",
  "Vendor Bill Approval By / Date",
  "Status",
  "Reject Reason",
  "Rejected By",
] as const;

const completeHeaders = [
  "S.No",
  "Vendor Bill Date / Bill No",
  "Vendor Invoice Date / Invoice No",
  "Vendor Details",
  "DC Count",
  "Bill Value",
  "Tds Deduction",
  "Other Deduction",
  "Advance Amount",
  "Deduction Payable Bill Value",
  "Vendor Bill Approval By / Date",
  "Status",
] as const;

const emptyEntryForm: EntryFormState = {
  tdsPercentage: "0",
  tdsDeduction: "0",
  othersDeduction: "0",
  advanceAmount: "0",
  additionalCharges: "0",
  remarks: "",
};

function displayValue(value?: string | number | null) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function parseNumber(value?: string | number | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatInputNumber(value: number) {
  return String(Number(parseNumber(value).toFixed(2)));
}

function formatMoney(value?: string | number | null) {
  return parseNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(value?: string | number | null) {
  return `\u20B9 ${formatMoney(value)}`;
}

function getGrandTotalAmount(detail?: Pick<BillDetail, "total_amount" | "additional_charges"> | null) {
  if (!detail) return 0;
  return Number((parseNumber(detail.total_amount) + parseNumber(detail.additional_charges)).toFixed(2));
}
function buildVendorSummary(row: Row) {
  return [
    row.vendor_name || row.vendor_details || "",
    row.vendor_address || "",
    row.vendor_phone ? `Ph.No. ${row.vendor_phone}` : "",
  ]
    .filter(Boolean)
    .join(" | ") || row.vendor_details || "-";
}

function resolveAttachmentUrl(fileName?: string) {
  const raw = String(fileName ?? "").trim();
  if (!raw || raw === "#") return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if ((parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.pathname.startsWith("/api/")) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return raw;
    }
    return raw;
  }
  if (raw.startsWith("/")) return raw;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { msg?: string; error?: string; detail?: string } } }).response;
    return String(response?.data?.msg || response?.data?.error || response?.data?.detail || fallback);
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function statusClass(status?: string) {
  const value = String(status ?? "").trim().toLowerCase();
  if (value.includes("reject")) return "text-danger";
  if (value.includes("approve")) return "text-success";
  return "text-[#d58a00]";
}



function AttachmentIconLink({ href, label }: { href?: string; label: string }) {
  if (!href) return <span className="text-ink-muted">-</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-100 text-danger transition-colors hover:bg-red-50"
    >
      <i className="fa fa-file-pdf text-[16px]" />
    </a>
  );
}

function ModalWrapper({
  title,
  onClose,
  children,
  panelClassName = "max-w-6xl",
  headerVariant = "default",
  titleAlign = "center",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  headerVariant?: "default" | "plain";
  titleAlign?: "center" | "left";
}) {
  const isPlainHeader = headerVariant === "plain";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6 backdrop-blur-[1px]">
      <div className={`w-full ${panelClassName} max-h-[calc(100vh-48px)] overflow-hidden rounded-[20px] border border-line bg-white shadow-2xl flex flex-col`}>
        <div
          className={`relative border-b border-line px-6 py-4 shrink-0 ${isPlainHeader ? "bg-white" : ""}`}
          style={isPlainHeader ? undefined : { background: "linear-gradient(135deg, #e8eed1 0%, #f7f8ec 100%)" }}
        >
          <h3 className={`${titleAlign === "left" ? "pr-12 text-left" : "text-center"} text-[15px] font-bold pointer-events-none ${isPlainHeader ? "text-[#3b4350]" : "text-[#56621b]"}`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-[#c0392b] text-white hover:bg-[#a93226] transition-colors"
          >
            <i className="fa fa-xmark text-[18px]" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-muted">{children}</p>;
}

function KeyValueRows({ rows }: { rows: Array<[string, string | number | undefined]> }) {
  return (
    <div>
      {rows.map(([label, value]) => (
        <div key={label} className="mb-1.5 flex items-start gap-2 text-[12px]">
          <span className="w-32 shrink-0 text-ink-secondary">{label}</span>
          <span className="text-ink-secondary">:</span>
          <span className="break-words font-medium text-[#5a6a20]">{displayValue(value)}</span>
        </div>
      ))}
    </div>
  );
}
function BillHeaderCard({ detail, showVendorApprovalMeta }: { detail: BillDetail; showVendorApprovalMeta: boolean }) {
  const approval = detail.approvals[0];

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr_1fr]">
        <div className="space-y-6">
          <div>
            <SectionTitle>Vendor Details</SectionTitle>
            <p className="mb-1 text-[14px] font-bold leading-tight text-[#5a6a20]">{displayValue(detail.vendor_name)}</p>
            <p className="mb-1.5 flex items-start gap-2 text-[12px] text-ink-secondary">
              <i className="fa fa-location-dot mt-0.5 shrink-0 text-[12px] text-[#718039]" />
              <span>{displayValue(detail.vendor_address)}</span>
            </p>
            <p className="mb-1.5 text-[12px] text-ink-secondary">
              GST No: <span className="font-semibold text-ink">{displayValue(detail.vendor_gst)}</span>, PAN No: <span className="font-semibold text-ink">{displayValue(detail.vendor_pan)}</span>
            </p>
            <p className="mb-1.5 flex items-center gap-2 text-[12px] text-ink-secondary">
              <i className="fa fa-envelope text-[11px] text-[#718039]" />
              <span>{displayValue(detail.vendor_email)}</span>
            </p>
            <p className="flex items-center gap-2 text-[12px] text-ink-secondary">
              <i className="fa fa-phone text-[11px] text-[#718039]" />
              <span>{displayValue(detail.vendor_phone)}</span>
            </p>
          </div>
{/* 
          {showVendorApprovalMeta ? (
            <div>
              <KeyValueRows
                rows={[
                  ["Bill Created By", approval?.bill_created_by],
                  ["Bill Created Date", approval?.bill_created_at],
                  ["Bill Approved By", approval?.operation_by],
                  ["Bill Approved Date", approval?.operation_at],
                ]}
              />
            </div>
          ) : null} */}
        </div>

        <div className="space-y-6">
          <div>
            <SectionTitle>Vendor Bill Details</SectionTitle>
            <p className="mb-1 text-[14px] font-bold text-[#5a6a20]">{displayValue(detail.vendor_bill_no)}</p>
            <p className="flex items-center gap-2 text-[12px] text-ink-secondary">
              <i className="fa fa-calendar text-[11px] text-[#718039]" />
              <span>{displayValue(detail.vendor_bill_date)}</span>
            </p>
          </div>

          <div>
            <SectionTitle>Vendor Invoice Details</SectionTitle>
            <p className="mb-1 text-[14px] font-bold text-[#5a6a20]">{displayValue(detail.vendor_invoice_no)}</p>
            <p className="mb-2 flex items-center gap-2 text-[12px] text-ink-secondary">
              <i className="fa fa-calendar text-[11px] text-[#718039]" />
              <span>{displayValue(detail.vendor_invoice_date)}</span>
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[12px] text-ink-secondary">
              <span className="inline-flex items-center gap-2">Invoice Attach <AttachmentIconLink href={resolveAttachmentUrl(detail.invoice_attach_url)} label="Invoice Attach" /></span>
              <span className="inline-flex items-center gap-2">PO Attach <AttachmentIconLink href={resolveAttachmentUrl(detail.po_attach_url)} label="PO Attach" /></span>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Vendor Bank Details</SectionTitle>
          <KeyValueRows
            rows={[
              ["Bank Name", detail.bank_name],
              ["Branch", detail.branch],
              ["Account No", detail.account_no],
              ["IFSC Code", detail.ifsc_code],
              ["Account Holder", detail.account_holder],
            ]}
          />
          <div className="mb-1.5 flex items-center gap-2 text-[12px]">
            <span className="w-32 shrink-0 text-ink-secondary">PAN Copy</span>
            <span className="text-ink-secondary">:</span>
            <AttachmentIconLink href={resolveAttachmentUrl(detail.pan_copy_url)} label="PAN Copy" />
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="w-32 shrink-0 text-ink-secondary">Bank Proof</span>
            <span className="text-ink-secondary">:</span>
            <AttachmentIconLink href={resolveAttachmentUrl(detail.bank_proof_url)} label="Bank Proof" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LineItemsTable({ items, additionalCharges = 0 }: { items: DCItem[]; additionalCharges?: number }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof DCItem | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const handleSort = (key: keyof DCItem) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else setSortDir("asc");
    } else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: keyof DCItem) => {
    const topFill = sortKey === key && sortDir === "asc" ? "#506018" : "#b8c295";
    const bottomFill = sortKey === key && sortDir === "desc" ? "#506018" : "#d9dec9";
    return (
      <span className="ml-1 inline-flex shrink-0" aria-hidden="true">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path d="M5 1L8.5 6H1.5L5 1Z" fill={topFill} />
          <path d="M5 15L1.5 10H8.5L5 15Z" fill={bottomFill} />
        </svg>
      </span>
    );
  };

  const visibleItems = useMemo(() => {
    let result = [...items];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(row => Object.values(row as Record<string, unknown>).some(v => String(v ?? "").toLowerCase().includes(q)));
    }
    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const av = (a as Record<string, unknown>)[String(sortKey)] ?? "";
        const bv = (b as Record<string, unknown>)[String(sortKey)] ?? "";
        const aNum = Number(av), bNum = Number(bv);
        if (!isNaN(aNum) && !isNaN(bNum) && String(av).trim() && String(bv).trim()) return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [items, search, sortKey, sortDir]);

  const subtotalUnitPrice = visibleItems.reduce((sum, item) => sum + parseNumber(item.unit_price), 0);
  const subtotalBasicAmount = visibleItems.reduce((sum, item) => sum + parseNumber(item.basic_amount), 0);
  const subtotalGstAmount = visibleItems.reduce((sum, item) => sum + parseNumber(item.gst_amount), 0);
  const subtotalTotalAmount = visibleItems.reduce((sum, item) => sum + parseNumber(item.total_amount), 0);
  const subtotalGstLabel = Array.from(new Set(visibleItems.map((item) => displayValue(item.gst)).filter((value) => value !== "-"))).join(", ") || "-";
  const billAdditionalAmount = parseNumber(additionalCharges);
  const grandTotalAmount = Number((subtotalTotalAmount + billAdditionalAmount).toFixed(2));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <i className="fa fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted pointer-events-none" />
          <input name="search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="pl-7 pr-7 py-1.5 text-[12px] border border-line rounded-lg bg-white focus:outline-none focus:border-brand-500 w-44" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[11px] cursor-pointer"><i className="fa fa-xmark" /></button>}
        </div>
        {search && <span className="text-[11px] text-ink-muted">{visibleItems.length}/{items.length} results</span>}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-surface-2">
            <th className="whitespace-nowrap border border-line-dark px-3 py-2.5 text-center font-bold text-ink">S No.</th>
            {(["dc_no", "invoice_no", "po_no"] as (keyof DCItem)[]).map((key, i) => (
              <th key={key} onClick={() => handleSort(key)} className="whitespace-nowrap border border-line-dark px-3 py-2.5 text-center font-bold text-ink cursor-pointer select-none hover:bg-brand-50">
                {["DC No / Date", "Invoice No / Date", "PO No / Date"][i]}{sortIcon(key)}
              </th>
            ))}
            <th className="whitespace-nowrap border border-line-dark px-3 py-2.5 text-center font-bold text-ink">Consignee Address</th>
            {(["unit_price", "basic_amount", "gst", "gst_amount", "total_amount"] as (keyof DCItem)[]).map((key, i) => (
              <th key={key} onClick={() => handleSort(key)} className="whitespace-nowrap border border-line-dark px-3 py-2.5 text-center font-bold text-ink cursor-pointer select-none hover:bg-brand-50">
                {["Unit Price", "Basic Amount", "GST", "GST Amount", "Total Amount"][i]}{sortIcon(key)}
              </th>
            ))}
            <th className="whitespace-nowrap border border-line-dark px-3 py-2.5 text-center font-bold text-ink">Additional Amount</th>
            <th className="whitespace-nowrap border border-line-dark px-3 py-2.5 text-center font-bold text-ink">Grand Total</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.length === 0 ? (
            <tr>
              <td colSpan={12} className="border border-line px-3 py-10 text-center text-ink-muted">
                {search ? "No matching items" : "No line items available"}
              </td>
            </tr>
          ) : (
            <>
              {visibleItems.map((item) => (
                <tr key={`${item.s_no}-${item.dc_no}-${item.invoice_no}`} className="align-top border-b border-line/50 hover:bg-brand-50/30">
                  <td className="border-x border-line/50 px-3 py-2.5 text-center text-ink-muted">{item.s_no}</td>
                  <td className="min-w-[140px] border-x border-line/50 px-3 py-2.5"><div className="font-semibold text-ink">{displayValue(item.dc_no)}</div><div className="text-[11px] text-ink-muted">{displayValue(item.dc_date)}</div></td>
                  <td className="min-w-[150px] border-x border-line/50 px-3 py-2.5"><div className="font-semibold text-ink">{displayValue(item.invoice_no)}</div><div className="text-[11px] text-ink-muted">{displayValue(item.invoice_date)}</div></td>
                  <td className="min-w-[150px] border-x border-line/50 px-3 py-2.5"><div className="font-semibold text-ink">{displayValue(item.po_no)}</div><div className="text-[11px] text-ink-muted">{displayValue(item.po_date)}</div></td>
                  <td className="min-w-[220px] border-x border-line/50 px-3 py-2.5 text-ink-secondary">{displayValue(item.consignee_address)}</td>
                  <td className="border-x border-line/50 px-3 py-2.5 text-right">{formatMoney(item.unit_price)}</td>
                  <td className="border-x border-line/50 px-3 py-2.5 text-right">{formatMoney(item.basic_amount)}</td>
                  <td className="border-x border-line/50 px-3 py-2.5 text-center">{displayValue(item.gst)}</td>
                  <td className="border-x border-line/50 px-3 py-2.5 text-right">{formatMoney(item.gst_amount)}</td>
                  <td className="border-x border-line/50 px-3 py-2.5 text-right">{formatCurrency(item.total_amount)}</td>
                  <td className="border-x border-line/50 px-3 py-2.5 text-center text-ink-muted">-</td>
                  <td className="border-x border-line/50 px-3 py-2.5 text-right font-semibold text-ink">{formatCurrency(item.total_amount)}</td>
                </tr>
              ))}
              <tr className="bg-[#f6f4e8] font-semibold text-ink">
                <td colSpan={5} className="border border-line-dark px-3 py-2.5 text-right uppercase tracking-wide text-[#5a6a20]">Total</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{formatMoney(subtotalUnitPrice)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{formatMoney(subtotalBasicAmount)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-center">{subtotalGstLabel}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{formatMoney(subtotalGstAmount)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{formatCurrency(subtotalTotalAmount)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{formatCurrency(billAdditionalAmount)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{formatCurrency(grandTotalAmount)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
function TotalsPanel({ detail, totalOnly = false }: { detail: BillDetail; totalOnly?: boolean }) {
  const baseAmount = parseNumber(detail.total_amount);
  const additionalCharges = parseNumber(detail.additional_charges);
  const grandTotalAmount = getGrandTotalAmount(detail);

  if (totalOnly) {
    return (
      <div className="min-w-[280px] rounded-lg border border-line bg-white p-4 text-[13px] shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
        {[
          ["Base Amount:", baseAmount],
          ["Additional Charges:", additionalCharges],
          ["Total Amount:", grandTotalAmount],
        ].map(([label, value]) => (
          <div key={String(label)} className="mb-2 flex items-center justify-between gap-6 last:mb-0">
            <span className="text-ink-secondary">{label}</span>
            <span className="font-bold text-[#5a6a20]">{formatCurrency(value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-[280px] rounded-lg border border-line bg-white p-4 text-[13px] shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
      {[
        ["Base Amount:", baseAmount],
        ["Additional Charges:", additionalCharges],
        ["Total Amount:", grandTotalAmount],
        ["TDS Deduction:", detail.tds_deduction],
        ["Others Deduction:", detail.others_deduction],
        ["Advance Amount:", detail.advance_amount],
      ].map(([label, value]) => (
        <div key={String(label)} className="mb-2 flex items-center justify-between gap-6 last:mb-0">
          <span className="text-ink-secondary">{label}</span>
          <span className="font-bold text-[#5a6a20]">{formatCurrency(value)}</span>
        </div>
      ))}
      <div className="mt-3 flex items-center justify-between gap-6 border-t border-line pt-3 text-[14px]">
        <span className="font-semibold text-ink">Total Payable Amount:</span>
        <span className="font-bold text-[#5a6a20]">{formatCurrency(detail.total_payable || grandTotalAmount)}</span>
      </div>
    </div>
  );
}
function buildApprovalSteps(approval: ApprovalRow): ApprovalStep[] {
  return [
    { step: 1, label: "Bill Created", by: approval.bill_created_by, at: approval.bill_created_at, status: approval.bill_created_status },
    { step: 2, label: "Operation Team", by: approval.operation_by, at: approval.operation_at, status: approval.operation_status },
    { step: 3, label: "Account Entry", by: approval.account_entry_by, at: approval.account_entry_at, status: approval.account_entry_status },
    { step: 4, label: "Accounts Approval", by: approval.accounts_approval_by, at: approval.accounts_approval_at, status: approval.accounts_approval_status },
    { step: 5, label: "Management", by: approval.management_by, at: approval.management_at, status: approval.management_status },
    { step: 6, label: "Payment", by: approval.payment_amount, at: undefined, status: approval.payment_status },
  ];
}

function ApprovalHistoryTable({ approvals }: { approvals: ApprovalRow[] }) {
  if (!approvals.length) return null;
  return <ApprovalStepsCard steps={buildApprovalSteps(approvals[0])} />;
}
export default function AccountsBillEntryList() {
  const [activeTab, setActiveTab] = useState<TabType>("Pending");
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<null | { type: ModalMode; billNo: string }>(null);
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<ActionStatus>("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormState>(emptyEntryForm);

  const fetchList = async () => {
    setLoading(true);
    try {
      const response = await api.get("/master/accounts-bill-entry/list/", {
        params: {
          tab: activeTab.toLowerCase(),
          page: curPage,
          length,
          search,
        },
      });
      setRows(Array.isArray(response.data?.data) ? response.data.data : []);
      setTotal(parseNumber(response.data?.total));
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
  }, [activeTab, curPage, length, search]);

  const buildEntryForm = (nextDetail: BillDetail): EntryFormState => {
    const totalAmount = parseNumber(nextDetail.total_amount);
    const tdsPercentage = totalAmount ? (parseNumber(nextDetail.tds_deduction) / totalAmount) * 100 : 0;
    return {
      tdsPercentage: formatInputNumber(tdsPercentage),
      tdsDeduction: formatInputNumber(nextDetail.tds_deduction),
      othersDeduction: formatInputNumber(nextDetail.others_deduction),
      advanceAmount: formatInputNumber(nextDetail.advance_amount),
      additionalCharges: formatInputNumber(nextDetail.additional_charges),
      remarks: nextDetail.remarks || "",
    };
  };

  const resetActionState = () => {
    setActionStatus("");
    setRejectReason("");
    setEntryModalOpen(false);
    setEntryForm(emptyEntryForm);
  };

  const closeAll = () => {
    setModal(null);
    setDetail(null);
    setDetailLoading(false);
    resetActionState();
  };

  const closeEntryModal = () => {
    setEntryModalOpen(false);
    setActionStatus("");
  };

  const openDetail = async (type: ModalMode, billNo: string) => {
    setModal({ type, billNo });
    setDetail(null);
    setDetailLoading(true);
    resetActionState();
    try {
      const response = await api.get("/master/accounts-bill-entry/detail/", {
        params: { bill_no: billNo },
      });
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      const nextDetail = response.data as BillDetail;
      setDetail(nextDetail);
      setEntryForm(buildEntryForm(nextDetail));
    } catch (error) {
      closeAll();
      await showErrorAlert(getErrorMessage(error, "Unable to load bill details"));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = (value: ActionStatus) => {
    setActionStatus(value);
    if (value === "Approved") {
      setRejectReason("");
      if (detail) {
        setEntryForm(buildEntryForm(detail));
        setEntryModalOpen(true);
      }
      return;
    }
    setEntryModalOpen(false);
    if (value !== "Reject") {
      setRejectReason("");
    }
  };

  const handleEntryChange = (field: keyof EntryFormState, value: string) => {
    setEntryForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "tdsPercentage") {
        next.tdsDeduction = formatInputNumber((parseNumber(detail?.total_amount) * parseNumber(value)) / 100);
      }
      return next;
    });
  };

  const handleNumericKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(event.key)) {
      event.preventDefault();
    }
  };

  const totalAmount = parseNumber(detail?.total_amount);
  const tdsDeduction = parseNumber(entryForm.tdsDeduction);
  const othersDeduction = parseNumber(entryForm.othersDeduction);
  const advanceAmount = parseNumber(entryForm.advanceAmount);
  const additionalCharges = parseNumber(entryForm.additionalCharges);
  const totalAfterTds = Number((totalAmount - tdsDeduction).toFixed(2));
  const grandTotalAmount = Number((totalAmount + additionalCharges).toFixed(2));
  const totalPayable = Number((totalAfterTds - othersDeduction - advanceAmount + additionalCharges).toFixed(2));
  const summaryBasicAmount = detail ? parseNumber(detail.basic_amount) || detail.dc_items.reduce((sum, item) => sum + parseNumber(item.basic_amount), 0) : 0;
  const summaryGstAmount = detail ? parseNumber(detail.gst_amount) || detail.dc_items.reduce((sum, item) => sum + parseNumber(item.gst_amount), 0) : 0;
  const summaryWithGstTotalAmount = detail ? parseNumber(detail.with_gst_total_amount) || Number((summaryBasicAmount + summaryGstAmount).toFixed(2)) : 0;
  const summaryTotalTdsAmount = parseNumber(detail?.total_tds_amount) || totalAfterTds;
  const summaryGstPercentage =
    (detail?.gst_percentage || "").trim() ||
    Array.from(new Set((detail?.dc_items || []).map((item) => displayValue(item.gst)).filter((value) => value !== "-"))).join(", ") ||
    "0 %";
  const summaryVendorCompanyName = detail?.vendor_company_name || detail?.vendor_name || "";

  const submitReject = async () => {
    if (!modal) return;
    if (!rejectReason.trim()) {
      await showWarningAlert("Please enter Reject Reason");
      return;
    }

    setRejectSubmitting(true);
    try {
      const response = await api.post("/master/accounts-bill-entry/reject/", {
        bill_no: modal.billNo,
        reject_reason: rejectReason.trim(),
      });
      if (parseNumber(response.data?.status) !== 1) {
        throw new Error(response.data?.msg || "Unable to reject bill");
      }
      await showSuccessAlert(response.data?.msg || "Accounts bill entry rejected");
      closeAll();
      await fetchList();
    } catch (error) {
      await showErrorAlert(getErrorMessage(error, "Unable to reject bill"));
    } finally {
      setRejectSubmitting(false);
    }
  };

  const submitEntry = async () => {
    if (!modal) return;
    if (totalAfterTds < 0 || totalPayable < 0) {
      await showWarningAlert("Deductions cannot exceed the total amount");
      return;
    }

    setEntrySubmitting(true);
    try {
      const response = await api.post("/master/accounts-bill-entry/save/", {
        bill_no: modal.billNo,
        tds_percentage: parseNumber(entryForm.tdsPercentage),
        account_bill_id: detail?.account_bill_id || "",
        tds_deduction: tdsDeduction,
        others_deduction: othersDeduction,
        advance_amount: advanceAmount,
        additional_charges: additionalCharges,
        total_tds_amount: totalAfterTds,
        total_payable: totalPayable,
        remarks: entryForm.remarks.trim(),
      });
      if (parseNumber(response.data?.status) !== 1) {
        throw new Error(response.data?.msg || "Unable to save accounts bill entry");
      }
      await showSuccessAlert(response.data?.msg || "Accounts bill entry saved");
      closeAll();
      await fetchList();
    } catch (error) {
      await showErrorAlert(getErrorMessage(error, "Unable to save accounts bill entry"));
    } finally {
      setEntrySubmitting(false);
    }
  };

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
  const startEntry = total === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1;
  const endEntry = total === 0 ? 0 : length === -1 ? total : Math.min(curPage * length, total);

  return (
    <>
      {modal?.type === "edit" ? (
        <ModalWrapper title="Accounts Team Bill Entry" onClose={closeAll} panelClassName="max-w-[92vw]">
          {detailLoading || !detail ? (
            <div className="py-10 text-center text-ink-muted">Loading...</div>
          ) : (
            <div className="space-y-6">
              <BillHeaderCard detail={detail} showVendorApprovalMeta />
              <ApprovalHistoryTable approvals={detail.approvals || []} />
              <LineItemsTable items={detail.dc_items} additionalCharges={detail.additional_charges} />

              <div className="flex justify-end">
                <TotalsPanel detail={detail} totalOnly />
              </div>

              <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div>
                  <span className="mb-2 block text-[12.5px] font-semibold text-ink">Status</span>
                  <SearchableSelectInput name="actionstatus"
                    value={actionStatus}
                    onChange={(event) => handleStatusChange(event.target.value as ActionStatus)}
                    className="w-full rounded border border-line-dark px-3 py-2 text-[12.5px] focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Select Status</option>
                    <option value="Approved">Approved</option>
                    <option value="Reject">Reject</option>
                  </SearchableSelectInput>
                  {actionStatus === "Approved" ? (
                    <p className="mt-2 text-[12px] text-ink-secondary">Accounts Bill Entry popup opened for approval.</p>
                  ) : null}
                </div>

                {actionStatus === "Reject" ? (
                  <div>
                    <span className="mb-2 block text-[12.5px] font-semibold text-ink">Reject Reason</span>
                    <textarea name="rejectreason"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={4}
                      className="min-h-[104px] w-full resize-none rounded border border-line-dark px-3 py-2 text-[12.5px] focus:border-brand-500 focus:outline-none"
                      placeholder="Enter reject reason"
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={closeAll} className="rounded bg-[#f06f4f] px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#df5f40]">
                  Close
                </button>
                {actionStatus === "Approved" && !entryModalOpen ? (
                  <button onClick={() => setEntryModalOpen(true)} className="rounded bg-brand-700 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800">
                    Open Accounts Bill Entry
                  </button>
                ) : null}
                {actionStatus === "Reject" ? (
                  <button
                    onClick={() => void submitReject()}
                    disabled={rejectSubmitting}
                    className="rounded bg-brand-700 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
                  >
                    {rejectSubmitting ? "Saving..." : "Submit"}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </ModalWrapper>
      ) : null}
      {modal?.type === "view" ? (
        <ModalWrapper title="Accounts Bill Entry Details" onClose={closeAll} panelClassName="max-w-[92vw]">
          {detailLoading || !detail ? (
            <div className="py-10 text-center text-ink-muted">Loading...</div>
          ) : (
            <div className="space-y-6">
              <BillHeaderCard detail={detail} showVendorApprovalMeta={false} />
              <ApprovalHistoryTable approvals={detail.approvals} />
              <LineItemsTable items={detail.dc_items} additionalCharges={detail.additional_charges} />
              <div className="flex justify-end">
                <TotalsPanel detail={detail} />
              </div>
              <div className="flex justify-end">
                <button onClick={closeAll} className="rounded bg-[#f06f4f] px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#df5f40]">
                  Close
                </button>
              </div>
            </div>
          )}
        </ModalWrapper>
      ) : null}

      {modal?.type === "edit" && entryModalOpen && detail ? (
        <ModalWrapper title="Accounts Bill Entry" onClose={closeEntryModal} panelClassName="max-w-3xl" headerVariant="plain" titleAlign="left">
          <div className="mx-auto max-w-[760px] space-y-4">
            {[
              ["Account Bill ID", displayValue(detail.account_bill_id)],
              ["Bill Issue Date", displayValue(detail.vendor_bill_date)],
              ["Basic Amount", formatMoney(summaryBasicAmount)],
              ["GST %", displayValue(summaryGstPercentage).replace(/\s+%/g, "%")],
              ["With GST Total Amount", formatMoney(summaryWithGstTotalAmount)],
              ["Base Amount", formatMoney(totalAmount)],
              ["Additional Charges", formatMoney(additionalCharges)],
              ["Grand Total Amount", formatMoney(grandTotalAmount)],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)] md:items-center">
                <p className="text-[13px] text-ink-secondary">{label}:</p>
                <p className="text-[13px] font-semibold text-ink">{value}</p>
              </div>
            ))}

            <div className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)] md:items-center">
              <span className="text-[13px] text-ink-secondary">TDS %:<span className="text-danger">*</span></span>
              <input name="tdspercentage"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={entryForm.tdsPercentage}
                onChange={(event) => handleEntryChange("tdsPercentage", event.target.value)}
                onKeyDown={handleNumericKeyDown}
                className="w-full max-w-[180px] rounded-[3px] border border-line-dark bg-white px-3 py-2 text-[13px] text-ink focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)] md:items-center">
              <span className="text-[13px] text-ink-secondary">TDS Deduction Amount:<span className="text-danger">*</span></span>
              <input name="tdsdeduction"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={entryForm.tdsDeduction}
                onChange={(event) => handleEntryChange("tdsDeduction", event.target.value)}
                onKeyDown={handleNumericKeyDown}
                className="w-full max-w-[180px] rounded-[3px] border border-line-dark bg-white px-3 py-2 text-[13px] text-ink focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)] md:items-center">
              <span className="text-[13px] text-ink-secondary">Totl TDS Deduction Amount:<span className="text-danger">*</span></span>
              <input name="accountsbillentrylist_input_937"
                value={formatMoney(summaryTotalTdsAmount)}
                readOnly
                className="w-full max-w-[180px] rounded-[3px] border border-line-dark bg-[#f5f5f5] px-3 py-2 text-[13px] text-ink outline-none"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)] md:items-center">
              <span className="text-[13px] text-ink-secondary">Other Deduction Amount:<span className="text-danger">*</span></span>
              <input name="othersdeduction"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={entryForm.othersDeduction}
                onChange={(event) => handleEntryChange("othersDeduction", event.target.value)}
                onKeyDown={handleNumericKeyDown}
                className="w-full max-w-[180px] rounded-[3px] border border-line-dark bg-white px-3 py-2 text-[13px] text-ink focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)] md:items-center">
              <span className="text-[13px] text-ink-secondary">Advance payment Amount:<span className="text-danger">*</span></span>
              <input name="advanceamount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={entryForm.advanceAmount}
                onChange={(event) => handleEntryChange("advanceAmount", event.target.value)}
                onKeyDown={handleNumericKeyDown}
                className="w-full max-w-[180px] rounded-[3px] border border-line-dark bg-white px-3 py-2 text-[13px] text-ink focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)] md:items-center">
              <span className="text-[13px] text-ink-secondary">Additional Charges:<span className="text-danger">*</span></span>
              <input name="additionalcharges"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={entryForm.additionalCharges}
                onChange={(event) => handleEntryChange("additionalCharges", event.target.value)}
                onKeyDown={handleNumericKeyDown}
                className="w-full max-w-[180px] rounded-[3px] border border-line-dark bg-white px-3 py-2 text-[13px] text-ink focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)] md:items-center">
              <span className="text-[13px] text-ink-secondary">Net Payable Amount:<span className="text-danger">*</span></span>
              <input name="accountsbillentrylist_input_988"
                value={formatMoney(totalPayable)}
                readOnly
                className="w-full max-w-[180px] rounded-[3px] border border-line-dark bg-[#f5f5f5] px-3 py-2 text-[13px] text-ink outline-none"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)] md:items-center">
              <p className="text-[13px] text-ink-secondary">Vendor Company Name:</p>
              <p className="text-[13px] font-semibold text-ink">{displayValue(summaryVendorCompanyName)}</p>
            </div>

            <div className="grid gap-2 md:grid-cols-[185px_minmax(0,1fr)]">
              <span className="pt-2 text-[13px] text-ink-secondary">Remarks:</span>
              <textarea name="remarks"
                value={entryForm.remarks}
                onChange={(event) => handleEntryChange("remarks", event.target.value)}
                rows={4}
                className="min-h-[72px] w-full resize-none rounded-[3px] border border-line-dark bg-white px-3 py-2 text-[13px] text-ink focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => void submitEntry()}
                disabled={entrySubmitting}
                className="rounded bg-[#647514] px-5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#556410] disabled:opacity-60"
              >
                {entrySubmitting ? "Saving..." : "Submit"}
              </button>
              <button onClick={closeEntryModal} className="rounded bg-[#647514] px-5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#556410]">
                Close
              </button>
            </div>
          </div>
        </ModalWrapper>
      ) : null}
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
        <PageTopbar title="Accounts Team Bill Entry" breadcrumbs={["Vendor Payment", "Accounts Team Bill Entry"]} />
        <VendorPaymentPageIntro
          title="Accounts Team Bill Entry"
          description="Capture deductions, payable amounts, and internal remarks after vendor approval while keeping the current entry and review workflow intact."
          metrics={[
            { label: "Active Tab", value: activeTab === "Pending" ? "Pending" : "Complete" },
            { label: "Visible Rows", value: rows.length },
            { label: "Total Records", value: total },
          ]}
        />

        <div className="mt-4 overflow-visible rounded-[30px] border border-[#e2e7d0] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
          <PageTabs
            items={[
              { value: "Pending", label: "Accounts Team Bill Entry Pending" },
              { value: "Complete", label: "Accounts Team Bill Complete" },
            ]}
            value={activeTab}
            onChange={(value) => {
              setActiveTab(value);
              setCurPage(1);
              setSearch("");
            }}
          />

          <div className="p-6">
            <TableToolbar
              length={length}
              onLengthChange={(value) => {
                setLength(value);
                setCurPage(1);
              }}
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setCurPage(1);
              }}
              exportConfig={{
                data: rows,
                headers: activeTab === "Pending" ? [...pendingHeaders] : [...completeHeaders],
                rowMapper: (row, index) => {
                  const serial = String(length === -1 ? index + 1 : (curPage - 1) * length + index + 1);
                  const billInfo = `${displayValue(row.vendor_bill_date)} | ${displayValue(row.bill_no)}`;
                  const invoiceInfo = `${displayValue(row.vendor_invoice_date)} | ${displayValue(row.invoice_no)}`;
                  const vendorInfo = buildVendorSummary(row);
                  if (activeTab === "Pending") {
                    return [
                      serial,
                      billInfo,
                      invoiceInfo,
                      vendorInfo,
                      String(row.dc_count || 0),
                      formatMoney(row.bill_value),
                      `${displayValue(row.approved_by)} | ${displayValue(row.approved_date)}`,
                      displayValue(row.status),
                      displayValue(row.reject_reason),
                      displayValue(row.rejected_by),
                    ];
                  }
                  return [
                    serial,
                    billInfo,
                    invoiceInfo,
                    vendorInfo,
                    String(row.dc_count || 0),
                    formatMoney(row.bill_value),
                    formatMoney(row.tds_deduction),
                    formatMoney(row.other_deduction),
                    formatMoney(row.advance_amount),
                    formatMoney(row.deduction_payable_bill_value),
                    `${displayValue(row.approved_by)} | ${displayValue(row.approved_date)}`,
                    displayValue(row.status),
                  ];
                },
                filename: activeTab === "Pending" ? "accounts_team_bill_entry_pending" : "accounts_team_bill_entry_complete",
                printTitle: "Accounts Team Bill Entry",
              }}
            />

            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-surface-2">
                    {(activeTab === "Pending" ? [...pendingHeaders, "Action"] : [...completeHeaders, "Action"]).map((header) => (
                      <th key={header} className="whitespace-nowrap border border-line-dark px-3 py-2.5 text-center font-bold text-ink">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={activeTab === "Pending" ? 11 : 13} className="border border-line px-3 py-10 text-center text-ink-muted">
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === "Pending" ? 11 : 13} className="border border-line px-3 py-10 text-center text-ink-muted">
                        No data available in table
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id || `${row.bill_no}-${index}`} className="align-top border-b border-line/50 hover:bg-brand-50/40">
                        <td className="border-x border-line/50 px-3 py-2.5 text-center text-ink-muted">{length === -1 ? index + 1 : (curPage - 1) * length + index + 1}</td>
                        <td className="min-w-[150px] border-x border-line/50 px-3 py-2.5"><div className="font-semibold text-ink">{displayValue(row.vendor_bill_date)}</div><div className="text-[11px] font-bold text-ink-secondary">{displayValue(row.bill_no)}</div></td>
                        <td className="min-w-[160px] border-x border-line/50 px-3 py-2.5"><div className="font-semibold text-ink">{displayValue(row.vendor_invoice_date)}</div><div className="text-[11px] font-bold text-ink-secondary">{displayValue(row.invoice_no)}</div></td>
                        <td className="min-w-[320px] border-x border-line/50 px-3 py-2.5"><div className="text-[13px] font-bold text-ink">{displayValue(row.vendor_name || row.vendor_details)}</div><div className="mt-1 text-[11px] leading-[1.45] text-ink-secondary">{displayValue(row.vendor_address)}</div><div className="mt-1 text-[11px] text-ink-secondary">Ph.No. {displayValue(row.vendor_phone)}</div></td>
                        <td className="border-x border-line/50 px-3 py-2.5 text-center">{row.dc_count || 0}</td>
                        <td className="border-x border-line/50 px-3 py-2.5 text-right font-semibold">{formatMoney(row.bill_value)}</td>
                        {activeTab === "Pending" ? (
                          <>
                            <td className="min-w-[180px] border-x border-line/50 px-3 py-2.5"><div className="font-semibold text-ink">{displayValue(row.approved_by)}</div><div className="mt-1 text-[11px] text-ink-secondary">{displayValue(row.approved_date)}</div></td>
                            <td className="border-x border-line/50 px-3 py-2.5 text-center"><span className={`font-semibold ${statusClass(row.status)}`}>{displayValue(row.status)}</span></td>
                            <td className="border-x border-line/50 px-3 py-2.5 text-ink-secondary">{displayValue(row.reject_reason)}</td>
                            <td className="border-x border-line/50 px-3 py-2.5 text-ink-secondary">{displayValue(row.rejected_by)}</td>
                          </>
                        ) : (
                          <>
                            <td className="border-x border-line/50 px-3 py-2.5 text-right">{formatMoney(row.tds_deduction)}</td>
                            <td className="border-x border-line/50 px-3 py-2.5 text-right">{formatMoney(row.other_deduction)}</td>
                            <td className="border-x border-line/50 px-3 py-2.5 text-right">{formatMoney(row.advance_amount)}</td>
                            <td className="border-x border-line/50 px-3 py-2.5 text-right font-semibold">{formatMoney(row.deduction_payable_bill_value)}</td>
                            <td className="min-w-[180px] border-x border-line/50 px-3 py-2.5"><div className="font-semibold text-ink">{displayValue(row.approved_by)}</div><div className="mt-1 text-[11px] text-ink-secondary">{displayValue(row.approved_date)}</div></td>
                            <td className="border-x border-line/50 px-3 py-2.5 text-center"><span className={`font-semibold ${statusClass(row.status)}`}>{displayValue(row.status)}</span></td>
                          </>
                        )}
                        <td className="border-x border-line/50 px-3 py-2.5 text-center">
                          <button
                            onClick={() => void openDetail(activeTab === "Pending" ? "edit" : "view", row.bill_no)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-line-dark bg-white text-ink transition-colors hover:bg-brand-700 hover:text-white"
                            title={activeTab === "Pending" ? "Edit Details" : "View Details"}
                          >
                            <i className={`fa ${activeTab === "Pending" ? "fa-pen-to-square" : "fa-eye"}`} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-secondary">
              <div>Showing {startEntry} to {endEntry} of {total} entries</div>
              <div className="flex items-center gap-2">
                <button
                  disabled={length === -1 || curPage <= 1}
                  onClick={() => setCurPage((page) => Math.max(1, page - 1))}
                  className="cursor-pointer rounded border border-line bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span>Page {curPage} of {totalPages}</span>
                <button
                  disabled={length === -1 || curPage >= totalPages}
                  onClick={() => setCurPage((page) => Math.min(totalPages, page + 1))}
                  className="cursor-pointer rounded border border-line bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}



