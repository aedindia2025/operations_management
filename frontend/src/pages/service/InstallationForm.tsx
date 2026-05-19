import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  createInstallation,
  fetchInstallationDetail,
  fetchInstallationSourceDetail,
  updateInstallation,
  type InstallationDetail,
} from "../../api/installationApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

const inputCls = "w-full rounded-xl border border-[#dad3be] bg-[#fbfaf4] px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-80";
const statusOptions = [{ value: "", label: "Select Status" }, { value: "1", label: "Yes" }];
const validTabs = new Set(["pending", "uploaded", "dcir_pending", "dcir_completed"]);
const topbarBreadcrumbs = ["Settings", "Installation"];
const sectionEyebrowCls = "text-[15px] font-semibold uppercase tracking-[0.08em] text-[#8b92a2]";
const detailLabelCls = "text-[15px] text-[#8b92a2]";
const detailValueCls = "text-[15px] text-[#252b31]";

const emptyForm = {
  engineer_name: "",
  engg_type: "",
  installation_com_date: "",
  eng_remarks: "",
  in_charge: "",
  gst_percent: "",
  ttl_amnt: "",
  documents_type: false,
  documents_type1: false,
  documents_type2: false,
  dc_received_sts: "",
  dc_cus_signed_date: "",
  ir_rec_status: "",
  ir_cus_signed_date: "",
  snr_rec_status: "",
  snr_cus_signed_date: "",
  dc_file: null as File | null,
  ir_file: null as File | null,
  snr_file: null as File | null,
};

type FormState = typeof emptyForm;

const toInputDate = (value?: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return value;
};

const normalizeTab = (value: string | null, fallback: string) => (validTabs.has(value || "") ? (value as string) : fallback);

function pickValue(...values: Array<string | undefined | null>) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function readValue(...values: Array<string | undefined | null>) {
  return pickValue(...values) || "-";
}

function normalizeEngineerTypeValue(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "1" || normalized === "own engineer" || normalized === "own-engineer") return "own-engineer";
  if (normalized === "2" || normalized === "outsource vendor" || normalized === "outsource-vendor") return "outsource-vendor";
  return normalized;
}

function formatEngineerType(value?: string | null) {
  const normalized = normalizeEngineerTypeValue(value);
  if (normalized === "own-engineer") return "own-engineer";
  if (normalized === "outsource-vendor") return "outsource-vendor";
  return readValue(value);
}

function buildAddress(primary?: string | null, district?: string | null, state?: string | null) {
  const line1 = pickValue(primary);
  const line2 = [pickValue(district), pickValue(state)].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join("\n") || "-";
}

function FileLink({ url, label }: { url?: string; label: string }) {
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-brand-700 underline decoration-brand-300 underline-offset-2">
      {label}
    </a>
  ) : null;
}

function AttachmentSummaryItem({ title, url, filename }: { title: string; url?: string; filename?: string }) {
  return (
    <div className="grid grid-cols-[minmax(130px,1fr)_12px_42px] items-center gap-4 text-[14px]">
      <span className="font-medium text-[#8b92a2]">{title}</span>
      <span className="text-[#252b31]">:</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title={filename || title}
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-red-300 bg-white text-red-500 transition-colors hover:bg-red-50"
        >
          <i className="fa fa-file-pdf text-[20px]" />
        </a>
      ) : (
        <span className="text-[13px] text-ink-muted">-</span>
      )}
    </div>
  );
}

