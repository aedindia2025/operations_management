import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  assignConsigneeStock,
  fetchConsigneePopupData,
  fetchConsigneeStockDetail,
} from "../../api/consigneeStockApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type ItemRow = { sno: number; itemCode: string; itemDetails?: string; partNo: string; availableQty: number; netPrice: number; totalValue: number; productUniqueId?: string };
type InvoiceRow = { sno: number; uniqueId?: string; assignId: string; assignDate: string; dcNo: string; dcDate: string; invoiceNo: string; invoiceDate: string; followedBy: string; consigneeDetails: string; invoiceQty: number; invoiceValue: number };
type Option = { value: string; label: string };
type PopupRow = { sno: number; itemCode: string; itemDetails: string; assignQty: number; assignRemainingQty: number; availableStock: number; billQty: number; meta: Record<string, any> };
type DetailData = {
  customerName: string; customerAddress: string; customerPhone: string; customerEmail: string;
  stockId: string; stockDate: string; poNumber: string; poDate: string; executiveName: string;
  noOfConsignee: number; noOfItems: number; stockQty: number; netValue: number; assignQty: number;
  items: ItemRow[]; invoices: InvoiceRow[]; consigneeOptions: Option[];
};
type PopupData = { consigneeName: string; contactNo: string; address: string; billingAddress: string; batchId: string; followedBy: string; items: PopupRow[] };

const EMPTY_DETAIL: DetailData = {
  customerName: "", customerAddress: "", customerPhone: "--", customerEmail: "--", stockId: "", stockDate: "",
  poNumber: "", poDate: "", executiveName: "", noOfConsignee: 0, noOfItems: 0, stockQty: 0, netValue: 0, assignQty: 0,
  items: [], invoices: [], consigneeOptions: [],
};

const EMPTY_POPUP: PopupData = { consigneeName: "", contactNo: "", address: "", billingAddress: "", batchId: "", followedBy: "", items: [] };
const formatINR = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toNumber = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };

