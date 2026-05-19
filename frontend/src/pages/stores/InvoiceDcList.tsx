import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import { deleteInvoice, fetchInvoiceList, type InvoiceRow, type InvoiceTab } from "../../api/invoiceApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { subscribeWorkflowSignal } from "../../utils/workflowSignals";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

const tabs: { key: InvoiceTab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
];

const money = (value: string | number) =>
  Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayInputValue = () => {
  const today = new Date();
  const offsetMs = today.getTimezoneOffset() * 60 * 1000;
  return new Date(today.getTime() - offsetMs).toISOString().slice(0, 10);
};

const ALL_COLS = [
  "S.No",
  "PO No",
  "Stock No",
  "DC Number",
  "Invoice No",
  "Customer Details",
  "Billing Address",
  "Billing Gst No",
  "Consignee Address",
  "Branch",
  "Branch Code",
  "District",
  "Zone",
  "State",
  "Pincode",
  "Contact Name",
  "Contact Number",
  "Alternate Contact Name",
  "Alternate Contact Number",
  "Consignee GST No",
  "Executive",
  "Assign Qty",
  "Remaining Qty",
  "Bill Qty",
  "Balance Qty",
  "Value",
  "Doc Approval",
  "A/C Approval",
  "Verify Status",
  "Reject Reason",
  "Action",
] as const;

const QUANTITY_COLS = ["Assign Qty", "Remaining Qty", "Bill Qty", "Balance Qty"] as const;

const statusClasses: Record<string, string> = {
  Pending: "text-warning",
  Approved: "text-success",
  Rejected: "text-danger",
  Completed: "text-info",
  Verified: "text-success",
};

