import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import {
  deleteStockPosition,
  exportStockPosition,
  fetchCompleteStockPositions,
  fetchPendingStockPositions,
  type StockPositionListRow,
} from "../../api/stockPositionApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface Row {
  id: string;
  po_no: string;
  po_date: string;
  customer_name: string;
  customer_location: string;
  executive_name: string;
  items: number;
  consignee: number;
  qty_order: number;
  qty_balance: number;
  value: number;
  status: "Pending" | "Processing" | "Complete";
  stock_id?: string;
  attachments: string[];
  due_date?: string;
  billed_qty?: number;
}

type TabType = "Pending" | "Complete";

function escapeCsv(value: string | number) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCSV(data: Row[]) {
  const rows = [
    ["S.No", "PO No", "Customer Name", "Executive Name", "Items", "Consignee", "Qty Order", "Qty Balance", "Value", "Status"],
    ...data.map((r, i) => [i + 1, r.po_no, r.customer_name, r.executive_name, r.items, r.consignee, r.qty_order, r.qty_balance, r.value, r.status]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "stock_position.csv";
  a.click();
}

function printTable(data: Row[]) {
  const html = `<html><head><title>Stock Position</title>
    <style>body{font-family:sans-serif;font-size:11px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:4px 8px}th{background:#f5f5f5;font-weight:600}</style></head>
    <body><h3>Stock Position List</h3>
    <table><thead><tr><th>S.No</th><th>PO No</th><th>Customer</th><th>Executive</th><th>Items</th><th>Consignee</th><th>Qty Order</th><th>Qty Balance</th><th>Value</th><th>Status</th></tr></thead>
    <tbody>${data.map((r,i)=>`<tr><td>${i+1}</td><td>${r.po_no}</td><td>${r.customer_name}</td><td>${r.executive_name}</td><td>${r.items}</td><td>${r.consignee}</td><td>${r.qty_order}</td><td>${r.qty_balance}</td><td>${r.value}</td><td>${r.status}</td></tr>`).join("")}
    </tbody></table></body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatStatus(status?: number, display?: string): Row["status"] {
  if (display === "Complete" || status === 2) return "Complete";
  if (display === "Processing" || status === 1) return "Processing";
  return "Pending";
}

function formatDate(value?: string) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  return value;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
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

function addDays(dateValue?: string, daysValue?: string | number) {
  const iso = toIsoDate(dateValue);
  const days = toNumber(daysValue);
  if (!iso || !days) return "";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getAttachmentUrls(row: any) {
  const directUrls = Array.isArray(row.attachment_urls) ? row.attachment_urls.filter(Boolean) : [];
  if (directUrls.length > 0) return directUrls;

  const base = getApiBaseUrl().replace(/\/api$/, "");
  const files = String(row.file_name || "")
    .split(",")
    .map((file) => file.trim())
    .filter(Boolean);

  return files.map((file) => `${base}/api/master/purchase-order/files/po_copy/${encodeURIComponent(file)}/`);
}

export default function StockPositionList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("Pending");
  const [pendingFromDate, setPendingFromDate] = useState<string>("");
  const [pendingToDate, setPendingToDate] = useState<string>("");
  const [completeFromDate, setCompleteFromDate] = useState<string>("");
  const [completeToDate, setCompleteToDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [length, setLength] = useState<number>(10);
  const [curPage, setCurPage] = useState<number>(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromDate = activeTab === "Complete" ? completeFromDate : pendingFromDate;
  const toDate = activeTab === "Complete" ? completeToDate : pendingToDate;

  useEffect(() => {
    setCurPage(1);
  }, [activeTab, search, length, fromDate, toDate]);
  useEffect(() => {
    if (activeTab === "Complete" && !completeFromDate && !completeToDate) {
      const today = new Date().toISOString().slice(0, 10);
      setCompleteFromDate(today);
      setCompleteToDate(today);
    }
  }, [activeTab, completeFromDate, completeToDate]);
  const mapRows = (dataset: Array<StockPositionListRow & Record<string, any>>, startIndex: number) =>
    dataset.map((row) => {
      const mappedStatus = formatStatus(row.status, row.status_display);
      return {
        id: String(row.form_main_unique_id || row.unique_id || row.po_unique_id || ""),
        po_no: row.po_num || row.stock_id || "-",
        po_date: formatDate(row.po_date),
        customer_name: row.customer_name || row.department_display || row.department || "-",
        customer_location: row.customer_location || [row.district_name, row.state_name].filter(Boolean).join(", "),
        executive_name: row.executive_display || row.executive_name || "-",
        items: toNumber(row.no_of_po ?? row.no_of_item),
        consignee: toNumber(row.no_of_consignee ?? row.no_of_con),
        qty_order: toNumber(row.order_qty ?? row.qty ?? row.total_qty),
        qty_balance:
          mappedStatus === "Complete"
            ? toNumber(row.billed_qty ?? row.balance_qty ?? row.remaining_qty ?? row.stock_qty)
            : toNumber(row.balance_qty ?? row.billed_qty ?? row.remaining_qty ?? row.stock_qty),
        value: toNumber(row.net_value ?? row.stock_value ?? 0),
        status: mappedStatus,
        stock_id: String(row.stock_id || ""),
        attachments: getAttachmentUrls(row),
        due_date: formatDate(row.due_date || addDays(row.po_date, row.delivery_due_dates)),
        billed_qty:
          mappedStatus === "Complete"
            ? toNumber(row.stock_qty)
            : toNumber(row.billed_qty ?? row.stock_qty),
      };
    });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = {
          draw: 1,
          start: (curPage - 1) * length,
          length,
          search: { value: search },
          from_date: fromDate,
          to_date: toDate,
          user_type_unique_id: user?.user_type_unique_id || "",
          user_unique_id: user?.unique_id || "",
        };

        if (activeTab === "Pending") {
          const pendingRes = await fetchPendingStockPositions({ ...payload, start: 0, length: -1 });
          const pendingRows = Array.isArray(pendingRes.data) ? pendingRes.data : [];
          const filtered = pendingRows.filter((row: StockPositionListRow & Record<string, any>) => {
            const haystack = [
              row.po_num,
              row.stock_id,
              row.department_display,
              row.department,
              row.executive_display,
              row.executive_name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return !search || haystack.includes(search.toLowerCase());
          });
          const sorted = filtered.sort((a: Record<string, any>, b: Record<string, any>) => {
            const aDate = toIsoDate(a.po_date) || "0000-00-00";
            const bDate = toIsoDate(b.po_date) || "0000-00-00";
            if (aDate === bDate) return toNumber(b.id) - toNumber(a.id);
            return aDate < bDate ? 1 : -1;
          });
          const totalCount = sorted.length;
          const pageRows = length === -1 ? sorted : sorted.slice((curPage - 1) * length, curPage * length);
          setRows(mapRows(pageRows, (curPage - 1) * length));
          setTotal(totalCount);
        } else {
          const completeRes = await fetchCompleteStockPositions({ ...payload, start: 0, length: -1 });
          const completeRows = Array.isArray(completeRes.data) ? completeRes.data : [];
          const filtered = completeRows.filter((row: StockPositionListRow & Record<string, any>) => {
            const haystack = [
              row.po_num,
              row.stock_id,
              row.department_display,
              row.department,
              row.executive_display,
              row.executive_name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return !search || haystack.includes(search.toLowerCase());
          });
          const sorted = filtered.sort((a: Record<string, any>, b: Record<string, any>) => {
            const aDate = toIsoDate(a.po_date) || "0000-00-00";
            const bDate = toIsoDate(b.po_date) || "0000-00-00";
            if (aDate === bDate) return toNumber(b.id) - toNumber(a.id);
            return aDate < bDate ? 1 : -1;
          });
          const totalCount = sorted.length;
          const pageRows = length === -1 ? sorted : sorted.slice((curPage - 1) * length, curPage * length);
          setRows(mapRows(pageRows, (curPage - 1) * length));
          setTotal(totalCount);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to load stock position records.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeTab, curPage, length, search, fromDate, toDate, user?.unique_id, user?.user_type_unique_id]);

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
  const start = total === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1;
  const end = length === -1 ? total : Math.min(curPage * length, total);

  const pageSeries = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (curPage > 3) pages.push("...");
    for (let i = Math.max(2, curPage - 1); i <= Math.min(totalPages - 1, curPage + 1); i++) pages.push(i);
    if (curPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [curPage, totalPages]);

  const handleGo = () => setCurPage(1);

  const reloadCurrentTab = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        draw: 1,
        start: (curPage - 1) * length,
        length,
        search: { value: search },
        from_date: fromDate,
        to_date: toDate,
        user_type_unique_id: user?.user_type_unique_id || "",
        user_unique_id: user?.unique_id || "",
      };

      if (activeTab === "Pending") {
        const pendingRes = await fetchPendingStockPositions({ ...payload, start: 0, length: -1 });
        const pendingRows = Array.isArray(pendingRes.data) ? pendingRes.data : [];
        const filtered = pendingRows.filter((row: StockPositionListRow & Record<string, any>) => {
          const haystack = [
            row.po_num,
            row.stock_id,
            row.department_display,
            row.department,
            row.executive_display,
            row.executive_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return !search || haystack.includes(search.toLowerCase());
        });
        const sorted = filtered.sort((a: Record<string, any>, b: Record<string, any>) => {
          const aDate = toIsoDate(a.po_date) || "0000-00-00";
          const bDate = toIsoDate(b.po_date) || "0000-00-00";
          if (aDate === bDate) return toNumber(b.id) - toNumber(a.id);
          return aDate < bDate ? 1 : -1;
        });
        const totalCount = sorted.length;
        const pageRows = length === -1 ? sorted : sorted.slice((curPage - 1) * length, curPage * length);
        setRows(mapRows(pageRows, (curPage - 1) * length));
        setTotal(totalCount);
      } else {
        const completeRes = await fetchCompleteStockPositions({ ...payload, start: 0, length: -1 });
        const completeRows = Array.isArray(completeRes.data) ? completeRes.data : [];
        const filtered = completeRows.filter((row: StockPositionListRow & Record<string, any>) => {
          const haystack = [
            row.po_num,
            row.stock_id,
            row.department_display,
            row.department,
            row.executive_display,
            row.executive_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return !search || haystack.includes(search.toLowerCase());
        });
        const sorted = filtered.sort((a: Record<string, any>, b: Record<string, any>) => {
          const aDate = toIsoDate(a.po_date) || "0000-00-00";
          const bDate = toIsoDate(b.po_date) || "0000-00-00";
          if (aDate === bDate) return toNumber(b.id) - toNumber(a.id);
          return aDate < bDate ? 1 : -1;
        });
        const totalCount = sorted.length;
        const pageRows = length === -1 ? sorted : sorted.slice((curPage - 1) * length, curPage * length);
        setRows(mapRows(pageRows, (curPage - 1) * length));
        setTotal(totalCount);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to load stock position records.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uniqueId: string) => {
    const confirmed = await showConfirmAlert("Are you sure you want to delete this stock position?");
    if (!confirmed) return;

    try {
      const res = await deleteStockPosition(uniqueId);
      if (res?.status) {
        await showSuccessAlert("Successfully record deleted");
        await reloadCurrentTab();
      } else {
        await showErrorAlert(res?.message || res?.error || "Failed to delete stock position.");
      }
    } catch (err: any) {
      await showErrorAlert(err?.response?.data?.message || err?.response?.data?.error || "Failed to delete stock position.");
    }
  };

  const handleExport = async (type: "pending" | "complete" | "all") => {
    try {
      const res = await exportStockPosition(type);
      const mapped = (res.data ?? []).map((row: any) => ({
        id: String(row.stock_id || row.po_num || Math.random()),
        po_no: row.po_num || "-",
        po_date: row.po_date || "-",
        customer_name: row.department || "-",
        customer_location: "",
        executive_name: row.executive || "-",
        items: toNumber(row.no_of_item),
        consignee: toNumber(row.no_of_con),
        qty_order: toNumber(row.stock_qty),
        qty_balance: toNumber(row.billed_qty),
        value: toNumber(row.stock_value || 0),
        status: formatStatus(undefined, row.status),
        attachments: [],
        billed_qty: toNumber(row.stock_qty),
      }));
      exportCSV(mapped);
    } catch {
      exportCSV(rows);
    }
  };

  const statusClass = (status: string) => {
    if (status === "Pending") return "text-brand-600 font-semibold";
    if (status === "Processing") return "text-warning font-semibold";
    if (status === "Complete") return "text-success font-semibold";
    return "text-ink";
  };

  const actionIconClass = activeTab === "Complete" ? "fa fa-eye" : "fa fa-pen-to-square";
  const toolbarButtonCls =
    "inline-flex items-center gap-2 rounded-2xl border border-[#dcc98e] bg-white px-4 py-2 text-[#5b641d] font-semibold shadow-sm transition-colors hover:bg-[#faf4df]";
  const pageButtonCls =
    "h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] text-[#5f6c42] hover:border-[#7b8f43] hover:text-[#4d6125] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h5 className="text-[17px] font-bold text-ink font-head m-0">Stock Position</h5>
        <nav className="flex items-center gap-1 text-[12.5px] text-ink-muted">
          <span>Purchase</span>
          <i className="fa fa-chevron-right text-[9px] text-line-dark mx-1" />
          <span className="text-ink-secondary font-medium">Stock Position</span>
        </nav>
      </div>

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="flex gap-2 border-b border-[#edf1e4] bg-[linear-gradient(180deg,#fffdf9_0%,#fbfcf8_100%)] px-6 pt-5">
          {(["Pending", "Complete"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-t-[18px] border px-5 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors ${activeTab === tab ? "border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] text-white shadow-[0_10px_22px_rgba(79,122,43,0.20)]" : "border-[#e5e8d7] bg-white text-[#6b7651] hover:border-[#cfd7b8] hover:text-[#4d6125]"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

          <div className="mb-5 flex items-end gap-4 flex-wrap rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">From Date</span>
              <input name="fromdate"
                type="date"
                value={fromDate}
                onChange={(e) =>
                  activeTab === "Complete"
                    ? setCompleteFromDate(e.target.value)
                    : setPendingFromDate(e.target.value)
                }
                className="h-11 w-48 rounded-2xl border border-[#d9ddcf] bg-white px-4 text-[13px] outline-none shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">To Date</span>
              <input name="todate"
                type="date"
                value={toDate}
                onChange={(e) =>
                  activeTab === "Complete"
                    ? setCompleteToDate(e.target.value)
                    : setPendingToDate(e.target.value)
                }
                className="h-11 w-48 rounded-2xl border border-[#d9ddcf] bg-white px-4 text-[13px] outline-none shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>
            <button onClick={handleGo} className="inline-flex h-11 items-center rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-colors">Go</button>
          </div>

          <div className="mb-5 flex items-center justify-between gap-4 flex-wrap rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                Show
                <SearchableSelectInput name="length" value={length} onChange={(e) => setLength(Number(e.target.value))} className="h-10 min-w-[86px] rounded-2xl border border-[#d7c79c] bg-white px-3 text-[13px] outline-none shadow-sm">
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                  <option value={-1}>All</option>
                </SearchableSelectInput>
                entries
              </div>
              {[
                { label: "Copy", action: () => navigator.clipboard?.writeText(rows.map((r) => `${r.po_no}\t${r.customer_name}`).join("\n")) },
                { label: "CSV", action: () => exportCSV(rows) },
                { label: "Excel", action: () => exportCSV(rows) },
                { label: "PDF", action: () => printTable(rows) },
                { label: "Print", action: () => printTable(rows) },
                
              ].map((btn) => (
                <button key={btn.label} onClick={btn.action} className={toolbarButtonCls}>{btn.label}</button>
              ))}
            </div>
            <label className="flex h-11 min-w-[280px] items-center gap-3 rounded-2xl border border-[#d9ddcf] bg-white px-4 shadow-sm">
              <i className="fa fa-magnifying-glass text-[12px] text-[#6d7750]" />
              <input name="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-[#9aa287]" />
            </label>
          </div>

          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                {activeTab === "Pending" ? (
                  <>
                    <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643] w-10" rowSpan={2}>S.No</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]" rowSpan={2}>PO No</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]" rowSpan={2}>Customer Name</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]" rowSpan={2}>Executive Name</th>
                      <th colSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">No. of.</th>
                      <th colSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Qty</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]" rowSpan={2}>Value</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]" rowSpan={2}>Attach</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]" rowSpan={2}>Due Date</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]" rowSpan={2}>Status</th>
                      <th className="border-b border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643] w-16" rowSpan={2}>Action</th>
                    </tr>
                    <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                      <th className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Items</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Consignee</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Order</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Balance</th>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">S.No</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">PO No</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Customer Name</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Executive Name</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">No of Items</th>
                      <th colSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Qty</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Billed Qty</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Value</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Attach</th>
                      <th className="border-b border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Action</th>
                    </tr>
                    <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                      <th className="border-b border-r border-[#d8dec8]" colSpan={5} />
                      <th className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Order</th>
                      <th className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Stock</th>
                      <th className="border-b border-[#d8dec8]" colSpan={4} />
                    </tr>
                  </>
                )}
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={activeTab === "Pending" ? 13 : 11} className="text-center py-10 text-ink-muted border border-line"><span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />Loading...</span></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={activeTab === "Pending" ? 13 : 11} className="text-center py-10 text-ink-muted border border-line">No records found</td></tr>
                ) : rows.map((row, index) => (
                  <tr key={`${row.id}-${index}`} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                    <td className="px-4 py-4 text-center text-[#7a7f69]">{start + index}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-ink text-[12.5px] uppercase">{row.po_no}</div>
                      <div className="text-[11px] text-ink-muted">{row.po_date}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-ink text-[12.5px] uppercase">{row.customer_name}</div>
                      <div className="text-[11px] text-ink-muted">{row.customer_location || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-center">{row.executive_name}</td>
                    <td className="px-4 py-4 text-center">{row.items}</td>
                    {activeTab === "Pending" && <td className="px-4 py-4 text-center">{row.consignee}</td>}
                    <td className="px-4 py-4 text-center">{row.qty_order}</td>
                    <td className="px-4 py-4 text-center">{activeTab === "Pending" ? row.qty_balance : toNumber(row.billed_qty)}</td>
                    {activeTab === "Complete" && <td className="px-4 py-4 text-center">{row.qty_balance}</td>}
                    <td className="px-4 py-4 text-right font-medium">{formatMoney(row.value)}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {row.attachments.length === 0 ? (
                          <span className="text-ink-muted">-</span>
                        ) : row.attachments.map((url, fileIndex) => (
                          <a key={fileIndex} href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                            <i className="fa fa-file-pdf" />
                          </a>
                        ))}
                      </div>
                    </td>
                    {activeTab === "Pending" && <td className="px-4 py-4 text-center">{row.due_date || "-"}</td>}
                    {activeTab === "Pending" && <td className="px-4 py-4 text-center"><span className={statusClass(row.status)}>{row.status}</span></td>}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => navigate(`/purchase/stock-position/form/${row.id}`)} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer">
                          <i className={actionIconClass} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>Showing {start} to {end} of {total} entries</span>
            <div className="flex gap-1">
              <button disabled={length === -1 || curPage === 1} onClick={() => setCurPage((page) => page - 1)} className={pageButtonCls}>Previous</button>
              {pageSeries.map((page, index) => page === "..." ? <span key={`ellipsis-${index}`} className="flex h-[36px] w-[36px] items-center justify-center text-ink-muted text-[13px]">...</span> : <button key={page} onClick={() => setCurPage(page as number)} className={`h-[36px] w-[36px] text-[13px] border rounded-2xl cursor-pointer ${page === curPage ? "bg-[#657b2f] text-white border-[#657b2f]" : "bg-white border-[#d8dec8] hover:border-[#7b8f43] hover:text-[#4d6125]"}`}>{page}</button>)}
              <button disabled={length === -1 || curPage >= totalPages} onClick={() => setCurPage((page) => page + 1)} className={pageButtonCls}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


