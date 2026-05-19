import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import { showSuccessAlert } from "../../utils/alerts";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import {
  fetchAccountVerticalList,
  deleteAccountVertical,
  AccountVerticalListRow,
} from "../../api/accountVerticalApi";

export default function AccountVerticalList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);

  const [rows,    setRows]    = useState<AccountVerticalListRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState("");
  const [length,  setLength]  = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = (curPage - 1) * length;
      const res   = await fetchAccountVerticalList({ search, start, length });
      setRows(res.data);
      setTotal(res.recordsFiltered);
    } catch {
      setError("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [search, curPage, length]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setCurPage(1); }, [search, length]);

  const handleDelete = async (unique_id: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteAccountVertical(unique_id);
      await showSuccessAlert("Successfully record deleted");
      loadData();
    } catch {
      alert("Failed to delete.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / length));
  const pageNums = getPaginationItems(curPage, totalPages);

  const startEntry = total === 0 ? 0 : (curPage - 1) * length + 1;
  const endEntry   = Math.min(curPage * length, total);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title="Account Vertical List"
        breadcrumbs={["Settings", "Account Vertical"]}
        addLink="/settings/account-vertical/form"
      />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="p-5">

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600
              text-[13px] rounded-lg">
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
          />

          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table ref={tableRef} className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {["#", "Account Vertical", "Status", "Action"].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-[12px] font-semibold
                      text-[#5c6643] uppercase tracking-[0.08em] border-b border-[#d8dec8] px-4 py-4">
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
                        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500
                          rounded-full animate-spin" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-ink-muted border border-line">
                      No records found
                    </td>
                  </tr>
                ) : rows.map((r, i) => (
                  <tr key={r.unique_id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] hover:bg-[#f1f7e6] transition-colors">
                    <td className="px-4 py-4 text-[#7a7f69]">
                      {startEntry + i}
                    </td>
                    <td className="px-4 py-4 font-medium text-[#243018]">{r.account_name}</td>
                    <td className="px-4 py-4">
                      <span className={r.is_active === "Active" ? "status-active" : "status-inactive"}>
                        {r.is_active}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/settings/account-vertical/form/${r.unique_id}`)}
                          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white"
                        >
                          <i className="fa fa-pen-to-square" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.unique_id)}
                          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-danger-light text-danger transition-colors hover:bg-danger hover:text-white"
                        >
                          <i className="fa fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-[13px]
            text-ink-secondary flex-wrap gap-2">
            <span>Showing {startEntry} to {endEntry} of {total} entries</span>
            <div className="flex gap-1">
              <button
                disabled={curPage === 1}
                onClick={() => setCurPage(p => p - 1)}
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
                onClick={() => setCurPage(p => p + 1)}
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

