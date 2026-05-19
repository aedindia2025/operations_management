import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import {
  deleteMaterialQc,
  fetchMaterialQcList,
  type MaterialQcListRow,
  type MaterialQcTab,
} from "../../api/materialQcApi";
import { fetchUserList } from "../../api/userApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type AttachmentKey = "PO" | "DC" | "IR" | "Invoice";

type Row = MaterialQcListRow & {
  locationName: string;
  locationAddress: string;
};

const ALL_COLS = [
  "S.No",
  "PO No",
  "Location",
  "Followed By",
  "INV No",
  "DC No",
  "DC Value",
  "PO",
  "DC",
  "IR",
  "Invoice",
  "Compare",
  "Accounts Status",
  "Accounts Approved",
  "Material QC Status",
  "Material QC Reason",
  "Material QC Approved",
  "Action",
];

const PENDING_LEAF_COLS = [
  "S.No",
  "PO No",
  "Location",
  "Followed By",
  "INV No",
  "DC No",
  "DC Value",
  "PO",
  "DC",
  "IR",
  "Invoice",
  "Compare",
  "Accounts Status",
  "Accounts Approved",
  "Action",
];

const COMPLETED_LEAF_COLS = [
  "S.No",
  "PO No",
  "Location",
  "Followed By",
  "INV No",
  "DC No",
  "DC Value",
  "PO",
  "DC",
  "IR",
  "Invoice",
  "Compare",
  "Accounts Status",
  "Accounts Approved",
  "Material QC Status",
  "Material QC Reason",
  "Material QC Approved",
  "Action",
];

const ATTACHMENT_LABELS: AttachmentKey[] = ["PO", "DC", "IR", "Invoice"];
const COMPARE_STORAGE_PREFIX = "materialQcCompare:";
const FOLLOWED_BY_USER_TYPE_UID = "65efd97b4df4040205";

function getTodayInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

type CompareRow = {
  poFileUrl: string;
  dcFileUrl: string;
  irFileUrl: string;
  invFileUrl: string;
};

function buildPoFileUrl(fileName?: string) {
  const value = String(fileName || "").trim();
  if (!value) return "";
  return `/api/master/purchase-order/files/po_copy/${encodeURIComponent(value)}/`;
}

function buildInvoiceDcFileUrl(fileName?: string) {
  const value = String(fileName || "").trim();
  if (!value) return "";
  return `/api/master/invoice-dc/files/${encodeURIComponent(value)}/`;
}

function splitAddress(value?: string, ledgerName?: string) {
  const parts = String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const firstLine = parts[0] || "";
  const remaining = parts.slice(1).join(", ");

  return {
    locationName: ledgerName || firstLine || "-",
    locationAddress: remaining || firstLine || "-",
  };
}

function amountText(value: number | string) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return String(value || "-");
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusTone(label: string) {
  if (label === "Approved") return "text-success font-semibold";
  if (label === "Rejected" || label === "Not Approved") return "text-danger font-semibold";
  return "text-warning font-semibold";
}

function PdfIconBtn({ has, url }: { has: boolean; url?: string }) {
  return has && url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="w-7 h-7 rounded bg-danger/10 text-danger border border-red-200 flex items-center justify-center hover:bg-danger hover:text-white transition-colors"
      title="Open PDF"
    >
      <i className="fa fa-file-pdf" />
    </a>
  ) : (
    <span className="w-7 h-7 rounded bg-surface-2 text-ink-muted border border-line flex items-center justify-center">
      <i className="fa fa-file-pdf" />
    </span>
  );
}

function CompareIconBtn({ has, onClick }: { has: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!has}
      className={`w-7 h-7 rounded border flex items-center justify-center transition-colors ${
        has
          ? "bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-700 hover:text-white cursor-pointer"
          : "bg-surface-2 text-ink-muted border-line cursor-not-allowed"
      }`}
    >
      <i className="fa fa-code-compare" />
    </button>
  );
}

