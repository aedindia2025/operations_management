import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import ApprovalStepsCard from "../../components/common/ApprovalStepsCard";
import {
  fetchPaymentTransactionDetail,
  submitPaymentTransaction,
  updatePaymentTransactionRemark,
  type PaymentTransactionDetail,
} from "../../api/paymentTransactionApi";
import { showErrorAlert, showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DCItem {
  s_no: number;
  po_no: string;
  po_date: string;
  invoice_no: string;
  invoice_date: string;
  invoice_qty: number;
  dc_no: string;
  dc_date: string;
  unit_price: number;
  basic_amount: number;
  gst: string;
  gst_amount: number;
  total_amount: number;
}

interface FormData {
  // Vendor Details
  vendor_name: string;
  vendor_address: string;
  vendor_gst: string;
  vendor_pan: string;
  vendor_email: string;
  vendor_phone: string;
  // Vendor Bill Details
  vendor_bill_no: string;
  vendor_bill_date: string;
  // Vendor Invoice Details
  vendor_invoice_no: string;
  vendor_invoice_date: string;
  invoice_attach_url: string;
  po_attach_url: string;
  // Vendor Bank Details
  bank_name: string;
  branch: string;
  pincode: string;
  account_no: string;
  ifsc_code: string;
  account_holder: string;
  pan_copy_url: string;
  bank_proof_url: string;
  // Approval Details
  bill_created_by: string;
  bill_approved_by: string;
  bill_approved_date: string;
  account_entry_by: string;
  account_entry_date: string;
  accounts_approved_by: string;
  accounts_approved_date: string;
  management_approved_by: string;
  management_approved_date: string;
  payment_approved_by: string;
  payment_approved_date: string;
  // DC Items
  dc_items: DCItem[];
  // Amounts
  total_amount: number;
  tds_deduction: number;
  other_deduction: number;
  advance_amount: number;
  total_payable: number;
  total_in_words: string;
  // Form fields
  remarks: string;
  transaction_type: string;
  transaction_date: string;
  bank_name_new: string;
  online_type: string;
  upi_id: string;
  upi_mobile: string;
  transaction_id_1: string;
  transaction_id_2: string;
  payment_id: string;
  cash_receipt_file_name: string;
}

const INIT: FormData = {
  vendor_name: "",
  vendor_address: "",
  vendor_gst: "",
  vendor_pan: "",
  vendor_email: "",
  vendor_phone: "",
  vendor_bill_no: "",
  vendor_bill_date: "",
  vendor_invoice_no: "",
  vendor_invoice_date: "",
  invoice_attach_url: "",
  po_attach_url: "",
  bank_name: "",
  branch: "",
  pincode: "",
  account_no: "",
  ifsc_code: "",
  account_holder: "",
  pan_copy_url: "",
  bank_proof_url: "",
  bill_created_by: "",
  bill_approved_by: "",
  bill_approved_date: "",
  account_entry_by: "",
  account_entry_date: "",
  accounts_approved_by: "",
  accounts_approved_date: "",
  management_approved_by: "",
  management_approved_date: "",
  payment_approved_by: "",
  payment_approved_date: "",
  dc_items: [],
  total_amount: 0,
  tds_deduction: 0,
  other_deduction: 0,
  advance_amount: 0,
  total_payable: 0,
  total_in_words: "",
  remarks: "",
  transaction_type: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  bank_name_new: "",
  online_type: "",
  upi_id: "",
  upi_mobile: "",
  transaction_id_1: "",
  transaction_id_2: "",
  payment_id: "",
  cash_receipt_file_name: "",
};

function numberToWords(amount: number): string {
  if (!amount || amount === 0) return "Zero Rupees and Zero Paise";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function toWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + toWords(n % 100);
    if (n < 100000) return toWords(Math.floor(n / 1000)) + "Thousand " + toWords(n % 1000);
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + "Lakh " + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + "Crore " + toWords(n % 10000000);
  }
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const rupeesText = toWords(rupees).trim() || "Zero";
  const paiseText = paise > 0 ? ` and ${toWords(paise).trim()} Paise` : " and Zero Paise";
  return rupeesText + " Rupees" + paiseText;
}
function fmt(n: number) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toInputDate(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

function buildLegacyUploadUrl(folder: string, fileName?: string) {
  if (!fileName) return "";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}/otm_beta/uploads/${folder}/${fileName}`;
}

function normalizeTransactionType(value: number | string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "1" || normalized === "cash") return "1";
  if (normalized === "2" || normalized === "bank") return "2";
  if (normalized === "3" || normalized === "upi") return "3";
  return "";
}

function mapDetailToForm(detail: PaymentTransactionDetail): FormData {
  return {
    vendor_name: detail.vendor_summary.company_name || detail.summary.vendor_company_name || detail.summary.vendor_name || "",
    vendor_address: detail.vendor_summary.address || detail.summary.vendor_address || "",
    vendor_gst: detail.vendor_summary.gst_no || "",
    vendor_pan: detail.vendor_summary.pan_no || "",
    vendor_email: detail.vendor_summary.mail_id || "",
    vendor_phone: detail.vendor_summary.contact_no || detail.summary.vendor_contact || "",
    vendor_bill_no: detail.summary.bill_no || "",
    vendor_bill_date: detail.summary.bill_date || "",
    vendor_invoice_no: detail.summary.vendor_invoice_no || "",
    vendor_invoice_date: detail.summary.vendor_invoice_date || "",
    invoice_attach_url: buildLegacyUploadUrl("vendorpayment", detail.summary.inv_verfiy_attach),
    po_attach_url: "",
    bank_name: detail.vendor_summary.bank_name || "",
    branch: detail.vendor_summary.branch_name || "",
    pincode: detail.vendor_summary.pincode || "",
    account_no: detail.vendor_summary.account_no || "",
    ifsc_code: detail.vendor_summary.ifsc_code || "",
    account_holder: detail.vendor_summary.acc_holder_name || "",
    pan_copy_url: buildLegacyUploadUrl("vendor_creation", detail.vendor_summary.pan_attach_file_name),
    bank_proof_url: buildLegacyUploadUrl("vendor_creation", detail.vendor_summary.bank_proof),
    bill_created_by: detail.summary.bill_created_by || "",
    bill_approved_by: detail.summary.vendor_bill_approval || "",
    bill_approved_date: detail.summary.vendor_bill_approval_date || "",
    account_entry_by: detail.summary.account_entry_by || "",
    account_entry_date: detail.summary.account_entry_date || "",
    accounts_approved_by: detail.summary.finance_approved_by || "",
    accounts_approved_date: detail.summary.finance_approved_date || "",
    management_approved_by: detail.summary.management_approved_by || "",
    management_approved_date: detail.summary.management_approval_date || "",
    payment_approved_by: detail.summary.accounts_approved_by || "",
    payment_approved_date: detail.summary.accounts_approved_date || "",
    dc_items: detail.items.map((item) => ({
      s_no: item.s_no,
      po_no: item.po_num || "",
      po_date: item.po_date || "",
      invoice_no: item.invoice_no || "",
      invoice_date: item.invoice_date || "",
      invoice_qty: Number(item.invoice_qty || 0),
      dc_no: item.dc_num || "",
      dc_date: item.dc_date || "",
      unit_price: Number(item.rate || 0),
      basic_amount: Number(item.basic_amount || 0),
      gst: String(item.gst ?? ""),
      gst_amount: Number(item.gst_amount || 0),
      total_amount: Number(item.amount || 0),
    })),
    total_amount: Number(detail.summary.total_amount || 0),
    tds_deduction: Number(detail.summary.acctdsvalue || 0),
    other_deduction: Number(detail.summary.accotherdeduction || 0),
    advance_amount: Number(detail.summary.advancepayment || 0),
    total_payable: Number(detail.summary.acctotalpaybleamount || 0),
    total_in_words: "",
    remarks: detail.summary.account_remark || "",
    transaction_type: normalizeTransactionType(detail.summary.transaction_type),
    transaction_date: toInputDate(detail.summary.transaction_date) || new Date().toISOString().slice(0, 10),
    bank_name_new: detail.summary.banknamenew || "",
    online_type: detail.summary.upi_method || "",
    upi_id: detail.summary.upi_id || "",
    upi_mobile: detail.summary.upi_mobile_no || "",
    transaction_id_1: detail.summary.transaction_type === 2 || String(detail.summary.transaction_type) === "2" ? detail.summary.transaction_id || "" : "",
    transaction_id_2: detail.summary.transaction_type === 3 || String(detail.summary.transaction_type) === "3" ? detail.summary.transaction_id || "" : "",
    payment_id: detail.summary.payment_id || "",
    cash_receipt_file_name: detail.summary.cash_receipt_file_org || detail.summary.cash_receipt_file_name || "",
  };
}

function getActingUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("otm_user") || "{}");
    return user?.unique_id || user?.staff_id || user?.id || user?.user_id || "";
  } catch {
    return "";
  }
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-[#5b641d] tracking-widest uppercase mb-3">
      {children}
    </p>
  );
}

// ─── Bank Detail Row ──────────────────────────────────────────────────────────

function BankRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 mb-1.5 text-[12px]">
      <span className="text-ink-secondary w-32 shrink-0">{label}</span>
      <span className="text-ink-secondary mr-1">:</span>
      <span className="text-ink font-medium flex items-center gap-1">
        {children ?? value ?? "-"}
      </span>
    </div>
  );
}

// ─── PDF Link ─────────────────────────────────────────────────────────────────

function PdfLink({ url }: { url: string }) {
  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center text-danger hover:opacity-75 transition-opacity"
    >
      <i className="fa fa-file-pdf text-danger text-[16px]" />
    </a>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentTransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const recordId = id || searchParams.get("id") || "";
  const isEdit = Boolean(recordId);
  const [form, setForm] = useState<FormData>(INIT);
  const [cashReceiptFile, setCashReceiptFile] = useState<File | null>(null);
  const [savingSubmit, setSavingSubmit] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const accountEntryCreated = Boolean(form.account_entry_by || form.account_entry_date);

  useEffect(() => {
    if (!recordId) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchPaymentTransactionDetail(recordId, { tab: "pending", bill_no: "", vendor_id: "" });
        if (!active) return;
        setForm(mapDetailToForm(res.data));
      } catch (error) {
        if (!active) return;
        setForm(INIT);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load payment transaction detail.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [recordId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recordId || !form.vendor_bill_no) {
      await showErrorAlert("Payment transaction identifiers are missing.");
      return;
    }
    if (!form.transaction_type || !form.transaction_date) {
      await showWarningAlert("Please select transaction details.");
      return;
    }
    if (form.transaction_type === "1" && !cashReceiptFile) {
      await showWarningAlert("Please upload the Cash Receipt.");
      return;
    }
    if (form.transaction_type === "2") {
      if (!form.bank_name || !form.ifsc_code || !form.account_no || !form.branch || !form.bank_name_new) {
        await showWarningAlert("Please fill out all Bank details.");
        return;
      }
      if (!form.transaction_id_1 || form.transaction_id_1.trim().length < 6) {
        await showWarningAlert("Transaction ID must be at least 6 characters.");
        return;
      }
    }
    if (form.transaction_type === "3") {
      if (!form.online_type || !form.upi_id || !form.upi_mobile || !form.transaction_id_2) {
        await showWarningAlert("Please fill out all UPI payment details.");
        return;
      }
      if (!/^\d{10}$/.test(form.upi_mobile.trim())) {
        await showWarningAlert("Mobile number must be 10 digits.");
        return;
      }
      if (form.transaction_id_2.trim().length < 6) {
        await showWarningAlert("Transaction ID must be at least 6 characters.");
        return;
      }
    }

    setSavingSubmit(true);
    try {
      const userId = getActingUserId();
      if (form.remarks.trim()) {
        await updatePaymentTransactionRemark(recordId, {
          bill_no: form.vendor_bill_no,
          remark: form.remarks,
          user_id: userId,
        });
      }
      const result = await submitPaymentTransaction(recordId, {
        bill_no: form.vendor_bill_no,
        vendor_name: form.vendor_name,
        transaction_type: form.transaction_type,
        transaction_date: form.transaction_date,
        bank_name: form.bank_name,
        bank_name_new: form.bank_name_new,
        ifsc_code: form.ifsc_code,
        account_no: form.account_no,
        branch_name: form.branch,
        online_type: form.online_type,
        upi_id: form.upi_id,
        upi_mobile: form.upi_mobile,
        transaction_id_1: form.transaction_id_1,
        transaction_id_2: form.transaction_id_2,
        payment_id: form.payment_id,
        cash_receipt: cashReceiptFile,
        user_id: userId,
      });
      await showSuccessAlert(result.message || "Payment details saved successfully.");
      navigate("/vendor/payment-transaction/list");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to submit payment transaction.");
    } finally {
      setSavingSubmit(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-6">
      <PageTopbar
        title="Payment Transaction Form"
        breadcrumbs={["Vendor Payment", "Payment Transaction", isEdit ? "Edit" : "Add"]}
      />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        {loading ? (
          <div className="p-8 text-center text-[13px] text-ink-muted">Loading payment transaction...</div>
        ) : (
        <form onSubmit={handleSubmit}>

     

          {/* ── Top 3-column info section ──────────────────────────────── */}
          <div className="grid grid-cols-3 gap-0 ">

            {/* Vendor Details */}
            <div className="p-6 ">
              <SectionTitle>Vendor Details</SectionTitle>
              <p className="text-[13px] font-bold text-ink mb-1">{form.vendor_name || "-"}</p>
              <p className="text-[12px] text-ink-secondary flex items-start gap-1 mb-2">
                <i className="fa fa-location-dot text-[11px] mt-0.5 shrink-0" />
                {form.vendor_address || "-"}
              </p>
              <p className="text-[12px] text-ink-secondary mb-1">
                GST No: <span className="font-semibold text-ink">{form.vendor_gst || "-"}</span>,{" "}
                PAN No: <span className="font-semibold text-ink">{form.vendor_pan || "-"}</span>
              </p>
              <p className="text-[12px] text-ink-secondary flex items-center gap-1 mb-1">
                <i className="fa fa-envelope text-[11px]" />
                {form.vendor_email || "-"}
              </p>
              <p className="text-[12px] text-ink-secondary flex items-center gap-1">
                <i className="fa fa-phone text-[11px]" />
                {form.vendor_phone || "-"}
              </p>
            </div>

            

            {/* Vendor Bill + Invoice Details */}
            <div className="p-6  flex flex-col gap-8">
              <div>
                <SectionTitle>Vendor Bill Details</SectionTitle>
                <p className="text-[14px] font-bold text-[#5b641d] mb-1">{form.vendor_bill_no || "-"}</p>
                <p className="text-[12px] text-ink-secondary flex items-center gap-1">
                  <i className="fa fa-calendar text-[11px]" />
                  {form.vendor_bill_date || "-"}
                </p>
              </div>
              <div>
                <SectionTitle>Vendor Invoice Details</SectionTitle>
                <p className="text-[14px] font-bold text-[#5b641d] mb-1">{form.vendor_invoice_no || "-"}</p>
                <p className="text-[12px] text-ink-secondary flex items-center gap-1 mb-2">
                  <i className="fa fa-calendar text-[11px]" />
                  {form.vendor_invoice_date || "-"}
                </p>
                <p className="text-[12px] text-ink-secondary mb-1">
                  Invoice Attach : <PdfLink url={form.invoice_attach_url}  />
                </p>
                <p className="text-[12px] text-ink-secondary">
                  PO Attach : <PdfLink url={form.po_attach_url}  />
                </p>
              </div>
            </div>

            {/* Vendor Bank Details */}
            <div className="p-6">
              <SectionTitle>Vendor Bank Details</SectionTitle>
              <BankRow label="Vendor Bank Name" value={form.bank_name} />
              <BankRow label="Branch">
                <i className="fa fa-location-dot text-[11px] text-ink-muted" />
                {form.branch || "-"}
              </BankRow>
              <BankRow label="Account No" value={form.account_no} />
              <BankRow label="IFSC Code" value={form.ifsc_code} />
              <BankRow label="Account Holder" value={form.account_holder} />
              <BankRow label="PAN Copy">
                <PdfLink url={form.pan_copy_url} />
              </BankRow>
              <BankRow label="Bank Proof">
                <PdfLink url={form.bank_proof_url} />
              </BankRow>
            </div>
          </div>

               {/* ── Approval History ───────────────────────────────────────── */}
          <div className="p-6 border-b border-[#e6dfcb]">
            <ApprovalStepsCard steps={[
              { step: 1, label: "Bill Created", by: form.bill_created_by || undefined, at: form.vendor_bill_date || undefined, status: form.vendor_bill_date ? "Created" : "Pending" },
              { step: 2, label: "Operation Team", by: form.bill_approved_by || undefined, at: form.bill_approved_date || undefined, status: form.bill_approved_by ? "Approved" : "Pending" },
              { step: 3, label: "Account Entry", by: form.account_entry_by || undefined, at: form.account_entry_date || undefined, status: accountEntryCreated ? "Created" : "Pending" },
              { step: 4, label: "Accounts Approval", by: form.accounts_approved_by || undefined, at: form.accounts_approved_date || undefined, status: form.accounts_approved_by ? "Approved" : "Pending" },
              { step: 5, label: "Management", by: form.management_approved_by || undefined, at: form.management_approved_date || undefined, status: (form.management_approved_by || form.management_approved_date) ? "Approved" : "Pending" },
              { step: 6, label: "Payment", by: form.payment_approved_by || undefined, at: form.payment_approved_date || undefined, status: (form.payment_approved_by || form.payment_approved_date) ? "Approved" : "Pending" },
            ]} />
          </div>

          {/* ── DC Items Table ─────────────────────────────────────────── */}
          <div className="p-6 border-b border-[#e6dfcb]">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse" style={{ minWidth: 1100 }}>
                <thead>
                  <tr className="bg-surface-2">
                    {["S.No", "PO No / Date", "Invoice No / Date", "Invoice Qty", "DC No / Date", "Unit Price", "Basic Amount", "GST", "GST Amount", "Total Amount"].map(h => (
                      <th key={h} className="border border-line-dark px-3 py-2.5 text-left font-semibold text-ink whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.dc_items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border border-line px-3 py-8 text-center text-ink-muted italic">
                        No line items available
                      </td>
                    </tr>
                  ) : form.dc_items.map((item) => (
                    <tr key={item.s_no} className="hover:bg-brand-50/40 border-b border-line/50">
                      <td className="border border-line-dark px-3 py-2 text-center text-ink-muted">{item.s_no}</td>
                      <td className="border border-line-dark px-3 py-2">
                        <div className="font-medium text-ink">{item.po_no}</div>
                        <div className="text-ink-muted">{item.po_date}</div>
                      </td>
                      <td className="border border-line-dark px-3 py-2">
                        <div className="font-medium text-ink">{item.invoice_no}</div>
                        <div className="text-ink-muted">{item.invoice_date}</div>
                      </td>
                      <td className="border border-line-dark px-3 py-2 text-right">{item.invoice_qty}</td>
                      <td className="border border-line-dark px-3 py-2">
                        <div className="font-medium text-ink">{item.dc_no}</div>
                        <div className="text-ink-muted">{item.dc_date}</div>
                      </td>
                      <td className="border border-line-dark px-3 py-2 text-right">{item.unit_price}</td>
                      <td className="border border-line-dark px-3 py-2 text-right">{item.basic_amount}</td>
                      <td className="border border-line-dark px-3 py-2 text-right">{item.gst} %</td>
                      <td className="border border-line-dark px-3 py-2 text-right">{item.gst_amount}</td>
                      <td className="border border-line-dark px-3 py-2 text-right font-semibold text-ink">
                        {item.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Amount Summary ──────────────────────────────────────── */}
            <div className="flex justify-end mt-4">
              <div className="flex flex-col gap-1.5 min-w-[300px]">
                {[
                  { label: "Total Amount:", value: form.total_amount },
                  { label: "TDS Deduction:", value: form.tds_deduction },
                  { label: "Other Deduction:", value: form.other_deduction },
                  { label: "Advance Amount:", value: form.advance_amount },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-secondary">{label}</span>
                    <span className="font-bold text-[#3d5a20]">₹ {fmt(value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-[13px] pt-1 border-t border-line mt-1">
                  <span className="font-bold text-ink">Total Payable Amount:</span>
                  <span className="font-bold text-[#3d5a20]">₹ {fmt(form.total_payable)}</span>
                </div>
                <div className="flex items-start gap-2 text-[13px] pt-1 justify-end">
  <span className="font-bold text-ink whitespace-nowrap">Total Amount In Words:</span>
  <span className="font-bold text-[#5b641d] text-[14px]">{numberToWords(form.total_payable)}</span>
</div>
              </div>
            </div>
          </div>

          {/* ── Remarks ────────────────────────────────────────────────── */}
          <div className="p-6 border-b border-[#e6dfcb]">
            <div className="max-w-lg">
              <span className="block text-[13px] font-bold text-ink mb-2">Remarks</span>
              <textarea name="remarks"
                value={form.remarks}
                onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none
                  focus:border-brand-500 focus:ring-1 focus:ring-[#8a9451]/20 resize-y bg-white"
              />
            </div>
          </div>

          {/* ── Transaction Type + Date ────────────────────────────────── */}
          <div className="p-6 border-b border-[#e6dfcb]">
            <div className="grid grid-cols-2 gap-6 max-w-xl">
              <div>
                <span className="block text-[13px] font-bold text-ink mb-2">Transaction Type</span>
                <SearchableSelectInput name="transaction_type"
                  value={form.transaction_type}
                  onChange={e => setForm(p => ({ ...p, transaction_type: e.target.value }))}
                  className="w-full px-3 py-2.5 text-[13px] border border-line-dark rounded-lg
                    outline-none bg-white focus:border-brand-500 focus:ring-1 focus:ring-[#8a9451]/20"
                >
                  <option value="">Select transaction type</option>
                  <option value="1">Cash</option>
                  <option value="2">Bank</option>
                  <option value="3">UPI</option>
                </SearchableSelectInput>
              </div>
              <div>
                <span className="block text-[13px] font-bold text-ink mb-2">Transaction Date</span>
                <input name="transaction_date"
                  type="date"
                  value={form.transaction_date}
                  onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))}
                  className="w-full px-3 py-2.5 text-[13px] border border-[#d8d0b8] rounded-lg
                    outline-none bg-white focus:border-[#8a9451] focus:ring-1 focus:ring-[#8a9451]/20"
                />
              </div>
            </div>

            {form.transaction_type === "1" ? (
              <div className="mt-6 max-w-xl">
                <span className="block text-[13px] font-bold text-ink mb-2">Upload Cash Receipt</span>
                <input name="paymenttransactionform_input_652"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCashReceiptFile(file);
                    setForm((prev) => ({ ...prev, cash_receipt_file_name: file?.name || prev.cash_receipt_file_name }));
                  }}
                  className="w-full px-3 py-2.5 text-[13px] border border-line-dark rounded-lg outline-none bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                />
                {form.cash_receipt_file_name ? <p className="mt-2 text-[12px] text-ink-secondary">Selected file: {form.cash_receipt_file_name}</p> : null}
              </div>
            ) : null}

            {form.transaction_type === "2" ? (
              <div className="mt-6 border border-line rounded-xl bg-[#fcfbf5] p-5">
                <p className="text-[12px] font-bold text-[#5b641d] mb-4 uppercase tracking-wide">Bank Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-[13px]">
                  <div>
                    <span className="block font-semibold text-ink mb-2">Bank Name</span>
                    <input name="bank_name" value={form.bank_name} readOnly className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-surface-2 text-ink-secondary outline-none" />
                  </div>
                  <div>
                    <span className="block font-semibold text-ink mb-2">IFSC Code</span>
                    <input name="ifsc_code" value={form.ifsc_code} readOnly className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-surface-2 text-ink-secondary outline-none" />
                  </div>
                  <div>
                    <span className="block font-semibold text-ink mb-2">Account No</span>
                    <input name="account_no" value={form.account_no} readOnly className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-surface-2 text-ink-secondary outline-none" />
                  </div>
                  <div>
                    <span className="block font-semibold text-ink mb-2">Branch Name</span>
                    <input name="branch" value={form.branch} readOnly className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-surface-2 text-ink-secondary outline-none" />
                  </div>
                  <div>
                    <span className="block font-semibold text-ink mb-2">Pincode</span>
                    <input name="pincode" value={form.pincode} readOnly className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-surface-2 text-ink-secondary outline-none" />
                  </div>
                  <div>
                    <span className="block font-semibold text-ink mb-2">Transaction ID</span>
                    <input name="transaction_id_1"
                      value={form.transaction_id_1}
                      onChange={(e) => setForm((prev) => ({ ...prev, transaction_id_1: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <span className="block font-semibold text-ink mb-2">Bank Name Input</span>
                    <input name="bank_name_new"
                      value={form.bank_name_new}
                      onChange={(e) => setForm((prev) => ({ ...prev, bank_name_new: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {form.transaction_type === "3" ? (
              <div className="mt-6 border border-line rounded-xl bg-[#fcfbf5] p-5">
                <p className="text-[12px] font-bold text-[#5b641d] mb-4 uppercase tracking-wide">UPI Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-[13px]">
                  <div>
                    <span className="block font-semibold text-ink mb-2">Online Method</span>
                    <SearchableSelectInput name="online_type"
                      value={form.online_type}
                      onChange={(e) => setForm((prev) => ({ ...prev, online_type: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    >
                      <option value="">Select method</option>
                      <option value="1">Google Pay</option>
                      <option value="2">PhonePe</option>
                      <option value="3">Paytm</option>
                    </SearchableSelectInput>
                  </div>
                  <div>
                    <span className="block font-semibold text-ink mb-2">UPI ID</span>
                    <input name="upi_id"
                      value={form.upi_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, upi_id: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <span className="block font-semibold text-ink mb-2">Mobile Number</span>
                    <input name="upi_mobile"
                      value={form.upi_mobile}
                      maxLength={10}
                      onChange={(e) => setForm((prev) => ({ ...prev, upi_mobile: e.target.value.replace(/\D/g, "") }))}
                      className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <span className="block font-semibold text-ink mb-2">Transaction ID</span>
                    <input name="transaction_id_2"
                      value={form.transaction_id_2}
                      onChange={(e) => setForm((prev) => ({ ...prev, transaction_id_2: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-line-dark rounded-lg bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-white border border-line-dark text-ink-secondary
                text-[13px] font-semibold rounded-lg hover:border-brand-500 hover:text-brand-500
                transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSubmit}
              className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-[13px]
                font-semibold rounded-lg border-0 cursor-pointer transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingSubmit && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {savingSubmit ? "Saving..." : "Submit"}
            </button>
          </div>

        </form>
        )}
      </div>
    </div>
  );
}


