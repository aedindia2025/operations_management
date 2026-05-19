import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { fetchEngineerNameOptions } from "../../api/serviceEngineerApi";
import { fetchVendorCreationList } from "../../api/vendorCreationApi";
import { fetchUserList } from "../../api/userApi";
import { createOnsiteEngineerPayment } from "../../api/onsiteEngineerPaymentApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";

type EngineerType = "" | "own-engineer" | "outsource-vendor" | "inhouse";
type Option = { unique_id: string; label: string };

function money(value: number) {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function OnsiteEngineerPaymentForm() {
  const navigate = useNavigate();
  const [engineerType, setEngineerType] = useState<EngineerType>("");
  const [engineerId, setEngineerId] = useState("");
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [servicesCharges, setServicesCharges] = useState("");
  const [rate, setRate] = useState("");
  const [gstType, setGstType] = useState<"" | "with_gst" | "without_gst">("");
  const [billCopy, setBillCopy] = useState<File | null>(null);
  const [poCopy, setPoCopy] = useState<File | null>(null);
  const [engineers, setEngineers] = useState<Option[]>([]);
  const [vendors, setVendors] = useState<Option[]>([]);
  const [users, setUsers] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchEngineerNameOptions(),
      fetchVendorCreationList(),
      fetchUserList({ start: 0, length: 500 }),
    ]).then(([engineerRows, vendorRows, userRows]) => {
      setEngineers((engineerRows ?? []).map((row) => ({ unique_id: row.unique_id, label: row.staff_name })));
      setVendors((vendorRows ?? []).map((row) => ({ unique_id: row.unique_id, label: row.company_name || row.name })));
      setUsers((userRows.data ?? []).map((row) => ({ unique_id: row.unique_id, label: row.staff_name })));
    }).catch(() => {
      setEngineers([]);
      setVendors([]);
      setUsers([]);
    });
  }, []);

  const currentOptions = useMemo(() => {
    if (engineerType === "outsource-vendor") return vendors;
    if (engineerType === "inhouse") return users;
    return engineers;
  }, [engineerType, engineers, users, vendors]);

  const selectedEngineerName = currentOptions.find((option) => option.unique_id === engineerId)?.label || "";
  const rateAmount = Number(String(rate || "0").replace(/,/g, ""));
  const gstPercent = engineerType === "outsource-vendor" && gstType === "with_gst" ? 18 : 0;
  const gstAmount = Number.isFinite(rateAmount) ? (rateAmount * gstPercent) / 100 : 0;
  const totalAmount = (Number.isFinite(rateAmount) ? rateAmount : 0) + gstAmount;

  const validate = async () => {
    if (!engineerType) return "Please select engineer type.";
    if (!engineerId) return "Please select engineer name.";
    if (!fromDate || !toDate) return "Please select from date and to date.";
    if (!servicesCharges.trim()) return "Please enter services charges details.";
    if (!rateAmount || rateAmount <= 0) return "Please enter valid rate.";
    if (engineerType === "outsource-vendor" && !gstType) return "Please select GST type.";
    if (!billCopy) return "Please upload bill copy.";
    if (!poCopy) return "Please upload vendor PO copy.";
    return "";
  };

  const handleSubmit = async () => {
    const validation = await validate();
    if (validation) {
      setError(validation);
      await showErrorAlert(validation);
      return;
    }

    const payload = new FormData();
    payload.append("engineer_type", engineerType);
    payload.append("engineer_id", engineerId);
    payload.append("engineer_name", selectedEngineerName);
    payload.append("from_date", fromDate);
    payload.append("to_date", toDate);
    payload.append("services_charges", servicesCharges);
    payload.append("rate", String(rateAmount));
    payload.append("gst_type", engineerType === "outsource-vendor" ? gstType : "without_gst");
    if (billCopy) payload.append("bill_copy", billCopy);
    if (poCopy) payload.append("vendor_po_copy", poCopy);

    setSaving(true);
    setError("");
    try {
      const res = await createOnsiteEngineerPayment(payload);
      if (!res.status) {
        const message = res.message || "Failed to save onsite engineer payment.";
        setError(message);
        await showErrorAlert(message);
        return;
      }
      await showSuccessAlert("Onsite engineer payment saved successfully.");
      navigate("/vendor/onsite-engineer-payment/list");
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to save onsite engineer payment.";
      setError(message);
      await showErrorAlert(message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-line-dark bg-white px-3 py-2 text-[13px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/15";

  return (
    <div className="min-h-screen bg-[#f7f8ef] p-4 md:p-6">
      <PageTopbar title="Onsite Engineer Payment" breadcrumbs={["Vendor", "Onsite Engineer Payment", "Add"]} />

      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div> : null}

      <div className="rounded-[26px] border border-[#e1dcc8] bg-white p-6 shadow-[0_18px_42px_rgba(84,96,28,0.08)]">
        <div className="grid grid-cols-1 gap-x-14 md:grid-cols-2">
          <div className="space-y-4">
            <span className="block text-[13px] font-semibold text-ink-secondary">Engineer Type</span>
            <SearchableSelectInput name="engineertype" value={engineerType} onChange={(e) => { setEngineerType(e.target.value as EngineerType); setEngineerId(""); setGstType(""); }} className={inputCls}>
              <option value="">Select Engineer Type</option>
              <option value="own-engineer">Own Engineer</option>
              <option value="outsource-vendor">Outsource Vendor</option>
              <option value="inhouse">Inhouse Operation Team</option>
            </SearchableSelectInput>

            <span className="block text-[13px] font-semibold text-ink-secondary">Engineer Name</span>
            <SearchableSelectInput name="engineername" value={engineerId} onChange={(e) => setEngineerId(e.target.value)} className={inputCls}>
              <option value="">Select</option>
              {currentOptions.map((option) => <option key={option.unique_id} value={option.unique_id}>{option.label}</option>)}
            </SearchableSelectInput>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="mb-2 block text-[13px] font-semibold text-ink-secondary">From Date</span>
                <input name="fromdate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <span className="mb-2 block text-[13px] font-semibold text-ink-secondary">To Date</span>
                <input name="todate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
              </div>
            </div>

            <span className="block text-[13px] font-semibold text-ink-secondary">Services Charges</span>
            <textarea
              name="servicescharges"
              value={servicesCharges}
              onChange={(e) => setServicesCharges(e.target.value)}
              className={`${inputCls} min-h-[110px] resize-y`}
              placeholder="Enter services charges details"
            />
          </div>

          <div className="space-y-4">
            <span className="block text-[13px] font-semibold text-ink-secondary">Rate</span>
            <input name="rate" type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} placeholder="0.00" />

            {engineerType === "outsource-vendor" ? (
              <>
                <span className="block text-[13px] font-semibold text-ink-secondary">GST Type</span>
                <SearchableSelectInput name="gsttype" value={gstType} onChange={(e) => setGstType(e.target.value as any)} className={inputCls}>
                  <option value="">Select GST Type</option>
                  <option value="with_gst">With GST 18%</option>
                  <option value="without_gst">Without GST</option>
                </SearchableSelectInput>
              </>
            ) : null}

            <div className="rounded-xl border border-[#dfe5ce] bg-[#f8faf1] p-4 text-[13px]">
              <div className="flex justify-between py-1"><span>Basic Amount</span><span className="font-semibold">{money(rateAmount || 0)}</span></div>
              <div className="flex justify-between py-1"><span>GST {gstPercent}%</span><span className="font-semibold">{money(gstAmount)}</span></div>
              <div className="mt-2 flex justify-between border-t border-[#d7dec3] pt-3 text-[15px] font-bold text-[#52651e]"><span>Total Amount</span><span>{money(totalAmount)}</span></div>
            </div>

            <div>
              <span className="mb-2 block text-[13px] font-semibold text-ink-secondary">Bill Copy</span>
              <input name="billcopy" type="file" accept="application/pdf" onChange={(e) => setBillCopy(e.target.files?.[0] || null)} className={inputCls} />
            </div>
            <div>
              <span className="mb-2 block text-[13px] font-semibold text-ink-secondary">Vendor PO Copy</span>
              <input name="vendorpocopy" type="file" accept="application/pdf" onChange={(e) => setPoCopy(e.target.files?.[0] || null)} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" onClick={() => navigate("/vendor/onsite-engineer-payment/list")} className="rounded-lg bg-red-500 px-6 py-2 text-[13px] font-semibold text-white">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-lg bg-brand-700 px-6 py-2 text-[13px] font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Submit"}</button>
        </div>
      </div>
    </div>
  );
}
