import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PageTopbar from "../../components/common/PageTopbar";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import PaginationPageButtons from "../../components/common/PaginationPageButtons";
import { deleteTenantCompany, fetchTenantCompanies, fetchTenantCompanyDetail, type TenantAdminUser, type TenantCompany } from "../../api/tenantApi";
import { useAuth } from "../../context/AuthContext";
import { isProductOwnerUser } from "../../utils/authAccess";
import { getPaginationItems } from "../../utils/pagination";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";

export default function TenantCreationList() {
  const navigate = useNavigate();
  const { user, isAuthReady } = useAuth();
  const [rows, setRows] = useState<TenantCompany[]>([]);
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [curPage, setCurPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<TenantCompany | null>(null);
  const [viewAdmin, setViewAdmin] = useState<TenantAdminUser | null>(null);
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchTenantCompanies());
    } catch {
      setError("Failed to load tenant companies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isProductOwnerUser(user)) void loadData();
  }, [loadData, user]);

  useEffect(() => {
    setCurPage(1);
  }, [search, length]);

  const handleDelete = async (row: TenantCompany) => {
    const result = await Swal.fire<{
      owner_password: string;
      confirm_company_code: string;
    }>({
      icon: "warning",
      title: "Delete Tenant?",
      html: `
        <div style="text-align:left;font-size:13px;color:#4b5537">
          <p style="margin:0 0 12px">This will remove <b>${row.company_name}</b> from active tenants and disable its tenant users.</p>
          <label style="display:block;margin-bottom:6px;font-weight:700">Owner Password</label>
          <input id="tenant-owner-password" type="password" class="swal2-input" style="margin:0 0 12px;width:100%" autocomplete="current-password" />
          <label style="display:block;margin-bottom:6px;font-weight:700">Type Company Code: ${row.company_code}</label>
          <input id="tenant-confirm-code" class="swal2-input" style="margin:0;width:100%;text-transform:uppercase" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Delete Tenant",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      background: "#fffdf7",
      backdrop: "rgba(62, 61, 53, 0.45)",
      customClass: {
        popup: "otm-swal-popup",
        icon: "otm-swal-icon otm-swal-icon-danger",
        title: "otm-swal-title otm-swal-title-danger",
        confirmButton: "otm-swal-confirm otm-swal-confirm-danger",
        cancelButton: "otm-swal-cancel",
      },
      preConfirm: () => {
        const ownerPassword = (document.getElementById("tenant-owner-password") as HTMLInputElement | null)?.value || "";
        const confirmCode = (document.getElementById("tenant-confirm-code") as HTMLInputElement | null)?.value || "";
        if (!ownerPassword.trim()) {
          Swal.showValidationMessage("Owner password is required.");
          return false;
        }
        if (confirmCode.trim().toUpperCase() !== row.company_code.toUpperCase()) {
          Swal.showValidationMessage("Company code does not match.");
          return false;
        }
        return {
          owner_password: ownerPassword,
          confirm_company_code: confirmCode.trim().toUpperCase(),
        };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      await deleteTenantCompany(row.unique_id, result.value);
      await showSuccessAlert("Tenant deleted successfully.");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete tenant.";
      await showErrorAlert(message);
    }
  };

  const handleView = async (row: TenantCompany) => {
    setViewLoadingId(row.unique_id);
    setError(null);
    try {
      const detail = await fetchTenantCompanyDetail(row.unique_id);
      setViewRow(detail.company);
      setViewAdmin(detail.admin_user ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tenant details.";
      setError(message);
      setViewRow(row);
      setViewAdmin(null);
    } finally {
      setViewLoadingId(null);
    }
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [
        row.company_code,
        row.company_name,
        row.legal_name,
        row.contact_name,
        row.contact_email,
        row.contact_no,
        row.subscription_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [rows, search]);

  if (!isAuthReady) return null;
  if (!isProductOwnerUser(user)) return <Navigate to="/dashboard" replace />;

  const total = filteredRows.length;
  const totalPages = length === -1 ? 1 : Math.max(1, Math.ceil(total / length));
  const startIndex = length === -1 ? 0 : (curPage - 1) * length;
  const pageRows = length === -1 ? filteredRows : filteredRows.slice(startIndex, startIndex + length);
  const pageNums = getPaginationItems(curPage, totalPages);
  const startEntry = total === 0 ? 0 : startIndex + 1;
  const endEntry = length === -1 ? pageRows.length : Math.min(startIndex + length, total);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.22),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title="Tenant Creation List"
        breadcrumbs={["Admin", "Tenant Creation"]}
        addLink="/admin/tenant-creation/form"
        addLabel="Create Tenant"
      />

      <section className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="p-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          ) : null}

          <div className="mb-5 flex items-center justify-between gap-4 flex-wrap rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-4 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              Show
              <SearchableSelectInput
                name="length"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="h-10 min-w-[86px] rounded-2xl border border-[#d7c79c] bg-white px-3 text-[13px] outline-none shadow-sm"
              >
                {[10, 25, 50, 100, -1].map((n) => (
                  <option key={n} value={n}>{n === -1 ? "All" : n}</option>
                ))}
              </SearchableSelectInput>
              entries
            </div>

            <label className="flex h-11 min-w-[300px] items-center gap-3 rounded-2xl border border-[#d9ddcf] bg-white px-4 shadow-sm">
              <i className="fa fa-magnifying-glass text-[12px] text-[#6d7750]" />
              <input
                name="search"
                value={search}
                placeholder="Search company, code, contact..."
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-[#9aa287]"
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                  {["#", "Company Code", "Company Name", "Contact", "Plan", "Status", "Database", "Action"].map((h) => (
                    <th key={h} className="border-b border-[#d8dec8] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-10 text-center text-ink-muted">Loading...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-ink-muted">No tenants found</td></tr>
                ) : pageRows.map((row, index) => (
                  <tr key={row.unique_id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                    <td className="px-4 py-4 text-[#7a7f69]">{startEntry + index}</td>
                    <td className="px-4 py-4 font-bold text-[#243018]">{row.company_code}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#243018]">{row.company_name}</div>
                      <div className="mt-1 text-[12px] text-[#7a8267]">{row.legal_name || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-[#243018]">
                      <div>{row.contact_name || "-"}</div>
                      <div className="mt-1 text-[12px] text-[#7a8267]">{row.contact_email || row.contact_no || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-[#243018]">{row.subscription_plan || "standard"}</td>
                    <td className="px-4 py-4">
                      <span className={row.is_active === 1 ? "status-active" : "status-inactive"}>
                        {row.subscription_status || (row.is_active === 1 ? "Active" : "Inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#243018]">{row.db_name || "-"}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { void handleView(row); }}
                          disabled={viewLoadingId === row.unique_id}
                          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#cdddb0] bg-[#f4faeb] text-[#56751f] transition-colors hover:bg-[#56751f] hover:text-white"
                          title="View tenant details"
                        >
                          <i className={`fa ${viewLoadingId === row.unique_id ? "fa-spinner fa-spin" : "fa-eye"}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/tenant-creation/form?id=${encodeURIComponent(row.unique_id)}`)}
                          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-200 bg-info-light text-info transition-colors hover:bg-info hover:text-white"
                          title="Edit tenant"
                        >
                          <i className="fa fa-pen-to-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { void handleDelete(row); }}
                          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-red-200 bg-danger-light text-danger transition-colors hover:bg-danger hover:text-white"
                          title="Delete tenant"
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

          <div className="mt-4 flex items-center justify-between gap-2 flex-wrap text-[13px] text-ink-secondary">
            <span>Showing {startEntry} to {endEntry} of {total} entries</span>
            <div className="flex gap-1">
              <button disabled={length === -1 || curPage === 1} onClick={() => setCurPage((p) => p - 1)} className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
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
              <button disabled={length === -1 || curPage >= totalPages} onClick={() => setCurPage((p) => p + 1)} className="h-[36px] rounded-2xl border border-[#d8dec8] bg-white px-4 text-[13px] hover:border-[#7b8f43] hover:text-[#5f7427] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => navigate("/admin/tenant-creation/form")}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-white px-4 py-2 text-[13px] font-semibold text-[#4f7a2b] transition-colors hover:bg-[#f1f7e6]"
        >
          <i className="fa fa-building" />
          Create another tenant
        </button>
      </div>

      {viewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2b14]/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#dfe8c9] bg-white shadow-[0_30px_80px_rgba(31,43,20,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#e6ecd8] bg-[linear-gradient(135deg,#fbfdf6_0%,#eef5e4_100%)] px-6 py-5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6a7a44]">Tenant Details</div>
                <h2 className="mt-1 text-[22px] font-bold text-[#243018]">{viewRow.company_name || "-"}</h2>
                <div className="mt-1 text-[13px] text-[#6c7657]">{viewRow.company_code || "-"}</div>
              </div>
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d7dec8] bg-white text-[#5d6748] transition-colors hover:border-[#9aac72] hover:bg-[#f1f7e6]"
                title="Close"
              >
                <i className="fa fa-xmark" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-94px)] overflow-y-auto p-6">
              <DetailSection title="Company Profile">
                <DetailItem label="Unique ID" value={viewRow.unique_id} />
                <DetailItem label="Company Code" value={viewRow.company_code} />
                <DetailItem label="Company Name" value={viewRow.company_name} />
                <DetailItem label="Legal Name" value={viewRow.legal_name} />
                <DetailItem label="Address" value={viewRow.address} wide />
              </DetailSection>

              <DetailSection title="Contact & Tax">
                <DetailItem label="Contact Name" value={viewRow.contact_name} />
                <DetailItem label="Contact Email" value={viewRow.contact_email} />
                <DetailItem label="Contact No." value={viewRow.contact_no} />
                <DetailItem label="GST No." value={viewRow.gst_no} />
                <DetailItem label="PAN No." value={viewRow.pan_no} />
              </DetailSection>

              <DetailSection title="Subscription & Database">
                <DetailItem label="Plan" value={viewRow.subscription_plan || "standard"} />
                <DetailItem label="Status" value={viewRow.subscription_status || (viewRow.is_active === 1 ? "Active" : "Inactive")} />
                <DetailItem label="Active" value={viewRow.is_active === 1 ? "Yes" : "No"} />
                <DetailItem label="Database Name" value={viewRow.db_name} />
                <DetailItem label="Database Host" value={viewRow.db_host} />
                <DetailItem label="Database Port" value={viewRow.db_port} />
                <DetailItem label="Database User" value={viewRow.db_user} />
              </DetailSection>

              <DetailSection title="Admin User">
                <DetailItem label="Name" value={viewAdmin?.name} />
                <DetailItem label="Staff ID" value={viewAdmin?.staff_id} />
                <DetailItem label="User Name" value={viewAdmin?.username} />
                <DetailItem label="Password" value={viewAdmin?.password} />
                <DetailItem label="Email" value={viewAdmin?.email} />
                <DetailItem label="Mobile" value={viewAdmin?.mobile} />
              </DetailSection>

              <DetailSection title="System">
                <DetailItem label="Delete Status" value={viewRow.is_delete === 1 ? "Deleted" : "Not deleted"} />
                <DetailItem label="Created" value={formatDateTime(viewRow.created)} />
                <DetailItem label="Updated" value={formatDateTime(viewRow.updated)} />
              </DetailSection>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setViewRow(null)}
                  className="rounded-2xl border border-[#d7dec8] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#5d6748] transition-colors hover:bg-[#f1f7e6]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/tenant-creation/form?id=${encodeURIComponent(viewRow.unique_id)}`)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-[#4f7a2b] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#426926]"
                >
                  <i className="fa fa-pen-to-square" />
                  Edit Tenant
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-[22px] border border-[#e4ead7] bg-[#fffefb] p-5">
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[0.13em] text-[#5c6643]">{title}</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function DetailItem({ label, value, wide = false }: { label: string; value?: string | number | null; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a9278]">{label}</div>
      <div className="mt-1 min-h-[34px] rounded-2xl border border-[#e7eadc] bg-white px-3 py-2 text-[13px] font-medium text-[#243018]">
        {value === null || value === undefined || value === "" ? "-" : value}
      </div>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
