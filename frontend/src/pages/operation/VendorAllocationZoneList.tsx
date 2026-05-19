import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import PageTabs from "../../components/common/PageTabs";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import SearchableSelect from "../../components/common/SearchableSelect";
import { fetchUserList } from "../../api/userApi";
import {
  exportVendorAllocationData,
  fetchVendorAllocationCompleted,
  fetchVendorAllocationPending,
  type VendorAllocationCompletedRow,
  type VendorAllocationPendingRow,
} from "../../api/vendorAllocationZoneApi";
import { getPaginationItems } from "../../utils/pagination";

type TabKey = "pending" | "completed";

type TeamMemberOption = {
  unique_id: string;
  staff_name: string;
};

type ListRow = {
  id: string;
  poNo: string;
  poDate: string;
  invoiceNo: string;
  invoiceDate: string;
  dcNo: string;
  dcDate: string;
  customerName: string;
  customerCity: string;
  customerState: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeCity: string;
  consigneeState: string;
  followedBy: string;
  qty: number;
  timeline: string;
  ageing: string;
  date: string;
  assignedTo: string;
};

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  return value;
}

function splitConsignee(value?: string) {
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    name: lines[0] || "--",
    address: lines.slice(1, -2).join(", ") || lines.slice(1).join(", ") || "--",
    city: lines.length >= 2 ? lines[lines.length - 2] : "",
    state: lines.length >= 1 ? lines[lines.length - 1] : "",
  };
}

function mapPendingRow(row: VendorAllocationPendingRow): ListRow {
  const consignee = splitConsignee(row.cons_details);
  return {
    id: row.unique_id,
    poNo: row.po_num || "--",
    poDate: formatDate(row.po_date),
    invoiceNo: row.inv_no || "--",
    invoiceDate: formatDate(row.invoice_date),
    dcNo: row.dc_number || "--",
    dcDate: formatDate(row.dc_date),
    customerName: row.department_name || "--",
    customerCity: row.district || "",
    customerState: row.state || "",
    consigneeName: consignee.name,
    consigneeAddress: consignee.address,
    consigneeCity: consignee.city,
    consigneeState: consignee.state,
    followedBy: row.team_member || "--",
    qty: toNumber(row.invoice_qty),
    timeline: formatDate(row.vendor_timeline),
    ageing: "Pending",
    date: formatDate(row.invoice_date || row.dc_date),
    assignedTo: row.eng_name_id || "--",
  };
}

function mapCompletedRow(row: VendorAllocationCompletedRow): ListRow {
  const base = mapPendingRow(row);
  return {
    ...base,
    ageing: row.ageing || "Completed",
    date: formatDate(row.assign_date || row.vendor_ins_date || row.installation_com_date || row.invoice_date),
    assignedTo: row.eng_name_id || "--",
  };
}

