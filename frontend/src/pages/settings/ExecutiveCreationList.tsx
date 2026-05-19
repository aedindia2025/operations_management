import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import {
  deleteExecutiveCreation,
  fetchExecutiveCreationList,
  type ExecutiveCreationRecord,
} from "../../api/executiveCreationApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { getPaginationItems } from "../../utils/pagination";

export default function ExecutiveCreationList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ExecutiveCreationRecord[]>([]);
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        setRows(await fetchExecutiveCreationList());
      } catch {
        setError("Failed to load records.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const value = `${row.executive_name} ${row.user_name} ${row.email_id} ${row.mobile_no}`.toLowerCase();
        return value.includes(search.toLowerCase());
      }),
    [rows, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / length));
  const paged = filtered.slice((curPage - 1) * length, curPage * length);
  const pageNums = getPaginationItems(curPage, totalPages);

  const handleDelete = async (unique_id: string) => {
    const confirmed = await showConfirmAlert("Are you sure you want to delete this record?");
    if (!confirmed) return;

    try {
      const res = await deleteExecutiveCreation(unique_id);
      if (res.status) {
        setRows((prev) => prev.filter((row) => row.unique_id !== unique_id));
        await showSuccessAlert("Successfully record deleted");
      } else {
        const message = typeof res.error === "string" ? res.error : "Failed to delete record.";
        setError(message);
        await showErrorAlert(message);
      }
    } catch {
      setError("Failed to delete record.");
      await showErrorAlert("Failed to delete record.");
    }
  };

  return (
    <div className="p-6">
      <PageTopbar
        title="Executive Creation List"
        breadcrumbs={["Settings", "Executive Creation"]}
        addLink="/settings/executive/form"
      />

      <div className="bg-white border border-line rounded-xl shadow-card">
        <div className="p-5">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-lg">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              Show
              <select
                name="executive_creation_length"
                value={length}
                onChange={(e) => {
                  setLength(Number(e.target.value));
                  setCurPage(1);
                }}
                className="px-2 py-1 text-[13px] border border-line-dark rounded outline-none focus:border-brand-500"
                style={{ width: 68 }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              entries
            </div>

            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              Search:
              <input
                name="executive_creation_search"
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

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-surface-2">
                  {["#", "Executive Name", "Status", "Action"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[12px] font-semibold text-ink-secondary tracking-wide border border-line-dark">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-ink-muted border border-line">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-ink-muted border border-line">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paged.map((row, index) => (
                    <tr key={row.unique_id} className="hover:bg-brand-50 transition-colors">
                      <td className="px-3 py-2 text-ink-muted border border-line">{(curPage - 1) * length + index + 1}</td>
                      <td className="px-3 py-2 border border-line">{row.executive_name}</td>
                      {/* <td className="px-3 py-2 border border-line">{row.user_name}</td>
                      <td className="px-3 py-2 border border-line">{row.email_id}</td>
                      <td className="px-3 py-2 border border-line">{row.mobile_no}</td> */}
                      <td className="px-3 py-2 border border-line">
                        <span className={row.is_active === 1 ? "status-active" : "status-inactive"}>
                          {row.is_active_display || (row.is_active === 1 ? "Active" : "Inactive")}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-line">
                        <div className="flex gap-1">
                          <button
                            onClick={() => navigate(`/settings/executive/form/${row.unique_id}`)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                          >
                            <i className="fa fa-pen-to-square" />
                          </button>
                          <button
                            onClick={() => handleDelete(row.unique_id)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-danger-light text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
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

          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>
              Showing {filtered.length === 0 ? 0 : (curPage - 1) * length + 1} to {Math.min(curPage * length, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex gap-1">
              <button disabled={curPage === 1} onClick={() => setCurPage((p) => p - 1)} className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                Previous
              </button>
              <PaginationPageButtons
                items={pageNums}
                currentPage={curPage}
                onPageChange={setCurPage}
                getButtonClassName={(page) => `w-[30px] h-[30px] text-[13px] border rounded cursor-pointer ${
                  page === curPage ? "bg-brand-500 text-white border-brand-500" : "bg-white border-line hover:border-brand-500 hover:text-brand-500"
                }`}
              />
              <button disabled={curPage >= totalPages} onClick={() => setCurPage((p) => p + 1)} className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
