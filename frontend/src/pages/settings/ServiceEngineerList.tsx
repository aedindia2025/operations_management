import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import {
  deleteServiceEngineer,
  fetchServiceEngineerList,
  type ServiceEngineerRow,
} from "../../api/serviceEngineerApi";

export default function ServiceEngineerList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [rows, setRows] = useState<ServiceEngineerRow[]>([]);
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchServiceEngineerList();
      setRows(data);
    } catch {
      setError("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCurPage(1);
  }, [search, length]);

  const filteredRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return rows;
    return rows.filter((row) =>
      [row.engineer_name_display, row.emp_id_display, row.is_active_display]
        .join(" ")
        .toLowerCase()
        .includes(searchValue)
    );
  }, [rows, search]);

  const effectiveLength = Math.max(length, 1);
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / effectiveLength));
  const startIndex = (curPage - 1) * effectiveLength;
  const pagedRows = filteredRows.slice(startIndex, startIndex + effectiveLength);
  const startEntry = total === 0 ? 0 : startIndex + 1;
  const endEntry = Math.min(startIndex + effectiveLength, total);
  const pageNums = getPaginationItems(curPage, totalPages);

  const handleDelete = async (unique_id: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteServiceEngineer(unique_id);
      loadData();
    } catch {
      alert("Failed to delete.");
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title="Service Engineer List"
        breadcrumbs={["Settings", "Service Engineer"]}
        addLink="/settings/service-engineer/form"
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
                  {["#", "Engineer Name", "Employee ID", "Active Status", "Action"].map((header, index) => (
                    <th
                      key={index}
                      className="px-3 py-2 text-left text-[12px] font-semibold text-ink-secondary tracking-wide border border-line-dark"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-ink-muted border border-line">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-ink-muted border border-line">
                      No records found
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, index) => (
                    <tr key={row.unique_id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                      <td className="px-3 py-2 text-ink-muted border border-line">{startEntry + index}</td>
                      <td className="px-3 py-2 border border-line">{row.engineer_name_display}</td>
                      <td className="px-3 py-2 border border-line">{row.emp_id_display}</td>
                      <td className="px-3 py-2 border border-line">
                        <span className={row.is_active_display === "Active" ? "status-active" : "status-inactive"}>
                          {row.is_active_display}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-line">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/settings/service-engineer/form/${row.unique_id}`)}
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
              Showing {startEntry} to {endEntry} of {total} entries
            </span>
            <div className="flex gap-2">
              <button
                disabled={curPage === 1}
                onClick={() => setCurPage((page) => page - 1)}
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
                onClick={() => setCurPage((page) => page + 1)}
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

