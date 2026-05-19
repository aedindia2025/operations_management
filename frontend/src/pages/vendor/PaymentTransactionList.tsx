import { useEffect, useMemo, useRef, useState } from "react";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchPaymentTransactionDetail,
  fetchPaymentTransactionList,
  type PaymentTransactionDetail,
  type PaymentTransactionItem,
  type PaymentTransactionRow,
  type PaymentTransactionTab,
} from "../../api/paymentTransactionApi";
import { showErrorAlert } from "../../utils/alerts";
import { calculateVendorBillLineItemTotals } from "../../utils/vendorBillLineItemTotals";
import { useNavigate } from "react-router-dom";
import ApprovalStepsCard from "../../components/common/ApprovalStepsCard";
import PageTabs from "../../components/common/PageTabs";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";

function amountText(value: number | string) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return String(value || "-");
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numericValue(value?: number | string | null) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function transactionLabel(value: number | string) {
  const normalized = String(value ?? "").trim();
  if (normalized === "1") return "Cash";
  if (normalized === "2") return "Bank";
  if (normalized === "3") return "UPI";
  return normalized || "-";
}

function numberToWords(amount: number) {
  if (!Number.isFinite(amount) || amount === 0) return "Zero Rupees and Zero Paise";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function toWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return `${ones[n]} `;
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""} `;
    if (n < 1000) return `${ones[Math.floor(n / 100)]} Hundred ${toWords(n % 100)}`;
    if (n < 100000) return `${toWords(Math.floor(n / 1000))}Thousand ${toWords(n % 1000)}`;
    if (n < 10000000) return `${toWords(Math.floor(n / 100000))}Lakh ${toWords(n % 100000)}`;
    return `${toWords(Math.floor(n / 10000000))}Crore ${toWords(n % 10000000)}`;
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const rupeesText = toWords(rupees).trim() || "Zero";
  const paiseText = paise > 0 ? `${toWords(paise).trim()} Paise` : "Zero Paise";
  return `${rupeesText} Rupees and ${paiseText}`;
}

function buildLegacyUploadUrl(folder: string, fileName?: string) {
  if (!fileName) return "";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}/otm_beta/uploads/${folder}/${fileName}`;
}