export default function ConsigneeStockForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id") || "";
  const stockId = params.get("stock_id") || "";
  const viewMode = params.get("mode") === "view";
  const [data, setData] = useState<DetailData>(EMPTY_DETAIL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedConsignee, setSelectedConsignee] = useState("");
  const [popup, setPopup] = useState<PopupData>(EMPTY_POPUP);

  const consigneeOptions = useMemo(() => {
    const seen = new Set<string>();
    return data.consigneeOptions.filter((option) => {
      const key = String(option.value || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data.consigneeOptions]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!id || !stockId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetchConsigneeStockDetail(id, stockId);
        if (!active) return;
        setData({ ...EMPTY_DETAIL, ...(res?.data || {}) });
      } catch (error: any) {
        if (active) await showErrorAlert(error?.response?.data?.message || error?.message || "Failed to load consignee stock detail.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [id, stockId]);

  const openPopup = () => {
    setSelectedConsignee("");
    setPopup(EMPTY_POPUP);
    setShowAssignModal(true);
  };

  const loadConsignee = async (value: string) => {
    setSelectedConsignee(value);
    if (!value) {
      setPopup(EMPTY_POPUP);
      return;
    }
    try {
      const res = await fetchConsigneePopupData({ form_main_unique_id: id, stock_id: stockId, consignee_id: value });
      setPopup({ ...EMPTY_POPUP, ...(res?.data || {}) });
    } catch (error: any) {
      await showErrorAlert(error?.response?.data?.message || error?.message || "Failed to load consignee details.");
    }
  };

  const onBillQtyChange = (index: number, value: string) => {
    const entered = Math.max(0, Math.floor(toNumber(value)));
    setPopup((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => i !== index ? row : { ...row, billQty: Math.min(entered, row.availableStock, row.assignRemainingQty) }),
    }));
  };

  const totalBillQty = useMemo(() => popup.items.reduce((sum, row) => sum + toNumber(row.billQty), 0), [popup.items]);

  const onAssignStock = async () => {
    if (!selectedConsignee) return showErrorAlert("Please select consignee name/branch.");
    if (!popup.items.some((row) => toNumber(row.billQty) > 0)) return showErrorAlert("Please enter at least one bill quantity.");
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem("otm_user") || "{}");
      const res = await assignConsigneeStock({
        unique_id: id,
        stock_id: stockId,
        consignee_id: selectedConsignee,
        rows: popup.items,
        sess_user_type: user?.user_type_unique_id || "",
        sess_user_id: user?.staff_id || user?.user_id || "",
        sess_company_id: user?.sess_company_id || "",
        sess_branch_id: user?.sess_branch_id || "",
        session_id: user?.session_id || "",
        acc_year: user?.acc_year || "",
      });
      if (!res?.status) throw new Error(res?.message || "Failed to assign stock.");
      await showSuccessAlert("Assign stock saved successfully.");
      setShowAssignModal(false);
      const detail = await fetchConsigneeStockDetail(id, stockId);
      setData({ ...EMPTY_DETAIL, ...(detail?.data || {}) });
    } catch (error: any) {
      await showErrorAlert(error?.response?.data?.message || error?.message || "Failed to assign stock.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-ink-secondary">Loading...</div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
      <PageTopbar title="Consignee Stock Assign" breadcrumbs={["Stores", "Consignee Stock Assign"]} />
      <div className="overflow-hidden rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
        <div className="grid grid-cols-1 gap-8 border-b border-[#e6eadb] bg-[linear-gradient(135deg,#fbfcf7_0%,#f3f6e8_100%)] px-7 py-7 xl:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold text-ink-muted tracking-widest uppercase mb-1">Customer Details</p>
            <h2 className="font-bold text-brand-700 text-[20px] leading-snug mb-1">{data.customerName || "-"}</h2>
            <p className="text-[12.5px] text-ink-secondary whitespace-pre-line leading-relaxed mb-2">{data.customerAddress || "-"}</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary"><i className="fa fa-phone text-[11px] text-ink-muted w-4" />{data.customerPhone || "--"}</div>
              <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary"><i className="fa fa-envelope text-[11px] text-ink-muted w-4" />{data.customerEmail || "--"}</div>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-ink-muted tracking-widest uppercase mb-3">Stock Details</p>
            {[["Stock ID", data.stockId], ["Stock Date", data.stockDate], ["PO Number", data.poNumber], ["PO Date", data.poDate], ["Executive Name", data.executiveName]].map(([label, value]) => (
              <div key={label} className="flex items-start gap-2 mb-2"><span className="text-[12.5px] text-ink-secondary w-36">{label}</span><span className="text-[12.5px] text-ink-muted mr-2">:</span><span className="text-[12.5px] font-semibold text-ink">{value || "-"}</span></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 border-b border-[#e6eadb] bg-white px-7 py-6 md:grid-cols-5">
          {[["No.Of Consignee", data.noOfConsignee], ["No.Of Items", data.noOfItems], ["Stock QTY", data.stockQty], ["Net Value", formatINR(data.netValue)], ["Assign Qty", data.assignQty]].map(([label, value]) => (
            <div key={String(label)}><p className="text-[12px] text-ink-muted mb-1">{label}</p><p className="text-[15px] font-bold text-ink">{value}</p></div>
          ))}
        </div>

        <div className="border-b border-[#e6eadb] px-7 py-6">
          <div className="overflow-x-auto">
            <table className="w-full overflow-hidden rounded-[24px] border border-[#e5e8d7] text-[13px] shadow-[0_18px_35px_rgba(46,61,24,0.06)]">
              <thead><tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#edf3df_100%)]">{["S.No", "Item Code", "Part No", "Available QTY", "Net price", "Total Value"].map((h) => <th key={h} className="border border-[#e5e8d7] px-4 py-3 text-center font-bold text-[#42551d] whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{data.items.length === 0 ? <tr><td colSpan={6} className="border border-[#e5e8d7] py-8 text-center italic text-ink-muted">No data available in table</td></tr> : data.items.map((item) => (
                <tr key={`${item.sno}-${item.itemCode}`} className="hover:bg-[#f7faf1]">
                  <td className="border border-[#edf1e4] px-4 py-3 text-center">{item.sno}</td>
                  <td className="border border-[#edf1e4] px-4 py-3"><div className="font-semibold">{item.itemCode}</div><div className="text-[11px] text-ink-muted">{item.itemDetails || ""}</div></td>
                  <td className="border border-[#edf1e4] px-4 py-3 text-right">{item.partNo}</td>
                  <td className="border border-[#edf1e4] px-4 py-3 text-right">{item.availableQty}</td>
                  <td className="border border-[#edf1e4] px-4 py-3 text-right">{formatINR(item.netPrice)}</td>
                  <td className="border border-[#edf1e4] px-4 py-3 text-right">{formatINR(item.totalValue)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="border-b border-[#e6eadb] px-7 py-6">
          <h3 className="text-[15px] font-bold text-gray-800 mb-3">Invoice Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full overflow-hidden rounded-[24px] border border-[#e5e8d7] text-[12px] shadow-[0_18px_35px_rgba(46,61,24,0.06)]">
              <thead><tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#edf3df_100%)]">{["S.No", "Assign ID/ Date", "DC No.", "Invoice No.", "Followed By Team Member", "Consignee Details", "Invoice QTY", "Invoice Value", "Action"].map((h) => <th key={h} className="border border-[#e5e8d7] px-3 py-3 text-center font-bold text-[#42551d] whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{data.invoices.length === 0 ? <tr><td colSpan={9} className="border border-[#e5e8d7] py-8 text-center italic text-ink-muted">No data available in table</td></tr> : data.invoices.map((inv) => (
                <tr key={`${inv.uniqueId || inv.sno}`} className="hover:bg-[#f7faf1]">
                  <td className="border border-[#edf1e4] px-3 py-3 text-center">{inv.sno}</td>
                  <td className="border border-[#edf1e4] px-3 py-3"><div className="font-medium">{inv.assignId}</div><div className="text-[11px] text-gray-500">{inv.assignDate}</div></td>
                  <td className="border border-[#edf1e4] px-3 py-3"><div>{inv.dcNo}</div><div className="text-[11px] text-gray-500">{inv.dcDate}</div></td>
                  <td className="border border-[#edf1e4] px-3 py-3"><div>{inv.invoiceNo}</div><div className="text-[11px] text-gray-500">{inv.invoiceDate}</div></td>
                  <td className="border border-[#edf1e4] px-3 py-3 text-center">{inv.followedBy}</td>
                  <td className="border border-[#edf1e4] px-3 py-3 max-w-[320px] whitespace-pre-line">{inv.consigneeDetails}</td>
                  <td className="border border-[#edf1e4] px-3 py-3 text-center">{inv.invoiceQty}</td>
                  <td className="border border-[#edf1e4] px-3 py-3 text-right">{formatINR(inv.invoiceValue)}</td>
                  <td className="border border-[#edf1e4] px-3 py-3 text-center">-</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 bg-[#fafbf7] px-7 py-5">
          <button onClick={() => navigate(-1)} className="rounded-2xl bg-[#ff6b4a] px-6 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(255,107,74,0.24)] transition-colors hover:bg-[#f05531]">Cancel</button>
          {!viewMode ? <button onClick={openPopup} className="rounded-2xl bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(79,122,43,0.24)] transition-transform hover:-translate-y-0.5">Assign Consignee Qty</button> : null}
        </div>
      </div>

      {!viewMode && showAssignModal ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-[#e5e8d7] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between border-b border-[#e6eadb] bg-[linear-gradient(135deg,#fbfcf7_0%,#f1f5e4_100%)] px-6 py-4"><h3 className="w-full text-center text-[16px] font-bold text-ink">Consignee Assign Stock</h3><button type="button" onClick={() => setShowAssignModal(false)} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#d8dec8] text-[#6e7754] hover:bg-[#f6f8f1]"><i className="fa fa-xmark" /></button></div>
            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Consignee Name/Branch</span>
                  <SearchableSelectInput name="selectedconsignee" value={selectedConsignee} onChange={(e) => void loadConsignee(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500">
                    <option value="">Select consignee</option>
                    {consigneeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SearchableSelectInput>
                </div>
                <div className="text-[12.5px] text-ink-secondary space-y-2">
                  <div><span className="font-semibold">Name:</span> {popup.consigneeName || "-"}</div>
                  <div><span className="font-semibold">Contact No:</span> {popup.contactNo || "-"}</div>
                  <div><span className="font-semibold">Address:</span> {popup.address || "-"}</div>
                </div>
                <div className="text-[12.5px] text-ink-secondary space-y-2">
                  <div><span className="font-semibold">Stock ID:</span> {data.stockId || "-"}</div>
                  <div><span className="font-semibold">Stock Date:</span> {data.stockDate || "-"}</div>
                  <div><span className="font-semibold">Batch ID:</span> {popup.batchId || "-"}</div>
                  <div><span className="font-semibold">Followed By:</span> {popup.followedBy || "-"}</div>
                </div>
              </div>
              <div><span className="block text-[12px] font-semibold text-ink-secondary mb-1">Billing Address</span><div className="text-[13px] text-ink whitespace-pre-line">{popup.billingAddress || "-"}</div></div>
              <div className="overflow-x-auto border border-line rounded-lg">
                <table className="w-full text-[12.5px] border-collapse">
                  <thead><tr className="bg-surface-2">{["S.No", "Item Details", "Assign Con. Qty", "Assign Remaining Con. Qty", "Available Stock", "Bill QTY"].map((h) => <th key={h} className="px-3 py-2 text-center border border-line-dark font-semibold text-ink">{h}</th>)}</tr></thead>
                  <tbody>{popup.items.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-ink-muted italic border border-line">No data available in table</td></tr> : popup.items.map((row, index) => (
                    <tr key={`${row.sno}-${row.itemCode}`} className="hover:bg-brand-50/30">
                      <td className="px-3 py-2 text-center border border-line">{row.sno}</td>
                      <td className="px-3 py-2 border border-line"><div className="font-semibold text-ink">{row.itemCode}</div><div className="text-[11px] text-ink-muted">{row.itemDetails}</div></td>
                      <td className="px-3 py-2 text-center border border-line">{row.assignQty}</td>
                      <td className="px-3 py-2 text-center border border-line">{row.assignRemainingQty}</td>
                      <td className="px-3 py-2 text-center border border-line">{row.availableStock}</td>
                      <td className="px-3 py-2 text-center border border-line"><input name="billqty" type="number" min={0} max={Math.min(row.availableStock, row.assignRemainingQty)} value={row.billQty} onChange={(e) => onBillQtyChange(index, e.target.value)} className="w-24 px-2 py-1 text-center border border-line-dark rounded outline-none focus:border-brand-500" /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="text-right text-[12px] text-ink-secondary">Total Bill Qty: {totalBillQty}</div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[#e6eadb] bg-[#fafbf7] px-6 py-4">
              <button type="button" onClick={() => setShowAssignModal(false)} className="rounded-2xl bg-[#ff6b4a] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(255,107,74,0.22)] transition-colors hover:bg-[#f05531]">Close</button>
              <button type="button" disabled={saving} onClick={() => void onAssignStock()} className="rounded-2xl bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(79,122,43,0.22)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">{saving ? "Saving..." : "Assign Stock"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

