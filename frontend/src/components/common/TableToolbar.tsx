import { ChangeEvent } from "react";
import SearchableSelect from "./SearchableSelect";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ToolbarExportConfig<T = Record<string, unknown>> {
  /** Filtered data rows to export */
  data: T[];
  /** Column headers for CSV / print */
  headers: string[];
  /** Map each row to cell values in the same order as headers */
  rowMapper: (row: T, index: number) => (string | number)[];
  /** File name without extension, e.g. "stock_position" */
  filename?: string;
  /** Page title shown in the print preview */
  printTitle?: string;
}

export interface TableToolbarProps<T = Record<string, unknown>> {
  /** Current "show N entries" value */
  length: number;
  onLengthChange: (value: number) => void;

  /** Search string */
  search: string;
  onSearchChange: (value: string) => void;

  /** Export config — omit entirely to hide all export buttons */
  exportConfig?: ToolbarExportConfig<T>;

  /** Show the Column Visibility button */
  showColumnVisibility?: boolean;
  onColumnVisibility?: () => void;

  /** Extra content (buttons etc.) rendered after the export group, before Search */
  extra?: React.ReactNode;
}

// ─── Export helpers ─────────────────────────────────────────────────────────────

function doExportCSV<T>(cfg: ToolbarExportConfig<T>) {
  const rows = [
    cfg.headers,
    ...cfg.data.map((r, i) => cfg.rowMapper(r, i)),
  ];
  const csv = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${cfg.filename ?? "export"}.csv`;
  a.click();
}

function doCopy<T>(cfg: ToolbarExportConfig<T>) {
  const text = cfg.data
    .map((r, i) => cfg.rowMapper(r, i).join("\t"))
    .join("\n");
  navigator.clipboard?.writeText(text);
}

function doPrint<T>(cfg: ToolbarExportConfig<T>) {
  const theadRow  = cfg.headers.map(h => `<th>${h}</th>`).join("");
  const tbodyRows = cfg.data
    .map((r, i) => `<tr>${cfg.rowMapper(r, i).map(c => `<td>${c}</td>`).join("")}</tr>`)
    .join("");

  const html = `<html>
    <head>
      <title>${cfg.printTitle ?? "Export"}</title>
      <style>
        body{font-family:sans-serif;font-size:11px}
        h3{margin-bottom:8px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:4px 8px}
        th{background:#f5f5f5;font-weight:600}
      </style>
    </head>
    <body>
      <h3>${cfg.printTitle ?? "Export"}</h3>
      <table>
        <thead><tr>${theadRow}</tr></thead>
        <tbody>${tbodyRows}</tbody>
      </table>
    </body>
  </html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TableToolbar<T = Record<string, unknown>>({
  length,
  onLengthChange,
  search,
  onSearchChange,
  exportConfig,
  showColumnVisibility = false,
  onColumnVisibility,
  extra,
  
}: TableToolbarProps<T>) {
  const lengthOptions = [10, 25, 50, 100, -1].map((n) => ({
    value: String(n),
    label: n === -1 ? "All" : String(n),
  }));

  const exportButtons = exportConfig
    ? [
        { label: "Copy",  icon: "fa-copy",       action: () => doCopy(exportConfig) },
        { label: "CSV",   icon: "fa-file-csv",   action: () => doExportCSV(exportConfig) },
        { label: "Excel", icon: "fa-file-excel", action: () => doExportCSV({ ...exportConfig, filename: `${exportConfig.filename ?? "export"}_excel` }) },
        { label: "PDF",   icon: "fa-file-pdf",   action: () => doPrint(exportConfig) },
        { label: "Print", icon: "fa-print",      action: () => doPrint(exportConfig) },
      ]
    : [];

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-[28px] border border-[#ecd9a2] bg-[linear-gradient(135deg,#fffdf6_0%,#fffaf2_44%,#f9fbef_100%)] px-5 py-4 shadow-[0_18px_36px_rgba(104,116,40,0.07)] flex-wrap">

      {/* ── Left side ── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Show N entries */}
        <div className="flex items-center gap-3 text-[13px] text-ink-secondary">
          Show
          <SearchableSelect
            value={String(length)}
            onChange={(value) => onLengthChange(Number(value))}
            options={lengthOptions}
            placeholder="10"
            className="w-[92px]"
            buttonClassName="h-10 min-w-[86px] rounded-2xl border border-[#d7c79c] px-3 py-2"
          />
          entries
        </div>

        {/* Export buttons */}
        {exportButtons.map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#dcc98e] bg-white px-4 py-2 text-[#5b641d] font-semibold shadow-sm transition-colors hover:bg-[#faf4df]"
          >
          
            {btn.label}
          </button>
        ))}

        {/* Column Visibility */}
        {showColumnVisibility && (
          <button
            onClick={onColumnVisibility}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#dcc98e] bg-white px-4 py-2 text-[#5b641d] font-semibold shadow-sm transition-colors hover:bg-[#faf4df]"
          >
            <i className="fa fa-table-columns text-[11px]" />
            Column Visibility
            <i className="fa fa-chevron-down text-[10px]" />
          </button>
        )}

        {/* Extra slot — inject any custom buttons here */}
        {extra}
      </div>

      {/* ── Right side: Search ── */}
      <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
        Search:
        <input name="search"
          value={search}
          placeholder=""
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          className="px-2.5 py-1 text-[13px] border border-line-dark rounded outline-none w-48
            focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
        />
      </div>

    </div>
  );
}




