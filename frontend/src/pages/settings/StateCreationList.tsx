import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import { fetchStateList, deleteState } from "../../api/stateApi";
import { showSuccessAlert } from "../../utils/alerts";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

interface Row {
  unique_id: string;
  state_name: string;
  short_name: string;
  is_active: string;
}

export default function StateCreationList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);

  const [rows, setRows] = useState<Row[]>([]);
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
      const start = (curPage - 1) * length;
      const requestLength = length === -1 ? total || 1000 : length;
      const res = await fetchStateList({ search, start: length === -1 ? 0 : start, length: requestLength });
      setRows(res.data ?? []);
      setTotal(res.recordsFiltered ?? 0);
    } catch {
      setError("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [search, curPage, length, total]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCurPage(1);
  }, [search, length]);

  const handleDelete = async (uniqueId: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteState(uniqueId);
      await showSuccessAlert("Successfully record deleted");
      loadData();
    } catch {
      alert("Failed to delete.");
    }
  };

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
  const pageNums = getPaginationItems(curPage, totalPages);

  const start = total === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1;
  const end = length === -1 ? rows.length : Math.min(curPage * length, total);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title="State Creation List"
        breadcrumbs={["Settings", "State Creation"]}
        addLink="/settings/state/form"
      />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
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
            searchPlaceholder="Search state..."
          />

          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table ref={tableRef} className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  <th className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">#</th>
                  <th className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">State Name</th>
                  <th className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Short Name</th>
                  <th className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Active Status</th>
                  <th className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="border border-line py-10 text-center text-ink-muted">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border border-line py-10 text-center text-ink-muted">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row.unique_id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                      <td className="px-4 py-4 text-[#7a7f69]">{length === -1 ? index + 1 : start + index}</td>
                      <td className="px-4 py-4 font-medium text-[#243018]">{row.state_name}</td>
                      <td className="px-4 py-4 text-[#243018]">{row.short_name || "-"}</td>
                      <td className="px-4 py-4">
                        <span className={row.is_active === "Active" ? "status-active" : "status-inactive"}>
                          {row.is_active}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/settings/state/form/${row.unique_id}`)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white"
                          >
                            <i className="fa fa-pen-to-square" />
                          </button>
                          <button
                            onClick={() => handleDelete(row.unique_id)}
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-secondary">
            <span>Showing {start} to {end} of {total} entries</span>
            <div className="flex gap-1">
              <button
                disabled={length === -1 || curPage === 1}
                onClick={() => setCurPage((page) => page - 1)}
                className="h-[36px] cursor-pointer rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40"
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
                onClick={() => setCurPage((page) => page + 1)}
                className="h-[36px] cursor-pointer rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40"
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
