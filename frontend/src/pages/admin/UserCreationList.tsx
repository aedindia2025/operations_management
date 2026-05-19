import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import { deleteUser, fetchUserList, UserListRow } from "../../api/userApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

export default function UserCreationList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<UserListRow[]>([]);
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
      const res = await fetchUserList({ search, start, length: requestLength });
      setRows(res.data);
      setTotal(res.recordsFiltered);
    } catch {
      setError("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [search, curPage, length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCurPage(1);
  }, [search, length]);

  const handleDelete = async (unique_id: string) => {
    const confirmed = await showConfirmAlert("Delete this user record?");
    if (!confirmed) return;

    try {
      const res = await deleteUser(unique_id);
      if (res?.status === false) throw new Error(res?.error || "Failed to delete record.");
      await showSuccessAlert("User deleted successfully.");
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete record.";
      await showErrorAlert(message);
    }
  };

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
  const pageNums = getPaginationItems(curPage, totalPages);
  const startEntry = total === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1;
  const endEntry = length === -1 ? rows.length : Math.min(curPage * length, total);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.22),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar title="User Creation List" breadcrumbs={["Admin", "User Creation"]} addLink="/admin/user-creation/form" />

      <section className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="p-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          ) : null}

          <div className="mb-5 flex items-center justify-between gap-4 flex-wrap rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              <span className="flex items-center gap-2">
                Show
                <SearchableSelectInput name="length"
                  value={length}
                  onChange={(e) => setLength(+e.target.value)}
                  className="h-10 min-w-[86px] rounded-2xl border border-[#d7c79c] bg-white px-3 text-[13px] outline-none shadow-sm"
                >
                  {[10, 25, 50, 100, -1].map((n) => (
                    <option key={n} value={n}>{n === -1 ? "All" : n}</option>
                  ))}
                </SearchableSelectInput>
                entries
              </span>
            </div>

            <label className="flex h-11 min-w-[300px] items-center gap-3 rounded-2xl border border-[#d9ddcf] bg-white px-4 shadow-sm">
              <i className="fa fa-magnifying-glass text-[12px] text-[#6d7750]" />
              <input name="search"
                value={search}
                placeholder="Search staff, phone, username..."
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-[#9aa287]"
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {["#", "Staff Name", "Phone No.", "User Name", "User Type", "Status", "Action"].map((h, i) => (
                    <th key={i} className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-ink-muted">Loading...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-ink-muted">No records found</td>
                  </tr>
                ) : rows.map((r, i) => (
                  <tr key={r.unique_id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                    <td className="px-4 py-4 text-[#7a7f69]">{startEntry + i}</td>
                    <td className="px-4 py-4 font-medium text-[#243018]">{r.staff_name}</td>
                    <td className="px-4 py-4 text-[#243018]">{r.mobile_no}</td>
                    <td className="px-4 py-4 text-[#243018]">{r.user_name}</td>
                    <td className="px-4 py-4 text-[#243018]">{r.user_type_display}</td>
                    <td className="px-4 py-4">
                      <span className={r.is_active === "Active" ? "status-active" : "status-inactive"}>{r.is_active}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/admin/user-creation/form/${r.unique_id}`)} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white">
                          <i className="fa fa-pen-to-square" />
                        </button>
                        <button onClick={() => handleDelete(r.unique_id)} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-danger-light text-danger transition-colors hover:bg-danger hover:text-white">
                          <i className="fa fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 flex-wrap text-[13px] text-ink-secondary">
            <span>Showing {startEntry} to {endEntry} of {total} entries</span>
            <div className="flex gap-1">
              <button disabled={length === -1 || curPage === 1} onClick={() => setCurPage((p) => p - 1)} className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
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
              <button disabled={length === -1 || curPage >= totalPages} onClick={() => setCurPage((p) => p + 1)} className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


