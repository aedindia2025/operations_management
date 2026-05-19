import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SettingsListToolbar from "../../components/common/SettingsListToolbar";
import {
  deleteDispatch,
  fetchDispatchDelivery,
  fetchDispatchPending,
  fetchDispatchTransit,
  type DispatchDeliveryRow,
  type DispatchPendingRow,
  type DispatchTransitRow,
} from "../../api/dispatchApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

type TabKey = "pending" | "transit" | "delivery";
type DateType = "po" | "invoice" | "delivery";

function FileBtn({ url }: { url?: string }) {
  if (!url) {
    return (
      <span className="w-7 h-7 rounded bg-surface-2 text-ink-muted border border-line flex items-center justify-center">
        <i className="fa fa-file-pdf" />
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="w-7 h-7 rounded bg-danger/10 text-danger border border-red-200 hover:bg-danger hover:text-white transition-colors flex items-center justify-center"
      title="Open file"
    >
      <i className="fa fa-file-pdf" />
    </a>
  );
}

function formatLocation(address?: string, ledger?: string) {
  const lines = String(address || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const title = ledger || lines[0] || "-";
  const detail = lines.length > 1 ? lines.slice(1).join(", ") : lines[0] || "-";
  return { title, detail };
}

export default function DispatchList() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [rows, setRows] = useState<DispatchPendingRow[] | DispatchTransitRow[] | DispatchDeliveryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateType, setDateType] = useState<DateType>("po");
  const [appliedFilters, setAppliedFilters] = useState<{
    fromDate: string;
    toDate: string;
    dateType: DateType;
  }>({
    fromDate: "",
    toDate: "",
    dateType: "po",
  });

  useEffect(() => {
    if (activeTab !== "delivery" && dateType === "delivery") {
      setDateType("po");
    }
    setCurPage(1);
  }, [activeTab, dateType]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        let result;

        if (activeTab === "pending") {
          result = await fetchDispatchPending({
            page: curPage,
            length,
            search: search || undefined,
            from_date: appliedFilters.fromDate || undefined,
            to_date: appliedFilters.toDate || undefined,
            opt1: appliedFilters.dateType === "invoice" ? "100" : "10",
          });
        } else if (activeTab === "transit") {
          result = await fetchDispatchTransit({
            page: curPage,
            length,
            search: search || undefined,
            from_date: appliedFilters.fromDate || undefined,
            to_date: appliedFilters.toDate || undefined,
            opt: appliedFilters.dateType === "invoice" ? "5" : "4",
          });
        } else {
          result = await fetchDispatchDelivery({
            page: curPage,
            length,
            search: search || undefined,
            from_date: appliedFilters.fromDate || undefined,
            to_date: appliedFilters.toDate || undefined,
            opt3:
              appliedFilters.dateType === "invoice"
                ? "50"
                : appliedFilters.dateType === "delivery"
                  ? "60"
                  : "40",
          });
        }

        if (!mounted) return;
        setRows(result.data || []);
        setTotalRows(Number(result.recordsFiltered || result.recordsTotal || 0));
      } catch (error) {
        if (!mounted) return;
        setRows([]);
        setTotalRows(0);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load dispatch records.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [activeTab, appliedFilters, curPage, length, search, refreshKey]);

  useEffect(() => {
    setCurPage(1);
  }, [search, length]);

  const handleDelete = async (uniqueId?: string, label?: string) => {
    const targetId = String(uniqueId || "").trim();
    if (!targetId) return;
    const confirmed = await showConfirmAlert(`Delete dispatch for ${label || "this record"}?`);
    if (!confirmed) return;
    try {
      const res = await deleteDispatch(targetId);
      if (!res?.status) throw new Error(res?.message || res?.error || "Failed to delete dispatch.");
      await showSuccessAlert(res.message || "Dispatch moved back successfully.");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to delete dispatch.");
    }
  };

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(totalRows / length));
  const pageNums = useMemo(() => getPaginationItems(curPage, totalPages), [curPage, totalPages]);
  const tabCls = "rounded-t-[22px] border border-b-0 px-5 py-3 text-[13px] font-semibold transition-all";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f4f6ef_34%,#eef2e9_100%)] p-4 md:p-6">
      <PageTopbar title="Dispatch List" breadcrumbs={["Stores", "Dispatch"]} />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.10)]">
        <div className="flex gap-2 border-b border-[#e4e8d7] px-6 pt-5">
          {([
            ["pending", "Pending"],
            ["transit", "In Transit"],
            ["delivery", "Delivered"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`${tabCls} cursor-pointer ${
                activeTab === key
                  ? "border-[#6d8d31] bg-[linear-gradient(135deg,#739436_0%,#5f8128_100%)] text-white shadow-[0_14px_28px_rgba(95,129,40,0.22)]"
                  : "border-[#e4e8d7] bg-white text-[#63704a] hover:border-[#cad3b3] hover:text-[#42551d]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-5 bg-[linear-gradient(180deg,#f7f8f1_0%,#ffffff_18%)] p-5 md:p-6">
          <div className="flex flex-wrap items-end gap-4 rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">From Date</span>
              <input name="fromdate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-11 w-[190px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10"
              />
            </div>
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">To Date</span>
              <input name="todate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-11 w-[190px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10"
              />
            </div>
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">Select Date Type</span>
              <SearchableSelectInput name="datetype"
                value={dateType}
                onChange={(e) => setDateType(e.target.value as DateType)}
                className="h-11 w-[190px] appearance-none rounded-2xl border border-[#d8dec8] bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-all focus:border-[#7b8f43] focus:ring-4 focus:ring-[#7b8f43]/10"
              >
                <option value="po">PO Date</option>
                <option value="invoice">Invoice Date</option>
                {activeTab === "delivery" && <option value="delivery">Delivery Date</option>}
              </SearchableSelectInput>
            </div>
            <button
              type="button"
              onClick={() => {
                setAppliedFilters({ fromDate, toDate, dateType });
                setCurPage(1);
              }}
              className="inline-flex h-11 items-center justify-center self-end rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-8 text-[14px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(79,122,43,0.28)]"
            >
              Go
            </button>
          </div>

          <SettingsListToolbar
            length={length}
            setLength={setLength}
            search={search}
            setSearch={setSearch}
            tableRef={tableRef}
            searchPlaceholder="Search PO, invoice, courier..."
            lengthDropdownClassName="top-auto bottom-full mb-2 mt-0"
          />

          <div className="overflow-x-auto rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_20px_38px_rgba(46,61,24,0.08)]">
            {activeTab === "pending" && (
              <table ref={tableRef} className="w-full text-[13px] border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)]">
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">S.No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">PO No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Location</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Followed By</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Invoice No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">DC No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Value</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-ink-muted border border-line italic">Loading...</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-ink-muted border border-line italic">No data available in table</td>
                    </tr>
                  ) : (
                    (rows as DispatchPendingRow[]).map((row, idx) => {
                      const location = formatLocation(row.con_address, row.ledger_name);
                      return (
                        <tr
                          key={`${row.unique_id || "row"}-${row.dc_number || "dc"}-${idx}`}
                          className="hover:bg-brand-50/40 transition-colors border-b border-line/50"
                        >
                          <td className="px-3 py-2.5 text-center border-x border-line/50">{length === -1 ? idx + 1 : (curPage - 1) * length + idx + 1}</td>
                          <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                            <div className="font-semibold text-ink">{row.po_num || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.po_date || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 border-x border-line/50 max-w-[260px]">
                            <div className="font-semibold text-ink">{location.title}</div>
                            <div className="text-[11px] text-ink-muted leading-relaxed">{location.detail}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{row.team_member || "-"}</td>
                          <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                            <div className="font-semibold text-ink">{row.invoice_no || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.invoice_date || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                            <div className="font-semibold text-ink">{row.dc_number || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.dc_date || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right border-x border-line/50 whitespace-nowrap">{row.invoice_value || "0"}</td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/stores/dispatch/form?source=${encodeURIComponent(row.unique_id)}&consignee=${encodeURIComponent(
                                      row.consignee_unique_id || ""
                                    )}`
                                  )
                                }
                                className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                                title="Create Dispatch"
                              >
                                <i className="fa fa-pen-to-square" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(row.unique_id, row.dc_number || row.invoice_no)}
                                className="w-7 h-7 flex items-center justify-center rounded bg-danger/10 text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <i className="fa fa-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "transit" && (
              <table ref={tableRef} className="w-full text-[13px] border-collapse min-w-[1300px]">
                <thead>
                  <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)]">
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">S.No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">PO No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Location</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Followed By</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Invoice No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">DC No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Dispatch Date</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Mode of Delivery</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Courier / Person Name</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">POD No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Delivery Status</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">E-Invoice</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="text-center py-10 text-ink-muted border border-line italic">Loading...</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-10 text-ink-muted border border-line italic">No data available in table</td>
                    </tr>
                  ) : (
                    (rows as DispatchTransitRow[]).map((row, idx) => {
                      const location = formatLocation(row.con_address, row.ledger_name);
                      const modeText =
                        row.mode_of_delivery_text || (String(row.mode_of_delivery || "") === "1" ? "Hand" : String(row.mode_of_delivery || "") === "2" ? "Courier" : "-");
                      const deliveryStatus = row.delivery_status_text || (String(row.status || "") === "1" ? "Pending" : String(row.status || "") ? String(row.status) : "Pending");
                      return (
                        <tr
                          key={`${row.unique_id || "row"}-${row.dc_number || "dc"}-${idx}`}
                          className="hover:bg-brand-50/40 transition-colors border-b border-line/50"
                        >
                          <td className="px-3 py-2.5 text-center border-x border-line/50">{length === -1 ? idx + 1 : (curPage - 1) * length + idx + 1}</td>
                          <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                            <div className="font-semibold text-ink">{row.po_num || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.po_date || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 border-x border-line/50 max-w-[260px]">
                            <div className="font-semibold text-ink">{location.title}</div>
                            <div className="text-[11px] text-ink-muted leading-relaxed">{location.detail}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{row.team_member || "-"}</td>
                          <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                            <div className="font-semibold text-ink">{row.invoice_no || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.invoice_date || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                            <div className="font-semibold text-ink">{row.dc_number || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.dc_date || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{row.dispatch_date || "-"}</td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{modeText}</td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{row.name_of_courier || "-"}</td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{row.pod_no || "-"}</td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap text-warning font-semibold">{deliveryStatus}</td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><FileBtn url={row.einvoice_url} /></div></td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/stores/dispatch/transit?unique_id=${encodeURIComponent(row.po_form_unique_id || "")}&consignee_unique_id=${encodeURIComponent(
                                      row.consignee_unique_id || ""
                                    )}&dc_no=${encodeURIComponent(row.dc_number || "")}`
                                  )
                                }
                                className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                                title="Update Dispatch"
                              >
                                <i className="fa fa-pen-to-square" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(row.unique_id, row.dc_number || row.invoice_no)}
                                className="w-7 h-7 flex items-center justify-center rounded bg-danger/10 text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <i className="fa fa-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "delivery" && (
              <table ref={tableRef} className="w-full text-[13px] border-collapse min-w-[1400px]">
                <thead>
                  <tr className="bg-[linear-gradient(135deg,#fbfcf7_0%,#eef4df_100%)]">
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">S.No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">PO No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Location</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Followed By</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Invoice No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">DC No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Delivery Date</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">DC</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">IR</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Invoice</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">E-Invoice</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Delivery Proof</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">POD Proof</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Status</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={15} className="text-center py-10 text-ink-muted border border-line italic">Loading...</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="text-center py-10 text-ink-muted border border-line italic">No data available in table</td>
                    </tr>
                  ) : (
                    (rows as DispatchDeliveryRow[]).map((row, idx) => {
                      const location = formatLocation(row.con_address, row.ledger_name);
                      return (
                        <tr
                          key={`${row.unique_id || "row"}-${row.dc_number || "dc"}-${idx}`}
                          className="hover:bg-brand-50/40 transition-colors border-b border-line/50"
                        >
                          <td className="px-3 py-2.5 text-center border-x border-line/50">{length === -1 ? idx + 1 : (curPage - 1) * length + idx + 1}</td>
                          <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                            <div className="font-semibold text-ink">{row.po_num || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.po_date || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 border-x border-line/50 max-w-[260px]">
                            <div className="font-semibold text-ink">{location.title}</div>
                            <div className="text-[11px] text-ink-muted leading-relaxed">{location.detail}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{row.team_member || "-"}</td>
                          <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                            <div className="font-semibold text-ink">{row.invoice_no || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.invoice_date || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                            <div className="font-semibold text-ink">{row.dc_number || "-"}</div>
                            <div className="text-[11px] text-ink-muted">{row.dc_date || "-"}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{row.delivery_date || "-"}</td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><FileBtn url={row.dc_file_url} /></div></td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><FileBtn url={row.ir_file_url} /></div></td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><FileBtn url={row.invoice_file_url} /></div></td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><FileBtn url={row.einvoice_url} /></div></td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><FileBtn url={row.delivery_proof_url} /></div></td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50"><div className="flex justify-center"><FileBtn url={row.pod_proof_url} /></div></td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap font-semibold text-success">{row.delivery_status_text || "Completed"}</td>
                          <td className="px-3 py-2.5 text-center border-x border-line/50">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/stores/dispatch/delivery?unique_id=${encodeURIComponent(row.po_form_unique_id || "")}&consignee_unique_id=${encodeURIComponent(
                                      row.consignee_unique_id || ""
                                    )}&dc_no=${encodeURIComponent(row.dc_number || "")}`
                                  )
                                }
                                className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                                title="Update Delivery"
                              >
                                <i className="fa fa-pen-to-square" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(row.unique_id, row.dc_number || row.invoice_no)}
                                className="w-7 h-7 flex items-center justify-center rounded bg-danger/10 text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <i className="fa fa-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>
              Showing {totalRows === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1} to {length === -1 ? totalRows : Math.min(curPage * length, totalRows)} of {totalRows} entries
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={length === -1 || curPage === 1}
                onClick={() => setCurPage((p) => p - 1)}
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
                disabled={length === -1 || curPage >= totalPages}
                onClick={() => setCurPage((p) => p + 1)}
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


