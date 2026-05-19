import { useCallback, useEffect, useMemo, useState } from "react";
import PageTopbar from "../../components/common/PageTopbar";
import PageTabs from "../../components/common/PageTabs";
import TableToolbar from "../../components/common/TableToolbar";
import api from "../../api/axios";
import ApprovalStepsCard from "../../components/common/ApprovalStepsCard";
import { showErrorAlert, showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import { calculateVendorBillLineItemTotals } from "../../utils/vendorBillLineItemTotals";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import VendorPaymentPageIntro from "../../components/common/VendorPaymentPageIntro";

type Status = "Pending" | "Complete";

interface Bill {
  bill_no: string;
  bill_date: string;
  invoice_date: string;
  invoice_no: string;
  vendor_name: string;
  vendor_address: string;
  vendor_phone: string;
  dc_count: number;
  amount: number;
  status: "Approved" | "Rejected" | "Pending";
  approved_by: string;
  approved_date: string;
  rejected_by: string;
  reject_reason: string;
  bill_remark: string;
}

interface DcItem {
  sno: number;
  dc_no: string;
  dc_date: string;
  inv_no: string;
  inv_date: string;
  po_no: string;
  po_date: string;
  inv_qty: number;
  consignee: string;
  unit_price: number;
  basic_amount: number;
  gst: number;
  gst_amount: number;
  total_amount: number;
}

interface BillDetail {
  vendor: Record<string, string>;
  bill: Record<string, string>;
  bank: Record<string, string>;
  dc_items: DcItem[];
  total_amount: number;
  additional_charges?: number;
  grand_total_amount?: number;
  approval: Record<string, string> | null;
}

const pendingHeaders = [
  "S.No",
  "Vendor Created Date / Bill No",
  "Vendor Invoice Date / Invoice No",
  "Vendor Name",
  "Dc Count",
  "Bill Amount",
  "Status",
  "Rejected By",
  "Rejected Reason",
  "Remarks",
] as const;

const completeHeaders = [
  "S.No",
  "Vendor Bill Date / Bill No",
  "Vendor Invoice Date / Invoice No",
  "Vendor Name",
  "Dc Count",
  "Bill Amount",
  "Vendor Bill Approved By / Date",
] as const;

function displayValue(value?: string | number | null) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function formatMoney(value: number) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value: number) {
  return `\u20B9 ${formatMoney(value)}`;
}

function getAdditionalCharges(value?: number | null) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function getGrandTotalAmount(detail?: { total_amount?: number | null; additional_charges?: number | null; grand_total_amount?: number | null }) {
  if (!detail) return 0;
  const grandTotal = Number(detail.grand_total_amount);
  if (Number.isFinite(grandTotal)) return grandTotal;
  return Number(detail.total_amount || 0) + getAdditionalCharges(detail.additional_charges);
}

