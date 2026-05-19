import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import { fetchInstallationDispatchDetail, saveInstallationDispatch, type InstallationDispatchDetail } from "../../api/installationApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

const inputCls = "w-full rounded-lg border border-line-dark bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-80";
const dispatchOptions = ["Hand Delivery", "Courier", "Transporter", "Soft Copy"];
const validTabs = new Set(["pending", "uploaded", "dcir_pending", "dcir_completed"]);
const emptyForm = {
  dc_dispatch_mode: "", name_of_courier: "", dc_pod_no: "", dc_pod_date: "",
  ir_dispatch_mode: "", ins_name_of_courier: "", ir_pod_no: "", ir_pod_date: "",
  snr_dispatch_mode: "", snr_name_courier: "", snr_pod_no: "", snr_pod_date: "",
  without_snr: false,
};
type DispatchFormState = typeof emptyForm;
const normalizeTab = (value: string | null, fallback: string) => validTabs.has(value || "") ? (value as string) : fallback;
const toInputDate = (value?: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) { const [dd, mm, yyyy] = value.split("-"); return `${yyyy}-${mm}-${dd}`; }
  return value;
};
const hidePod = (mode: string) => mode === "Hand Delivery" || mode === "Soft Copy";
const needPod = (mode: string) => mode === "Courier" || mode === "Transporter";
const readValue = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "-";
};
const buildAddress = (...parts: Array<string | null | undefined>) => {
  const values = parts.map((item) => String(item ?? "").trim()).filter(Boolean);
  return values.length ? values.join("\n") : "-";
};
function ContactLine({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-[14px] leading-6 text-[#2c3238]">
      <i className={`fa ${icon} mt-1 text-[#6d741f]`} />
      <span>{value}</span>
    </div>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}
function Attachment({ label, url }: { label: string; url?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-4 text-[13px]">
      <div className="mb-3 font-semibold text-ink-secondary">{label}</div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-red-500 transition-colors hover:bg-red-50"
          title="Open PDF"
          aria-label={`Open ${label}`}
        >
          <i className="fa fa-file-pdf text-[16px]" />
          <span className="text-[12px] font-medium">Open PDF</span>
        </a>
      ) : (
        <span className="text-ink-muted">No attachment</span>
      )}
    </div>
  );
}
function Section({ title, visible, readOnly, mode, courier, podNo, podDate, onMode, onCourier, onPodNo, onPodDate }: { title: string; visible: boolean; readOnly: boolean; mode: string; courier: string; podNo: string; podDate: string; onMode: (v: string) => void; onCourier: (v: string) => void; onPodNo: (v: string) => void; onPodDate: (v: string) => void; }) {
  if (!visible) return null;
  return <div className="rounded-lg border border-line p-4"><div className="mb-4 text-[14px] font-semibold text-brand-700">{title}</div><div className={`grid grid-cols-1 gap-4 ${hidePod(mode) ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}><div><span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">Dispatch Mode</span><SearchableSelectInput name="mode" value={mode} disabled={readOnly} onChange={(e) => onMode(e.target.value)} className={inputCls}><option value="">Select Dispatch Mode</option>{dispatchOptions.map((item) => <option key={item} value={item}>{item}</option>)}</SearchableSelectInput></div><div><span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">Name of the Person/Courier or Transporter Name</span><input name="courier" value={courier} disabled={readOnly} onChange={(e) => onCourier(e.target.value)} className={inputCls} /></div>{hidePod(mode) ? null : <div><span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">POD No.</span><input name="podno" value={podNo} disabled={readOnly} onChange={(e) => onPodNo(e.target.value)} className={inputCls} /></div>}<div><span className="mb-1.5 block text-[12.5px] font-semibold text-ink-secondary">POD Date</span><input name="poddate" type="date" value={podDate} max={new Date().toISOString().slice(0, 10)} disabled={readOnly} onChange={(e) => onPodDate(e.target.value)} className={inputCls} /></div></div></div>;
}
export default function InstallationDispatchForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const readOnly = searchParams.get("mode") === "view";
  const activeTab = normalizeTab(searchParams.get("tab"), readOnly ? "dcir_completed" : "dcir_pending");
  const returnPath = `/service/installation/list?tab=${activeTab}`;
  const [detail, setDetail] = useState<InstallationDispatchDetail | null>(null);
  const [form, setForm] = useState<DispatchFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const load = async () => {
      if (!id) { setError("Installation dispatch record is missing."); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const res = await fetchInstallationDispatchDetail(id);
        const row = res.data;
        setDetail(row);
        setForm({ dc_dispatch_mode: row.dc_dispatch_mode || "", name_of_courier: row.name_of_courier || "", dc_pod_no: row.dc_pod_no || "", dc_pod_date: toInputDate(row.dc_pod_date), ir_dispatch_mode: row.ir_dispatch_mode || "", ins_name_of_courier: row.ins_name_of_courier || "", ir_pod_no: row.ir_pod_no || "", ir_pod_date: toInputDate(row.ir_pod_date), snr_dispatch_mode: row.snr_dispatch_mode || "", snr_name_courier: row.snr_name_courier || "", snr_pod_no: row.snr_pod_no || "", snr_pod_date: toInputDate(row.snr_pod_date), without_snr: row.without_snr });
      } catch (err: any) { setError(err?.response?.data?.message || "Failed to load installation dispatch details."); }
      finally { setLoading(false); }
    };
    void load();
  }, [id]);
  const canSkipSnr = useMemo(() => detail?.documents_type1 === "IR" && detail?.documents_type2 === "SNR", [detail?.documents_type1, detail?.documents_type2]);
  const snrSkipped = canSkipSnr && (detail?.without_snr || form.without_snr);
  const validate = () => {
    if (!detail) return "Installation dispatch detail is missing.";
    const parts = [
      { visible: detail.documents_type === "DC", label: "DC", mode: form.dc_dispatch_mode, podNo: form.dc_pod_no, podDate: form.dc_pod_date, courier: form.name_of_courier },
      { visible: detail.documents_type1 === "IR", label: "IR", mode: form.ir_dispatch_mode, podNo: form.ir_pod_no, podDate: form.ir_pod_date, courier: form.ins_name_of_courier },
      { visible: detail.documents_type2 === "SNR" && !snrSkipped, label: "SNR", mode: form.snr_dispatch_mode, podNo: form.snr_pod_no, podDate: form.snr_pod_date, courier: form.snr_name_courier },
    ];
    let filled = 0;
    for (const part of parts) {
      if (!part.visible) continue;
      if (!(part.mode || part.podNo || part.podDate || part.courier)) continue;
      filled += 1;
      if (!part.mode) return `${part.label} dispatch mode is required.`;
      if (!part.podDate) return `${part.label} POD date is required.`;
      if (needPod(part.mode) && !part.podNo.trim()) return `${part.label} POD number is required.`;
    }
    return filled ? "" : "Enter at least one dispatch detail.";
  };
  const save = async () => {
    const validation = validate();
    if (validation) { await showErrorAlert(validation); return; }
    if (!detail || !id) return;
    setSaving(true);
    try {
      await saveInstallationDispatch(id, {
        dc_dispatch_mode: form.dc_dispatch_mode, name_of_courier: form.name_of_courier, dc_pod_no: hidePod(form.dc_dispatch_mode) ? "" : form.dc_pod_no, dc_pod_date: form.dc_pod_date,
        ir_dispatch_mode: form.ir_dispatch_mode, ins_name_of_courier: form.ins_name_of_courier, ir_pod_no: hidePod(form.ir_dispatch_mode) ? "" : form.ir_pod_no, ir_pod_date: form.ir_pod_date,
        snr_dispatch_mode: snrSkipped ? "" : form.snr_dispatch_mode, snr_name_courier: snrSkipped ? "" : form.snr_name_courier, snr_pod_no: snrSkipped || hidePod(form.snr_dispatch_mode) ? "" : form.snr_pod_no, snr_pod_date: snrSkipped ? "" : form.snr_pod_date,
        without_snr: canSkipSnr && form.without_snr ? "on" : detail.without_snr ? "on" : "",
      });
      await showSuccessAlert("Installation dispatch updated successfully.");
      navigate(returnPath);
    } catch (err: any) { await showErrorAlert(err?.response?.data?.message || "Failed to save installation dispatch."); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="p-6 text-[13px] text-ink-secondary">Loading installation dispatch details...</div>;
  if (error || !detail) return <div className="p-6"><PageTopbar title="Installation Dispatch" breadcrumbs={["Service", "Installation", "Dispatch"]} /><div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error || "Record not found."}</div></div>;
  const customerAddress = buildAddress(detail.bill_address, detail.customer_district || detail.district, detail.customer_state || detail.state);
  const consigneeAddress = buildAddress(detail.con_address, detail.district, detail.state, detail.con_pincode);
  return (
    <div className="p-6">
      <PageTopbar title={readOnly ? "Installation Dispatch View" : "Installation Dispatch"} breadcrumbs={["Service", "Installation", readOnly ? "Dispatch View" : "Dispatch"]} />
      <div className="w-full rounded-xl border border-line bg-white shadow-card">
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-3 text-[13px]">
              <div className="text-[12px] font-semibold text-ink-secondary">CUSTOMER DETAILS</div>
              <div className="text-[16px] font-bold uppercase text-ink">{detail.ledger_name || "-"}</div>
              <div className="whitespace-pre-line text-ink-secondary">{customerAddress}</div>
              <ContactLine icon="fa-phone" value={readValue(detail.customer_phone)} />
              <ContactLine icon="fa-envelope" value={readValue(detail.customer_email)} />
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="text-[12px] font-semibold text-ink-secondary">CONSIGNEE DETAILS</div>
              <div className="text-[16px] font-bold text-ink">{detail.consignee_name || "-"}</div>
              <div className="whitespace-pre-line text-ink-secondary">{consigneeAddress}</div>
              <ContactLine icon="fa-phone" value={readValue(detail.consignee_phone)} />
            </div>
            <div className="space-y-2 text-[13px]">
              {[
                { label: "PO Number", value: readValue(detail.po_num) },
                { label: "PO Date", value: readValue(detail.po_date) },
                { label: "Invoice No", value: readValue(detail.invoice_no) },
                { label: "Invoice Date", value: readValue(detail.invoice_date) },
                { label: "DC Number", value: readValue(detail.dc_number) },
                { label: "DC Date", value: readValue(detail.dc_date) },
                { label: "Installation Date", value: readValue(detail.installation_com_date) },
              ].map((item) => <SummaryRow key={item.label} label={item.label} value={item.value} />)}
            </div>
          </div>
          <div><div className="mb-3 text-[13px] font-semibold text-ink-secondary">Attachments</div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"><Attachment label="PO Attachment" url={detail.po_file_url} /><Attachment label="DC Attachment" url={detail.dc_file_url} /><Attachment label="IR Attachment" url={detail.ir_file_url} /><Attachment label="SNR Attachment" url={detail.snr_file_url} /></div></div>
          <div className="overflow-hidden rounded-lg border border-line"><table className="w-full border-collapse text-[12px]"><thead className="bg-surface-2"><tr><th className="border border-line px-3 py-2 text-left">S.No</th><th className="border border-line px-3 py-2 text-left">Item Details</th><th className="border border-line px-3 py-2 text-center">Item QTY</th><th className="border border-line px-3 py-2 text-center">Stock QTY</th><th className="border border-line px-3 py-2 text-center">Delivery Date</th><th className="border border-line px-3 py-2 text-center">Installation Date</th></tr></thead><tbody>{(detail.items || []).length ? (detail.items || []).map((item, index) => <tr key={`${item.item_code}-${index}`}><td className="border border-line px-3 py-2 text-center">{index + 1}</td><td className="border border-line px-3 py-2"><div className="font-semibold text-ink">{item.item_code || "-"}</div><div className="text-[11px] text-ink-secondary">{item.product || "-"}</div></td><td className="border border-line px-3 py-2 text-center">{item.item_qty || "-"}</td><td className="border border-line px-3 py-2 text-center">{item.stock_qty || "-"}</td><td className="border border-line px-3 py-2 text-center">{item.delivery_date || "-"}</td><td className="border border-line px-3 py-2 text-center">{item.installation_date || "-"}</td></tr>) : <tr><td colSpan={6} className="border border-line px-3 py-3 text-center text-ink-secondary">No items found.</td></tr>}</tbody></table></div>
          {canSkipSnr ? <label className="inline-flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 text-[13px] font-semibold text-brand-700"><input name="installationdispatchform_input_180" type="checkbox" checked={detail.without_snr || form.without_snr} disabled={readOnly || detail.without_snr} onChange={(e) => setForm((prev) => ({ ...prev, without_snr: e.target.checked }))} /> Processed Skip SNR</label> : null}
          <div className="space-y-4">
            <Section title="Delivery Document" visible={detail.documents_type === "DC"} readOnly={readOnly} mode={form.dc_dispatch_mode} courier={form.name_of_courier} podNo={form.dc_pod_no} podDate={form.dc_pod_date} onMode={(v) => setForm((prev) => ({ ...prev, dc_dispatch_mode: v, dc_pod_no: hidePod(v) ? "" : prev.dc_pod_no }))} onCourier={(v) => setForm((prev) => ({ ...prev, name_of_courier: v }))} onPodNo={(v) => setForm((prev) => ({ ...prev, dc_pod_no: v }))} onPodDate={(v) => setForm((prev) => ({ ...prev, dc_pod_date: v }))} />
            <Section title="Installation Document" visible={detail.documents_type1 === "IR"} readOnly={readOnly} mode={form.ir_dispatch_mode} courier={form.ins_name_of_courier} podNo={form.ir_pod_no} podDate={form.ir_pod_date} onMode={(v) => setForm((prev) => ({ ...prev, ir_dispatch_mode: v, ir_pod_no: hidePod(v) ? "" : prev.ir_pod_no }))} onCourier={(v) => setForm((prev) => ({ ...prev, ins_name_of_courier: v }))} onPodNo={(v) => setForm((prev) => ({ ...prev, ir_pod_no: v }))} onPodDate={(v) => setForm((prev) => ({ ...prev, ir_pod_date: v }))} />
            <Section title="Signed Document" visible={detail.documents_type2 === "SNR" && !snrSkipped} readOnly={readOnly} mode={form.snr_dispatch_mode} courier={form.snr_name_courier} podNo={form.snr_pod_no} podDate={form.snr_pod_date} onMode={(v) => setForm((prev) => ({ ...prev, snr_dispatch_mode: v, snr_pod_no: hidePod(v) ? "" : prev.snr_pod_no }))} onCourier={(v) => setForm((prev) => ({ ...prev, snr_name_courier: v }))} onPodNo={(v) => setForm((prev) => ({ ...prev, snr_pod_no: v }))} onPodDate={(v) => setForm((prev) => ({ ...prev, snr_pod_date: v }))} />
          </div>
          <div className="flex justify-end gap-3 border-t border-line pt-2"><button type="button" onClick={() => navigate(returnPath)} className="cursor-pointer rounded-lg border border-line-dark bg-white px-6 py-2.5 text-[13px] font-semibold text-ink-secondary transition-colors hover:border-brand-500 hover:text-brand-500">Cancel</button>{readOnly ? null : <button type="button" disabled={saving} onClick={save} className="cursor-pointer rounded-lg border-0 bg-brand-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : detail.dispatch_unique_id ? "Update" : "Save"}</button>}</div>
        </div>
      </div>
    </div>
  );
}


