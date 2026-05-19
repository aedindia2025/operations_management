import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import PageTabs from "../../components/common/PageTabs";
import SearchableSelect from "../../components/common/SearchableSelect";
import {
  bulkApproveOperationApproval,
  deleteOperationApproval,
  fetchCompletedOperationApprovalList,
  fetchOperationApprovalFilterOptions,
  fetchPendingOperationApprovalList,
  type OperationApprovalFilterOption,
  type OperationApprovalListParams,
  type OperationApprovalRow,
} from "../../api/operationApprovalApi";
import { fetchUserList } from "../../api/userApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { emitWorkflowSignal } from "../../utils/workflowSignals";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

type TabKey = "pending" | "completed";
type PageView = "list" | "pendingList";
type AttachmentKey = "PO" | "DC" | "IR" | "Invoice";

const ATTACHMENT_LABELS: AttachmentKey[] = ["PO", "DC", "IR", "Invoice"];
const COMPARE_STORAGE_PREFIX = "operationApprovalCompare:";
const PAGE_LENGTH_OPTIONS = [10, 25, 50, 100, -1] as const;
const PAGE_LENGTH_SELECT_OPTIONS = PAGE_LENGTH_OPTIONS.map((n) => ({
  value: String(n),
  label: n === -1 ? "All" : String(n),
}));
const APPROVAL_DATE_TYPE_OPTIONS = ["PO Date", "DC Date", "Invoice Date"].map((option) => ({
  value: option,
  label: option,
}));
const FOLLOWED_BY_USER_TYPE_UID = "65efd97b4df4040205";
const ALL_COLS = [
  "S.No",
  "Po No",
  "Location",
  "Branch Name",
  "Followed By",
  "Invoice No",
  "Dc No",
  "Dc Value",
  "PO",
  "DC",
  "IR",
  "Inv",
  "Compare",
  "Status",
  "Approved",
  "Action",
];

