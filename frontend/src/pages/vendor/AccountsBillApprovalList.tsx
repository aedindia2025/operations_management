import { useCallback, useEffect, useMemo, useState } from "react";
import PageTopbar from "../../components/common/PageTopbar";
import PageTabs from "../../components/common/PageTabs";
import { showErrorAlert, showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import { calculateVendorBillLineItemTotals } from "../../utils/vendorBillLineItemTotals";
import ApprovalStepsCard, { type ApprovalStep } from "../../components/common/ApprovalStepsCard";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import VendorPaymentPageIntro from "../../components/common/VendorPaymentPageIntro";

type Status = "Pending" | "Complete";
const API = "/api/master/accounts-bill-approval";

interface Bill {
  id: string;
  bill_no: string;
  bill_date: string;
  invoice_no: string;
  invoice_date: string;
  vendor_name: string;
  vendor_address: string;
  vendor_phone: string;
  dc_count: number;
  amount: number;
  advance_amount: number;
  total_payable: number;
  vendor_approved_by: string;
  vendor_approved_date: string;
  finance_approved_by: string;
  finance_approved_date: string;
  management_approved_by: string;
  management_approved_date: string;
  management_status: string;
  management_reject_reason: string;
  finance_reject_reason: string;
  tds_deduction: number;
  others_deduction: number;
  remarks: string;
  status: string;
}

interface DetailItem {
  s_no: number;
  dc_no: string;
  dc_date: string;
  invoice_no: string;
  invoice_date: string;
  po_no: string;
  po_date: string;
  consignee_address: string;
  invoice_qty: number;
  unit_price: number;
  basic_amount: number;
  gst: string;
  gst_amount: number;
  total_amount: number;
}

interface ApprovalItem {
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
  payment_ref: string;
  payment_date: string;
  payment_amount: string;
  payment_status: string;
}

interface BillDetail {
  vendor_name: string;
  vendor_contact_name: string;
  vendor_address: string;
  vendor_gst: string;
  vendor_pan: string;
  vendor_email: string;
  vendor_phone: string;
  vendor_bill_no: string;
  vendor_bill_date: string;
  vendor_invoice_no: string;
  vendor_invoice_date: string;
  bank_name: string;
  branch: string;
  account_no: string;
  ifsc_code: string;
  account_holder: string;
  remarks: string;
  reject_reason: string;
  account_bill_id: string;
  account_remarks: string;
  bill_created_by: string;
  bill_created_at: string;
  bill_approved_by: string;
  bill_approved_at: string;
  account_bill_created_by: string;
  account_bill_created_at: string;
  accounts_team_approved_by: string;
  accounts_team_approved_at: string;
  invoice_attach_url: string;
  po_attach_url: string;
  pan_copy_url: string;
  bank_proof_url: string;
  total_amount: number;
  additional_charges?: number;
  grand_total_amount?: number;
  tds_deduction: number;
  others_deduction: number;
  advance_amount: number;
  total_payable: number;
  dc_items: DetailItem[];
  approvals: ApprovalItem[];
}

function jsonHeaders(): HeadersInit {
  const token = localStorage.getItem("otm_token") || "";
  return token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
}

function displayText(value?: string | null) {
  return value && value.trim() ? value : "-";
}

function joinNameDate(name?: string | null, date?: string | null) {
  const parts = [name, date].map((item) => (item || "").trim()).filter(Boolean);
  return parts.length ? parts.join(" ") : "-";
}

function dateOnly(value?: string | null) {
  const text = (value || "").trim();
  return text ? text.split(" ")[0] : "-";
}



function numericValue(value?: number | string | null) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function getAdditionalCharges(value?: number | string | null) {
  return numericValue(value);
}

function getGrandTotalAmount(detail?: { total_amount?: number | string | null; additional_charges?: number | string | null; grand_total_amount?: number | string | null } | null) {
  if (!detail) return 0;
  const explicitGrandTotal = detail.grand_total_amount;
  const hasExplicitGrandTotal = explicitGrandTotal !== undefined && explicitGrandTotal !== null && String(explicitGrandTotal).trim() !== "";
  if (hasExplicitGrandTotal) return numericValue(explicitGrandTotal);
  return Number((numericValue(detail.total_amount) + getAdditionalCharges(detail.additional_charges)).toFixed(2));
}
function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4 md:p-6">
      <div className="bg-white w-full max-w-[92vw] rounded-[18px] shadow-2xl overflow-hidden border border-line max-h-[96vh] flex flex-col">
        <div
          className="relative flex items-center justify-end px-6 py-4 border-b border-line shrink-0"
          style={{ background: "linear-gradient(135deg, #e5e9bd 0%, #f4f6dc 100%)" }}
        >
          <h2 className="absolute inset-x-0 text-center text-[15px] font-bold text-[#5d6a1a] pointer-events-none">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#c0392b] text-white hover:bg-[#a93226] transition-colors text-[18px] leading-none"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 md:p-6 bg-[#fbfbf8]">{children}</div>
      </div>
    </div>
  );
}

