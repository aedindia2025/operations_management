import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import { createDispatch } from "../../api/dispatchApi";
import { fetchInvoiceDetail, type InvoiceDetail } from "../../api/invoiceApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";

const emptyDetail: InvoiceDetail = {
  unique_id: "",
  source_unique_id: "",
  form_main_unique_id: "",
  po_unique_id: "",
  po_num: "",
  po_date: "",
  stock_id: "",
  stock_date: "",
  department: "",
  department_display: "",
  gst_option: "",
  customer_name: "",
  customer_details: "",
  district_name: "",
  state_name: "",
  customer_location: "",
  executive_name: "",
  executive_display: "",
  team_member: "",
  billing_address: "",
  billing_gst_no: "",
  consignee_name: "",
  consignee_address: "",
  branch: "",
  branch_code: "",
  zone: "",
  pincode: "",
  contact_name: "",
  contact_number: "",
  alternate_contact_name: "",
  alternate_contact_number: "",
  consignee_gst_no: "",
  email: "",
  ledger_name: "",
  ledger_display: "",
  ledger_no: "",
  invoice_auto_id: "",
  dc_number: "",
  dc_date: "",
  invoice_no: "",
  invoice_date: "",
  invoice_qty: 0,
  invoice_value: "0",
  invoice_doc_status: "0",
  doc_approval_sts: "0",
  acc_team_status: "0",
  approved_by: "",
  reject_reason_elcot: "",
  po_file_url: "",
  dc_file_url: "",
  ir_file_url: "",
  invoice_file_url: "",
  dc_original_name: "",
  ir_original_name: "",
  invoice_original_name: "",
  items: [],
};

