import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchCustomerPayments,
  type CustomerPaymentRow,
} from "../../api/customerPaymentApi";
import { showErrorAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

type Tab = "pending" | "completed";

type TableRow = {
  id: string;
  sNo: number;
  billNo: string;
  poNo: string;
  customerName: string;
  invoiceNo: string;
  invoiceValue: string;
  claimPercentage: string;
  claimAmount: string;
};

function mapRow(row: CustomerPaymentRow): TableRow {
  return {
    id: `${row.unique_id}__${row.bill_no}__${row.invoice_no}`,
    sNo: row.s_no,
    billNo: row.bill_no || "--",
    poNo: row.po_num || "--",
    customerName: row.customer || "--",
    invoiceNo: row.invoice_no || "--",
    invoiceValue: row.invoice_value || "0",
    claimPercentage: row.claim_percentage || "0%",
    claimAmount: row.claimamt || "0",
  };
}

function parseRowId(id: string) {
  const [unique_id = "", bill_no = "", invoice_no = ""] = id.split("__");
  return { unique_id, bill_no, invoice_no };
}

function PageTopbar({ title, breadcrumbs }: { title: string; breadcrumbs: string[] }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h1 className="text-[18px] font-bold text-[#1e2417]">{title}</h1>
      <div className="flex items-center gap-1 text-[13px] text-[#6b7160]">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span className="text-[#adb3a0]">�</span>}
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
  onAddNew,
}: {
  showEntries: number;
  setShowEntries: (value: number) => void;
  search: string;
  setSearch: (value: string) => void;
  onExport: () => void;
  onAddNew: () => void;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onAddNew}
          className="px-4 py-1.5 bg-[#3d5016] border border-[#3d5016] rounded text-white font-semibold hover:bg-[#2e3d10] transition-colors cursor-pointer text-[13px]"
        >
          + Add New
        </button>
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

export default function CustomerPaymentList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [opt, setOpt] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ fromDate: "", toDate: "", opt: "" });
  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchCustomerPayments({
      status: activeTab,
      from_date: appliedFilters.fromDate,
      to_date: appliedFilters.toDate,
      opt: appliedFilters.opt,
      search,
      start: (curPage - 1) * showEntries,
      length: showEntries,
      draw: curPage,
    })
      .then((res) => {
        if (!active) return;
        setRows(res.data.map(mapRow));
        setTotalCount(res.recordsFiltered ?? res.recordsTotal ?? res.data.length);
      })
      .catch(async (error) => {
        if (!active) return;
        setRows([]);
        setTotalCount(0);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load customer payment records.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, appliedFilters, search, showEntries, curPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / showEntries));

  const handleGo = () => {
    setCurPage(1);
    setAppliedFilters({ fromDate, toDate, opt });
  };

  const handleExport = () => {
    window.open("/api/master/payment/export/excel/", "_blank");
  };

  const handleEdit = (id: string) => {
    const { unique_id, bill_no, invoice_no } = parseRowId(id);
    navigate(
      `/accounts/customer-payment/form/${encodeURIComponent(unique_id)}?bill_no=${encodeURIComponent(bill_no)}&invoice_no=${encodeURIComponent(invoice_no)}`
    );
  };

  return (
    <div className="p-6 min-h-screen bg-[#f5f6f0]">
      <PageTopbar title="Payment" breadcrumbs={["Form", "Payment"]} />

      <div className="bg-white border border-[#e2e4d9] rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-[#e2e4d9] px-5 pt-4 gap-1 bg-white">
          {(["pending", "completed"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setCurPage(1);
              }}
              className={`px-5 py-2 text-[13px] font-semibold rounded-t cursor-pointer border-0 transition-colors ${
                activeTab === tab
                  ? "bg-[#3d5016] text-white"
                  : "bg-[#f3f4ec] text-[#6b7160] hover:bg-[#e8ead8] hover:text-[#3d5016]"
              }`}
            >
              {tab === "pending" ? "Pending" : "Completed"}
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
              <span className="block text-[12px] font-semibold text-[#6b7160] mb-1">Select date type</span>
              <SearchableSelectInput name="opt"
                value={opt}
                onChange={(e) => setOpt(e.target.value)}
                className="px-3 py-2 text-[13px] border border-[#e2e4d9] rounded-lg outline-none w-44 focus:border-[#5a7a1e] focus:ring-1 focus:ring-[#5a7a1e]/20 bg-white"
              >
                <option value="">Select date type</option>
                <option value="4">PO Date</option>
                <option value="5">Invoice Date</option>
                <option value="7">Bill Submission Date</option>
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
          onAddNew={() => navigate("/accounts/customer-payment/form")}
          />

          <div className="overflow-x-auto rounded-lg border border-[#e2e4d9]">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#f3f4ec]">
                  <Th>S.No</Th>
                  <Th>Bill NO</Th>
                  <Th>PO NO</Th>
                  <Th>Customer Name</Th>
                  <Th>Invoice NO</Th>
                  <Th>Invoice Value</Th>
                  <Th>Claim (%)</Th>
                  <Th>Claim Amount</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-[13px] text-[#6b7160]">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-[13px] text-[#6b7160]">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-[#e2e4d9]/60 hover:bg-[#f3f4ec]/60 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-[#fafaf7]"
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.sNo}</td>
                      <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 font-semibold text-[#1e2417]">{row.billNo}</td>
                      <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.poNo}</td>
                      <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.customerName}</td>
                      <td className="px-3 py-2.5 border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.invoiceNo}</td>
                      <td className="px-3 py-2.5 text-right border-x border-[#e2e4d9]/60 font-medium text-[#1e2417] pr-4">{row.invoiceValue}</td>
                      <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60 text-[#6b7160]">{row.claimPercentage}</td>
                      <td className="px-3 py-2.5 text-right border-x border-[#e2e4d9]/60 font-medium text-[#1e2417] pr-4">{row.claimAmount}</td>
                      <td className="px-3 py-2.5 text-center border-x border-[#e2e4d9]/60">
                        <button
                          type="button"
                          onClick={() => handleEdit(row.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded bg-blue-50 text-blue-500 border border-blue-200 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 112.97 2.97L8.582 18.707 5 19.5l.793-3.582L16.862 4.487z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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



