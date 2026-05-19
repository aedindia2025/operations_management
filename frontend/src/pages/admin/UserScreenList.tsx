import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import { deleteUserScreen, fetchUserScreenList, UserScreenListRow } from "../../api/userScreenApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

export default function UserScreenList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<UserScreenListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = length === -1 ? 0 : (curPage - 1) * length;
      const requestLength = length === -1 ? Math.max(total, 10000) : length;
      const res = await fetchUserScreenList({ search, start, length: requestLength });
      setRows(res.data ?? []);
      setTotal(res.recordsFiltered ?? res.recordsTotal ?? 0);
    } catch {
      setError("Failed to load user screen records.");
      await showErrorAlert("Failed to load user screen records.");
    } finally {
      setLoading(false);
    }
  }, [search, curPage, length, total]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setCurPage(1);
  }, [search, length]);

  const handleDelete = async (uniqueId: string) => {
    const confirmed = await showConfirmAlert("Are you sure you want to delete this user screen?");
    if (!confirmed) return;
    try {
      const res = await deleteUserScreen(uniqueId);
      if (res?.status === 1 || res?.status === true) {
        await showSuccessAlert(res?.msg ?? res?.message ?? "User screen deleted successfully.");
        await loadData();
        return;
      }
      await showErrorAlert(res?.error ?? res?.message ?? "Failed to delete user screen.");
    } catch {
      await showErrorAlert("Failed to delete user screen.");
    }
  };

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
  const pageNums = getPaginationItems(curPage, totalPages);

  const startEntry = total === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1;
  const endEntry = length === -1 ? rows.length : Math.min(curPage * length, total);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.22),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title="User Screen List"
        breadcrumbs={["Admin", "User Screen"]}
        addLink="/admin/user-screen/form"
      />

      <section className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <div className="mb-5 flex items-center justify-between gap-4 flex-wrap rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary flex-wrap">
              <span className="flex items-center gap-2">
                Show
                <SearchableSelectInput name="length"
                  value={length}
                  onChange={(e) => {
                    setLength(+e.target.value);
                    setCurPage(1);
                  }}
                  className="h-10 min-w-[86px] rounded-2xl border border-[#d7c79c] bg-white px-3 text-[13px] outline-none shadow-sm"
                >
                  {[10, 25, 50, 100, -1].map((n) => (
                    <option key={n} value={n}>
                      {n === -1 ? "All" : n}
                    </option>
                  ))}
                </SearchableSelectInput>
                entries
              </span>
            </div>

            <label className="flex h-11 min-w-[280px] items-center gap-3 rounded-2xl border border-[#d9ddcf] bg-white px-4 shadow-sm">
              <i className="fa fa-magnifying-glass text-[12px] text-[#6d7750]" />
              <input name="search"
                value={search}
                placeholder="Search screen, section, main screen..."
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurPage(1);
                }}
                className="w-full border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-[#9aa287]"
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {["#", "Screen Name", "Screen Section", "Main Screen", "Order", "Status", "Action"].map((header) => (
                    <th
                      key={header}
                      className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-ink-muted">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-ink-muted">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={row.unique_id}
                      className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]"
                    >
                      <td className="px-4 py-4 text-[#7a7f69]">{startEntry + index}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#243018]">{row.screen_name || "-"}</div>
                      </td>
                      <td className="px-4 py-4 text-[#425137]">{row.section_screen || "-"}</td>
                      <td className="px-4 py-4 text-[#425137]">{row.main_screen || "-"}</td>
                      <td className="px-4 py-4 text-[#243018]">{row.order_no ?? "-"}</td>
                      <td className="px-4 py-4">
                        <span className={row.is_active === "Active" ? "status-active" : "status-inactive"}>
                          {row.is_active}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/admin/user-screen/form/${row.unique_id}`)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white"
                          >
                            <i className="fa fa-pen-to-square" />
                          </button>
                          <button
                            onClick={() => void handleDelete(row.unique_id)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-danger-light text-danger transition-colors hover:bg-danger hover:text-white"
                          >
                            <i className="fa fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 flex-wrap text-[13px] text-ink-secondary">
            <span>
              Showing {startEntry} to {endEntry} of {total} entries
            </span>
            <div className="flex gap-1">
              <button
                disabled={length === -1 || curPage === 1}
                onClick={() => setCurPage((p) => p - 1)}
                className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40"
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
                disabled={length === -1 || curPage >= totalPages}
                onClick={() => setCurPage((p) => p + 1)}
                className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