export default function DispatchForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sourceId = params.get("source") || params.get("unique_id") || "";
  const consigneeId = params.get("consignee") || params.get("consignee_unique_id") || "";
  const dcNo = params.get("dc") || params.get("dc_no") || "";
  const [detail, setDetail] = useState<InvoiceDetail>(emptyDetail);
  const effectiveDcNo = detail.dc_number || dcNo;
  const requiresEinvoiceUpload = String(detail.gst_option || "").trim().toLowerCase() === "yes";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dispatch_date: "",
    mode_of_delivery: "",
    courier_name: "",
    pod_no: "",
    invoice_file: null as File | null,
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!sourceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetchInvoiceDetail(sourceId);
        if (!mounted) return;
        setDetail(res.data);
      } catch {
        if (mounted) await showErrorAlert("Failed to load dispatch details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [sourceId]);

  const isValid = useMemo(() => Boolean(sourceId && consigneeId && detail.unique_id), [consigneeId, detail.unique_id, sourceId]);

  const handleChange = (field: keyof typeof form, value: string | File | null) => {
    setForm((prev) => {
      if (field === "mode_of_delivery") {
        return { ...prev, mode_of_delivery: value as string, pod_no: value === "1" ? "" : prev.pod_no };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSave = async () => {
    if (!isValid) {
      await showErrorAlert("Dispatch source details are missing.");
      return;
    }
    if (!form.dispatch_date) {
      await showErrorAlert("Please select dispatch date.");
      return;
    }
    if (form.mode_of_delivery === "2" && !form.pod_no.trim()) {
      await showErrorAlert("Please enter POD number.");
      return;
    }
    if (requiresEinvoiceUpload && !form.invoice_file) {
      await showErrorAlert("Please upload E Invoice file.");
      return;
    }

    const payload = new FormData();
    payload.append("po_num", detail.po_num || "");
    payload.append("po_date", detail.po_date || "");
    payload.append("con_contact_name", detail.consignee_name || detail.contact_name || "");
    payload.append("con_address", detail.consignee_address || "");
    payload.append("con_contact_number", detail.contact_number || "");
    payload.append("invoice_date", detail.invoice_date || "");
    payload.append("invoice_no", detail.invoice_no || "");
    payload.append("dc_no", effectiveDcNo || "");
    payload.append("dc_date", detail.dc_date || "");
    payload.append("invoice_auto_id", detail.invoice_auto_id || "");
    payload.append("stock_id", detail.stock_id || "");
    payload.append("dispatch_date", form.dispatch_date);
    payload.append("mode_of_delivery", form.mode_of_delivery);
    payload.append("name_of_courier", form.courier_name);
    payload.append("pod_no", form.pod_no);
    payload.append("po_unique_id", detail.po_unique_id || "");
    payload.append("po_form_unique_id", detail.form_main_unique_id || "");
    payload.append("consignee_unique_id", consigneeId);
    payload.append("my_no", detail.po_num || "");
    if (form.invoice_file) payload.append("file", form.invoice_file);

    setSaving(true);
    try {
      await createDispatch(payload);
      await showSuccessAlert("Dispatch saved successfully.");
      navigate("/stores/dispatch/list");
    } catch (err: any) {
      await showErrorAlert(err?.response?.data?.message || err?.response?.data?.msg || "Failed to save dispatch.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-ink-secondary">Loading dispatch details...</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
      <PageTopbar title="Dispatch" breadcrumbs={["Stores", "Dispatch", "Add"]} />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
        <div className="grid grid-cols-1 gap-6 border-b border-[#e6eadb] bg-[linear-gradient(135deg,#fbfcf7_0%,#f1f5e4_100%)] p-6 xl:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-gray-500">Customer Details</p>
            <h2 className="text-lg font-bold text-green-700">{detail.customer_name || detail.department_display || "-"}</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {detail.billing_address || detail.customer_details || "-"}
            </p>
            <p className="text-sm text-gray-600">{detail.customer_location || "-"}</p>
            <p className="text-sm text-gray-600">{detail.contact_number || "-"}</p>
            <p className="text-sm text-gray-600 break-all">{detail.email || "-"}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Consignee Details</p>
            <h2 className="text-lg font-bold text-green-700">
              {detail.consignee_name || detail.contact_name || "-"}
            </h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">{detail.consignee_address || "-"}</p>
            <p className="text-sm text-gray-600">
              {[detail.branch, detail.branch_code].filter(Boolean).join(" / ") || "-"}
            </p>
            <p className="text-sm text-gray-600">
              {[detail.zone, detail.pincode].filter(Boolean).join(", ") || "-"}
            </p>
            <p className="text-sm text-gray-600">
              {[detail.contact_number, detail.alternate_contact_number].filter(Boolean).join(" / ") || "-"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-ink-muted uppercase mb-2">PO & Invoice Details</p>
            {[
              { label: "PO Number", value: detail.po_num || "-" },
              { label: "PO Date", value: detail.po_date || "-" },
              { label: "Invoice No", value: detail.invoice_no || "-" },
              { label: "Invoice Date", value: detail.invoice_date || "-" },
              { label: "DC Number", value: detail.dc_number || "-" },
              { label: "DC Date", value: detail.dc_date || "-" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2 mb-1.5">
                <span className="w-32 text-[12.5px] text-ink-secondary">{label}</span>
                <span className="text-ink-muted">:</span>
                <span className="text-[12.5px] text-ink font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${
            form.mode_of_delivery === "2" ? "xl:grid-cols-5" : "xl:grid-cols-4"
          } gap-4 p-6`}
        >
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-[#445131]">Dispatch Date</span>
            <input name="dispatch_date" type="date" value={form.dispatch_date} onChange={(e) => handleChange("dispatch_date", e.target.value)} className="h-12 w-full rounded-2xl border border-[#d7dec7] bg-white px-4 text-[13px] shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10" />
          </div>

          <div>
            <span className="mb-2 block text-[13px] font-semibold text-[#445131]">Mode of Delivery</span>
            <div className="relative">
              <select name="mode_of_delivery"
                value={form.mode_of_delivery}
                onChange={(e) => handleChange("mode_of_delivery", e.target.value)}
                className="h-12 w-full appearance-none rounded-2xl border border-[#d7dec7] bg-white px-4 pr-10 text-[13px] shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="">Select MOD</option>
                <option value="2">Courier</option>
                <option value="1">Hand</option>
              </select>
              <i className="fa fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-[#85794c]" />
            </div>
          </div>

          <div>
            <span className="mb-2 block text-[13px] font-semibold text-[#445131]">Courier / Person</span>
            <input name="courier_name" type="text" value={form.courier_name} onChange={(e) => handleChange("courier_name", e.target.value)} className="h-12 w-full rounded-2xl border border-[#d7dec7] bg-white px-4 text-[13px] shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10" />
          </div>

          {form.mode_of_delivery === "2" && (
            <div>
              <span className="mb-2 block text-[13px] font-semibold text-[#445131]">POD No</span>
              <input name="pod_no" type="text" value={form.pod_no} onChange={(e) => handleChange("pod_no", e.target.value)} className="h-12 w-full rounded-2xl border border-brand-500 bg-white px-4 text-[13px] shadow-sm outline-none focus:ring-2 focus:ring-brand-500/10" />
            </div>
          )}

          <div>
            <span className="mb-2 block text-[13px] font-semibold text-[#445131]">
              E Invoice{requiresEinvoiceUpload ? " *" : ""}
            </span>
            <div
              className={`rounded-2xl border border-dashed px-4 py-3 text-[13px] shadow-sm ${
                requiresEinvoiceUpload && !form.invoice_file
                  ? "border-red-400 bg-red-50/60"
                  : "border-[#cfd8bd] bg-[#fbfcf7]"
              }`}
            >
              <input name="invoice_file" type="file" accept=".pdf,application/pdf" onChange={(e) => handleChange("invoice_file", e.target.files?.[0] || null)} className="block w-full" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#e6eadb] bg-[#fafbf7] px-6 py-5">
          <button onClick={() => navigate("/stores/dispatch/list")} className="rounded-2xl bg-[#ff6b4a] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(255,107,74,0.22)] transition-colors hover:bg-[#f05531]">
            Close
          </button>
          <button onClick={handleSave} disabled={saving} className="rounded-2xl bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(79,122,43,0.22)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


