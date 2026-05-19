import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteSecurityDeposit,
  fetchSecurityDepositCompletedList,
  fetchSecurityDepositList,
  type SecurityDepositCompletedRow,
  type SecurityDepositRow,
} from "../../api/securityDepositApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

type Tab = "partially" | "sdComplete";

function PageTopbar({ title, breadcrumbs }: { title: string; breadcrumbs: string[] }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h1 className="text-[18px] font-bold text-[#1e2417]">{title}</h1>
      <div className="flex items-center gap-1 text-[13px] text-[#6b7160]">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span className="text-[#adb3a0]">›</span>}
            <span className={i === breadcrumbs.length - 1 ? "text-[#1e2417] font-medium" : "hover:text-[#3d5016] cursor-pointer"}>
              {crumb}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Toolbar({
  showEntries,
  setShowEntries,
  search,
  setSearch,
  onExport,
}: {
  showEntries: number;
  setShowEntries: (value: number) => void;
  search: string;
  setSearch: (value: string) => void;
  onExport: () => void;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[13px] text-[#6b7160]">
          Show
          <SearchableSelectInput name="showentries"
            value={showEntries}
            onChange={(e) => setShowEntries(Number(e.target.value))}
            className="px-2 py-1 text-[13px] border border-[#e2e4d9] rounded-lg outline-none focus:border-[#5a7a1e] focus:ring-1 focus:ring-[#5a7a1e]/20 bg-white"
            style={{ width: 68 }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SearchableSelectInput>
          entries
        </div>
        {["Copy", "CSV", "Excel", "PDF", "Print"].map((btn) => (
          <button
            key={btn}
            type="button"
            onClick={btn === "Excel" ? onExport : undefined}
            className="px-4 py-1.5 bg-[#f5f0df] border border-[#c8b98f] rounded text-[#5b641d] font-medium hover:bg-[#ebe2c9] transition-colors cursor-pointer text-[13px]"
          >
            {btn}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[13px] text-[#6b7160]">
        Search:
        <input name="search"
          type="text"
          value={search}
          placeholder="Search..."
          onChange={(e) => setSearch(e.target.value)}
          className="px-2.5 py-1.5 text-[13px] border border-[#e2e4d9] rounded-lg outline-none w-48 focus:border-[#5a7a1e] focus:ring-1 focus:ring-[#5a7a1e]/20 bg-white"
        />
      </div>
    </div>
  );
}

const Th = ({ children }: { children: ReactNode }) => (
  <th className="px-3 py-2.5 text-[12px] font-semibold text-[#1e2417] text-center border border-[#e2e4d9] whitespace-nowrap select-none">
    <span className="flex items-center justify-center gap-1">
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-[#adb3a0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
      </svg>
    </span>
  </th>
);

function Pagination({
  curPage,
  totalPages,
  totalCount,
  showEntries,
  setCurPage,
}: {
  curPage: number;
  totalPages: number;
  totalCount: number;
  showEntries: number;
  setCurPage: (value: number | ((value: number) => number)) => void;
}) {
  const safePage = Math.min(curPage, totalPages || 1);
  const startRow = totalCount === 0 ? 0 : (safePage - 1) * showEntries + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(safePage * showEntries, totalCount);
  const pageNums = getPaginationItems(curPage, totalPages);

  return (
    <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
      <span className="text-[13px] text-[#6b7160]">
        Showing {startRow} to {endRow} of {totalCount} entries
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={safePage === 1}
          onClick={() => setCurPage((page) => Number(page) - 1)}
          className="px-3 h-[30px] text-[13px] bg-white border border-[#e2e4d9] rounded-lg hover:border-[#5a7a1e] hover:text-[#5a7a1e] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
          onClick={() => setCurPage((page) => Number(page) + 1)}
          className="px-3 h-[30px] text-[13px] bg-white border border-[#e2e4d9] rounded-lg hover:border-[#5a7a1e] hover:text-[#5a7a1e] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function SecurityDepositList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("partially");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectDate, setSelectDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ fromDate: "", toDate: "", selectDate: "" });
  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [rows, setRows] = useState<SecurityDepositRow[]>([]);
  const [completedRows, setCompletedRows] = useState<SecurityDepositCompletedRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const params = {
      search,
      start: (curPage - 1) * showEntries,
      length: showEntries,
      draw: curPage,
      from_date: appliedFilters.fromDate,
      to_date: appliedFilters.toDate,
      opt: appliedFilters.selectDate,
    };

    const request = activeTab === "partially"
      ? fetchSecurityDepositList(params)
      : fetchSecurityDepositCompletedList(params);

    request
      .then((res) => {
        if (!active) return;
        if (activeTab === "partially") {
          setRows((res as { data: SecurityDepositRow[] }).data ?? []);
          setCompletedRows([]);
        } else {
          setCompletedRows((res as { data: SecurityDepositCompletedRow[] }).data ?? []);
          setRows([]);
        }
        setTotalCount(res.recordsFiltered ?? res.recordsTotal ?? 0);
      })
      .catch(async (error) => {
        if (!active) return;
        setRows([]);
        setCompletedRows([]);
        setTotalCount(0);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load security deposit records.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, search, curPage, showEntries, appliedFilters, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / showEntries));

  const handleGo = () => {
    setCurPage(1);
    setAppliedFilters({ fromDate, toDate, selectDate });
  };

  const handleExport = () => {
    window.open("/api/master/security-deposit/export-excel/", "_blank");
  };

  const handleDelete = async (row: SecurityDepositRow) => {
    const confirmed = await showConfirmAlert(`Delete security deposit entry for invoice ${row.invoice_no}?`);
    if (!confirmed) return;

    try {
      const res = await deleteSecurityDeposit(row.unique_id);
      if (!res.status) {
        throw new Error(res.error || "Unable to delete security deposit entry.");
      }
      await showSuccessAlert("Security deposit deleted successfully.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Unable to delete security deposit entry.");
    }
  };

  return (
    <div className="p-6 min-h-screen bg-[#f5f6f0]">
      <PageTopbar title="Security Deposit" breadcrumbs={["Accounts", "Security Deposit"]} />

      <div className="bg-white border border-[#e2e4d9] rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-[#e2e4d9] px-5 pt-4 gap-1 bg-white">
          {[
            { key: "partially", label: "Partially Payment" },
            { key: "sdComplete", label: "SD Complete" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key as Tab);
                setCurPage(1);
                setSearch("");
              }}
              className={`px-5 py-2 text-[13px] font-semibold rounded-t cursor-pointer border-0 transition-colors ${
                activeTab === tab.key
                  ? "bg-[#3d5016] text-white"
                  : "bg-[#f3f4ec] text-[#6b7160] hover:bg-[#e8ead8] hover:text-[#3d5016]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          <div className="flex items-end gap-4 mb-5 flex-wrap">
            <div>
              <span className="block text-[12px] font-semibold text-[#6b7160] mb-1">From Date</span>
              <input name="fromdate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 text-[13px] border border-[#e2e4d9] rounded-lg outline-none w-44 focus:border-[#5a7a1e] focus:ring-1 focus:ring-[#5a7a1e]/20 bg-white"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-[#6b7160] mb-1">To Date</span>
              <input name="todate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 text-[13px] border border-[#e2e4d9] rounded-lg outline-none w-44 focus:border-[#5a7a1e] focus:ring-1 focus:ring-[#5a7a1e]/20 bg-white"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-[#6b7160] mb-1">Select Date</span>
              <SearchableSelectInput name="selectdate"
                value={selectDate}
                onChange={(e) => setSelectDate(e.target.value)}
                className="px-3 py-2 text-[13px] border border-[#e2e4d9] rounded-lg outline-none w-44 focus:border-[#5a7a1e] focus:ring-1 focus:ring-[#5a7a1e]/20 bg-white"
              >
                <option value="">Select Date</option>
                <option value="40">PO Date</option>
                <option value="50">Bill Date</option>
              </SearchableSelectInput>
            </div>
            <button
              type="button"
              onClick={handleGo}
              className="px-6 py-2 bg-[#3d5016] hover:bg-[#2e3d10] text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer transition-colors"
            >
              Go
            </button>
          </div>

          <Toolbar
            showEntries={showEntries}
            setShowEntries={(value) => {
              setShowEntries(value);
              setCurPage(1);
            }}
            search={search}
            setSearch={(value) => {
              setSearch(value);
              setCurPage(1);
            }}
            onExport={handleExport}
          />

          <div className="overflow-x-auto rounded-lg border border-[#e2e4d9]">
            {activeTab === "partially" ? (
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#f3f4ec]">
                    <Th>S.No</Th>
                    <Th>Bill No / Date</Th>
                    <Th>PO No / Date</Th>
                    <Th>Invoice No / Date</Th>
                    <Th>Customer Name</Th>
                    <Th>Invoice Value</Th>
                    <Th>Claim (%)</Th>
                    <Th>Claim Amount</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-10 text-[13px] text-[#6b7160]">Loading...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10 text-[13px] text-[#6b7160]">No data available in table</td></tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr
                        key={`${row.unique_id}-${row.invoice_no}`}
                        className={`border-b border-[#e2e4d9]/60 hover:bg-[#f3f4ec]/60 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#fafaf7]"}`}
                      >
                        <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.s_no}</td>
                        <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 min-w-[170px]"><div className="font-semibold text-[#1e2417] text-[12px]">{row.bill_no || "--"}</div><div className="text-[11px] text-[#6b7160] mt-0.5">{row.bill_created_date || "--"}</div></td>
                        <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 min-w-[170px]"><div className="font-semibold text-[#1e2417] text-[12px]">{row.po_num}</div><div className="text-[11px] text-[#6b7160] mt-0.5">{row.po_date}</div></td>
                        <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 min-w-[170px]"><div className="font-semibold text-[#1e2417] text-[12px]">{row.invoice_no}</div><div className="text-[11px] text-[#6b7160] mt-0.5">{row.invoice_date}</div></td>
                        <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.customer_details || "--"}</td>
                        <td className="px-3 py-2.5 text-right border-x border-[#e2e4d9]/60 font-medium text-[#1e2417] pr-4">{row.invoice_value}</td>
                        <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.claim_percentage}</td>
                        <td className="px-3 py-2.5 text-right border-x border-[#e2e4d9]/60 font-medium text-[#1e2417] pr-4">{row.claim_value}</td>
                        <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/accounts/security-deposit/form/${encodeURIComponent(row.bill_form_unique_id)}?invoice_no=${encodeURIComponent(row.invoice_no)}`)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-blue-50 text-blue-500 border border-blue-200 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 112.97 2.97L8.582 18.707 5 19.5l.793-3.582L16.862 4.487z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-500 border border-red-200 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-7 3v7m4-7v7m4-7v7M8 21h8a2 2 0 002-2V7H6v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#f3f4ec]">
                    <Th>S.No</Th>
                    <Th>Bill No / Bill Date</Th>
                    <Th>PO No / Date</Th>
                    <Th>Customer Name</Th>
                    <Th>Invoice Count</Th>
                    <Th>Invoice Value</Th>
                    <Th>Claim (%)</Th>
                    <Th>Claim Amount</Th>
                    <Th>BG Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-10 text-[13px] text-[#6b7160]">Loading...</td></tr>
                  ) : completedRows.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10 text-[13px] text-[#6b7160]">No data available in table</td></tr>
                  ) : (
                    completedRows.map((row, idx) => (
                      <tr
                        key={`${row.bill_form_main_unique_id}-${row.bill_no}`}
                        className={`border-b border-[#e2e4d9]/60 hover:bg-[#f3f4ec]/60 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#fafaf7]"}`}
                      >
                        <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.s_no}</td>
                        <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 min-w-[170px]">{row.bill_details}</td>
                        <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 min-w-[170px]">{row.po_num}</td>
                        <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.customer_details || "--"}</td>
                        <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.invcount}</td>
                        <td className="px-3 py-2.5 text-right border-x border-[#e2e4d9]/60 font-medium text-[#1e2417] pr-4">{row.invoice_value}</td>
                        <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.claim_amount}</td>
                        <td className="px-3 py-2.5 text-right border-x border-[#e2e4d9]/60 font-medium text-[#1e2417] pr-4">{row.claimamnt}</td>
                        <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-50 text-green-600 border border-green-200">
                            {row.bg_num || "Approved"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            curPage={curPage}
            totalPages={totalPages}
            totalCount={totalCount}
            showEntries={showEntries}
            setCurPage={setCurPage}
          />
        </div>
      </div>
    </div>
  );
}


