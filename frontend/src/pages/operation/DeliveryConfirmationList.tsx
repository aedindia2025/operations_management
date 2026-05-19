import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import PageTabs from "../../components/common/PageTabs";
import SearchableSelect from "../../components/common/SearchableSelect";
import {
  bulkConfirmDelivery,
  deleteDeliveryConfirmation,
  fetchCompletedDeliveryList,
  fetchPendingDeliveryList,
  type DeliveryConfirmationRow,
} from "../../api/deliveryConfirmationApi";
import { fetchUserList } from "../../api/userApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { getPaginationItems } from "../../utils/pagination";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";

type TabKey = "pending" | "completed";
type PageView = "list" | "pendingList";
const PAGE_LENGTH_OPTIONS = [10, 25, 50, 100, -1] as const;
const PAGE_LENGTH_SELECT_OPTIONS = PAGE_LENGTH_OPTIONS.map((n) => ({
  value: String(n),
  label: n === -1 ? "All" : String(n),
}));
const DATE_TYPE_OPTIONS = [
  { value: "40", label: "PO Date" },
  { value: "50", label: "Invoice Date" },
  { value: "60", label: "Delivery Date" },
];
const FOLLOWED_BY_USER_TYPE_UID = "65efd97b4df4040205";

function ExportBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[#d7bf73] bg-white/92 px-4 py-2 text-[13px] font-semibold text-[#6b6a1f] shadow-[0_8px_18px_rgba(180,153,73,0.08)] transition-all hover:-translate-y-[1px] hover:bg-[#fff7dd]"
    >
      {label}
    </button>
  );
}

