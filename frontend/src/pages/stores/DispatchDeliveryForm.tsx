import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchDispatchDeliveryDetail,
  updateDispatchDelivery,
  type DispatchDeliveryDetail,
} from "../../api/dispatchApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";

const emptyDetail: DispatchDeliveryDetail = {
  po_num: "",
  po_date: "",
  invoice_no: "",
  invoice_date: "",
  dc_no: "",
  dc_date: "",
  customer_name: "",
  customer_address: "",
  customer_district: "",
  customer_state: "",
  customer_pincode: "",
  customer_contact: "",
  customer_email: "",
  consignee_name: "",
  consignee_address: "",
  consignee_district: "",
  consignee_state: "",
  consignee_pincode: "",
  consignee_contact: "",
  consignee_landline: "",
  dispatch_date: "",
  mode_of_delivery: "",
  name_of_courier: "",
  pod_no: "",
  delivery_status: "",
  delivery_date: "",
  delivery_proof: "",
  pod_proof: "",
  delivery_proof_url: "",
  pod_proof_url: "",
  po_form_unique_id: "",
  consignee_unique_id: "",
  unique_id: "",
};

function FileLink({ url, label }: { url?: string; label?: string }) {
  if (!url) return <span className="text-[12px] text-ink-muted">No file uploaded</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-[12px] text-brand-600 hover:underline">
      {label || "View"}
    </a>
  );
}