function CompareModal({
  row,
  onClose,
}: {
  row: OperationApprovalRow;
  onClose: () => void;
}) {
  const available: Record<AttachmentKey, boolean> = {
    PO: row.hasPO,
    DC: row.hasDC,
    IR: row.hasIR,
    Invoice: row.hasInv,
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
            className={`flex items-center gap-1.5 text-[13px] cursor-pointer select-none ${!available[key] ? "opacity-40 cursor-not-allowed" : ""
              }`}
          >
            <input name="operationapprovallist_input_95"
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
                    href={encodeURI(urls[key])}
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
                    src={encodeURI(urls[key])}
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

function ExportBtn({ label }: { label: string }) {
  return (
    <button className="rounded-2xl border border-[#d7bf73] bg-white/92 px-4 py-2 text-[13px] font-semibold text-[#6b6a1f] shadow-[0_8px_18px_rgba(180,153,73,0.08)] transition-all hover:-translate-y-[1px] hover:bg-[#fff7dd]">
      {label}
    </button>
  );
}

function PdfIconBtn({ has, url }: { has: boolean; url?: string }) {
  return has && url ? (
    <a
      href={encodeURI(url)}
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
      className={`w-7 h-7 rounded border flex items-center justify-center transition-colors ${has
          ? "bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-700 hover:text-white cursor-pointer"
          : "bg-surface-2 text-ink-muted border-line cursor-not-allowed"
        }`}
    >
      <i className="fa fa-code-compare" />
    </button>
  );
}

function statusClass(status: OperationApprovalRow["status"]) {
  if (status === "Approved") return "text-success font-semibold";
  if (status === "Not Approved") return "text-danger font-semibold";
  return "text-[#e67e00] font-semibold";
}

function dateOptValue(dateType: string) {
  if (dateType === "Invoice Date") return "invoice_date";
  if (dateType === "DC Date") return "dc_date";
  return "po_date";
}

export default function OperationApprovalList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>(
    searchParams.get("tab") === "completed" ? "completed" : "pending",
  );
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateType, setDateType] = useState("PO Date");
  const [teamMember, setTeamMember] = useState("All");
  const [state, setState] = useState("");
  const [zone, setZone] = useState("");
  const [colDropOpen, setColDropOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(ALL_COLS));
  const [compareRow, setCompareRow] = useState<OperationApprovalRow | null>(null);
  const [rows, setRows] = useState<OperationApprovalRow[]>([]);
  const [teamOptions, setTeamOptions] = useState<Array<{ value: string; label: string; keywords?: string }>>([]);
  const [stateOptions, setStateOptions] = useState<OperationApprovalFilterOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<OperationApprovalFilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentPage, setCurrentPage] = useState<PageView>("list");
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingLength, setPendingLength] = useState(10);
  const [pendingCurPage, setPendingCurPage] = useState(1);
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());

  const col = (name: string) => visibleCols.has(name);
  const toggleCol = (name: string) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const requestParams = useMemo<OperationApprovalListParams>(
    () => ({
      draw: 1,
      start: 0,
      length: -1,
      from_date: fromDate,
      to_date: toDate,
      opt: dateOptValue(dateType),
      team_mem: teamMember,
      state,
      zone,
    }),
    [dateType, fromDate, state, teamMember, toDate, zone]
  );

  useEffect(() => {
    const compareKey = searchParams.get("compare_key");
    if (!compareKey) return;
    try {
      const raw = localStorage.getItem(`${COMPARE_STORAGE_PREFIX}${compareKey}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as OperationApprovalRow;
      setCompareRow(parsed);
    } catch {
      // Ignore invalid compare payloads
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      try {
        const [usersRes, filtersRes] = await Promise.all([
          fetchUserList({
            start: 0,
            length: -1,
            user_type_unique_id: FOLLOWED_BY_USER_TYPE_UID,
          }),
          fetchOperationApprovalFilterOptions(),
        ]);
        if (!active) return;
        const options = (usersRes.data || [])
          .filter((row) => row.staff_id && row.staff_name)
          .map((row) => ({
            value: row.staff_id,
            label: row.staff_name,
            keywords: `${row.staff_id} ${row.staff_name}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setTeamOptions(options);
        setStateOptions(filtersRes.states || []);
        setZoneOptions(filtersRes.zones || []);
      } catch {
        if (active) {
          setTeamOptions([]);
          setStateOptions([]);
          setZoneOptions([]);
        }
      }
    };

    void loadOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadRows = async () => {
      setLoading(true);
      try {
        const data =
          activeTab === "pending"
            ? await fetchPendingOperationApprovalList(requestParams)
            : await fetchCompletedOperationApprovalList(requestParams);
        if (!active) return;
        setRows(Array.isArray(data.data) ? data.data : []);
        setCurPage(1);
      } catch (error) {
        if (!active) return;
        setRows([]);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load operation approval list.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRows();
    return () => {
      active = false;
    };
  }, [activeTab, reloadKey, requestParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.poNo,
        r.location,
        r.branchName,
        r.followedBy,
        r.invoiceNo,
        r.dcNo,
        r.dcValue,
        r.approved,
        r.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const pageSize = length === -1 ? Math.max(filtered.length, 1) : length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(curPage, totalPages);
  const paged = length === -1 ? filtered : filtered.slice((safePage - 1) * length, safePage * length);
  const pageNums = getPaginationItems(curPage, totalPages);

  const pendingRows = useMemo(() => rows.filter((r) => r.status !== "Approved"), [rows]);
  const pendingFiltered = useMemo(() => {
    const q = pendingSearch.trim().toLowerCase();
    if (!q) return pendingRows;
    return pendingRows.filter((r) =>
      [
        r.poNo,
        r.followedBy,
        r.customer,
        r.location,
        r.dcNo,
        r.invoiceNo,
        r.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [pendingRows, pendingSearch]);
  const pendingPageSize = pendingLength === -1 ? Math.max(pendingFiltered.length, 1) : pendingLength;
  const pendingTotalPages = Math.max(1, Math.ceil(pendingFiltered.length / pendingPageSize));
  const pendingSafePage = Math.min(pendingCurPage, pendingTotalPages);
  const pendingPaged = pendingLength === -1 ? pendingFiltered : pendingFiltered.slice((pendingSafePage - 1) * pendingLength, pendingSafePage * pendingLength);
  const pendingPageNums = getPaginationItems(pendingSafePage, pendingTotalPages);
  const allPendingVisibleSelected = pendingPaged.length > 0 && pendingPaged.every((r) => selectedPendingIds.has(r.id));

  useEffect(() => {
    if (currentPage !== "pendingList") return;
    setSelectedPendingIds(new Set());
  }, [rows, currentPage]);

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirmAlert("Do you want to delete this record?");
    if (!confirmed) return;

    try {
      const res = await deleteOperationApproval(id);
      if (!res.status) throw new Error(res.message || "Failed to delete operation approval.");
      setRows((prev) => prev.filter((row) => row.id !== id));
      setSelectedPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      emitWorkflowSignal("invoice-dc-pending-refresh");
      await showSuccessAlert("Operation approval moved back to invoice and DC pending.");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to delete operation approval.");
    }
  };

  const handleBulkApprove = async () => {
    const invoiceIds = Array.from(selectedPendingIds);
    if (invoiceIds.length === 0) {
      await showErrorAlert("Please select at least one record to approve.");
      return;
    }

    const confirmed = await showConfirmAlert("Approve selected records?");
    if (!confirmed) return;

    try {
      const res = await bulkApproveOperationApproval(invoiceIds);
      if (!res.status) throw new Error(res.message || "Bulk approval failed.");
      await showSuccessAlert(res.message || `${invoiceIds.length} records approved successfully.`);
      setSelectedPendingIds(new Set());
      setReloadKey((key) => key + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Bulk approval failed.");
    }
  };

  const openCompareInNewTab = (row: OperationApprovalRow) => {
    const compareKey = `${row.id}-${Date.now()}`;
    try {
      localStorage.setItem(`${COMPARE_STORAGE_PREFIX}${compareKey}`, JSON.stringify(row));
    } catch {
      // Ignore storage failures and skip opening compare tab.
      return;
    }
    window.open(`/operation/approval/list?compare_key=${encodeURIComponent(compareKey)}`, "_blank", "noopener,noreferrer");
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

  if (currentPage === "pendingList") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
        <PageTopbar title="Pending List" breadcrumbs={["Operation", "Operation Approval", "Pending List"]} />
        <div className="overflow-hidden rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
          <div className="border-b border-line px-6 py-4 bg-surface-2">
            <h2 className="text-[15px] font-bold tracking-widest text-ink uppercase text-center">Pending List</h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                  Show
                  <SearchableSelect
                    value={String(pendingLength)}
                    onChange={(value) => {
                      setPendingLength(Number(value));
                      setPendingCurPage(1);
                    }}
                    options={PAGE_LENGTH_SELECT_OPTIONS}
                    className="w-[88px]"
                    buttonClassName="px-2 py-1"
                  />
                  entries
                </div>
                <ExportBtn label="Copy" />
                <ExportBtn label="CSV" />
                <ExportBtn label="Excel" />
                <ExportBtn label="PDF" />
                <ExportBtn label="Print" />
              </div>
              <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                Search:
                <input name="pendingsearch"
                  value={pendingSearch}
                  placeholder="Search..."
                  onChange={(e) => {
                    setPendingSearch(e.target.value);
                    setPendingCurPage(1);
                  }}
                  className="px-2.5 py-1 text-[13px] border border-line-dark rounded outline-none w-48 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                />
              </div>
            </div>
            <div className="otm-table-shell overflow-x-auto">
              <table className="otm-table w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-surface-2">
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap min-w-[120px]">
                      Selection
                      <div className="mt-1">
                        <input name="allpendingvisibleselected"
                          type="checkbox"
                          checked={allPendingVisibleSelected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedPendingIds((prev) => {
                              const next = new Set(prev);
                              pendingPaged.forEach((r) => {
                                if (checked) next.add(r.id);
                                else next.delete(r.id);
                              });
                              return next;
                            });
                          }}
                          className="w-3.5 h-3.5 accent-brand-600 cursor-pointer"
                        />
                      </div>
                    </th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">S.No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Po No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Followed By</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Customer</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Location</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Dc No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Invoice No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">PO</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">DC</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">IR</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Invoice</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Comparison</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPaged.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="text-center py-10 text-ink-muted border border-line italic">
                        No pending records found
                      </td>
                    </tr>
                  ) : (
                    pendingPaged.map((r, i) => (
                      <tr key={r.id} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                        <td className="px-3 py-2.5 text-center border-x border-line/50">
                          <input name="operationapprovallist_input_547"
                            type="checkbox"
                            checked={selectedPendingIds.has(r.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedPendingIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(r.id);
                                else next.delete(r.id);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 accent-brand-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50 text-ink-muted">
                          {(pendingSafePage - 1) * pendingPageSize + i + 1}
                        </td>
                        <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                          <div className="font-semibold text-ink text-[13px]">{r.poNo}</div>
                          <div className="text-[11px] text-ink-muted">{r.poDate}</div>
                        </td>
                        <td className="px-3 py-2.5 text-left border-x border-line/50 whitespace-nowrap">{r.followedBy}</td>
                        <td className="px-3 py-2.5 text-left border-x border-line/50 whitespace-nowrap">{r.customer}</td>
                        <td className="px-3 py-2.5 border-x border-line/50 max-w-[260px]">
                          <p className="text-[12px] text-ink-secondary leading-relaxed">{r.location}</p>
                        </td>
                        <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                          <div className="font-semibold text-ink text-[13px]">{r.dcNo}</div>
                          <div className="text-[11px] text-ink-muted">{r.dcDate}</div>
                        </td>
                        <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                          <div className="font-semibold text-ink text-[13px]">{r.invoiceNo}</div>
                          <div className="text-[11px] text-ink-muted">{r.invoiceDate}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.hasPO} url={r.poFileUrl} /></div></td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.hasDC} url={r.dcFileUrl} /></div></td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.hasIR} url={r.irFileUrl} /></div></td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.hasInv} url={r.invFileUrl} /></div></td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50">
                          <div className="flex justify-center">
                            <CompareIconBtn has={r.hasCompare} onClick={() => openCompareInNewTab(r)} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">
                          <span className={statusClass(r.status)}>{r.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-6 pb-4 text-[13px] text-ink-secondary flex items-center justify-between flex-wrap gap-2">
            <span>
              Showing {pendingFiltered.length === 0 ? 0 : (pendingSafePage - 1) * pendingPageSize + 1} to {Math.min(pendingSafePage * pendingPageSize, pendingFiltered.length)} of {pendingFiltered.length} entries
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={pendingSafePage === 1}
                onClick={() => setPendingCurPage((page) => page - 1)}
                className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <PaginationPageButtons
                items={pendingPageNums}
                currentPage={pendingSafePage}
                onPageChange={setPendingCurPage}
                getButtonClassName={(page) => `w-[30px] h-[30px] text-[13px] border rounded cursor-pointer ${
                  page === pendingSafePage
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white border-line hover:border-brand-500 hover:text-brand-500"
                }`}
              />
              <button
                type="button"
                disabled={pendingSafePage >= pendingTotalPages}
                onClick={() => setPendingCurPage((page) => page + 1)}
                className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-line bg-surface-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setCurrentPage("list");
                setSelectedPendingIds(new Set());
              }}
              className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-white border border-red-300 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleBulkApprove()}
              className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-brand-700 hover:bg-brand-800 text-white transition-colors cursor-pointer border-0"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
      <PageTopbar title="Operation Approval List" breadcrumbs={["Operation", "Operation Approval"]} />

      <div className="overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <PageTabs
          items={[
            { value: "pending", label: "Pending" },
            { value: "completed", label: "Completed" },
          ]}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setSearch("");
            setCurPage(1);
            navigate(`?tab=${tab}`);
          }}
        />

        <div className="p-5">
          <div className="relative z-30 flex items-end gap-3 mb-5 flex-wrap">
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">From Date</span>
              <input name="fromdate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 w-40"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">To Date</span>
              <input name="todate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 w-40"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">PO/Invoice Date</span>
              <SearchableSelect
                value={dateType}
                onChange={setDateType}
                options={APPROVAL_DATE_TYPE_OPTIONS}
                className="w-36"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Team Members</span>
              <SearchableSelect
                value={teamMember}
                onChange={setTeamMember}
                options={[
                  { value: "All", label: "All" },
                  ...teamOptions,
                ]}
                className="w-40"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">State</span>
              <SearchableSelect
                value={state}
                onChange={setState}
                options={[
                  { value: "", label: "Select State" },
                  ...stateOptions,
                ]}
                className="w-36"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Zone</span>
              <SearchableSelect
                value={zone}
                onChange={setZone}
                options={[
                  { value: "", label: "Select Zone" },
                  ...zoneOptions,
                ]}
                className="w-36"
              />
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="otm-btn-primary-sm self-end"
            >
              Go
            </button>
            {activeTab === "pending" && (
              <button
                type="button"
                onClick={() => setCurrentPage("pendingList")}
                className="otm-btn-primary-sm self-end ml-auto"
              >
                OverAll Approval
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                Show
                <SearchableSelect
                  value={String(length)}
                  onChange={(value) => {
                    setLength(Number(value));
                    setCurPage(1);
                  }}
                  options={PAGE_LENGTH_SELECT_OPTIONS}
                  className="w-[88px]"
                  buttonClassName="px-2 py-1"
                />
                entries
              </div>
              <ExportBtn label="Copy" />
              <ExportBtn label="CSV" />
              <ExportBtn label="Excel" />
              <ExportBtn label="PDF" />
              <ExportBtn label="Print" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColDropOpen((open) => !open)}
                  className="otm-btn-secondary py-1.5"
                >
                  Column Visibility <i className="fa fa-chevron-down text-[10px]" />
                </button>
                {colDropOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-line rounded-lg shadow-lg z-50 p-3 min-w-[180px]">
                    {ALL_COLS.map((name) => (
                      <label
                        key={name}
                        className="flex items-center gap-2 py-1 text-[13px] text-ink cursor-pointer hover:text-brand-600 select-none"
                      >
                        <input name="operationapprovallist_input_799"
                          type="checkbox"
                          checked={visibleCols.has(name)}
                          onChange={() => toggleCol(name)}
                          className="accent-brand-600 w-3.5 h-3.5"
                        />
                        {name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              Search:
              <input name="search"
                value={search}
                placeholder="Search..."
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurPage(1);
                }}
                className="px-2.5 py-1 text-[13px] border border-line-dark rounded outline-none w-48 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="otm-table-shell overflow-x-auto" onClick={() => colDropOpen && setColDropOpen(false)}>
            <table className="otm-table w-full text-[13px] border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-surface-2">
                  {col("S.No") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">S.No</th>}
                  {col("Po No") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Po No</th>}
                  {col("Location") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Location</th>}
                  {col("Branch Name") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Branch Name</th>}
                  {col("Followed By") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Followed By</th>}
                  {col("Invoice No") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Invoice No</th>}
                  {col("Dc No") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Dc No</th>}
                  {col("Dc Value") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Dc Value</th>}
                  {col("PO") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">PO</th>}
                  {col("DC") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">DC</th>}
                  {col("IR") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">IR</th>}
                  {col("Inv") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Inv</th>}
                  {col("Compare") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Compare</th>}
                  {col("Status") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Status</th>}
                  {col("Approved") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Approved</th>}
                  {col("Action") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Action</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={ALL_COLS.length} className="text-center py-10 text-ink-muted border border-line italic">
                      Loading...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={ALL_COLS.length} className="text-center py-10 text-ink-muted border border-line italic">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  paged.map((r, i) => (
                    <tr key={r.id} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                      {col("S.No") && <td className="px-3 py-3 text-center border-x border-line/50 text-ink-muted">{(safePage - 1) * pageSize + i + 1}</td>}
                      {col("Po No") && (
                        <td className="px-3 py-3 border-x border-line/50 max-w-[180px]">
                          {r.poNo && <div className="font-semibold text-ink text-[13px]">{r.poNo}</div>}
                          <div className="text-[11px] text-ink-muted">{r.poDate}</div>
                        </td>
                      )}
                      {col("Location") && (
                        <td className="px-3 py-3 border-x border-line/50 max-w-[220px]">
                          <p className="font-semibold text-ink text-[13px]">{r.customer}</p>
                          <p className="text-[12px] text-ink-secondary leading-relaxed">{r.location}</p>
                        </td>
                      )}
                      {col("Branch Name") && <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px]">{r.branchName}</td>}
                      {col("Followed By") && <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px]">{r.followedBy}</td>}
                      {col("Invoice No") && (
                        <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap">
                          {r.invoiceNo && <div className="font-semibold text-ink text-[13px]">{r.invoiceNo}</div>}
                          <div className="text-[11px] text-ink-muted">{r.invoiceDate}</div>
                        </td>
                      )}
                      {col("Dc No") && (
                        <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap">
                          <div className="font-semibold text-ink text-[13px]">{r.dcNo}</div>
                          <div className="text-[11px] text-ink-muted">{r.dcDate}</div>
                        </td>
                      )}
                      {col("Dc Value") && <td className="px-3 py-3 text-right border-x border-line/50 whitespace-nowrap font-semibold text-ink">{r.dcValue}</td>}
                      {col("PO") && <td className="px-3 py-3 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.hasPO} url={r.poFileUrl} /></div></td>}
                      {col("DC") && <td className="px-3 py-3 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.hasDC} url={r.dcFileUrl} /></div></td>}
                      {col("IR") && <td className="px-3 py-3 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.hasIR} url={r.irFileUrl} /></div></td>}
                      {col("Inv") && <td className="px-3 py-3 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.hasInv} url={r.invFileUrl} /></div></td>}
                      {col("Compare") && (
                        <td className="px-3 py-3 text-center border-x border-line/50">
                          <div className="flex justify-center">
                            <CompareIconBtn has={r.hasCompare} onClick={() => openCompareInNewTab(r)} />
                          </div>
                        </td>
                      )}
                      {col("Status") && (
                        <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap">
                          <span className={statusClass(r.status)}>{r.status}</span>
                        </td>
                      )}
                      {col("Approved") && (
                        <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-ink-muted text-[13px]">
                          {r.approved}
                        </td>
                      )}
                      {/* {col("Action") && (
                        <td className="px-3 py-3 text-center border-x border-line/50">
                          <div className="flex items-center justify-center gap-1.5">
                            
                            <button
                              type="button"
                              onClick={() => navigate(`/operation/approval/form?id=${r.id}`)}
                              title="Edit"
                              className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                            >
                              <i className="fa fa-pen-to-square" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(r.id)}
                              title="Delete"
                              className="w-7 h-7 flex items-center justify-center rounded bg-danger/10 text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
                            >
                              <i className="fa fa-trash" />
                            </button>
                          </div>
                        </td>
                      )} */}
                      {col("Action") && (
                        <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap min-w-[88px]">
                          <div className="inline-flex min-w-[52px] items-center justify-center gap-1.5 flex-nowrap overflow-visible">
                            {activeTab === "completed" ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/operation/approval/form?id=${r.id}&mode=view`)}
                                title="View"
                                className="relative z-[1] shrink-0 w-7 h-7 flex items-center justify-center rounded bg-green-50 text-green-600 border border-green-200 text-[13px] hover:bg-green-600 hover:text-white transition-colors cursor-pointer"
                              >
                                <i className="fa fa-eye pointer-events-none" />
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/operation/approval/form?id=${r.id}&mode=edit`)}
                                  title="Edit"
                                  className="relative z-[1] shrink-0 w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                                >
                                  <i className="fa fa-pen-to-square pointer-events-none" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(r.id)}
                                  title="Delete"
                                  className="relative z-[1] shrink-0 w-7 h-7 flex items-center justify-center rounded bg-danger/10 text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                >
                                  <i className="fa fa-trash pointer-events-none" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>
              Showing {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setCurPage((page) => page - 1)}
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
                type="button"
                disabled={safePage >= totalPages}
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
