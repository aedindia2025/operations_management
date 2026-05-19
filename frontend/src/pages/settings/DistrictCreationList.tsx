import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import { showSuccessAlert } from "../../utils/alerts";
import {
  fetchDistrictList,
  deleteDistrict,
  importDistrict,
  DistrictListRow
} from "../../api/districtApi";

export default function DistrictCreationList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);

  const [rows, setRows] = useState<DistrictListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = (curPage - 1) * length;
      const res = await fetchDistrictList({ search, start, length });
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

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = async (unique_id: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDistrict(unique_id);
      await showSuccessAlert("Successfully record deleted");
      loadData();
    } catch {
      alert("Failed to delete.");
    }
  };

  // ── Import ───────────────────────────────────────────────
  const handleImport = async () => {
    if (!selectedFile) {
      setImportError("Please select a file.");
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await importDistrict(formData);
      if (res.status === 1) {
        await showSuccessAlert(res.msg ?? "Districts imported successfully");
        setShowImportModal(false);
        setSelectedFile(null);
        loadData();
      } else {
        setImportError(res.error ?? "Import failed.");
      }
    } catch {
      setImportError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setSelectedFile(null);
    setImportError(null);
  };

  // ── Pagination ───────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / length));

  const buildPages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (curPage > 3) pages.push("...");
      for (let i = Math.max(2, curPage - 1); i <= Math.min(totalPages - 1, curPage + 1); i++)
        pages.push(i);
      if (curPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const startEntry = total === 0 ? 0 : (curPage - 1) * length + 1;
  const endEntry = Math.min(curPage * length, total);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title="District Creation List"
        breadcrumbs={["Settings", "District Creation"]}
        addLink="/settings/district/form"
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
            rightSlot={
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(79,122,43,0.30)]"
              >
                <i className="fa fa-file-import text-[12px]" />
                Import
              </button>
            }
          />

          {/* Table */}
          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table ref={tableRef} className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {["#", "State Name", "District Name", "Status", "Action"].map((h, i) => (
                    <th key={i} className="border-b border-[#d8dec8] px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[#5c6643]">
                      {h}
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
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-ink-muted border border-line">
                      No records found
                    </td>
                  </tr>
                ) : rows.map((r, i) => (
                  <tr key={r.unique_id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                    <td className="px-4 py-4 text-[#7a7f69]">{startEntry + i}</td>
                    <td className="px-4 py-4 text-[#243018]">{r.state_name}</td>
                    <td className="px-4 py-4 font-medium text-[#243018]">{r.district_name}</td>
                    <td className="px-4 py-4">
                      <span className={r.is_active === "Active" ? "status-active" : "status-inactive"}>
                        {r.is_active}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/settings/district/form/${r.unique_id}`)}
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

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>Showing {startEntry} to {endEntry} of {total} entries</span>
            <div className="flex gap-1">
              <button
                disabled={curPage === 1}
                onClick={() => setCurPage(p => p - 1)}
                className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              {buildPages().map((n, i) =>
                n === "..." ? (
                  <span key={i} className="px-2 h-[30px] flex items-center text-ink-muted">...</span>
                ) : (
                  <button
                    key={i}
                    onClick={() => setCurPage(n)}
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
                onClick={() => setCurPage(p => p + 1)}
                className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-[600px] shadow-lg">

            <div className="flex justify-between items-center px-5 py-4 border-b border-line">
              <h2 className="text-[18px] font-semibold text-ink-primary">District Creation Import</h2>
              <button
                onClick={closeImportModal}
                className="w-6 h-6 border border-black text-black text-[14px] leading-none"
              >
                X
              </button>
            </div>

            <div className="px-5 py-5">
              <span className="block mb-2 text-[13px] text-ink-secondary">
                Choose Excel File To Import
              </span>

              {importError && (
                <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-lg">
                  {importError}
                </div>
              )}

              <div className="flex gap-3">
                <input name="districtcreationlist_input_283"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="border border-line-dark px-3 py-2 rounded w-full text-[13px]"
                />
                <button
                  onClick={handleImport}
                  disabled={importing || !selectedFile}
                  className="bg-green-700 text-white px-4 py-2 rounded text-[13px] hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {importing ? "Importing..." : "IMPORT"}
                </button>
              </div>

              <p className="mt-3 text-[12px] text-ink-muted">
                Excel format: Column A = District Name, Column B = State Unique ID. Row 1 is header (skipped).
              </p>
            </div>

            <div className="flex justify-end px-5 py-4 border-t border-line bg-[#fafafa]">
              <button
                onClick={closeImportModal}
                className="px-6 py-2 rounded bg-[#3b6ee8] text-white font-medium hover:bg-[#315fd0] text-[13px]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
