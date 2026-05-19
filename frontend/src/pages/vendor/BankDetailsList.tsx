import { useEffect, useMemo, useState } from "react";
import PageTopbar from "../../components/common/PageTopbar";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { approveBankDetails, fetchBankDetails, type BankDetailsRow } from "../../api/bankDetailsApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { getPaginationItems } from "../../utils/pagination";

function StatusBadge({ value }: { value: string }) {
  const normalized = (value || "").toLowerCase();
  const className =
    normalized === "approved" || normalized === "completed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
      : normalized.includes("management") || normalized.includes("accounts")
        ? "bg-sky-100 text-sky-700 border-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
        : "bg-amber-100 text-amber-800 border-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]";

  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${className}`}>{value}</span>;
}

function actionLabel(value: string) {
  if (value === "accounts") return "Approve";
  if (value === "management") return "Approve";
  if (value === "finance") return "Approve";
  return "-";
}

export default function BankDetailsList() {
  const [rows, setRows] = useState<BankDetailsRow[]>([]);
  const [search, setSearch] = useState("");
  const [curPage, setCurPage] = useState(1);
  const [length, setLength] = useState(10);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);

  const load = async (searchValue = "") => {
    setLoading(true);
    try {
      const res = await fetchBankDetails(searchValue);
      setRows(res.data || []);
    } catch (error) {
      setRows([]);
      await showErrorAlert(error instanceof Error ? error.message : "Failed to load bank details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => rows, [rows]);
  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(filteredRows.length / length));
  const safePage = Math.min(curPage, totalPages);
  const pagedRows = length === -1 ? filteredRows : filteredRows.slice((safePage - 1) * length, safePage * length);
  const pageNums = getPaginationItems(safePage, totalPages);
  const startEntry = filteredRows.length === 0 ? 0 : length === -1 ? 1 : (safePage - 1) * length + 1;
  const endEntry = length === -1 ? filteredRows.length : Math.min(safePage * length, filteredRows.length);

  useEffect(() => {
    if (curPage > totalPages) setCurPage(totalPages);
  }, [curPage, totalPages]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setCurPage(1);
    await load(search.trim());
  };

  const handleApprove = async (row: BankDetailsRow) => {
    if (!row.can_approve || !row.action_type) return;
    const ok = await showConfirmAlert("Do you want to approve this record?");
    if (!ok) return;

    setWorkingId(row.id);
    try {
      const res = await approveBankDetails(row.id, row.action_type);
      await showSuccessAlert(res.message || "Approved successfully.");
      await load(search.trim());
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Approval failed.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
      <PageTopbar title="Vendor Account Details" breadcrumbs={["Vendor", "Bank Details"]} />

      <div className="mt-4 overflow-visible rounded-[30px] border border-[#e2e7d0] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
        <div className="flex flex-col gap-3 border-b border-[#e3dfc4] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="m-0 text-[16px] font-bold text-ink">Bank Approval Flow</h2>
            <p className="mt-1 text-[12px] text-ink-muted">Accounts, management, and finance approval for vendor bank details.</p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
            <label htmlFor="bank-details-search" className="sr-only">
              Search vendor bank details
            </label>
            <input
              id="bank-details-search"
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor, bank, account, IFSC"
              className="h-10 w-[320px] max-w-full rounded-2xl border border-[#d7c79c] bg-white px-4 text-[13px] text-ink outline-none shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
            />
            <button
              type="submit"
              className="h-10 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-5 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(79,122,43,0.28)]"
            >
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[13px] text-ink-muted">Loading bank details...</div>
        ) : (
          <div className="bg-white">
            <div className="mx-5 my-5 flex flex-col gap-3 rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)] md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                <label htmlFor="bank-details-length">Show</label>
                <SearchableSelectInput
                  id="bank-details-length"
                  name="bank_details_length"
                  value={length}
                  onChange={(event) => {
                    setLength(Number(event.target.value));
                    setCurPage(1);
                  }}
                  className="h-10 min-w-[92px] rounded-2xl border border-[#d7c79c] bg-white px-3 text-[13px] outline-none focus:border-brand-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>All</option>
                </SearchableSelectInput>
                <span>entries</span>
              </div>
            </div>

            <div className="mx-5 overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
              <table className="w-full min-w-[1200px] text-[12px] border-separate border-spacing-0">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {[
                    "S.No",
                    "Vendor Name",
                    "Name As Per Bank Account",
                    "Bank Name",
                    "Branch Name",
                    "Account No",
                    "IFSC Code",
                    "Entered By",
                    "Accounts Approval",
                    "Management Approval",
                    "Finance Approval",
                    "Status",
                    "Action",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643] whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="border-b border-[#edf1e4] px-3 py-10 text-center italic text-ink-muted">
                      No bank details found
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, index) => (
                    <tr key={row.id} className="group border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                      <td className="border-b border-[#edf1e4] px-4 py-4 text-center font-medium text-ink-muted">
                        {length === -1 ? index + 1 : (safePage - 1) * length + index + 1}
                      </td>
                      <td className="border-b border-[#edf1e4] px-4 py-4">
                        <div className="font-semibold text-ink">{row.vendor_name || "-"}</div>
                        <div className="text-[11px] text-ink-muted mt-1">Vendor Record</div>
                      </td>
                      <td className="border-b border-[#edf1e4] px-4 py-4 text-ink-secondary">
                        {row.acc_holder_name || "-"}
                      </td>
                      <td className="border-b border-[#edf1e4] px-4 py-4">
                        <div className="font-medium text-ink">{row.bank_name || "-"}</div>
                      </td>
                      <td className="border-b border-[#edf1e4] px-4 py-4 text-ink-secondary">
                        {row.branch_name || "-"}
                      </td>
                      <td className="border-b border-[#edf1e4] px-4 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-[#f2f4e8] text-[#49512e] font-semibold tracking-wide">
                          {row.account_no || "-"}
                        </span>
                      </td>
                      <td className="border-b border-[#edf1e4] px-4 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-[#eef4ff] text-[#2854a3] font-semibold tracking-wide">
                          {row.ifsc_code || "-"}
                        </span>
                      </td>
                      <td className="border-b border-[#edf1e4] px-4 py-4 text-ink-secondary">
                        {row.entered_by || "-"}
                      </td>
                      <td className="border-b border-[#edf1e4] px-4 py-4"><StatusBadge value={row.accounts_status} /></td>
                      <td className="border-b border-[#edf1e4] px-4 py-4"><StatusBadge value={row.management_status} /></td>
                      <td className="border-b border-[#edf1e4] px-4 py-4"><StatusBadge value={row.finance_status} /></td>
                      <td className="border-b border-[#edf1e4] px-4 py-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f4f0dc] text-[#5f5a2d] text-[11px] font-bold border border-[#e7ddb0]">
                          <span className="w-2 h-2 rounded-full bg-[#b39b2d]" />
                          {row.final_status}
                        </span>
                      </td>
                      <td className="border-b border-[#edf1e4] px-4 py-4">
                        {row.can_approve ? (
                          <button
                            type="button"
                            onClick={() => void handleApprove(row)}
                            disabled={workingId === row.id}
                            className="min-w-[92px] px-3 py-2 rounded-lg text-white text-[12px] font-semibold border-0 cursor-pointer disabled:opacity-60 shadow-sm hover:shadow-md transition-all"
                            style={{
                              backgroundColor:
                                row.action_type === "accounts"
                                  ? "#15803d"
                                  : row.action_type === "management"
                                    ? "#1d4ed8"
                                    : "#b91c1c",
                            }}
                          >
                            {workingId === row.id ? "Saving..." : actionLabel(row.action_type)}
                          </button>
                        ) : (
                          <span className="text-ink-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4 text-[13px] text-ink-secondary md:flex-row md:items-center md:justify-between">
              <span>
                Showing {startEntry} to {endEntry} of {filteredRows.length} entries
              </span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={length === -1 || safePage === 1}
                  onClick={() => setCurPage((page) => page - 1)}
                  className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <PaginationPageButtons
                  items={pageNums}
                  currentPage={safePage}
                  onPageChange={setCurPage}
                  getButtonClassName={(page) => `h-[36px] w-[36px] rounded-2xl border text-[13px] cursor-pointer ${
                    page === safePage
                      ? "border-[#657b2f] bg-[#657b2f] text-white"
                      : "border-[#d8dec8] bg-white hover:border-[#7b8f43] hover:text-[#5f7427]"
                  }`}
                />
                <button
                  type="button"
                  disabled={length === -1 || safePage >= totalPages}
                  onClick={() => setCurPage((page) => page + 1)}
                  className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