function AttachmentCell({ has, url }: { has: boolean; url?: string }) {
  if (!has) {
    return (
      <div className="w-10 h-8 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
        <div className="w-6 h-6 opacity-20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 7h10M7 11h10M7 15h6" />
          </svg>
        </div>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded border border-red-200 bg-red-50 text-red-500">
        <i className="fa fa-file-pdf text-[13px]" />
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-center w-8 h-8 rounded border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
      aria-label="Open attachment"
      title="Open attachment"
    >
      <i className="fa fa-file-pdf text-[13px]" />
    </a>
  );
}

function exportCSV(rows: DeliveryConfirmationRow[]) {
  const lines = [
    ["S.No", "PO No", "PO Date", "Location", "Followed By", "Invoice", "Invoice Date", "DC", "DC Date", "Delivery Mode", "Delivery Date", "Status"],
    ...rows.map((r, idx) => [
      String(idx + 1),
      r.poNo,
      r.poDate,
      r.location.replace(/\n/g, " "),
      r.followedBy,
      r.invoice,
      r.invoiceDate,
      r.dc,
      r.dcDate,
      r.deliveryMode.replace(/\n/g, " "),
      r.deliveryDate,
      r.status,
    ]),
  ];
  const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  link.download = "delivery-confirmation.csv";
  link.click();
}

function printRows(rows: DeliveryConfirmationRow[]) {
  const html = `
    <html>
      <head>
        <title>Delivery Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; vertical-align: top; }
          th { background: #f3f4ec; }
        </style>
      </head>
      <body>
        <h3>Delivery Confirmation</h3>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>PO No</th>
              <th>Location</th>
              <th>Followed By</th>
              <th>Invoice</th>
              <th>DC</th>
              <th>Delivery Mode</th>
              <th>Delivery Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows
      .map(
        (r, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${r.poNo}<br/>${r.poDate}</td>
                    <td>${r.location.replace(/\n/g, "<br/>")}</td>
                    <td>${r.followedBy || "-"}</td>
                    <td>${r.invoice}<br/>${r.invoiceDate}</td>
                    <td>${r.dc}<br/>${r.dcDate}</td>
                    <td>${r.deliveryMode.replace(/\n/g, "<br/>")}</td>
                    <td>${r.deliveryDate}</td>
                    <td>${r.status}</td>
                  </tr>
                `
      )
      .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

export default function DeliveryConfirmationList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateType, setDateType] = useState("40");
  const [teamMember, setTeamMember] = useState("All");
  const [colDropOpen, setColDropOpen] = useState(false);
  const [pendingRows, setPendingRows] = useState<DeliveryConfirmationRow[]>([]);
  const [completedRows, setCompletedRows] = useState<DeliveryConfirmationRow[]>([]);
  const [teamMemberOptions, setTeamMemberOptions] = useState<Array<{ value: string; label: string; keywords?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState<PageView>("list");
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());
  const [personName, setPersonName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [productReceivedDate, setProductReceivedDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const ALL_COLS = ["S.No", "Po No", "Location", "Followed By", "Invoice", "DC", "Delivery Mode", "Delivery Date", "Attachment", "Status", "Action"];
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(ALL_COLS));
  const col = (name: string) => visibleCols.has(name);
  const toggleCol = (name: string) => setVisibleCols((prev) => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  useEffect(() => {
    let active = true;

    const loadTeamMembers = async () => {
      try {
        const res = await fetchUserList({
          start: 0,
          length: -1,
          user_type_unique_id: FOLLOWED_BY_USER_TYPE_UID,
        });
        if (!active) return;
        const options = (res.data || [])
          .filter((row) => row.staff_id && row.staff_name)
          .map((row) => ({
            value: row.staff_id,
            label: row.staff_name,
            keywords: `${row.staff_id} ${row.staff_name}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setTeamMemberOptions(options);
      } catch {
        if (active) setTeamMemberOptions([]);
      }
    };

    void loadTeamMembers();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem("otm_user") || "{}");
        const params = {
          draw: 1,
          start: 0,
          length: -1,
          search: "",
          from_date: fromDate,
          to_date: toDate,
          opt3: dateType,
          team_mem3: teamMember === "All" ? "" : teamMember,
          user_type_unique_id: user?.user_type_unique_id || "",
        };

        if (activeTab === "pending") {
          const pendingRes = await fetchPendingDeliveryList(params);
          if (!active) return;
          setPendingRows(pendingRes.data ?? []);
        } else {
          const completedRes = await fetchCompletedDeliveryList(params);
          if (!active) return;
          setCompletedRows(completedRes.data ?? []);
        }

      } catch (error) {
        if (!active) return;
        if (activeTab === "pending") {
          setPendingRows([]);
        } else {
          setCompletedRows([]);
        }
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load delivery confirmation records.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activeTab, fromDate, toDate, dateType, teamMember, refreshKey]);

  const source = activeTab === "pending" ? pendingRows : completedRows;
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return source;
    return source.filter((r) =>
      [r.poNo, r.location, r.followedBy, r.invoice, r.dc, r.deliveryMode, r.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [source, search]);

  const filteredPendingApproval = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return pendingRows;
    return pendingRows.filter((r) =>
      [r.poNo, r.location, r.followedBy, r.invoice, r.dc, r.deliveryMode, r.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [pendingRows, search]);

  const pageSize = length === -1 ? Math.max(filtered.length, 1) : length;
  const pendingPageSize = length === -1 ? Math.max(filteredPendingApproval.length, 1) : length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = length === -1 ? filtered : filtered.slice((curPage - 1) * length, curPage * length);
  const pendingApprovalTotalPages = Math.max(1, Math.ceil(filteredPendingApproval.length / pendingPageSize));
  const pagedPendingApproval = length === -1 ? filteredPendingApproval : filteredPendingApproval.slice((curPage - 1) * length, curPage * length);
  const pageNums = getPaginationItems(curPage, totalPages);
  const pendingPageNums = getPaginationItems(curPage, pendingApprovalTotalPages);
  const allPendingVisibleSelected =
    pagedPendingApproval.length > 0 && pagedPendingApproval.every((row) => selectedPendingIds.has(row.id));

  const handleDelete = async (row: DeliveryConfirmationRow) => {
    const confirmed = await showConfirmAlert(`Delete delivery confirmation for ${row.dc || row.invoice || "this record"}?`);
    if (!confirmed) return;
    try {
      const res = await deleteDeliveryConfirmation(row.id);
      if (!res?.status) throw new Error(res?.error || "Failed to delete delivery confirmation.");
      await showSuccessAlert("Delivery confirmation moved back to dispatch delivery.");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to delete delivery confirmation.");
    }
  };

  useEffect(() => {
    setCurPage(1);
  }, [activeTab, search, length, filtered.length]);

  useEffect(() => {
    if (currentPage !== "pendingList") return;
    setSelectedPendingIds(new Set());
  }, [currentPage, pendingRows, fromDate, toDate, dateType, teamMember]);

  const handleBulkApprove = async () => {
    const selectedRows = filteredPendingApproval.filter((row) => selectedPendingIds.has(row.id));
    if (selectedRows.length === 0) {
      await showErrorAlert("Please select at least one record to approve.");
      return;
    }
    if (!contactNo.trim()) {
      await showErrorAlert("Please enter contact number.");
      return;
    }
    if (!productReceivedDate) {
      await showErrorAlert("Please select product received date.");
      return;
    }

    setSubmittingBulk(true);
    try {
      const res = await bulkConfirmDelivery({
        records: selectedRows.map((row) => ({ id: row.id })),
        personName,
        contactNo,
        productReceivedDate,
        remarks,
      });
      if (!res.status) {
        throw new Error(typeof res.error === "string" ? res.error : "Failed to approve selected records.");
      }
      await showSuccessAlert(res.msg || "Approved successfully.");
      setSelectedPendingIds(new Set());
      setPersonName("");
      setContactNo("");
      setProductReceivedDate("");
      setRemarks("");
      setCurrentPage("list");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to approve selected records.");
    } finally {
      setSubmittingBulk(false);
    }
  };

  if (currentPage === "pendingList") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
        <PageTopbar
          title="Delivery Confirmation List"
          breadcrumbs={["Operation", "Delivery Confirmation", "Pending List"]}
        />
        <div className="overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
          <div className="border-b border-line px-6 py-4 bg-surface-2">
            <h2 className="text-[15px] font-bold tracking-widest text-ink uppercase text-center">Pending List</h2>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-4 mb-5 flex-wrap">
              <div>
                <span className="block text-[12px] font-semibold text-ink-secondary mb-1">From Date</span>
                <input name="fromdate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 w-44"
                />
              </div>
              <div>
                <span className="block text-[12px] font-semibold text-ink-secondary mb-1">To Date</span>
                <input name="todate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 w-44"
                />
              </div>
              <div>
                <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Select Date Type</span>
                <SearchableSelect
                  value={dateType}
                  onChange={setDateType}
                  options={DATE_TYPE_OPTIONS}
                  className="w-44"
                />
              </div>
              <div>
                <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Team Members</span>
                <SearchableSelect
                  value={teamMember}
                  onChange={setTeamMember}
                  options={[
                    { value: "All", label: "All" },
                    ...teamMemberOptions,
                  ]}
                  className="w-44"
                />
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((prev) => prev + 1)}
                className="px-6 py-2 bg-brand-700 hover:bg-brand-800 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer transition-colors self-end"
              >
                Go
              </button>
            </div>

            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                  Show
                  <SearchableSelect
                    value={String(length)}
                    onChange={(value) => setLength(Number(value))}
                    options={PAGE_LENGTH_SELECT_OPTIONS}
                    className="w-[88px]"
                    buttonClassName="px-2 py-1"
                  />
                  entries
                </div>
                <ExportBtn label="Copy" onClick={() => navigator.clipboard.writeText(JSON.stringify(filteredPendingApproval, null, 2))} />
                <ExportBtn label="CSV" onClick={() => exportCSV(filteredPendingApproval)} />
                <ExportBtn label="Excel" onClick={() => exportCSV(filteredPendingApproval)} />
                <ExportBtn label="PDF" onClick={() => printRows(filteredPendingApproval)} />
                <ExportBtn label="Print" onClick={() => printRows(filteredPendingApproval)} />
              </div>
              <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                Search:
                <input name="search"
                  value={search}
                  placeholder="Search..."
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-2.5 py-1 text-[13px] border border-line-dark rounded outline-none w-48 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div className="otm-table-shell overflow-x-auto">
              <table className="otm-table w-full text-[13px] border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-surface-2">
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap min-w-[100px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>Selection</span>
                        <label className="flex items-center gap-1 cursor-pointer font-normal text-ink-secondary text-[11px]">
                          (Select All)
                          <input name="allpendingvisibleselected"
                            type="checkbox"
                            checked={allPendingVisibleSelected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedPendingIds((prev) => {
                                const next = new Set(prev);
                                pagedPendingApproval.forEach((row) => {
                                  if (checked) next.add(row.id);
                                  else next.delete(row.id);
                                });
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 accent-brand-600 cursor-pointer"
                          />
                        </label>
                      </div>
                    </th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">S.No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Po No</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Location</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Followed By</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Invoice</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">DC</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Delivery Mode</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Delivery Date</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Attachment</th>
                    <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-ink-muted border border-line italic">
                        Loading...
                      </td>
                    </tr>
                  ) : pagedPendingApproval.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-ink-muted border border-line italic">
                        No pending records found
                      </td>
                    </tr>
                  ) : (
                    pagedPendingApproval.map((r, i) => (
                      <tr key={r.id} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                        <td className="px-3 py-2.5 text-center border-x border-line/50">
                          <input name="deliveryconfirmationlist_input_500"
                            type="checkbox"
                            checked={selectedPendingIds.has(r.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedPendingIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(r.id);
                                else next.delete(r.id);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 accent-brand-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50 text-ink-muted">{length === -1 ? i + 1 : (curPage - 1) * length + i + 1}</td>
                        <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                          <div className="font-semibold text-ink text-[13px]">{r.poNo}</div>
                          <div className="text-[11px] text-ink-muted">{r.poDate}</div>
                        </td>
                        <td className="px-3 py-2.5 border-x border-line/50 max-w-[260px]">
                          {r.location.split("\n").map((line, li) => (
                            <p key={`${r.id}-loc-${li}`} className={li === 0 ? "font-semibold text-ink text-[13px]" : "text-[12px] text-ink-secondary leading-relaxed"}>
                              {line}
                            </p>
                          ))}
                        </td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{r.followedBy}</td>
                        <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                          <div className="font-semibold text-ink">{r.invoice}</div>
                          <div className="text-[11px] text-ink-muted">{r.invoiceDate}</div>
                        </td>
                        <td className="px-3 py-2.5 border-x border-line/50 whitespace-nowrap">
                          <div className="font-semibold text-ink">{r.dc}</div>
                          <div className="text-[11px] text-ink-muted">{r.dcDate}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">
                          {r.deliveryMode.split("\n").map((line, li) => (
                            <div key={`${r.id}-mode-${li}`} className={li === 0 ? "font-semibold text-ink" : "text-[11px] text-ink-muted"}>{line}</div>
                          ))}
                        </td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">{r.deliveryDate}</td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50">
                          <div className="flex justify-center">
                            <AttachmentCell has={r.hasAttachment} url={r.attachmentUrl} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center border-x border-line/50 whitespace-nowrap">
                          <span className={r.status === "Completed" ? "text-success font-semibold" : r.status === "Not Delivered" ? "text-danger font-semibold" : "text-warning font-semibold"}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
              <span>
                Showing {filteredPendingApproval.length === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * pendingPageSize + 1} to {length === -1 ? filteredPendingApproval.length : Math.min(curPage * pendingPageSize, filteredPendingApproval.length)} of {filteredPendingApproval.length} entries
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
                  items={pendingPageNums}
                  currentPage={curPage}
                  onPageChange={setCurPage}
                  getButtonClassName={(page) => `w-[30px] h-[30px] text-[13px] border rounded cursor-pointer ${
                    page === curPage ? "bg-brand-500 text-white border-brand-500" : "bg-white border-line hover:border-brand-500 hover:text-brand-500"
                  }`}
                />
                <button
                  type="button"
                  disabled={length === -1 || curPage >= pendingApprovalTotalPages}
                  onClick={() => setCurPage((p) => p + 1)}
                  className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-[24px] border border-[#e8e1c7] bg-[#fcfcf8] p-5">
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-[15px] font-bold tracking-wide text-[#31411b] uppercase">
                  Contact Person Details
                </h3>
                <p className="text-[12px] text-ink-muted">
                  Selected Records: <span className="font-semibold text-ink">{selectedPendingIds.size}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <span className="mb-2 block text-[13px] font-semibold text-ink">Person Name</span>
                  <input name="personname"
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full rounded-lg border border-line-dark bg-white px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                    placeholder="Enter person name"
                  />
                </div>

                <div>
                  <span className="mb-2 block text-[13px] font-semibold text-ink">Contact No</span>
                  <input name="contactno"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full rounded-lg border border-line-dark bg-white px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                    placeholder="Enter contact number"
                  />
                </div>

                <div>
                  <span className="mb-2 block text-[13px] font-semibold text-ink">Product Received Date</span>
                  <input name="productreceiveddate"
                    type="date"
                    value={productReceivedDate}
                    onChange={(e) => setProductReceivedDate(e.target.value)}
                    className="w-full rounded-lg border border-line-dark bg-white px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                  />
                </div>

                <div>
                  <span className="mb-2 block text-[13px] font-semibold text-ink">Remarks</span>
                  <textarea name="remarks"
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full rounded-lg border border-line-dark bg-white px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 resize-none"
                    placeholder="Enter remarks"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-line bg-surface-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setCurrentPage("list");
                setSelectedPendingIds(new Set());
                setPersonName("");
                setContactNo("");
                setProductReceivedDate("");
                setRemarks("");
              }}
              className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-white border border-red-300 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleBulkApprove()}
              disabled={submittingBulk}
              className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-brand-700 hover:bg-brand-800 text-white transition-colors cursor-pointer border-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingBulk ? "Approving..." : "Approve"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
      <PageTopbar
        title="Delivery Confirmation List"
        breadcrumbs={["Operation", "Delivery Confirmation"]}
      />

      <div className="overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <PageTabs
          items={[
            { value: "pending", label: "Pending" },
            { value: "completed", label: "Completed" },
          ]}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setCurPage(1);
            setSearch("");
          }}
        />

        <div className="p-5">
          <div className="flex items-end gap-4 mb-5 flex-wrap">
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">From Date</span>
              <input name="fromdate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 w-44"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">To Date</span>
              <input name="todate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 w-44"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Select Date Type</span>
              <SearchableSelect
                value={dateType}
                onChange={setDateType}
                options={DATE_TYPE_OPTIONS}
                className="w-44"
              />
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-ink-secondary mb-1">Team Members</span>
              <SearchableSelect
                value={teamMember}
                onChange={setTeamMember}
                options={[
                  { value: "All", label: "All" },
                  ...teamMemberOptions,
                ]}
                className="w-44"
              />
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((prev) => prev + 1)}
              className="otm-btn-primary-sm self-end"
            >
              Go
            </button>

            {activeTab === "pending" && (
              <div className="ml-auto self-end">
                <button
                  type="button"
                  onClick={() => setCurrentPage("pendingList")}
                  className="otm-btn-primary-sm"
                >
                  OverAll Approval
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                Show
                <SearchableSelect
                  value={String(length)}
                  onChange={(value) => setLength(Number(value))}
                  options={PAGE_LENGTH_SELECT_OPTIONS}
                  className="w-[88px]"
                  buttonClassName="px-2 py-1"
                />
                entries
              </div>
              <ExportBtn label="Copy" onClick={() => navigator.clipboard.writeText(JSON.stringify(filtered, null, 2))} />
              <ExportBtn label="CSV" onClick={() => exportCSV(filtered)} />
              <ExportBtn label="Excel" onClick={() => exportCSV(filtered)} />
              <ExportBtn label="PDF" onClick={() => printRows(filtered)} />
              <ExportBtn label="Print" onClick={() => printRows(filtered)} />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColDropOpen((v) => !v)}
                  className="otm-btn-secondary py-1.5"
                >
                  Column Visibility <i className="fa fa-chevron-down text-[10px]" />
                </button>
                {colDropOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-line rounded-lg shadow-lg z-50 p-3 min-w-[180px]">
                    {ALL_COLS.map((name) => (
                      <label key={name} className="flex items-center gap-2 py-1 text-[13px] text-ink cursor-pointer hover:text-brand-600 select-none">
                        <input name="deliveryconfirmationlist_input_792" type="checkbox" checked={visibleCols.has(name)} onChange={() => toggleCol(name)} className="accent-brand-600 w-3.5 h-3.5" />
                        {name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              Search:
              <input name="search"
                value={search}
                placeholder="Search..."
                onChange={(e) => setSearch(e.target.value)}
                className="px-2.5 py-1 text-[13px] border border-line-dark rounded outline-none w-48 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="otm-table-shell overflow-x-auto" onClick={() => colDropOpen && setColDropOpen(false)}>
            <table className="otm-table w-full text-[13px] border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-2">
                  {col("S.No") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">S.No</th>}
                  {col("Po No") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Po No</th>}
                  {col("Location") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Location</th>}
                  {col("Followed By") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Followed By</th>}
                  {col("Invoice") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Invoice</th>}
                  {col("DC") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">DC</th>}
                  {col("Delivery Mode") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Delivery Mode</th>}
                  {col("Delivery Date") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Delivery Date</th>}
                  {col("Attachment") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Attachment</th>}
                  {col("Status") && activeTab === "pending" && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Status</th>}
                  {col("Action") && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Action</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={ALL_COLS.length} className="text-center py-10 text-ink-muted border border-line italic">
                      Loading...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={ALL_COLS.length} className="text-center py-10 text-ink-muted border border-line italic">
                      No data available in table
                    </td>
                  </tr>
                ) : paged.map((r, i) => (
                  <tr key={r.id} className="hover:bg-brand-50/40 transition-colors border-b border-line/50">
                    {col("S.No") && <td className="px-3 py-3 text-center border-x border-line/50 text-ink-muted">{length === -1 ? i + 1 : (curPage - 1) * length + i + 1}</td>}
                    {col("Po No") && (
                      <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap">
                        <div className="font-semibold text-ink text-[13px]">{r.poNo}</div>
                        <div className="text-[11px] text-ink-muted">{r.poDate}</div>
                      </td>
                    )}
                    {col("Location") && (
                      <td className="px-3 py-3 border-x border-line/50 max-w-[260px]">
                        {r.location.split("\n").map((line, li) => (
                          <p key={`${r.id}-location-${li}`} className={li === 0 ? "font-semibold text-ink text-[13px]" : "text-[12px] text-ink-secondary leading-relaxed"}>
                            {line}
                          </p>
                        ))}
                      </td>
                    )}
                    {col("Followed By") && <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap">{r.followedBy}</td>}
                    {col("Invoice") && (
                      <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap">
                        <div className="font-semibold text-ink">{r.invoice}</div>
                        <div className="text-[11px] text-ink-muted">{r.invoiceDate}</div>
                      </td>
                    )}
                    {col("DC") && (
                      <td className="px-3 py-3 border-x border-line/50 whitespace-nowrap">
                        <div className="font-semibold text-ink">{r.dc}</div>
                        <div className="text-[11px] text-ink-muted">{r.dcDate}</div>
                      </td>
                    )}
                    {col("Delivery Mode") && (
                      <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap">
                        {r.deliveryMode.split("\n").map((line, li) => (
                          <div key={`${r.id}-mode-${li}`} className={li === 0 ? "font-semibold text-ink" : "text-[11px] text-ink-muted"}>{line}</div>
                        ))}
                      </td>
                    )}
                    {col("Delivery Date") && <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap">{r.deliveryDate}</td>}
                    {col("Attachment") && (
                      <td className="px-3 py-3 text-center border-x border-line/50">
                        <div className="flex justify-center">
                          <AttachmentCell has={r.hasAttachment} url={r.attachmentUrl} />
                        </div>
                      </td>
                    )}
                    {col("Status") && activeTab === "pending" && (
                      <td className="px-3 py-3 text-center border-x border-line/50 whitespace-nowrap">
                        <span className={r.status === "Completed" ? "text-success font-semibold" : r.status === "Not Delivered" ? "text-danger font-semibold" : "text-warning font-semibold"}>
                          {r.status}
                        </span>
                      </td>
                    )}
                    {col("Action") && (
                      <td className="px-3 py-3 text-center border-x border-line/50">
                        <div className="flex items-center justify-center gap-1.5">
                          {activeTab === "completed" ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/operation/delivery/form?id=${encodeURIComponent(r.id)}&mode=view`)}
                              title="View"
                              className="w-7 h-7 flex items-center justify-center rounded bg-green-50 text-green-600 border border-green-200 text-[13px] hover:bg-green-600 hover:text-white transition-colors cursor-pointer"
                            >
                              <i className="fa fa-eye" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/operation/delivery/form?id=${encodeURIComponent(r.id)}`)}
                              title="Edit"
                              className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                            >
                              <i className="fa fa-pen-to-square" />
                            </button>
                          )}
                          {activeTab === "pending" && r.canDelete !== false ? (
                            <button
                              type="button"
                              onClick={() => void handleDelete(r)}
                              title="Delete"
                              className="w-7 h-7 flex items-center justify-center rounded bg-danger/10 text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
                            >
                              <i className="fa fa-trash" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>
              Showing {filtered.length === 0 ? 0 : length === -1 ? 1 : (curPage - 1) * pageSize + 1} to {length === -1 ? filtered.length : Math.min(curPage * pageSize, filtered.length)} of {filtered.length} entries
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
