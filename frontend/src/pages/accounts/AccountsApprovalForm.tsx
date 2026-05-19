import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchAccountsApprovalDetail,
  submitAccountsApprovalDecision,
  type AccountsApprovalDetailRow,
  type AccountsApprovalItem,
} from "../../api/accountsApprovalApi";
import { useAuth } from "../../context/AuthContext";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type Decision = "" | "1";

type FormState = {
  ac_team_verifiy_status: Decision;
  ac_reason_reject: string;
};

const INIT_FORM: FormState = {
  ac_team_verifiy_status: "",
  ac_reason_reject: "",
};

function formatDate(value?: string) {
  if (!value) return "--";
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatValue(item: AccountsApprovalItem) {
  return Number(item.invoiceValue || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-[#5b641d] tracking-widest uppercase mb-3">
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2 mb-1.5 text-[12px]">
      <span className="text-ink-secondary w-32 shrink-0">{label}</span>
      <span className="text-ink-secondary mr-1">:</span>
      <span className="text-ink font-medium">{value || "--"}</span>
    </div>
  );
}

function FileStatus({ label, available }: { label: string; available: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line-dark bg-surface-2 px-3.5 py-2.5 text-[13px]">
      <span className="font-medium text-ink">{label}</span>
      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${available ? "border-green-200 bg-green-50 text-green-600" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
        {available ? "Available" : "Missing"}
      </span>
    </div>
  );
}

export default function AccountsApprovalForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const uniqueId = id || "";

  const [detail, setDetail] = useState<AccountsApprovalDetailRow | null>(null);
  const [form, setForm] = useState<FormState>(INIT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const approvedBy = user?.unique_id || user?.id || user?.username || "";
  const isApproved = detail?.ac_verify_status === "Approved";

  useEffect(() => {
    if (!uniqueId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetchAccountsApprovalDetail(uniqueId)
      .then((res) => {
        if (!active) return;
        const row = res.data;
        setDetail(row);
        setForm({
          ac_team_verifiy_status: String(row.ac_team_verifiy_status) === "1" ? "1" : "",
          ac_reason_reject: row.reject_reason || "",
        });
      })
      .catch(async (error) => {
        if (!active) return;
        setDetail(null);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load accounts approval detail.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [uniqueId]);

  const setField =
    <K extends keyof FormState>(field: K) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!detail?.unique_id) { await showErrorAlert("Accounts approval detail is missing."); return; }
    if (!detail.dc_number) { await showErrorAlert("DC number is missing for this invoice."); return; }
    if (!approvedBy) { await showErrorAlert("Logged in user information is missing."); return; }
    if (form.ac_team_verifiy_status !== "1") {
      await showErrorAlert("Please select approved status.");
      return;
    }

    setSaving(true);
    try {
      await submitAccountsApprovalDecision({
        invoice_unique_id: detail.unique_id,
        dc_number: detail.dc_number,
        ac_team_verifiy_status: form.ac_team_verifiy_status,
        ac_reason_reject: form.ac_reason_reject.trim(),
        approved_by: approvedBy,
      });
      await showSuccessAlert("Accounts approval updated successfully.");
      navigate("/accounts/approval/list");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to save accounts approval.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-[13px] text-ink-muted">Loading...</div>;

  if (!uniqueId || !detail) {
    return (
      <div className="p-6">
        <PageTopbar title="Accounts Approval Form" breadcrumbs={["Accounts", "Accounts Approval", "Form"]} />
        <div className="bg-white border border-line rounded-xl shadow-card p-6 text-[13px] text-red-600">
          {!uniqueId ? "Accounts approval identifier is missing." : "Unable to load accounts approval detail."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-[#f5f6f0]">
      <PageTopbar
        title={isApproved ? "View Accounts Approval" : "Accounts Approval Form"}
        breadcrumbs={["Accounts", "Accounts Approval", isApproved ? "View" : "Edit"]}
      />

      <div className="mt-4 rounded-2xl border border-line bg-white shadow-card overflow-visible">
        <form onSubmit={handleSubmit}>

          {/* ── Top 3-column section ───────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-3">

            {/* Customer Details */}
            <div className="p-7 lg:min-h-[220px]">
              <SectionTitle>Customer Details</SectionTitle>
              <p className="text-[13px] font-bold text-ink mb-1">{detail.department_name || "--"}</p>
              <p className="text-[12px] text-ink-secondary flex items-start gap-1 mb-2">
                <i className="fa fa-location-dot text-[11px] mt-0.5 shrink-0" />
                {detail.customer_address || "--"}
              </p>
              <p className="text-[12px] text-ink-secondary flex items-center gap-1 mb-1">
                <i className="fa fa-phone text-[11px]" />
                {detail.vendor_contact || "--"}
              </p>
              <p className="text-[12px] text-ink-secondary flex items-center gap-1">
                <i className="fa fa-envelope text-[11px]" />
                {detail.vendor_email || "--"}
              </p>
            </div>

            {/* Consignee Details */}
            <div className="p-7 lg:min-h-[220px]">
              <SectionTitle>Consignee Details</SectionTitle>
              <p className="text-[13px] font-bold text-ink mb-1">{detail.consignee_name || "--"}</p>
              <p className="text-[12px] text-ink-secondary flex items-start gap-1 mb-2">
                <i className="fa fa-location-dot text-[11px] mt-0.5 shrink-0" />
                {detail.consignee_address || "--"}
              </p>
              <p className="text-[12px] text-ink-secondary flex items-center gap-1">
                <i className="fa fa-phone text-[11px]" />
                {detail.consignee_contact || "--"}
              </p>
            </div>

            {/* PO & Invoice Details */}
            <div className="p-7 lg:min-h-[220px]">
              <SectionTitle>PO &amp; Invoice Details</SectionTitle>
              <InfoRow label="PO Number"      value={detail.po_num} />
              <InfoRow label="PO Date"        value={formatDate(detail.po_date)} />
              <InfoRow label="Executive Name" value={detail.team_member} />
              <InfoRow label="Invoice No"     value={detail.invoice_no} />
              <InfoRow label="Invoice Date"   value={formatDate(detail.invoice_date)} />
              <InfoRow label="DC Number"      value={detail.dc_number} />
              <InfoRow label="DC Date"        value={formatDate(detail.dc_date)} />
            </div>
          </div>

          {/* ── Items Table ────────────────────────────────────────────── */}
          <div className="border-t border-[#e6dfcb] px-7 pb-7">
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-surface-2">
                    {["S.No", "Item Details", "DC Qty", "Invoice Value", "Serial No"].map(h => (
                      <th key={h} className="border border-line-dark px-3 py-2.5 text-left font-semibold text-ink whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!detail.items || detail.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-line px-3 py-8 text-center text-ink-muted italic">
                        No line items available
                      </td>
                    </tr>
                  ) : (
                    detail.items.map((item, idx) => (
                      <tr key={`${item.id}-${idx}`} className="border-b border-line/50 hover:bg-brand-50/30">
                        <td className="border border-line px-3 py-2 text-center text-ink-muted">{idx + 1}</td>
                        <td className="border border-line px-3 py-2">
                          <div className="font-semibold text-ink text-[12px]">{item.itemName}</div>
                          <div className="text-[11px] text-ink-secondary">{item.itemDesc}</div>
                        </td>
                        <td className="border border-line px-3 py-2 text-center text-ink">{item.dcQty}</td>
                        <td className="border border-line px-3 py-2 text-right font-medium text-ink">{formatValue(item)}</td>
                        <td className="border border-line px-3 py-2 text-center text-ink text-[11px]">{item.serialNo || ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Approval Decision ─────────────────────────────────────── */}
          <div className="border-t border-[#e6dfcb] px-7 py-6">
            <div className="max-w-2xl">
              <div className="rounded-2xl border border-line bg-surface-2/40 p-5">
                <span className="mb-2 block text-[13px] font-bold text-ink">Approval Status</span>
                <SearchableSelectInput name="ac_team_verifiy_status"
                  value={form.ac_team_verifiy_status}
                  onChange={setField("ac_team_verifiy_status")}
                  disabled={isApproved}
                  className="w-full px-3 py-3 text-[13px] border border-line-dark rounded-lg outline-none bg-white
                    focus:border-brand-500 focus:ring-1 focus:ring-[#8a9451]/20 disabled:bg-surface-2 disabled:text-ink-secondary"
                >
                  <option value="">Pending</option>
                  <option value="1">Approved</option>
                </SearchableSelectInput>
              </div>
            </div>
          </div>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="border-t border-[#e6dfcb] px-7 py-5 flex items-center justify-end gap-3">
            {!isApproved && (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-[13px]
                  font-semibold rounded-lg border-0 cursor-pointer transition-colors
                  disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? "Saving..." : "Submit"}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/accounts/approval/list")}
              className="px-6 py-2.5 bg-white border border-line-dark text-ink-secondary text-[13px]
                font-semibold rounded-lg hover:border-brand-500 hover:text-brand-500
                transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}


