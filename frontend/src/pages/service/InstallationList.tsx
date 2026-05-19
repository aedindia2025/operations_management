import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import PageTabs from "../../components/common/PageTabs";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import SearchableSelect from "../../components/common/SearchableSelect";
import {
  deleteInstallation,
  fetchInstallationList,
  fetchInstallationTeamMemberOptions,
  type InstallationRow,
  type InstallationTab,
} from "../../api/installationApi";
import { fetchConsigneeDistrictOptions } from "../../api/consigneeCreationApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { getPaginationItems } from "../../utils/pagination";

const TABS: Array<{ key: InstallationTab; label: string }> = [
  { key: "pending", label: "Installation Pending" },
  { key: "uploaded", label: "Document Uploaded" },
  { key: "dcir_pending", label: "DC and IR Pending" },
  { key: "dcir_completed", label: "DC and IR Completed" },
];

const VALID_TABS = new Set<InstallationTab>(TABS.map((tab) => tab.key));

type InstallationActionKind = "edit" | "view";

function AttachmentButton({ url }: { url?: string }) {
  if (!url) return <span className="text-ink-muted">-</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="w-7 h-7 inline-flex items-center justify-center rounded bg-green-50 text-green-600 border border-green-200 text-[13px] hover:bg-green-600 hover:text-white transition-colors">
      <i className="fa fa-paperclip" />
    </a>
  );
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

function normalizeValue(value?: string) {
  return String(value ?? "").trim();
}

function shouldOpenView(row: InstallationRow) {
  if (!row.unique_id) return false;
  const hasDc = normalizeValue(row.documents_type) === "DC";
  const hasIr = normalizeValue(row.documents_type1) === "IR";
  const dcRequired = normalizeValue(row.dc_required) === "1";
  return (hasDc && hasIr) || dcRequired;
}

function getPrimaryAction(tab: InstallationTab, row: InstallationRow): InstallationActionKind {
  if (tab === "dcir_completed") return "view";
  if (tab === "dcir_pending") return normalizeValue(row.dc_delivery_status) === "3" ? "view" : "edit";
  return shouldOpenView(row) ? "view" : "edit";
}

function ActionButtons({
  row,
  actionKind,
  showDelete,
  onAction,
  onDelete,
}: {
  row: InstallationRow;
  actionKind: InstallationActionKind;
  showDelete: boolean;
  onAction: (row: InstallationRow, actionKind: InstallationActionKind) => void;
  onDelete: (row: InstallationRow) => void;
}) {
  const title = actionKind === "view" ? "View" : "Edit";
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" onClick={() => onAction(row, actionKind)} title={title} aria-label={title} className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer">
        <i className={`fa ${actionKind === "view" ? "fa-eye" : "fa-pen-to-square"}`} />
      </button>
      {showDelete ? (
        <button type="button" onClick={() => onDelete(row)} title="Delete" aria-label="Delete" className="w-7 h-7 flex items-center justify-center rounded bg-danger-light text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer">
          <i className="fa fa-trash" />
        </button>
      ) : null}
    </div>
  );
}