function buildVendorSummary(bill: Bill) {
  return [
    bill.vendor_name || "",
    bill.vendor_address || "",
    bill.vendor_phone ? `Ph.No. ${bill.vendor_phone}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function resolveAttachmentUrl(fileName?: string, folder = "vendorpayment", mode: "legacy" | "media" = "legacy") {
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
  return mode === "media"
    ? `${protocol}//${hostname}/media/${folder}/${raw}`
    : `${protocol}//${hostname}/otm_beta/uploads/${folder}/${raw}`;
}

function AttachmentIconLink({ href, label }: { href?: string; label: string }) {
  if (!href) return <span className="text-ink-muted">-</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-100 text-danger hover:bg-red-50 transition-colors"
    >
      <i className="fa fa-file-pdf text-[16px]" />
    </a>
  );
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-start justify-center overflow-y-auto px-3 py-3 md:px-4 md:py-4">
      <div className="w-full max-w-[90vw] bg-white rounded-[18px] shadow-2xl overflow-hidden border border-line max-h-[calc(100vh-24px)] flex flex-col">
        <div className="relative px-5 py-3 border-b border-line shrink-0" style={{ background: "linear-gradient(135deg, #e8eed1 0%, #f7f8ec 100%)" }}>
          <h3 className="text-center text-[15px] font-bold text-[#56621b] pointer-events-none">{title}</h3>
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-[#c0392b] text-white hover:bg-[#a93226] transition-colors"
          >
            <i className="fa fa-xmark text-[16px]" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-3">{children}</p>;
}

function LabeledRows({ rows }: { rows: Array<[string, string | undefined]> }) {
  return (
    <div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start gap-2 text-[12px] mb-1.5">
          <span className="w-28 shrink-0 text-ink-secondary">{label}</span>
          <span className="text-ink-secondary">:</span>
          <span className="font-medium text-[#5a6a20] break-words">{displayValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

function statusTextClass(status?: string) {
  const value = String(status ?? "").trim().toLowerCase();
  if (value.includes("reject")) return "text-danger";
  if (value.includes("approve") || value.includes("paid") || value.includes("created")) return "text-success";
  return "text-[#d58a00]";
}

function renderStatus(status: Bill["status"]) {
  return <span className={`font-semibold ${statusTextClass(status)}`}>{displayValue(status)}</span>;
}
function DetailHeader({ detail, mode }: { detail: BillDetail; mode: "edit" | "view" }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div>
        <SectionTitle>Vendor Details</SectionTitle>
        <p className="text-[14px] font-bold text-[#5a6a20] leading-tight mb-1">{displayValue(detail.vendor.name)}</p>
        <p className="text-[13px] font-semibold text-ink mb-2">{displayValue(detail.vendor.contact_person)}</p>
        <p className="text-[12px] text-ink-secondary flex items-start gap-2 mb-1.5">
          <i className="fa fa-location-dot text-[12px] mt-0.5 shrink-0 text-[#718039]" />
          <span>{displayValue(detail.vendor.address)}</span>
        </p>
        <p className="text-[12px] text-ink-secondary mb-1.5">
          GST No: <span className="font-semibold text-ink">{displayValue(detail.vendor.gst_no)}</span>, PAN No: <span className="font-semibold text-ink">{displayValue(detail.vendor.pan_no)}</span>
        </p>
        <p className="text-[12px] text-ink-secondary flex items-center gap-2 mb-1.5">
          <i className="fa fa-envelope text-[11px] text-[#718039]" />
          <span>{displayValue(detail.vendor.mail)}</span>
        </p>
        <p className="text-[12px] text-ink-secondary flex items-center gap-2">
          <i className="fa fa-phone text-[11px] text-[#718039]" />
          <span>{displayValue(detail.vendor.phone)}</span>
        </p>
        {/* {mode === "view" ? (
          <div className="mt-4 text-[12px] text-ink-secondary space-y-1">
            <p>
              <span className="font-semibold text-ink">Approved By:</span> {displayValue(detail.vendor.approved_by)}
            </p>
          </div>
        ) : null} */}
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <SectionTitle>Vendor Bill Details</SectionTitle>
          <p className="text-[14px] font-bold text-[#5a6a20] mb-1">{displayValue(detail.bill.bill_no)}</p>
          <p className="text-[12px] text-ink-secondary flex items-center gap-2">
            <i className="fa fa-calendar-days text-[11px] text-[#718039]" />
            <span>{displayValue(detail.bill.bill_date)}</span>
          </p>
        </div>

        <div>
          <SectionTitle>Vendor Invoice Details</SectionTitle>
          <p className="text-[14px] font-bold text-[#5a6a20] mb-1">{displayValue(detail.bill.invoice_no)}</p>
          <p className="text-[12px] text-ink-secondary flex items-center gap-2 mb-2">
            <i className="fa fa-calendar-days text-[11px] text-[#718039]" />
            <span>{displayValue(detail.bill.invoice_date)}</span>
          </p>
          <div className="flex items-center gap-4 text-[12px] text-ink-secondary flex-wrap">
            <span className="inline-flex items-center gap-2">Invoice Attach <AttachmentIconLink href={resolveAttachmentUrl(detail.bill.invoice_file)} label="Invoice Attach" /></span>
            <span className="inline-flex items-center gap-2">PO Attach <AttachmentIconLink href={resolveAttachmentUrl(detail.bill.po_file)} label="PO Attach" /></span>
          </div>
        </div>
{/* 
        <div className="text-[12px] text-ink-secondary space-y-1">
          {mode === "edit" ? (
            <>
              <p>
                <span className="font-semibold text-ink">Bill Created By:</span> {displayValue(detail.bill.bill_created_by)}
              </p>
              <p>
                <span className="font-semibold text-ink">Bill Created Date:</span> {displayValue(detail.bill.bill_created_date)}
              </p>
            </>
          ) : (
            <p>
              <span className="font-semibold text-ink">Approved Date:</span> {displayValue(detail.bill.approved_date)}
            </p>
          )}
        </div> */}
      </div>

      <div>
        <SectionTitle>Vendor Bank Details</SectionTitle>
        <LabeledRows
          rows={[
            ["Bank Name", detail.bank.bank_name],
            ["Branch", detail.bank.branch],
            ["Account No", detail.bank.account_no],
            ["IFSC Code", detail.bank.ifsc_code],
            ["Account Holder", detail.bank.holder],
          ]}
        />
        <div className="flex items-center gap-2 text-[12px] mb-1.5">
          <span className="w-28 shrink-0 text-ink-secondary">PAN Copy</span>
          <span className="text-ink-secondary">:</span>
          <AttachmentIconLink href={resolveAttachmentUrl(detail.bank.pan_copy, "vendor_creation", "media")} label="PAN Copy" />
        </div>
        <div className="flex items-center gap-2 text-[12px] mb-1.5">
          <span className="w-28 shrink-0 text-ink-secondary">Bank Proof</span>
          <span className="text-ink-secondary">:</span>
          <AttachmentIconLink href={resolveAttachmentUrl(detail.bank.bank_proof, "vendor_creation", "media")} label="Bank Proof" />
        </div>
        {mode === "view" ? (
          <div className="flex gap-2 text-[12px] mt-2">
            <span className="w-28 shrink-0 text-ink-secondary">Reject Reason</span>
            <span className="text-ink-secondary">:</span>
            <span className="font-medium text-ink">{displayValue(detail.bank.reject_reason)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailLineItemsTable({ items, title, additionalCharges = 0 }: { items: DcItem[]; title: string; additionalCharges?: number }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof DcItem | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const handleSort = (key: keyof DcItem) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else setSortDir("asc");
    } else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: keyof DcItem) => {
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[12.5px] font-bold text-brand-700">{title}</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <i className="fa fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted pointer-events-none" />
            <input name="search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="pl-7 pr-7 py-1.5 text-[12px] border border-line rounded-lg bg-white focus:outline-none focus:border-brand-500 w-44" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[11px] cursor-pointer"><i className="fa fa-xmark" /></button>}
          </div>
          {search && <span className="text-[11px] text-ink-muted">{visibleItems.length}/{items.length} results</span>}
        </div>
      </div>
      <div className="overflow-x-auto border border-line rounded-lg">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-surface-2">
              <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">S No.</th>
              {(["dc_no", "inv_no", "po_no"] as (keyof DcItem)[]).map((key, i) => (
                <th key={key} onClick={() => handleSort(key)} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap cursor-pointer select-none hover:bg-brand-50">
                  {["DC No / Date", "Invoice No / Date", "PO No / Date"][i]}{sortIcon(key)}
                </th>
              ))}
              <th onClick={() => handleSort("inv_qty")} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap cursor-pointer select-none hover:bg-brand-50">Invoice Qty{sortIcon("inv_qty")}</th>
              <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">Consignee Address</th>
              {(["unit_price", "basic_amount", "gst", "gst_amount", "total_amount"] as (keyof DcItem)[]).map((key, i) => (
                <th key={key} onClick={() => handleSort(key)} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap cursor-pointer select-none hover:bg-brand-50">
                  {["Unit Price", "Basic Amount", "GST", "GST Amount", "Total Amount"][i]}{sortIcon(key)}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">Additional Amount</th>
              <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-10 text-center text-ink-muted border border-line">
                  {search ? "No matching items" : "No detail rows found"}
                </td>
              </tr>
            ) : (
              <>
                {visibleItems.map((item) => (
                  <tr key={`${item.sno}-${item.dc_no}-${item.inv_no}`} className="hover:bg-brand-50/30 border-b border-line/50 align-top">
                    <td className="px-3 py-2.5 text-center border-x border-line/50">{item.sno}</td>
                    <td className="px-3 py-2.5 border-x border-line/50 min-w-[140px]"><div className="font-semibold text-ink">{displayValue(item.dc_no)}</div><div className="text-[11px] text-ink-muted">{displayValue(item.dc_date)}</div></td>
                    <td className="px-3 py-2.5 border-x border-line/50 min-w-[150px]"><div className="font-semibold text-ink">{displayValue(item.inv_no)}</div><div className="text-[11px] text-ink-muted">{displayValue(item.inv_date)}</div></td>
                    <td className="px-3 py-2.5 border-x border-line/50 min-w-[150px]"><div className="font-semibold text-ink">{displayValue(item.po_no)}</div><div className="text-[11px] text-ink-muted">{displayValue(item.po_date)}</div></td>
                    <td className="px-3 py-2.5 text-center border-x border-line/50">{item.inv_qty || 0}</td>
                    <td className="px-3 py-2.5 border-x border-line/50 min-w-[220px] text-ink-secondary">{displayValue(item.consignee)}</td>
                    <td className="px-3 py-2.5 text-right border-x border-line/50">{formatMoney(Number(item.unit_price || 0))}</td>
                    <td className="px-3 py-2.5 text-right border-x border-line/50">{formatMoney(Number(item.basic_amount || 0))}</td>
                    <td className="px-3 py-2.5 text-center border-x border-line/50">{displayValue(item.gst)} %</td>
                    <td className="px-3 py-2.5 text-right border-x border-line/50">{formatMoney(Number(item.gst_amount || 0))}</td>
                    <td className="px-3 py-2.5 text-right font-semibold border-x border-line/50 text-ink">{formatCurrency(Number(item.total_amount || 0))}</td>
                    <td className="px-3 py-2.5 text-center border-x border-line/50 text-ink-secondary">-</td>
                    <td className="px-3 py-2.5 text-right border-x border-line/50 font-semibold text-[#5a6a20]">{formatCurrency(Number(item.total_amount || 0))}</td>
                  </tr>
                ))}
                <tr className="bg-[#f6f4e8] font-semibold text-ink">
                  <td colSpan={6} className="border border-line-dark px-3 py-2.5 text-right uppercase tracking-wide text-[#5a6a20]">Grand Total</td>
                  <td className="border border-line-dark px-3 py-2.5 text-right">{formatMoney(totals.unitPriceTotal)}</td>
                  <td className="border border-line-dark px-3 py-2.5 text-right">{formatMoney(totals.basicAmountTotal)}</td>
                  <td className="border border-line-dark px-3 py-2.5 text-center">{totals.gstLabel}</td>
                  <td className="border border-line-dark px-3 py-2.5 text-right">{formatMoney(totals.gstAmountTotal)}</td>
                  <td className="border border-line-dark px-3 py-2.5 text-right">{formatCurrency(totals.totalAmountTotal)}</td>
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

function ApprovalWorkflowTable({ approval }: { approval: BillDetail["approval"] }) {
  if (!approval) return null;
  const steps = [
    { step: 1, label: "Bill Created", by: approval.bill_created_by, at: approval.bill_created_at, status: approval.bill_created_status },
    { step: 2, label: "Operation Team", by: approval.op_by, at: approval.op_at, status: approval.op_status },
    { step: 3, label: "Account Entry", by: approval.acc_entry_by, at: approval.acc_entry_at, status: approval.acc_entry_status },
    { step: 4, label: "Accounts Approval", by: approval.finance_by, at: approval.finance_at, status: approval.finance_status },
    { step: 5, label: "Management", by: approval.mgmt_by, at: approval.mgmt_at, status: approval.mgmt_status },
    { step: 6, label: "Payment", by: approval.pay_ref, at: approval.pay_date, status: approval.pay_status, extra: approval.pay_amount },
  ];
  return <ApprovalStepsCard steps={steps} />;
}

export default function VendorBillApproval() {
  const [tab, setTab] = useState<Status>("Pending");
  const [bills, setBills] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [length, setLength] = useState(10);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState<null | { type: "edit" | "view"; bill_no: string }>(null);
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("Approved");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isDateRangeValid = useCallback((startDate: string, endDate: string) => {
    if (!startDate || !endDate) return true;
    if (new Date(startDate).getTime() <= new Date(endDate).getTime()) return true;
    void showWarningAlert("From Date must be less than or equal to To Date");
    return false;
  }, []);

  const fetchList = useCallback(async () => {
    if (tab === "Complete" && !isDateRangeValid(appliedFromDate, appliedToDate)) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: tab.toLowerCase(),
        page: String(page),
        length: String(length),
        search,
        from_date: tab === "Complete" ? appliedFromDate : "",
        to_date: tab === "Complete" ? appliedToDate : "",
      });
      const response = await api.get(`/master/vendor-bill-approval/list/?${params.toString()}`);
      setBills(Array.isArray(response.data?.data) ? response.data.data : []);
      setTotal(Number(response.data?.total || 0));
    } catch {
      setBills([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab, page, length, search, appliedFromDate, appliedToDate, isDateRangeValid]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openModal = async (type: "edit" | "view", bill_no: string) => {
    setModal({ type, bill_no });
    setDetail(null);
    setRemarks("");
    setApprovalStatus("Approved");
    setRejectReason("");
    setDetailLoading(true);
    try {
      const response = await api.get(`/master/vendor-bill-approval/detail/?bill_no=${encodeURIComponent(bill_no)}`);
      setDetail(response.data);
      if (response.data?.bill?.bill_remark) setRemarks(response.data.bill.bill_remark);
      if (response.data?.bank?.reject_reason) setRejectReason(response.data.bank.reject_reason);
    } catch {
      setDetail(null);
      await showErrorAlert("Error Occured");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setModal(null);
    setDetail(null);
    setRejectReason("");
  };

  const handleSubmit = async () => {
    if (!modal) return;
    if (approvalStatus === "Rejected" && !rejectReason.trim()) {
      await showWarningAlert("Reject reason is required");
      return;
    }

    setSubmitting(true);
    try {
      if (remarks.trim()) {
        await api.post("/master/vendor-bill-approval/update-remark/", { bill_no: modal.bill_no, remark: remarks });
      }
      await api.post("/master/vendor-bill-approval/approve/", {
        bill_no: modal.bill_no,
        status: approvalStatus,
        remark: remarks,
        reject_reason: approvalStatus === "Rejected" ? rejectReason.trim() : "",
      });
      await showSuccessAlert(approvalStatus === "Approved" ? "Successfully Approved" : "Successfully Rejected");
      closeModal();
      void fetchList();
    } catch {
      await showErrorAlert("Error Occured");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
  const startEntry = total === 0 ? 0 : length === -1 ? 1 : (page - 1) * length + 1;
  const endEntry = total === 0 ? 0 : length === -1 ? total : Math.min(page * length, total);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
      <PageTopbar title="Vendor Bill Approval" breadcrumbs={["Vendor Payment", "Vendor Bill Approval"]} />
      <VendorPaymentPageIntro
        title="Vendor Bill Approval"
        description="Review generated vendor bills, check remarks and attachments, and complete the approval or rejection decision inside the same workflow you already use."
        metrics={[
          { label: "Active Tab", value: tab === "Pending" ? "Pending" : "Complete" },
          { label: "Visible Rows", value: bills.length },
          { label: "Total Records", value: total },
        ]}
      />

      <div className="mt-4 overflow-visible rounded-[30px] border border-[#e2e7d0] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
        <PageTabs
          items={[
            { value: "Pending", label: "Vendor Bill Approval Pending" },
            { value: "Complete", label: "Vendor Bill Complete" },
          ]}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPage(1);
            setSearch("");
            if (value === "Pending") {
              setFromDate("");
              setToDate("");
              setAppliedFromDate("");
              setAppliedToDate("");
            }
          }}
        />

        <div className="p-6">
          {tab === "Complete" ? (
            <div className="mb-4 flex flex-wrap items-end gap-4 rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
              <label className="flex w-full max-w-[220px] flex-col gap-1.5 text-[13px] font-medium text-ink-secondary">
                <span className="text-[12px] font-semibold text-ink-secondary">From Date</span>
                <input name="fromdate"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-[38px] rounded-xl border border-line-dark bg-white px-3 text-[13px] text-ink outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/15"
                />
              </label>
              <label className="flex w-full max-w-[220px] flex-col gap-1.5 text-[13px] font-medium text-ink-secondary">
                <span className="text-[12px] font-semibold text-ink-secondary">To Date</span>
                <input name="todate"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="h-[38px] rounded-xl border border-line-dark bg-white px-3 text-[13px] text-ink outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/15"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!isDateRangeValid(fromDate, toDate)) return;
                  setPage(1);
                  setAppliedFromDate(fromDate);
                  setAppliedToDate(toDate);
                }}
                className="h-[38px] rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(79,122,43,0.28)]"
              >
                Go
              </button>
            </div>
          ) : null}

          <TableToolbar
            length={length}
            onLengthChange={(value) => {
              setLength(value);
              setPage(1);
            }}
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            exportConfig={{
              data: bills,
              headers: tab === "Pending"
                ? ["S.No", "Vendor Created Date / Bill No", "Vendor Invoice Date / Invoice No", "Vendor Name", "Dc Count", "Bill Amount", "Remarks"]
                : ["S.No", "Vendor Bill Date / Bill No", "Vendor Invoice Date / Invoice No", "Vendor Name", "Dc Count", "Bill Amount", "Status", "Approved By / Date", "Rejected By", "Reject Reason"],
              rowMapper: (bill, index) => {
                const serial = String(length === -1 ? index + 1 : (page - 1) * length + index + 1);
                const billInfo = `${displayValue(bill.bill_date)} | ${displayValue(bill.bill_no)}`;
                const invoiceInfo = `${displayValue(bill.invoice_date)} | ${displayValue(bill.invoice_no)}`;
                const vendorInfo = buildVendorSummary(bill) || "-";
                if (tab === "Pending") {
                  return [
                    serial,
                    billInfo,
                    invoiceInfo,
                    vendorInfo,
                    String(bill.dc_count || 0),
                    formatMoney(Number(bill.amount || 0)),
                    displayValue(bill.bill_remark),
                  ];
                }
                return [
                  serial,
                  billInfo,
                  invoiceInfo,
                  vendorInfo,
                  String(bill.dc_count || 0),
                  formatMoney(Number(bill.amount || 0)),
                  displayValue(bill.status),
                  `${displayValue(bill.approved_by)} | ${displayValue(bill.approved_date)}`,
                  displayValue(bill.rejected_by),
                  displayValue(bill.reject_reason),
                ];
              },
              filename: tab === "Pending" ? "vendor_bill_approval_pending" : "vendor_bill_approval_complete",
              printTitle: "Vendor Bill Approval",
            }}
          />

          <div className={tab === "Complete" ? "overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]" : "overflow-x-auto border border-line rounded-lg"}>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className={tab === "Complete" ? "bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]" : "bg-surface-2"}>
                  {(tab === "Pending"
                    ? [
                        "S.No",
                        "Vendor Created Date / Bill No",
                        "Vendor Invoice Date / Invoice No",
                        "Vendor Name",
                        "Dc Count",
                        "Bill Amount",
                        "Remarks",
                        "Action",
                      ]
                    : [
                        "S.No",
                        "Vendor Bill Date / Bill No",
                        "Vendor Invoice Date / Invoice No",
                        "Vendor Name",
                        "Dc Count",
                        "Bill Amount",
                        "Status",
                        "Approved By / Date",
                        "Rejected By",
                        "Reject Reason",
                        "Action",
                      ]).map((header) => (
                    <th key={header} className={tab === "Complete" ? "border-b border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643] whitespace-nowrap" : "px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap"}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tab === "Pending" ? 8 : 11} className="px-3 py-10 text-center text-ink-muted border border-line">
                      Loading...
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={tab === "Pending" ? 8 : 11} className="px-3 py-10 text-center text-ink-muted border border-line">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  bills.map((bill, index) => (
                    <tr key={`${bill.bill_no}-${index}`} className={tab === "Complete" ? "border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] align-top transition-colors hover:bg-[#f1f7e6]" : "hover:bg-brand-50/40 border-b border-line/50 align-top"}>
                      <td className="px-3 py-2.5 text-center border-x border-line/50">{length === -1 ? index + 1 : (page - 1) * length + index + 1}</td>
                      <td className="px-3 py-2.5 border-x border-line/50 min-w-[150px]"><div className="font-semibold text-ink">{displayValue(bill.bill_date)}</div><div className="text-[11px] text-ink-secondary font-bold">{displayValue(bill.bill_no)}</div></td>
                      <td className="px-3 py-2.5 border-x border-line/50 min-w-[160px]"><div className="font-semibold text-ink">{displayValue(bill.invoice_date)}</div><div className="text-[11px] text-ink-secondary font-bold">{displayValue(bill.invoice_no)}</div></td>
                      <td className="px-3 py-2.5 border-x border-line/50 min-w-[320px]"><div className="font-bold text-ink text-[13px] uppercase">{displayValue(bill.vendor_name)}</div><div className="text-[11px] text-ink-secondary leading-[1.45] mt-1">{displayValue(bill.vendor_address)}</div><div className="text-[11px] text-ink-secondary mt-1">Ph.No. {displayValue(bill.vendor_phone)}</div></td>
                      <td className="px-3 py-2.5 text-center border-x border-line/50">{bill.dc_count || 0}</td>
                      <td className="px-3 py-2.5 text-right font-semibold border-x border-line/50">{formatMoney(Number(bill.amount || 0))}</td>
                      {tab === "Pending" ? (
                        <td className="px-3 py-2.5 border-x border-line/50 text-ink-secondary">{displayValue(bill.bill_remark)}</td>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-center border-x border-line/50">{renderStatus(bill.status)}</td>
                          <td className="px-3 py-2.5 border-x border-line/50 min-w-[160px]"><div className="font-semibold text-ink">{displayValue(bill.approved_by)}</div><div className="text-[11px] text-ink-secondary mt-1">{displayValue(bill.approved_date)}</div></td>
                          <td className="px-3 py-2.5 border-x border-line/50 text-ink-secondary">{displayValue(bill.rejected_by)}</td>
                          <td className="px-3 py-2.5 border-x border-line/50 text-ink-secondary">{displayValue(bill.reject_reason)}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-center border-x border-line/50">
                        <button
                          type="button"
                          onClick={() => void openModal(tab === "Pending" ? "edit" : "view", bill.bill_no)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded bg-white border border-line-dark text-ink hover:bg-brand-700 hover:text-white transition-colors cursor-pointer"
                        >
                          <i className={`fa ${tab === "Pending" ? "fa-pen-to-square" : "fa-eye"}`} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap mt-3 text-[13px] text-ink-secondary">
            <div>Showing {startEntry} to {endEntry} of {total} entries</div>
            <div className="flex items-center gap-2">
              <button
                disabled={length === -1 || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="px-3 py-1.5 border border-line rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                disabled={length === -1 || page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="px-3 py-1.5 border border-line rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      {modal?.type === "edit" ? (
        <ModalWrapper title="Vendor Bill Approval" onClose={closeModal}>
          {detailLoading || !detail ? (
            <div className="py-10 text-center text-ink-muted">Loading...</div>
          ) : (
            <div className="space-y-4">
              <DetailHeader detail={detail} mode="edit" />

              <ApprovalWorkflowTable approval={detail.approval} />

              <DetailLineItemsTable items={detail.dc_items || []} additionalCharges={detail.additional_charges} title="Vendor Bill Approval Table" />

              <div className="flex flex-col items-end gap-1 text-[13px]">
                <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">Base Amount:</span><span className="font-semibold text-ink">{formatCurrency(Number(detail.total_amount || 0))}</span></div>
                <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">Additional Charges:</span><span className="font-semibold text-ink">{formatCurrency(getAdditionalCharges(detail.additional_charges))}</span></div>
                <div className="flex justify-between w-full max-w-md pt-1 border-t border-line"><span className="font-bold text-ink">Total Amount:</span><span className="font-bold text-[#5a6a20]">{formatCurrency(getGrandTotalAmount(detail))}</span></div>
              </div>

              <div>
                <span className="block text-[12.5px] font-semibold text-ink mb-1">Remarks</span>
                <textarea name="remarks"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={2}
                  className="w-full border border-line-dark rounded px-3 py-2 text-[12.5px] resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/15"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <span className="block text-[12.5px] font-semibold text-ink mb-1">Status</span>
                  <SearchableSelectInput name="approvalstatus"
                    value={approvalStatus}
                    onChange={(event) => {
                      const value = event.target.value;
                      setApprovalStatus(value);
                      if (value !== "Rejected") setRejectReason("");
                    }}
                    className="border border-line-dark rounded px-3 py-2 text-[12.5px] w-52 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/15"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Reject</option>
                  </SearchableSelectInput>
                </div>

                {approvalStatus === "Rejected" ? (
                  <div>
                    <span className="block text-[12.5px] font-semibold text-ink mb-1">Reject Reason</span>
                    <textarea name="rejectreason"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={2}
                      className="w-full max-w-[520px] border border-line-dark rounded px-3 py-2 text-[12.5px] resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/15"
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-5 py-2 rounded text-[13px] font-semibold bg-[#f06f4f] text-white hover:bg-[#df5f40] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="px-5 py-2 rounded text-[13px] font-semibold bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? "Saving..." : "Submit"}
                </button>
              </div>
            </div>
          )}
        </ModalWrapper>
      ) : null}

      {modal?.type === "view" ? (
        <ModalWrapper title="Vendor Bill Approval" onClose={closeModal}>
          {detailLoading || !detail ? (
            <div className="py-10 text-center text-ink-muted">Loading...</div>
          ) : (
            <div className="space-y-4">
              <DetailHeader detail={detail} mode="view" />

              <ApprovalWorkflowTable approval={detail.approval} />

              <DetailLineItemsTable items={detail.dc_items || []} additionalCharges={detail.additional_charges} title="Vendor Bill Table" />

              <div className="flex flex-col items-end gap-1 text-[13px]">
                <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">Base Amount:</span><span className="font-semibold text-ink">{formatCurrency(Number(detail.total_amount || 0))}</span></div>
                <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">Additional Charges:</span><span className="font-semibold text-ink">{formatCurrency(getAdditionalCharges(detail.additional_charges))}</span></div>
                <div className="flex justify-between w-full max-w-md pt-1 border-t border-line"><span className="font-bold text-ink">Total Amount:</span><span className="font-bold text-[#5a6a20]">{formatCurrency(getGrandTotalAmount(detail))}</span></div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-5 py-2 rounded text-[13px] font-semibold bg-[#f06f4f] text-white hover:bg-[#df5f40] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </ModalWrapper>
      ) : null}
    </div>
  );
}



