import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  deleteAccountsApproval,
  fetchAccountsApprovalCompleted,
  fetchAccountsApprovalPending,
  fetchAccountsApprovalPendingList,
  submitAccountsOverallApproval,
  type AccountsApprovalPendingListRow,
  type AccountsApprovalRow,
} from "../../api/accountsApprovalApi";
import { useAuth } from "../../context/AuthContext";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import { fetchUserList } from "../../api/userApi";

type Tab = "pending" | "completed";
type Page = "accountsApproval" | "pendingList";
type AttachmentKey = "PO" | "DC" | "IR" | "Invoice";
const ATTACHMENT_LABELS: AttachmentKey[] = ["PO", "DC", "IR", "Invoice"];
const COMPARE_STORAGE_PREFIX = "accountsApprovalCompare:";
const FOLLOWED_BY_USER_TYPE_UID = "65efd97b4df4040205";

type TableRow = {
  id: string;
  sNo: number;
  poNo: string;
  poDate: string;
  location: string;
  followedBy: string;
  invoiceNo: string;
  dcNo: string;
  dcValue: string;
  po: boolean;
  poUrl: string;
  dc: boolean;
  dcUrl: string;
  ir: boolean;
  irUrl: string;
  inv: boolean;
  invUrl: string;
  compare: boolean;
  status: string;
  acVerify: string;
};

type PendingListRow = {
  id: string;
  sNo: number;
  poNo: string;
  customer: string;
  dc: string;
  invoice: string;
  po: boolean;
  poUrl: string;
  dcIcon: boolean;
  dcUrl: string;
  ir: boolean;
  irUrl: string;
  invoiceIcon: boolean;
  invoiceUrl: string;
  comparison: boolean;
  acTeamVerifyStatus: string;
  approvedBy: string;
  selected: boolean;
};