function escapeCsv(value: string | number) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCSV(data: ListRow[]) {
  const rows = [
    ["S.No", "PO No", "Invoice No", "DC No", "Customer Name", "Consignee", "Followed By", "Assigned To", "Qty", "Timeline", "Ageing", "Date"],
    ...data.map((r, i) => [
      i + 1,
      r.poNo,
      r.invoiceNo,
      r.dcNo,
      `${r.customerName} ${r.customerCity} ${r.customerState}`.trim(),
      `${r.consigneeName} ${r.consigneeAddress}`.trim(),
      r.followedBy,
      r.assignedTo,
      r.qty,
      r.timeline,
      r.ageing,
      r.date,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "vendor_allocation.csv";
  a.click();
}

function ExportBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[#d7bf73] bg-white/92 px-4 py-2 text-[13px] font-semibold text-[#6b6a1f] shadow-[0_8px_18px_rgba(180,153,73,0.08)] transition-all hover:-translate-y-[1px] hover:bg-[#fff7dd] cursor-pointer"
    >
      {label}
    </button>
  );
}

export default function VendorAllocationList() {
  const navigate = useNavigate();
  const pageTitle = "Vendor Allocation Zone List";
  const breadcrumbs = ["Operation", "Vendor Allocation Zone"];
  const formPath = "/operation/vendor-allocation-zone/form";
  const tabs = ["pending", "completed"] as const;

  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateType, setDateType] = useState("");
  const [teamMember, setTeamMember] = useState("");
  const [teamOptions, setTeamOptions] = useState<TeamMemberOption[]>([]);
  const [rows, setRows] = useState<ListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserList({ start: 0, length: 200 })
      .then((res) => {
        setTeamOptions((res.data ?? []).map((row) => ({ unique_id: row.unique_id, staff_name: row.staff_name })));
      })
      .catch(() => {
        setTeamOptions([]);
      });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          opt1: activeTab === "pending" && dateType === "PO Date"
            ? "101"
            : activeTab === "pending" && dateType === "Invoice Date"
              ? "100"
              : undefined,
          team_mem: teamMember || undefined,
          search: search || undefined,
          page: curPage,
          length,
        };

        if (activeTab === "pending") {
          const res = await fetchVendorAllocationPending(params);
          setRows((res.data ?? []).map(mapPendingRow));
          setTotal(res.recordsFiltered ?? 0);
        } else {
          const res = await fetchVendorAllocationCompleted(params);
          setRows((res.data ?? []).map(mapCompletedRow));
          setTotal(res.recordsFiltered ?? 0);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to load vendor allocation records.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeTab, search, length, curPage, fromDate, toDate, dateType, teamMember]);

  useEffect(() => {
    setCurPage(1);
  }, [activeTab, search, length, fromDate, toDate, dateType, teamMember]);

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
  const currentCols = ["S.No", "PO No", "Invoice No", "DC No", "Customer Name", "Consignee", "Followed By", "Assigned To", "Qty", "Timeline", "Ageing", "Date", "Action"];
  const pageStart = total === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1;
  const pageEnd = length === -1 ? total : Math.min(curPage * length, total);

  const pageNums = useMemo(() => getPaginationItems(curPage, totalPages), [curPage, totalPages]);

  const handleExportApi = async () => {
    try {
      const res = await exportVendorAllocationData("complete");
      const mapped = (res.data ?? []).map((row: any, index: number) => ({
        id: String(index + 1),
        poNo: row.po_num || "--",
        poDate: formatDate(row.po_date),
        invoiceNo: row.invoice_no || row.inv_no || "--",
        invoiceDate: formatDate(row.invoice_date),
        dcNo: row.dc_number || "--",
        dcDate: formatDate(row.dc_date),
        customerName: row.department_name || row.department || "--",
        customerCity: row.district || "",
        customerState: row.state || "",
        consigneeName: row.con_contact_name || "--",
        consigneeAddress: row.con_address || "--",
        consigneeCity: "",
        consigneeState: "",
        followedBy: row.team_member || "--",
        assignedTo: row.eng_name_id || "--",
        qty: toNumber(row.invoice_qty),
        timeline: formatDate(row.vendor_bulk_timeline),
        ageing: row.ageing || "--",
        date: formatDate(row.assign_date || row.invoice_date),
      }));
      exportCSV(mapped);
    } catch {
      exportCSV(rows);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
      <PageTopbar title={pageTitle} breadcrumbs={breadcrumbs} />

      <div className="overflow-hidden rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <PageTabs
          items={tabs.map((tab) => ({
            value: tab,
            label: tab === "pending" ? "Pending" : "Completed",
          }))}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setCurPage(1);
          }}
        />

        <div className="p-5">
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

          <div className="flex items-end gap-3 mb-5 flex-wrap">
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">From Date</span>
              <input name="vendor_allocation_from_date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 w-40" />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">To Date</span>
              <input name="vendor_allocation_to_date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 w-40" />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Select Date Type</span>
              <SearchableSelect
                name="vendor_allocation_zone_date_type"
                value={dateType}
                onChange={setDateType}
                options={[
                  { value: "", label: "Select" },
                  { value: "PO Date", label: "PO Date" },
                  { value: "Invoice Date", label: "Invoice Date" },
                ]}
                className="w-40"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Team Members</span>
              <SearchableSelect
                name="vendor_allocation_zone_team_member"
                value={teamMember}
                onChange={setTeamMember}
                options={[
                  { value: "", label: "All" },
                  ...teamOptions.map((option) => ({ value: option.unique_id, label: option.staff_name })),
                ]}
                className="w-52"
              />
            </div>
            <button type="button" onClick={() => setCurPage(1)} className="otm-btn-primary-sm self-end">Go</button>
            {activeTab === "pending" && (
              <button type="button" onClick={() => navigate(formPath)} className="otm-btn-primary-sm self-end ml-auto">
                Vendor Allocation Zone
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                Show
                <SearchableSelect
                  name="vendor_allocation_zone_length"
                  value={String(length)}
                  onChange={(value) => {
                    setLength(Number(value));
                    setCurPage(1);
                  }}
                  options={[
                    ...[10, 25, 50, 100].map((n) => ({ value: String(n), label: String(n) })),
                    { value: "-1", label: "All" },
                  ]}
                  className="w-[88px]"
                  buttonClassName="px-2 py-1"
                />
                entries
              </div>
              <ExportBtn label="Copy" />
              <ExportBtn label="CSV" onClick={() => void handleExportApi()} />
              <ExportBtn label="Excel" />
              <ExportBtn label="PDF" />
              <ExportBtn label="Print" />
            </div>
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              Search:
              <input name="vendor_allocation_zone_search" value={search} placeholder="Search..." onChange={(e) => setSearch(e.target.value)} className="px-2.5 py-1 text-[13px] border border-line-dark rounded outline-none w-48 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="otm-table-shell overflow-x-auto">
            <table className="otm-table w-full text-[13px] border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-surface-2">
                  {currentCols.map((col) => (
                    <th key={col} className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={currentCols.length} className="text-center py-10 text-ink-muted border border-line">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={currentCols.length} className="text-center py-10 text-ink-muted border border-line italic">No data available in table</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                    <td className="px-3 py-3 text-center border-x border-line/50 text-ink-muted">{pageStart + i}</td>
                    <td className="px-3 py-3 border-x border-line/50 max-w-[160px]"><div className="font-semibold text-ink text-[13px]">{r.poNo}</div><div className="text-[11px] text-ink-muted">({r.poDate})</div></td>
                    <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{r.invoiceNo}</div><div className="text-[11px] text-ink-muted">({r.invoiceDate})</div></td>
                    <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{r.dcNo}</div><div className="text-[11px] text-ink-muted">({r.dcDate})</div></td>
                    <td className="px-3 py-3 border-x border-line/50 max-w-[160px]"><div className="font-semibold text-ink text-[13px]">{r.customerName}</div><div className="text-[11px] text-ink-muted">{r.customerCity}</div><div className="text-[11px] text-ink-muted">{r.customerState}</div></td>
                    <td className="px-3 py-3 border-x border-line/50 max-w-[280px]"><div className="font-bold text-ink text-[13px]">{r.consigneeName}</div><div className="text-[11px] text-ink-secondary leading-relaxed">{r.consigneeAddress}</div><div className="text-[11px] text-ink-secondary">{r.consigneeCity}</div><div className="text-[11px] text-ink-secondary">{r.consigneeState}</div></td>
                    <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px]">{r.followedBy}</td>
                    <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px] text-ink-muted">{r.assignedTo}</td>
                    <td className="px-3 py-3 text-center border-x border-line/50 font-semibold text-ink">{r.qty}</td>
                    <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px]">{r.timeline}</td>
                    <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px] text-ink-muted">{r.ageing}</td>
                    <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px]">{r.date}</td>
                    <td className="px-3 py-3 text-center border-x border-line/50">
                      {activeTab === "pending" ? (
                        <button onClick={() => navigate(`${formPath}/${r.id}`)} title="Assign" className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer mx-auto">
                          <i className="fa fa-pen-to-square" />
                        </button>
                      ) : (
                        <span className="text-ink-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>Showing {pageStart} to {pageEnd} of {total} entries</span>
            <div className="flex gap-1">
              <button disabled={length === -1 || curPage === 1} onClick={() => setCurPage((p) => p - 1)} className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Previous</button>
              <PaginationPageButtons
                items={pageNums}
                currentPage={curPage}
                onPageChange={setCurPage}
                getButtonClassName={(page) => `w-[30px] h-[30px] text-[13px] border rounded cursor-pointer ${
                  page === curPage ? "bg-brand-500 text-white border-brand-500" : "bg-white border-line hover:border-brand-500 hover:text-brand-500"
                }`}
              />
              <button disabled={length === -1 || curPage >= totalPages} onClick={() => setCurPage((p) => p + 1)} className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
