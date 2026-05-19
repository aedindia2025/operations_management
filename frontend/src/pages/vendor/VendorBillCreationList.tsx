import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import PageTabs from "../../components/common/PageTabs";
import TableToolbar from "../../components/common/TableToolbar";
import {
  createVendorBill,
  fetchVendorBillCreationList,
  fetchVendorCreatedBillDetail,
  fetchVendorBillPendingDetail,
  type VendorBillApprovalItem,
  type VendorBillCreatedDetail,
  type VendorBillCreatedLineItem,
  type VendorBillCreatedRow,
  type VendorBillPendingDetailRow,
  type VendorBillPendingRow,
  type VendorBillRejectedRow,
  type VendorBillSummary,
} from "../../api/vendorBillCreationApi";
import { fetchPaymentNotifications, markAllPaymentNotificationsRead } from "../../api/notificationApi";
import { showErrorAlert, showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import { calculateVendorBillLineItemTotals } from "../../utils/vendorBillLineItemTotals";
import ApprovalStepsCard from "../../components/common/ApprovalStepsCard";
import VendorPaymentPageIntro from "../../components/common/VendorPaymentPageIntro";
type TabKey = "pending" | "created" | "rejected";
type PendingOverlayStep = "none" | "availability" | "invoice";
type VendorInvoiceFormState = {
  generatedVendorInvoiceId: string;
  userInvoiceId: string;
  invoiceIssueDate: string;
  additionalCharges: string;
  invoiceFile: File | null;
  poFile: File | null;
};
type VendorInvoicePreviewDraft = {
  vendorId: string;
  vendorName: string;
  selectedIds: string[];
  generatedVendorInvoiceId: string;
  userInvoiceId: string;
  invoiceIssueDate: string;
  additionalCharges: string;
  fromInvoiceStep: boolean;
};
const VENDOR_INVOICE_PREVIEW_DRAFT_KEY = "vendorBillInvoicePreviewDraft";
const PAYMENT_NOTIFICATION_USER_TYPES = [
  "65efd97b4df4040205",
  "68cba503472bd48995",
];
function readVendorInvoicePreviewDraft(): VendorInvoicePreviewDraft | null {
  try {
    const raw = sessionStorage.getItem(VENDOR_INVOICE_PREVIEW_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VendorInvoicePreviewDraft>;
    if (!parsed.vendorId) return null;
    return {
      vendorId: String(parsed.vendorId),
      vendorName: String(parsed.vendorName ?? ""),
      selectedIds: Array.isArray(parsed.selectedIds)
        ? parsed.selectedIds.map((value) => String(value)).filter(Boolean)
        : [],
      generatedVendorInvoiceId: String(parsed.generatedVendorInvoiceId ?? ""),
      userInvoiceId: String(parsed.userInvoiceId ?? ""),
      invoiceIssueDate: String(parsed.invoiceIssueDate ?? ""),
      additionalCharges: String(parsed.additionalCharges ?? "0"),
      fromInvoiceStep: parsed.fromInvoiceStep === true,
    };
  } catch {
    return null;
  }
}
function writeVendorInvoicePreviewDraft(draft: VendorInvoicePreviewDraft) {
  try {
    sessionStorage.setItem(VENDOR_INVOICE_PREVIEW_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore session storage write failures.
  }
}
function clearVendorInvoicePreviewDraft() {
  try {
    sessionStorage.removeItem(VENDOR_INVOICE_PREVIEW_DRAFT_KEY);
  } catch {
    // Ignore session storage delete failures.
  }
}
function createVendorInvoiceFormState(overrides: Partial<VendorInvoiceFormState> = {}): VendorInvoiceFormState {
  return {
    generatedVendorInvoiceId: "",
    userInvoiceId: "",
    invoiceIssueDate: getTodayInputValue(),
    additionalCharges: "0",
    invoiceFile: null,
    poFile: null,
    ...overrides,
  };
}
function formatMoney(value: number) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatCurrency(value: number) {
  return `\u20B9 ${formatMoney(value)}`;
}
function formatDisplayAmount(value: number) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
function getVendorBillGrandTotal(bill: {
  total_amount?: number;
  additional_charges?: number;
  grand_total_amount?: number;
}) {
  if (
    bill.grand_total_amount !== undefined
    && bill.grand_total_amount !== null
    && Number.isFinite(Number(bill.grand_total_amount))
  ) {
    return Number(bill.grand_total_amount);
  }
  return Number(bill.total_amount || 0) + Number(bill.additional_charges || 0);
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
function statusClass(status: string) {
  const value = String(status ?? "").trim().toLowerCase();
  if (value.includes("reject")) return "text-danger";
  if (value.includes("approve")) return "text-success";
  return "text-[#d58a00]";
}
function getTodayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function toDateInputValue(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return getTodayInputValue();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const ddmmyyyyMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    return `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2]}-${ddmmyyyyMatch[1]}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return getTodayInputValue();
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function formatDateLabel(value?: string) {
  const inputValue = toDateInputValue(value);
  const [year, month, day] = inputValue.split("-");
  if (year && month && day) return `${day}-${month}-${year}`;
  return value || "-";
}
function parseAmountInput(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}
function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function toHtmlLineBreaks(value?: string) {
  return escapeHtml(String(value ?? "").trim()).replace(/\r?\n/g, "<br />");
}
function buildVendorInvoicePrintHtml(args: {
  invoiceNo: string;
  invoiceDate: string;
  vendorSummary: VendorBillSummary;
  vendorName: string;
  rows: VendorBillPendingDetailRow[];
  additionalCharges: number;
}) {
  const baseTotal = args.rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const totalQty = args.rows.reduce((sum, row) => sum + Number(row.invoice_qty || 0), 0);
  const totalBasicAmount = args.rows.reduce((sum, row) => sum + Number(row.basic_amount || 0), 0);
  const totalGstAmount = args.rows.reduce((sum, row) => sum + Number(row.gst_amount || 0), 0);
  const grandTotal = baseTotal + args.additionalCharges;
  const rowsHtml = args.rows.map((row, index) => {
    const description = [
      row.dc_number ? `DC: ${escapeHtml(row.dc_number)} (${escapeHtml(row.dc_date || "-")})` : "",
      row.invoice_no ? `Invoice: ${escapeHtml(row.invoice_no)} (${escapeHtml(row.invoice_date || "-")})` : "",
      row.po_num ? `PO: ${escapeHtml(row.po_num)} (${escapeHtml(row.po_date || "-")})` : "",
      row.consignee_address ? escapeHtml(row.consignee_address) : "",
    ].filter(Boolean).join("<br />");
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${description || "-"}</td>
        <td class="num">${escapeHtml(String(row.invoice_qty ?? 0))}</td>
        <td class="num">${formatMoney(Number(row.rate || 0))}</td>
        <td class="num">${formatMoney(Number(row.basic_amount || 0))}</td>
        <td class="num">${escapeHtml(String(row.gst ?? 0))}%</td>
        <td class="num">${formatMoney(Number(row.gst_amount || 0))}</td>
        <td class="num strong">${formatCurrency(Number(row.total_amount || 0))}</td>
      </tr>
    `;
  }).join("");
  const vendorAddress = [
    toHtmlLineBreaks(args.vendorSummary.address),
    escapeHtml(args.vendorSummary.contact_no || ""),
    escapeHtml(args.vendorSummary.mail_id || ""),
  ].filter(Boolean).join("<br />");
  const billToAddress = args.rows.map((row) => row.consignee_address).find((value) => String(value ?? "").trim()) || "";
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(args.invoiceNo || "Vendor Invoice")}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #edf0e2; color: #1f2937; }
          .page { width: min(100%, 1080px); margin: 0 auto; background: #fff; border: 1px solid #d9dfca; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); padding: 32px 40px 40px; }
          .title { margin: 0 0 28px; font-size: 32px; font-weight: 500; color: #344b68; text-align: center; }
          .header { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 32px; margin-bottom: 24px; align-items: start; }
          .party-block { font-size: 14px; line-height: 1.65; }
          .party-name { font-size: 15px; font-weight: 700; text-transform: uppercase; }
          .section-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; text-transform: uppercase; }
          .meta { font-size: 15px; line-height: 1.9; font-weight: 700; }
          .meta-row { display: grid; grid-template-columns: 118px 12px 1fr; gap: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #222; padding: 10px 12px; font-size: 12px; vertical-align: top; }
          th { background: #fff; font-weight: 700; }
          td.num { text-align: right; white-space: nowrap; }
          td.center { text-align: center; }
          td.total-label { text-align: right; font-weight: 700; }
          .strong { font-weight: 700; }
          .summary { margin-top: 24px; display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 32px; }
          .summary-title { margin: 0 0 10px; font-size: 16px; font-weight: 700; }
          .account-block { font-size: 14px; line-height: 1.8; }
          .amount-box { border: 1px solid #d9dfca; border-radius: 12px; padding: 14px 16px; background: #f8faf5; }
          .amount-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #dde3cf; font-size: 14px; }
          .amount-row:last-child { border-bottom: 0; font-size: 15px; font-weight: 700; color: #46591d; }
          .signatory { margin-top: 48px; text-align: right; font-size: 14px; font-weight: 700; }
          @page { size: A4 portrait; margin: 14mm; }
          @media print {
            body { padding: 0; background: #fff; }
            .page { width: 100%; border: 0; box-shadow: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <h1 class="title">Invoice</h1>
          <section class="header">
            <div class="party-block">
              <div class="party-name">${escapeHtml(args.vendorName || args.vendorSummary.company_name || "-")}</div>
              <div>${vendorAddress || "-"}</div>
              <div><span class="strong">GST NO:</span> ${escapeHtml(args.vendorSummary.gst_no || "-")}</div>
              <div><span class="strong">PAN NO:</span> ${escapeHtml(args.vendorSummary.pan_no || "-")}</div>
            </div>
            <div class="meta">
              <div class="meta-row"><span>DATE</span><span>:</span><span>${escapeHtml(formatDateLabel(args.invoiceDate))}</span></div>
              <div class="meta-row"><span>INVOICE NO</span><span>:</span><span>${escapeHtml(args.invoiceNo || "-")}</span></div>
            </div>
          </section>
          <section class="party-block" style="margin-bottom: 20px;">
            <div class="section-title">Bill To,</div>
            <div>${toHtmlLineBreaks(billToAddress) || "-"}</div>
          </section>
          <table>
            <thead>
              <tr>
                <th style="width:56px;">S NO</th>
                <th>Description</th>
                <th style="width:82px;">Qty</th>
                <th style="width:110px;">Unit Price</th>
                <th style="width:120px;">Basic Amount</th>
                <th style="width:90px;">GST %</th>
                <th style="width:120px;">GST Amount</th>
                <th style="width:130px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="text-align:center;">No invoice rows selected</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="total-label">TOTAL:</td>
                <td class="center strong">${escapeHtml(String(totalQty))}</td>
                <td></td>
                <td class="num strong">${formatMoney(totalBasicAmount)}</td>
                <td></td>
                <td class="num strong">${formatMoney(totalGstAmount)}</td>
                <td class="num strong">${formatCurrency(baseTotal)}</td>
              </tr>
            </tfoot>
          </table>
          <section class="summary">
            <div>
              <div class="summary-title">ACCOUNT DETAILS:</div>
              <div class="account-block">
                <div>${escapeHtml(args.vendorSummary.bank_name || "-")}</div>
                <div>A/C NO: ${escapeHtml(args.vendorSummary.account_no || "-")}</div>
                <div>IFSC : ${escapeHtml(args.vendorSummary.ifsc_code || "-")}</div>
                <div>BRANCH : ${escapeHtml(args.vendorSummary.branch_name || "-")}</div>
                <div>ACCOUNT HOLDER : ${escapeHtml(args.vendorSummary.acc_holder_name || "-")}</div>
              </div>
            </div>
            <div>
              <div class="summary-title">Amount Summary</div>
              <div class="amount-box">
                <div class="amount-row"><span>Selected Total</span><span>${formatCurrency(baseTotal)}</span></div>
                <div class="amount-row"><span>Additional Charges</span><span>${formatCurrency(args.additionalCharges)}</span></div>
                <div class="amount-row"><span>Grand Total</span><span>${formatCurrency(grandTotal)}</span></div>
              </div>
            </div>
          </section>
          <div class="signatory">Authorised Signatory</div>
        </main>
      </body>
    </html>
  `;
}
function AttachmentIconLink({ href, label }: { href?: string; label: string }) {
  if (!href) return <span className="text-ink-muted">-</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" title={label} className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-red-50 transition-colors">
      <i className="fa fa-file-pdf text-danger text-[17px]" />
    </a>
  );
}
function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-start justify-center overflow-y-auto px-4 py-6">
      <div className="w-full max-w-[92vw] bg-white rounded-[20px] shadow-2xl overflow-hidden border border-line flex flex-col max-h-[calc(100vh-48px)]">
        <div className="relative px-6 py-4 border-b border-line shrink-0" style={{ background: "linear-gradient(135deg, #e8eed1 0%, #f7f8ec 100%)" }}>
          <h3 className="text-center text-[15px] font-bold text-[#56621b] pointer-events-none">{title}</h3>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-[#c0392b] text-white hover:bg-[#a93226] transition-colors text-[18px] leading-none cursor-pointer border-0">
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
function DialogCard({ title, onClose, children, maxWidthClass = "max-w-2xl" }: { title: string; onClose: () => void; children: React.ReactNode; maxWidthClass?: string }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-[1px] flex items-center justify-center px-4 py-6">
      <div className={`w-full ${maxWidthClass} bg-white rounded-[18px] shadow-2xl border border-line overflow-hidden`}>
        <div className="relative px-6 py-4 border-b border-line bg-white">
          <h4 className="text-[16px] font-bold text-ink pr-10">{title}</h4>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full border border-line text-ink-secondary hover:bg-surface-2 transition-colors cursor-pointer">
            <i className="fa fa-xmark text-[16px]" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
function VendorInvoiceFieldRow({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[184px_minmax(0,1fr)] gap-x-6 gap-y-3 items-start">
      <div className="pt-1 text-[14px] sm:text-[15px] font-semibold leading-7 text-[#2f3541]">
        {label}
        {required ? <span className="text-[#d55a47]">*</span> : null}
      </div>
      <div className="min-w-0 text-[15px] leading-7 text-[#444b55]">{children}</div>
    </div>
  );
}
function VendorInvoiceConfirmationDialog({
  onClose,
  onPrint,
  generatedVendorInvoiceId,
  userInvoiceId,
  onUserInvoiceIdChange,
  invoiceIssueDate,
  additionalCharges,
  onAdditionalChargesChange,
  totalInvoiceAmount,
  companyName,
  invoiceFile,
  existingInvoiceFileName,
  onInvoiceFileChange,
  poFile,
  existingPoFileName,
  onPoFileChange,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onPrint: () => void;
  generatedVendorInvoiceId: string;
  userInvoiceId: string;
  onUserInvoiceIdChange: (value: string) => void;
  invoiceIssueDate: string;
  additionalCharges: string;
  onAdditionalChargesChange: (value: string) => void;
  totalInvoiceAmount: number;
  companyName: string;
  invoiceFile: File | null;
  existingInvoiceFileName?: string;
  onInvoiceFileChange: (file: File | null) => void;
  poFile: File | null;
  existingPoFileName?: string;
  onPoFileChange: (file: File | null) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const visibleAdditionalCharges = additionalCharges === "0" ? "" : additionalCharges;
  return (
    <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[1px] flex items-start justify-center overflow-y-auto px-4 py-6 sm:py-10">
      <div className="w-full max-w-[640px] overflow-hidden rounded-[22px] border border-[#e7ebf2] bg-white shadow-[0_28px_60px_rgba(15,23,42,0.24)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#eceff4] bg-white px-5 py-5 sm:px-8">
          <h4 className="text-[18px] sm:text-[20px] font-semibold text-[#3a4049]">Vendor Invoice Confirmation</h4>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent text-[#8b9098] transition-colors hover:bg-[#f3f5f9] hover:text-[#535862] cursor-pointer"
          >
            <i className="fa fa-xmark text-[24px]" />
          </button>
        </div>
        <div className="bg-[#fbfcfe] px-4 py-5 sm:px-8 sm:py-6">
          <div className="rounded-[20px] border border-[#edf1f7] bg-white px-4 py-5 shadow-[0_14px_36px_rgba(148,163,184,0.14)] sm:px-6 sm:py-6">
            <div className="space-y-6 sm:space-y-7">
              <VendorInvoiceFieldRow label="Vendor Print:">
                <button
                  type="button"
                  onClick={onPrint}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#dfe5ef] bg-[#fafbfd] text-[#444b55] shadow-sm transition-colors hover:bg-[#f1f4f8] cursor-pointer"
                >
                  <i className="fa fa-print text-[24px]" />
                </button>
              </VendorInvoiceFieldRow>
              <VendorInvoiceFieldRow label="Vendor Invoice:">
                <div className="pt-1 text-[16px] font-medium text-[#444b55]">{generatedVendorInvoiceId || "-"}</div>
              </VendorInvoiceFieldRow>
              <VendorInvoiceFieldRow label="Invoice ID:">
                <input name="userinvoiceid"
                  type="text"
                  value={userInvoiceId}
                  onChange={(event) => onUserInvoiceIdChange(event.target.value)}
                  className="h-[46px] w-full rounded-[7px] border border-[#cfd6e2] bg-white px-4 text-[15px] text-[#353b45] shadow-sm outline-none transition-colors focus:border-[#8ba0d8] sm:w-[172px]"
                />
              </VendorInvoiceFieldRow>
              <VendorInvoiceFieldRow label="Vendor Invoice Issue Date:">
                <div className="pt-1 text-[16px] font-medium text-[#444b55]">{invoiceIssueDate || "-"}</div>
              </VendorInvoiceFieldRow>
              <VendorInvoiceFieldRow label="Additinal Charges:" required>
                <input name="visibleadditionalcharges"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={visibleAdditionalCharges}
                  onChange={(event) => onAdditionalChargesChange(event.target.value)}
                  className="h-[46px] w-full rounded-[7px] border border-[#cfd6e2] bg-white px-4 text-[15px] text-[#353b45] shadow-sm outline-none transition-colors focus:border-[#8ba0d8] sm:w-[172px]"
                />
              </VendorInvoiceFieldRow>
              <VendorInvoiceFieldRow label="Total Invoice Amount:">
                <div className="pt-1 text-[16px] font-medium text-[#444b55]">{formatDisplayAmount(totalInvoiceAmount)}</div>
              </VendorInvoiceFieldRow>
              <VendorInvoiceFieldRow label="Vendor Company Name:">
                <div className="pt-1 text-[16px] font-medium uppercase tracking-[0.02em] text-[#444b55]">{companyName || "-"}</div>
              </VendorInvoiceFieldRow>
              <VendorInvoiceFieldRow label="Upload vendor Invoice Copy(PDF):" required>
                <div className="space-y-2">
                  <input name="vendorbillcreationlist_input_496"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) => onInvoiceFileChange(event.target.files?.[0] ?? null)}
                    className="block w-full cursor-pointer rounded-[7px] border border-[#cfd6e2] bg-white text-[14px] text-[#444b55] shadow-sm file:mr-4 file:h-[46px] file:cursor-pointer file:border-0 file:border-r file:border-[#cfd6e2] file:bg-[#f3f5f8] file:px-5 file:text-[14px] file:font-medium file:text-[#2f3541] hover:file:bg-[#eceff5]"
                  />
                  {invoiceFile ? <p className="text-[12px] leading-5 text-[#6b7280]">Selected: {invoiceFile.name}</p> : null}
                  {!invoiceFile && existingInvoiceFileName ? <p className="text-[12px] leading-5 text-[#6b7280]">Current: {existingInvoiceFileName}</p> : null}
                </div>
              </VendorInvoiceFieldRow>
              <VendorInvoiceFieldRow label="Upload vendor PO Copy(PDF):" required>
                <div className="space-y-2">
                  <input name="vendorbillcreationlist_input_508"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) => onPoFileChange(event.target.files?.[0] ?? null)}
                    className="block w-full cursor-pointer rounded-[7px] border border-[#cfd6e2] bg-white text-[14px] text-[#444b55] shadow-sm file:mr-4 file:h-[46px] file:cursor-pointer file:border-0 file:border-r file:border-[#cfd6e2] file:bg-[#f3f5f8] file:px-5 file:text-[14px] file:font-medium file:text-[#2f3541] hover:file:bg-[#eceff5]"
                  />
                  {poFile ? <p className="text-[12px] leading-5 text-[#6b7280]">Selected: {poFile.name}</p> : null}
                  {!poFile && existingPoFileName ? <p className="text-[12px] leading-5 text-[#6b7280]">Current: {existingPoFileName}</p> : null}
                </div>
              </VendorInvoiceFieldRow>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting}
                  className="min-w-[94px] rounded-[7px] border-0 bg-[#677a19] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#556612] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[82px] rounded-[7px] border-0 bg-[#3f6fe8] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2f5ed2] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function PendingHeader({ summary }: { summary: VendorBillSummary }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-3">Vendor Details</p>
        <p className="text-[14px] font-bold text-[#5a6a20] leading-tight mb-1">{summary.company_name || "-"}</p>
        {summary.contact_person ? <p className="text-[13px] font-semibold text-ink mb-2">{summary.contact_person}</p> : null}
        <p className="text-[12px] text-ink-secondary flex items-start gap-2 mb-1.5">
          <i className="fa fa-location-dot text-[12px] mt-0.5 shrink-0 text-[#718039]" />
          <span>{summary.address || "-"}</span>
        </p>
        <p className="text-[12px] text-ink-secondary mb-1.5">
          GST No: <span className="font-semibold text-ink">{summary.gst_no || "-"}</span>, PAN No: <span className="font-semibold text-ink">{summary.pan_no || "-"}</span>
        </p>
        <p className="text-[12px] text-ink-secondary flex items-center gap-2 mb-1.5">
          <i className="fa fa-envelope text-[11px] text-[#718039]" />
          <span>{summary.mail_id || "-"}</span>
        </p>
        <p className="text-[12px] text-ink-secondary flex items-center gap-2">
          <i className="fa fa-phone text-[11px] text-[#718039]" />
          <span>{summary.contact_no || "-"}</span>
        </p>
      </div>
      <div>
        <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-3">Vendor Bank Details</p>
        {[
          ["Bank Name", summary.bank_name],
          ["Branch", summary.branch_name],
          ["Account No", summary.account_no],
          ["IFSC Code", summary.ifsc_code],
          ["Account Holder", summary.acc_holder_name],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start gap-2 text-[12px] mb-1.5">
            <span className="w-28 shrink-0 text-ink-secondary">{label}</span>
            <span className="text-ink-secondary">:</span>
            <span className="font-medium text-[#5a6a20]">{value || "-"}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-[12px] mb-1.5">
          <span className="w-28 shrink-0 text-ink-secondary">PAN Copy</span>
          <span className="text-ink-secondary">:</span>
          <AttachmentIconLink href={resolveAttachmentUrl(summary.pan_attach_file_name, "vendor_creation", "media")} label="PAN Copy" />
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="w-28 shrink-0 text-ink-secondary">Bank Proof</span>
          <span className="text-ink-secondary">:</span>
          <AttachmentIconLink href={resolveAttachmentUrl(summary.bank_proof, "vendor_creation", "media")} label="Bank Proof" />
        </div>
      </div>
    </div>
  );
}
function CompletedHeader({ detail }: { detail: VendorBillCreatedDetail }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div>
        <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-3">Vendor Details</p>
        <p className="text-[14px] font-bold text-[#5a6a20] leading-tight mb-1">{detail.vendor_name || "-"}</p>
        <p className="text-[12px] text-ink-secondary flex items-start gap-2 mb-1.5">
          <i className="fa fa-location-dot text-[12px] mt-0.5 shrink-0 text-[#718039]" />
          <span>{detail.vendor_address || "-"}</span>
        </p>
        <p className="text-[12px] text-ink-secondary mb-1.5">
          GST No: <span className="font-semibold text-ink">{detail.vendor_gst || "-"}</span>, PAN No: <span className="font-semibold text-ink">{detail.vendor_pan || "-"}</span>
        </p>
        <p className="text-[12px] text-ink-secondary flex items-center gap-2 mb-1.5">
          <i className="fa fa-envelope text-[11px] text-[#718039]" />
          <span>{detail.vendor_email || "-"}</span>
        </p>
        <p className="text-[12px] text-ink-secondary flex items-center gap-2">
          <i className="fa fa-phone text-[11px] text-[#718039]" />
          <span>{detail.vendor_phone || "-"}</span>
        </p>
      </div>
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-2">Vendor Bill Details</p>
          <p className="text-[14px] font-bold text-[#5a6a20] mb-1">{detail.vendor_bill_no || "-"}</p>
          <p className="text-[12px] text-ink-secondary flex items-center gap-2">
            <i className="fa fa-calendar text-[11px] text-[#718039]" />
            <span>{detail.vendor_bill_date || "-"}</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-2">Vendor Invoice Details</p>
          <p className="text-[14px] font-bold text-[#5a6a20] mb-1">{detail.vendor_invoice_no || "-"}</p>
          <p className="text-[12px] text-ink-secondary flex items-center gap-2 mb-2">
            <i className="fa fa-calendar text-[11px] text-[#718039]" />
            <span>{detail.vendor_invoice_date || "-"}</span>
          </p>
          <div className="flex items-center gap-4 text-[12px] text-ink-secondary">
            <span className="inline-flex items-center gap-2">Invoice Attach <AttachmentIconLink href={resolveAttachmentUrl(detail.invoice_attach_url)} label="Invoice Attach" /></span>
            <span className="inline-flex items-center gap-2">PO Attach <AttachmentIconLink href={resolveAttachmentUrl(detail.po_attach_url)} label="PO Attach" /></span>
          </div>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-3">Vendor Bank Details</p>
        {[
          ["Bank Name", detail.bank_name],
          ["Branch", detail.branch],
          ["Account No", detail.account_no],
          ["IFSC Code", detail.ifsc_code],
          ["Account Holder", detail.account_holder],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start gap-2 text-[12px] mb-1.5">
            <span className="w-28 shrink-0 text-ink-secondary">{label}</span>
            <span className="text-ink-secondary">:</span>
            <span className="font-medium text-[#5a6a20]">{value || "-"}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-[12px] mb-1.5">
          <span className="w-28 shrink-0 text-ink-secondary">PAN Copy</span>
          <span className="text-ink-secondary">:</span>
          <AttachmentIconLink href={resolveAttachmentUrl(detail.pan_copy_url, "vendor_creation", "media")} label="PAN Copy" />
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="w-28 shrink-0 text-ink-secondary">Bank Proof</span>
          <span className="text-ink-secondary">:</span>
          <AttachmentIconLink href={resolveAttachmentUrl(detail.bank_proof_url, "vendor_creation", "media")} label="Bank Proof" />
        </div>
      </div>
    </div>
  );
}
function ApprovalTable({ approvals }: { approvals: VendorBillApprovalItem[] }) {
  if (!approvals.length) return null;
  const approval = approvals[0];
  const steps = [
    { step: 1, label: "Bill Created", by: approval.bill_created_by, at: approval.bill_created_at, status: approval.bill_created_status },
    { step: 2, label: "Operation Team", by: approval.operation_by, at: approval.operation_at, status: approval.operation_status },
    { step: 3, label: "Account Entry", by: approval.account_entry_by, at: approval.account_entry_at, status: approval.account_entry_status },
    { step: 4, label: "Accounts Approval", by: approval.accounts_approval_by, at: approval.accounts_approval_at, status: approval.accounts_approval_status },
    { step: 5, label: "Management", by: approval.management_by, at: approval.management_at, status: approval.management_status },
    { step: 6, label: "Payment", by: approval.payment_ref, at: approval.payment_date, status: approval.payment_status, extra: approval.payment_amount },
  ];
  return <ApprovalStepsCard steps={steps} />;
}
function LineItemTable({ items, additionalCharges = 0 }: { items: VendorBillCreatedLineItem[]; additionalCharges?: number }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof VendorBillCreatedLineItem | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const handleSort = (key: keyof VendorBillCreatedLineItem) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else setSortDir("asc");
    } else { setSortKey(key); setSortDir("asc"); }
  };
  const sortIcon = (key: keyof VendorBillCreatedLineItem) => {
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
  const billAdditionalAmount = Number(additionalCharges || 0);
  const grandTotalAmount = Number((totals.totalAmountTotal + billAdditionalAmount).toFixed(2));
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
      <div className="overflow-x-auto border border-line rounded-lg">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-surface-2">
            <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">S No.</th>
            {(["dc_no", "invoice_no", "po_no"] as (keyof VendorBillCreatedLineItem)[]).map((key, i) => (
              <th key={key} onClick={() => handleSort(key)} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap cursor-pointer select-none hover:bg-brand-50">
                {["DC No / Date", "Invoice No / Date", "PO No / Date"][i]}{sortIcon(key)}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">Consignee Address</th>
            {(["unit_price", "basic_amount", "gst", "gst_amount", "total_amount"] as (keyof VendorBillCreatedLineItem)[]).map((key, i) => (
              <th key={key} onClick={() => handleSort(key)} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap cursor-pointer select-none hover:bg-brand-50">
                {["Unit Price", "Basic amount", "GST", "GST Amount", "Total Amount"][i]}{sortIcon(key)}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">Additional Amount</th>
            <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">Grand Total</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-3 py-8 text-center text-ink-muted border border-line">{search ? "No matching items" : "No line items available"}</td>
            </tr>
          ) : (
            <>
              {visibleItems.map((item) => (
                <tr key={`${item.s_no}-${item.dc_no}`} className="hover:bg-brand-50/30 border-b border-line/50">
                  <td className="px-3 py-2 text-center border-x border-line/50">{item.s_no}</td>
                  <td className="px-3 py-2 border-x border-line/50"><div className="font-semibold text-ink">{item.dc_no || "-"}</div><div className="text-[11px] text-ink-muted">{item.dc_date || "-"}</div></td>
                  <td className="px-3 py-2 border-x border-line/50"><div className="font-semibold text-ink">{item.invoice_no || "-"}</div><div className="text-[11px] text-ink-muted">{item.invoice_date || "-"}</div></td>
                  <td className="px-3 py-2 border-x border-line/50"><div className="font-semibold text-ink">{item.po_no || "-"}</div><div className="text-[11px] text-ink-muted">{item.po_date || "-"}</div></td>
                  <td className="px-3 py-2 border-x border-line/50 text-ink-secondary">{item.consignee_address || "-"}</td>
                  <td className="px-3 py-2 text-right border-x border-line/50">{formatMoney(item.unit_price)}</td>
                  <td className="px-3 py-2 text-right border-x border-line/50">{formatMoney(item.basic_amount)}</td>
                  <td className="px-3 py-2 text-center border-x border-line/50">{item.gst || "-"}</td>
                  <td className="px-3 py-2 text-right border-x border-line/50">{formatMoney(item.gst_amount)}</td>
                  <td className="px-3 py-2 text-right border-x border-line/50 font-semibold text-ink">{formatCurrency(item.total_amount)}</td>
                  <td className="px-3 py-2 text-center border-x border-line/50 text-ink-secondary">-</td>
                  <td className="px-3 py-2 text-right border-x border-line/50 font-semibold text-[#5a6a20]">{formatCurrency(item.total_amount)}</td>
                </tr>
              ))}
              <tr className="bg-[#f6f4e8] font-semibold text-ink">
                <td colSpan={5} className="border border-line-dark px-3 py-2.5 text-right uppercase tracking-wide text-[#5a6a20]">Grand Total</td>
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
export default function VendorBillCreationList() {
  const navigate = useNavigate();
  const previewDraftRestoreRef = useRef<VendorInvoicePreviewDraft | null>(readVendorInvoicePreviewDraft());
  const [tab, setTab] = useState<TabKey>("pending");
  const [paymentUnreadCount, setPaymentUnreadCount] = useState(0);
  const [paymentUnreadBills, setPaymentUnreadBills] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<VendorBillPendingRow | VendorBillCreatedRow>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [length, setLength] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloadSeed, setReloadSeed] = useState(0);
  const [modalKind, setModalKind] = useState<"pending" | "created" | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activePendingRow, setActivePendingRow] = useState<VendorBillPendingRow | null>(null);
  const [pendingSummary, setPendingSummary] = useState<VendorBillSummary | null>(null);
  const [pendingDetailRows, setPendingDetailRows] = useState<VendorBillPendingDetailRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createdDetail, setCreatedDetail] = useState<VendorBillCreatedDetail | null>(null);
  const [pendingTableSearch, setPendingTableSearch] = useState("");
  const [pendingSortKey, setPendingSortKey] = useState<keyof VendorBillPendingDetailRow | null>(null);
  const [pendingSortDir, setPendingSortDir] = useState<"asc" | "desc" | null>(null);
  const [pendingOverlayStep, setPendingOverlayStep] = useState<PendingOverlayStep>("none");
  const [invoiceForm, setInvoiceForm] = useState<VendorInvoiceFormState>(() => createVendorInvoiceFormState());
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchVendorBillCreationList({ tab, search, page, length });
        if (!active) return;
        setRows(Array.isArray(res?.data) ? res.data : []);
        setTotal(Number(res?.total ?? 0));
      } catch (error) {
        if (!active) return;
        setRows([]);
        setTotal(0);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load vendor bill records.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [tab, search, page, length, reloadSeed]);
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("otm_user") || "{}");
    const userId = user?.unique_id || user?.id || "";
    const userType = user?.user_type_unique_id || "";
    const allowed = PAYMENT_NOTIFICATION_USER_TYPES.includes(userType);
    if (!userId || !userType || !allowed) {
      setPaymentUnreadCount(0);
      setPaymentUnreadBills([]);
      return;
    }

    let active = true;
    const loadNotifications = async () => {
      try {
        const res = await fetchPaymentNotifications(userId, userType, 20);
        if (!active) return;
        setPaymentUnreadCount(Number(res.unread_count || 0));
        setPaymentUnreadBills((res.data || []).filter((item) => !Number(item.is_read)).map((item) => item.bill_no).filter(Boolean));
      } catch {
        if (!active) return;
        setPaymentUnreadCount(0);
        setPaymentUnreadBills([]);
      }
    };

    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  const pendingRows = rows as VendorBillPendingRow[];
  const createdRows = rows as VendorBillCreatedRow[];
  const rejectedRows = rows as VendorBillRejectedRow[];
  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
  const startRow = total === 0 ? 0 : length === -1 ? 1 : (page - 1) * length + 1;
  const endRow = total === 0 ? 0 : length === -1 ? total : Math.min(page * length, total);
  const handlePendingSort = (key: keyof VendorBillPendingDetailRow) => {
    if (pendingSortKey === key) {
      if (pendingSortDir === "asc") setPendingSortDir("desc");
      else if (pendingSortDir === "desc") { setPendingSortKey(null); setPendingSortDir(null); }
      else setPendingSortDir("asc");
    } else { setPendingSortKey(key); setPendingSortDir("asc"); }
  };
  const pendingSortIcon = (key: keyof VendorBillPendingDetailRow) => {
    const topFill = pendingSortKey === key && pendingSortDir === "asc" ? "#506018" : "#b8c295";
    const bottomFill = pendingSortKey === key && pendingSortDir === "desc" ? "#506018" : "#d9dec9";
    return (
      <span className="ml-1 inline-flex shrink-0" aria-hidden="true">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path d="M5 1L8.5 6H1.5L5 1Z" fill={topFill} />
          <path d="M5 15L1.5 10H8.5L5 15Z" fill={bottomFill} />
        </svg>
      </span>
    );
  };
  const filteredPendingRows = useMemo(() => {
    let result = [...pendingDetailRows];
    if (pendingTableSearch.trim()) {
      const q = pendingTableSearch.trim().toLowerCase();
      result = result.filter(row => Object.values(row as unknown as Record<string, unknown>).some(v => String(v ?? "").toLowerCase().includes(q)));
    }
    if (pendingSortKey && pendingSortDir) {
      result.sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[String(pendingSortKey)] ?? "";
        const bv = (b as unknown as Record<string, unknown>)[String(pendingSortKey)] ?? "";
        const aNum = Number(av), bNum = Number(bv);
        if (!isNaN(aNum) && !isNaN(bNum) && String(av).trim() && String(bv).trim()) return pendingSortDir === "asc" ? aNum - bNum : bNum - aNum;
        return pendingSortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [pendingDetailRows, pendingTableSearch, pendingSortKey, pendingSortDir]);
  const selectedPendingRows = useMemo(() => pendingDetailRows.filter((row) => selectedIds.includes(row.unique_id)), [pendingDetailRows, selectedIds]);
  const selectedTotal = selectedPendingRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const additionalCharges = parseAmountInput(invoiceForm.additionalCharges);
  const invoiceGrandTotal = Number((selectedTotal + additionalCharges).toFixed(2));
  const selectedInvoiceFileName = selectedPendingRows.find((row) => row.invoice_file_org_name)?.invoice_file_org_name || "";
  const selectedPoFileName = selectedPendingRows.find((row) => row.po_file_org_name)?.po_file_org_name || "";
  const allSelected = pendingDetailRows.length > 0 && selectedIds.length === pendingDetailRows.length;
  const pendingDetailTotals = calculateVendorBillLineItemTotals(filteredPendingRows, {
    unitPrice: (row) => row.rate,
    basicAmount: (row) => row.basic_amount,
    gst: (row) => row.gst,
    gstAmount: (row) => row.gst_amount,
    totalAmount: (row) => row.total_amount,
  });
  const exportRows = useMemo(() => rows, [rows]);
  const createdBillRaisedBy = createdDetail?.summary?.bill_created_by || createdDetail?.approvals?.[0]?.bill_created_by || "-";
  const createdBillRaisedDateRaw = createdDetail?.summary?.bill_created_date || createdDetail?.approvals?.[0]?.bill_created_at || "";
  const createdBillRaisedDate = createdBillRaisedDateRaw ? createdBillRaisedDateRaw.split(" ")[0] : "-";
  const createdDetailAdditionalCharges = Number(createdDetail?.additional_charges || 0);
  const createdDetailGrandTotal = createdDetail ? getVendorBillGrandTotal(createdDetail) : 0;
  const closeModal = () => {
    setModalKind(null);
    setModalLoading(false);
    setSubmitting(false);
    setActivePendingRow(null);
    setPendingSummary(null);
    setPendingDetailRows([]);
    setSelectedIds([]);
    setCreatedDetail(null);
    setPendingTableSearch("");
    setPendingSortKey(null);
    setPendingSortDir(null);
    setPendingOverlayStep("none");
    clearVendorInvoicePreviewDraft();
    setInvoiceForm(createVendorInvoiceFormState());
  };
  const openPendingModal = async (row: VendorBillPendingRow, restoreDraft: VendorInvoicePreviewDraft | null = null) => {
    setModalKind("pending");
    setModalLoading(true);
    setActivePendingRow(row);
    setPendingSummary(null);
    setPendingDetailRows([]);
    setSelectedIds([]);
    setCreatedDetail(null);
    setPendingOverlayStep("none");
    setInvoiceForm(createVendorInvoiceFormState());
    try {
      const res = await fetchVendorBillPendingDetail(row.vendor_id);
      const nextRows = Array.isArray(res?.rows) ? res.rows : [];
      const restoredSelectedIds = restoreDraft
        ? restoreDraft.selectedIds.filter((id) => nextRows.some((item) => item.unique_id === id))
        : [];
      setPendingSummary(res?.summary ?? null);
      setPendingDetailRows(nextRows);
      setSelectedIds(restoredSelectedIds);
      setPendingOverlayStep(restoreDraft?.fromInvoiceStep ? "invoice" : "none");
      setInvoiceForm(
        createVendorInvoiceFormState({
          generatedVendorInvoiceId: restoreDraft?.generatedVendorInvoiceId || res?.generated_vendor_invoice_id || "",
          userInvoiceId: restoreDraft?.userInvoiceId || res?.user_vendor_invoice_id || "",
          invoiceIssueDate: toDateInputValue(restoreDraft?.invoiceIssueDate || res?.invoice_issue_date),
          additionalCharges: restoreDraft?.additionalCharges ?? "0",
        }),
      );
    } catch (error) {
      closeModal();
      await showErrorAlert(error instanceof Error ? error.message : "Failed to load pending details.");
    } finally {
      setModalLoading(false);
    }
  };
  useEffect(() => {
    if (tab !== "pending" || loading || modalKind) return;
    const draft = previewDraftRestoreRef.current;
    if (!draft) return;
    const fallbackRow: VendorBillPendingRow = {
      s_no: 0,
      vendor_id: draft.vendorId,
      vendor_name: draft.vendorName,
      vendor_code: "",
      contact_no: "",
      address: "",
      dc_count: 0,
      total_amount: 0,
      status: "",
      reject_reason: "",
      rejected_by: "",
    };
    const row = pendingRows.find((item) => item.vendor_id === draft.vendorId) || fallbackRow;
    previewDraftRestoreRef.current = null;
    clearVendorInvoicePreviewDraft();
    void openPendingModal(row, draft);
  }, [loading, modalKind, pendingRows, tab]);
  const openCreatedModal = async (row: VendorBillCreatedRow) => {
    setModalKind("created");
    setModalLoading(true);
    setCreatedDetail(null);
    setActivePendingRow(null);
    setPendingSummary(null);
    setPendingDetailRows([]);
    setSelectedIds([]);
    try {
      const res = await fetchVendorCreatedBillDetail(row.bill_no);
      setCreatedDetail(res ?? null);
    } catch (error) {
      closeModal();
      await showErrorAlert(error instanceof Error ? error.message : "Failed to load bill details.");
    } finally {
      setModalLoading(false);
    }
  };
  const handleSelectRow = (uniqueId: string) => {
    setSelectedIds((current) => (current.includes(uniqueId) ? current.filter((id) => id !== uniqueId) : [...current, uniqueId]));
  };
  const handleSelectAll = () => {
    setSelectedIds(allSelected ? [] : pendingDetailRows.map((row) => row.unique_id));
  };
  const handleInvoiceTextChange = (
    field: "generatedVendorInvoiceId" | "userInvoiceId" | "invoiceIssueDate" | "additionalCharges",
    value: string,
  ) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }));
  };
  const handleInvoiceFileChange = (field: "invoiceFile" | "poFile", file: File | null) => {
    setInvoiceForm((current) => ({ ...current, [field]: file }));
  };
  const handleOpenPendingAvailability = async () => {
    if (!activePendingRow || !pendingSummary) return;
    if (selectedIds.length === 0) {
      await showWarningAlert("Please select at least one DC row.");
      return;
    }
    if (!pendingSummary.pan_attach_file_name || !pendingSummary.bank_proof) {
      await showWarningAlert("Vendor PAN copy and bank proof are required before bill creation.");
      return;
    }
    setPendingOverlayStep("availability");
  };
  const openVendorInvoicePreviewPage = (fromInvoiceStep = false) => {
    if (!activePendingRow || selectedPendingRows.length === 0) {
      void showWarningAlert("Please select at least one DC row.");
      return;
    }
    const draft: VendorInvoicePreviewDraft = {
      vendorId: activePendingRow.vendor_id,
      vendorName: pendingSummary?.company_name || activePendingRow.vendor_name || "",
      selectedIds: selectedPendingRows.map((row) => row.unique_id),
      generatedVendorInvoiceId: invoiceForm.generatedVendorInvoiceId,
      userInvoiceId: invoiceForm.userInvoiceId,
      invoiceIssueDate: invoiceForm.invoiceIssueDate,
      additionalCharges: invoiceForm.additionalCharges,
      fromInvoiceStep,
    };
    writeVendorInvoicePreviewDraft(draft);
    const params = new URLSearchParams({
      vendor_id: draft.vendorId,
      selected_ids: draft.selectedIds.join(","),
      generated_vendor_invoice_id: draft.generatedVendorInvoiceId.trim(),
      invoice_issue_date: draft.invoiceIssueDate || getTodayInputValue(),
      additional_charges: draft.additionalCharges || "0",
    });
    navigate(`/vendor/bill-creation/invoice-preview?${params.toString()}`);
  };
  const handleOpenVendorInvoicePreview = () => {
    openVendorInvoicePreviewPage(true);
  };
  const handlePendingInvoiceChoice = (isAvailable: boolean) => {
    if (!isAvailable) {
      openVendorInvoicePreviewPage(false);
      return;
    }
    setPendingOverlayStep("invoice");
  };
  const handleSubmitPending = async () => {
    if (!activePendingRow || !pendingSummary) return;
    if (selectedPendingRows.length === 0) {
      await showWarningAlert("Please select at least one DC row.");
      return;
    }
    if (!invoiceForm.generatedVendorInvoiceId.trim()) {
      await showWarningAlert("Generated vendor invoice number is missing.");
      return;
    }
    if (!invoiceForm.invoiceIssueDate) {
      await showWarningAlert("Vendor invoice issue date is required.");
      return;
    }
    if (!invoiceForm.invoiceFile && !selectedPendingRows.some((row) => row.invoice_file)) {
      await showWarningAlert("Please upload the vendor invoice copy PDF.");
      return;
    }
    if (!invoiceForm.poFile && !selectedPendingRows.some((row) => row.po_file)) {
      await showWarningAlert("Please upload the vendor PO copy PDF.");
      return;
    }
    const payload = new FormData();
    payload.append("vendor_id", activePendingRow.vendor_id);
    payload.append("vendor_name", pendingSummary.company_name || activePendingRow.vendor_name || "");
    payload.append("selected_ids", selectedIds.join(","));
    payload.append("generated_vendor_invoice_id", invoiceForm.generatedVendorInvoiceId.trim());
    payload.append("user_vendor_invoice_id", invoiceForm.userInvoiceId.trim());
    payload.append("invoice_issue_date", invoiceForm.invoiceIssueDate);
    payload.append("additional_charges", String(additionalCharges));
    if (invoiceForm.invoiceFile) payload.append("invoice_file", invoiceForm.invoiceFile);
    if (invoiceForm.poFile) payload.append("po_file", invoiceForm.poFile);
    setSubmitting(true);
    try {
      const res = await createVendorBill(payload);
      if (!res?.status) throw new Error(res?.message || "Failed to create vendor bill.");
      await showSuccessAlert(res?.message || "Vendor bill created successfully.");
      clearVendorInvoicePreviewDraft();
      closeModal();
      setReloadSeed((value) => value + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to create vendor bill.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
      <PageTopbar title="Vendor Bill Creation" breadcrumbs={["Vendor Payment", "Vendor Bill Creation"]} />
      <VendorPaymentPageIntro
        title="Vendor Bill Creation"
        showWorkspaceLabel={false}
        metrics={[
          { label: "Active Tab", value: tab === "pending" ? "Bill Pending" : tab === "created" ? "Bill Generation" : "Rejected Bills" },
          { label: "Visible Rows", value: rows.length },
          { label: "Payment Alerts", value: paymentUnreadCount },
        ]}
      />
      <div className="mt-4 overflow-visible rounded-[30px] border border-[#e2e7d0] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
        <PageTabs
          items={[
            { value: "pending", label: "Bill Pending" },
            { value: "created", label: paymentUnreadCount > 0 ? `Bill Generation (${paymentUnreadCount > 99 ? "99+" : paymentUnreadCount})` : "Bill Generation" },
            { value: "rejected", label: "Rejected Bills" },
          ]}
          value={tab}
          onChange={(value) => {
            setRows([]);
            setTotal(0);
            setLoading(true);
            setTab(value);
            setPage(1);
          }}
        />
        <div className="p-6">
          <TableToolbar
            length={length}
            onLengthChange={(value) => { setLength(value); setPage(1); }}
            search={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            exportConfig={{
              data: exportRows,
              headers: tab === "pending"
                ? ["S.No", "Vendor Details", "DC Count", "Value", "Status", "Bill Reject Reason", "Bill Rejected By"]
                : tab === "rejected"
                  ? ["S.No", "Bill Date / Bill No", "Vendor Name", "DC Count", "Bill Value", "Bill Created By", "Rejected Stage", "Rejected By", "Reject Reason"]
                  : ["S.No", "Bill Date / Bill No", "Invoice No / Invoice Date", "Vendor Details", "DC Count", "Bill Value"],
              rowMapper: (row) => tab === "pending"
                ? [
                    (row as VendorBillPendingRow).s_no,
                    `${(row as VendorBillPendingRow).vendor_name} | ${(row as VendorBillPendingRow).vendor_code} | ${(row as VendorBillPendingRow).address} | ${(row as VendorBillPendingRow).contact_no}`,
                    (row as VendorBillPendingRow).dc_count,
                    formatMoney((row as VendorBillPendingRow).total_amount),
                    (row as VendorBillPendingRow).status,
                    (row as VendorBillPendingRow).reject_reason,
                    (row as VendorBillPendingRow).rejected_by,
                  ]
                : tab === "rejected"
                  ? [
                      (row as VendorBillRejectedRow).s_no,
                      `${(row as VendorBillRejectedRow).bill_date} | ${(row as VendorBillRejectedRow).bill_no}`,
                      (row as VendorBillRejectedRow).vendor_name,
                      (row as VendorBillRejectedRow).dc_count,
                      formatMoney((row as VendorBillRejectedRow).total_amount),
                      (row as VendorBillRejectedRow).vendor_bill_created_by,
                      (row as VendorBillRejectedRow).rejected_stage,
                      (row as VendorBillRejectedRow).rejected_by,
                      (row as VendorBillRejectedRow).reject_reason,
                    ]
                  : [
                      (row as VendorBillCreatedRow).s_no,
                      `${(row as VendorBillCreatedRow).bill_date} | ${(row as VendorBillCreatedRow).bill_no}`,
                      `${(row as VendorBillCreatedRow).vendor_invoice_id} | ${(row as VendorBillCreatedRow).vendor_invoice_date}`,
                      `${(row as VendorBillCreatedRow).vendor_name} | ${(row as VendorBillCreatedRow).vendor_details?.address || ""} | ${(row as VendorBillCreatedRow).vendor_details?.contact_no || ""}`,
                      (row as VendorBillCreatedRow).dc_count,
                      formatMoney(getVendorBillGrandTotal(row as VendorBillCreatedRow)),
                    ],
              filename: tab === "pending" ? "vendor_bill_pending" : tab === "rejected" ? "vendor_bill_rejected" : "vendor_bill_generation",
              printTitle: "Vendor Bill Creation",
            }}
          />
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                {tab === "pending" ? (
                  <tr className="bg-surface-2">
                    {["S.No", "Vendor Details", "DC Count", "Value", "Status", "Bill Reject Reason", "Bill Rejected By", "Action"].map((header) => (
                      <th key={header} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                ) : tab === "rejected" ? (
                  <tr className="bg-surface-2">
                    {["S.No", "Bill Date / Bill No", "Vendor Name", "DC Count", "Bill Value", "Bill Created By", "Rejected Stage", "Rejected By", "Reject Reason"].map((header) => (
                      <th key={header} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                ) : (
                  <tr className="bg-surface-2">
                    {["S.No", "Bill Date / Bill No", "Invoice No / Invoice Date", "Vendor Details", "DC Count", "Bill Value", "Action"].map((header) => (
                      <th key={header} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={tab === "pending" ? 8 : tab === "rejected" ? 9 : 7} className="px-3 py-10 text-center text-ink-muted border border-line">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={tab === "pending" ? 8 : tab === "rejected" ? 9 : 7} className="px-3 py-10 text-center text-ink-muted border border-line">No data available in table</td></tr>
                ) : tab === "pending" ? (
                  pendingRows.map((row) => (
                    <tr key={`${row.vendor_id}-${row.s_no}`} className="hover:bg-brand-50/40 border-b border-line/50">
                      <td className="px-3 py-2.5 text-center border-x border-line/50">{row.s_no}</td>
                      <td className="px-3 py-2.5 border-x border-line/50 min-w-[360px]"><div className="font-bold text-ink text-[13px]">{row.vendor_name || "-"}</div><div className="text-[12px] font-semibold text-[#5a6a20]">{row.vendor_code || "-"}</div><div className="text-[11px] text-ink-secondary">{row.address || "-"}</div><div className="text-[11px] text-ink-secondary">Ph.No. {row.contact_no || "-"}</div></td>
                      <td className="px-3 py-2.5 text-center border-x border-line/50">{row.dc_count}</td>
                      <td className="px-3 py-2.5 text-right font-semibold border-x border-line/50">{formatMoney(row.total_amount)}</td>
                      <td className={`px-3 py-2.5 text-center font-semibold border-x border-line/50 ${statusClass(row.status)}`}>{row.status || "-"}</td>
                      <td className="px-3 py-2.5 border-x border-line/50 text-ink-secondary">{row.reject_reason || "-"}</td>
                      <td className="px-3 py-2.5 border-x border-line/50 text-ink-secondary">{row.rejected_by || "-"}</td>
                      <td className="px-3 py-2.5 text-center border-x border-line/50"><button onClick={() => void openPendingModal(row)} className="w-8 h-8 inline-flex items-center justify-center rounded bg-white border border-line-dark text-ink hover:bg-brand-700 hover:text-white transition-colors cursor-pointer"><i className="fa fa-pen-to-square" /></button></td>
                    </tr>
                  ))
                ) : tab === "rejected" ? (
                  rejectedRows.map((row) => (
                    <tr key={`${row.bill_no}-${row.s_no}`} className="hover:bg-brand-50/40 border-b border-line/50">
                      <td className="px-3 py-2.5 text-center border-x border-line/50">{row.s_no}</td>
                      <td className="px-3 py-2.5 border-x border-line/50 min-w-[150px]"><div className="font-semibold text-ink">{row.bill_date || "-"}</div><div className="text-[11px] text-ink-secondary font-bold">{row.bill_no || "-"}</div></td>
                      <td className="px-3 py-2.5 border-x border-line/50 min-w-[240px]"><div className="font-bold text-ink text-[13px]">{row.vendor_name || "-"}</div></td>
                      <td className="px-3 py-2.5 text-center border-x border-line/50">{row.dc_count}</td>
                      <td className="px-3 py-2.5 text-right font-semibold border-x border-line/50">{formatMoney(row.total_amount)}</td>
                      <td className="px-3 py-2.5 border-x border-line/50 text-ink-secondary">{row.vendor_bill_created_by || "-"}</td>
                      <td className="px-3 py-2.5 text-center border-x border-line/50 font-semibold text-danger">{row.rejected_stage || "-"}</td>
                      <td className="px-3 py-2.5 border-x border-line/50 text-ink-secondary">{row.rejected_by || "-"}</td>
                      <td className="px-3 py-2.5 border-x border-line/50 text-ink-secondary">{row.reject_reason || "-"}</td>
                    </tr>
                  ))
                ) : (
                  createdRows.map((row) => (
                    <tr key={`${row.bill_no}-${row.s_no}`} className="hover:bg-brand-50/40 border-b border-line/50">
                      <td className="px-3 py-2.5 text-center border-x border-line/50">{row.s_no}</td>
                      <td className="px-3 py-2.5 border-x border-line/50 min-w-[150px]"><div className="font-semibold text-ink">{row.bill_date || "-"}</div><div className="text-[11px] text-ink-secondary font-bold">{row.bill_no || "-"}</div></td>
                      <td className="px-3 py-2.5 border-x border-line/50 min-w-[170px]"><div className="font-semibold text-ink">{row.vendor_invoice_id || "-"}</div><div className="text-[11px] text-ink-secondary font-bold">{row.vendor_invoice_date || "-"}</div></td>
                      <td className="px-3 py-2.5 border-x border-line/50 min-w-[320px]"><div className="font-bold text-ink text-[13px]">{row.vendor_name || row.vendor_details?.company_name || "-"}</div><div className="text-[11px] text-ink-secondary">{row.vendor_details?.address || "-"}</div><div className="text-[11px] text-ink-secondary">Ph.No. {row.vendor_details?.contact_no || "-"}</div></td>
                      <td className="px-3 py-2.5 text-center border-x border-line/50">{row.dc_count}</td>
                      <td className="px-3 py-2.5 text-right font-semibold border-x border-line/50">{formatMoney(getVendorBillGrandTotal(row))}</td>
                      <td className="px-3 py-2.5 text-center border-x border-line/50"><button onClick={() => void openCreatedModal(row)} className="w-8 h-8 inline-flex items-center justify-center rounded bg-white border border-line-dark text-ink hover:bg-brand-700 hover:text-white transition-colors cursor-pointer"><i className="fa fa-eye" /></button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap mt-3 text-[13px] text-ink-secondary">
            <div>Showing {startRow} to {endRow} of {total} entries</div>
            <div className="flex items-center gap-2">
              <button disabled={length === -1 || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="px-3 py-1.5 border border-line rounded bg-white disabled:opacity-50 cursor-pointer">Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={length === -1 || page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="px-3 py-1.5 border border-line rounded bg-white disabled:opacity-50 cursor-pointer">Next</button>
            </div>
          </div>
        </div>
      </div>
            {modalKind === "pending" ? (
        <ModalWrapper title="Vendor Payment Details" onClose={closeModal}>
          {modalLoading || !pendingSummary ? (
            <div className="py-10 text-center text-ink-muted">Loading details...</div>
          ) : (
            <>
              <div className="space-y-6">
                <PendingHeader summary={pendingSummary} />
                <div className="space-y-2">
                  <div className="flex items-center justify-end gap-2">
                    <div className="relative">
                      <i className="fa fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted pointer-events-none" />
                      <input name="pendingtablesearch" type="text" value={pendingTableSearch} onChange={e => setPendingTableSearch(e.target.value)} placeholder="Search items..." className="pl-7 pr-7 py-1.5 text-[12px] border border-line rounded-lg bg-white focus:outline-none focus:border-brand-500 w-44" />
                      {pendingTableSearch && <button onClick={() => setPendingTableSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[11px] cursor-pointer"><i className="fa fa-xmark" /></button>}
                    </div>
                    {pendingTableSearch && <span className="text-[11px] text-ink-muted">{filteredPendingRows.length}/{pendingDetailRows.length} results</span>}
                  </div>
                  <div className="overflow-x-auto border border-line rounded-lg">
                    <table className="w-full text-[12px] border-collapse">
                      <thead>
                        <tr className="bg-surface-2">
                          <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input name="allselected" type="checkbox" checked={allSelected} onChange={handleSelectAll} className="accent-brand-700 w-4 h-4" />
                              <span>All</span>
                            </label>
                          </th>
                          <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">S.No.</th>
                          {(["po_num", "invoice_no", "dc_number"] as (keyof VendorBillPendingDetailRow)[]).map((key, i) => (
                            <th key={key} onClick={() => handlePendingSort(key)} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap cursor-pointer select-none hover:bg-brand-50">
                              {["PO No / Date", "Invoice No / Date", "DC No / Date"][i]}{pendingSortIcon(key)}
                            </th>
                          ))}
                          <th onClick={() => handlePendingSort("invoice_qty")} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap cursor-pointer select-none hover:bg-brand-50">Invoice Qty{pendingSortIcon("invoice_qty")}</th>
                          <th className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap">Consignee Address</th>
                          <th onClick={() => handlePendingSort("customer_name")} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap cursor-pointer select-none hover:bg-brand-50">Customer Name{pendingSortIcon("customer_name")}</th>
                          {(["rate", "basic_amount", "gst", "gst_amount", "total_amount"] as (keyof VendorBillPendingDetailRow)[]).map((key, i) => (
                            <th key={key} onClick={() => handlePendingSort(key)} className="px-3 py-2.5 text-center font-bold text-ink border border-line-dark whitespace-nowrap cursor-pointer select-none hover:bg-brand-50">
                              {["Unit Price", "Basic amount", "GST", "GST Amount", "Total Amount"][i]}{pendingSortIcon(key)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPendingRows.length === 0 ? (
                          <tr><td colSpan={13} className="px-3 py-10 text-center text-ink-muted border border-line">{pendingTableSearch ? "No matching items" : "No detail rows found"}</td></tr>
                        ) : (
                          <>
                            {filteredPendingRows.map((item) => (
                              <tr key={item.unique_id} className="hover:bg-brand-50/30 border-b border-line/50">
                                <td className="px-3 py-2 text-center border-x border-line/50"><input name="vendorbillcreationlist_input_1351" type="checkbox" checked={selectedIds.includes(item.unique_id)} onChange={() => handleSelectRow(item.unique_id)} className="accent-brand-700 w-4 h-4" /></td>
                                <td className="px-3 py-2 text-center border-x border-line/50">{item.s_no}</td>
                                <td className="px-3 py-2 border-x border-line/50"><div className="font-semibold text-ink">{item.po_num || "-"}</div><div className="text-[11px] text-ink-muted">{item.po_date || "-"}</div></td>
                                <td className="px-3 py-2 border-x border-line/50"><div className="font-semibold text-ink">{item.invoice_no || "-"}</div><div className="text-[11px] text-ink-muted">{item.invoice_date || "-"}</div></td>
                                <td className="px-3 py-2 border-x border-line/50"><div className="font-semibold text-ink">{item.dc_number || "-"}</div><div className="text-[11px] text-ink-muted">{item.dc_date || "-"}</div></td>
                                <td className="px-3 py-2 text-center border-x border-line/50">{item.invoice_qty}</td>
                                <td className="px-3 py-2 border-x border-line/50 text-ink-secondary min-w-[220px]">{item.consignee_address || "-"}</td>
                                <td className="px-3 py-2 border-x border-line/50 text-ink min-w-[180px]">{item.customer_name || "-"}</td>
                                <td className="px-3 py-2 text-right border-x border-line/50">{formatMoney(item.rate)}</td>
                                <td className="px-3 py-2 text-right border-x border-line/50">{formatMoney(item.basic_amount)}</td>
                                <td className="px-3 py-2 text-center border-x border-line/50">{item.gst} %</td>
                                <td className="px-3 py-2 text-right border-x border-line/50">{formatMoney(item.gst_amount)}</td>
                                <td className="px-3 py-2 text-right border-x border-line/50 font-semibold text-ink">{formatCurrency(item.total_amount)}</td>
                              </tr>
                            ))}
                            <tr className="bg-[#f6f4e8] font-semibold text-ink">
                              <td colSpan={8} className="border border-line-dark px-3 py-2.5 text-right uppercase tracking-wide text-[#5a6a20]">Grand Total</td>
                              <td className="border border-line-dark px-3 py-2.5 text-right">{formatMoney(pendingDetailTotals.unitPriceTotal)}</td>
                              <td className="border border-line-dark px-3 py-2.5 text-right">{formatMoney(pendingDetailTotals.basicAmountTotal)}</td>
                              <td className="border border-line-dark px-3 py-2.5 text-center">{pendingDetailTotals.gstLabel}</td>
                              <td className="border border-line-dark px-3 py-2.5 text-right">{formatMoney(pendingDetailTotals.gstAmountTotal)}</td>
                              <td className="border border-line-dark px-3 py-2.5 text-right">{formatCurrency(pendingDetailTotals.totalAmountTotal)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-[12px] text-ink-secondary">Selected DC Count: <span className="font-semibold text-ink">{selectedIds.length}</span></div>
                  <div className="text-[13px] font-semibold text-ink">Selected Amount: <span className="text-[#5a6a20]">{formatCurrency(selectedTotal)}</span></div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={closeModal} className="px-5 py-2 rounded text-[13px] font-semibold bg-[#f06f4f] text-white hover:bg-[#df5f40] transition-colors cursor-pointer">Close</button>
                  <button onClick={() => void handleOpenPendingAvailability()} disabled={submitting || selectedIds.length === 0} className="px-5 py-2 rounded text-[13px] font-semibold bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50 transition-colors cursor-pointer">Submit</button>
                </div>
              </div>
              {pendingOverlayStep === "availability" ? (
                <DialogCard title="Vendor Invoice Confirmation" onClose={() => setPendingOverlayStep("none")} maxWidthClass="max-w-xl">
                  <div className="space-y-6">
                    <p className="text-[16px] text-ink">Is vendor invoice available?</p>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handlePendingInvoiceChoice(false)} className="px-5 py-2 rounded text-[13px] font-semibold bg-[#3d72d9] text-white hover:bg-[#2f60bf] transition-colors cursor-pointer">No</button>
                      <button onClick={() => handlePendingInvoiceChoice(true)} className="px-5 py-2 rounded text-[13px] font-semibold bg-brand-700 text-white hover:bg-brand-800 transition-colors cursor-pointer">Yes</button>
                    </div>
                  </div>
                </DialogCard>
              ) : null}
              {pendingOverlayStep === "invoice" ? (
                <VendorInvoiceConfirmationDialog
                  onClose={() => setPendingOverlayStep("none")}
                  onPrint={handleOpenVendorInvoicePreview}
                  generatedVendorInvoiceId={invoiceForm.generatedVendorInvoiceId}
                  userInvoiceId={invoiceForm.userInvoiceId}
                  onUserInvoiceIdChange={(value) => handleInvoiceTextChange("userInvoiceId", value)}
                  invoiceIssueDate={formatDateLabel(invoiceForm.invoiceIssueDate)}
                  additionalCharges={invoiceForm.additionalCharges}
                  onAdditionalChargesChange={(value) => handleInvoiceTextChange("additionalCharges", value)}
                  totalInvoiceAmount={invoiceGrandTotal}
                  companyName={pendingSummary.company_name || activePendingRow?.vendor_name || "-"}
                  invoiceFile={invoiceForm.invoiceFile}
                  existingInvoiceFileName={selectedInvoiceFileName}
                  onInvoiceFileChange={(file) => handleInvoiceFileChange("invoiceFile", file)}
                  poFile={invoiceForm.poFile}
                  existingPoFileName={selectedPoFileName}
                  onPoFileChange={(file) => handleInvoiceFileChange("poFile", file)}
                  onSubmit={() => { void handleSubmitPending(); }}
                  submitting={submitting}
                />
              ) : null}
            </>
          )}
        </ModalWrapper>
      ) : null}
      {modalKind === "created" ? (
        <ModalWrapper title="Vendor Completed Payment Details" onClose={closeModal}>
          {modalLoading || !createdDetail ? (
            <div className="py-10 text-center text-ink-muted">Loading details...</div>
          ) : (
            <div className="space-y-6">
              <CompletedHeader detail={createdDetail} />
              <ApprovalTable approvals={createdDetail.approvals || []} />
              <LineItemTable additionalCharges={createdDetailAdditionalCharges} items={createdDetail.dc_items?.length ? createdDetail.dc_items : (createdDetail.rows || []).map((row) => ({
                s_no: row.s_no,
                dc_no: row.dc_number,
                dc_date: row.dc_date,
                invoice_no: row.invoice_no,
                invoice_date: row.invoice_date,
                po_no: row.po_num,
                po_date: row.po_date,
                consignee_address: row.consignee_address || "-",
                invoice_qty: row.invoice_qty,
                unit_price: row.rate,
                basic_amount: row.basic_amount,
                gst: `${row.gst} %`,
                gst_amount: row.gst_amount,
                total_amount: row.total_amount,
              }))} />
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="space-y-2 text-[13px] text-ink">
                  <div className="flex items-center gap-3">
                    {/* <span className="min-w-[120px] font-semibold text-ink-secondary">Bill Raised By:</span> */}
                    {/* <span className="font-bold text-[#5a6a20]">{createdBillRaisedBy || "-"}</span> */}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* <span className="min-w-[120px] font-semibold text-ink-secondary">Bill Raised Date:</span> */}
                    {/* <span className="font-bold text-[#5a6a20]">{createdBillRaisedDate}</span> */}
                  </div>
                </div>
                <div className="space-y-1 text-[13px] text-right text-ink">
                  <div>Base Amount: <span className="ml-2 font-semibold text-ink">{formatCurrency(createdDetail.total_amount || 0)}</span></div>
                  <div>Additional Charges: <span className="ml-2 font-semibold text-ink">{formatCurrency(createdDetailAdditionalCharges)}</span></div>
                  <div className="text-[14px] font-semibold text-ink">Total Amount: <span className="ml-2 text-[#5a6a20]">{formatCurrency(createdDetailGrandTotal)}</span></div>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={closeModal} className="px-5 py-2 rounded text-[13px] font-semibold bg-[#f06f4f] text-white hover:bg-[#df5f40] transition-colors cursor-pointer">Close</button>
              </div>
            </div>
          )}
        </ModalWrapper>
      ) : null}
    </div>
  );
}
