import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import PageTopbar from "../../components/common/PageTopbar";
import { useAuth } from "../../context/AuthContext";
import {
  fetchPurchaseOrderCancelList,
  fetchPurchaseOrderList,
  savePurchaseOrderCancel,
} from "../../api/purchaseOrderApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

type Row = {
  unique_id: string;
  po_num: string;
  po_date: string;
  customer_details?: string;
  customer_name?: string;
  department?: string;
  department_display?: string;
  executive_label?: string;
  executive_name?: string;
  executive_name_display?: string;
  product_count?: number;
  pro_cnt?: number;
  product_qty?: number;
  qty?: number;
  consignee_count?: number;
  cons_cnt?: number;
  po_value?: string;
  total_value?: string;
  total_amount?: string;
  ld_required?: string;
  ld_required_display?: string;
  file_name?: string;
  file_url?: string;
  cancel_file_url?: string;
  state_name?: string;
  state_name_display?: string;
  district_name?: string;
  district_name_display?: string;
  gst_value?: string;
  reject_reason?: string;
  po_incomplete?: boolean;
};

const pageButtonCls =
  "h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] text-[#5f6c42] hover:border-[#7b8f43] hover:text-[#4d6125] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

function formatDate(value?: string) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-");
    return `${d}-${m}-${y}`;
  }
  return value;
}

function CustomerBlock({ row }: { row: Row }) {
  const text = row.customer_details || row.customer_name || row.department || row.department_display || "-";
  const lines = text.split("\n").filter(Boolean);
  return (
    <div className="text-left">
      {lines.map((line, index) => (
        <div key={`${line}-${index}`} className={index === 0 ? "font-semibold text-ink" : "text-[11px] text-ink-muted"}>
          {line}
        </div>
      ))}
    </div>
  );
}

