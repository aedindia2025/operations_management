import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SearchableSelect, { type SearchableSelectOption } from "../../components/common/SearchableSelect";
import { useAuth } from "../../context/AuthContext";
import {
  deleteSignedDocument,
  fetchSignedDocumentList,
  type SignedDocumentPendingRow,
  type SignedDocumentSavedRow,
} from "../../api/signedDocumentApi";
import { fetchUserList } from "../../api/userApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

type ActiveTab = "pending" | "mismatch" | "verified";
type PendingSubTab = "ir" | "snr";
const PAGE_LENGTH_OPTIONS = [10, 25, 50, 100, -1] as const;
const PAGE_LENGTH_SELECT_OPTIONS = PAGE_LENGTH_OPTIONS.map((n) => ({
  value: String(n),
  label: n === -1 ? "All" : String(n),
}));
const DATE_TYPE_OPTIONS = ["PO Date", "Invoice Date", "DC Date"].map((option) => ({
  value: option,
  label: option,
}));
const FOLLOWED_BY_USER_TYPE_UID = "65efd97b4df4040205";

function ExportBtn({ label }: { label: string }) {
  return (
    <button className="otm-btn-secondary">
      {label}
    </button>
  );
}

function PdfIconBtn({ has, url }: { has: boolean; url?: string }) {
  if (!has) return <span className="text-ink-muted text-[12px]">-</span>;
  if (!url) {
    return (
      <button className="flex items-center justify-center w-7 h-7 rounded border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer">
        <i className="fa fa-file-pdf text-[12px]" />
      </button>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Open PDF"
      aria-label="Open PDF"
      className="flex items-center justify-center w-7 h-7 rounded border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
    >
      <i className="fa fa-file-pdf text-[12px]" />
    </a>
  );
}

function FiltersRow({
  fromDate,
  toDate,
  dateType,
  followedBy,
  followedByOptions,
  setFromDate,
  setToDate,
  setDateType,
  setFollowedBy,
  onGo,
}: {
  fromDate: string;
  toDate: string;
  dateType: string;
  followedBy: string;
  followedByOptions: SearchableSelectOption[];
  setFromDate: (v: string) => void;
  setToDate: (v: string) => void;
  setDateType: (v: string) => void;
  setFollowedBy: (v: string) => void;
  onGo: () => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-4 rounded-[30px] border border-[#ecd9a2] bg-[linear-gradient(135deg,#fffdf4_0%,#fffaf0_48%,#f6f8e8_100%)] px-5 py-5 shadow-[0_20px_45px_rgba(104,116,40,0.08)]">
      <div>
        <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a6d3c]">From Date</span>
        <input name="fromdate"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-44 rounded-2xl border border-[#d7cfb1] bg-white px-4 py-3 text-[13px] shadow-[inset_0_1px_2px_rgba(60,70,20,0.05)] outline-none transition focus:border-[#7b962f] focus:ring-4 focus:ring-[#9fba4d]/15"
        />
      </div>
      <div>
        <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a6d3c]">To Date</span>
        <input name="todate"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-44 rounded-2xl border border-[#d7cfb1] bg-white px-4 py-3 text-[13px] shadow-[inset_0_1px_2px_rgba(60,70,20,0.05)] outline-none transition focus:border-[#7b962f] focus:ring-4 focus:ring-[#9fba4d]/15"
        />
      </div>
      <div>
        <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a6d3c]">Date Type</span>
        <SearchableSelect
          value={dateType}
          onChange={setDateType}
          options={DATE_TYPE_OPTIONS}
          className="w-40"
        />
      </div>
      <div>
        <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a6d3c]">Followed By</span>
        <SearchableSelect
          value={followedBy}
          onChange={setFollowedBy}
          options={[
            { value: "All", label: "All" },
            ...followedByOptions,
          ]}
          className="w-44"
        />
      </div>
      <button
        onClick={onGo}
        className="otm-btn-primary self-end px-8"
      >
        Go
      </button>
    </div>
  );
}