function AttachmentLine({ label, url, onOpen }: { label: string; url: string; onOpen: (url: string) => void }) {
  const active = Boolean(url && url !== "#");

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="text-ink-secondary min-w-[92px] shrink-0">{label}</span>
      <span className="text-ink-secondary">:</span>
      {active ? (
        <button
          type="button"
          onClick={() => onOpen(url)}
          className="inline-flex items-center justify-center w-5 h-5 rounded border border-red-300 text-red-500 hover:bg-red-50"
          title={label}
        >
          <i className="fa fa-file-pdf text-[11px]" />
        </button>
      ) : (
        <span className="text-ink-muted">-</span>
      )}
    </div>
  );
}

function TotalsPanel({ detail, fmtAmt }: { detail: BillDetail; fmtAmt: (value: number | string | undefined | null) => string }) {
  const baseAmount = numericValue(detail.total_amount);
  const additionalCharges = getAdditionalCharges(detail.additional_charges);
  const grandTotalAmount = getGrandTotalAmount(detail);
  const rows = [
    ["Base Amount:", baseAmount],
    ["Additional Charges:", additionalCharges],
    ["Total Amount:", grandTotalAmount],
    ["TDS Deduction:", detail.tds_deduction],
    ["Others Deduction:", detail.others_deduction],
    ["Advance Amount:", detail.advance_amount],
  ] as const;

  return (
    <div className="min-w-[250px] space-y-2 text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-6">
          <span className="text-ink-secondary">{label}</span>
          <span className="font-semibold text-ink">&#8377; {fmtAmt(value)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-6 border-t border-line pt-3 text-[14px]">
        <span className="font-semibold text-ink">Total Payable Amount:</span>
        <span className="font-bold text-ink">&#8377; {fmtAmt(detail.total_payable)}</span>
      </div>
    </div>
  );
}
function PaymentTable({ items, fmtAmt, additionalCharges = 0 }: { items: DetailItem[]; fmtAmt: (value: number | string | undefined | null) => string; additionalCharges?: number }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof DetailItem | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const handleSort = (key: keyof DetailItem) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else setSortDir("asc");
    } else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: keyof DetailItem) => {
    const topFill = sortKey === key && sortDir === "asc" ? "#6b742c" : "#b8c295";
    const bottomFill = sortKey === key && sortDir === "desc" ? "#6b742c" : "#d9dec9";
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

  const totals = calculateVendorBillLineItemTotals(visibleItems, {
    unitPrice: (item) => item.unit_price,
    basicAmount: (item) => item.basic_amount,
    gst: (item) => item.gst,
    gstAmount: (item) => item.gst_amount,
    totalAmount: (item) => item.total_amount,
  });
  const billAdditionalAmount = getAdditionalCharges(additionalCharges);
  const grandTotalAmount = Number((totals.totalAmountTotal + billAdditionalAmount).toFixed(2));

  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <i className="fa fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted pointer-events-none" />
          <input name="search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="pl-7 pr-7 py-1.5 text-[12px] border border-line rounded-lg bg-white focus:outline-none focus:border-[#8a9a30] w-44" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[11px] cursor-pointer"><i className="fa fa-xmark" /></button>}
        </div>
        {search && <span className="text-[11px] text-ink-muted">{visibleItems.length}/{items.length} results</span>}
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-[11.5px] border-collapse border border-line-dark bg-white">
        <thead>
          <tr className="bg-[#f3efdc] text-[#6b742c]">
            <th className="border border-line-dark px-2 py-2 text-left whitespace-nowrap font-semibold">S NO</th>
            {(["dc_no", "invoice_no", "po_no"] as (keyof DetailItem)[]).map((key, i) => (
              <th key={key} onClick={() => handleSort(key)} className="border border-line-dark px-2 py-2 text-left whitespace-nowrap font-semibold cursor-pointer select-none hover:bg-[#e8e4d0]">
                {["DC No. / Date", "Invoice No. / Date", "PO No. / Date"][i]}{sortIcon(key)}
              </th>
            ))}
            <th onClick={() => handleSort("invoice_qty")} className="border border-line-dark px-2 py-2 text-left whitespace-nowrap font-semibold cursor-pointer select-none hover:bg-[#e8e4d0]">Invoice Qty{sortIcon("invoice_qty")}</th>
            <th className="border border-line-dark px-2 py-2 text-left whitespace-nowrap font-semibold">Consignee Address</th>
            {(["unit_price", "basic_amount", "gst", "gst_amount", "total_amount"] as (keyof DetailItem)[]).map((key, i) => (
              <th key={key} onClick={() => handleSort(key)} className="border border-line-dark px-2 py-2 text-left whitespace-nowrap font-semibold cursor-pointer select-none hover:bg-[#e8e4d0]">
                {["Unit Price", "Basic amount", "GST", "GST Amount", "Total Amount"][i]}{sortIcon(key)}
              </th>
            ))}
            <th className="border border-line-dark px-2 py-2 text-left whitespace-nowrap font-semibold">Additional Amount</th>
            <th className="border border-line-dark px-2 py-2 text-left whitespace-nowrap font-semibold">Grand Total</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.length === 0 ? (
            <tr>
              <td colSpan={13} className="border border-line-dark px-3 py-6 text-center text-ink-muted">
                {search ? "No matching items" : "No line items available"}
              </td>
            </tr>
          ) : (
            <>
              {visibleItems.map((item) => (
                <tr key={item.s_no} className="align-top">
                  <td className="border border-line-dark px-2 py-2">{item.s_no}</td>
                  <td className="border border-line-dark px-2 py-2"><div>{displayText(item.dc_no)}</div><div className="font-semibold text-[11px]">{displayText(item.dc_date)}</div></td>
                  <td className="border border-line-dark px-2 py-2"><div>{displayText(item.invoice_no)}</div><div className="font-semibold text-[11px]">{displayText(item.invoice_date)}</div></td>
                  <td className="border border-line-dark px-2 py-2"><div>{displayText(item.po_no)}</div><div className="font-semibold text-[11px]">{displayText(item.po_date)}</div></td>
                  <td className="border border-line-dark px-2 py-2 text-right">{item.invoice_qty}</td>
                  <td className="border border-line-dark px-2 py-2">{displayText(item.consignee_address)}</td>
                  <td className="border border-line-dark px-2 py-2 text-right">{fmtAmt(item.unit_price)}</td>
                  <td className="border border-line-dark px-2 py-2 text-right">{fmtAmt(item.basic_amount)}</td>
                  <td className="border border-line-dark px-2 py-2 text-center">{displayText(item.gst)}</td>
                  <td className="border border-line-dark px-2 py-2 text-right">{fmtAmt(item.gst_amount)}</td>
                  <td className="border border-line-dark px-2 py-2 text-right">{fmtAmt(item.total_amount)}</td>
                  <td className="border border-line-dark px-2 py-2 text-center text-ink-muted">-</td>
                  <td className="border border-line-dark px-2 py-2 text-right font-semibold">{fmtAmt(item.total_amount)}</td>
                </tr>
              ))}
              <tr className="bg-[#f6f4e8] font-semibold text-ink">
                <td colSpan={6} className="border border-line-dark px-3 py-2.5 text-right uppercase tracking-wide text-[#5a6a20]">Grand Total</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{fmtAmt(totals.unitPriceTotal)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{fmtAmt(totals.basicAmountTotal)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-center">{totals.gstLabel}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{fmtAmt(totals.gstAmountTotal)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right font-semibold">{fmtAmt(totals.totalAmountTotal)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right">{fmtAmt(billAdditionalAmount)}</td>
                <td className="border border-line-dark px-3 py-2.5 text-right font-semibold">{fmtAmt(grandTotalAmount)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
function buildApprovalSteps(approval: ApprovalItem): ApprovalStep[] {
  return [
    { step: 1, label: "Bill Created", by: approval.bill_created_by, at: approval.bill_created_at, status: approval.bill_created_status },
    { step: 2, label: "Operation Team", by: approval.operation_by, at: approval.operation_at, status: approval.operation_status },
    { step: 3, label: "Account Entry", by: approval.account_entry_by, at: approval.account_entry_at, status: approval.account_entry_status },
    { step: 4, label: "Accounts Approval", by: approval.accounts_approval_by, at: approval.accounts_approval_at, status: approval.accounts_approval_status },
    { step: 5, label: "Management", by: approval.management_by, at: approval.management_at, status: approval.management_status },
    { step: 6, label: "Payment", by: approval.payment_ref, at: approval.payment_date, status: approval.payment_status, extra: approval.payment_amount },
  ];
}

function WorkflowTable({ approvals }: { approvals: ApprovalItem[] }) {
  if (!approvals.length) return null;
  return <ApprovalStepsCard steps={buildApprovalSteps(approvals[0])} />;
}

function HeaderCard({ detail, onOpenFile, showApprovalMeta }: { detail: BillDetail; onOpenFile: (url: string) => void; showApprovalMeta: boolean }) {
  const showContactName = detail.vendor_contact_name && detail.vendor_contact_name !== detail.vendor_name;
  const voucherText = [
    detail.vendor_invoice_no ? `INVOICE V.NO: ${detail.vendor_invoice_no}` : "",
    detail.account_bill_id ? `TDS V.NO: ${detail.account_bill_id}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-[0_1px_4px_rgba(15,23,42,0.04)] mb-4">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr_1.05fr]">
        <div className="space-y-6">
          <div>
            <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-2">Vendor Details</p>
            <p className="text-[13px] font-bold text-[#647026] leading-tight">{displayText(detail.vendor_name)}</p>
            {showContactName ? <p className="text-[13px] font-bold text-[#647026] leading-tight">{displayText(detail.vendor_contact_name)}</p> : null}
            <div className="text-[12px] text-ink-secondary mt-2 flex items-start gap-1.5">
              <i className="fa fa-location-dot text-[11px] mt-0.5 shrink-0" />
              <span>{displayText(detail.vendor_address)}</span>
            </div>
            <div className="text-[12px] text-ink-secondary mt-1">GST No: <strong className="text-ink">{displayText(detail.vendor_gst)}</strong>, PAN No: <strong className="text-ink">{displayText(detail.vendor_pan)}</strong></div>
            <div className="text-[12px] text-ink-secondary mt-1 flex items-center gap-1.5"><i className="fa fa-envelope text-[11px]" />{displayText(detail.vendor_email)}</div>
            <div className="text-[12px] text-ink-secondary mt-1 flex items-center gap-1.5"><i className="fa fa-phone text-[11px]" />{displayText(detail.vendor_phone)}</div>
          </div>

          {showApprovalMeta ? (
            <div>
              <div className="space-y-2.5 text-[12px]">
                <div>
                  <div className="font-semibold text-[#647026]">Bill created By</div>
                  <div className="font-semibold text-ink">{joinNameDate(detail.bill_created_by, detail.bill_created_at)}</div>
                </div>
                <div>
                  <div className="font-semibold text-[#647026]">Bill Approved By</div>
                  <div className="font-semibold text-ink">{joinNameDate(detail.bill_approved_by, detail.bill_approved_at)}</div>
                </div>
                <div>
                  <div className="font-semibold text-[#647026]">Account Bill created By</div>
                  <div className="font-semibold text-ink">{joinNameDate(detail.account_bill_created_by, detail.account_bill_created_at)}</div>
                </div>
                <div>
                  <div className="font-semibold text-[#647026]">Account Remarks</div>
                  <div className="font-semibold text-ink">{displayText(detail.account_remarks)}</div>
                </div>
              </div>
              {voucherText ? <div className="mt-3 text-[12px] font-semibold text-ink">{voucherText}</div> : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-2">Vendor Bill Details</p>
            <p className="text-[14px] font-bold text-[#647026] mb-1">{displayText(detail.vendor_bill_no)}</p>
            <div className="text-[12px] text-ink-secondary flex items-center gap-1.5">
              <i className="fa fa-calendar text-[11px]" />
              <span>{displayText(detail.vendor_bill_date)}</span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-2">Vendor Invoice Details</p>
            <p className="text-[14px] font-bold text-[#647026] mb-1">{displayText(detail.vendor_invoice_no)}</p>
            <div className="text-[12px] text-ink-secondary flex items-center gap-1.5 mb-2">
              <i className="fa fa-calendar text-[11px]" />
              <span>{displayText(detail.vendor_invoice_date)}</span>
            </div>
            <div className="space-y-1.5">
              <AttachmentLine label="Invoice Attach" url={detail.invoice_attach_url} onOpen={onOpenFile} />
              <AttachmentLine label="PO Attach" url={detail.po_attach_url} onOpen={onOpenFile} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-3">Vendor Bank Details</p>
          <div className="space-y-2 text-[12px]">
            {[
              ["Bank Name", detail.bank_name],
              ["Branch", detail.branch],
              ["Account No", detail.account_no],
              ["IFSC Code", detail.ifsc_code],
              ["Account Holder", detail.account_holder],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-ink-secondary min-w-[96px] shrink-0">{label}</span>
                <span className="text-ink-secondary">:</span>
                <span className="font-semibold text-[#647026]">{displayText(value)}</span>
              </div>
            ))}
            <div className="pt-1 space-y-1.5">
              <AttachmentLine label="PAN Copy" url={detail.pan_copy_url} onOpen={onOpenFile} />
              <AttachmentLine label="Bank Proof" url={detail.bank_proof_url} onOpen={onOpenFile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountsTeamBillApproval() {
  const [tab, setTab] = useState<Status>("Pending");
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("Approved");
  const [rejectReason, setRejectReason] = useState("");
  const [rows, setRows] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [modal, setModal] = useState<null | { type: "edit" | "view"; bill_no: string }>(null);

  const isDateRangeValid = useCallback(() => {
    if (!fromDate || !toDate) return true;
    if (new Date(fromDate).getTime() <= new Date(toDate).getTime()) return true;
    void showWarningAlert("From Date Must be Equal or Lower than To Date");
    return false;
  }, [fromDate, toDate]);

  const fetchList = useCallback(async () => {
    if (tab === "Complete" && !isDateRangeValid()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: tab.toLowerCase(),
        page: String(page),
        length: String(length),
        search,
        from_date: fromDate,
        to_date: toDate,
      });
      const response = await fetch(`${API}/list/?${params}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setRows([]);
      setTotal(0);
      void showErrorAlert("Error Occured");
    }
    setLoading(false);
  }, [tab, page, length, search, fromDate, toDate, isDateRangeValid]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openModal = async (type: "edit" | "view", bill_no: string) => {
    setModal({ type, bill_no });
    setDetail(null);
    setRemarks("");
    setApprovalStatus("Approved");
    setRejectReason("");
    setDetailLoading(true);

    const data = await fetch(`${API}/detail/?bill_no=${encodeURIComponent(bill_no)}`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);

    if (!data || data.error) {
      setModal(null);
      setDetailLoading(false);
      void showErrorAlert(data?.error || "Error Occured");
      return;
    }

    setDetail(data);
    setRemarks(data.remarks || "");
    setDetailLoading(false);
  };

  const closeModal = () => {
    setModal(null);
    setDetail(null);
  };

  const handleSubmit = async () => {
    if (!modal) return;
    if (approvalStatus === "Rejected" && !rejectReason.trim()) {
      await showWarningAlert("Please enter a Reject Reason");
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${API}/update-remark/`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ bill_no: modal.bill_no, remark: remarks }),
      });
      const response = await fetch(`${API}/approve/`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ bill_no: modal.bill_no, status: approvalStatus, remark: remarks, reject_reason: rejectReason }),
      });
      if (!response.ok) throw new Error();
      await showSuccessAlert(approvalStatus === "Approved" ? "Successfully Approved" : "Successfully Updated");
      closeModal();
      fetchList();
    } catch {
      await showErrorAlert("Error Occured");
    }
    setSubmitting(false);
  };

  const buildPages = (): (number | "...")[] => {
    const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const fmtAmt = (value: number | string | undefined | null) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const openFile = (url: string) => {
    if (!url || url === "#") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
      <PageTopbar title="Accounts Team Bill Approval" breadcrumbs={["Vendor Payment", "Accounts Team Bill Approval"]} />
      <VendorPaymentPageIntro
        title="Accounts Team Bill Approval"
        description="Validate entered payable values, supporting attachments, and workflow remarks before finance approval without changing the current approval steps."
        metrics={[
          { label: "Active Tab", value: tab === "Pending" ? "Pending" : "Complete" },
          { label: "Visible Rows", value: rows.length },
          { label: "Total Records", value: total },
        ]}
      />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e2e7d0] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
        <PageTabs
          items={[
            { value: "Pending", label: "Accounts Team Bill Approval Pending" },
            { value: "Complete", label: "Accounts Team Bill Complete" },
          ]}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPage(1);
            setSearch("");
          }}
        />

        <div className="p-6">
          {tab === "Complete" && (
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[24px] border border-[#e7dcb4] bg-[linear-gradient(135deg,#fffdf6_0%,#f8fbef_100%)] px-4 py-4">
              <label className="flex w-full max-w-[220px] flex-col gap-1 text-[13px] font-medium text-ink-secondary">
                <span>From Date</span>
                <input name="fromdate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-[38px] rounded-xl border border-line-dark px-3 text-[13px] outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/15" />
              </label>
              <label className="flex w-full max-w-[220px] flex-col gap-1 text-[13px] font-medium text-ink-secondary">
                <span>To Date</span>
                <input name="todate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-[38px] rounded-xl border border-line-dark px-3 text-[13px] outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/15" />
              </label>
              <button onClick={() => { if (!isDateRangeValid()) return; setPage(1); fetchList(); }} className="h-[38px] rounded-2xl bg-brand-700 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800">Go</button>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between gap-3 rounded-[28px] border border-[#ecd9a2] bg-[linear-gradient(135deg,#fffdf6_0%,#fffaf2_44%,#f9fbef_100%)] px-5 py-4 shadow-[0_18px_36px_rgba(104,116,40,0.07)] flex-wrap">
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary flex-wrap">
              Show
              <SearchableSelectInput name="length" value={length} onChange={(e) => { setLength(+e.target.value); setPage(1); }} className="min-w-[92px] rounded-2xl border border-[#d7c79c] px-3 py-2 text-[13px]">
                {[10, 25, 50, 100, -1].map((n) => <option key={n} value={n}>{n === -1 ? "All" : n}</option>)}
              </SearchableSelectInput>
              entries
              {["Copy", "CSV", "Excel", "PDF", "Print"].map((btn) => (
                <button
                  key={btn}
                  onClick={() => { if (btn === "Excel") window.location.href = `${API}/export/?tab=${tab.toLowerCase()}&search=${encodeURIComponent(search)}&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`; }}
                  className="rounded-2xl border border-[#dcc98e] bg-white px-4 py-2 font-semibold text-[#5b641d] shadow-sm transition-colors hover:bg-[#faf4df]"
                >
                  {btn}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              Search:
              <input name="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-48 rounded-xl border border-line-dark px-3 py-2 text-[13px] outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-[22px] border border-line">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-surface-2">
                  {(tab === "Pending"
                    ? ["S.No", "Vendor Bill Date / Bill No", "Vendor Invoice Date / Invoice No", "Vendor Details", "Dc Count", "Amount", "Advance Amount", "Total Payable Amount", "Vendor Approved By/ Date", "Status", "Reject Reason", "Rejected By", "Remarks", "Action"]
                    : ["S.No", "Vendor Bill Date / Bill No", "Vendor Invoice Date / Invoice No", "Vendor Details", "Dc Count", "Amount", "Tds Deduction", "other Deduction", "Advance Amount", "Total Payable Amount", "Accounts Team Approved By / Date", "Status", "Action"]
                  ).map((header) => <th key={header} className="border border-line-dark px-3 py-2 text-left whitespace-nowrap">{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={tab === "Pending" ? 14 : 13} className="text-center py-8 text-ink-muted text-[12px]">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={tab === "Pending" ? 14 : 13} className="text-center py-8 text-ink-muted text-[12px]">No data available in table</td></tr>
                ) : (
                  rows.map((bill, index) => (
                    <tr key={bill.id} className="hover:bg-brand-50/40 border-b border-line/50">
                      <td className="px-3 py-2 text-center border">{length === -1 ? index + 1 : (page - 1) * length + index + 1}</td>
                      <td className="px-3 py-2 border"><div className="font-medium">{bill.bill_date}</div><div className="text-ink-muted">{bill.bill_no}</div></td>
                      <td className="px-3 py-2 border"><div className="font-medium">{bill.invoice_date}</div><div className="text-ink-muted">{bill.invoice_no}</div></td>
                      <td className="px-3 py-2 border max-w-[240px]"><div className="font-medium text-ink">{bill.vendor_name || "-"}</div><div className="text-ink-muted">{bill.vendor_address || "-"}</div><div className="text-ink-muted">{bill.vendor_phone || "-"}</div></td>
                      <td className="px-3 py-2 text-center border">{bill.dc_count}</td>
                      <td className="px-3 py-2 text-right border">{fmtAmt(bill.amount)}</td>
                      {tab === "Pending" ? (
                        <>
                          <td className="px-3 py-2 text-right border">{fmtAmt(bill.advance_amount)}</td>
                          <td className="px-3 py-2 text-right border font-semibold">{fmtAmt(bill.total_payable)}</td>
                          <td className="px-3 py-2 border"><div className="font-medium">{bill.vendor_approved_by || "-"}</div><div className="text-ink-muted text-[11px]">{bill.vendor_approved_date || "-"}</div></td>
                          <td className="px-3 py-2 text-center border"><span className={`font-semibold ${bill.status === "Approved" ? "text-success" : bill.status === "Rejected" ? "text-danger" : "text-brand-600"}`}>{bill.status || "-"}</span></td>
                          <td className="px-3 py-2 border">{bill.finance_reject_reason || "-"}</td>
                          <td className="px-3 py-2 border">{bill.finance_approved_by || "-"}</td>
                          <td className="px-3 py-2 border">{bill.remarks || "-"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-right border">{fmtAmt(bill.tds_deduction)}</td>
                          <td className="px-3 py-2 text-right border">{fmtAmt(bill.others_deduction)}</td>
                          <td className="px-3 py-2 text-right border">{fmtAmt(bill.advance_amount)}</td>
                          <td className="px-3 py-2 text-right border font-semibold">{fmtAmt(bill.total_payable)}</td>
                          <td className="px-3 py-2 border"><div className="font-medium">{bill.finance_approved_by || "-"}</div><div className="text-ink-muted text-[11px]">{bill.finance_approved_date || "-"}</div></td>
                          <td className="px-3 py-2 text-center border"><span className={`font-semibold ${bill.status === "Approved" ? "text-success" : bill.status === "Rejected" ? "text-danger" : "text-brand-600"}`}>{bill.status || "-"}</span></td>
                        </>
                      )}
                      <td className="px-3 py-2 text-center border">
                        <button onClick={() => openModal(tab === "Pending" ? "edit" : "view", bill.bill_no)} className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 hover:bg-info hover:text-white mx-auto">
                          <i className={`fa ${tab === "Pending" ? "fa-pen-to-square" : "fa-eye"}`} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-3 text-[13px] text-ink-secondary">
            <span>
              Showing {total === 0 ? 0 : length === -1 ? 1 : Math.min((page - 1) * length + 1, total)}
              {" "}to {length === -1 ? total : Math.min(page * length, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button disabled={length === -1 || page === 1} onClick={() => setPage((current) => current - 1)} className="px-3 border border-line rounded disabled:opacity-50">Previous</button>
              {buildPages().map((item, index) => item === "..." ? <span key={index} className="px-2">...</span> : <button key={item} onClick={() => setPage(item as number)} className={`px-3 border rounded ${page === item ? "bg-brand-500 text-white" : ""}`}>{item}</button>)}
              <button disabled={length === -1 || page >= Math.max(1, Math.ceil(total / length))} onClick={() => setPage((current) => current + 1)} className="px-3 border border-line rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>
      {modal?.type === "edit" && (
        <ModalWrapper title="Accounts Team Bill Approval" onClose={closeModal}>
          {detailLoading || !detail ? (
            <div className="text-center py-8 text-ink-muted">Loading...</div>
          ) : (
            <>
              <HeaderCard detail={detail} onOpenFile={openFile} showApprovalMeta />

              <div className="rounded-lg border border-line bg-white p-5 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                <WorkflowTable approvals={detail.approvals || []} />

                <p className="text-[12.5px] font-bold text-[#6b742c] mb-3 mt-5">Vendor Payment Table</p>
                <PaymentTable items={detail.dc_items} fmtAmt={fmtAmt} additionalCharges={detail.additional_charges} />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] items-start">
                  <div className="space-y-6">
                    <div>
                      <span className="block text-[12.5px] font-semibold text-ink mb-2">Remarks:</span>
                      <textarea name="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} className="w-full border border-line-dark rounded px-3 py-2 text-[12.5px] resize-none focus:outline-none focus:border-brand-500 min-h-[92px]" />
                    </div>

                    <div className="max-w-[480px]">
                      <span className="block text-[12.5px] font-semibold text-ink mb-2">Status:</span>
                      <SearchableSelectInput name="approvalstatus" value={approvalStatus} onChange={(e) => { setApprovalStatus(e.target.value); if (e.target.value !== "Rejected") setRejectReason(""); }} className="border border-line-dark rounded px-3 py-2 text-[12.5px] w-full focus:outline-none focus:border-brand-500">
                        <option>Approved</option>
                        <option>Rejected</option>
                        <option>Pending</option>
                      </SearchableSelectInput>
                    </div>

                    {approvalStatus === "Rejected" && (
                      <div className="max-w-[480px]">
                        <span className="block text-[12.5px] font-semibold text-ink mb-2">Reject Reason:</span>
                        <textarea name="rejectreason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="w-full border border-line-dark rounded px-3 py-2 text-[12.5px] resize-none focus:outline-none focus:border-brand-500" placeholder="Enter reject reason..." />
                      </div>
                    )}
                  </div>

                  <div className="lg:justify-self-end">
                    <TotalsPanel detail={detail} fmtAmt={fmtAmt} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={closeModal} className="px-5 py-2 rounded text-[13px] font-semibold bg-danger text-white hover:bg-red-700">Close</button>
                  <button disabled={submitting} onClick={handleSubmit} className="px-5 py-2 rounded text-[13px] font-semibold bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-60">{submitting ? "Saving..." : "Submit"}</button>
                </div>
              </div>
            </>
          )}
        </ModalWrapper>
      )}

      {modal?.type === "view" && (
        <ModalWrapper title="Account Team Approval" onClose={closeModal}>
          {detailLoading || !detail ? (
            <div className="text-center py-8 text-ink-muted">Loading...</div>
          ) : (
            <>
              <HeaderCard detail={detail} onOpenFile={openFile} showApprovalMeta={false} />

              <div className="rounded-lg border border-line bg-white p-5 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                <WorkflowTable approvals={detail.approvals} />

                <p className="text-[12.5px] font-bold text-[#6b742c] mb-3 mt-5">Vendor Payment Table</p>
                <PaymentTable items={detail.dc_items} fmtAmt={fmtAmt} additionalCharges={detail.additional_charges} />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] items-start mb-6">
                  <div className="pt-2 text-[13px] text-ink-secondary flex flex-wrap gap-x-6 gap-y-2">
                    <span>
                      Accounts Team Bill approved By: <strong className="text-[#647026]">{displayText(detail.accounts_team_approved_by)}</strong>
                    </span>
                    <span>
                      Accounts Team Bill approved Date: <strong className="text-[#647026]">{dateOnly(detail.accounts_team_approved_at)}</strong>
                    </span>
                  </div>

                  <div className="lg:justify-self-end">
                    <TotalsPanel detail={detail} fmtAmt={fmtAmt} />
                  </div>
                </div>

                <div className="flex justify-end mt-5">
                  <button onClick={closeModal} className="px-5 py-2 rounded text-[13px] font-semibold bg-danger text-white hover:bg-red-700">Close</button>
                </div>
              </div>
            </>
          )}
        </ModalWrapper>
      )}
    </div>
  );
}