function ContactLine({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[15px] text-[#4b5345]">
      <i className={`fa ${icon} text-[14px] text-[#65721c]`} />
      <span>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(120px,1fr)_14px_minmax(0,1fr)] items-start gap-2 text-[15px]">
      <span className={detailLabelCls}>{label}</span>
      <span className="text-[#858c96]">:</span>
      <span className={`${detailValueCls} ${bold ? "font-semibold" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function DocCheckbox({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`inline-flex items-center gap-2 text-[14px] ${disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
      <span className={`flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "border-[#2196f3] bg-[#2196f3]" : "border-[#d2c8ab] bg-[#eeeeee]"}`}>
        {checked ? <i className="fa fa-check text-[10px] text-white" /> : null}
      </span>
      <input name="checked" type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export default function InstallationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const sourceId = searchParams.get("source") || "";
  const mode = searchParams.get("mode") || "";
  const isEdit = Boolean(id);
  const isUploadedMode = mode === "uploaded";
  const activeTab = normalizeTab(searchParams.get("tab"), isUploadedMode ? "uploaded" : "pending");
  const isViewMode = mode === "view";
  const isPendingTab = activeTab === "pending";
  const isReadOnlyMode = isUploadedMode || (isViewMode && !isPendingTab);
  const returnPath = `/service/installation/list?tab=${activeTab}`;
  const [detail, setDetail] = useState<InstallationDetail | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = isEdit && id ? await fetchInstallationDetail(id) : await fetchInstallationSourceDetail(sourceId);
        const row = res.data;
        setDetail(row);
        setForm({
          engineer_name: row.vendor_engineer_id || row.engineer_name_id || "",
          engg_type: normalizeEngineerTypeValue(row.engg_type || row.vendor_engineer_type),
          installation_com_date: toInputDate(row.installation_com_date || row.vendor_installation_date),
          eng_remarks: row.eng_remarks || "",
          in_charge: row.in_charge || row.vendor_rate || "",
          gst_percent: row.gst_percent || row.vendor_gst || "",
          ttl_amnt: row.ttl_amnt || row.vendor_total_amount || "",
          documents_type: row.documents_type === "DC",
          documents_type1: row.documents_type1 === "IR",
          documents_type2: row.documents_type2 === "SNR",
          dc_received_sts: row.dc_received_sts || "",
          dc_cus_signed_date: toInputDate(row.dc_cus_signed_date),
          ir_rec_status: row.ir_rec_status || "",
          ir_cus_signed_date: toInputDate(row.ir_cus_signed_date),
          snr_rec_status: row.snr_rec_status || "",
          snr_cus_signed_date: toInputDate(row.snr_cus_signed_date),
          dc_file: null,
          ir_file: null,
          snr_file: null,
        });
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load installation details.");
      } finally {
        setLoading(false);
      }
    };

    if (!isEdit && !sourceId) {
      setError("Installation source is missing.");
      setLoading(false);
      return;
    }

    void load();
  }, [id, isEdit, sourceId]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDoc = (field: "documents_type" | "documents_type1" | "documents_type2", checked: boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: checked };
      if (!checked && field === "documents_type") {
        next.dc_received_sts = "";
        next.dc_cus_signed_date = "";
        next.dc_file = null;
      }
      if (!checked && field === "documents_type1") {
        next.ir_rec_status = "";
        next.ir_cus_signed_date = "";
        next.ir_file = null;
      }
      if (!checked && field === "documents_type2") {
        next.snr_rec_status = "";
        next.snr_cus_signed_date = "";
        next.snr_file = null;
      }
      return next;
    });
  };

  const validate = () => {
    if (!detail?.source_unique_id) return "Installation source is missing.";
    if ((form.documents_type1 || form.documents_type2) && !form.documents_type) return "DC is required along with IR or SNR.";
    if (form.documents_type && (!form.dc_received_sts || !form.dc_cus_signed_date)) return "Fill DC status and signed date.";
    if (form.documents_type1 && (!form.ir_rec_status || !form.ir_cus_signed_date)) return "Fill IR status and signed date.";
    if (form.documents_type2 && (!form.snr_rec_status || !form.snr_cus_signed_date)) return "Fill SNR status and signed date.";
    if (!pickValue(detail.vendor_engineer_id, detail.engineer_name_id, form.engineer_name)) return "Vendor engineer is missing.";
    if (!pickValue(form.installation_com_date, detail.vendor_installation_date, detail.installation_com_date)) return "Installation date is missing.";
    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isReadOnlyMode) return;

    const validation = validate();
    if (validation) {
      await showErrorAlert(validation);
      return;
    }
    if (!detail) return;

    const payload = new FormData();
    payload.append("source_unique_id", detail.source_unique_id || "");
    payload.append("unique_id", detail.unique_id || "");
    payload.append("po_form_unique_id", detail.po_form_unique_id || "");
    payload.append("po_auto_id", detail.po_auto_id || "");
    payload.append("po_num", detail.po_num || "");
    payload.append("po_date", detail.po_date || "");
    payload.append("invoice_auto_id", detail.invoice_auto_id || "");
    payload.append("invoice_no", detail.invoice_no || "");
    payload.append("invoice_date", detail.invoice_date || "");
    payload.append("consignee_unique_id", detail.consignee_unique_id || "");
    payload.append("dc_number", detail.dc_number || "");
    payload.append("team_mem", detail.team_mem || "");
    payload.append("engineer_name", pickValue(detail.vendor_engineer_id, detail.engineer_name_id, form.engineer_name));
    payload.append("engg_type", pickValue(form.engg_type, normalizeEngineerTypeValue(detail.vendor_engineer_type), normalizeEngineerTypeValue(detail.engg_type)));
    payload.append("installation_com_date", pickValue(form.installation_com_date, detail.vendor_installation_date, detail.installation_com_date));
    payload.append("eng_remarks", pickValue(form.eng_remarks, detail.eng_remarks));
    payload.append("in_charge", pickValue(form.in_charge, detail.vendor_rate, detail.in_charge));
    payload.append("gst_percent", pickValue(form.gst_percent, detail.vendor_gst, detail.gst_percent));
    payload.append("ttl_amnt", pickValue(form.ttl_amnt, detail.vendor_total_amount, detail.ttl_amnt));
    payload.append("documents_type", form.documents_type ? "DC" : "0");
    payload.append("documents_type1", form.documents_type1 ? "IR" : "0");
    payload.append("documents_type2", form.documents_type2 ? "SNR" : "0");
    payload.append("dc_received_sts", form.documents_type ? form.dc_received_sts : "");
    payload.append("dc_cus_signed_date", form.documents_type ? form.dc_cus_signed_date : "");
    payload.append("ir_rec_status", form.documents_type1 ? form.ir_rec_status : "");
    payload.append("ir_cus_signed_date", form.documents_type1 ? form.ir_cus_signed_date : "");
    payload.append("snr_rec_status", form.documents_type2 ? form.snr_rec_status : "");
    payload.append("snr_cus_signed_date", form.documents_type2 ? form.snr_cus_signed_date : "");
    if (form.dc_file) payload.append("dc_file", form.dc_file);
    if (form.ir_file) payload.append("ir_file", form.ir_file);
    if (form.snr_file) payload.append("snr_file", form.snr_file);

    setSaving(true);
    try {
      if (isEdit && id) {
        await updateInstallation(id, payload);
        await showSuccessAlert("Installation updated successfully.");
      } else {
        await createInstallation(payload);
        await showSuccessAlert("Installation saved successfully.");
      }
      navigate(returnPath);
    } catch (err: any) {
      await showErrorAlert(err?.response?.data?.message || "Failed to save installation.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-full bg-[#f7f4e8] p-6 text-[13px] text-ink-secondary">Loading installation details...</div>;
  if (error || !detail) {
    return (
      <div className="min-h-full bg-[#f7f4e8] p-6">
        <PageTopbar title="Installation Form" breadcrumbs={topbarBreadcrumbs} />
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error || "Record not found."}</div>
      </div>
    );
  }

  const documentTypeLabel = readValue(detail.document_type_label, detail.dc_required === "1" ? "DC Required" : "DC & IR Required");
  const showIrDocumentFamily = documentTypeLabel === "IR Required" || documentTypeLabel === "DC & IR Required";
  const customerAddress = buildAddress(detail.bill_address, detail.customer_district || detail.district, detail.customer_state || detail.state);
  const consigneeAddress = buildAddress(detail.con_address, detail.district, detail.state);
  const vendorEngineerType = formatEngineerType(pickValue(detail.vendor_engineer_type, form.engg_type, detail.engg_type));
  const vendorEngineerName = readValue(detail.vendor_engineer_name, detail.engineer_name, detail.engineer_name_id);
  const vendorInstallationDate = readValue(detail.vendor_installation_date, detail.installation_com_date);
  const vendorRate = readValue(detail.vendor_rate, detail.in_charge);
  const vendorTotalAmount = readValue(detail.vendor_total_amount, detail.ttl_amnt);
  const vendorAssignNo = readValue(detail.vendor_assign_no);
  const vendorAssignDate = readValue(detail.vendor_assign_datetime, detail.vendor_assign_date);
  const vendorTimeline = readValue(detail.vendor_timeline);
  const vendorGst = readValue(detail.vendor_gst, detail.gst_percent);
  const allowFreshDocumentUpload = isPendingTab && !isEdit && !isReadOnlyMode;

  const checkboxLock = {
    dc: isReadOnlyMode || (!allowFreshDocumentUpload && detail.documents_type === "DC"),
    ir: isReadOnlyMode || (!allowFreshDocumentUpload && detail.documents_type1 === "IR"),
    snr: isReadOnlyMode || (!allowFreshDocumentUpload && detail.documents_type2 === "SNR"),
  };

  const fieldLock = {
    dcStatus: isReadOnlyMode || (!allowFreshDocumentUpload && !!detail.dc_received_sts),
    dcDate: isReadOnlyMode || (!allowFreshDocumentUpload && !!detail.dc_cus_signed_date),
    dcFile: isReadOnlyMode || (!allowFreshDocumentUpload && !!(detail.dc_file_url || detail.dc_original_name)),
    irStatus: isReadOnlyMode || (!allowFreshDocumentUpload && !!detail.ir_rec_status),
    irDate: isReadOnlyMode || (!allowFreshDocumentUpload && !!detail.ir_cus_signed_date),
    irFile: isReadOnlyMode || (!allowFreshDocumentUpload && !!(detail.ir_file_url || detail.ir_original_name)),
    snrStatus: isReadOnlyMode || (!allowFreshDocumentUpload && !!detail.snr_rec_status),
    snrDate: isReadOnlyMode || (!allowFreshDocumentUpload && !!detail.snr_cus_signed_date),
    snrFile: isReadOnlyMode || (!allowFreshDocumentUpload && !!(detail.snr_file_url || detail.snr_original_name)),
  };

  return (
    <div className="min-h-full bg-[#f7f4e8] p-6">
      <PageTopbar title="Installation Form" breadcrumbs={topbarBreadcrumbs} />
      <div className="space-y-4 rounded-[26px] border border-[#ebe4cc] bg-[#f7f4e8] p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-[22px] border border-[#ece4cf] bg-white px-5 py-6 shadow-[0_12px_28px_rgba(115,103,56,0.06)] md:px-6 md:py-7">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
              <div className="space-y-3">
                <div className={sectionEyebrowCls}>Customer Details</div>
                <div className="text-[23px] font-bold uppercase tracking-[0.02em] text-[#58671b] md:text-[26px]">{detail.ledger_name || "-"}</div>
                <div className="whitespace-pre-line text-[15px] leading-7 text-[#2c3238]">{customerAddress}</div>
                <ContactLine icon="fa-phone" value={readValue(detail.customer_phone, "--")} />
                <ContactLine icon="fa-envelope" value={readValue(detail.customer_email, "--")} />
              </div>

              <div className="space-y-3">
                <div className={sectionEyebrowCls}>Consignee Details</div>
                <div className="text-[23px] font-bold uppercase tracking-[0.02em] text-[#58671b] md:text-[26px]">{detail.consignee_name || "-"}</div>
                <div className="whitespace-pre-line text-[15px] leading-7 text-[#2c3238]">{consigneeAddress}</div>
                <ContactLine icon="fa-phone" value={readValue(detail.consignee_phone, "--")} />
              </div>

              <div className="space-y-3">
                <div className={sectionEyebrowCls}>PO & Invoice Details</div>
                <div className="space-y-3 pt-1">
                  <SummaryRow label="PO Number" value={readValue(detail.po_num)} />
                  <SummaryRow label="PO Date" value={readValue(detail.po_date)} />
                  <SummaryRow label="Invoice No" value={readValue(detail.invoice_no)} />
                  <SummaryRow label="Invoice Date" value={readValue(detail.invoice_date)} />
                  <SummaryRow label="DC Number" value={readValue(detail.dc_number)} />
                  <SummaryRow label="DC Date" value={readValue(detail.dc_date)} />
                  <SummaryRow label="Document Type" value={documentTypeLabel} />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-4 text-[18px] font-bold uppercase tracking-[0.04em] text-[#58671b]">Attachment</div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <AttachmentSummaryItem title="DC Attachment" url={detail.dc_file_url} filename={detail.dc_original_name} />
                <AttachmentSummaryItem title="IR Attachment" url={detail.ir_file_url} filename={detail.ir_original_name} />
                <AttachmentSummaryItem title="SNR Attachment" url={detail.snr_file_url} filename={detail.snr_original_name} />
              </div>
            </div>

            <div className="mt-7 overflow-hidden rounded-[18px] border border-[#e9e1c9]">
              <table className="w-full border-collapse text-[13px]">
                <thead className="bg-[#f3eed8] text-[#6d741f]">
                  <tr>
                    <th className="border border-[#e7dfc9] px-3 py-3 text-left font-bold">S.No</th>
                    <th className="border border-[#e7dfc9] px-3 py-3 text-center font-bold">Item Details</th>
                    <th className="border border-[#e7dfc9] px-3 py-3 text-center font-bold">Item QTY</th>
                    <th className="border border-[#e7dfc9] px-3 py-3 text-center font-bold">Stock QTY</th>
                    <th className="border border-[#e7dfc9] px-3 py-3 text-center font-bold">Delivery Date</th>
                    <th className="border border-[#e7dfc9] px-3 py-3 text-center font-bold">Installation Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.items || []).length ? (
                    (detail.items || []).map((item, index) => (
                      <tr key={`${item.item_code}-${index}`} className="bg-white">
                        <td className="border border-[#ece5d0] px-3 py-3 align-top text-center">{index + 1}</td>
                        <td className="border border-[#ece5d0] px-4 py-3 align-top">
                          <div className="font-bold uppercase text-[#1e2430]">{item.item_code || "-"}</div>
                          <div className="mt-1 text-[13px] leading-6 text-[#37404a]">{item.product || "-"}</div>
                        </td>
                        <td className="border border-[#ece5d0] px-3 py-3 align-top text-center">{item.item_qty || "-"}</td>
                        <td className="border border-[#ece5d0] px-3 py-3 align-top text-center">{item.stock_qty || "-"}</td>
                        <td className="border border-[#ece5d0] px-3 py-3 align-top text-center">{item.delivery_date || "-"}</td>
                        <td className="border border-[#ece5d0] px-3 py-3 align-top text-center">{item.installation_date || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="border border-[#ece5d0] px-3 py-5 text-center text-ink-secondary">
                        No items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[22px] border border-[#ece4cf] bg-white px-5 py-6 shadow-[0_12px_28px_rgba(115,103,56,0.05)] md:px-6">
            <div className={sectionEyebrowCls}>Vendor Details</div>
            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-4">
                <SummaryRow label="Engineer Type" value={vendorEngineerType} />
                <SummaryRow label="Engineer Name" value={vendorEngineerName} />
                <SummaryRow label="Installation Date" value={vendorInstallationDate} />
              </div>
              <div className="space-y-4">
                <SummaryRow label="Rate" value={vendorRate} />
                <SummaryRow label="Total Amount" value={vendorTotalAmount} />
                <SummaryRow label="Assign No" value={vendorAssignNo} bold />
              </div>
              <div className="space-y-4">
                <SummaryRow label="Assign Date" value={vendorAssignDate} />
                <SummaryRow label="Time Line" value={vendorTimeline} />
                <SummaryRow label="GST" value={vendorGst} />
              </div>
            </div>

            <div className="mt-10">
              <div className="mb-3 text-[14px] font-semibold text-[#252b31]">Document Uploads</div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px', flexWrap: 'nowrap' }}>
                <DocCheckbox label="DC" checked={form.documents_type} disabled={checkboxLock.dc} onChange={(checked) => toggleDoc("documents_type", checked)} />
                {showIrDocumentFamily ? <DocCheckbox label="IR" checked={form.documents_type1} disabled={checkboxLock.ir} onChange={(checked) => toggleDoc("documents_type1", checked)} /> : null}
                {showIrDocumentFamily ? <DocCheckbox label="SNR" checked={form.documents_type2} disabled={checkboxLock.snr} onChange={(checked) => toggleDoc("documents_type2", checked)} /> : null}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                {form.documents_type ? (
                  <>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">DC Received Status</span>
                      <SearchableSelectInput name="dc_received_sts" value={form.dc_received_sts} disabled={fieldLock.dcStatus} onChange={(e) => setField("dc_received_sts", e.target.value)} className={inputCls}>
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </SearchableSelectInput>
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">DC Customer Signed Date</span>
                      <input name="dc_cus_signed_date" type="date" value={form.dc_cus_signed_date} disabled={fieldLock.dcDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setField("dc_cus_signed_date", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">DC Signed Proof</span>
                      <input name="dc_file" type="file" accept="application/pdf" disabled={fieldLock.dcFile} onChange={(e) => setField("dc_file", e.target.files?.[0] || null)} className={inputCls} />
                      <div className="mt-2"><FileLink url={detail.dc_file_url} label={detail.dc_original_name || "View DC file"} /></div>
                    </div>
                  </>
                ) : null}

                {form.documents_type1 ? (
                  <>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">IR Received Status</span>
                      <SearchableSelectInput name="ir_rec_status" value={form.ir_rec_status} disabled={fieldLock.irStatus} onChange={(e) => setField("ir_rec_status", e.target.value)} className={inputCls}>
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </SearchableSelectInput>
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">IR Customer Signed Date</span>
                      <input name="ir_cus_signed_date" type="date" value={form.ir_cus_signed_date} disabled={fieldLock.irDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setField("ir_cus_signed_date", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">IR Signed Proof</span>
                      <input name="ir_file" type="file" accept="application/pdf" disabled={fieldLock.irFile} onChange={(e) => setField("ir_file", e.target.files?.[0] || null)} className={inputCls} />
                      <div className="mt-2"><FileLink url={detail.ir_file_url} label={detail.ir_original_name || "View IR file"} /></div>
                    </div>
                  </>
                ) : null}

                {form.documents_type2 ? (
                  <>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">SNR Received Status</span>
                      <SearchableSelectInput name="snr_rec_status" value={form.snr_rec_status} disabled={fieldLock.snrStatus} onChange={(e) => setField("snr_rec_status", e.target.value)} className={inputCls}>
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </SearchableSelectInput>
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">SNR Customer Signed Date</span>
                      <input name="snr_cus_signed_date" type="date" value={form.snr_cus_signed_date} disabled={fieldLock.snrDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setField("snr_cus_signed_date", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">SNR Signed Proof</span>
                      <input name="snr_file" type="file" accept="application/pdf" disabled={fieldLock.snrFile} onChange={(e) => setField("snr_file", e.target.files?.[0] || null)} className={inputCls} />
                      <div className="mt-2"><FileLink url={detail.snr_file_url} label={detail.snr_original_name || "View SNR file"} /></div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[#ece4cf] pt-4">
              {!isReadOnlyMode ? (
                <button type="submit" disabled={saving} className="cursor-pointer rounded-xl border-0 bg-brand-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Saving..." : isEdit ? "Update" : "Save"}
                </button>
              ) : null}
              <button type="button" onClick={() => navigate(returnPath)} className="cursor-pointer rounded-xl border border-[#d6cfbb] bg-white px-6 py-2.5 text-[13px] font-semibold text-ink-secondary transition-colors hover:border-brand-500 hover:text-brand-500">
                {isReadOnlyMode ? "Back" : "Cancel"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


