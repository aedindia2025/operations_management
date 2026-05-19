import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import {
  deleteMainCategory,
  fetchMainCategoryList,
  type MainCategoryRecord,
} from "../../api/mainCategoryApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

export default function MainCategoryList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [rows, setRows] = useState<MainCategoryRecord[]>([]);
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
        setRows(await fetchMainCategoryList());
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
      rows.filter((row) =>
        `${row.main_category} ${row.description || ""}`.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / length));
  const paged = filtered.slice((curPage - 1) * length, curPage * length);
  const pageNums = getPaginationItems(curPage, totalPages);

  const handleDelete = async (unique_id: string) => {
    const confirmed = await showConfirmAlert("Are you sure you want to delete this record?");
    if (!confirmed) return;

    try {
      const res = await deleteMainCategory(unique_id);
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
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title="Main Category List"
        breadcrumbs={["Settings", "Main Category"]}
        addLink="/settings/main-category/form"
      />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="p-5">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-lg">
              {error}
            </div>
          )}
          <SettingsListToolbar
            length={length}
            setLength={(value) => {
              setLength(value);
              setCurPage(1);
            }}
            search={search}
            setSearch={(value) => {
              setSearch(value);
              setCurPage(1);
            }}
            tableRef={tableRef}
          /><div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table ref={tableRef} className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {["#", "Main Category", "Status", "Action"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[12px] font-semibold text-ink-secondary tracking-wide border border-line-dark"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-ink-muted border border-line">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-ink-muted border border-line">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paged.map((row, index) => (
                    <tr key={row.unique_id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                      <td className="px-3 py-2 text-ink-muted border border-line">
                        {(curPage - 1) * length + index + 1}
                      </td>
                      <td className="px-3 py-2 border border-line">{row.main_category}</td>
                      <td className="px-3 py-2 border border-line">
                        <span className={row.is_active === 1 ? "status-active" : "status-inactive"}>
                          {row.is_active_display || (row.is_active === 1 ? "Active" : "Inactive")}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-line">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/settings/main-category/form/${row.unique_id}`)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white cursor-pointer"
                          >
                            <i className="fa fa-pen-to-square" />
                          </button>
                          <button
                            onClick={() => handleDelete(row.unique_id)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-danger-light text-danger transition-colors hover:bg-danger hover:text-white cursor-pointer"
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
            <div className="flex gap-2">
              <button
                disabled={curPage === 1}
                onClick={() => setCurPage((p) => p - 1)}
                className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                onClick={() => setCurPage((p) => p + 1)}
                className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