function Toolbar({
  length,
  setLength,
  search,
  setSearch,
  setCurPage,
  colDropOpen,
  setColDropOpen,
  allCols,
  visibleCols,
  toggleCol,
}: {
  length: number;
  setLength: (v: number) => void;
  search: string;
  setSearch: (v: string) => void;
  setCurPage: (v: number) => void;
  colDropOpen: boolean;
  setColDropOpen: (v: (prev: boolean) => boolean) => void;
  allCols: string[];
  visibleCols: Set<string>;
  toggleCol: (name: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-[#ecd9a2] bg-[linear-gradient(135deg,#fffdf6_0%,#fffaf2_44%,#f9fbef_100%)] px-5 py-4 shadow-[0_18px_36px_rgba(104,116,40,0.07)]">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-[13px] text-ink-secondary">
          Show
          <SearchableSelect
            value={String(length)}
            onChange={(value) => {
              setLength(Number(value));
              setCurPage(1);
            }}
            options={PAGE_LENGTH_SELECT_OPTIONS}
            className="w-24"
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
            onClick={() => setColDropOpen((v) => !v)}
            className="otm-btn-secondary"
          >
            Column Visibility <i className="fa fa-chevron-down text-[10px]" />
          </button>
          {colDropOpen && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-line rounded-lg shadow-lg z-50 p-3 min-w-[180px]">
              {allCols.map((name) => (
                <label key={name} className="flex items-center gap-2 py-1 text-[13px] text-ink cursor-pointer hover:text-brand-600 select-none">
                  <input name="signeddocumentlist_input_186"
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
        <span className="text-[#7a6d3c]"><i className="fa fa-search" /></span>
        <input name="search"
          value={search}
          placeholder="Search..."
          onChange={(e) => {
            setSearch(e.target.value);
            setCurPage(1);
          }}
          className="w-56 rounded-2xl border border-[#d7cfb1] bg-white px-4 py-3 text-[13px] outline-none transition focus:border-[#7b962f] focus:ring-4 focus:ring-[#9fba4d]/15"
        />
      </div>
    </div>
  );
}

function Pagination({
  curPage,
  totalPages,
  filteredLen,
  length,
  setCurPage,
}: {
  curPage: number;
  totalPages: number;
  filteredLen: number;
  length: number;
  setCurPage: (v: number) => void;
}) {
  const pageNums = getPaginationItems(curPage, totalPages);

  return (
    <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
      <span>
        Showing {filteredLen === 0 ? 0 : (curPage - 1) * length + 1} to {Math.min(curPage * length, filteredLen)} of {filteredLen} entries
      </span>
      <div className="flex gap-1">
        <button
          disabled={curPage === 1}
          onClick={() => setCurPage(curPage - 1)}
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
          onClick={() => setCurPage(curPage + 1)}
          className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function TH({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">{children}</th>;
}

function buildNavigateUrl(row: SignedDocumentPendingRow | SignedDocumentSavedRow) {
  const params = new URLSearchParams({
    consignee_unique_id: row.consigneeUniqueId,
    invoice_no: row.invoiceNo,
    dc_number: row.dcNo,
    ins_unique_id: row.insUniqueId,
  });
  return `/operation/signed-document/form?${params.toString()}`;
}

function optValue(dateType: string) {
  if (dateType === "Invoice Date") return "invoice_date";
  if (dateType === "DC Date") return "dc_date";
  return "po_date";
}

export default function SignedDocumentList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("pending");
  const [pendingSubTab, setPendingSubTab] = useState<PendingSubTab>("ir");
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateType, setDateType] = useState("PO Date");
  const [followedBy, setFollowedBy] = useState("All");
  const [reloadKey, setReloadKey] = useState(0);
  const [colDropOpen, setColDropOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingRows, setPendingRows] = useState<SignedDocumentPendingRow[]>([]);
  const [savedRows, setSavedRows] = useState<SignedDocumentSavedRow[]>([]);
  const [followedByOptions, setFollowedByOptions] = useState<SearchableSelectOption[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [savedTotal, setSavedTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasLoaded, setHasLoaded] = useState(true);
  const requestLength = length;

  const ALL_PENDING_COLS = ["S.No", "Po No / Date", "Followed By", "Ledger Name", "Invoice / Date", "DC / Date", "DC Rec. Status", "DC Sign. Att.", pendingSubTab === "ir" ? "IR. Rec. Status" : "SNR. Rec. Status", pendingSubTab === "ir" ? "IR. Sign. Att." : "SNR. Sign. Att.", pendingSubTab === "ir" ? "IR POD Date" : "SNR POD Date", "Status", "Action"];
  const ALL_SAVED_COLS = ["S.No", "Po No / Date", "Ledger Name", "Followed By", "Invoice / Date", "DC / Date", "DC Signed Document", "Installation Signed Report", "Status", ...(activeTab === "mismatch" ? ["Reject Reason"] : []), "Action"];
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(ALL_PENDING_COLS));

  useEffect(() => {
    setVisibleCols(new Set(activeTab === "pending" ? ALL_PENDING_COLS : ALL_SAVED_COLS));
  }, [activeTab, pendingSubTab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;

    const loadFollowedByOptions = async () => {
      try {
        const res = await fetchUserList({
          start: 0,
          length: -1,
          user_type_unique_id: FOLLOWED_BY_USER_TYPE_UID,
        });
        if (!active) return;
        const options = (res.data || [])
          .filter((row) => row.staff_id && row.staff_name)
          .map((row) => ({
            value: row.staff_id,
            label: row.staff_name,
            keywords: `${row.staff_id} ${row.staff_name}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setFollowedByOptions(options);
      } catch {
        if (active) setFollowedByOptions([]);
      }
    };

    void loadFollowedByOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        if (activeTab === "pending") {
          const res = await fetchSignedDocumentList<SignedDocumentPendingRow>({
            tab: "pending",
            pending_type: pendingSubTab,
            draw: 1,
            start: requestLength === -1 ? 0 : (curPage - 1) * requestLength,
            length: requestLength,
            search: debouncedSearch,
            from_date: fromDate,
            to_date: toDate,
            opt: optValue(dateType),
            followed_by: followedBy,
            team_mem: followedBy === "All" ? "" : followedBy,
            user_type_unique_id: String(user?.user_type_unique_id || ""),
          });
          if (!active) return;
          setPendingRows(res.data || []);
          setPendingTotal(res.recordsFiltered || res.recordsTotal || 0);
        } else {
          const res = await fetchSignedDocumentList<SignedDocumentSavedRow>({
            tab: activeTab,
            draw: 1,
            start: requestLength === -1 ? 0 : (curPage - 1) * requestLength,
            length: requestLength,
            search: debouncedSearch,
            from_date: fromDate,
            to_date: toDate,
            opt: optValue(dateType),
            followed_by: followedBy,
            team_mem: followedBy === "All" ? "" : followedBy,
            user_type_unique_id: String(user?.user_type_unique_id || ""),
          });
          if (!active) return;
          setSavedRows(res.data || []);
          setSavedTotal(res.recordsFiltered || res.recordsTotal || 0);
        }
      } catch (error) {
        if (!active) return;
        setPendingRows([]);
        setSavedRows([]);
        setPendingTotal(0);
        setSavedTotal(0);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load signed document list.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activeTab, pendingSubTab, curPage, requestLength, debouncedSearch, fromDate, toDate, dateType, followedBy, reloadKey, hasLoaded]);

  const currentRows = activeTab === "pending" ? pendingRows : savedRows;
  const currentTotal = activeTab === "pending" ? pendingTotal : savedTotal;
  const pageSize = length === -1 ? Math.max(currentTotal, 1) : length;
  const totalPages = Math.max(1, Math.ceil(currentTotal / pageSize));
  const safePage = Math.min(curPage, totalPages);
  const paged =
    length === -1
      ? currentRows
      : currentRows.slice(0, Math.min(pageSize, currentRows.length));

  const toggleCol = (name: string) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const col = (name: string) => visibleCols.has(name);

  const handleDelete = async (row: SignedDocumentPendingRow | SignedDocumentSavedRow) => {
    const confirmed = await showConfirmAlert("Do you want to delete this record?");
    if (!confirmed) return;
    const fallbackId = row.verificationUniqueId || row.insUniqueId || row.dcNo;
    try {
      const res = await deleteSignedDocument(fallbackId, {
        consigneeUniqueId: row.consigneeUniqueId,
        invoiceNo: row.invoiceNo,
        dcNumber: row.dcNo,
        insUniqueId: row.insUniqueId,
        formMainUniqueId: row.formMainUniqueId,
      });
      if (!res.status) throw new Error(res.message || "Failed to delete record.");
      await showSuccessAlert("Signed document verification deleted successfully.");
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to delete record.");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
      <PageTopbar title="Signed Document Verification" breadcrumbs={["Operation", "Signed Document"]} />

      <div className="overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <div className="flex gap-2 border-b border-[#ece5ca] px-5 pt-4">
          {(["pending", "mismatch", "verified"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurPage(1);
                setSearch("");
                setHasLoaded(true);
              }}
              className={`rounded-t-[20px] border px-5 py-3 text-[13px] font-semibold capitalize transition-all ${
                activeTab === tab ? "border-[#6f8d28] bg-[linear-gradient(135deg,#7fa230_0%,#6f9226_60%,#62801f_100%)] text-white shadow-[0_10px_20px_rgba(108,138,38,0.25)]" : "border-[#e2ddca] bg-white text-ink-secondary hover:border-[#b8c77f] hover:text-brand-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "pending" && (
          <div className="flex gap-2 border-b border-[#ece5ca] bg-surface-2/40 px-5 pt-3">
            {(["ir", "snr"] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  setPendingSubTab(sub);
                  setCurPage(1);
                  setHasLoaded(true);
                }}
                className={`rounded-t-[18px] border px-5 py-2.5 text-[13px] font-semibold transition-all ${
                  pendingSubTab === sub ? "border-[#6f8d28] bg-[linear-gradient(135deg,#89aa39_0%,#73942a_100%)] text-white" : "border-[#e2ddca] bg-white text-ink-secondary hover:border-[#b8c77f] hover:text-brand-700"
                }`}
              >
                {sub === "ir" ? "With IR" : "With SNR"}
              </button>
            ))}
          </div>
        )}

        <div className="p-5">
          <FiltersRow
            fromDate={fromDate}
            toDate={toDate}
            dateType={dateType}
            followedBy={followedBy}
            followedByOptions={followedByOptions}
            setFromDate={setFromDate}
            setToDate={setToDate}
            setDateType={setDateType}
            setFollowedBy={setFollowedBy}
            onGo={async () => {
              setCurPage(1);
              setHasLoaded(true);
              setReloadKey((prev) => prev + 1);
            }}
          />

          <Toolbar
            length={length}
            setLength={setLength}
            search={search}
            setSearch={setSearch}
            setCurPage={setCurPage}
            colDropOpen={colDropOpen}
            setColDropOpen={setColDropOpen}
            allCols={activeTab === "pending" ? ALL_PENDING_COLS : ALL_SAVED_COLS}
            visibleCols={visibleCols}
            toggleCol={toggleCol}
          />

          <div className="otm-table-shell overflow-hidden rounded-[28px] border border-[#e8e1c7] bg-white shadow-[0_18px_40px_rgba(84,96,28,0.06)]">
            <div className="overflow-x-auto">
            {activeTab === "pending" ? (
              <table className="otm-table w-full text-[13px] border-collapse min-w-[1300px]">
                <thead>
                  <tr className="bg-surface-2">
                    {col("S.No") && <TH>S.No</TH>}
                    {col("Po No / Date") && <TH>Po No / Date</TH>}
                    {col("Followed By") && <TH>Followed By</TH>}
                    {col("Ledger Name") && <TH>Ledger Name</TH>}
                    {col("Invoice / Date") && <TH>Invoice / Date</TH>}
                    {col("DC / Date") && <TH>DC / Date</TH>}
                    {col("DC Rec. Status") && <TH>DC Rec. Status</TH>}
                    {col("DC Sign. Att.") && <TH>DC Sign. Att.</TH>}
                    {col(pendingSubTab === "ir" ? "IR. Rec. Status" : "SNR. Rec. Status") && <TH>{pendingSubTab === "ir" ? "IR. Rec. Status" : "SNR. Rec. Status"}</TH>}
                    {col(pendingSubTab === "ir" ? "IR. Sign. Att." : "SNR. Sign. Att.") && <TH>{pendingSubTab === "ir" ? "IR. Sign. Att." : "SNR. Sign. Att."}</TH>}
                    {col(pendingSubTab === "ir" ? "IR POD Date" : "SNR POD Date") && <TH>{pendingSubTab === "ir" ? "IR POD Date" : "SNR POD Date"}</TH>}
                    {col("Status") && <TH>Status</TH>}
                    {col("Action") && <TH>Action</TH>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="text-center py-10 text-ink-muted border border-line italic">Loading...</td>
                    </tr>
                  ) : paged.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-10 text-ink-muted border border-line italic">No data available in table</td>
                    </tr>
                  ) : (
                    (paged as SignedDocumentPendingRow[]).map((r, i) => (
                      <tr key={r.id} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                        {col("S.No") && <td className="px-3 py-3 text-center border-x border-line/50 text-ink-muted">{r.s_no || ((safePage - 1) * pageSize + i + 1)}</td>}
                        {col("Po No / Date") && <td className="px-3 py-3 border-x border-line/50"><div className="font-semibold text-ink text-[13px]">{r.poNo}</div><div className="text-[11px] text-ink-muted">{r.poDate}</div></td>}
                        {col("Followed By") && <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px]">{r.followedBy}</td>}
                        {col("Ledger Name") && <td className="px-3 py-3 border-x border-line/50 max-w-[200px]"><div className="font-semibold text-ink text-[13px]">{r.ledgerName}</div><div className="text-[12px] text-ink-secondary">{r.ledgerCity}</div><div className="text-[12px] text-ink-secondary">{r.ledgerState}</div></td>}
                        {col("Invoice / Date") && <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{r.invoiceNo}</div><div className="text-[11px] text-ink-muted">{r.invoiceDate}</div></td>}
                        {col("DC / Date") && <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{r.dcNo}</div><div className="text-[11px] text-ink-muted">{r.dcDate}</div></td>}
                        {col("DC Rec. Status") && <td className="px-3 py-3 text-center border-x border-line/50 text-[13px]">{r.dcRecStatus}</td>}
                        {col("DC Sign. Att.") && <td className="px-3 py-3 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.dcSignAtt} url={r.dcFileUrl} /></div></td>}
                        {col(pendingSubTab === "ir" ? "IR. Rec. Status" : "SNR. Rec. Status") && <td className="px-3 py-3 text-center border-x border-line/50 text-[13px]">{pendingSubTab === "ir" ? r.irRecStatus : r.snrRecStatus}</td>}
                        {col(pendingSubTab === "ir" ? "IR. Sign. Att." : "SNR. Sign. Att.") && <td className="px-3 py-3 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={pendingSubTab === "ir" ? r.irSignAtt : r.snrSignAtt} url={pendingSubTab === "ir" ? r.irFileUrl : r.snrFileUrl} /></div></td>}
                        {col(pendingSubTab === "ir" ? "IR POD Date" : "SNR POD Date") && <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px]">{pendingSubTab === "ir" ? r.irPodDate || "-" : r.snrPodDate || "-"}</td>}
                        {col("Status") && <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap"><span className="text-[#e67e00] font-semibold">{r.status}</span></td>}
                        {col("Action") && (
                          <td className="px-3 py-3 text-center border-x border-line/50">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => navigate(buildNavigateUrl(r))}
                                title="Edit"
                                className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                              >
                                <i className="fa fa-pen-to-square" />
                              </button>
                              {r.canDelete && (
                                <button
                                  onClick={() => void handleDelete(r)}
                                  title="Delete"
                                  className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-500 border border-red-200 text-[13px] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                >
                                  <i className="fa fa-trash" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="otm-table w-full text-[13px] border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-surface-2">
                    {col("S.No") && <TH>S.No</TH>}
                    {col("Po No / Date") && <TH>Po No / Date</TH>}
                    {col("Ledger Name") && <TH>Ledger Name</TH>}
                    {col("Followed By") && <TH>Followed By</TH>}
                    {col("Invoice / Date") && <TH>Invoice / Date</TH>}
                    {col("DC / Date") && <TH>DC / Date</TH>}
                    {col("DC Signed Document") && <TH>DC Signed Document</TH>}
                    {col("Installation Signed Report") && <TH>Installation Signed Report</TH>}
                    {col("Status") && <TH>Status</TH>}
                    {activeTab === "mismatch" && col("Reject Reason") && <TH>Reject Reason</TH>}
                    {col("Action") && <TH>Action</TH>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-ink-muted border border-line italic">Loading...</td>
                    </tr>
                  ) : paged.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-ink-muted border border-line italic">No data available in table</td>
                    </tr>
                  ) : (
                    (paged as SignedDocumentSavedRow[]).map((r, i) => (
                      <tr key={r.id} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                        {col("S.No") && <td className="px-3 py-3 text-center border-x border-line/50 text-ink-muted">{r.s_no || ((safePage - 1) * pageSize + i + 1)}</td>}
                        {col("Po No / Date") && <td className="px-3 py-3 border-x border-line/50"><div className="font-semibold text-ink text-[13px]">{r.poNo}</div><div className="text-[11px] text-ink-muted">{r.poDate}</div></td>}
                        {col("Ledger Name") && <td className="px-3 py-3 border-x border-line/50 max-w-[200px]"><div className="font-semibold text-ink text-[13px]">{r.ledgerName}</div><div className="text-[12px] text-ink-secondary">{r.ledgerCity}</div><div className="text-[12px] text-ink-secondary">{r.ledgerState}</div></td>}
                        {col("Followed By") && <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px]">{r.followedBy}</td>}
                        {col("Invoice / Date") && <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{r.invoiceNo}</div><div className="text-[11px] text-ink-muted">{r.invoiceDate}</div></td>}
                        {col("DC / Date") && <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{r.dcNo}</div><div className="text-[11px] text-ink-muted">{r.dcDate}</div></td>}
                        {col("DC Signed Document") && <td className="px-3 py-3 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.dcSignedDoc} url={r.dcFileUrl} /></div></td>}
                        {col("Installation Signed Report") && <td className="px-3 py-3 text-center border-x border-line/50"><div className="flex justify-center"><PdfIconBtn has={r.installSignedReport} url={r.installSignedReportUrl} /></div></td>}
                        {col("Status") && <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap"><span className={r.status === "Verified" ? "text-success font-semibold" : "text-danger font-semibold"}>{r.status}</span></td>}
                        {activeTab === "mismatch" && col("Reject Reason") && (
                          <td className="px-3 py-3 border-x border-line/50 text-[13px] text-ink-secondary">
                            {r.rejectReason || "-"}
                          </td>
                        )}
                        {col("Action") && (
                          <td className="px-3 py-3 text-center border-x border-line/50">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => navigate(buildNavigateUrl(r))}
                                title="Edit"
                                className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                              >
                                <i className="fa fa-pen-to-square" />
                              </button>
                              {r.canDelete && (
                                <button
                                  onClick={() => void handleDelete(r)}
                                  title="Delete"
                                  className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-500 border border-red-200 text-[13px] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                >
                                  <i className="fa fa-trash" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            </div>
          </div>

          <Pagination curPage={safePage} totalPages={totalPages} filteredLen={currentTotal} length={pageSize} setCurPage={setCurPage} />
        </div>
      </div>
    </div>
  );
}