export default function InstallationList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<InstallationTab>(
    VALID_TABS.has(initialTab as InstallationTab) ? (initialTab as InstallationTab) : "pending",
  );
  const [rows, setRows] = useState<InstallationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateType, setDateType] = useState("");
  const [district, setDistrict] = useState("");
  const [teamMember, setTeamMember] = useState("All");
  const [engType, setEngType] = useState("");
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [staffTeamMembers, setStaffTeamMembers] = useState<Array<{ value: string; label: string }>>([]);
  const [districtOptions, setDistrictOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchInstallationList({
          tab: activeTab,
          from_date: fromDate,
          to_date: toDate,
          date_type: dateType,
          district,
          team_member: teamMember,
          engg_type: engType,
          search,
        });
        setRows(res.data ?? []);
      } catch (err: any) {
        setRows([]);
        setError(err?.response?.data?.message || "Failed to load installation records.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab, fromDate, toDate, dateType, district, teamMember, engType, search, refreshKey]);

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const res = await fetchInstallationTeamMemberOptions();
        setStaffTeamMembers(
          (res.team_members || [])
            .filter((item) => item.unique_id && item.label)
            .map((item) => ({ value: item.unique_id, label: item.label }))
        );
      } catch {
        setStaffTeamMembers([]);
      }
    };
    loadTeamMembers();
  }, []);

  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const options = await fetchConsigneeDistrictOptions();
        setDistrictOptions(options.filter((item) => item.value && item.label));
      } catch {
        setDistrictOptions([]);
      }
    };
    loadDistricts();
  }, []);

  const districts = useMemo(() => {
    const seen = new Map<string, string>();
    districtOptions.forEach((item) => {
      if (item.value && item.label) seen.set(item.value, item.label);
    });
    rows.forEach((row) => {
      const label = row.district?.trim();
      if (label && !seen.has(label)) seen.set(label, label);
    });
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [districtOptions, rows]);
  const teamMembers = useMemo(() => {
    const seen = new Map<string, string>();
    staffTeamMembers.forEach((item) => {
      if (item.value && item.label) seen.set(item.value, item.label);
    });
    rows.forEach((row) => {
      const label = row.team_member?.trim();
      if (!label) return;
      const value = row.team_member_id?.trim() || label;
      if (!seen.has(value)) seen.set(value, label);
    });
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, staffTeamMembers]);

  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(rows.length / length));
  const paginationItems = useMemo(() => getPaginationItems(curPage, totalPages), [curPage, totalPages]);
  const paged = length === -1 ? rows : rows.slice((curPage - 1) * length, curPage * length);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", activeTab);
    setSearchParams(params, { replace: true });
  }, [activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    setCurPage(1);
  }, [activeTab, length, rows.length]);

  const handleAction = async (row: InstallationRow, actionKind: InstallationActionKind) => {
    if (activeTab === "dcir_pending" || activeTab === "dcir_completed") {
      if (!row.unique_id) {
        await showErrorAlert("Installation dispatch record is missing.");
        return;
      }
      const mode = actionKind === "view" ? "view" : "edit";
      navigate(`/service/installation/dispatch/${row.unique_id}?mode=${mode}&tab=${activeTab}`);
      return;
    }

    if (row.unique_id) {
      const mode = actionKind === "view" ? "&mode=view" : "";
      navigate(`/service/installation/form/${row.unique_id}?tab=${activeTab}${mode}`);
    } else {
      navigate(`/service/installation/form?source=${encodeURIComponent(row.source_unique_id)}&tab=${activeTab}`);
    }
  };

  const handleDelete = async (row: InstallationRow) => {
    if (!row.unique_id) return;
    if (!(await showConfirmAlert("Delete this installation record?"))) return;
    try {
      const res = await deleteInstallation(row.unique_id, activeTab);
      if (res.status) {
        setRows((prev) => prev.filter((item) => item.unique_id !== row.unique_id));
        await showSuccessAlert("Installation deleted successfully.");
      } else {
        await showErrorAlert(res.message || "Failed to delete installation.");
      }
    } catch (err: any) {
      await showErrorAlert(err?.response?.data?.message || "Failed to delete installation.");
    }
  };
