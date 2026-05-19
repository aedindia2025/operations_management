import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchMaterialQcDetail,
  updateMaterialQc,
  type MaterialQcDetail,
} from "../../api/materialQcApi";
import { useAuth } from "../../context/AuthContext";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

function statusValueToLabel(status: number | string) {
  const value = Number(status || 0);
  if (value === 1) return "Yes";
  if (value === 2) return "No";
  return "Pending";
}

function labelToStatusValue(label: "Pending" | "Yes" | "No") {
  if (label === "Yes") return 1;
  if (label === "No") return 2;
  return 0;
}

function ReadOnlyField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-32 text-[12.5px] text-ink-secondary shrink-0">{label}</span>
      <span className="text-ink-muted">:</span>
      <span className="text-[12.5px] text-ink font-medium">{value || "-"}</span>
    </div>
  );
}

export default function MaterialQcForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") || "";
  const mode = searchParams.get("mode") || "edit";
  const viewMode = mode === "view";

  const [detail, setDetail] = useState<MaterialQcDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mqcStatus, setMqcStatus] = useState<"Pending" | "Yes" | "No">("Pending");
  const [rejectedReason, setRejectedReason] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        await showErrorAlert("Material QC record is missing.");
        navigate("/stores/material-qc/list");
        return;
      }

      setLoading(true);
      try {
        const res = await fetchMaterialQcDetail(id);
        if (!mounted) return;
        setDetail(res.data);
        setMqcStatus(statusValueToLabel(res.data.material_qc));
        setRejectedReason(res.data.material_qc_reject_reason || "");
      } catch (error) {
        if (!mounted) return;
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load material QC detail.");
        navigate("/stores/material-qc/list");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  const canEditStatus = useMemo(() => {
    if (!detail) return false;
    return !viewMode && Boolean(detail.material_qc_editable);
  }, [detail, viewMode]);

  const showRejectReasonInput = canEditStatus && mqcStatus === "No";
  const showRejectReasonReadonly = !showRejectReasonInput && mqcStatus === "No" && Boolean(rejectedReason.trim());
  const showUpdateButton = canEditStatus && mqcStatus !== "Pending";
  const approvedBy = user?.unique_id || user?.id || user?.username || user?.name || "";

  const handleUpdate = async () => {
    if (!id || !detail) {
      await showErrorAlert("Material QC record not found.");
      return;
    }
    if (!canEditStatus) {
      await showErrorAlert("Only pending Material QC records can be updated.");
      return;
    }
    if (mqcStatus === "Pending") {
      await showErrorAlert("Please select Material QC status.");
      return;
    }
    if (mqcStatus === "No" && !rejectedReason.trim()) {
      await showErrorAlert("Please enter rejection reason.");
      return;
    }

    setSaving(true);
    try {
      await updateMaterialQc(id, {
        dc_number: detail.dc_number,
        material_qc_status: labelToStatusValue(mqcStatus),
        approved_by: approvedBy,
        ac_reason_reject: rejectedReason.trim(),
      });
      await showSuccessAlert("Material QC updated successfully.");
      navigate("/stores/material-qc/list");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to update material QC.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-ink-secondary">Loading material QC details...</div>;
  }

  if (!detail) {
    return <div className="p-6 text-sm text-ink-secondary">Material QC record not found.</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
      <PageTopbar title="Material QC" breadcrumbs={["Stores", "Material QC", "Form"]} />

      <div className="mt-4 overflow-visible rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
        <div className="bg-[linear-gradient(180deg,#f7f8f1_0%,#ffffff_20%)] p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-[12px] uppercase text-ink-muted">Customer Details</p>
              <h2 className="text-[20px] font-bold text-[#3d5a20]">{detail.customer_name || "-"}</h2>
              <p className="text-[13px] text-ink-secondary leading-relaxed whitespace-pre-line">{detail.customer_address || "-"}</p>
              <p className="text-[13px] text-ink flex items-center gap-2 mt-2">
                <i className="fa fa-phone text-[11px] text-ink-muted" />
                {detail.customer_phone || "--"}
              </p>
              <p className="text-[13px] text-ink flex items-center gap-2">
                <i className="fa fa-envelope text-[11px] text-ink-muted" />
                {detail.customer_email || "--"}
              </p>
            </div>

            <div>
              <p className="text-[12px] uppercase text-ink-muted">Consignee Details</p>
              <h2 className="text-[20px] font-bold text-[#3d5a20]">{detail.consignee_name || "-"}</h2>
              <p className="text-[13px] text-ink-secondary leading-relaxed whitespace-pre-line">{detail.consignee_address || "-"}</p>
              <p className="text-[13px] text-ink flex items-center gap-2 mt-2">
                <i className="fa fa-phone text-[11px] text-ink-muted" />
                {detail.consignee_phone1 || "--"}
              </p>
              <p className="text-[13px] text-ink flex items-center gap-2">
                <i className="fa fa-phone text-[11px] text-ink-muted" />
                {detail.consignee_phone2 || "--"}
              </p>
            </div>

            <div>
              <p className="text-[12px] uppercase text-ink-muted">PO &amp; Invoice Details</p>
              <div className="mt-2 space-y-1.5 text-[13px]">
                <ReadOnlyField label="PO Number" value={detail.po_num} />
                <ReadOnlyField label="PO Date" value={detail.po_date} />
                <ReadOnlyField label="Executive Name" value={detail.executive_name} />
                <ReadOnlyField label="Invoice No" value={detail.invoice_no} />
                <ReadOnlyField label="Invoice Date" value={detail.invoice_date} />
                <ReadOnlyField label="DC Number" value={detail.dc_number} />
                <ReadOnlyField label="DC Date" value={detail.dc_date} />
              </div>
            </div>
          </div>

          <div className="mb-6 overflow-hidden rounded-[24px] border border-[#e5e8d7] shadow-[0_18px_35px_rgba(46,61,24,0.08)]">
            <div className="bg-[linear-gradient(135deg,#fbfcf7_0%,#edf3df_100%)] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#566438]">Item Details</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-white">
                    <th className="px-3 py-2.5 text-center font-semibold text-ink border border-line-dark">S.No</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-ink border border-line-dark">Item Details</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-ink border border-line-dark">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-ink border border-line-dark">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-ink-muted border border-line">No items found</td>
                    </tr>
                  ) : detail.items.map((item) => (
                    <tr key={item.unique_id || item.s_no} className="hover:bg-brand-50/40 transition-colors">
                      <td className="px-3 py-2 text-center border border-line">{item.s_no}</td>
                      <td className="px-3 py-2 border border-line">
                        <div className="font-semibold">{item.item_code || "-"}</div>
                        <div>{item.product || "-"}</div>
                      </td>
                      <td className="px-3 py-2 text-center border border-line">{item.qty}</td>
                      <td className="px-3 py-2 text-right border border-line">
                        {Number(item.value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-6 flex-wrap">
              <div className="w-64">
                <span className="block text-[13px] font-semibold text-ink mb-2">Material QC Status</span>
                <SearchableSelectInput name="mqcstatus"
                  value={mqcStatus}
                  onChange={(e) => {
                    if (!canEditStatus) return;
                    const value = e.target.value as "Pending" | "Yes" | "No";
                    setMqcStatus(value);
                    if (value !== "No") setRejectedReason("");
                  }}
                  disabled={!canEditStatus}
                  className={canEditStatus
                    ? "w-full px-3.5 py-2.5 text-[13px] border border-line-dark rounded-lg outline-none bg-white text-ink appearance-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all cursor-pointer"
                    : "w-full px-3.5 py-2.5 text-[13px] border border-line-dark rounded-lg outline-none bg-gray-50 text-ink appearance-none cursor-not-allowed opacity-80"}
                >
                  <option value="Pending">Pending</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </SearchableSelectInput>
              </div>

              {showRejectReasonInput && (
                <div className="w-80">
                  <span className="block text-[13px] font-semibold text-ink mb-2">Rejected Reason</span>
                  <textarea name="rejectedreason"
                    rows={3}
                    value={rejectedReason}
                    onChange={(e) => setRejectedReason(e.target.value)}
                    placeholder="Enter rejection reason"
                    className="w-full px-3.5 py-2.5 text-[13px] border border-brand-500 rounded-lg outline-none bg-white text-ink resize-none focus:ring-2 focus:ring-brand-500/15 transition-all"
                  />
                </div>
              )}

              {showRejectReasonReadonly && (
                <div className="w-80">
                  <span className="block text-[13px] font-semibold text-ink mb-2">Rejected Reason</span>
                  <textarea name="rejectedreason"
                    rows={3}
                    value={rejectedReason}
                    disabled
                    className="w-full px-3.5 py-2.5 text-[13px] border border-line-dark rounded-lg outline-none bg-gray-50 text-ink resize-none cursor-not-allowed opacity-80"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/stores/material-qc/list")}
                className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors bg-red-500 hover:bg-red-600 text-white border-0"
              >
                Cancel
              </button>

              {showUpdateButton && (
                <button
                  type="button"
                  onClick={() => void handleUpdate()}
                  disabled={saving || (mqcStatus === "No" && !rejectedReason.trim())}
                  className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors bg-brand-700 hover:bg-brand-800 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {saving ? "Saving..." : "Update"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