export default function DispatchDeliveryForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uniqueId = params.get("unique_id") || "";
  const consigneeId = params.get("consignee_unique_id") || "";
  const dcNo = params.get("dc_no") || "";

  const [detail, setDetail] = useState<DispatchDeliveryDetail>(emptyDetail);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [podProof, setPodProof] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!uniqueId || !consigneeId || !dcNo) {
        setLoading(false);
        await showErrorAlert("Delivery record parameters are missing.");
        navigate("/stores/dispatch/list");
        return;
      }
      setLoading(true);
      try {
        const res = await fetchDispatchDeliveryDetail({
          unique_id: uniqueId,
          consignee_unique_id: consigneeId,
          dc_no: dcNo,
        });
        if (!active) return;
        if (!res.status) throw new Error(res.error || "Failed to load delivery details.");
        setDetail(res.data);
        const rawDate = res.data.delivery_date || "";
        if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
          const [dd, mm, yyyy] = rawDate.split("-");
          setDeliveryDate(`${yyyy}-${mm}-${dd}`);
        } else {
          setDeliveryDate(rawDate);
        }
      } catch (error) {
        if (!active) return;
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load delivery details.");
        navigate("/stores/dispatch/list");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [uniqueId, consigneeId, dcNo, navigate]);

  const modeLabel = detail.mode_of_delivery === "1" ? "Hand" : detail.mode_of_delivery === "2" ? "Courier" : detail.mode_of_delivery;
  const deliveryStatusLabel = detail.delivery_status === "1" ? "Yes" : detail.delivery_status || "-";

  const handleSave = async () => {
    if (!deliveryDate) {
      await showErrorAlert("Please select delivery date.");
      return;
    }
    const payload = new FormData();
    payload.append("delivery_date", deliveryDate);
    payload.append("dc_no", detail.dc_no || dcNo);
    payload.append("po_form_unique_id", detail.po_form_unique_id || uniqueId);
    payload.append("consignee_unique_id", detail.consignee_unique_id || consigneeId);
    payload.append("my_no", detail.invoice_no || "");
    if (podProof) payload.append("podfile", podProof);

    setSaving(true);
    try {
      const res = await updateDispatchDelivery(payload);
      if (!res.status) throw new Error(res.error || res.message || "Failed to update delivery details.");
      await showSuccessAlert("Delivery details updated successfully.");
      navigate("/stores/dispatch/list");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to update delivery details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-ink-secondary">Loading delivery details...</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
      <PageTopbar title="Dispatch" breadcrumbs={["Stores", "Dispatch", "Delivery"]} />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
        <div className="grid grid-cols-1 gap-6 border-b border-[#e6eadb] bg-[linear-gradient(135deg,#fbfcf7_0%,#f1f5e4_100%)] p-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-[12px] uppercase text-ink-muted">Customer Details</p>
            <h2 className="text-[18px] font-bold text-[#3d5a20]">{detail.customer_name || "-"}</h2>
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              {[detail.customer_address, detail.customer_district, detail.customer_state, detail.customer_pincode].filter(Boolean).join(", ")}
            </p>
            <p className="text-[13px] text-ink flex items-center gap-2 mt-2">
              <i className="fa fa-phone text-[11px] text-ink-muted" />
              {detail.customer_contact || "--"}
            </p>
            <p className="text-[13px] text-ink flex items-center gap-2">
              <i className="fa fa-envelope text-[11px] text-ink-muted" />
              {detail.customer_email || "--"}
            </p>
          </div>

          <div>
            <p className="text-[12px] uppercase text-ink-muted">Consignee Details</p>
            <h2 className="text-[18px] font-bold text-[#3d5a20]">{detail.consignee_name || "-"}</h2>
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              {[detail.consignee_address, detail.consignee_district, detail.consignee_state, detail.consignee_pincode].filter(Boolean).join(", ")}
            </p>
            <p className="text-[13px] text-ink flex items-center gap-2 mt-2">
              <i className="fa fa-phone text-[11px] text-ink-muted" />
              {detail.consignee_contact || "--"}
            </p>
            <p className="text-[13px] text-ink flex items-center gap-2">
              <i className="fa fa-phone text-[11px] text-ink-muted" />
              {detail.consignee_landline || "--"}
            </p>
          </div>

          <div>
            <p className="text-[12px] uppercase text-ink-muted">PO &amp; Invoice Details</p>
            {[
              { label: "PO Number", value: detail.po_num },
              { label: "PO Date", value: detail.po_date },
              { label: "Invoice No", value: detail.invoice_no },
              { label: "Invoice Date", value: detail.invoice_date },
              { label: "DC Number", value: detail.dc_no },
              { label: "DC Date", value: detail.dc_date },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2 text-[13px] mb-1">
                <span className="w-24 text-ink-muted">{label}</span>
                <span className="text-ink-muted">:</span>
                <span className="text-ink font-medium">{value || "-"}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[12px] uppercase text-ink-muted">Dispatch Details</p>
            {[
              { label: "Dispatch Date", value: detail.dispatch_date },
              { label: "Mode of Delivery", value: modeLabel },
              { label: "Courier / Person Name", value: detail.name_of_courier },
              { label: "POD No.", value: detail.pod_no },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2 text-[13px] mb-1">
                <span className="w-28 text-ink-muted">{label}</span>
                <span className="text-ink-muted">:</span>
                <span className="text-ink font-medium">{value || "-"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-[#445131]">Delivery Status</span>
            <input name="deliverystatuslabel"
              value={deliveryStatusLabel}
              readOnly
              className="h-12 w-full rounded-2xl border border-[#d7dec7] bg-gray-50 px-4 text-[13px] shadow-sm"
            />
          </div>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-[#445131]">Delivery Date</span>
            <input name="deliverydate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#d7dec7] bg-white px-4 text-[13px] shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-[#445131]">Delivery Proof</span>
            <div className="pt-2">
              <FileLink url={detail.delivery_proof_url} label={detail.delivery_proof || "View"} />
            </div>
          </div>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-[#445131]">POD Attachment</span>
            <input name="dispatchdeliveryform_input_241"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setPodProof(e.target.files?.[0] || null)}
              className="w-full rounded-2xl border border-dashed border-[#cfd8bd] bg-[#fbfcf7] px-4 py-3 text-[13px] shadow-sm"
            />
          </div>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-[#445131]">&nbsp;</span>
            <div className="pt-2">
              <FileLink url={detail.pod_proof_url} label={detail.pod_proof || "View"} />
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-3 border-t border-[#e6eadb] bg-[#fafbf7] px-6 py-5">
          <button
            type="button"
            onClick={() => navigate("/stores/dispatch/list")}
            className="rounded-2xl bg-[#ff6b4a] px-6 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(255,107,74,0.22)] transition-colors hover:bg-[#f05531]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-2xl bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(79,122,43,0.22)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