// Add these helper functions before the component (after imports)
function exportCSV(data: InstallationRow[]) {
  const rowsData = [
    ["S.No","PO No","Ledger Name","Followed By","Invoice No","DC No","Invoice Value","Alloc Date"],
    ...data.map((r) => [
      r.s_no, r.po_num, r.ledger_name, r.team_member,
      r.invoice_no, r.dc_number, r.invoice_value, r.installation_alloc_date,
    ]),
  ];
  const csv = rowsData.map((r) => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "installation.csv";
  a.click();
}

function printTable(data: InstallationRow[]) {
  const html = `<html><head><title>Installation</title>
    <style>body{font-family:sans-serif;font-size:10px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:3px 6px}th{background:#f5f5f5}</style></head>
    <body><h3>Installation List</h3><table><thead><tr>
    <th>S.No</th><th>PO No</th><th>Ledger Name</th><th>Followed By</th>
    <th>Invoice No</th><th>DC No</th><th>Invoice Value</th><th>Alloc Date</th>
    </tr></thead><tbody>
    ${data.map((r) => `<tr>
      <td>${r.s_no}</td><td>${r.po_num}</td><td>${r.ledger_name || "-"}</td>
      <td>${r.team_member || "-"}</td><td>${r.invoice_no || "-"}</td>
      <td>${r.dc_number || "-"}</td><td>${r.invoice_value || "0"}</td>
      <td>${r.installation_alloc_date || "-"}</td>
    </tr>`).join("")}
    </tbody></table></body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
      <PageTopbar title="Installation" breadcrumbs={["Service", "Installation"]} />
      <div className="overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <PageTabs
          items={TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setCurPage(1);
          }}
        />

        <div className="p-5 space-y-4">
          {error ? <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-lg">{error}</div> : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">From Date</span>
              <input name="installation_from_date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">To Date</span>
              <input name="installation_to_date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Date Type</span>
              <SearchableSelect
                name="installation_date_type"
                value={dateType}
                onChange={setDateType}
                options={[
                  { value: "", label: "Select Date" },
                  { value: "po_date", label: "PO Date" },
                  { value: "invoice_date", label: "Invoice Date" },
                  { value: "dc_date", label: "DC Date" },
                ]}
                className="w-full"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Consignee District</span>
              <SearchableSelect
                name="installation_district"
                value={district}
                onChange={setDistrict}
                options={[
                  { value: "", label: "All Districts" },
                  ...districts,
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Team Member</span>
              <SearchableSelect
                name="installation_team_member"
                value={teamMember}
                onChange={setTeamMember}
                options={[
                  { value: "All", label: "All" },
                  ...teamMembers,
                ]}
                className="w-64"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Engineer Type</span>
              <SearchableSelect
                name="installation_engineer_type"
                value={engType}
                onChange={setEngType}
                options={[
                  { value: "", label: "All" },
                  { value: "own-engineer", label: "Own Engineer" },
                  { value: "outsource-vendor", label: "Outsource Engineer" },
                ]}
                className="w-64"
              />
            </div>
            <button type="button" onClick={() => setRefreshKey((prev) => prev + 1)} className="otm-btn-primary-sm self-end">Go</button>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
  <div className="flex items-center gap-2 flex-wrap">
    <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
      Show
      <SearchableSelect
        name="installation_length"
        value={String(length)}
        onChange={(value) => { setLength(Number(value)); setCurPage(1); }}
        options={[10, 25, 50, 100, -1].map((n) => ({ value: String(n), label: n === -1 ? "All" : String(n) }))}
        className="w-[88px]"
        buttonClassName="px-2 py-1"
      />
      entries
    </div>
    <ExportBtn label="Copy" onClick={() => navigator.clipboard?.writeText(rows.map((r) => `${r.po_num}\t${r.ledger_name}`).join("\n"))} />
    <ExportBtn label="CSV" onClick={() => exportCSV(rows)} />
    <ExportBtn label="Excel" onClick={() => exportCSV(rows)} />
    <ExportBtn label="PDF" onClick={() => printTable(rows)} />
    <ExportBtn label="Print" onClick={() => printTable(rows)} />
    <button type="button" className="otm-btn-secondary py-1.5">
      Column Visibility <i className="fa fa-chevron-down text-[10px]" />
    </button>
  </div>
  <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
    Search:
    <input name="installation_search" value={search} onChange={(e) => setSearch(e.target.value)} className="px-2.5 py-1 text-[13px] border border-line-dark rounded outline-none w-56 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
  </div>
</div>

          <div className="otm-table-shell overflow-x-auto">
            <table className="otm-table w-full text-[13px] border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-surface-2">
                  {["S.No", "PO No", "Ledger Name", "Followed By", "Invoice", "DC", "Invoice Value", "Installation Allocation Date", "PO.Att.", "DC.Att.", "IR.Att.", "INV.Att.", "Action"].map((head) => (
                    <th key={head} className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-10 text-ink-muted border border-line"><span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />Loading...</span></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-10 text-ink-muted border border-line">No records found.</td></tr>
                ) : (
                  paged.map((row) => {
                    const primaryAction = getPrimaryAction(activeTab, row);
                    const showDeleteAction = activeTab === "uploaded" && Boolean(row.unique_id);

                    return (
                    <tr key={`${row.source_unique_id}-${row.unique_id || "new"}`} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                      <td className="px-3 py-3 text-center border-x border-line/50 text-ink-muted">{row.s_no}</td>
                      <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{row.po_num}</div><div className="text-[11px] text-ink-muted">{row.po_date || "-"}</div></td>
                      <td className="px-3 py-3 border-x border-line/50 min-w-[180px]"><div className="font-semibold text-ink text-[13px]">{row.ledger_name || "-"}</div><div className="text-[11px] text-ink-secondary">{row.district || "-"}</div><div className="text-[11px] text-ink-muted">{row.state || "-"}</div></td>
                      <td className="px-3 py-3 border-x border-line/50 min-w-[170px]"><div className="text-[11.5px]"><span className="text-ink-muted">FLB: </span><span className="font-semibold text-ink">{row.team_member || "-"}</span></div><div className="text-[11.5px]"><span className="text-ink-muted">ENG: </span><span className="font-semibold text-ink">{row.engineer_name || "-"}</span></div></td>
                      <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{row.invoice_no || "-"}</div><div className="text-[11px] text-ink-muted">{row.invoice_date || "-"}</div></td>
                      <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{row.dc_number || "-"}</div><div className="text-[11px] text-ink-muted">{row.dc_date || "-"}</div></td>
                      <td className="px-3 py-3 text-center border-x border-line/50 font-semibold text-ink">{row.invoice_value || "0"}</td>
                      <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap text-[13px]">{row.installation_alloc_date || "-"}</td>
                      <td className="px-2 py-3 text-center border-x border-line/50"><AttachmentButton url={row.po_file_url} /></td>
                      <td className="px-2 py-3 text-center border-x border-line/50"><AttachmentButton url={row.dc_file_url} /></td>
                      <td className="px-2 py-3 text-center border-x border-line/50"><AttachmentButton url={row.ir_file_url} /></td>
                      <td className="px-2 py-3 text-center border-x border-line/50"><AttachmentButton url={row.invoice_file_url} /></td>
                      <td className="px-2 py-3 text-center border-x border-line/50"><ActionButtons row={row} actionKind={primaryAction} showDelete={showDeleteAction} onAction={handleAction} onDelete={handleDelete} /></td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[13px] text-ink-secondary flex-wrap gap-2 pt-2 border-t border-line">
            <span>Showing {rows.length === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * length + 1} to {length === -1 ? rows.length : Math.min(curPage * length, rows.length)} of {rows.length} entries</span>
            <div className="flex gap-1">
              <button disabled={length === -1 || curPage === 1} onClick={() => setCurPage((p) => p - 1)} className="px-3 h-[30px] text-[13px] bg-white border border-line rounded disabled:opacity-40 cursor-pointer">Previous</button>
              <PaginationPageButtons
                items={paginationItems}
                currentPage={curPage}
                onPageChange={setCurPage}
                getButtonClassName={(page) =>
                  `min-w-[30px] h-[30px] px-2 text-[13px] border rounded cursor-pointer ${page === curPage ? "bg-brand-500 text-white border-brand-500" : "bg-white border-line hover:border-brand-500 hover:text-brand-500"}`
                }
              />
              <button disabled={length === -1 || curPage >= totalPages} onClick={() => setCurPage((p) => p + 1)} className="px-3 h-[30px] text-[13px] bg-white border border-line rounded disabled:opacity-40 cursor-pointer">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


