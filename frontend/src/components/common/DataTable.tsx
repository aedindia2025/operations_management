import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../api/axios";
import SearchableSelect from "./SearchableSelect";
import { compareTableValues, getNextSortState } from "../../utils/tableSorting";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "./PaginationPageButtons";

interface Column {
  key: string;
  label: string;
  exportable?: boolean;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  sortValue?: (row: any) => unknown;
}

interface Actions {
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (row: any) => void;
  onDelete?: (id: string) => void;
}

interface DataTableProps {
  apiUrl: string;
  columns: Column[];
  extraData?: Record<string, any>;
  actions?: Actions;
  refresh?: number;
  exportFileName?: string;
  exportTitle?: string;
  showColumnVisibility?: boolean;
  variant?: "default" | "reportModern";
}

const MAX_CLIENT_ROWS = 10000;

export default function DataTable({
  apiUrl,
  columns,
  extraData = {},
  actions = {},
  refresh = 0,
  exportFileName = "export",
  exportTitle = "Export",
  showColumnVisibility = false,
  variant = "reportModern",
}: DataTableProps) {
  const [allRows, setAllRows] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [length, setLength] = useState<number>(10);
  const [curPage, setCurPage] = useState<number>(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [exportingButton, setExportingButton] = useState<string | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [visibleColKeys, setVisibleColKeys] = useState<string[]>(
    columns.map((c) => c.key)
  );

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    api
      .post(apiUrl, {
        draw: 1,
        start: 0,
        length: MAX_CLIENT_ROWS,
        search,
        ...extraData,
      })
      .then(({ data }) => {
        const nextRows = Array.isArray(data?.data) ? data.data : [];
        setAllRows(nextRows);
        setTotal(nextRows.length);
      })
      .catch(() => setError("Failed to load records."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, search, JSON.stringify(extraData), refresh]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurPage(1);
  }, [search, length]);

  useEffect(() => {
    setVisibleColKeys(columns.map((c) => c.key));
  }, [columns]);

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDir) return allRows;

    const column = columns.find((item) => item.key === sortKey);
    if (!column) return allRows;

    return [...allRows].sort((left, right) => {
      const leftValue = column.sortValue ? column.sortValue(left) : left?.[sortKey];
      const rightValue = column.sortValue ? column.sortValue(right) : right?.[sortKey];
      const result = compareTableValues(leftValue, rightValue);
      return sortDir === "asc" ? result : -result;
    });
  }, [allRows, columns, sortDir, sortKey]);

  const rows = useMemo(() => {
    if (length === -1) return sortedRows;
    const start = (curPage - 1) * length;
    return sortedRows.slice(start, start + length);
  }, [curPage, length, sortedRows]);

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));

  useEffect(() => {
    setCurPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageNums = getPaginationItems(curPage, totalPages);

  const startEntry = total === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1;
  const endEntry = length === -1 ? rows.length : Math.min(curPage * length, total);
  const exportStartIndex = length === -1 ? 0 : startEntry - 1;
  const isReportModern = variant === "reportModern" || variant === "default";

  const isVisible = (key: string) => visibleColKeys.includes(key);

  const exportableCols = columns.filter(
    (c) => c.exportable !== false && isVisible(c.key)
  );

  const visibleColumnCount =
    visibleColKeys.length + 1 + (actions.canEdit || actions.canDelete ? 1 : 0);

  const getCellText = (col: Column, row: any, rowIndex: number): string => {
    if (col.key === "index") return String(rowIndex + 1);
    const raw = row[col.key];
    if (col.render) {
      const rendered = col.render(raw, row);
      if (typeof rendered === "string" || typeof rendered === "number") {
        return String(rendered);
      }
      return raw != null ? String(raw) : "-";
    }
    return raw != null ? String(raw) : "-";
  };

  const escapeHtml = (v: string) =>
    v
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const escapeCsv = (v: string) => `"${v.replace(/\"/g, '""')}"`;

  const downloadFile = (content: BlobPart, fileName: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildExportMatrix = () => ({
    cols: exportableCols,
    data: rows.map((row, i) =>
      exportableCols.map((col) => getCellText(col, row, exportStartIndex + i))
    ),
  });

  const handleSort = (col: Column) => {
    if (col.sortable === false) return;

    const next = getNextSortState(sortKey, sortDir, col.key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  };

  const handleExport = async (type: string) => {
    if (exportableCols.length === 0) return;
    setExportingButton(type);

    try {
      const { cols, data } = buildExportMatrix();
      const headers = cols.map((c) => c.label);

      if (type === "Copy") {
        const text = [headers.join("\t"), ...data.map((r) => r.join("\t"))].join("\n");
        await navigator.clipboard.writeText(text);
      } else if (type === "CSV") {
        const csv = [
          headers.map(escapeCsv).join(","),
          ...data.map((r) => r.map(escapeCsv).join(",")),
        ].join("\n");
        downloadFile(csv, `${exportFileName}.csv`, "text/csv;charset=utf-8;");
      } else if (type === "Excel") {
        const tableHtml = `
          <table>
            <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
            <tbody>${data
              .map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`)
              .join("")}</tbody>
          </table>`;
        downloadFile(tableHtml, `${exportFileName}.xls`, "application/vnd.ms-excel");
      } else if (type === "PDF" || type === "Print") {
        const win = window.open("", "_blank", "width=1000,height=700");
        if (!win) return;
        win.document.write(`
          <html>
            <head>
              <title>${escapeHtml(exportTitle)}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
                h2 { margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 12px; }
                th { background: #f3f4f6; }
              </style>
            </head>
            <body>
              <h2>${escapeHtml(exportTitle)}</h2>
              <table>
                <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
                <tbody>${data
                  .map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`)
                  .join("")}</tbody>
              </table>
            </body>
          </html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
      }
    } finally {
      setExportingButton(null);
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const exportActions = ["Copy", "CSV", "Excel", "PDF", "Print"] as const;
  const lengthOptions = [10, 25, 50, 100, -1].map((n) => ({
    value: String(n),
    label: n === -1 ? "All" : String(n),
  }));
  const exportIcons: Record<(typeof exportActions)[number], string> = {
    Copy: "fa-copy",
    CSV: "fa-file-csv",
    Excel: "fa-file-excel",
    PDF: "fa-file-pdf",
    Print: "fa-print",
  };

  return (
    <div className="space-y-4">
      <div
        className={`mb-5 flex items-center justify-between flex-wrap gap-4 ${
          isReportModern
            ? "rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]"
            : ""
        }`}
      >
        <div className="flex items-center gap-2 text-[13px] text-ink-secondary flex-wrap">
          <span className="flex items-center gap-2">
            Show
            <SearchableSelect
              value={String(length)}
              onChange={(value) => setLength(Number(value))}
              options={lengthOptions}
              placeholder="10"
              className="w-[92px]"
              buttonClassName="h-10 min-w-[86px] rounded-2xl border border-[#d7c79c] px-3 py-2"
            />
            entries
          </span>

          {exportActions.map((btn) => (
            <button
              key={btn}
              type="button"
              disabled={loading || exportingButton !== null || exportableCols.length === 0}
              onClick={() => handleExport(btn)}
              className="otm-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className={`fa ${exportIcons[btn]} text-[12px]`} />
              {exportingButton === btn ? `${btn}...` : btn}
            </button>
          ))}

          {showColumnVisibility && (
            <button
              type="button"
              onClick={() => setShowColumnModal(true)}
              className="otm-btn-secondary"
            >
              <i className="fa fa-table-columns text-[12px]" />
              Column Visibility
              <i className="fa fa-chevron-down text-[10px]" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
          {isReportModern ? (
            <label className="flex h-11 min-w-[280px] items-center gap-3 rounded-2xl border border-[#d9ddcf] bg-white px-4 shadow-sm">
              <i className="fa fa-magnifying-glass text-[12px] text-[#6d7750]" />
              <input name="search"
                value={search}
                placeholder="Search vendor, bank, creator..."
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-[#9aa287]"
              />
            </label>
          ) : (
            <>
              Search:
              <input name="search"
                value={search}
                placeholder="Search..."
                onChange={(e) => setSearch(e.target.value)}
                className="px-2.5 py-1 text-[13px] border border-line-dark rounded outline-none w-48 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-lg">
          {error}
        </div>
      )}

      <div
        className={`otm-table-shell overflow-x-auto ${
          isReportModern
            ? "rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]"
            : ""
        }`}
      >
        <table className="otm-table w-full text-[13px] border-collapse">
          <thead>
            <tr className={isReportModern ? "bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]" : "bg-surface-2"}>
              <th
                className={
                  isReportModern
                    ? "w-10 border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]"
                    : "px-3 py-2 text-left text-[12px] font-semibold text-ink-secondary tracking-wide border border-line-dark w-10"
                }
              >
                #
              </th>

              {columns.map(
                (col) =>
                  isVisible(col.key) && (
                    <th
                      key={col.key}
                      onClick={col.sortable === false ? undefined : () => handleSort(col)}
                      data-show-sort-indicator={col.sortable === false ? undefined : "true"}
                      aria-sort={
                        col.sortable === false
                          ? undefined
                          : sortKey !== col.key || !sortDir
                            ? "none"
                            : sortDir === "asc"
                              ? "ascending"
                              : "descending"
                      }
                      className={
                        isReportModern
                          ? `border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643] ${
                              col.sortable === false ? "" : "hover:bg-[#f4f7eb]"
                            }`
                          : `px-3 py-2 text-left text-[12px] font-semibold text-ink-secondary tracking-wide border border-line-dark ${
                              col.sortable === false ? "" : "hover:bg-brand-50"
                            }`
                      }
                    >
                      <span className="inline-flex items-center">{col.label}</span>
                    </th>
                  )
              )}

              {(actions.canEdit || actions.canDelete) && (
                <th
                  className={
                    isReportModern
                      ? "w-20 border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]"
                      : "px-3 py-2 text-left text-[12px] font-semibold text-ink-secondary tracking-wide border border-line-dark w-20"
                  }
                >
                  Action
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumnCount}
                  className="text-center py-10 text-ink-muted border border-line"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                    Loading...
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumnCount}
                  className="text-center py-10 text-ink-muted border border-line"
                >
                  No records found
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.unique_id ?? i}
                  className={`transition-colors ${
                    isReportModern
                      ? "border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] hover:bg-[#f1f7e6]"
                      : "hover:bg-brand-50"
                  }`}
                >
                  <td className={isReportModern ? "px-4 py-4 text-[#7a7f69]" : "px-3 py-2 text-ink-muted border border-line"}>
                    {length === -1 ? i + 1 : startEntry + i}
                  </td>

                  {columns.map(
                    (col) =>
                      isVisible(col.key) && (
                        <td
                          key={col.key}
                          className={isReportModern ? "px-4 py-4 align-top text-[13px] text-[#243018]" : "px-3 py-2 border border-line"}
                        >
                          {col.render ? col.render(row[col.key], row) : row[col.key] ?? "-"}
                        </td>
                      )
                  )}

                  {(actions.canEdit || actions.canDelete) && (
                    <td className={isReportModern ? "px-4 py-4" : "px-3 py-2 border border-line"}>
                      <div className="flex gap-1">
                        {actions.canEdit && (
                          <button
                            onClick={() => actions.onEdit?.(row)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                          >
                            <i className="fa fa-pen-to-square" />
                          </button>
                        )}
                        {actions.canDelete && (
                          <button
                            onClick={() => actions.onDelete?.(row.unique_id)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-danger-light text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
                          >
                            <i className="fa fa-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-1 text-[13px] text-[#6f7758] flex-wrap gap-2">
        <span>
          Showing {startEntry} to {endEntry} of {total} entries
        </span>
        <div className="flex gap-1">
          <button
            disabled={length === -1 || curPage === 1}
            onClick={() => setCurPage((p) => p - 1)}
            className={`text-[13px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
              isReportModern
                ? "px-4 h-[36px] bg-white border border-[#d8dec8] rounded-2xl hover:border-[#7b8f43] hover:text-[#5f7427]"
                : "px-3 h-[30px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500"
            }`}
          >
            Previous
          </button>

          <PaginationPageButtons
            items={pageNums}
            currentPage={curPage}
            onPageChange={setCurPage}
            ellipsisClassName={`flex items-center justify-center px-2 text-[13px] text-ink-muted ${
              isReportModern ? "h-[36px] min-w-[36px]" : "h-[30px] min-w-[30px]"
            }`}
            getButtonClassName={(n) => `text-[13px] border cursor-pointer ${
              isReportModern ? "w-[36px] h-[36px] rounded-2xl" : "w-[30px] h-[30px] rounded"
            } ${
              n === curPage
                ? isReportModern
                  ? "bg-[#657b2f] text-white border-[#657b2f]"
                  : "bg-brand-500 text-white border-brand-500"
                : isReportModern
                  ? "bg-white border-[#d8dec8] hover:border-[#7b8f43] hover:text-[#5f7427]"
                  : "bg-white border-line hover:border-brand-500 hover:text-brand-500"
            }`}
          />

          <button
            disabled={length === -1 || curPage >= totalPages}
            onClick={() => setCurPage((p) => p + 1)}
            className={`text-[13px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
              isReportModern
                ? "px-4 h-[36px] bg-white border border-[#d8dec8] rounded-2xl hover:border-[#7b8f43] hover:text-[#5f7427]"
                : "px-3 h-[30px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500"
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {showColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[600px] overflow-hidden rounded-[28px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.18)]">
            <div className="flex items-center justify-between border-b border-[#edf1e4] bg-[linear-gradient(135deg,#fcfdf8_0%,#eef4e1_100%)] px-5 py-4">
              <h3 className="text-[18px] font-semibold text-[#42551d]">
                Select Columns to Display
              </h3>
              <button
                onClick={() => setShowColumnModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#d8dec8] text-[#6e7754] hover:bg-[#f6f8f1]"
              >
                <i className="fa fa-xmark" />
              </button>
            </div>

            <div className="px-7 py-6 space-y-2">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center justify-between rounded-2xl border border-[#edf1e4] px-4 py-3 text-[14px] text-[#445131] cursor-pointer"
                >
                  <input name="datatable_input_567"
                    type="checkbox"
                    checked={isVisible(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="w-4 h-4 accent-[#42518f]"
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end border-t border-[#edf1e4] bg-[#fbfcf8] px-5 py-5">
              <button
                onClick={() => setShowColumnModal(false)}
                className="rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-5 py-2.5 font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)]"
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