type CompareRow = {
  poUrl: string;
  dcUrl: string;
  irUrl: string;
  invUrl: string;
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

function formatDate(value?: string) {
  if (!value) return "--";
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function mapApprovalRow(row: AccountsApprovalRow): TableRow {
  const location = [row.department_name, row.con_address].filter(Boolean).join("\n") || "--";
  const poUrl = buildPoFileUrl(row.po_file);
  const dcUrl = buildInvoiceDcFileUrl(row.dc_file);
  const irUrl = buildInvoiceDcFileUrl(row.ir_file);
  const invUrl = buildInvoiceDcFileUrl(row.invoice_file);
  return {
    id: row.unique_id,
    sNo: row.sno,
    poNo: row.po_num || "--",
    poDate: formatDate(row.po_date),
    location,
    followedBy: row.team_member || "--",
    invoiceNo: row.invoice_no || "--",
    dcNo: row.dc_number || "--",
    dcValue: row.invoice_value_fmt || row.invoice_value || "0.00",
    po: Boolean(poUrl),
    poUrl,
    dc: Boolean(dcUrl),
    dcUrl,
    ir: Boolean(irUrl),
    irUrl,
    inv: Boolean(invUrl),
    invUrl,
    compare: Boolean(poUrl || dcUrl || irUrl || invUrl),
    status: row.ac_verify_status || "Pending",
    acVerify: row.approved_by_name || "--",
  };
}

function mapPendingListRow(row: AccountsApprovalPendingListRow): PendingListRow {
  const poUrl = buildPoFileUrl(row.po_file);
  const dcUrl = buildInvoiceDcFileUrl(row.dc_file);
  const irUrl = buildInvoiceDcFileUrl(row.ir_file);
  const invoiceUrl = buildInvoiceDcFileUrl(row.invoice_file);
  return {
    id: row.unique_id,
    sNo: row.sno,
    poNo: row.po_num || "--",
    customer: row.department_name || row.con_address || "--",
    dc: row.dc_number || "--",
    invoice: row.invoice_no || "--",
    po: Boolean(poUrl),
    poUrl,
    dcIcon: Boolean(dcUrl),
    dcUrl,
    ir: Boolean(irUrl),
    irUrl,
    invoiceIcon: Boolean(invoiceUrl),
    invoiceUrl,
    comparison: Boolean(poUrl || dcUrl || irUrl || invoiceUrl),
    acTeamVerifyStatus: row.ac_verify_status || "Pending",
    approvedBy: row.approved_by_name || "--",
    selected: false,
  };
}

const ActionIconBtn = ({ onClick, viewOnly = false }: { onClick?: () => void; viewOnly?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
  >
    <i className={viewOnly ? "fa fa-eye" : "fa fa-pen-to-square"} />
  </button>
);

const DeleteIconBtn = ({ onClick }: { onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-7 h-7 flex items-center justify-center rounded bg-danger/10 text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
  >
    <i className="fa fa-trash" />
  </button>
);
function CompareModal({ row, onClose }: { row: CompareRow; onClose: () => void }) {
  const available: Record<AttachmentKey, boolean> = {
    PO: Boolean(row.poUrl),
    DC: Boolean(row.dcUrl),
    IR: Boolean(row.irUrl),
    Invoice: Boolean(row.invUrl),
  };
  const urls: Record<AttachmentKey, string> = {
    PO: row.poUrl,
    DC: row.dcUrl,
    IR: row.irUrl,
    Invoice: row.invUrl,
  };
  const [selectedTabs, setSelectedTabs] = useState<AttachmentKey[]>(() => {
    const defaults = ATTACHMENT_LABELS.filter((key) => available[key]).slice(0, 2);
    return defaults.length ? defaults : ["PO"];
  });
  const visibleTabs = selectedTabs.filter((key) => available[key] && urls[key]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-line bg-white shrink-0">
        <h2 className="text-[15px] font-bold text-ink">Accounts Approval Comparison Attachment</h2>
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
            className={`flex items-center gap-1.5 text-[13px] cursor-pointer select-none ${!available[key] ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <input name="accountsapprovallist_input_208"
              type="checkbox"
              checked={selectedTabs.includes(key)}
              disabled={!available[key]}
              onChange={(e) => {
                if (!available[key]) return;
                setSelectedTabs((prev) => {
                  if (e.target.checked) return prev.includes(key) ? prev : [...prev, key];
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
const PdfLinkIcon = ({ url }: { url?: string }) =>
  url ? (
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

const CompareIconBtn = ({ has, onClick }: { has: boolean; onClick: () => void }) =>
  has ? (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 rounded bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center hover:bg-brand-700 hover:text-white transition-colors cursor-pointer"
      title="Open comparison"
    >
      <i className="fa fa-code-compare" />
    </button>
  ) : (
    <span className="w-7 h-7 rounded bg-surface-2 text-ink-muted border border-line flex items-center justify-center">
      <i className="fa fa-code-compare" />
    </span>
  );
function PageTopbar({ title, breadcrumbs, actionLabel, onAction }: { title: string; breadcrumbs: string[]; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between rounded-[28px] border border-[#e4e8d7] bg-[linear-gradient(135deg,#fbfcf7_0%,#f3f6e8_100%)] px-6 py-5 shadow-[0_18px_40px_rgba(46,61,24,0.08)]">
      <div>
        <div className="mb-1 flex items-center gap-1 text-[12px] text-[#7f8968]">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span className="text-[#b1b89d]">/</span>}
              <span className={i === breadcrumbs.length - 1 ? "font-semibold text-[#43551d]" : ""}>{crumb}</span>
            </span>
          ))}
        </div>
        <h1 className="text-[18px] font-bold text-[#1e2417]">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="flex items-center gap-1.5 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(79,122,43,0.28)] cursor-pointer border-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

const Th = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <th className={`px-3 py-2.5 text-[12px] font-semibold text-[#1e2417] text-center border border-[#e2e4d9] whitespace-nowrap select-none ${className}`}>
    <span className="flex items-center justify-center gap-1">
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-[#adb3a0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
      </svg>
    </span>
  </th>
);

function Toolbar({
  showEntries,
  setShowEntries,
  search,
  setSearch,
  colDropOpen,
  setColDropOpen,
  visibleCols,
  toggleCol,
  allCols,
}: {
  showEntries: number;
  setShowEntries: (value: number) => void;
  search: string;
  setSearch: (value: string) => void;
  colDropOpen: boolean;
  setColDropOpen: (fn: (v: boolean) => boolean) => void;
  visibleCols: Set<string>;
  toggleCol: (name: string) => void;
  allCols: string[];
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-[24px] border border-[#ecdcae] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f1de_100%)] px-4 py-4 shadow-[0_16px_30px_rgba(120,98,24,0.08)] flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
          Show
          <SearchableSelectInput name="showentries"
            value={showEntries}
            onChange={(e) => setShowEntries(Number(e.target.value))}
            className="rounded-2xl border border-[#d8dec8] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10"
            style={{ width: 68 }}
          >
            {[10, 25, 50, 100, -1].map((n) => (
              <option key={n} value={n}>{n === -1 ? "All" : n}</option>
            ))}
          </SearchableSelectInput>
          entries
        </div>
        {["Copy", "CSV", "Excel", "PDF", "Print"].map((btn) => (
          <button key={btn} type="button" className="rounded-2xl border border-[#dcc98e] bg-white px-4 py-2 text-[13px] font-semibold text-[#5b641d] shadow-sm transition-colors hover:bg-[#faf4df]">
            {btn}
          </button>
        ))}
        <div className="relative">
          <button
            type="button"
            onClick={() => setColDropOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-2xl border border-[#dcc98e] bg-white px-4 py-2 text-[13px] font-semibold text-[#5b641d] shadow-sm transition-colors hover:bg-[#faf4df]"
          >
            Column Visibility <i className="fa fa-chevron-down text-[10px]" />
          </button>
          {colDropOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 min-w-[210px] rounded-[22px] border border-[#e5e8d7] bg-white p-3 shadow-[0_18px_40px_rgba(46,61,24,0.18)]">
              {allCols.map((name) => (
                <label key={name} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-[13px] text-ink transition-colors hover:bg-[#f6f8f1] hover:text-brand-600 select-none">
                  <input name="accountsapprovallist_input_401"
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
        <span className="sr-only">Search</span>
        <input name="search"
          type="text"
          value={search}
          placeholder="Search..."
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-56 rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10"
        />
      </div>
    </div>
  );
}
function Pagination({ curPage, totalPages, totalCount, showEntries, setCurPage }: { curPage: number; totalPages: number; totalCount: number; showEntries: number; setCurPage: (page: number | ((page: number) => number)) => void }) {
  const safePage = Math.min(curPage, totalPages || 1);
  const showAll = showEntries === -1;
  const startRow = totalCount === 0 ? 0 : showAll ? 1 : (safePage - 1) * showEntries + 1;
  const endRow = totalCount === 0 ? 0 : showAll ? totalCount : Math.min(safePage * showEntries, totalCount);
  const pageNums = getPaginationItems(curPage, totalPages);

  return (
    <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
      <span className="text-[13px] text-[#6b7160]">Showing {startRow} to {endRow} of {totalCount} entries</span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={showAll || safePage === 1}
          onClick={() => setCurPage((page) => Number(page) - 1)}
          className="h-[34px] rounded-xl border border-[#e2e4d9] bg-white px-3 text-[13px] transition-colors hover:border-[#5a7a1e] hover:text-[#5a7a1e] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
          disabled={showAll || safePage >= totalPages}
          onClick={() => setCurPage((page) => Number(page) + 1)}
          className="h-[34px] rounded-xl border border-[#e2e4d9] bg-white px-3 text-[13px] transition-colors hover:border-[#5a7a1e] hover:text-[#5a7a1e] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function PendingListPage({ onBack, approvedBy }: { onBack: () => void; approvedBy: string }) {
  const [rows, setRows] = useState<PendingListRow[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PENDING_COLS = ["Selection", "S.No", "PO NO", "Customer", "DC", "Invoice", "PO", "DC Icon", "IR", "Invoice Icon", "Comparison", "A/C Team Verify Status", "Approved by"];
const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(PENDING_COLS));
const [colDropOpen, setColDropOpen] = useState(false);
const toggleCol = (name: string) => setVisibleCols((prev) => {
  const next = new Set(prev);
  next.has(name) ? next.delete(name) : next.add(name);
  return next;
});
  const [submitting, setSubmitting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAccountsApprovalPendingList({ search, length: showEntries, start: showEntries === -1 ? 0 : (curPage - 1) * showEntries, draw: curPage, order_dir: "asc" })
      .then((res) => {
        if (!active) return;
        setRows(res.data.map(mapPendingListRow));
        setTotalCount(res.recordsFiltered ?? res.recordsTotal ?? res.data.length);
      })
      .catch(async (error) => {
        if (!active) return;
        setRows([]);
        setTotalCount(0);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load accounts approval pending list.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, showEntries, curPage]);

  useEffect(() => {
    setSelectAll(rows.length > 0 && rows.every((row) => row.selected));
  }, [rows]);

  const totalPages = showEntries === -1 ? 1 : Math.max(1, Math.ceil(totalCount / showEntries));

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setRows((prev) => prev.map((row) => ({ ...row, selected: checked })));
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, selected: checked } : row)));
  };

  const handleApprove = async () => {
    const selectedRows = rows.filter((row) => row.selected);
    if (selectedRows.length === 0) {
      await showErrorAlert("Select at least one record to approve.");
      return;
    }
    if (!approvedBy) {
      await showErrorAlert("Logged in user information is missing.");
      return;
    }

    setSubmitting(true);
    try {
      await submitAccountsOverallApproval({
        invoice_unique_ids: selectedRows.map((row) => row.id),
        dc_numbers: selectedRows.map((row) => row.dc),
        approved_by: approvedBy,
      });
      await showSuccessAlert("Accounts approval updated successfully");
      const refreshed = await fetchAccountsApprovalPendingList({ search, length: showEntries, start: showEntries === -1 ? 0 : (curPage - 1) * showEntries, draw: curPage, order_dir: "asc" });
      setRows(refreshed.data.map(mapPendingListRow));
      setTotalCount(refreshed.recordsFiltered ?? refreshed.recordsTotal ?? refreshed.data.length);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to approve selected records.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f4f6ef_34%,#eef2e9_100%)] p-4 md:p-6">
      <PageTopbar title="Accounts Approval" breadcrumbs={["Admin", "Accounts Approval", "Pending List"]} />
      <div className="overflow-visible rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.10)]">
        <div className="border-b border-[#e4e8d7] bg-[linear-gradient(135deg,#fbfcf7_0%,#f3f6e8_100%)] px-6 py-5">
          <h2 className="text-[15px] font-bold tracking-widest text-ink uppercase text-center">Pending List</h2>
        </div>
        <div className="space-y-5 bg-[linear-gradient(180deg,#f7f8f1_0%,#ffffff_18%)] p-5">
          <Toolbar
  showEntries={showEntries}
  setShowEntries={(value) => { setShowEntries(value); setCurPage(1); }}
  search={search}
  setSearch={(value) => { setSearch(value); setCurPage(1); }}
  colDropOpen={colDropOpen}
  setColDropOpen={setColDropOpen}
  visibleCols={visibleCols}
  toggleCol={toggleCol}
  allCols={PENDING_COLS}
/>
          <div className="overflow-x-auto rounded-[28px] border border-[#e5e8d7] bg-white shadow-[0_18px_35px_rgba(46,61,24,0.08)]" onClick={() => colDropOpen && setColDropOpen(false)}>
  <table className="w-full text-[13px] border-collapse">
    <thead>
      <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)]">
        <th className="px-3 py-2.5 text-[12px] font-semibold text-[#3d5a20] text-center border border-line-dark whitespace-nowrap min-w-[120px]">
          <div className="flex flex-col items-center gap-0.5">
            <span>Selection</span>
            <label className="flex items-center gap-1 cursor-pointer font-normal text-ink-secondary">
              (Select All)
              <input name="selectall" type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} className="w-3.5 h-3.5 accent-brand-600 cursor-pointer" />
            </label>
          </div>
        </th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">S.No</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">PO NO</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Customer</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">DC</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Invoice</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">PO</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">DC</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">IR</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Invoice</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Comparison</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">A/C Team Verify Status</th>
        <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Approved by</th>
      </tr>
    </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} className="border border-line px-4 py-10 text-center text-[13px] text-[#6b7160]">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={13} className="border border-line px-4 py-10 text-center text-[13px] text-[#6b7160]">No data available in table</td></tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
  <td className="px-3 py-2.5 text-center border-x border-line/50"><input name="selected" type="checkbox" checked={row.selected} onChange={(e) => handleSelectRow(row.id, e.target.checked)} className="w-3.5 h-3.5 accent-brand-600 cursor-pointer" /></td>
  <td className="px-3 py-2.5 text-center border-x border-line/50 text-ink-muted">{row.sNo}</td>
  <td className="px-3 py-2.5 border-x border-line/50 font-semibold text-ink">{row.poNo}</td>
  <td className="px-3 py-2.5 border-x border-line/50">{row.customer}</td>
  <td className="px-3 py-2.5 text-center border-x border-line/50">{row.dc}</td>
  <td className="px-3 py-2.5 text-center border-x border-line/50">{row.invoice}</td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfLinkIcon url={row.poUrl} /></div></td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfLinkIcon url={row.dcUrl} /></div></td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfLinkIcon url={row.irUrl} /></div></td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfLinkIcon url={row.invoiceUrl} /></div></td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><CompareIconBtn has={row.comparison} onClick={() => openCompareInNewTab({ poUrl: row.poUrl, dcUrl: row.dcUrl, irUrl: row.irUrl, invUrl: row.invoiceUrl })} /></div></td>
                     <td className="px-3 py-2.5 text-center border-x border-line/50">{row.acTeamVerifyStatus}</td>
<td className="px-3 py-2.5 text-center border-x border-line/50">{row.approvedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination curPage={curPage} totalPages={totalPages} totalCount={totalCount} showEntries={showEntries} setCurPage={setCurPage} />
        </div>
        <div className="flex justify-end gap-3 border-t border-line bg-[#fafbf7] px-6 py-4">
          <button type="button" onClick={onBack} className="rounded-2xl border border-[#f0b8a8] bg-[#fff3ef] px-5 py-2.5 text-[13px] font-semibold text-[#d45b35] transition-colors hover:bg-[#ffe7df] cursor-pointer">Cancel</button>
          <button type="button" onClick={handleApprove} disabled={submitting} className="rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(79,122,43,0.28)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-0">{submitting ? "Approving..." : "Approve"}</button>
        </div>
      </div>
    </div>
  );
}

function ExportBtn({ label }: { label: string }) {
  return (
    <button className="px-4 py-1.5 bg-[#f5f0df] border border-[#c8b98f] rounded text-[#5b641d] font-medium hover:bg-[#ebe2c9] transition-colors text-[13px]">
      {label}
    </button>
  );
}
export default function AccountsApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("accountsApproval");
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [poInvoiceDate, setPoInvoiceDate] = useState("PO Date");
  const [teamMember, setTeamMember] = useState("All");
  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [teamMemberOptions, setTeamMemberOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [compareRow, setCompareRow] = useState<CompareRow | null>(null);
  const MAIN_COLS = ["S.No", "Po No", "Location", "Followed By", "Invoice No", "Dc No", "Dc Value", "PO", "DC", "IR", "Inv", "Compare", "Status", "Ac Verify", "Action"];
const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(MAIN_COLS));
const [colDropOpen, setColDropOpen] = useState(false);
const toggleCol = (name: string) => setVisibleCols((prev) => {
  const next = new Set(prev);
  next.has(name) ? next.delete(name) : next.add(name);
  return next;
});
const col = (name: string) => visibleCols.has(name);
  
const [appliedFilters, setAppliedFilters] = useState({ fromDate: "", toDate: "", poInvoiceDate: "PO Date", teamMember: "All" });

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

    const loadTeamMembers = async () => {
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
        setTeamMemberOptions(options);
      } catch {
        if (active) setTeamMemberOptions([]);
      }
    };

    void loadTeamMembers();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const loader = activeTab === "pending" ? fetchAccountsApprovalPending : fetchAccountsApprovalCompleted;
    loader({
      search,
      length: showEntries,
      start: showEntries === -1 ? 0 : (curPage - 1) * showEntries,
      draw: curPage,
      from_date: appliedFilters.fromDate,
      to_date: appliedFilters.toDate,
      opt: appliedFilters.poInvoiceDate === "Invoice Date" ? "5" : "4",
      team_mem: appliedFilters.teamMember !== "All" ? appliedFilters.teamMember : "",
      order_dir: "asc",
    })
      .then((res) => {
        if (!active) return;
        setRows(res.data.map(mapApprovalRow));
        setTotalCount(res.recordsFiltered ?? res.recordsTotal ?? res.data.length);
      })
      .catch(async (error) => {
        if (!active) return;
        setRows([]);
        setTotalCount(0);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load accounts approval records.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, search, showEntries, curPage, appliedFilters, refreshKey]);
  useEffect(() => {
  if (activeTab === "completed") {
    const today = new Date().toISOString().slice(0, 10);
    setFromDate(today);
    setToDate(today);
  }
}, [activeTab]);
  if (currentPage === "pendingList") {
    const approvedBy = user?.unique_id || user?.id || user?.username || "";
    return <PendingListPage onBack={() => setCurrentPage("accountsApproval")} approvedBy={approvedBy} />;
  }

  const totalPages = showEntries === -1 ? 1 : Math.max(1, Math.ceil(totalCount / showEntries));
  const isCompleted = activeTab === "completed";
  const handleDelete = async (row: TableRow) => {
    const confirmed = await showConfirmAlert(`Delete accounts approval for ${row.poNo || row.invoiceNo || "this record"}?`);
    if (!confirmed) return;
    try {
      await deleteAccountsApproval(row.id);
      await showSuccessAlert("Accounts approval moved back to operation approval pending.");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to delete accounts approval record.");
    }
  };
  const openCompareInNewTab = (row: CompareRow) => {
    const compareKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(`${COMPARE_STORAGE_PREFIX}${compareKey}`, JSON.stringify(row));
    window.open(`/accounts/approval/list?compare_key=${encodeURIComponent(compareKey)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f4f6ef_34%,#eef2e9_100%)] p-6">
      {compareRow && (
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
      )}
      <PageTopbar title="Accounts Approval" breadcrumbs={["Admin", "Accounts Approval"]} />
      <div className="overflow-visible rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.10)]">
        <div className="flex gap-2 border-b border-[#e4e8d7] px-6 pt-5">
          {[{ key: "pending", label: "Pending" }, { key: "completed", label: "Completed" }].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key as Tab); setCurPage(1); setSearch(""); }}
              className={`${activeTab === tab.key ? "border-[#6d8d31] bg-[linear-gradient(135deg,#739436_0%,#5f8128_100%)] text-white shadow-[0_14px_28px_rgba(95,129,40,0.22)]" : "border-[#e4e8d7] bg-white text-[#63704a] hover:border-[#cad3b3] hover:text-[#42551d]"} rounded-t-[22px] border border-b-0 px-5 py-3 text-[13px] font-semibold transition-all cursor-pointer`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="space-y-5 bg-[linear-gradient(180deg,#f7f8f1_0%,#ffffff_18%)] p-5 md:p-6">
          <div className="flex flex-wrap items-end gap-4 rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">From Date</span>
              <input name="fromdate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-11 w-44 rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10" />
            </div>
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">To Date</span>
              <input name="todate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-11 w-44 rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10" />
            </div>
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">PO / Invoice Date</span>
              <SearchableSelectInput name="poinvoicedate" value={poInvoiceDate} onChange={(e) => setPoInvoiceDate(e.target.value)} className="h-11 w-44 rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10">
                <option>PO Date</option>
                <option>Invoice Date</option>
              </SearchableSelectInput>
            </div>
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">Team Members</span>
              <SearchableSelectInput name="teammember" value={teamMember} onChange={(e) => setTeamMember(e.target.value)} className="h-11 w-44 rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10">
                <option value="All">All</option>
                {teamMemberOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SearchableSelectInput>
            </div>
            <button type="button" onClick={() => { setAppliedFilters({ fromDate, toDate, poInvoiceDate, teamMember }); setCurPage(1); }} className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-8 text-[14px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(79,122,43,0.28)] self-end cursor-pointer">Go</button>
{!isCompleted && (
  <button
    type="button"
    onClick={() => setCurrentPage("pendingList")}
    className="ml-auto self-end rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(79,122,43,0.28)] cursor-pointer"
  >
    OverAll Approval
  </button>
)}
          </div>
          <Toolbar
  showEntries={showEntries}
  setShowEntries={(value) => { setShowEntries(value); setCurPage(1); }}
  search={search}
  setSearch={(value) => { setSearch(value); setCurPage(1); }}
  colDropOpen={colDropOpen}
  setColDropOpen={setColDropOpen}
  visibleCols={visibleCols}
  toggleCol={toggleCol}
  allCols={MAIN_COLS}
/>
           <div className="overflow-x-auto rounded-[28px] border border-[#e5e8d7] bg-white shadow-[0_18px_35px_rgba(46,61,24,0.08)]" onClick={() => colDropOpen && setColDropOpen(false)}>
  <table className="w-full text-[13px] border-collapse">
    <thead>
      <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)]">
        {col("S.No") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">S.No</th>}
        {col("Po No") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Po No</th>}
        {col("Location") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Location</th>}
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
        {col("Ac Verify") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Ac Verify</th>}
        {col("Action") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Action</th>}
      </tr>
    </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={15} className="border border-line px-4 py-10 text-center text-[13px] text-[#6b7160]">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={15} className="border border-line px-4 py-10 text-center text-[13px] text-[#6b7160]">No matching records found</td></tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                      <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.sNo}</td>
                      <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 min-w-[170px]"><div className="font-semibold text-[#1e2417] text-[12px]">{row.poNo}</div><div className="text-[11px] text-[#6b7160] mt-0.5">{row.poDate}</div></td>
                      <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 min-w-[230px] text-[#6b7160] leading-relaxed text-[12px] whitespace-pre-line">{row.location}</td>
                      <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.followedBy}</td>
                      <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.invoiceNo}</td>
                      <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.dcNo}</td>
                      <td className="px-3 py-2.5 text-right border-x border-[#e2e4d9]/60 font-medium text-[#1e2417] pr-4">{row.dcValue}</td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfLinkIcon url={row.poUrl} /></div></td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfLinkIcon url={row.dcUrl} /></div></td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfLinkIcon url={row.irUrl} /></div></td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><PdfLinkIcon url={row.invUrl} /></div></td>
<td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><CompareIconBtn has={row.compare} onClick={() => openCompareInNewTab({ poUrl: row.poUrl, dcUrl: row.dcUrl, irUrl: row.irUrl, invUrl: row.invUrl })} /></div></td>
                     <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">
  <span className={
    row.status === "Approved" ? "text-success font-semibold" :
    row.status === "Not Approval" ? "text-danger font-semibold" :
    "text-[#e67e00] font-semibold"
  }>
    {row.status}
  </span>
</td>
                      <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.acVerify}</td>
                      <td className="px-3 py-2.5 text-center border-x border-line/50">
  <div className="flex items-center justify-center gap-1.5">
    <ActionIconBtn onClick={() => navigate(`/accounts/approval/form/${row.id}`)} viewOnly={isCompleted} />
    {!isCompleted ? <DeleteIconBtn onClick={() => void handleDelete(row)} /> : null}
  </div>
</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination curPage={curPage} totalPages={totalPages} totalCount={totalCount} showEntries={showEntries} setCurPage={setCurPage} />
        </div>
      </div>
    </div>
  );
}


