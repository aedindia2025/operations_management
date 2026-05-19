import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchOperationApprovalDetail,
  saveOperationApproval,
  type OperationApprovalDetail,
  type OperationApprovalItem,
} from "../../api/operationApprovalApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface ApprovalRecord extends OperationApprovalDetail {}

const EMPTY_RECORD: ApprovalRecord = {
  customerName: "",
  customerAddress: "",
  customerPhone: "--",
  customerEmail: "--",
  consigneeName: "",
  consigneeAddress: "",
  consigneePhone: "--",
  conbranch: "",
  consigneeCity: "",
  poNumber: "",
  poDate: "",
  executiveName: "",
  invoiceNo: "",
  invoiceDate: "",
  dcNo: "",
  dcDate: "",
  items: [],
  approvalStatus: "Pending",
  rejectedReason: "",
  approvedBy: "",
  approvedDate: "",
};

function formatValue(item: OperationApprovalItem) {
  return Number(item.invoiceValue || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function OperationApprovalForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") || "";
  const mode = searchParams.get("mode") || "edit";
  const viewMode = mode === "view";

  const [record, setRecord] = useState<ApprovalRecord>(EMPTY_RECORD);
  const [approvalStatus, setApprovalStatus] = useState<"Pending" | "Approved" | "Not Approved" | "">("");
  const [rejectedReason, setRejectedReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const canEditApproval = !viewMode && record.approvalStatus === "Pending";
  const showRejectReasonInput = canEditApproval && approvalStatus === "Not Approved";
  const showRejectReasonReadonly = !canEditApproval && Boolean(rejectedReason);

  const showUpdateButton = canEditApproval && approvalStatus !== "" && approvalStatus !== "Pending";

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        await showErrorAlert("Operation approval record is missing.");
        navigate("/operation/approval/list");
        return;
      }

      setLoading(true);
      try {
        const res = await fetchOperationApprovalDetail(id);
        if (!active) return;
        if (!res.status) throw new Error(res.message || "Failed to load operation approval detail.");
        setRecord(res.data);
        setApprovalStatus(res.data.approvalStatus);
        setRejectedReason(res.data.rejectedReason || "");
      } catch (error) {
        if (!active) return;
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load operation approval detail.");
        navigate("/operation/approval/list");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const handleUpdate = async () => {
    if (!canEditApproval) {
      await showErrorAlert("Only pending records can be updated.");
      return;
    }
    if (!id) {
      await showErrorAlert("Operation approval record is missing.");
      return;
    }
    if (!approvalStatus) {
      await showErrorAlert("Please select approval status.");
      return;
    }
    if (approvalStatus === "Not Approved" && !rejectedReason.trim()) {
      await showErrorAlert("Please enter rejected reason.");
      return;
    }

    setSaving(true);
    try {
      const status = approvalStatus.trim();
      const reason = rejectedReason.trim();
      const res = await saveOperationApproval(id, { approvalStatus: status, rejectedReason: reason });
      if (!res.status) throw new Error(res.error || res.message || "Failed to update operation approval.");
      await showSuccessAlert("Operation approval updated successfully.");
      navigate("/operation/approval/list?tab=completed");
    } catch (error: any) {
      await showErrorAlert(
        error?.response?.data?.message || error?.response?.data?.error ||
          (error instanceof Error ? error.message : "Failed to update operation approval."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-6">
      <PageTopbar title="Operation Approval" breadcrumbs={["Operation", "Operational Approval"]} />

      <div className="overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <div className="p-6 md:p-8">
          {loading ? (
            <div className="py-10 text-center text-[13px] text-ink-muted">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-line">
                <div>
                  <p className="text-[11px] font-semibold text-ink-muted tracking-widest uppercase mb-3">
                    Customer Details
                  </p>
                  <h2 className="text-[18px] font-extrabold text-[#3d5a20] leading-tight mb-3">
                    {record.customerName || ","}
                  </h2>
                  {record.customerAddress && (
                    <p className="text-[13px] text-ink-secondary leading-relaxed mb-3 whitespace-pre-line">
                      {record.customerAddress}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-[13px] text-ink mb-1">
                    <i className="fa fa-phone text-[11px] text-ink-muted" />
                    {record.customerPhone}
                  </p>
                  <p className="flex items-center gap-1.5 text-[13px] text-ink">
                    <i className="fa fa-envelope text-[11px] text-ink-muted" />
                    {record.customerEmail}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-ink-muted tracking-widest uppercase mb-3">
                    Consignee Details
                  </p>

                  {record.consigneeName && (
                    <p className="text-[13px] text-ink font-semibold leading-tight mb-2">{record.consigneeName}</p>
                  )}
                  {record.conbranch?.trim() && (
                    <p className="text-[13px] text-ink leading-relaxed mb-1 whitespace-pre-line">{record.conbranch}</p>
                  )}
                  {record.consigneeAddress && (
                    <p className="text-[13px] text-ink leading-relaxed whitespace-pre-line">{record.consigneeAddress}</p>
                  )}
                  {record.consigneeCity && (
                    <p className="text-[13px] text-ink leading-relaxed mb-2 whitespace-pre-line">{record.consigneeCity}</p>
                  )}
                  <p className="flex items-center gap-1.5 text-[13px] text-ink">
                    <i className="fa fa-phone text-[11px] text-ink-muted" />
                    {record.consigneePhone || "--"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-ink-muted tracking-widest uppercase mb-3">
                    PO &amp; Invoice Details
                  </p>
                  <table className="w-full text-[13px]">
                    <tbody>
                      {[
                        { label: "PO Number", value: record.poNumber },
                        { label: "PO Date", value: record.poDate },
                        { label: "Excutive Name", value: record.executiveName },
                        { label: "Invoice No", value: record.invoiceNo },
                        { label: "Invoice Date", value: record.invoiceDate },
                        { label: "DC Number", value: record.dcNo },
                        { label: "DC Date", value: record.dcDate },
                      ].map(({ label, value }) => (
                        <tr key={label} className="align-top">
                          <td className="py-1 pr-2 text-ink-muted whitespace-nowrap w-[120px]">{label}</td>
                          <td className="py-1 pr-2 text-ink-muted text-center w-4">:</td>
                          <td className="py-1 text-ink font-medium">{value || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-8">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-surface-2">
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark w-20">
                        S.No
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark w-40">
                        Item
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark w-28">
                        DC Qty
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark w-36">
                        Invoice Value
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark w-56">
                        Serial No
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-ink-muted italic border border-line text-[13px]">
                          No items available
                        </td>
                      </tr>
                    ) : (
                      record.items.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="border-b border-line/50 hover:bg-brand-50/30">
                          <td className="px-4 py-3 text-center border-x border-line/50 text-ink-muted">{idx + 1}</td>
                          <td className="px-4 py-3 border-x border-line/50">
                            <div className="font-semibold text-ink">{item.itemName}</div>
                            <div className="text-[12px] text-ink-secondary">{item.itemDesc}</div>
                          </td>
                          <td className="px-4 py-3 text-center border-x border-line/50 text-ink">{item.dcQty}</td>
                          <td className="px-4 py-3 text-right border-x border-line/50 font-medium text-ink">{formatValue(item)}</td>
                          <td className="px-4 py-3 text-center border-x border-line/50 text-ink">{item.serialNo || ""}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-6 flex-wrap">
                  <div className="w-64">
                    <span className="block text-[13px] font-semibold text-ink mb-2">Approval Status</span>
                    <SearchableSelectInput name="approvalstatus"
                      value={approvalStatus}
                      dropdownPortal={false}
                      onChange={(e) => {
                        if (!canEditApproval) return;
                        setApprovalStatus(e.target.value as typeof approvalStatus);
                        if (e.target.value !== "Not Approved") setRejectedReason("");
                      }}
                      disabled={!canEditApproval}
                      className={canEditApproval
                        ? "w-full px-3.5 py-2.5 text-[13px] border border-line-dark rounded-lg outline-none bg-white text-ink appearance-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all cursor-pointer"
                        : "w-full px-3.5 py-2.5 text-[13px] border border-line-dark rounded-lg outline-none bg-gray-50 text-ink appearance-none cursor-not-allowed opacity-80"}
                    >
                      <option value="" disabled>
                        Select status
                      </option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Not Approved">Not Approved</option>
                    </SearchableSelectInput>
                  </div>

                  {showRejectReasonInput && (
                    <div className="w-80">
                      <span className="block text-[13px] font-semibold text-ink mb-2">Rejected Reason</span>
                      <textarea name="rejectedreason"
                        rows={3}
                        value={rejectedReason}
                        onChange={(e) => setRejectedReason(e.target.value)}
                        placeholder="Enter rejection reason..."
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
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors bg-red-500 hover:bg-red-600 text-white border-0"
                  >
                    Cancel
                  </button>

                  {showUpdateButton && (
                    <button
                      type="button"
                      onClick={() => void handleUpdate()}
                      disabled={saving || (approvalStatus === "Not Approved" && !rejectedReason.trim())}
                      className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors bg-brand-700 hover:bg-brand-800 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {saving ? "Saving..." : "Update"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


