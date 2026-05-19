import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import { deleteCity, fetchCityList, type CityListRow } from "../../api/cityApi";
import { showSuccessAlert } from "../../utils/alerts";

type CityTableRow = CityListRow & {
  rowKey: string;
};

export default function CityCreationList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);

  const [rows, setRows] = useState<CityTableRow[]>([]);
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
      const res = await fetchCityList({ search, start, length });
      setRows(
        res.data.map((item, index) => {
          const rowNumber = start + index;
          const baseKey = item.unique_id || "missing-id";

          return {
            ...item,
            rowKey: `city-row-${rowNumber}-${baseKey}`,
            state_name: item.state_name_display ?? item.state_name,
            district_name: item.district_name_display ?? item.district_name,
            is_active: item.is_active_display ?? item.is_active,
          };
        })
      );
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
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteCity(unique_id);
      await showSuccessAlert("Successfully record deleted");
      loadData();
    } catch {
      alert("Failed to delete.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / length));
  const startEntry = total === 0 ? 0 : (curPage - 1) * length + 1;
  const endEntry = Math.min(curPage * length, total);

  const buildPages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (curPage > 3) pages.push("...");
      for (let i = Math.max(2, curPage - 1); i <= Math.min(totalPages - 1, curPage + 1); i++) {
        pages.push(i);
      }
      if (curPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title="City Creation List"
        breadcrumbs={["Settings", "City Creation"]}
        addLink="/settings/city/form"
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
                  {["#", "State Name", "District Name", "City Name", "Status", "Action"].map((h, i) => (
                    <th
                      key={i}
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
                    <td colSpan={6} className="text-center py-10 text-ink-muted border border-line">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-ink-muted border border-line">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.rowKey} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                      <td className="px-3 py-2 text-ink-muted border border-line">{startEntry + i}</td>
                      <td className="px-3 py-2 border border-line">{r.state_name}</td>
                      <td className="px-3 py-2 border border-line">{r.district_name}</td>
                      <td className="px-3 py-2 border border-line">{r.city_name}</td>
                      <td className="px-3 py-2 border border-line">
                        <span className={r.is_active === "Active" ? "status-active" : "status-inactive"}>
                          {r.is_active}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-line">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/settings/city/form/${r.unique_id}`)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white cursor-pointer"
                          >
                            <i className="fa fa-pen-to-square" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.unique_id)}
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
                onClick={() => setCurPage((p) => p - 1)}
                className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              {buildPages().map((n, i) =>
                n === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="w-[30px] h-[30px] flex items-center justify-center text-ink-muted text-[13px]"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setCurPage(n as number)}
                    className={`h-[36px] w-[36px] text-[13px] border rounded-2xl cursor-pointer ${
                      n === curPage
                        ? "bg-[#657b2f] text-white border-[#657b2f]"
                        : "bg-white border-[#d8dec8] hover:border-[#7b8f43] hover:text-[#5f7427]"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
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