export default function InvoiceDcList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<InvoiceTab>("pending");
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(ALL_COLS));
  const [colDropOpen, setColDropOpen] = useState(false);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const col = (name: string) => visibleCols.has(name);
  const showRejectReason = activeTab !== "completed";
  const visibleColumnOptions = showRejectReason ? ALL_COLS : ALL_COLS.filter((name) => name !== "Reject Reason");
  const toggleCol = (name: string) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  useEffect(() => {
    const syncWidth = () => setTableScrollWidth(tableRef.current?.scrollWidth || 0);
    syncWidth();
    window.addEventListener("resize", syncWidth);
    return () => window.removeEventListener("resize", syncWidth);
  }, [rows, visibleCols, length, curPage, activeTab]);

  const syncFromTable = () => {
    if (!tableWrapRef.current || !bottomScrollRef.current) return;
    if (bottomScrollRef.current.scrollLeft !== tableWrapRef.current.scrollLeft) {
      bottomScrollRef.current.scrollLeft = tableWrapRef.current.scrollLeft;
    }
  };

  const syncFromBottom = () => {
    if (!tableWrapRef.current || !bottomScrollRef.current) return;
    if (tableWrapRef.current.scrollLeft !== bottomScrollRef.current.scrollLeft) {
      tableWrapRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchInvoiceList({
          tab: activeTab,
          search: "",
          from_date: appliedFromDate,
          to_date: appliedToDate,
        });
        if (mounted) {
          setRows(res.data || []);
          setCurPage(1);
        }
      } catch {
        if (mounted) {
          setRows([]);
          await showErrorAlert("Failed to load invoice list.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [activeTab, appliedFromDate, appliedToDate, refreshKey]);

  useEffect(() => {
    if (activeTab !== "pending") return;

    return subscribeWorkflowSignal("invoice-dc-pending-refresh", () => {
      setRefreshKey((prev) => prev + 1);
    });
  }, [activeTab]);

  const handleDelete = async (row: InvoiceRow) => {
    const confirmed = await showConfirmAlert(`Delete invoice stage for ${row.po_num || row.stock_id || "this record"}?`);
    if (!confirmed) return;
    try {
      const res = await deleteInvoice(row.unique_id);
      if (!res?.status) throw new Error(res?.message || "Failed to delete invoice record.");
      await showSuccessAlert("Invoice moved back to consignee stock assign pending.");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to delete invoice record.");
    }
  };

  const filtered = rows.filter((row) => {
    const q = tableSearch.toLowerCase();
    return (
      (row.po_num || "").toLowerCase().includes(q) ||
      (row.stock_id || "").toLowerCase().includes(q) ||
      (row.customer_name || "").toLowerCase().includes(q) ||
      (row.consignee_name || "").toLowerCase().includes(q) ||
      (row.consignee_address || "").toLowerCase().includes(q) ||
      (row.contact_number || "").toLowerCase().includes(q) ||
      (row.invoice_no || "").toLowerCase().includes(q) ||
      (row.dc_number || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / length));
  const paged = filtered.slice((curPage - 1) * length, curPage * length);
  const tabCls = "rounded-t-[22px] border border-b-0 px-5 py-3 text-[13px] font-semibold transition-all";
  const quantityColSpan = QUANTITY_COLS.filter((name) => col(name)).length;
  const pageNums = getPaginationItems(curPage, totalPages);

  const verifyText = (row: InvoiceRow) => {
    if (activeTab === "pending") {
      return String(row.consignee_verify_status || "0") === "1" ? "Approved" : "Pending";
    }
    return row.invoice_doc_status_label || row.status || "Completed";
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f4f6ef_34%,#eef2e9_100%)] p-6">
      <PageTopbar title="Invoice and DC List" breadcrumbs={["Stores", "Invoice and DC"]} />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.10)]">
        <div className="flex gap-2 border-b border-[#e4e8d7] px-6 pt-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                const defaultDate = tab.key === "completed" ? todayInputValue() : "";
                setActiveTab(tab.key);
                setCurPage(1);
                setTableSearch("");
                setFromDate(defaultDate);
                setToDate(defaultDate);
                setAppliedFromDate(defaultDate);
                setAppliedToDate(defaultDate);
              }}
              className={`${tabCls} cursor-pointer ${
                activeTab === tab.key
                  ? "border-[#6d8d31] bg-[linear-gradient(135deg,#739436_0%,#5f8128_100%)] text-white shadow-[0_14px_28px_rgba(95,129,40,0.22)]"
                  : "border-[#e4e8d7] bg-white text-[#63704a] hover:border-[#cad3b3] hover:text-[#42551d]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-5 bg-[linear-gradient(180deg,#f7f8f1_0%,#ffffff_18%)] p-5 md:p-6">
          <div className="flex flex-wrap items-end gap-4 rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">From Date</span>
              <input name="fromdate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-11 w-[190px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10"
              />
            </div>
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">To Date</span>
              <input name="todate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-11 w-[190px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setAppliedFromDate(fromDate);
                setAppliedToDate(toDate);
                setCurPage(1);
              }}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-8 text-[14px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(79,122,43,0.28)]"
            >
              Go
            </button>
          </div>

          <SettingsListToolbar
            length={length}
            setLength={(value) => {
              setLength(value);
              setCurPage(1);
            }}
            search={tableSearch}
            setSearch={(value) => {
              setTableSearch(value);
              setCurPage(1);
            }}
            tableRef={tableRef}
            searchPlaceholder="Search PO, stock, consignee, invoice..."
            showColumnButton={false}
            rightSlot={
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColDropOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#dcc98e] bg-white px-4 py-2 font-semibold text-[#5b641d] shadow-sm transition-colors hover:bg-[#faf4df]"
                >
                  <i className="fa fa-table-columns text-[12px]" />
                  Column Visibility
                  <i className="fa fa-chevron-down text-[10px]" />
                </button>
                {colDropOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 max-h-[420px] min-w-[240px] overflow-auto rounded-[22px] border border-[#e5e8d7] bg-white p-3 shadow-[0_18px_40px_rgba(46,61,24,0.18)]">
                    {visibleColumnOptions.map((name) => (
                      <label
                        key={name}
                        className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-[13px] text-ink transition-colors hover:bg-[#f6f8f1] hover:text-brand-600 select-none"
                      >
                        <input name="invoicedclist_input_282"
                          type="checkbox"
                          checked={visibleCols.has(name)}
                          onChange={() => toggleCol(name)}
                          className="h-3.5 w-3.5 accent-brand-600"
                        />
                        {name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            }
          />

          <div
            ref={tableWrapRef}
            className="invoice-dc-scroll-host overflow-x-auto rounded-t-[30px] border border-[#e5e8d7] border-b-0 bg-white shadow-[0_20px_38px_rgba(46,61,24,0.08)]"
            onClick={() => colDropOpen && setColDropOpen(false)}
            onScroll={syncFromTable}
          >
            <table ref={tableRef} className="min-w-[2600px] w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)] text-[11px] font-semibold text-ink-secondary uppercase">
                  {col("S.No") && <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark">S.No</th>}
                  {col("PO No") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">PO No</th>}
                  {col("Stock No") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Stock No</th>}
                  {activeTab === "completed" && col("DC Number") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">DC Number</th>}
                  {activeTab === "completed" && col("Invoice No") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Invoice No</th>}
                  {col("Customer Details") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Customer Details</th>}
                  {col("Billing Address") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Billing Address</th>}
                  {col("Billing Gst No") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Billing Gst No</th>}
                  {col("Consignee Address") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Consignee Address</th>}
                  {col("Branch") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Branch</th>}
                  {col("Branch Code") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Branch Code</th>}
                  {col("District") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">District</th>}
                  {col("Zone") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Zone</th>}
                  {col("State") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">State</th>}
                  {col("Pincode") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Pincode</th>}
                  {col("Contact Name") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Contact Name</th>}
                  {col("Contact Number") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Contact Number</th>}
                  {col("Alternate Contact Name") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Alternate Contact Name</th>}
                  {col("Alternate Contact Number") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Alternate Contact Number</th>}
                  {col("Consignee GST No") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Consignee GST No</th>}
                  {col("Executive") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Executive</th>}
                  {quantityColSpan > 0 && <th colSpan={quantityColSpan} className="px-3 py-2.5 text-center border border-line-dark">Quantity</th>}
                  {col("Value") && <th rowSpan={2} className="px-3 py-2.5 text-right border border-line-dark">Value</th>}
                  {activeTab === "completed" && col("Doc Approval") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Doc Approval</th>}
                  {activeTab === "completed" && col("A/C Approval") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">A/C Approval</th>}
                  {col("Verify Status") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Verify Status</th>}
                  {showRejectReason && col("Reject Reason") && <th rowSpan={2} className="px-3 py-2.5 text-left border border-line-dark">Reject Reason</th>}
                  {col("Action") && <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark">Action</th>}
                </tr>
                <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)] text-[11px] font-semibold text-ink-secondary uppercase">
                  {col("Assign Qty") && <th className="px-3 py-2.5 text-center border border-line-dark">Assign</th>}
                  {col("Remaining Qty") && <th className="px-3 py-2.5 text-center border border-line-dark">Remaining</th>}
                  {col("Bill Qty") && <th className="px-3 py-2.5 text-center border border-line-dark">Bill</th>}
                  {col("Balance Qty") && <th className="px-3 py-2.5 text-center border border-line-dark">Balance</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={ALL_COLS.length} className="px-4 py-8 text-center border border-line italic text-ink-muted">
                      Loading...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={ALL_COLS.length} className="px-4 py-8 text-center border border-line italic text-ink-muted">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => {
                    const verifyLabel = verifyText(row);
                    return (
                      <tr key={row.unique_id} className="border-b border-line/50 hover:bg-brand-50/30 transition-colors align-top">
                        {col("S.No") && <td className="px-3 py-2 border-x border-line/50 text-center text-ink-muted">{(curPage - 1) * length + i + 1}</td>}
                        {col("PO No") && (
                          <td className="px-3 py-2 border-x border-line/50 min-w-[170px]">
                            <div className="font-semibold text-ink">{row.po_num || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.po_date || "-"}</div>
                          </td>
                        )}
                        {col("Stock No") && <td className="px-3 py-2 border-x border-line/50 whitespace-nowrap">{row.stock_id || "-"}</td>}
                        {activeTab === "completed" && col("DC Number") && <td className="px-3 py-2 border-x border-line/50 whitespace-nowrap">{row.dc_number || "-"}</td>}
                        {activeTab === "completed" && col("Invoice No") && <td className="px-3 py-2 border-x border-line/50 whitespace-nowrap">{row.invoice_no || "-"}</td>}
                        {col("Customer Details") && (
                          <td className="px-3 py-2 border-x border-line/50 min-w-[260px]">
                            <div className="font-semibold text-ink">{row.customer_name || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.customer_location || "-"}</div>
                          </td>
                        )}
                        {col("Billing Address") && <td className="px-3 py-2 border-x border-line/50 min-w-[220px] whitespace-pre-line">{row.billing_address || "-"}</td>}
                        {col("Billing Gst No") && <td className="px-3 py-2 border-x border-line/50 whitespace-nowrap">{row.billing_gst_no || "-"}</td>}
                        {col("Consignee Address") && (
                          <td className="px-3 py-2 border-x border-line/50 min-w-[240px]">
                            <div className="font-semibold text-ink">{row.consignee_name || "-"}</div>
                            <div className="text-[11px] text-ink-muted whitespace-pre-line">{row.consignee_address || "-"}</div>
                          </td>
                        )}
                        {col("Branch") && <td className="px-3 py-2 border-x border-line/50">{row.branch || "-"}</td>}
                        {col("Branch Code") && <td className="px-3 py-2 border-x border-line/50">{row.branch_code || "-"}</td>}
                        {col("District") && <td className="px-3 py-2 border-x border-line/50">{row.district_name || "-"}</td>}
                        {col("Zone") && <td className="px-3 py-2 border-x border-line/50">{row.zone || "-"}</td>}
                        {col("State") && <td className="px-3 py-2 border-x border-line/50">{row.state_name || "-"}</td>}
                        {col("Pincode") && <td className="px-3 py-2 border-x border-line/50">{row.pincode || "-"}</td>}
                        {col("Contact Name") && <td className="px-3 py-2 border-x border-line/50">{row.contact_name || "-"}</td>}
                        {col("Contact Number") && <td className="px-3 py-2 border-x border-line/50">{row.contact_number || "-"}</td>}
                        {col("Alternate Contact Name") && <td className="px-3 py-2 border-x border-line/50">{row.alternate_contact_name || "-"}</td>}
                        {col("Alternate Contact Number") && <td className="px-3 py-2 border-x border-line/50">{row.alternate_contact_number || "-"}</td>}
                        {col("Consignee GST No") && <td className="px-3 py-2 border-x border-line/50">{row.consignee_gst_no || "-"}</td>}
                        {col("Executive") && (
                          <td className="px-3 py-2 border-x border-line/50 min-w-[160px]">
                            <div className="font-semibold text-ink">{row.executive_display || row.executive_name || "-"}</div>
                          </td>
                        )}
                        {col("Assign Qty") && <td className="px-3 py-2 border-x border-line/50 text-center">{row.assign_qty ?? 0}</td>}
                        {col("Remaining Qty") && <td className="px-3 py-2 border-x border-line/50 text-center">{row.remaining_qty ?? 0}</td>}
                        {col("Bill Qty") && <td className="px-3 py-2 border-x border-line/50 text-center">{row.bill_qty ?? row.invoice_qty ?? 0}</td>}
                        {col("Balance Qty") && <td className="px-3 py-2 border-x border-line/50 text-center">{row.balance_qty ?? row.remaining_qty ?? 0}</td>}
                        {col("Value") && <td className="px-3 py-2 border-x border-line/50 text-right font-medium whitespace-nowrap">{money(row.invoice_value)}</td>}
                        {activeTab === "completed" && col("Doc Approval") && (
                          <td className="px-3 py-2 border-x border-line/50 min-w-[180px]">{row.doc_approval_status || "-"}</td>
                        )}
                        {activeTab === "completed" && col("A/C Approval") && (
                          <td className="px-3 py-2 border-x border-line/50 min-w-[180px]">{row.ac_approval_status || "-"}</td>
                        )}
                        {col("Verify Status") && (
                          <td className="px-3 py-2 border-x border-line/50 min-w-[120px]">
                            <span className={`font-semibold ${statusClasses[verifyLabel] || "text-ink"}`}>{verifyLabel}</span>
                          </td>
                        )}
                        {showRejectReason && col("Reject Reason") && <td className="px-3 py-2 border-x border-line/50 min-w-[180px]">{row.reject_reason_elcot || "-"}</td>}
                        {col("Action") && (
                          <td className="px-3 py-2 border-x border-line/50 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() =>
                                  navigate(
                                    activeTab === "completed"
                                      ? `/stores/invoice-dc/form?id=${row.unique_id}&mode=view`
                                      : `/stores/invoice-dc/form?id=${row.unique_id}`,
                                  )
                                }
                                className="w-8 h-8 inline-flex items-center justify-center rounded bg-info-light text-info border border-blue-200 hover:bg-info hover:text-white transition-colors cursor-pointer"
                              >
                                <i className={`fa ${activeTab === "completed" ? "fa-eye" : "fa-pen-to-square"}`} />
                              </button>
                              {activeTab === "pending" ? (
                                <button
                                  onClick={() => void handleDelete(row)}
                                  className="w-8 h-8 inline-flex items-center justify-center rounded bg-danger/10 text-danger border border-red-200 hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <i className="fa fa-trash" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div
            ref={bottomScrollRef}
            className="overflow-x-auto rounded-b-[30px] border border-[#e5e8d7] border-t-0 bg-[#fafbf7] pb-1"
            onScroll={syncFromBottom}
          >
            <div className="h-4" style={{ width: tableScrollWidth || 2600 }} />
          </div>

          <div className="flex items-center justify-between mt-1 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>
              Showing {filtered.length === 0 ? 0 : (curPage - 1) * length + 1} to {Math.min(curPage * length, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex gap-1">
              <button
                disabled={curPage === 1}
                onClick={() => setCurPage((p) => p - 1)}
                className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <PaginationPageButtons
                items={pageNums}
                currentPage={curPage}
                onPageChange={setCurPage}
                ellipsisClassName="flex h-[36px] min-w-[36px] items-center justify-center px-2 text-[13px] text-ink-muted"
                getButtonClassName={(page) => `h-[36px] w-[36px] text-[13px] border rounded-2xl cursor-pointer ${
                  page === curPage
                    ? "bg-[#657b2f] text-white border-[#657b2f]"
                    : "bg-white border-[#d8dec8] hover:border-[#7b8f43] hover:text-[#5f7427]"
                }`}
              />
              <button
                disabled={curPage >= totalPages}
                onClick={() => setCurPage((p) => p + 1)}
                className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