function CompareModal({ row, onClose }: { row: CompareRow; onClose: () => void }) {
  const available: Record<AttachmentKey, boolean> = {
    PO: Boolean(row.poFileUrl),
    DC: Boolean(row.dcFileUrl),
    IR: Boolean(row.irFileUrl),
    Invoice: Boolean(row.invFileUrl),
  };
  const urls: Record<AttachmentKey, string> = {
    PO: row.poFileUrl,
    DC: row.dcFileUrl,
    IR: row.irFileUrl,
    Invoice: row.invFileUrl,
  };
  const [selectedTabs, setSelectedTabs] = useState<AttachmentKey[]>(() => {
    const defaults = ATTACHMENT_LABELS.filter((key) => available[key]).slice(0, 2);
    return defaults.length ? defaults : ["PO"];
  });

  const visibleTabs = selectedTabs.filter((key) => available[key] && urls[key]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-white shrink-0">
        <h2 className="text-[15px] font-bold text-ink">PO &amp; DC Comparison Attachment</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          <i className="fa fa-xmark text-[18px]" />
        </button>
      </div>

      <div className="flex items-center gap-5 px-6 py-3 border-b border-line bg-white shrink-0">
        {ATTACHMENT_LABELS.map((key) => (
          <label
            key={key}
            className={`flex items-center gap-1.5 text-[13px] cursor-pointer select-none ${
              !available[key] ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            <input name="materialqclist_input_211"
              type="checkbox"
              checked={selectedTabs.includes(key)}
              disabled={!available[key]}
              onChange={(e) => {
                if (!available[key]) return;
                setSelectedTabs((prev) => {
                  if (e.target.checked) {
                    return prev.includes(key) ? prev : [...prev, key];
                  }
                  const next = prev.filter((item) => item !== key);
                  return next.length ? next : prev;
                });
              }}
              className="accent-brand-600 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-ink font-medium">{key}</span>
          </label>
        ))}
      </div>

      <div className="flex-1 bg-[#404040] px-6 py-8 overflow-auto">
        {visibleTabs.length > 0 ? (
          <div className={`grid gap-6 ${visibleTabs.length === 1 ? "grid-cols-1 max-w-4xl mx-auto" : "grid-cols-1 xl:grid-cols-2"}`}>
            {visibleTabs.map((key) => (
              <div key={key} className="min-h-[520px] bg-white shadow-2xl rounded-sm border border-line flex flex-col">
                <div className="px-6 py-4 border-b border-line bg-white flex items-center justify-between gap-3">
                  <h3 className="text-[14px] font-semibold text-ink text-center">{key} Attachment</h3>
                  <a
                    href={urls[key]}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 hover:bg-brand-700 hover:text-white transition-colors"
                  >
                    <i className="fa fa-arrow-up-right-from-square text-[11px]" />
                    Open
                  </a>
                </div>
                <div className="flex-1 p-4 bg-surface-2">
                  <iframe
                    src={urls[key]}
                    title={`${key} Attachment`}
                    className="w-full h-full min-h-[440px] border border-line rounded bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-[13px] text-white">Select at least one available attachment to compare.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end px-6 py-3 border-t border-line bg-white shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-900 transition-colors cursor-pointer"
        >
          <i className="fa fa-xmark text-[12px]" />
          Close
        </button>
      </div>
    </div>
  );
}

export default function MaterialQcList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const tableShellRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const [searchParams] = useSearchParams();
  const pendingDateRangeRef = useRef({ fromDate: "", toDate: "" });
  const completedDateRangeRef = useRef({ fromDate: getTodayInputValue(), toDate: getTodayInputValue() });
  const [activeTab, setActiveTab] = useState<MaterialQcTab>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateType, setDateType] = useState("PO Date");
  const [teamMember, setTeamMember] = useState("All");
  const [teamOptions, setTeamOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [compareRow, setCompareRow] = useState<CompareRow | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(ALL_COLS));
  const [colDropOpen, setColDropOpen] = useState(false);
  const [bottomScrollbarWidth, setBottomScrollbarWidth] = useState(0);

  const col = (name: string) => visibleCols.has(name);
  const toggleCol = (name: string) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  useEffect(() => {
    const compareKey = searchParams.get("compare_key");
    if (!compareKey) return;
    try {
      const raw = localStorage.getItem(`${COMPARE_STORAGE_PREFIX}${compareKey}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CompareRow;
      setCompareRow(parsed);
    } catch {
      // ignore invalid compare cache
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const loadTeamOptions = async () => {
      try {
        const res = await fetchUserList({
          start: 0,
          length: -1,
          user_type_unique_id: FOLLOWED_BY_USER_TYPE_UID,
        });
        if (!active) return;
        const options = (res.data || [])
          .filter((row) => row.staff_id && row.staff_name)
          .map((row) => ({ value: row.staff_id, label: row.staff_name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setTeamOptions(options);
      } catch {
        if (active) setTeamOptions([]);
      }
    };

    void loadTeamOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === "completed") {
      const completedRange = completedDateRangeRef.current;
      setFromDate(completedRange.fromDate || getTodayInputValue());
      setToDate(completedRange.toDate || getTodayInputValue());
      return;
    }

    setFromDate(pendingDateRangeRef.current.fromDate);
    setToDate(pendingDateRangeRef.current.toDate);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "completed") {
      completedDateRangeRef.current = { fromDate, toDate };
      return;
    }

    pendingDateRangeRef.current = { fromDate, toDate };
  }, [activeTab, fromDate, toDate]);

  useEffect(() => {
    const updateScrollbarWidth = () => {
      const width = tableRef.current?.scrollWidth ?? 0;
      setBottomScrollbarWidth(width);
    };

    updateScrollbarWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateScrollbarWidth);
      return () => window.removeEventListener("resize", updateScrollbarWidth);
    }

    const observer = new ResizeObserver(() => updateScrollbarWidth());
    if (tableRef.current) observer.observe(tableRef.current);
    if (tableShellRef.current) observer.observe(tableShellRef.current);
    window.addEventListener("resize", updateScrollbarWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScrollbarWidth);
    };
  }, [activeTab, rows, visibleCols]);

  useEffect(() => {
    setCurPage(1);
  }, [activeTab, dateType, fromDate, toDate, teamMember, search, length]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchMaterialQcList({
          tab: activeTab,
          search: search || undefined,
          page: curPage,
          length,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          opt: dateType === "INV Date" ? "5" : "4",
          team_mem: teamMember === "All" ? undefined : teamMember,
        });

        if (!mounted) return;
        const mapped = (res.data || []).map((row) => ({
          ...row,
          ...splitAddress(row.con_address, row.ledger_name),
        }));
        setRows(mapped);
        setTotalRows(res.recordsFiltered ?? mapped.length);
      } catch (error) {
        if (!mounted) return;
        setRows([]);
        setTotalRows(0);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load material QC records.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeTab, curPage, dateType, fromDate, length, reloadKey, search, teamMember, toDate]);

  const totalPages = Math.max(1, Math.ceil(totalRows / length));
  const pages = useMemo(() => {
    const result: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) result.push(i);
      return result;
    }
    result.push(1);
    if (curPage > 3) result.push("...");
    for (let i = Math.max(2, curPage - 1); i <= Math.min(totalPages - 1, curPage + 1); i += 1) {
      result.push(i);
    }
    if (curPage < totalPages - 2) result.push("...");
    result.push(totalPages);
    return result;
  }, [curPage, totalPages]);

  const accountGroupCount = ["Accounts Status", "Accounts Approved"].filter(col).length;
  const materialGroupCount = activeTab === "completed"
    ? ["Material QC Status", "Material QC Reason", "Material QC Approved"].filter(col).length
    : 0;
  const hasGroupedHeader = accountGroupCount > 0 || materialGroupCount > 0;
  const activeLeafCols = activeTab === "completed" ? COMPLETED_LEAF_COLS : PENDING_LEAF_COLS;
  const visibleLeafCount = Math.max(1, activeLeafCols.filter(col).length);
  const tableMinWidthClass = activeTab === "completed" ? "min-w-[2250px]" : "min-w-[1850px]";
  const tabCls = "rounded-t-[22px] border border-b-0 px-5 py-3 text-[13px] font-semibold transition-all";

  const openRecord = (row: MaterialQcListRow) => {
    navigate(`/stores/material-qc/form?id=${encodeURIComponent(row.id)}&mode=${activeTab === "completed" ? "view" : "edit"}`);
  };

  const openCompareInNewTab = (row: Row) => {
    const comparePayload: CompareRow = {
      poFileUrl: buildPoFileUrl(row.po_file_name),
      dcFileUrl: buildInvoiceDcFileUrl(row.dc_file_name),
      irFileUrl: buildInvoiceDcFileUrl(row.ir_file_name),
      invFileUrl: buildInvoiceDcFileUrl(row.invoice_file_name),
    };
    const compareKey = `${row.id}-${Date.now()}`;
    try {
      localStorage.setItem(`${COMPARE_STORAGE_PREFIX}${compareKey}`, JSON.stringify(comparePayload));
    } catch {
      return;
    }
    window.open(`/stores/material-qc/list?compare_key=${encodeURIComponent(compareKey)}`, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (row: MaterialQcListRow) => {
    const confirmed = await showConfirmAlert("Do you want to delete this record?");
    if (!confirmed) return;

    try {
      await deleteMaterialQc(row.id);
      await showSuccessAlert("Material QC deleted successfully.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to delete material QC.");
    }
  };

  if (compareRow) {
    return (
      <CompareModal
        row={compareRow}
        onClose={() => {
          if (searchParams.get("compare_key")) {
            window.close();
            return;
          }
          setCompareRow(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f4f6ef_34%,#eef2e9_100%)] p-6">
      <PageTopbar title="Material QC" breadcrumbs={["Stores", "Material QC"]} />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.10)]">
        <div className="flex gap-2 border-b border-[#e4e8d7] px-6 pt-5">
          {([
            ["pending", "Pending"],
            ["completed", "Completed"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`${tabCls} cursor-pointer ${
                activeTab === key
                  ? "border-[#6d8d31] bg-[linear-gradient(135deg,#739436_0%,#5f8128_100%)] text-white shadow-[0_14px_28px_rgba(95,129,40,0.22)]"
                  : "border-[#e4e8d7] bg-white text-[#63704a] hover:border-[#cad3b3] hover:text-[#42551d]"
              }`}
            >
              {label}
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
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">Select Date Type</span>
              <SearchableSelectInput name="datetype"
                value={dateType}
                onChange={(e) => setDateType(e.target.value)}
                className="h-11 w-[190px] appearance-none rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10"
              >
                <option>PO Date</option>
                <option>INV Date</option>
              </SearchableSelectInput>
            </div>
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">Team Members</span>
              <SearchableSelectInput name="teammember"
                value={teamMember}
                onChange={(e) => setTeamMember(e.target.value)}
                className="h-11 w-[190px] appearance-none rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10"
              >
                <option value="All">All</option>
                {teamOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SearchableSelectInput>
            </div>
            <button
              type="button"
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
            setSearch={setSearch}
            tableRef={tableRef}
            searchPlaceholder="PO / Invoice / DC / Team"
            showColumnButton={false}
            rightSlot={
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColDropOpen((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#dcc98e] bg-white px-4 py-2 font-semibold text-[#5b641d] shadow-sm transition-colors hover:bg-[#faf4df]"
                >
                  <i className="fa fa-table-columns text-[12px]" />
                  Column Visibility
                  <i className="fa fa-chevron-down text-[10px]" />
                </button>
                {colDropOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-[22px] border border-[#e5e8d7] bg-white p-3 shadow-[0_18px_40px_rgba(46,61,24,0.18)]">
                    {ALL_COLS.map((name) => (
                      <label key={name} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-[13px] text-ink transition-colors hover:bg-[#f6f8f1] hover:text-brand-600 select-none">
                        <input name="materialqclist_input_597"
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
            ref={tableShellRef}
            className="invoice-dc-scroll-host overflow-x-auto overflow-y-hidden rounded-[30px] border border-[#e5e8d7] bg-white pb-4 shadow-[0_20px_38px_rgba(46,61,24,0.08)]"
            onClick={() => colDropOpen && setColDropOpen(false)}
            onScroll={(e) => {
              if (bottomScrollRef.current && bottomScrollRef.current.scrollLeft !== e.currentTarget.scrollLeft) {
                bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          >
            <table ref={tableRef} className={`${tableMinWidthClass} w-full text-[12px] border-collapse`}>
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)]">
                  {col("S.No") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="w-10 whitespace-nowrap px-2 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">S.No</th>
                  )}
                  {col("PO No") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">PO No</th>
                  )}
                  {col("Location") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Location</th>
                  )}
                  {col("Followed By") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Followed By</th>
                  )}
                  {col("INV No") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">INV No</th>
                  )}
                  {col("DC No") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">DC No</th>
                  )}
                  {col("DC Value") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">DC Value</th>
                  )}
                  {col("PO") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="w-16 whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">PO</th>
                  )}
                  {col("DC") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="w-16 whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">DC</th>
                  )}
                  {col("IR") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="w-16 whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">IR</th>
                  )}
                  {col("Invoice") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="w-16 whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Invoice</th>
                  )}
                  {col("Compare") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="w-16 whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Compare</th>
                  )}
                  {accountGroupCount > 0 && (
                    <th colSpan={accountGroupCount} className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Accounts</th>
                  )}
                  {activeTab === "completed" && materialGroupCount > 0 && (
                    <th colSpan={materialGroupCount} className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Material QC</th>
                  )}
                  {col("Action") && (
                    <th rowSpan={hasGroupedHeader ? 2 : 1} className="w-24 whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Action</th>
                  )}
                </tr>
                {hasGroupedHeader && (
                  <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)]">
                    {col("Accounts Status") && (
                      <th className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Status</th>
                    )}
                    {col("Accounts Approved") && (
                      <th className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Approved</th>
                    )}
                    {activeTab === "completed" && col("Material QC Status") && (
                      <th className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Status</th>
                    )}
                    {activeTab === "completed" && col("Material QC Reason") && (
                      <th className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Reason</th>
                    )}
                    {activeTab === "completed" && col("Material QC Approved") && (
                      <th className="whitespace-nowrap px-3 py-2.5 text-center text-[11.5px] font-bold text-ink border border-line-dark">Approved</th>
                    )}
                  </tr>
                )}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={visibleLeafCount} className="text-center py-10 text-ink-muted border border-line">Loading...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleLeafCount} className="text-center py-10 text-ink-muted border border-line">No records found</td>
                  </tr>
                ) : rows.map((row, index) => (
                  <tr key={`${row.invoice_unique_id}-${row.dc_number}`} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                    {col("S.No") && (
                      <td className="px-2 py-2 text-center text-ink-muted border-x border-line/50">{(curPage - 1) * length + index + 1}</td>
                    )}
                    {col("PO No") && (
                      <td className="px-2 py-2 border-x border-line/50">
                        <div className="font-semibold text-ink text-[12px]">{row.po_num || "-"}</div>
                        <div className="text-[10.5px] text-ink-muted">{row.po_date || "-"}</div>
                      </td>
                    )}
                    {col("Location") && (
                      <td className="px-2 py-2 border-x border-line/50 max-w-[240px]">
                        <div className="font-bold text-ink text-[12px]">{row.locationName || "-"}</div>
                        <div className="text-[10.5px] text-ink-muted leading-snug whitespace-pre-line">{row.locationAddress || "-"}</div>
                      </td>
                    )}
                    {col("Followed By") && (
                      <td className="px-2 py-2 text-center border-x border-line/50">{row.team_member || "-"}</td>
                    )}
                    {col("INV No") && (
                      <td className="px-2 py-2 border-x border-line/50">
                        <div className="text-[12px] text-ink font-medium whitespace-nowrap">{row.invoice_no || "-"}</div>
                        <div className="text-[10.5px] text-ink-muted">{row.invoice_date || "-"}</div>
                      </td>
                    )}
                    {col("DC No") && (
                      <td className="px-2 py-2 border-x border-line/50">
                        <div className="text-[12px] text-ink font-medium whitespace-nowrap">{row.dc_number || "-"}</div>
                        <div className="text-[10.5px] text-ink-muted">{row.dc_date || "-"}</div>
                      </td>
                    )}
                    {col("DC Value") && (
                      <td className="px-2 py-2 text-right border-x border-line/50 font-medium whitespace-nowrap">{amountText(row.invoice_value)}</td>
                    )}
                    {col("PO") && (
                      <td className="px-2 py-2 text-center border-x border-line/50"><span className="inline-flex"><PdfIconBtn has={row.has_po} url={buildPoFileUrl(row.po_file_name)} /></span></td>
                    )}
                    {col("DC") && (
                      <td className="px-2 py-2 text-center border-x border-line/50"><span className="inline-flex"><PdfIconBtn has={row.has_dc} url={buildInvoiceDcFileUrl(row.dc_file_name)} /></span></td>
                    )}
                    {col("IR") && (
                      <td className="px-2 py-2 text-center border-x border-line/50"><span className="inline-flex"><PdfIconBtn has={row.has_ir} url={buildInvoiceDcFileUrl(row.ir_file_name)} /></span></td>
                    )}
                    {col("Invoice") && (
                      <td className="px-2 py-2 text-center border-x border-line/50"><span className="inline-flex"><PdfIconBtn has={row.has_invoice} url={buildInvoiceDcFileUrl(row.invoice_file_name)} /></span></td>
                    )}
                    {col("Compare") && (
                      <td className="px-2 py-2 text-center border-x border-line/50">
                        <CompareIconBtn has={row.has_compare} onClick={() => openCompareInNewTab(row)} />
                      </td>
                    )}
                    {col("Accounts Status") && (
                      <td className="px-2 py-2 text-center border-x border-line/50">
                        <span className={statusTone(row.ac_team_status_label)}>{row.ac_team_status_label || "Pending"}</span>
                      </td>
                    )}
                    {col("Accounts Approved") && (
                      <td className="px-2 py-2 text-center border-x border-line/50">{row.ac_team_approved_name || "--"}</td>
                    )}
                    {activeTab === "completed" && col("Material QC Status") && (
                      <td className="px-2 py-2 text-center border-x border-line/50">
                        <span className={statusTone(row.material_qc_status_label)}>{row.material_qc_status_label || "Pending"}</span>
                      </td>
                    )}
                    {activeTab === "completed" && col("Material QC Reason") && (
                      <td className="px-2 py-2 border-x border-line/50 text-center max-w-[220px]">{row.material_qc_reject_reason || "--"}</td>
                    )}
                    {activeTab === "completed" && col("Material QC Approved") && (
                      <td className="px-2 py-2 text-center border-x border-line/50">{row.material_qc_approved_name || "--"}</td>
                    )}
                    {col("Action") && (
                      <td className="px-2 py-2 text-center border-x border-line/50">
                        {activeTab === "completed" ? (
                          <button
                            onClick={() => openRecord(row)}
                            className="w-7 h-7 flex items-center justify-center rounded mx-auto bg-brand-50 text-brand-700 border border-brand-200 text-[13px] hover:bg-brand-700 hover:text-white transition-colors cursor-pointer"
                            title="View"
                          >
                            <i className="fa fa-eye" />
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openRecord(row)}
                              className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <i className="fa fa-pen-to-square" />
                            </button>
                            <button
                              onClick={() => void handleDelete(row)}
                              className="w-7 h-7 flex items-center justify-center rounded bg-danger/10 text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <i className="fa fa-trash" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            ref={bottomScrollRef}
            className="overflow-x-auto overflow-y-hidden px-1"
            onScroll={(e) => {
              if (tableShellRef.current && tableShellRef.current.scrollLeft !== e.currentTarget.scrollLeft) {
                tableShellRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          >
            <div style={{ width: `${bottomScrollbarWidth}px`, height: "1px" }} />
          </div>

          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>
              Showing {totalRows === 0 ? 0 : (curPage - 1) * length + 1} to {Math.min(curPage * length, totalRows)} of {totalRows} entries
            </span>
            <div className="flex gap-1">
              <button
                disabled={curPage === 1}
                onClick={() => setCurPage((page) => page - 1)}
                className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              {pages.map((page, index) =>
                page === "..." ? (
                  <span key={`ellipsis-${index}`} className="w-[30px] h-[30px] flex items-center justify-center text-ink-muted">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurPage(page as number)}
                    className={`w-[30px] h-[30px] text-[13px] border rounded cursor-pointer ${
                      page === curPage ? "bg-brand-500 text-white border-brand-500" : "bg-white border-line hover:border-brand-500 hover:text-brand-500"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                disabled={curPage >= totalPages}
                onClick={() => setCurPage((page) => page + 1)}
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


