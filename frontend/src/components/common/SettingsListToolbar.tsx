import type { MutableRefObject, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { showSuccessAlert } from "../../utils/alerts";
import { compareTableValues, getAriaSortValue, getNextSortState, type SortDirection } from "../../utils/tableSorting";
import SearchableSelect from "./SearchableSelect";

type TableRef = MutableRefObject<HTMLTableElement | null>;

interface SettingsListToolbarProps {
  length: number;
  setLength: (value: number) => void;
  search: string;
  setSearch: (value: string) => void;
  tableRef: TableRef;
  searchPlaceholder?: string;
  rightSlot?: ReactNode;
  showColumnButton?: boolean;
  lengthDropdownClassName?: string;
}

function extractTableMatrix(tableRef: TableRef) {
  const table = tableRef.current;
  if (!table) return { headers: [] as string[], rows: [] as string[][] };

  const headerCells = Array.from(table.querySelectorAll("thead th")).filter(
    (cell) => window.getComputedStyle(cell).display !== "none"
  );
  const headers = headerCells.map((cell) => (cell.textContent || "").replace(/\s+/g, " ").trim());

  const rows = Array.from(table.querySelectorAll("tbody tr"))
    .map((row) =>
      Array.from(row.querySelectorAll("td"))
        .filter((cell) => window.getComputedStyle(cell).display !== "none")
        .map((cell) => (cell.textContent || "").replace(/\s+/g, " ").trim())
    )
    .filter((cells) => cells.length > 0 && !cells.join(" ").match(/^(Loading\.\.\.|No records found)$/i))
    .filter((cells) => cells.some((cell) => cell));

  return { headers, rows };
}

function getTableColumns(tableRef: TableRef) {
  const table = tableRef.current;
  if (!table) return [] as string[];

  return Array.from(table.querySelectorAll("thead th")).map((cell) =>
    (cell.textContent || "").replace(/\s+/g, " ").trim() || "Column"
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeCsv(value: string) {
  return `"${value.replace(/\"/g, '""')}"`;
}

function downloadFile(content: BlobPart, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeHeaderLabel(cell: HTMLTableCellElement) {
  return (cell.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "");
}

function isSortableHeader(cell: HTMLTableCellElement) {
  if (cell.classList.contains("no-sort-indicator")) return false;
  if (cell.dataset.noSortIndicator === "true") return false;

  const label = normalizeHeaderLabel(cell);
  if (!label) return false;

  return !["#", "s no", "sno", "action"].includes(label);
}

function getCellSortValue(cell: Element | null | undefined) {
  if (!(cell instanceof HTMLElement)) return "";
  return cell.dataset.sortValue ?? (cell.textContent || "").replace(/\s+/g, " ").trim();
}

function isPlaceholderRow(row: HTMLTableRowElement) {
  if (row.cells.length === 0) return true;
  if (row.cells.length > 1) return false;

  const text = (row.textContent || "").replace(/\s+/g, " ").trim();
  return /^(Loading\.\.\.|No records found)$/i.test(text);
}

const ACTIONS = [
  { label: "Copy", icon: "fa-copy" },
  { label: "CSV", icon: "fa-file-csv" },
  { label: "Excel", icon: "fa-file-excel" },
  { label: "PDF", icon: "fa-file-pdf" },
  { label: "Print", icon: "fa-print" },
] as const;

export default function SettingsListToolbar({
  length,
  setLength,
  search,
  setSearch,
  tableRef,
  searchPlaceholder = "Search...",
  rightSlot,
  showColumnButton = true,
  lengthDropdownClassName = "",
}: SettingsListToolbarProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [hiddenIndexes, setHiddenIndexes] = useState<number[]>([]);
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const syncingRef = useRef(false);

  const lengthOptions = [10, 25, 50, 100, -1].map((option) => ({
    value: String(option),
    label: option === -1 ? "All" : String(option),
  }));

  const syncColumns = useCallback(() => {
    const nextColumns = getTableColumns(tableRef);
    setColumns((current) => (
      current.length === nextColumns.length && current.every((value, index) => value === nextColumns[index])
        ? current
        : nextColumns
    ));
  }, [tableRef]);

  const applyTableState = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;

    syncingRef.current = true;
    table.classList.add("otm-table");
    table.parentElement?.classList.add("otm-table-shell");

    const rows = Array.from(table.querySelectorAll("tr"));
    rows.forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        (cell as HTMLElement).style.display = hiddenIndexes.includes(index) ? "none" : "";
      });
    });

    const headerCells = Array.from(table.querySelectorAll("thead th")) as HTMLTableCellElement[];
    headerCells.forEach((cell, index) => {
      const sortable = isSortableHeader(cell);
      if (!sortable) {
        cell.removeAttribute("data-show-sort-indicator");
        cell.removeAttribute("aria-sort");
        cell.removeAttribute("tabindex");
        cell.onclick = null;
        cell.onkeydown = null;
        return;
      }

      cell.dataset.showSortIndicator = "true";
      cell.tabIndex = 0;
      cell.setAttribute("aria-sort", getAriaSortValue(sortColumnIndex, sortDirection, index));
      cell.onclick = () => {
        const next = getNextSortState(sortColumnIndex, sortDirection, index);
        setSortColumnIndex(next.sortKey);
        setSortDirection(next.sortDir);
      };
      cell.onkeydown = (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        cell.click();
      };
    });

    const tbody = table.tBodies[0];
    if (tbody && sortColumnIndex !== null && sortDirection) {
      const rowsToSort = Array.from(tbody.rows).filter((row) => !isPlaceholderRow(row));
      if (rowsToSort.length > 1) {
        rowsToSort
          .sort((left, right) => {
            const result = compareTableValues(
              getCellSortValue(left.cells.item(sortColumnIndex)),
              getCellSortValue(right.cells.item(sortColumnIndex))
            );
            return sortDirection === "asc" ? result : -result;
          })
          .forEach((row) => tbody.appendChild(row));
      }
    }

    syncingRef.current = false;
  }, [hiddenIndexes, sortColumnIndex, sortDirection, tableRef]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(syncColumns);
    return () => window.cancelAnimationFrame(frame);
  }, [syncColumns]);

  useEffect(() => {
    if (sortColumnIndex !== null && hiddenIndexes.includes(sortColumnIndex)) {
      setSortColumnIndex(null);
      setSortDirection(null);
    }
  }, [hiddenIndexes, sortColumnIndex]);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const observerTarget = table.parentElement ?? table;
    const observer = new MutationObserver(() => {
      if (syncingRef.current) return;
      window.requestAnimationFrame(() => {
        syncColumns();
        applyTableState();
      });
    });

    const frame = window.requestAnimationFrame(() => {
      syncColumns();
      applyTableState();
    });

    observer.observe(observerTarget, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [applyTableState, syncColumns, tableRef]);

  const openColumnModal = () => {
    syncColumns();
    setShowColumnModal(true);
  };

  const toggleColumn = (index: number) => {
    setHiddenIndexes((prev) => {
      if (prev.includes(index)) {
        return prev.filter((value) => value !== index);
      }
      if (prev.length >= Math.max(columns.length - 1, 0)) return prev;
      return [...prev, index];
    });
  };

  const handleExport = async (type: (typeof ACTIONS)[number]["label"]) => {
    const { headers, rows } = extractTableMatrix(tableRef);
    if (headers.length === 0) return;

    setExporting(type);
    try {
      if (type === "Copy") {
        const text = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
        await navigator.clipboard.writeText(text);
        await showSuccessAlert("Table data copied successfully");
        return;
      }

      if (type === "CSV") {
        const csv = [
          headers.map(escapeCsv).join(","),
          ...rows.map((row) => row.map(escapeCsv).join(",")),
        ].join("\n");
        downloadFile(csv, "settings-list.csv", "text/csv;charset=utf-8;");
        return;
      }

      const tableHtml = `
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows
              .map(
                (row) =>
                  `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      if (type === "Excel") {
        downloadFile(tableHtml, "settings-list.xls", "application/vnd.ms-excel");
        return;
      }

      const printWindow = window.open("", "_blank", "width=1000,height=700");
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>${escapeHtml(type === "PDF" ? "Settings Export" : "Print")}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
              h2 { margin-bottom: 16px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 12px; }
              th { background: #f3f4f6; }
            </style>
          </head>
          <body>
            <h2>${escapeHtml(type === "PDF" ? "Settings Export" : "Print Preview")}</h2>
            ${tableHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mb-5 flex items-center justify-between gap-4 flex-wrap rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
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
            dropdownClassName={lengthDropdownClassName}
          />
          entries
        </span>

        {ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => handleExport(action.label)}
            disabled={exporting !== null}
            className="otm-btn-secondary disabled:opacity-50"
          >
            <i className={`fa ${action.icon} text-[12px]`} />
            {exporting === action.label ? `${action.label}...` : action.label}
          </button>
        ))}

        {showColumnButton ? (
          <button
            type="button"
            onClick={openColumnModal}
            className="otm-btn-secondary"
          >
            <i className="fa fa-table-columns text-[12px]" />
            Column Visibility
            <i className="fa fa-chevron-down text-[10px]" />
          </button>
        ) : null}

        {rightSlot}
      </div>

      <label className="flex h-11 min-w-[280px] items-center gap-3 rounded-2xl border border-[#d9ddcf] bg-white px-4 shadow-sm">
        <i className="fa fa-magnifying-glass text-[12px] text-[#6d7750]" />
        <input name="search"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-[#9aa287]"
        />
      </label>

      {showColumnModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/25 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[#e5e8d7] bg-white p-6 shadow-[0_24px_60px_rgba(46,61,24,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-bold text-[#42551d]">Column Visibility</h3>
                <p className="text-[13px] text-[#7d8665]">Choose which columns should stay visible.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowColumnModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#d8dec8] text-[#6e7754] hover:bg-[#f6f8f1]"
              >
                <i className="fa fa-xmark" />
              </button>
            </div>

            <div className="space-y-2">
              {columns.map((column, index) => {
                const checked = !hiddenIndexes.includes(index);
                const disableToggle = checked && hiddenIndexes.length >= columns.length - 1;
                return (
                  <label
                    key={`${column}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-[#edf1e4] px-4 py-3 text-[14px] text-[#445131]"
                  >
                    <span>{column}</span>
                    <input name="checked"
                      type="checkbox"
                      checked={checked}
                      disabled={disableToggle}
                      onChange={() => toggleColumn(index)}
                      className="h-4 w-4 accent-[#657b2f]"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowColumnModal(false)}
                className="rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-5 py-2.5 font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
