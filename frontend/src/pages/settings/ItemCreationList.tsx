import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import {
  deleteItemCreation,
  fetchItemCreationList,
  type ItemCreationRecord,
} from "../../api/itemCreationApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

function formatDisplayDate(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "-";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;

  const slashMatch = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;

  return raw;
}

export default function ItemCreationList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);

  const [rows, setRows] = useState<ItemCreationRecord[]>([]);
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
      const res = await fetchItemCreationList({ search, start, length });
      setRows(res.data ?? []);
      setTotal(res.recordsFiltered ?? 0);
    } catch {
      setError("Failed to load item creation records.");
    } finally {
      setLoading(false);
    }
  }, [curPage, length, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCurPage(1);
  }, [search, length]);

  const handleDelete = async (uniqueId: string) => {
    const confirmed = await showConfirmAlert("Are you sure you want to delete this record?");
    if (!confirmed) return;

    const res = await deleteItemCreation(uniqueId);
    if (res.status) {
      await showSuccessAlert("Successfully record deleted");
      await loadData();
      return;
    }

    const message =
      typeof res.error === "string"
        ? res.error
        : res.message || "Failed to delete item creation record.";
    setError(message);
    await showErrorAlert(message);
  };

  const totalPages = Math.max(1, Math.ceil(total / length));
  const pageNums = getPaginationItems(curPage, totalPages);

  const startEntry = total === 0 ? 0 : (curPage - 1) * length + 1;
  const endEntry = Math.min(curPage * length, total);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title="Item Creation List"
        breadcrumbs={["Settings", "Item Creation"]}
        addLink="/settings/item/form"
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
            searchPlaceholder="Search by tender name, code, or no..."
          />

          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table ref={tableRef} className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {[
                    "#",
                    "Tender Name",
                    "Tender Code",
                    "Tender No",
                    "Tender Type",
                    "Valid From",
                    "Valid To",
                    "Valid Date Extension",
                    "Action",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-[#d8dec8] px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[#5c6643]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-ink-muted border border-line">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                        Loading...
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-ink-muted border border-line">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row.unique_id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                      <td className="px-4 py-4 text-[#7a7f69]">
                        {startEntry + index}
                      </td>
                      <td className="px-4 py-4 border-line font-medium text-[#243018]">
                        {row.tender_name || "-"}
                      </td>
                      <td className="px-4 py-4 text-[#243018]">{row.tender_code || "-"}
                      </td>
                      <td className="px-4 py-4 text-[#243018]">{row.tender_no || "-"}</td>
                      <td className="px-4 py-4">
                        <span className="status-active">{row.tender_type_display || "-"}</span>
                      </td>
                      <td className="px-4 py-4 text-ink-secondary">
                        {formatDisplayDate(row.validity_from)}
                      </td>
                      <td className="px-4 py-4 text-ink-secondary">
                        {formatDisplayDate(row.validity_to)}
                      </td>
                      <td className="px-4 py-4 text-ink-secondary">
                        {row.validity_date_extension || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/settings/item/form/${row.unique_id}`)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white"
                            title="Edit"
                          >
                            <i className="fa fa-pen-to-square" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.unique_id)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-danger-light text-danger transition-colors hover:bg-danger hover:text-white"
                            title="Delete"
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

            <div className="flex gap-1">
              <button
                type="button"
                disabled={curPage === 1}
                onClick={() => setCurPage((prev) => prev - 1)}
                className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                disabled={curPage >= totalPages}
                onClick={() => setCurPage((prev) => prev + 1)}
                className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