function AttachmentLink({ folder, fileName, label }: { folder: string; fileName?: string; label: string }) {
  if (!fileName) return <span className="text-ink-muted">-</span>;
  return (
    <a href={buildLegacyUploadUrl(folder, fileName)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 border border-red-300 rounded text-red-500 text-[11px] hover:bg-red-50">
      <i className="fa fa-file" />
      {label}
    </a>
  );
}

function ApprovedDetailContent({ detail, onClose }: { detail: PaymentTransactionDetail; onClose: () => void }) {
  return (
    <>
      <div className="border border-line rounded-xl bg-white shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h3 className="text-[15px] font-semibold uppercase text-[#878a99] mb-3">Vendor Details</h3>
            <p className="text-[16px] font-bold text-[#506018] leading-tight">{detail.vendor_summary.company_name || detail.summary.vendor_company_name || "-"}</p>
            <p className="text-[16px] font-bold text-[#506018] leading-tight mb-3">{detail.vendor_summary.name || detail.summary.vendor_name || "-"}</p>
            <p className="text-[13px] text-ink-secondary mb-1">{detail.vendor_summary.address || detail.summary.vendor_address || "-"}</p>
            <p className="text-[13px] text-ink-secondary mb-1">GST No: <span className="font-semibold text-ink">{detail.vendor_summary.gst_no || "-"}</span>, PAN No: <span className="font-semibold text-ink">{detail.vendor_summary.pan_no || "-"}</span></p>
            <p className="text-[13px] text-ink-secondary mb-1">{detail.vendor_summary.mail_id || "-"}</p>
            <p className="text-[13px] text-ink-secondary">{detail.vendor_summary.contact_no || detail.summary.vendor_contact || "-"}</p>
          </div>
          <div>
            <div className="mb-8">
              <h3 className="text-[15px] font-semibold uppercase text-[#878a99] mb-3">Vendor Bill Details</h3>
              <p className="text-[16px] font-bold text-[#506018] mb-2">{detail.summary.bill_no || "-"}</p>
              <p className="text-[13px] text-ink-secondary">{detail.summary.bill_date || "-"}</p>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold uppercase text-[#878a99] mb-3">Vendor Invoice Details</h3>
              <p className="text-[16px] font-bold text-[#506018] mb-2">{detail.summary.vendor_invoice_no || "-"}</p>
              <p className="text-[13px] text-ink-secondary mb-2">{detail.summary.vendor_invoice_date || "-"}</p>
              <p className="text-[13px] text-ink-secondary">Invoice Attach: <span className="inline-block align-middle ml-1"><AttachmentLink folder="vendorpayment" fileName={detail.summary.inv_verfiy_attach} label="View" /></span></p>
            </div>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold uppercase text-[#878a99] mb-3">Vendor Bank Details</h3>
            <p className="text-[16px] font-bold text-[#506018] mb-2">{detail.vendor_summary.bank_name || detail.summary.bank_name || "-"}</p>
            <p className="text-[13px] text-ink-secondary mb-1">{detail.vendor_summary.branch_name || detail.summary.branch_name || "-"}</p>
            <p className="text-[13px] text-ink-secondary mb-1">Account No: <span className="font-semibold text-ink">{detail.vendor_summary.account_no || detail.summary.account_no || "-"}</span></p>
            <p className="text-[13px] text-ink-secondary mb-1">IFSC Code: <span className="font-semibold text-ink">{detail.vendor_summary.ifsc_code || detail.summary.ifsc_code || "-"}</span></p>
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary mb-1"><span className="min-w-[110px]">Account Holder</span><span>:</span><span className="font-semibold text-ink">{detail.vendor_summary.acc_holder_name || "-"}</span></div>
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary mb-1"><span className="min-w-[110px]">PAN Copy</span><span>:</span><AttachmentLink folder="vendor_creation" fileName={detail.vendor_summary.pan_attach_file_name} label="View" /></div>
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary"><span className="min-w-[110px]">Bank Proof</span><span>:</span><AttachmentLink folder="vendor_creation" fileName={detail.vendor_summary.bank_proof} label="View" /></div>
            <div className="mt-8">
              <h3 className="text-[15px] font-semibold uppercase text-[#878a99] mb-3">Vendor Payment Details</h3>
              <p className="text-[16px] font-bold text-[#506018] mb-2">{transactionLabel(detail.summary.transaction_type)}</p>
              <p className="text-[13px] text-ink-secondary mb-1">{detail.summary.transaction_date || "-"}</p>
              <p className="text-[13px] text-ink-secondary mb-1">Transaction Id <span className="font-semibold text-ink ml-1">{detail.summary.transaction_id || "N/A"}</span></p>
              <p className="text-[13px] text-ink-secondary">Cash Receipt <span className="inline-block align-middle ml-1"><AttachmentLink folder="accounts_approval" fileName={detail.summary.cash_receipt_file_name} label="View" /></span></p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailModal({ tab, detail, loading, onClose }: { tab: PaymentTransactionTab; detail: PaymentTransactionDetail | null; loading: boolean; onClose: () => void }) {
  const [itemSearch, setItemSearch] = useState("");
  const [itemSortKey, setItemSortKey] = useState<keyof PaymentTransactionItem | null>(null);
  const [itemSortDir, setItemSortDir] = useState<"asc" | "desc" | null>(null);

  const handleItemSort = (key: keyof PaymentTransactionItem) => {
    if (itemSortKey === key) {
      if (itemSortDir === "asc") setItemSortDir("desc");
      else if (itemSortDir === "desc") { setItemSortKey(null); setItemSortDir(null); }
      else setItemSortDir("asc");
    } else { setItemSortKey(key); setItemSortDir("asc"); }
  };

  const itemSortIcon = (key: keyof PaymentTransactionItem) => {
    const topFill = itemSortKey === key && itemSortDir === "asc" ? "#506018" : "#b8c295";
    const bottomFill = itemSortKey === key && itemSortDir === "desc" ? "#506018" : "#d9dec9";
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
    const rawItems = detail?.items || [];
    let result = [...rawItems];
    if (itemSearch.trim()) {
      const q = itemSearch.trim().toLowerCase();
      result = result.filter(row => Object.values(row as Record<string, unknown>).some(v => String(v ?? "").toLowerCase().includes(q)));
    }
    if (itemSortKey && itemSortDir) {
      result.sort((a, b) => {
        const av = (a as Record<string, unknown>)[String(itemSortKey)] ?? "";
        const bv = (b as Record<string, unknown>)[String(itemSortKey)] ?? "";
        const aNum = Number(av), bNum = Number(bv);
        if (!isNaN(aNum) && !isNaN(bNum) && String(av).trim() && String(bv).trim()) return itemSortDir === "asc" ? aNum - bNum : bNum - aNum;
        return itemSortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [detail?.items, itemSearch, itemSortKey, itemSortDir]);

  const itemTotals = calculateVendorBillLineItemTotals(visibleItems, {
    unitPrice: (item) => item.rate,
    basicAmount: (item) => item.basic_amount,
    gst: (item) => item.gst,
    gstAmount: (item) => item.gst_amount,
    totalAmount: (item) => item.amount,
  });
  const additionalCharges = numericValue(detail?.summary.additional_charges);
  const explicitGrandTotal = detail?.summary.grand_total_amount;
  const hasExplicitGrandTotal = explicitGrandTotal !== undefined && explicitGrandTotal !== null && String(explicitGrandTotal).trim() !== "";
  const grandTotalAmount = hasExplicitGrandTotal
    ? numericValue(explicitGrandTotal)
    : Number((numericValue(detail?.summary.total_amount) + additionalCharges).toFixed(2));
  const billCreated = Boolean(detail?.summary.bill_date);
  const accountEntryCreated = Boolean(detail?.summary.account_entry_by || detail?.summary.account_entry_date);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-[92vw] rounded-xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="relative flex items-center justify-end px-6 py-4 border-b border-line shrink-0" style={{ background: tab === "approved" ? "linear-gradient(180deg, #e8ebbd 0%, #edf0cf 100%)" : "linear-gradient(135deg, #e8eed8 0%, #f5f8ec 100%)" }}>
          <h2 className={`absolute inset-x-0 text-center text-[15px] font-bold pointer-events-none ${tab === "approved" ? "text-[#506018]" : "text-ink"}`}>{tab === "approved" ? "Payment Approval" : "Payment Transaction Details"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#c0392b] text-white hover:bg-[#a93226] transition-colors text-[18px] leading-none">
            &times;
          </button>
        </div>
        <div className={`overflow-y-auto flex-1 p-6 ${tab === "approved" ? "bg-[#f8f8f5]" : ""}`}>
          {loading || !detail ? (
            <div className="text-sm text-ink-secondary">Loading payment details...</div>
          ) : (
            <>
              {tab === "approved" ? <ApprovedDetailContent detail={detail} onClose={onClose} /> : null}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {tab === "approved" ? null : (
                <div className="border border-line rounded-xl p-5 bg-[#fcfbf5]">
                  <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-3">Vendor Details</p>
                  <p className="text-[14px] font-bold text-ink leading-tight mb-1">{detail.vendor_summary.company_name || detail.summary.vendor_company_name || "-"}</p>
                  <p className="text-[13px] font-semibold text-[#3d5a20] mb-2">{detail.vendor_summary.name || detail.summary.vendor_name || "-"}</p>
                  <p className="text-[12px] text-ink-secondary mb-1">{detail.vendor_summary.address || detail.summary.vendor_address || "-"}</p>
                  <p className="text-[12px] text-ink-secondary mb-1">Phone: {detail.vendor_summary.contact_no || detail.summary.vendor_contact || "-"}</p>
                  <p className="text-[12px] text-ink-secondary mb-1">Email: {detail.vendor_summary.mail_id || "-"}</p>
                  <p className="text-[12px] text-ink-secondary mb-1">GST: {detail.vendor_summary.gst_no || "-"}</p>
                  <p className="text-[12px] text-ink-secondary">PAN: {detail.vendor_summary.pan_no || "-"}</p>
                </div>
                )}

                {tab === "approved" ? null : (
                <div className="border border-line rounded-xl p-5 bg-white">
                  <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-3">Bill & Invoice Details</p>
                  <div className="space-y-2 text-[12.5px]">
                    <div><span className="text-ink-secondary">Bill No:</span> <span className="font-semibold text-ink">{detail.summary.bill_no || "-"}</span></div>
                    <div><span className="text-ink-secondary">Bill Date:</span> <span className="font-semibold text-ink">{detail.summary.bill_date || "-"}</span></div>
                    <div><span className="text-ink-secondary">Vendor Invoice No:</span> <span className="font-semibold text-ink">{detail.summary.vendor_invoice_no || "-"}</span></div>
                    <div><span className="text-ink-secondary">Vendor Invoice Date:</span> <span className="font-semibold text-ink">{detail.summary.vendor_invoice_date || "-"}</span></div>
                    <div className="pt-1"><span className="text-ink-secondary mr-2">Invoice Attach:</span><AttachmentLink folder="vendorpayment" fileName={detail.summary.inv_verfiy_attach} label="View" /></div>
                  </div>
                </div>
                )}

                {tab === "approved" ? null : (
                <div className="border border-line rounded-xl p-5 bg-white">
                  <p className="text-[11px] font-bold text-ink-muted tracking-widest uppercase mb-3">{tab === "approved" ? "Transaction Details" : "Approval Details"}</p>
                  <div className="space-y-2 text-[12.5px]">
                    {tab === "approved" ? (
                      <>
                        <div><span className="text-ink-secondary">Transaction Type:</span> <span className="font-semibold text-ink">{transactionLabel(detail.summary.transaction_type)}</span></div>
                        <div><span className="text-ink-secondary">Transaction ID:</span> <span className="font-semibold text-ink">{detail.summary.transaction_id || "-"}</span></div>
                        <div><span className="text-ink-secondary">Transaction Date:</span> <span className="font-semibold text-ink">{detail.summary.transaction_date || "-"}</span></div>
                        <div><span className="text-ink-secondary mr-2">Cash Attach:</span><AttachmentLink folder="accounts_approval" fileName={detail.summary.cash_receipt_file_name} label="View" /></div>
                        <div><span className="text-ink-secondary">Approved By:</span> <span className="font-semibold text-ink">{detail.summary.accounts_approved_by || "-"}</span></div>
                        <div><span className="text-ink-secondary">Approved Date:</span> <span className="font-semibold text-ink">{detail.summary.accounts_approved_date || "-"}</span></div>
                      </>
                    ) : (
                      <>
                        <div><span className="text-ink-secondary">Vendor Approved By:</span> <span className="font-semibold text-ink">{detail.summary.vendor_bill_approval || "-"}</span></div>
                        <div><span className="text-ink-secondary">Vendor Approved Date:</span> <span className="font-semibold text-ink">{detail.summary.vendor_bill_approval_date || "-"}</span></div>
                        <div><span className="text-ink-secondary">Accounts Approved By:</span> <span className="font-semibold text-ink">{detail.summary.finance_approved_by || "-"}</span></div>
                        <div><span className="text-ink-secondary">Accounts Approved Date:</span> <span className="font-semibold text-ink">{detail.summary.finance_approved_date || "-"}</span></div>
                        <div><span className="text-ink-secondary">Management Approved By:</span> <span className="font-semibold text-ink">{detail.summary.management_approved_by || "-"}</span></div>
                        <div><span className="text-ink-secondary">Management Approved Date:</span> <span className="font-semibold text-ink">{detail.summary.management_approval_date || "-"}</span></div>
                      </>
                    )}
                  </div>
                </div>
                )}
              </div>

              <div className="mt-5 mb-5">
                <ApprovalStepsCard steps={[
                  { step: 1, label: "Bill Created", by: detail.summary.bill_created_by || undefined, at: detail.summary.bill_date, status: billCreated ? "Created" : "Pending" },
                  { step: 2, label: "Operation Team", by: detail.summary.vendor_bill_approval, at: detail.summary.vendor_bill_approval_date, status: detail.summary.vendor_bill_approval ? "Approved" : "Pending" },
                  { step: 3, label: "Account Entry", by: detail.summary.account_entry_by, at: detail.summary.account_entry_date, status: accountEntryCreated ? "Created" : "Pending" },
                  { step: 4, label: "Accounts Approval", by: detail.summary.finance_approved_by, at: detail.summary.finance_approved_date, status: detail.summary.finance_approved_by ? "Approved" : "Pending" },
                  { step: 5, label: "Management", by: detail.summary.management_approved_by, at: detail.summary.management_approval_date, status: (detail.summary.management_approved_by || detail.summary.management_approval_date) ? "Approved" : "Pending" },
                  { step: 6, label: "Payment", by: detail.summary.accounts_approved_by, at: detail.summary.accounts_approved_date, status: (detail.summary.accounts_approved_by || detail.summary.accounts_approved_date) ? "Approved" : "Pending" },
                ]} />
              </div>

              <div className="border border-line rounded-xl overflow-hidden mb-5 bg-white">
                <div className={`px-5 py-3 border-b border-line flex items-center justify-between gap-2 flex-wrap ${tab === "approved" ? "bg-white" : "bg-surface-2"}`}>
                  <h3 className={`text-[13px] font-semibold ${tab === "approved" ? "text-[#506018]" : "text-ink"}`}>Vendor Payment Table</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <i className="fa fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted pointer-events-none" />
                      <input name="itemsearch" type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items..." className="pl-7 pr-7 py-1 text-[12px] border border-line rounded-lg bg-white focus:outline-none focus:border-[#8a9a30] w-40" />
                      {itemSearch && <button onClick={() => setItemSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[11px] cursor-pointer"><i className="fa fa-xmark" /></button>}
                    </div>
                    {itemSearch && <span className="text-[11px] text-ink-muted">{visibleItems.length}/{detail.items.length} results</span>}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px] border-collapse">
                    <thead>
                      <tr className={tab === "approved" ? "bg-[#ece9df]" : "bg-white"}>
                        <th className={`px-3 py-2.5 text-left font-semibold border border-line-dark whitespace-nowrap ${tab === "approved" ? "text-[#6c6b29]" : "text-ink"}`}>S.No</th>
                        {(["po_num", "invoice_no", "invoice_qty", "dc_num"] as (keyof PaymentTransactionItem)[]).map((key, i) => (
                          <th key={key} onClick={() => handleItemSort(key)} className={`px-3 py-2.5 text-left font-semibold border border-line-dark whitespace-nowrap cursor-pointer select-none ${tab === "approved" ? "text-[#6c6b29] hover:bg-[#e0dcd0]" : "text-ink hover:bg-brand-50"}`}>
                            {["PO No / Date", "Invoice No / Date", "Invoice Qty", "DC No / Date"][i]}{itemSortIcon(key)}
                          </th>
                        ))}
                        {(["rate", "basic_amount", "gst", "gst_amount", "amount"] as (keyof PaymentTransactionItem)[]).map((key, i) => (
                          <th key={key} onClick={() => handleItemSort(key)} className={`px-3 py-2.5 text-left font-semibold border border-line-dark whitespace-nowrap cursor-pointer select-none ${tab === "approved" ? "text-[#6c6b29] hover:bg-[#e0dcd0]" : "text-ink hover:bg-brand-50"}`}>
                            {["Unit Price", "Basic Amount", "GST", "GST Amount", "Total Amount"][i]}{itemSortIcon(key)}
                          </th>
                        ))}
                        <th className={`px-3 py-2.5 text-left font-semibold border border-line-dark whitespace-nowrap ${tab === "approved" ? "text-[#6c6b29]" : "text-ink"}`}>Additional Amount</th>
                        <th className={`px-3 py-2.5 text-left font-semibold border border-line-dark whitespace-nowrap ${tab === "approved" ? "text-[#6c6b29]" : "text-ink"}`}>Grand Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleItems.length === 0 ? (
                        <tr><td colSpan={12} className="text-center py-8 text-ink-muted border border-line">{itemSearch ? "No matching items" : "No data found"}</td></tr>
                      ) : (
                        <>
                          {visibleItems.map((item) => (
                            <tr key={item.unique_id || item.s_no} className={tab === "approved" ? "bg-white" : "hover:bg-brand-50/40 transition-colors"}>
                              <td className="px-3 py-2 border border-line">{item.s_no}</td>
                              <td className="px-3 py-2 border border-line"><div>{item.po_num || "-"}</div><div className={tab === "approved" ? "font-bold" : "text-ink-muted"}>{item.po_date || "-"}</div></td>
                              <td className="px-3 py-2 border border-line"><div>{item.invoice_no || "-"}</div><div className={tab === "approved" ? "font-bold" : "text-ink-muted"}>{item.invoice_date || "-"}</div></td>
                              <td className="px-3 py-2 text-right border border-line">{item.invoice_qty}</td>
                              <td className="px-3 py-2 border border-line"><div>{item.dc_num || "-"}</div><div className={tab === "approved" ? "font-bold" : "text-ink-muted"}>{item.dc_date || "-"}</div></td>
                              <td className="px-3 py-2 text-right border border-line">{amountText(item.rate)}</td>
                              <td className="px-3 py-2 text-right border border-line">{amountText(item.basic_amount)}</td>
                              <td className="px-3 py-2 text-right border border-line">{tab === "approved" ? item.gst : `${item.gst} %`}</td>
                              <td className="px-3 py-2 text-right border border-line">{amountText(item.gst_amount)}</td>
                              <td className={`px-3 py-2 text-right border border-line ${tab === "approved" ? "font-bold" : "font-semibold"}`}>{amountText(item.amount)}</td>
                              <td className="px-3 py-2 text-center border border-line text-ink-muted">-</td>
                              <td className={`px-3 py-2 text-right border border-line ${tab === "approved" ? "font-bold" : "font-semibold"}`}>{amountText(item.amount)}</td>
                            </tr>
                          ))}
                          <tr className={`${tab === "approved" ? "bg-[#f3efdc] text-[#6c6b29]" : "bg-surface-2 text-ink"} font-semibold`}>
                            <td colSpan={5} className="px-3 py-2.5 text-right uppercase tracking-wide border border-line-dark">Grand Total</td>
                            <td className="px-3 py-2.5 text-right border border-line-dark">{amountText(itemTotals.unitPriceTotal)}</td>
                            <td className="px-3 py-2.5 text-right border border-line-dark">{amountText(itemTotals.basicAmountTotal)}</td>
                            <td className="px-3 py-2.5 text-right border border-line-dark">{itemTotals.gstLabel}</td>
                            <td className="px-3 py-2.5 text-right border border-line-dark">{amountText(itemTotals.gstAmountTotal)}</td>
                            <td className="px-3 py-2.5 text-right border border-line-dark">{amountText(itemTotals.totalAmountTotal)}</td>
                            <td className="px-3 py-2.5 text-right border border-line-dark">{amountText(additionalCharges)}</td>
                            <td className="px-3 py-2.5 text-right border border-line-dark">{amountText(grandTotalAmount)}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {tab === "approved" ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2 mb-3">
                    <div className="flex items-start gap-8 text-[14px] font-bold text-ink">
                      <div>Approved By: <span className="text-[#506018]">{detail.summary.accounts_approved_by || "-"}</span></div>
                      <div>Approved Date: <span className="text-[#506018]">{detail.summary.accounts_approved_date || "-"}</span></div>
                    </div>
                    <div className="ml-auto w-full max-w-xl space-y-2 text-[13px]">
                      <div className="flex justify-between"><span className="font-bold text-ink">Base Amount:</span><span className="font-bold text-[#506018] text-[15px]">Rs. {amountText(detail.summary.total_amount)}</span></div>
                      <div className="flex justify-between"><span className="font-bold text-ink">Additional Charges:</span><span className="font-bold text-[#506018]">Rs. {amountText(additionalCharges)}</span></div>
                      <div className="flex justify-between"><span className="font-bold text-ink">Total Amount:</span><span className="font-bold text-[#506018]">Rs. {amountText(grandTotalAmount)}</span></div>
                      <div className="flex justify-between"><span className="font-bold text-ink">TDS Deduction:</span><span className="font-bold text-[#506018]">Rs. {amountText(detail.summary.acctdsvalue)}</span></div>
                      <div className="flex justify-between"><span className="font-bold text-ink">Other Deduction:</span><span className="font-bold text-[#506018]">Rs. {amountText(detail.summary.accotherdeduction)}</span></div>
                      <div className="flex justify-between"><span className="font-bold text-ink">Advance Amount:</span><span className="font-bold text-[#506018]">Rs. {amountText(detail.summary.advancepayment)}</span></div>
                      <div className="flex justify-between"><span className="font-bold text-ink">Total Payable Amount:</span><span className="font-bold text-[#506018]">Rs. {amountText(detail.summary.acctotalpaybleamount)}</span></div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end text-[14px]">
                    <div><span className="font-bold text-ink">Total Amount In Words: </span><span className="font-bold text-[#506018]">{numberToWords(Number(detail.summary.acctotalpaybleamount || 0))}</span></div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-[#ff6b4a] text-white rounded-md font-semibold hover:bg-[#f35b38] transition-colors">Close</button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-end gap-1 text-[13px]">
                  <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">Base Amount:</span><span className="font-semibold text-ink">Rs. {amountText(detail.summary.total_amount)}</span></div>
                  <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">Additional Charges:</span><span className="font-semibold text-ink">Rs. {amountText(additionalCharges)}</span></div>
                  <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">Total Amount:</span><span className="font-semibold text-ink">Rs. {amountText(grandTotalAmount)}</span></div>
                  <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">TDS Deduction:</span><span className="font-semibold text-ink">Rs. {amountText(detail.summary.acctdsvalue)}</span></div>
                  <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">Other Deduction:</span><span className="font-semibold text-ink">Rs. {amountText(detail.summary.accotherdeduction)}</span></div>
                  <div className="flex justify-between w-full max-w-md"><span className="text-ink-secondary">Advance Amount:</span><span className="font-semibold text-ink">Rs. {amountText(detail.summary.advancepayment)}</span></div>
                  <div className="flex justify-between w-full max-w-md pt-1 border-t border-line"><span className="font-bold text-ink">Total Payable Amount:</span><span className="font-bold text-[#3d5a20]">Rs. {amountText(detail.summary.acctotalpaybleamount)}</span></div>
                </div>
              )}

              {tab !== "approved" && detail.summary.account_remark && (
                <div className="mt-5">
                  <p className="text-[12.5px] font-bold text-[#3d5a20] mb-2">Remark</p>
                  <p className="text-[12px] text-ink-secondary bg-surface-2 border border-line-dark rounded px-3 py-2">{detail.summary.account_remark}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentTransactionList() {
  const [tab, setTab] = useState<PaymentTransactionTab>("pending");
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PaymentTransactionRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PaymentTransactionDetail | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [tab, search, length]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchPaymentTransactionList({ tab, search: search || undefined, page, length });
        if (!mounted) return;
        setRows(res.data || []);
        setTotalRows(res.recordsFiltered ?? 0);
      } catch (error) {
        if (!mounted) return;
        setRows([]);
        setTotalRows(0);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load payment transaction records.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [tab, search, page, length]);

  const openDetail = async (row: PaymentTransactionRow) => {
    setModalOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetchPaymentTransactionDetail(row.unique_id, { tab, bill_no: row.bill_no, vendor_id: row.vendor_id });
      setDetail(res.data);
    } catch (error) {
      setModalOpen(false);
      await showErrorAlert(error instanceof Error ? error.message : "Failed to load payment transaction detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(totalRows / length));

  const buildPages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const headers = useMemo(
    () =>
      tab === "pending"
        ? [
            "S.No",
            "Vendor Bill Date / Bill No",
            "Vendor Invoice Date / Invoice No",
            "Vendor Name",
            "Total Amount",
            "TDS Deduction",
            "Other Deduction",
            "Advance Amount",
            "Total Payable Amount",
            "Vendor Approved By / Date",
            "Accounts Approved By / Date",
            "Management Approved By / Date",
            "Remark",
            "Action",
          ]
        : [
            "S.No",
            "Vendor Bill Date / Bill No",
            "Vendor Invoice Date / Invoice No",
            "Vendor Name",
            "Total Amount",
            "TDS Deduction",
            "Other Deduction",
            "Advance Amount",
            "Total Payable Amount",
            "Transaction Type",
            "Transaction ID / Date",
            "Cash Attach File",
            "Action",
          ],
    [tab]
  );

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar title="Payment Transaction List" breadcrumbs={["Vendor", "Payment Transaction List"]} />

      <section className="mt-4 overflow-visible rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <PageTabs
          items={[
            { value: "pending", label: "Payment Pending" },
            { value: "approved", label: "Payment Approved" },
          ]}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPage(1);
            setSearch("");
          }}
        />

        <div className="p-5">
          <SettingsListToolbar
            length={length}
            setLength={(value) => {
              setLength(value);
              setPage(1);
            }}
            search={search}
            setSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            tableRef={tableRef}
            searchPlaceholder="Bill / Invoice / Vendor / Remark"
          />

          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table ref={tableRef} className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {headers.map((header) => (
                    <th key={header} className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643] whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={headers.length} className="py-10 text-center text-[#6f7758]">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#657b2f]/30 border-t-[#657b2f]" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="py-10 text-center text-[#6f7758]">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={`${row.bill_no}-${row.vendor_id}`} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                      <td className="px-4 py-4 text-center text-[#7a7f69]">{length === -1 ? index + 1 : (page - 1) * length + index + 1}</td>
                      <td className="px-4 py-4 align-top text-[#243018]"><div className="font-semibold">{row.bill_no || "-"}</div><div className="mt-1 text-[11px] text-[#7d8665]">{row.bill_date || "-"}</div></td>
                      <td className="px-4 py-4 align-top text-[#243018]"><div className="font-semibold">{row.vendor_invoice_no || "-"}</div><div className="mt-1 text-[11px] text-[#7d8665]">{row.vendor_invoice_date || "-"}</div></td>
                      <td className="px-4 py-4 align-top text-[#243018] max-w-[250px]"><div className="font-semibold">{row.vendor_company_name || row.vendor_name || "-"}</div><div className="mt-1 text-[11px] text-[#7d8665]">{row.vendor_address || "-"}</div><div className="text-[11px] text-[#7d8665]">{row.vendor_contact || "-"}</div></td>
                      <td className="px-4 py-4 text-right text-[#243018]">{amountText(row.total_amount)}</td>
                      <td className="px-4 py-4 text-right text-[#8a5a1f]">{amountText(row.acctdsvalue)}</td>
                      <td className="px-4 py-4 text-right text-[#8a5a1f]">{amountText(row.accotherdeduction)}</td>
                      <td className="px-4 py-4 text-right text-[#243018]">{amountText(row.advancepayment)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-[#55711f]">{amountText(row.acctotalpaybleamount)}</td>
                      {tab === "pending" ? (
                        <>
                          <td className="px-4 py-4 align-top text-[#243018]"><div className="font-medium">{row.vendor_bill_approval || "-"}</div><div className="mt-1 text-[11px] text-[#7d8665]">{row.vendor_bill_approval_date || "-"}</div></td>
                          <td className="px-4 py-4 align-top text-[#243018]"><div className="font-medium">{row.finance_approved_by || "-"}</div><div className="mt-1 text-[11px] text-[#7d8665]">{row.finance_approved_date || "-"}</div></td>
                          <td className="px-4 py-4 align-top text-[#243018]"><div className="font-medium">{row.management_approved_by || "-"}</div><div className="mt-1 text-[11px] text-[#7d8665]">{row.management_approval_date || "-"}</div></td>
                          <td className="px-4 py-4 align-top text-[11px] text-[#5d6942]">{row.account_remark || "-"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 text-center"><span className="inline-flex rounded-full border border-[#dce5c6] bg-white px-3 py-1 font-semibold text-[#5f7427]">{transactionLabel(row.transaction_type)}</span></td>
                          <td className="px-4 py-4 align-top text-[#243018]"><div className="font-medium">{row.transaction_id || "-"}</div><div className="mt-1 text-[11px] text-[#7d8665]">{row.transaction_date || "-"}</div></td>
                          <td className="px-4 py-4 text-center"><AttachmentLink folder="accounts_approval" fileName={row.cash_receipt_file_name} label="View" /></td>
                        </>
                      )}
                      <td className="px-4 py-4 text-center">
                        {tab === "pending" ? (
                          <button
                            onClick={() => navigate(`/vendor/payment-transaction/form/${row.unique_id}`)}
                            className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white"
                          >
                            <i className="fa fa-pen-to-square" />
                          </button>
                        ) : (
                          <button
                            onClick={() => void openDetail(row)}
                            className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white"
                          >
                            <i className="fa fa-eye" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 text-[13px] text-[#6f7758] flex-wrap">
            <span>Showing {totalRows === 0 ? 0 : length === -1 ? 1 : (page - 1) * length + 1} to {length === -1 ? totalRows : Math.min(page * length, totalRows)} of {totalRows} entries</span>
            <div className="flex gap-2">
              <button disabled={length === -1 || page === 1} onClick={() => setPage((current) => current - 1)} className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              {buildPages().map((value, index) =>
                value === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-2 py-2 text-[#7d8665]">...</span>
                ) : (
                  <button
                    key={value}
                    onClick={() => setPage(value as number)}
                    className={`h-[36px] w-[36px] rounded-2xl border text-[13px] ${
                      page === value
                        ? "border-[#657b2f] bg-[#657b2f] text-white"
                        : "border-[#d8dec8] bg-white hover:border-[#7b8f43] hover:text-[#5f7427]"
                    }`}
                  >
                    {value}
                  </button>
                )
              )}
              <button disabled={length === -1 || page >= totalPages} onClick={() => setPage((current) => current + 1)} className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      {modalOpen && <DetailModal tab={tab} detail={detail} loading={detailLoading} onClose={() => { setModalOpen(false); setDetail(null); }} />}
    </div>
  );
}
