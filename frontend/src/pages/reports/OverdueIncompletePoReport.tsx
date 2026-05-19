import { useEffect, useMemo, useState } from "react";
import PageTopbar from "../../components/common/PageTopbar";
import { useAuth } from "../../context/AuthContext";
import { fetchPurchaseOrderList } from "../../api/purchaseOrderApi";
import { showErrorAlert } from "../../utils/alerts";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import { getPaginationItems } from "../../utils/pagination";

const MANAGEMENT_USER_TYPE = "65fac54da3aac66007";
const CEO_USER_TYPE = "8e558e5fa9e343a0a7";
const MAX_REPORT_ROWS = 1000;

type Row = Record<string, unknown>;

function formatDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [yyyy, mm, dd] = raw.slice(0, 10).split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  return raw;
}

function parseDateValue(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d{2}-\d{2}-\d{4}/.test(raw)) {
    const [dd, mm, yyyy] = raw.slice(0, 10).split("-");
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [yyyy, mm, dd] = raw.slice(0, 10).split("-");
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAmount(value: unknown) {
  const numeric = Number(String(value ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(numeric)) return String(value ?? "0") || "0";
  return numeric.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function text(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || "-";
}

function count(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function overdueDateForRow(row: Row) {
  const candidates = [
    row.ld_delivery_due_date,
    row.delivery_due_date,
    row.delivery_due,
    row.ld_installation_due_date,
    row.installation_due_date,
    row.due_date,
    row.po_due_date,
    row.validity_to,
  ];
  for (const candidate of candidates) {
    const parsed = parseDateValue(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function overdueDaysForRow(row: Row) {
  const explicit = Number(row.overdue_days ?? row.over_due_days ?? row.delay_days ?? row.age_days);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const dueDate = overdueDateForRow(row);
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));
}

function reportTo(days: number | null) {
  return days !== null && days > 3 ? "CEO" : "Management";
}

function filterRowsForUser(rows: Row[], userType: string) {
  if (userType === MANAGEMENT_USER_TYPE) {
    return rows.filter((row) => {
      const days = overdueDaysForRow(row);
      return days === null || days <= 3;
    });
  }
  if (userType === CEO_USER_TYPE) {
    return rows.filter((row) => {
      const days = overdueDaysForRow(row);
      return days !== null && days > 3;
    });
  }
  return rows;
}

function exportFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function OverdueIncompletePoReport() {
  const { user } = useAuth();
  const userType = user?.user_type_unique_id || "";
  const userId = user?.unique_id || "";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchPurchaseOrderList({
      draw: 1,
      start: 0,
      length: MAX_REPORT_ROWS,
      user_type_unique_id: userType,
      user_unique_id: userId,
      overdue_incomplete: 1,
    })
      .then((res) => {
        if (ignore) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        setRows(filterRowsForUser(data, userType));
      })
      .catch(() => {
        if (!ignore) {
          setRows([]);
          void showErrorAlert("Failed to load Overdue Incomplete PO report.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [userId, userType]);

  useEffect(() => {
    setCurPage(1);
  }, [search, fromDate, toDate, length]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const poDate = String(row.po_date || "").slice(0, 10);
      if (fromDate && poDate && poDate < fromDate) return false;
      if (toDate && poDate && poDate > toDate) return false;
      if (!query) return true;
      return [
        row.po_num,
        row.customer_name,
        row.department_display,
        row.department,
        row.executive_label,
        row.executive_name_display,
        row.executive_name,
      ].some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [fromDate, rows, search, toDate]);

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(filteredRows.length / length));
  const pageRows = length === -1 ? filteredRows : filteredRows.slice((curPage - 1) * length, curPage * length);
  const pageNums = useMemo(() => getPaginationItems(curPage, totalPages), [curPage, totalPages]);

  const reportRows = (length === -1 ? filteredRows : pageRows).map((row, index) => {
    const days = overdueDaysForRow(row);
    const dueDate = overdueDateForRow(row);
    return {
      sno: (length === -1 ? 0 : (curPage - 1) * length) + index + 1,
      poDate: formatDate(row.po_date),
      poNo: text(row.po_num),
      customer: text(row.customer_name || row.department_display || row.department),
      executive: text(row.executive_label || row.executive_name_display || row.executive_name),
      productCount: count(row.pro_cnt ?? row.product_count),
      productQty: count(row.qty ?? row.product_qty),
      consigneeCount: count(row.cons_cnt ?? row.consignee_count),
      value: formatAmount(row.total_value || row.po_value || row.total_amount),
      dueDate: dueDate ? formatDate(dueDate.toISOString().slice(0, 10)) : "-",
      overdueDays: days ?? "-",
      reportTo: reportTo(days),
    };
  });

  const exportRows = () => {
    const headers = ["S.No", "PO Date", "PO No", "Customer", "Executive", "Product Count", "Product Qty", "Consignee Cnt", "PO Value", "Due Date", "Overdue Days", "Report To"];
    const body = filteredRows.map((row, index) => {
      const days = overdueDaysForRow(row);
      const dueDate = overdueDateForRow(row);
      return [
        index + 1,
        formatDate(row.po_date),
        text(row.po_num),
        text(row.customer_name || row.department_display || row.department),
        text(row.executive_label || row.executive_name_display || row.executive_name),
        count(row.pro_cnt ?? row.product_count),
        count(row.qty ?? row.product_qty),
        count(row.cons_cnt ?? row.consignee_count),
        formatAmount(row.total_value || row.po_value || row.total_amount),
        dueDate ? formatDate(dueDate.toISOString().slice(0, 10)) : "-",
        days ?? "-",
        reportTo(days),
      ];
    });
    const csv = [headers, ...body].map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    exportFile("overdue-incomplete-po-report.csv", csv, "text/csv;charset=utf-8;");
  };

  return (
    <div className="p-6">
      <PageTopbar title="Overdue Incomplete PO" breadcrumbs={["Reports", "Overdue Incomplete PO"]} />

      <div className="mt-4 rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.10)]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e7ecdb] p-5">
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">From PO Date</span>
              <input name="fromdate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10 rounded-2xl border border-[#d8dec8] bg-white px-3 text-[13px] outline-none focus:border-brand-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">To PO Date</span>
              <input name="todate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10 rounded-2xl border border-[#d8dec8] bg-white px-3 text-[13px] outline-none focus:border-brand-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">Show</span>
              <select value={length} onChange={(e) => setLength(Number(e.target.value))} className="h-10 rounded-2xl border border-[#d8dec8] bg-white px-3 text-[13px] outline-none focus:border-brand-500">
                {[10, 25, 50, 100, -1].map((value) => <option key={value} value={value}>{value === -1 ? "All" : value}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-10 min-w-[280px] items-center gap-2 rounded-2xl border border-[#d9ddcf] bg-white px-4 shadow-sm">
              <i className="fa fa-magnifying-glass text-[12px] text-[#6d7750]" />
              <input name="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PO / Customer / Executive" className="w-full border-none bg-transparent text-[13px] outline-none" />
            </label>
            <button type="button" onClick={exportRows} className="otm-btn-secondary">
              <i className="fa fa-file-csv text-[12px]" />
              CSV
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="overflow-x-auto rounded-[24px] border border-[#e5e8d7]">
            <table className="min-w-[1500px] w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {["S.No", "PO Date", "PO No", "Customer", "Executive", "Product Count", "Product Qty", "Consignee Cnt", "PO Value", "Due Date", "Overdue Days", "Report To"].map((header) => (
                    <th key={header} className="border-b border-[#d8dec8] px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="py-10 text-center text-ink-muted">Loading...</td></tr>
                ) : reportRows.length ? reportRows.map((row) => (
                  <tr key={`${row.sno}-${row.poNo}`} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] hover:bg-[#f1f7e6]">
                    <td className="px-3 py-3 text-center">{row.sno}</td>
                    <td className="px-3 py-3 text-center">{row.poDate}</td>
                    <td className="px-3 py-3 font-semibold text-[#243018]">{row.poNo}</td>
                    <td className="px-3 py-3">{row.customer}</td>
                    <td className="px-3 py-3 text-center">{row.executive}</td>
                    <td className="px-3 py-3 text-center">{row.productCount}</td>
                    <td className="px-3 py-3 text-right">{row.productQty}</td>
                    <td className="px-3 py-3 text-center">{row.consigneeCount}</td>
                    <td className="px-3 py-3 text-right font-semibold">{row.value}</td>
                    <td className="px-3 py-3 text-center">{row.dueDate}</td>
                    <td className="px-3 py-3 text-center font-bold text-danger">{row.overdueDays}</td>
                    <td className="px-3 py-3 text-center"><span className="rounded-full border border-[#d8dec8] bg-white px-3 py-1 font-semibold">{row.reportTo}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={12} className="py-10 text-center text-ink-muted">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#6f7758]">
            <span>
              Showing {filteredRows.length === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1}
              {" "}to {length === -1 ? filteredRows.length : Math.min(curPage * length, filteredRows.length)} of {filteredRows.length} entries
            </span>
            <div className="flex gap-1">
              <button disabled={length === -1 || curPage === 1} onClick={() => setCurPage((page) => page - 1)} className="h-[32px] rounded-xl border border-line bg-white px-3 disabled:opacity-40">Previous</button>
              <PaginationPageButtons
                items={pageNums}
                currentPage={curPage}
                onPageChange={setCurPage}
                ellipsisClassName="flex h-[32px] min-w-[32px] items-center justify-center text-ink-muted"
                getButtonClassName={(page) => `h-[32px] min-w-[32px] rounded-xl border text-[13px] ${page === curPage ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white hover:border-brand-500 hover:text-brand-500"}`}
              />
              <button disabled={length === -1 || curPage >= totalPages} onClick={() => setCurPage((page) => page + 1)} className="h-[32px] rounded-xl border border-line bg-white px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
