import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchDeliveryConfirmationDetail,
  saveDeliveryConfirmation,
  type DeliveryConfirmationDetail,
  type DeliveryConfirmationFormStatus,
  type DeliveryConfirmationItem,
} from "../../api/deliveryConfirmationApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface DeliveryRecord extends DeliveryConfirmationDetail {}

const EMPTY_RECORD: DeliveryRecord = {
  uniqueId: "",
  poFormUniqueId: "",
  consigneeUniqueId: "",
  dcNumber: "",
  customerName: "",
  customerAddress: "",
  customerPhone: "",
  customerEmail: "",
  consigneeName: "",
  consigneeAddress: "",
  consigneePhone: "",
  consigneeCity: "",
  poNumber: "",
  poDate: "",
  invoiceNo: "",
  invoiceDate: "",
  dcNo: "",
  dcDate: "",
  deliveryMode: "",
  deliveryDate: "",
  deliveryProof: null,
  items: [],
  deliveryConfirmationStatus: "Pending",
  remarks: "",
  deliveryConfirmedBy: "",
  deliveryConfirmationDate: "",
  personName: "",
  contactNo: "",
  productReceivedDate: "",
};

function renderItemValue(item: DeliveryConfirmationItem) {
  return Number(item.invoiceValue || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return value;
}

export default function DeliveryConfirmationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") || "";
  const mode = (searchParams.get("mode") || "").toLowerCase();

  const [record, setRecord] = useState<DeliveryRecord>(EMPTY_RECORD);
  const [dcStatus, setDcStatus] = useState<DeliveryConfirmationFormStatus | "">("");
  const [remarks, setRemarks] = useState("");
  const [personName, setPersonName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [productReceivedDate, setProductReceivedDate] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const isViewMode = mode === "view" || record.deliveryConfirmationStatus === "Confirmation";

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        await showErrorAlert("Delivery confirmation record is missing.");
        navigate("/operation/delivery/list");
        return;
      }

      setLoading(true);
      try {
        const res = await fetchDeliveryConfirmationDetail(id);
        if (!active) return;
        if (!res.status) throw new Error(res.error || "Failed to load delivery confirmation detail.");

        setRecord(res.data);
        setDcStatus(res.data.deliveryConfirmationStatus || "Pending");
        setRemarks(res.data.remarks || "");
        setPersonName(res.data.personName || "");
        setContactNo(res.data.contactNo || "");
        setProductReceivedDate(res.data.productReceivedDate || "");
      } catch (error) {
        if (!active) return;
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load delivery confirmation detail.");
        navigate("/operation/delivery/list");
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
    if (isViewMode) {
      return;
    }
    if (!record.uniqueId) {
      await showErrorAlert("Delivery confirmation record is missing.");
      return;
    }
    if (!dcStatus) {
      await showErrorAlert("Please select delivery confirmation status.");
      return;
    }
    if (dcStatus === "Confirmation" || dcStatus === "Not_deliverd") {
      if (!contactNo.trim()) {
        await showErrorAlert("Please enter contact number.");
        return;
      }
      if (!productReceivedDate) {
        await showErrorAlert("Please select product received date.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await saveDeliveryConfirmation(record.uniqueId, {
        deliveryConfirmationStatus: dcStatus,
        remarks,
        personName,
        contactNo,
        productReceivedDate,
      });
      if (!res.status) {
        throw new Error(typeof res.error === "string" ? res.error : "Failed to update delivery confirmation.");
      }
      await showSuccessAlert("Delivery confirmation updated successfully.");
      navigate("/operation/delivery/list");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to update delivery confirmation.");
    } finally {
      setSaving(false);
    }
  };

  const showContactCard = dcStatus === "Confirmation" || dcStatus === "Not_deliverd";
  const proofLabel = proofFile?.name || record.deliveryProof || "";
  const proofUrl = !proofFile ? record.deliveryProofUrl || "" : "";
  const canSubmitUpdate = !isViewMode && dcStatus !== "" && dcStatus !== "Pending";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-6">
      <PageTopbar
        title="Delivery Confirmation"
        breadcrumbs={["Operation", "Delivery Confirmation"]}
      />

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
                    {record.customerName}
                  </h2>
                  <p className="text-[13px] text-ink-secondary leading-relaxed mb-3 whitespace-pre-line">
                    {record.customerAddress}
                  </p>
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
                  <h2 className="text-[18px] font-extrabold text-[#3d5a20] leading-tight mb-3">
                    {record.consigneeName}
                  </h2>
                  <p className="flex items-center gap-1.5 text-[13px] text-ink mb-3">
                    <i className="fa fa-phone text-[11px] text-ink-muted" />
                    {record.consigneePhone}
                  </p>
                  <p className="text-[13px] text-ink-secondary leading-relaxed mb-1 whitespace-pre-line">
                    {record.consigneeAddress}
                  </p>
                  <p className="text-[13px] text-ink-secondary leading-relaxed">
                    {record.consigneeCity}
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
                        { label: "Invoice No", value: record.invoiceNo },
                        { label: "Invoice Date", value: record.invoiceDate },
                        { label: "DC NO", value: record.dcNo },
                        { label: "DC Date", value: record.dcDate },
                        { label: "Delivery Mode", value: record.deliveryMode },
                        { label: "Delivery Date", value: record.deliveryDate },
                      ].map(({ label, value }) => (
                        <tr key={label} className="align-top">
                          <td className="py-1 pr-2 text-ink-muted whitespace-nowrap w-[120px]">{label}</td>
                          <td className="py-1 pr-2 text-ink-muted text-center w-4">:</td>
                          <td className="py-1 text-ink font-medium">{value || "-"}</td>
                        </tr>
                      ))}

                      <tr className="align-middle">
                        <td className="py-1 pr-2 text-ink-muted whitespace-nowrap w-[120px]">Delivery Proof</td>
                        <td className="py-1 pr-2 text-ink-muted text-center w-4">:</td>
                        <td className="py-1">
                          <label className={`flex items-center gap-1.5 ${isViewMode ? "cursor-default" : "cursor-pointer"}`}>
                            {proofUrl ? (
                              <a
                                href={proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-8 h-8 bg-gray-100 border border-gray-200 rounded flex items-center justify-center hover:bg-brand-50 transition-colors"
                                title={proofLabel || "Open delivery proof"}
                              >
                                {proofLabel ? (
                                  <i className="fa fa-file-pdf text-red-500 text-[13px]" />
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-gray-400">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M7 7h10M7 11h10M7 15h6" />
                                  </svg>
                                )}
                              </a>
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded flex items-center justify-center hover:bg-brand-50 transition-colors">
                                {proofLabel ? (
                                  <i className="fa fa-file-pdf text-red-500 text-[13px]" />
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-gray-400">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M7 7h10M7 11h10M7 15h6" />
                                  </svg>
                                )}
                              </div>
                            )}
                            {!isViewMode && (
                              <input name="deliveryconfirmationform_input_279"
                                type="file"
                                accept=".pdf,image/*"
                                className="hidden"
                                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                              />
                            )}
                            {proofLabel && (
                              proofUrl ? (
                                <a
                                  href={proofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-ink-muted truncate max-w-[160px] hover:text-brand-600 hover:underline"
                                  title={proofLabel}
                                >
                                  {proofLabel}
                                </a>
                              ) : (
                                <span className="text-[11px] text-ink-muted truncate max-w-[120px]">
                                  {proofLabel}
                                </span>
                              )
                            )}
                          </label>
                        </td>
                      </tr>
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
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">
                        Item Details
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark w-28">
                        DC Qty
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark w-36">
                        Invoice Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-ink-muted italic border border-line text-[13px]">
                          No items available
                        </td>
                      </tr>
                    ) : record.items.map((item, idx) => (
                      <tr key={`${item.id}-${idx}`} className="border-b border-line/50 hover:bg-brand-50/30">
                        <td className="px-4 py-3 text-center border-x border-line/50 text-ink-muted">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 border-x border-line/50">
                          <div className="font-semibold text-ink">{item.itemName}</div>
                          <div className="text-[12px] text-ink-secondary">{item.itemDesc}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-x border-line/50 text-ink">
                          {item.dcQty}
                        </td>
                        <td className="px-4 py-3 text-right border-x border-line/50 font-medium text-ink">
                          {renderItemValue(item)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-6 flex-wrap">
                  <div className="w-64">
                    <span className="block text-[13px] font-semibold text-ink mb-2">
                      Delivery Confirmation Status
                    </span>
                    <SearchableSelectInput name="dcstatus"
                      value={dcStatus}
                      onChange={(e) => {
                        const nextStatus = e.target.value as typeof dcStatus;
                        setDcStatus(nextStatus);
                        if (nextStatus === "Pending") {
                          setPersonName("");
                          setContactNo("");
                          setProductReceivedDate("");
                          setRemarks("");
                        }
                      }}
                      disabled={isViewMode}
                      className={`w-full px-3.5 py-2.5 text-[13px] border border-line-dark rounded-lg
                        outline-none bg-white text-ink appearance-none
                        focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15
                        transition-all ${isViewMode ? "cursor-not-allowed bg-gray-100 text-ink-muted" : "cursor-pointer"}`}
                    >
                      <option value="" disabled>Select status</option>
                      <option value="Pending">Pending</option>
                      <option value="Not_deliverd">Not deliverd</option>
                      <option value="Confirmation">Confirmation</option>
                    </SearchableSelectInput>
                  </div>

                </div>

                {showContactCard && (
                  <div className="rounded-2xl border border-line bg-[#fbfcf5] p-5">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                      Contact Person Details
                    </p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {isViewMode && record.deliveryConfirmedBy && (
                        <div>
                          <span className="mb-2 block text-[13px] font-semibold text-ink">
                            Delivery Confirmed Person
                          </span>
                          <div className="min-h-[42px] rounded-lg border border-line bg-gray-50 px-3.5 py-2.5 text-[13px] font-medium text-ink">
                            {record.deliveryConfirmedBy}
                          </div>
                        </div>
                      )}

                      <div>
                        <span className="mb-2 block text-[13px] font-semibold text-ink">
                          Person Name
                        </span>
                        {isViewMode ? (
                          <div className="min-h-[42px] rounded-lg border border-line bg-gray-50 px-3.5 py-2.5 text-[13px] font-medium text-ink">
                            {personName || "-"}
                          </div>
                        ) : (
                          <input name="personname"
                            type="text"
                            value={personName}
                            onChange={(e) => setPersonName(e.target.value)}
                            className="w-full rounded-lg border border-line-dark bg-white px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                            placeholder="Enter person name"
                          />
                        )}
                      </div>

                      <div>
                        <span className="mb-2 block text-[13px] font-semibold text-ink">
                          Contact No
                        </span>
                        {isViewMode ? (
                          <div className="min-h-[42px] rounded-lg border border-line bg-gray-50 px-3.5 py-2.5 text-[13px] font-medium text-ink">
                            {contactNo || "-"}
                          </div>
                        ) : (
                          <input name="contactno"
                            type="text"
                            inputMode="numeric"
                            maxLength={10}
                            value={contactNo}
                            onChange={(e) => setContactNo(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full rounded-lg border border-line-dark bg-white px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                            placeholder="Enter contact number"
                          />
                        )}
                      </div>

                      <div>
                        <span className="mb-2 block text-[13px] font-semibold text-ink">
                          Product Received Date
                        </span>
                        {isViewMode ? (
                          <div className="min-h-[42px] rounded-lg border border-line bg-gray-50 px-3.5 py-2.5 text-[13px] font-medium text-ink">
                            {formatDisplayDate(record.productReceivedDate) || "-"}
                          </div>
                        ) : (
                          <input name="productreceiveddate"
                            type="date"
                            value={productReceivedDate}
                            onChange={(e) => setProductReceivedDate(e.target.value)}
                            className="w-full rounded-lg border border-line-dark bg-white px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                          />
                        )}
                      </div>

                      <div className="md:col-span-2 xl:col-span-4">
                        <span className="mb-2 block text-[13px] font-semibold text-ink">
                          Remarks
                        </span>
                        {isViewMode ? (
                          <div className="min-h-[84px] rounded-lg border border-line bg-gray-50 px-3.5 py-2.5 text-[13px] font-medium text-ink whitespace-pre-wrap">
                            {remarks || "-"}
                          </div>
                        ) : (
                          <textarea name="remarks"
                            rows={3}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Enter remarks..."
                            className="w-full rounded-lg border border-line-dark bg-white px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 resize-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors
                      bg-red-500 hover:bg-red-600 text-white border-0"
                  >
                    Cancel
                  </button>

                  {canSubmitUpdate && (
                    <button
                      type="button"
                      onClick={() => void handleUpdate()}
                      disabled={saving}
                      className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors
                        bg-brand-700 hover:bg-brand-800 text-white border-0
                        disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving && (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
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


