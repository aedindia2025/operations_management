import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import {
  deleteConsigneeStock,
  fetchConsigneeStockCompleted,
  fetchConsigneeStockPending,
} from "../../api/consigneeStockApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";

type TabType = "pending" | "completed";
const SCREEN_ID = "641ad605643eb62575";

interface Row {
  id: string;
  poNo: string;
  poDate: string;
  poDateRaw: string;
  stockId: string;
  stockDate: string;
  customerName: string;
  customerLocation: string;
  executiveName: string;
  noOfItems: number;
  qtyOrder: number;
  qtyRemaining: number;
  qtyBill: number;
  qtyBalance: number;
  qtyAssign: number;
  value: number;
  status: "Pending" | "Completed";
  actionMode: "" | "edit" | "view";
}

type ColumnKey =
  | "s_no"
  | "po_no"
  | "stock_id"
  | "customer"
  | "executive"
  | "items"
  | "order"
  | "remaining"
  | "bill"
  | "balance"
  | "assign"
  | "value"
  | "status"
  | "action";

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function formatDate(value?: string) {
  const iso = toIsoDate(value);
  if (!iso) return "-";
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}-${mm}-${yyyy}`;
}

function mapStatus(status?: string | number) {
  if (String(status || "").toLowerCase() === "completed" || Number(status) === 2) {
    return "Completed" as const;
  }
  return "Pending" as const;
}

function mapRows(dataset: Array<Record<string, any>>): Row[] {
  return dataset.map((row) => {
    const poDateRaw = toIsoDate(row.po_date);
    const stockDateRaw = toIsoDate(row.stock_date || row.po_date);
    return {
      id: String(row.form_main_unique_id || row.id || row.unique_id || row.stock_id || ""),
      poNo: String(row.po_num || "-"),
      poDate: formatDate(poDateRaw),
      poDateRaw,
      stockId: String(row.stock_id || "-"),
      stockDate: formatDate(stockDateRaw),
      customerName: String(row.customer_name || row.department || "-"),
      customerLocation: String(row.customer_location || "-"),
      executiveName: String(row.executive_name || "-"),
      noOfItems: toNumber(row.no_of_item),
      qtyOrder: toNumber(row.item_qty ?? row.order_qty),
      qtyRemaining: toNumber(row.remaining_qty),
      qtyBill: toNumber(row.stock_qty),
      qtyBalance: toNumber(row.remain_qty ?? row.balance_qty),
      qtyAssign: toNumber(row.invoice_qty),
      value: toNumber(row.stock_value),
      status: mapStatus(row.status),
      actionMode:
        row.action_mode === "view"
          ? "view"
          : row.action_mode === "edit"
            ? "edit"
            : mapStatus(row.status) === "Completed"
              ? "view"
              : "",
    };
  });
}

function sortRows(rows: Row[]) {
  return [...rows].sort((a, b) => {
    const aDate = a.poDateRaw || "0000-00-00";
    const bDate = b.poDateRaw || "0000-00-00";
    if (aDate !== bDate) return aDate < bDate ? 1 : -1;
    return b.id.localeCompare(a.id);
  });
}

export default function ConsigneeStockList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showColumnVisibility, setShowColumnVisibility] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    s_no: true,
    po_no: true,
    stock_id: true,
    customer: true,
    executive: true,
    items: true,
    order: true,
    remaining: true,
    bill: true,
    balance: true,
    assign: true,
    value: true,
    status: true,
    action: true,
  });

  useEffect(() => {
    setCurPage(1);
  }, [activeTab, search, length, fromDate, toDate]);
   useEffect(() => {
  if (activeTab === "completed") {
    const today = new Date().toISOString().slice(0, 10);
    setFromDate(today);
    setToDate(today);
  }
}, [activeTab]);
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = JSON.parse(localStorage.getItem("otm_user") || "{}");
        const payload = {
          draw: 1,
          start: (curPage - 1) * length,
          length,
          search: { value: search },
          from_date: fromDate,
          to_date: toDate,
          screen_id_val: SCREEN_ID,
          user_type_unique_id: user?.user_type_unique_id || "",
        };

        const res =
          activeTab === "pending"
            ? await fetchConsigneeStockPending(payload)
            : await fetchConsigneeStockCompleted(payload);

        if (!cancelled) {
          setRows(sortRows(mapRows(res?.data ?? [])));
          setTotal(toNumber(res?.recordsFiltered ?? res?.recordsTotal ?? 0));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.response?.data?.message ||
              err?.message ||
              "Failed to load consignee stock records."
          );
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, curPage, length, search, fromDate, toDate, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / length));

  useEffect(() => {
    if (curPage > totalPages) setCurPage(totalPages);
  }, [curPage, totalPages]);

  const pageNums = useMemo(() => getPaginationItems(curPage, totalPages), [curPage, totalPages]);

  const formatValue = (v: number) =>
    v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleDelete = async (row: Row) => {
    if (activeTab !== "pending") return;
    const confirmed = await showConfirmAlert(`Delete consignee stock assign for ${row.stockId}?`);
    if (!confirmed) return;
    try {
      const res = await deleteConsigneeStock({
        form_main_unique_id: row.id,
        stock_id: row.stockId,
      });
      if (!res?.status) throw new Error(res?.message || "Failed to delete consignee stock record.");
      await showSuccessAlert("Consignee stock record deleted successfully.");
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      await showErrorAlert(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete consignee stock record."
      );
    }
  };

  const pendingQtyCols = ["Order", "Remaining", "Bill", "Balance", "Assign"];
  const completedQtyCols = ["Order", "Remaining", "Bill", "Assign"];
  const qtyCols = activeTab === "pending" ? pendingQtyCols : completedQtyCols;
  const qtyColSpan = qtyCols.filter((col) => {
    if (col === "Order") return visibleColumns.order;
    if (col === "Remaining") return visibleColumns.remaining;
    if (col === "Bill") return visibleColumns.bill;
    if (col === "Balance") return visibleColumns.balance;
    if (col === "Assign") return visibleColumns.assign;
    return true;
  }).length;
  const startEntry = total === 0 ? 0 : (curPage - 1) * length + 1;
  const endEntry = Math.min(curPage * length, total);
  const exportRows = rows;
  const tabCls = "rounded-t-[22px] border border-b-0 px-5 py-3 text-[13px] font-semibold transition-all";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f4f6ef_34%,#eef2e9_100%)] p-6">
      <PageTopbar title="Consignee Stock Assign" breadcrumbs={["Stores", "Consignee Stock Assign"]} />

      <div className="overflow-hidden rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.10)]">
        <div className="flex gap-2 border-b border-[#e4e8d7] px-6 pt-5">
          {[
            { key: "pending", label: "Pending" },
            { key: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as TabType);
                setCurPage(1);
                setSearch("");
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
          {error ? (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          ) : null}

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
              onClick={() => setCurPage(1)}
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
            search={search}
            setSearch={(value) => {
              setSearch(value);
              setCurPage(1);
            }}
            tableRef={tableRef}
            searchPlaceholder="Search PO, stock, customer..."
            showColumnButton={false}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowColumnVisibility((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#dcc98e] bg-white px-4 py-2 font-semibold text-[#5b641d] shadow-sm transition-colors hover:bg-[#faf4df]"
              >
                <i className="fa fa-table-columns text-[12px]" />
                Column Visibility
                <i className="fa fa-chevron-down text-[10px]" />
              </button>
            }
          />

          {showColumnVisibility ? (
            <div className="mb-4 p-4 border border-line rounded-lg bg-surface-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px] text-ink-secondary">
                {[
                  ["s_no", "S.No"],
                  ["po_no", "PO No"],
                  ["stock_id", "Stock ID"],
                  ["customer", "Customer"],
                  ["executive", "Executive Name"],
                  ["items", "No.Of.Items"],
                  ["order", "Order"],
                  ["remaining", "Remaining"],
                  ["bill", "Bill"],
                  ...(activeTab === "pending" ? [["balance", "Balance"]] : []),
                  ["assign", "Assign"],
                  ["value", "Value"],
                  ...(activeTab === "pending" ? [["status", "Status"]] : []),
                  ["action", "Action"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input name="consigneestocklist_input_356"
                      type="checkbox"
                      checked={visibleColumns[key as ColumnKey]}
                      onChange={(e) =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_20px_38px_rgba(46,61,24,0.08)]">
            <table ref={tableRef} className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)]">
                  {visibleColumns.s_no ? <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark whitespace-nowrap">S.No</th> : null}
                  {visibleColumns.po_no ? <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark whitespace-nowrap">PO No</th> : null}
                  {visibleColumns.stock_id ? <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark whitespace-nowrap">Stock ID</th> : null}
                  {visibleColumns.customer ? <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark whitespace-nowrap">Customer</th> : null}
                  {visibleColumns.executive ? <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark whitespace-nowrap">Executive Name</th> : null}
                  {visibleColumns.items ? <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark whitespace-nowrap">No.Of.Items</th> : null}
                  {qtyColSpan > 0 ? <th colSpan={qtyColSpan} className="px-3 py-1.5 text-center border border-line-dark font-bold text-[#3d5a20]">Quantity</th> : null}
                  {visibleColumns.value ? <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark whitespace-nowrap">Value</th> : null}
                  {activeTab === "pending" && visibleColumns.status ? <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark whitespace-nowrap">Status</th> : null}
                  {visibleColumns.action ? <th rowSpan={2} className="px-3 py-2.5 text-center border border-line-dark whitespace-nowrap">Action</th> : null}
                </tr>
                <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)]">
                  {visibleColumns.order ? <th className="px-3 py-1.5 text-center border border-line-dark whitespace-nowrap">Order</th> : null}
                  {visibleColumns.remaining ? <th className="px-3 py-1.5 text-center border border-line-dark whitespace-nowrap">Remaining</th> : null}
                  {visibleColumns.bill ? <th className="px-3 py-1.5 text-center border border-line-dark whitespace-nowrap">Bill</th> : null}
                  {activeTab === "pending" && visibleColumns.balance ? <th className="px-3 py-1.5 text-center border border-line-dark whitespace-nowrap">Balance</th> : null}
                  {visibleColumns.assign ? <th className="px-3 py-1.5 text-center border border-line-dark whitespace-nowrap">Assign</th> : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="text-center py-10 text-ink-muted border border-line">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="text-center py-10 text-ink-muted border border-line italic">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={`${r.id}-${r.stockId}-${i}`} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                      {visibleColumns.s_no ? <td className="px-3 py-2 text-center border-x border-line/50">{(curPage - 1) * length + i + 1}</td> : null}
                      {visibleColumns.po_no ? <td className="px-3 py-2 border-x border-line/50">
                        <div className="font-semibold text-ink">{r.poNo}</div>
                        <div className="text-[11px] text-ink-muted">{r.poDate}</div>
                      </td> : null}
                      {visibleColumns.stock_id ? <td className="px-3 py-2 border-x border-line/50">
                        <div className="font-semibold text-ink">{r.stockId}</div>
                        <div className="text-[11px] text-ink-muted">{r.stockDate}</div>
                      </td> : null}
                      {visibleColumns.customer ? <td className="px-3 py-2 border-x border-line/50">
                        <div className="font-semibold text-ink">{r.customerName}</div>
                        <div className="text-[11px] text-ink-muted">{r.customerLocation}</div>
                      </td> : null}
                      {visibleColumns.executive ? <td className="px-3 py-2 text-center border-x border-line/50">{r.executiveName}</td> : null}
                      {visibleColumns.items ? <td className="px-3 py-2 text-center border-x border-line/50">{r.noOfItems}</td> : null}
                      {visibleColumns.order ? <td className="px-3 py-2 text-center border-x border-line/50">{r.qtyOrder}</td> : null}
                      {visibleColumns.remaining ? <td className="px-3 py-2 text-center border-x border-line/50">{r.qtyRemaining}</td> : null}
                      {visibleColumns.bill ? <td className="px-3 py-2 text-center border-x border-line/50">{r.qtyBill}</td> : null}
                      {activeTab === "pending" && visibleColumns.balance ? <td className="px-3 py-2 text-center border-x border-line/50">{r.qtyBalance}</td> : null}
                      {visibleColumns.assign ? <td className="px-3 py-2 text-center border-x border-line/50">{r.qtyAssign}</td> : null}
                      {visibleColumns.value ? <td className="px-3 py-2 text-right border-x border-line/50 font-medium">{formatValue(r.value)}</td> : null}
                      {activeTab === "pending" && visibleColumns.status ? <td className="px-3 py-2 text-center border-x border-line/50">
                        <span className={r.status === "Completed" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                          {r.status}
                        </span>
                      </td> : null}
                      {visibleColumns.action ? <td className="px-3 py-2 text-center border-x border-line/50">
                        {r.actionMode || activeTab === "pending" ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {r.actionMode ? (
                            <button
                              onClick={() =>
                                navigate(
                                  `/stores/consignee-stock/form?id=${encodeURIComponent(r.id)}&stock_id=${encodeURIComponent(r.stockId)}${r.actionMode === "view" ? "&mode=view" : ""}`
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 hover:bg-info hover:text-white transition-colors cursor-pointer"
                              title={r.actionMode === "view" ? "View" : "Edit"}
                            >
                              <i className={r.actionMode === "view" ? "fa fa-eye" : "fa fa-pen-to-square"} />
                            </button>
                            ) : null}
                            {activeTab === "pending" ? (
                              <button
                                type="button"
                                onClick={() => void handleDelete(r)}
                                className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <i className="fa fa-trash" />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </td> : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>
              Showing {startEntry} to {endEntry} of {total} entries
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