function downloadTextFile(filename: string, content: string, type = "text/plain;charset=utf-8;") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"po" | "cancel">("po");
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    sno: true,
    po_date: true,
    po_num: true,
    customer: true,
    executive: true,
    product_count: true,
    product_qty: true,
    consignee_count: true,
    po_value: true,
    ld_required: true,
    attach: true,
    action: true,
    cancel_po_num: true,
    cancel_po_date: true,
    cancel_state: true,
    cancel_district: true,
    cancel_customer: true,
    cancel_gst: true,
    cancel_executive: true,
    cancel_value: true,
    cancel_attach: true,
  });
  const [showColumnModal, setShowColumnModal] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    const apiCall =
      activeTab === "po"
        ? fetchPurchaseOrderList({ search, from_date: fromDate, to_date: toDate, start: (curPage - 1) * length, length, draw: 1, user_type_unique_id: user?.user_type_unique_id || "", user_unique_id: user?.unique_id || "" })
        : fetchPurchaseOrderCancelList({ search, from_date: fromDate, to_date: toDate, start: (curPage - 1) * length, length, draw: 1 });

    apiCall
      .then((res) => {
        if (ignore) return;
        setRows(Array.isArray(res.data) ? res.data : []);
        setTotalRows(Number(res.recordsFiltered || res.recordsTotal || 0));
      })
      .catch(() => {
        if (!ignore) {
          setRows([]);
          setTotalRows(0);
          void showErrorAlert(`Failed to load ${activeTab === "po" ? "purchase orders" : "PO cancel list"}.`);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, search, fromDate, toDate, curPage, length, user?.unique_id, user?.user_type_unique_id]);

  useEffect(() => {
    setCurPage(1);
  }, [search, length, fromDate, toDate, activeTab]);

  const totalPages = Math.max(1, Math.ceil(totalRows / length));
  const pageNums = useMemo(() => getPaginationItems(curPage, totalPages), [curPage, totalPages]);

  const poColumns = [
    { key: "sno", label: "S.No" },
    { key: "po_date", label: "PO Date" },
    { key: "po_num", label: "PO No." },
    { key: "customer", label: "Customer Details" },
    { key: "executive", label: "Executive" },
    { key: "product_count", label: "Product Count" },
    { key: "product_qty", label: "Product Qty" },
    { key: "consignee_count", label: "Consignee Cnt" },
    { key: "po_value", label: "PO Value" },
    { key: "ld_required", label: "LD Required" },
    { key: "attach", label: "Attach" },
    { key: "action", label: "Action" },
  ];

  const cancelColumns = [
    { key: "sno", label: "S.No" },
    { key: "cancel_po_num", label: "PO Number" },
    { key: "cancel_po_date", label: "PO Date" },
    { key: "cancel_state", label: "State Name" },
    { key: "cancel_district", label: "District Name" },
    { key: "cancel_customer", label: "Customer" },
    { key: "cancel_gst", label: "Customer GST Number" },
    { key: "cancel_executive", label: "Executive Name" },
    { key: "cancel_value", label: "PO Total Value" },
    { key: "cancel_attach", label: "PO Cancel Attachment" },
  ];

  function exportRows(kind: "copy" | "csv" | "excel" | "pdf" | "print") {
    const headers =
      activeTab === "po"
        ? ["PO Date", "PO Number", "Customer", "Executive", "Product Count", "Qty", "Consignee Count", "PO Value", "LD Required"]
        : ["PO Number", "PO Date", "State Name", "District Name", "Customer", "Customer GST Number", "Executive Name", "PO Total Value"];
    const body = rows.map((row) =>
      activeTab === "po"
        ? [
            formatDate(row.po_date),
            row.po_num || "",
            (row.customer_details || row.department || row.department_display || "").replace(/\n/g, " | "),
            row.executive_label || row.executive_name || row.executive_name_display || "",
            String(row.pro_cnt ?? row.product_count ?? 0),
            String(row.qty ?? row.product_qty ?? 0),
            String(row.cons_cnt ?? row.consignee_count ?? 0),
            row.total_value || row.po_value || row.total_amount || "0",
            row.ld_required === "on" ? "Yes" : "No",
          ]
        : [
            row.po_num || "",
            formatDate(row.po_date),
            row.state_name || row.state_name_display || "",
            row.district_name || row.district_name_display || "",
            row.customer_name || row.department || row.department_display || "",
            row.gst_value || "",
            row.executive_label || row.executive_name || row.executive_name_display || "",
            row.total_value || row.po_value || row.total_amount || "0",
          ]
    );
    const lines = [headers, ...body].map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
    const text = lines.join("\r\n");

    if (kind === "copy") {
      void navigator.clipboard.writeText(text);
      return;
    }
    if (kind === "csv") {
      downloadTextFile(activeTab === "po" ? "purchase-order-list.csv" : "po-cancel-list.csv", text, "text/csv;charset=utf-8;");
      return;
    }

    if (kind === "excel") {
      const tableHtml = `
        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${body
              .map((row) => `<tr>${row.map((value) => `<td>${String(value ?? "")}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>
      `;
      downloadTextFile(
        activeTab === "po" ? "purchase-order-list.xls" : "po-cancel-list.xls",
        tableHtml,
        "application/vnd.ms-excel"
      );
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${activeTab === "po" ? "Purchase Order List" : "PO Cancel List"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h2 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h2>${activeTab === "po" ? "Purchase Order List" : "PO Cancel List"}</h2>
          <table>
            <thead>
              <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${body
                .map((row) => `<tr>${row.map((value) => `<td>${String(value ?? "")}</td>`).join("")}</tr>`)
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    if (kind === "pdf") {
      setTimeout(() => printWindow.print(), 300);
      return;
    }
    printWindow.print();
  }

  async function handleCancel(row: Row) {
    const result = await Swal.fire({
      title: "Cancel Purchase Order",
      html: `
        <div style="text-align:left; display:grid; gap:14px; padding-top:6px;">
          <div style="border:1px solid #e8dcc0; background:linear-gradient(180deg,#fffdf7 0%,#f8f3e6 100%); border-radius:14px; padding:14px 16px;">
            <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#7b7f43; margin-bottom:8px;">Selected PO</div>
            <div style="font-size:18px; font-weight:800; color:#3e4d1e; line-height:1.2;">${row.po_num || "-"}</div>
            <div style="font-size:12px; color:#6b7280; margin-top:4px;">PO Date: ${formatDate(row.po_date)}</div>
          </div>

          <div>
            <label for="po-cancel-reason" style="display:block; font-size:12px; font-weight:700; color:#48503a; margin-bottom:6px;">Reject Reason</label>
            <textarea
              id="po-cancel-reason"
              placeholder="Enter reject reason"
              style="width:100%; min-height:118px; border:1px solid #d8cda9; border-radius:12px; padding:12px 14px; font-size:14px; resize:vertical; outline:none; box-sizing:border-box; background:#fff;"
            ></textarea>
          </div>

          <div>
            <label for="po-cancel-file" style="display:block; font-size:12px; font-weight:700; color:#48503a; margin-bottom:6px;">PO Cancel Attachment</label>
            <input
              id="po-cancel-file"
              type="file"
              accept="application/pdf"
              style="display:block; width:100%; border:1px dashed #ccb97b; border-radius:12px; padding:12px; background:#fffcf2; color:#4b5563; box-sizing:border-box;"
            />
            <div id="po-cancel-file-note" style="margin-top:6px; font-size:12px; color:#7a7a7a;">Upload PDF attachment</div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Close",
      width: 560,
      background: "#fffdf7",
      backdrop: "rgba(62, 61, 53, 0.48)",
      buttonsStyling: false,
      customClass: {
        popup: "otm-swal-popup",
        title: "otm-swal-title",
        confirmButton:
          "inline-flex items-center justify-center rounded-lg bg-brand-700 px-5 py-2.5 text-[13px] font-semibold text-white border-0 hover:bg-brand-800 transition-colors",
        cancelButton:
          "inline-flex items-center justify-center rounded-lg bg-[#eef1e4] px-5 py-2.5 text-[13px] font-semibold text-[#4f5a2d] border border-[#d6ddc0] hover:bg-[#e4ead2] transition-colors",
        actions: "gap-3",
      },
      didOpen: () => {
        const fileInput = document.getElementById("po-cancel-file") as HTMLInputElement | null;
        const fileNote = document.getElementById("po-cancel-file-note");
        if (!fileInput || !fileNote) return;
        fileInput.addEventListener("change", () => {
          const fileName = fileInput.files?.[0]?.name;
          fileNote.textContent = fileName ? `Selected: ${fileName}` : "Upload PDF attachment";
        });
      },
      preConfirm: () => {
        const reason = (document.getElementById("po-cancel-reason") as HTMLTextAreaElement | null)?.value?.trim() || "";
        const fileInput = document.getElementById("po-cancel-file") as HTMLInputElement | null;
        const file = fileInput?.files?.[0] ?? null;
        if (!reason) {
          Swal.showValidationMessage("Reject reason is required.");
          return null;
        }
        if (!file) {
          Swal.showValidationMessage("PO cancel attachment is required.");
          return null;
        }
        return { reason, file };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      const formData = new FormData();
      formData.append("reject_reason", result.value.reason);
      formData.append("file", result.value.file);
      const res = await savePurchaseOrderCancel(row.unique_id, formData);
      if (!res.status) throw new Error();
      await showSuccessAlert("PO cancel saved successfully.");
      if (activeTab === "po") {
        setRows((prev) => prev.filter((item) => item.unique_id !== row.unique_id));
      }
    } catch {
      await showErrorAlert("Failed to save PO cancel.");
    }
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar title="Purchase Order List" breadcrumbs={["Order", "Purchase Order"]} addLink="/order/purchase-order/form" />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="flex gap-2 border-b border-[#edf1e4] bg-[linear-gradient(180deg,#fffdf9_0%,#fbfcf8_100%)] px-6 pt-5">
          {[
            { key: "po", label: "PO List" },
            { key: "cancel", label: "PO Cancel List" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as "po" | "cancel")}
              className={`rounded-t-[18px] border px-5 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors ${
                activeTab === tab.key
                  ? "border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] text-white shadow-[0_10px_22px_rgba(79,122,43,0.20)]"
                  : "border-[#e5e8d7] bg-white text-[#6b7651] hover:border-[#cfd7b8] hover:text-[#4d6125]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "po" && (
            <div className="mb-5 flex items-end gap-4 flex-wrap rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
              <div>
                <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">From Date</span>
                <input name="fromdate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-11 w-48 rounded-2xl border border-[#d9ddcf] bg-white px-4 text-[13px] outline-none shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>

              <div>
                <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">To Date</span>
                <input name="todate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-11 w-48 rounded-2xl border border-[#d9ddcf] bg-white px-4 text-[13px] outline-none shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>

              <button type="button" className="inline-flex h-11 items-center rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] cursor-default">
                Go
              </button>
            </div>
          )}

          <div className="mb-5 flex items-center justify-between gap-4 flex-wrap rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary flex-wrap">
              <div className="flex items-center gap-2 ml-0 md:ml-0">
                Show
                <SearchableSelectInput name="length"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="h-10 min-w-[86px] rounded-2xl border border-[#d7c79c] bg-white px-3 text-[13px] outline-none shadow-sm"
                >
                  {[10, 25, 50, 100, -1].map((n) => (
                    <option key={n} value={n}>
                      {n === -1 ? "All" : n}
                    </option>
                  ))}
                </SearchableSelectInput>
                entries
              </div>
              <button type="button" onClick={() => exportRows("copy")} className={pageButtonCls}>Copy</button>
              <button type="button" onClick={() => exportRows("csv")} className={pageButtonCls}>CSV</button>
              <button type="button" onClick={() => exportRows("excel")} className={pageButtonCls}>Excel</button>
              <button type="button" onClick={() => exportRows("pdf")} className={pageButtonCls}>PDF</button>
              <button type="button" onClick={() => exportRows("print")} className={pageButtonCls}>Print</button>
              <button type="button" onClick={() => setShowColumnModal(true)} className={pageButtonCls}>Column Visibility</button>
            </div>

            <label className="flex h-11 min-w-[280px] items-center gap-3 rounded-2xl border border-[#d9ddcf] bg-white px-4 shadow-sm">
              <i className="fa fa-magnifying-glass text-[12px] text-[#6d7750]" />
              <input name="search"
                value={search}
                placeholder="Search..."
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-[#9aa287]"
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                {activeTab === "po" ? (
                  <>
                    <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                      {visibleColumns.sno && <th rowSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">S.No</th>}
                      {visibleColumns.po_date && <th rowSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">PO Date</th>}
                      {visibleColumns.po_num && <th rowSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">PO No.</th>}
                      {visibleColumns.customer && <th rowSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Customer Details</th>}
                      {visibleColumns.executive && <th rowSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Executive</th>}
                      {(visibleColumns.product_count || visibleColumns.product_qty) && (
                        <th colSpan={(visibleColumns.product_count ? 1 : 0) + (visibleColumns.product_qty ? 1 : 0)} className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Product</th>
                      )}
                      {visibleColumns.consignee_count && <th rowSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Consignee Cnt</th>}
                      {visibleColumns.po_value && <th rowSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">PO Value</th>}
                      {visibleColumns.ld_required && <th rowSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">LD Required</th>}
                      {visibleColumns.attach && <th rowSpan={2} className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Attach</th>}
                      {visibleColumns.action && <th rowSpan={2} className="border-b border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Action</th>}
                    </tr>
                    <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                      {visibleColumns.product_count && <th className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Count</th>}
                      {visibleColumns.product_qty && <th className="border-b border-r border-[#d8dec8] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Qty</th>}
                    </tr>
                  </>
                ) : (
                  <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                    {visibleColumns.sno && <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">S.No</th>}
                    {visibleColumns.cancel_po_num && <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">PO Number</th>}
                    {visibleColumns.cancel_po_date && <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">PO Date</th>}
                    {visibleColumns.cancel_state && <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">State Name</th>}
                    {visibleColumns.cancel_district && <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">District Name</th>}
                    {visibleColumns.cancel_customer && <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Customer</th>}
                    {visibleColumns.cancel_gst && <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Customer GST Number</th>}
                    {visibleColumns.cancel_executive && <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">Executive Name</th>}
                    {visibleColumns.cancel_value && <th className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">PO Total Value</th>}
                    {visibleColumns.cancel_attach && <th className="border-b border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">PO Cancel Attachment</th>}
                  </tr>
                )}
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === "po" ? 12 : 10} className="px-3 py-10 text-center border border-line">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === "po" ? 12 : 10} className="px-3 py-10 text-center border border-line">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row.unique_id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                      {activeTab === "po" ? (
                        <>
                          {visibleColumns.sno && <td className="px-3 py-2 text-center border-x border-line/50">{row.s_no || (curPage - 1) * length + index + 1}</td>}
                          {visibleColumns.po_date && <td className="px-3 py-2 text-center border-x border-line/50">{formatDate(row.po_date)}</td>}
                          {visibleColumns.po_num && (
                            <td className="px-3 py-2 border-x border-line/50">
                              <span style={{ color: row.po_incomplete ? "#da1c34" : undefined, fontWeight: row.po_incomplete ? 600 : undefined }}>
                                {row.po_num}
                              </span>
                            </td>
                          )}
                          {visibleColumns.customer && <td className="px-3 py-2 border-x border-line/50"><CustomerBlock row={row} /></td>}
                          {visibleColumns.executive && <td className="px-3 py-2 text-center border-x border-line/50">{row.executive_label || row.executive_name || row.executive_name_display || "-"}</td>}
                          {visibleColumns.product_count && <td className="px-3 py-2 text-center border-x border-line/50">{row.pro_cnt ?? row.product_count ?? 0}</td>}
                          {visibleColumns.product_qty && <td className="px-3 py-2 text-center border-x border-line/50">{row.qty ?? row.product_qty ?? 0}</td>}
                          {visibleColumns.consignee_count && <td className="px-3 py-2 text-center border-x border-line/50">{row.cons_cnt ?? row.consignee_count ?? 0}</td>}
                          {visibleColumns.po_value && <td className="px-3 py-2 text-right border-x border-line/50 font-medium">{row.total_value || row.po_value || row.total_amount || "0"}</td>}
                          {visibleColumns.ld_required && (
                            <td className="px-3 py-2 text-center border-x border-line/50">
                              {row.ld_required === "on" ? (
                                <i className="mdi mdi-check-circle text-[20px] text-success" />
                              ) : (
                                <i className="mdi mdi-close-circle text-[20px] text-danger" />
                              )}
                            </td>
                          )}
                          {visibleColumns.attach && <td className="px-3 py-2 text-center border-x border-line/50">
                            {row.file_url ? (
                              <a href={row.file_url} target="_blank" rel="noreferrer" className="text-danger hover:underline">
                                <i className="fa fa-file-pdf text-[15px]" />
                              </a>
                            ) : "-"}
                          </td>}
                          {visibleColumns.action && <td className="px-3 py-2 text-center border-x border-line/50">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/order/purchase-order/form/${row.unique_id}`)}
                                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info hover:bg-info hover:text-white transition-colors"
                              >
                                <i className="fa fa-pen-to-square" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCancel(row)}
                                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-warning-light text-danger hover:bg-danger hover:text-white transition-colors"
                              >
                                <i className="fa fa-ban" />
                              </button>
                            </div>
                          </td>}
                        </>
                      ) : (
                        <>
                          {visibleColumns.sno && <td className="px-3 py-2 text-center border-x border-line/50">{row.s_no || (curPage - 1) * length + index + 1}</td>}
                          {visibleColumns.cancel_po_num && <td className="px-3 py-2 border-x border-line/50">{row.po_num}</td>}
                          {visibleColumns.cancel_po_date && <td className="px-3 py-2 border-x border-line/50">{formatDate(row.po_date)}</td>}
                          {visibleColumns.cancel_state && <td className="px-3 py-2 border-x border-line/50">{row.state_name || row.state_name_display || "-"}</td>}
                          {visibleColumns.cancel_district && <td className="px-3 py-2 border-x border-line/50">{row.district_name || row.district_name_display || "-"}</td>}
                          {visibleColumns.cancel_customer && <td className="px-3 py-2 border-x border-line/50">{row.customer_name || row.department || row.department_display || "-"}</td>}
                          {visibleColumns.cancel_gst && <td className="px-3 py-2 border-x border-line/50">{row.gst_value || "-"}</td>}
                          {visibleColumns.cancel_executive && <td className="px-3 py-2 border-x border-line/50">{row.executive_label || row.executive_name || row.executive_name_display || "-"}</td>}
                          {visibleColumns.cancel_value && <td className="px-3 py-2 border-x border-line/50 text-right">{row.total_value || row.po_value || row.total_amount || "0"}</td>}
                          {visibleColumns.cancel_attach && <td className="px-3 py-2 text-center border-x border-line/50">
                            {row.cancel_file_url ? (
                              <a href={row.cancel_file_url} target="_blank" rel="noreferrer" className="text-danger hover:underline">
                                <i className="fa fa-file-pdf text-[15px]" />
                              </a>
                            ) : "-"}
                          </td>}
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>
              Showing {totalRows === 0 ? 0 : (curPage - 1) * length + 1} to {Math.min(curPage * length, totalRows)} of {totalRows} entries
            </span>

            <div className="flex gap-1 flex-wrap">
              <button type="button" disabled={curPage === 1} onClick={() => setCurPage((p) => p - 1)} className={pageButtonCls}>
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
              <button type="button" disabled={curPage >= totalPages} onClick={() => setCurPage((p) => p + 1)} className={pageButtonCls}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {showColumnModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="text-lg font-bold text-ink">Column Visibility</h3>
              <button type="button" onClick={() => setShowColumnModal(false)} className="text-2xl leading-none text-ink-muted hover:text-ink">×</button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {(activeTab === "po" ? poColumns : cancelColumns).map((column) => (
                <label key={column.key} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input name="purchaseorderlist_input_657"
                    type="checkbox"
                    checked={visibleColumns[column.key] ?? true}
                    onChange={(e) => setVisibleColumns((prev) => ({ ...prev, [column.key]: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


