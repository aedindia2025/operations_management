import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchVendorBillPendingDetail,
  type VendorBillPendingDetailRow,
  type VendorBillSummary,
} from "../../api/vendorBillCreationApi";
import { showErrorAlert, showWarningAlert } from "../../utils/alerts";

function formatMoney(value: number) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value: number) {
  return `\u20B9${formatMoney(value)}`;
}

function formatQty(value: number) {
  const amount = Number(value || 0);
  if (Number.isInteger(amount)) return String(amount);
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function normalizeLines(value?: string) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildDescription(row: VendorBillPendingDetailRow) {
  const addressLines = normalizeLines(row.consignee_address);
  const reference = firstNonEmpty(row.dc_number, row.po_num, row.invoice_no);
  if (addressLines.length === 0 && !reference) return "-";
  const lines = [...addressLines];
  if (reference) lines.push(`(${reference})`);
  return lines;
}

export default function VendorBillInvoicePreviewPage() {
  const [searchParams] = useSearchParams();
  const vendorId = String(searchParams.get("vendor_id") ?? "").trim();
  const selectedIds = useMemo(
    () => String(searchParams.get("selected_ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    [searchParams],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const requestedInvoiceNo = String(searchParams.get("generated_vendor_invoice_id") ?? "").trim();
  const requestedInvoiceDate = String(searchParams.get("invoice_issue_date") ?? "").trim();
  const additionalCharges = parseAmountInput(String(searchParams.get("additional_charges") ?? "0"));

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<VendorBillSummary | null>(null);
  const [rows, setRows] = useState<VendorBillPendingDetailRow[]>([]);
  const [generatedInvoiceNo, setGeneratedInvoiceNo] = useState(requestedInvoiceNo);
  const [invoiceIssueDate, setInvoiceIssueDate] = useState(requestedInvoiceDate);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!vendorId) {
        setLoading(false);
        await showWarningAlert("Vendor invoice preview is missing vendor details.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetchVendorBillPendingDetail(vendorId);
        if (!active) return;

        const allRows = Array.isArray(res?.rows) ? res.rows : [];
        const filteredRows = selectedIdSet.size > 0
          ? allRows.filter((row) => selectedIdSet.has(row.unique_id))
          : allRows;

        setSummary(res?.summary ?? null);
        setRows(filteredRows);
        setGeneratedInvoiceNo(requestedInvoiceNo || res?.generated_vendor_invoice_id || "-");
        setInvoiceIssueDate(requestedInvoiceDate || res?.invoice_issue_date || getTodayInputValue());

        if (filteredRows.length === 0) {
          await showWarningAlert("No selected invoice rows were found for this vendor.");
        }
      } catch (error) {
        if (!active) return;
        setSummary(null);
        setRows([]);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load vendor invoice preview.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [requestedInvoiceDate, requestedInvoiceNo, selectedIdSet, vendorId]);

  const vendorName = summary?.company_name || rows[0]?.vendor_company_name || "-";
  const vendorAddressLines = normalizeLines(summary?.address);
  const billToLines = normalizeLines(rows.find((row) => row.consignee_address?.trim())?.consignee_address || "");
  const totalQty = rows.reduce((sum, row) => sum + Number(row.invoice_qty || 0), 0);
  const totalBasicAmount = rows.reduce((sum, row) => sum + Number(row.basic_amount || 0), 0);
  const totalGstAmount = rows.reduce((sum, row) => sum + Number(row.gst_amount || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const grandTotal = Number((totalAmount + additionalCharges).toFixed(2));

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        @media print {
          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .vendor-invoice-print-root,
          .vendor-invoice-print-root * {
            visibility: visible !important;
          }

          .vendor-invoice-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }

          .vendor-invoice-screen-only {
            display: none !important;
          }

          .vendor-invoice-paper {
            border: 0 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="px-4 py-6 lg:px-7">
        <div className="vendor-invoice-print-root mx-auto max-w-[1540px] rounded-[4px] border border-[#dddcc9] bg-white px-5 py-5 shadow-sm">
          <div className="vendor-invoice-screen-only mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-[4px] bg-[#6b7b18] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#5a6814]"
            >
              Download Invoice
            </button>
          </div>

          {loading ? (
            <div className="py-24 text-center text-[15px] text-ink-secondary">Loading invoice preview...</div>
          ) : rows.length === 0 ? (
            <div className="py-24 text-center text-[15px] text-ink-secondary">No invoice rows available for preview.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="vendor-invoice-paper mx-auto min-w-[960px] max-w-[1120px] bg-white px-5 pb-8 pt-2 text-[#111827]">
                <h1 className="mb-8 text-center text-[34px] font-medium tracking-[0.01em] text-[#3b506d]">Invoice</h1>

                <div className="mb-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="text-[15px] leading-[1.55] text-[#111]">
                    <div className="text-[18px] font-bold uppercase">{vendorName}</div>
                    {vendorAddressLines.length ? vendorAddressLines.map((line) => <div key={line}>{line}</div>) : <div>-</div>}
                    {summary?.contact_no ? <div>{summary.contact_no}</div> : null}
                    <div><span className="font-bold">GST NO:</span> {summary?.gst_no || "-"}</div>
                    <div><span className="font-bold">PAN NO:</span> {summary?.pan_no || "-"}</div>
                  </div>

                  <div className="self-start text-[15px] font-bold leading-10 text-[#111]">
                    <div className="grid grid-cols-[110px_14px_1fr]">
                      <span>DATE</span>
                      <span>:</span>
                      <span>{formatDateLabel(invoiceIssueDate)}</span>
                    </div>
                    <div className="grid grid-cols-[110px_14px_1fr]">
                      <span>INVOICE NO</span>
                      <span>:</span>
                      <span>{generatedInvoiceNo || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-8 text-[15px] leading-[1.55] text-[#111]">
                  <div className="mb-1 font-bold uppercase">BILL TO,</div>
                  {billToLines.length ? billToLines.map((line) => <div key={line}>{line}</div>) : <div>-</div>}
                </div>

                <table className="w-full border-collapse text-[14px] text-[#111]">
                  <thead>
                    <tr>
                      <th className="border border-black px-3 py-3 text-center font-bold" style={{ width: 70 }}>S NO</th>
                      <th className="border border-black px-3 py-3 text-left font-bold">Description</th>
                      <th className="border border-black px-3 py-3 text-right font-bold" style={{ width: 96 }}>Qty</th>
                      <th className="border border-black px-3 py-3 text-right font-bold" style={{ width: 132 }}>Unit Price</th>
                      <th className="border border-black px-3 py-3 text-right font-bold" style={{ width: 152 }}>Basic Amount</th>
                      <th className="border border-black px-3 py-3 text-right font-bold" style={{ width: 108 }}>GST %</th>
                      <th className="border border-black px-3 py-3 text-right font-bold" style={{ width: 152 }}>GST Amount</th>
                      <th className="border border-black px-3 py-3 text-right font-bold" style={{ width: 160 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const descriptionLines = buildDescription(row);
                      return (
                        <tr key={`${row.unique_id}-${row.dc_number || index}`}>
                          <td className="border border-black px-3 py-3 text-center align-top">{index + 1}</td>
                          <td className="border border-black px-3 py-3 align-top leading-[1.45]">
                            {Array.isArray(descriptionLines)
                              ? descriptionLines.map((line) => <div key={`${row.unique_id}-${line}`}>{line}</div>)
                              : descriptionLines}
                          </td>
                          <td className="border border-black px-3 py-3 text-right align-top">{formatQty(Number(row.invoice_qty || 0))}</td>
                          <td className="border border-black px-3 py-3 text-right align-top">{formatMoney(Number(row.rate || 0))}</td>
                          <td className="border border-black px-3 py-3 text-right align-top">{formatMoney(Number(row.basic_amount || 0))}</td>
                          <td className="border border-black px-3 py-3 text-right align-top">{formatQty(Number(row.gst || 0))}%</td>
                          <td className="border border-black px-3 py-3 text-right align-top">{formatMoney(Number(row.gst_amount || 0))}</td>
                          <td className="border border-black px-3 py-3 text-right align-top">{formatCurrency(Number(row.total_amount || 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="border border-black px-3 py-3 text-right font-bold uppercase">TOTAL:</td>
                      <td className="border border-black px-3 py-3 text-center font-bold">{formatQty(totalQty)}</td>
                      <td className="border border-black px-3 py-3"></td>
                      <td className="border border-black px-3 py-3 text-right font-bold">{formatMoney(totalBasicAmount)}</td>
                      <td className="border border-black px-3 py-3"></td>
                      <td className="border border-black px-3 py-3 text-right font-bold">{formatMoney(totalGstAmount)}</td>
                      <td className="border border-black px-3 py-3 text-right font-bold">{formatCurrency(totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="text-[15px] leading-[1.6] text-[#111]">
                    <div className="mb-2 text-[15px] font-bold uppercase">ACCOUNT DETAILS:</div>
                    <div>{summary?.bank_name || "-"}</div>
                    <div>A/C NO: {summary?.account_no || "-"}</div>
                    <div>IFSC : {summary?.ifsc_code || "-"}</div>
                    <div>BRANCH : {summary?.branch_name || "-"}</div>
                    <div>ACCOUNT HOLDER : {summary?.acc_holder_name || "-"}</div>
                  </div>

                  {additionalCharges > 0 ? (
                    <div className="text-[15px] leading-8 text-[#111]">
                      <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#d6d6d6] pb-2">
                        <span className="font-medium">Selected Total</span>
                        <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                      </div>
                      <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#d6d6d6] py-2">
                        <span className="font-medium">Additional Charges</span>
                        <span className="font-semibold">{formatCurrency(additionalCharges)}</span>
                      </div>
                      <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 text-[16px]">
                        <span className="font-bold">Grand Total</span>
                        <span className="font-bold">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-20 text-right text-[15px] font-semibold text-[#111]">Authorised Signatory</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
