import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchCustomerPaymentDetail,
  saveCustomerPayment,
  type CustomerPaymentDetailRow,
} from "../../api/customerPaymentApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type PaymentFormState = {
  payment_status: number;
  payment_date: string;
  payement_receive: string;
  claim_amount: string;
  gst: string;
  gst_value: string;
  tds: string;
  tds_value: string;
  ld: string;
  ld_amount: string;
  ld_days: number;
  tran_amt: string;
  rem_amt: string;
  file: File | null;
  courier_pod_file: File | null;
  dc_file: File | null;
  einvoice_file: File | null;
  ir_file: File | null;
  bg_copy_file: File | null;
  fire_insurance_file: File | null;
  marine_insurance_file: File | null;
  burglary_file: File | null;
};

const INIT_FORM: PaymentFormState = {
  payment_status: 0,
  payment_date: "",
  payement_receive: "0",
  claim_amount: "0",
  gst: "0",
  gst_value: "0",
  tds: "0",
  tds_value: "0",
  ld: "0",
  ld_amount: "0",
  ld_days: 0,
  tran_amt: "0",
  rem_amt: "0",
  file: null,
  courier_pod_file: null,
  dc_file: null,
  einvoice_file: null,
  ir_file: null,
  bg_copy_file: null,
  fire_insurance_file: null,
  marine_insurance_file: null,
  burglary_file: null,
};

function toInputDate(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

function parseMoney(value: string) {
  if (!value) return "0";
  return value.replace(/,/g, "").trim() || "0";
}

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="block text-[12.5px] font-semibold text-ink-secondary mb-1.5">{label}</span>
      <div className="w-full min-h-[42px] px-3.5 py-2.5 text-[13px] border border-line-dark rounded-lg bg-surface-2 text-ink">
        {value || "--"}
      </div>
    </div>
  );
}

function EditableField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="block text-[12.5px] font-semibold text-ink-secondary mb-1.5">{label}</span>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 text-[13px] border border-line-dark rounded-lg outline-none bg-surface-2 text-ink placeholder-ink-muted focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all";

export default function CustomerPaymentForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const billNo = searchParams.get("bill_no") || "";
  const invoiceNo = searchParams.get("invoice_no") || "";
  const uniqueId = id || "";
  const isCreateMode = !uniqueId;

  const [detail, setDetail] = useState<CustomerPaymentDetailRow | null>(null);
  const [form, setForm] = useState<PaymentFormState>(INIT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isCreateMode || !billNo || !invoiceNo) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetchCustomerPaymentDetail({
      unique_id: uniqueId,
      bill_no: billNo,
      invoice_no: invoiceNo,
    })
      .then((res) => {
        if (!active) return;
        const row = res.data?.[0] || null;
        setDetail(row);
        setForm((prev) => ({
          ...prev,
          payment_date: toInputDate(row?.payment_date || ""),
          payement_receive: parseMoney(row?.payment_received || "0"),
          claim_amount: parseMoney(row?.claimamt || "0"),
          gst_value: parseMoney(row?.gst_value || "0"),
          tds_value: parseMoney(row?.tds_value || "0"),
          ld_amount: parseMoney(row?.ld_amount || "0"),
          tran_amt: parseMoney(row?.tran_amt || "0"),
          rem_amt: parseMoney(row?.balance_amount || "0"),
          payment_status: row?.payment_date ? 1 : 0,
        }));
      })
      .catch(async (error) => {
        if (!active) return;
        setDetail(null);
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load payment detail.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uniqueId, billNo, invoiceNo, isCreateMode]);

  const setField =
    <K extends keyof PaymentFormState>(field: K) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((prev) => ({
        ...prev,
        [field]: field === "payment_status" || field === "ld_days" ? Number(value) : value,
      }));
    };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, file }));
  };

  const handleUploadChange =
    (field: keyof Pick<PaymentFormState, "courier_pod_file" | "dc_file" | "einvoice_file" | "ir_file" | "bg_copy_file" | "fire_insurance_file" | "marine_insurance_file" | "burglary_file">) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      setForm((prev) => ({ ...prev, [field]: file }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isCreateMode) {
      setSaving(true);
      try {
        const result = await saveCustomerPayment({
          upload_only: true,
          courier_pod_file: form.courier_pod_file,
          dc_file: form.dc_file,
          einvoice_file: form.einvoice_file,
          ir_file: form.ir_file,
          bg_copy_file: form.bg_copy_file,
          fire_insurance_file: form.fire_insurance_file,
          marine_insurance_file: form.marine_insurance_file,
          burglary_file: form.burglary_file,
        });

        if (result.status !== 1) {
          throw new Error(result.error || "Failed to save documents.");
        }

        await showSuccessAlert("Documents uploaded successfully.");
        navigate("/accounts/customer-payment/list");
      } catch (error) {
        await showErrorAlert(error instanceof Error ? error.message : "Failed to save documents.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!billNo || !invoiceNo) {
      await showErrorAlert("Payment identifiers are missing.");
      return;
    }
    if (!form.payment_date) {
      await showErrorAlert("Please select payment date.");
      return;
    }

    setSaving(true);
    try {
      const result = await saveCustomerPayment({
        unique_id: uniqueId,
        bill_no: billNo,
        my_inv_no: invoiceNo,
        payement_receive: form.payement_receive,
        payment_status: form.payment_status,
        payment_date: form.payment_date,
        ld_amount: form.ld_amount,
        ld_days: form.ld_days,
        claim_amount: form.claim_amount,
        gst: form.gst,
        gst_value: form.gst_value,
        tds: form.tds,
        tds_value: form.tds_value,
        ld: form.ld,
        tran_amt: form.tran_amt,
        rem_amt: form.rem_amt,
        file: form.file,
        courier_pod_file: form.courier_pod_file,
        dc_file: form.dc_file,
        einvoice_file: form.einvoice_file,
        ir_file: form.ir_file,
        bg_copy_file: form.bg_copy_file,
        fire_insurance_file: form.fire_insurance_file,
        marine_insurance_file: form.marine_insurance_file,
        burglary_file: form.burglary_file,
      });

      if (result.status !== 1) {
        throw new Error(result.error || "Failed to save payment.");
      }

      await showSuccessAlert("Payment updated successfully.");
      navigate("/accounts/customer-payment/list");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to save payment.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isCreateMode && (!billNo || !invoiceNo)) {
    return (
      <div className="p-6">
        <PageTopbar title="Edit Customer Payment" breadcrumbs={["Accounts", "Customer Payment", "Edit"]} />
        <div className="bg-white border border-line rounded-xl shadow-card p-6 text-sm text-red-600">
          Payment identifiers are missing. Open this screen from the payment list edit action.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageTopbar title={isCreateMode ? "Add Customer Payment" : "Edit Customer Payment"} breadcrumbs={["Accounts", "Customer Payment", isCreateMode ? "Add" : "Edit"]} />

      <div className="bg-white border border-line rounded-xl shadow-card">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {!isCreateMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ReadOnlyField label="Bill No" value={detail?.bill_no} />
              <ReadOnlyField label="Invoice No" value={detail?.invoice_no} />
              <ReadOnlyField label="PO No" value={detail?.po_num} />
              <ReadOnlyField label="Customer" value={detail?.customer} />
              <ReadOnlyField label="Invoice Value" value={detail?.invoice_value} />
              <ReadOnlyField label="Balance Amount" value={detail?.balance_amount} />
              <ReadOnlyField label="Bill Submission Date" value={detail?.bill_submission_date} />
              <ReadOnlyField label="E No" value={detail?.e_no} />
            </div>
          )}

          {!isCreateMode && (
          <div className="border-t border-line pt-6">
            <h2 className="text-[14px] font-semibold text-ink mb-4">Payment Update</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EditableField label="Payment Status">
                <SearchableSelectInput name="payment_status" value={form.payment_status} onChange={setField("payment_status")} className={inputCls}>
                  <option value={0}>Pending</option>
                  <option value={1}>Completed</option>
                </SearchableSelectInput>
              </EditableField>

              <EditableField label="Payment Date">
                <input name="payment_date" type="date" value={form.payment_date} onChange={setField("payment_date")} className={inputCls} />
              </EditableField>

              <EditableField label="Payment Received">
                <input name="payement_receive" type="number" step="0.01" value={form.payement_receive} onChange={setField("payement_receive")} className={inputCls} />
              </EditableField>

              <EditableField label="Claim Percentage">
                <input name="claim_amount" type="number" step="0.01" value={form.claim_amount} onChange={setField("claim_amount")} className={inputCls} />
              </EditableField>

              <EditableField label="GST %">
                <input name="gst" type="number" step="0.01" value={form.gst} onChange={setField("gst")} className={inputCls} />
              </EditableField>

              <EditableField label="GST Value">
                <input name="gst_value" type="number" step="0.01" value={form.gst_value} onChange={setField("gst_value")} className={inputCls} />
              </EditableField>

              <EditableField label="TDS %">
                <input name="tds" type="number" step="0.01" value={form.tds} onChange={setField("tds")} className={inputCls} />
              </EditableField>

              <EditableField label="TDS Value">
                <input name="tds_value" type="number" step="0.01" value={form.tds_value} onChange={setField("tds_value")} className={inputCls} />
              </EditableField>

              <EditableField label="LD">
                <input name="ld" type="number" step="0.01" value={form.ld} onChange={setField("ld")} className={inputCls} />
              </EditableField>

              <EditableField label="LD Amount">
                <input name="ld_amount" type="number" step="0.01" value={form.ld_amount} onChange={setField("ld_amount")} className={inputCls} />
              </EditableField>

              <EditableField label="LD Days">
                <input name="ld_days" type="number" value={form.ld_days} onChange={setField("ld_days")} className={inputCls} />
              </EditableField>

              <EditableField label="Transaction Amount">
                <input name="tran_amt" type="number" step="0.01" value={form.tran_amt} onChange={setField("tran_amt")} className={inputCls} />
              </EditableField>

              <EditableField label="Remaining Amount">
                <input name="rem_amt" type="number" step="0.01" value={form.rem_amt} onChange={setField("rem_amt")} className={inputCls} />
              </EditableField>

              <EditableField label="Payment File (PDF)">
                <input name="customerpaymentform_input_301" type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className={inputCls} />
              </EditableField>
            </div>
          </div>
          )}

          <div className="border-t border-line pt-6">
            <h2 className="text-[14px] font-semibold text-ink mb-4">Document Uploads</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EditableField label="Courier POD">
                <input name="courier_pod_file" type="file" accept=".pdf,image/*" onChange={handleUploadChange("courier_pod_file")} className={inputCls} />
              </EditableField>

              <EditableField label="DC">
                <input name="dc_file" type="file" accept=".pdf,image/*" onChange={handleUploadChange("dc_file")} className={inputCls} />
              </EditableField>

              <EditableField label="E-Invoice">
                <input name="einvoice_file" type="file" accept=".pdf,image/*" onChange={handleUploadChange("einvoice_file")} className={inputCls} />
              </EditableField>

              <EditableField label="IR">
                <input name="ir_file" type="file" accept=".pdf,image/*" onChange={handleUploadChange("ir_file")} className={inputCls} />
              </EditableField>

              <EditableField label="BG Copies">
                <input name="bg_copy_file" type="file" accept=".pdf,image/*" onChange={handleUploadChange("bg_copy_file")} className={inputCls} />
              </EditableField>
            </div>
          </div>

          <div className="border-t border-line pt-6">
            <h2 className="text-[14px] font-semibold text-ink mb-4">Insurance Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <EditableField label="Fire Insurance">
                <input name="fire_insurance_file" type="file" accept=".pdf,image/*" onChange={handleUploadChange("fire_insurance_file")} className={inputCls} />
              </EditableField>

              <EditableField label="Marine Insurance">
                <input name="marine_insurance_file" type="file" accept=".pdf,image/*" onChange={handleUploadChange("marine_insurance_file")} className={inputCls} />
              </EditableField>

              <EditableField label="Burglary">
                <input name="burglary_file" type="file" accept=".pdf,image/*" onChange={handleUploadChange("burglary_file")} className={inputCls} />
              </EditableField>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-line">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-0 flex items-center gap-2"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? "Saving..." : isCreateMode ? "Save" : "Update"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-white border border-line-dark text-ink-secondary text-[13px] font-semibold rounded-lg hover:border-brand-500 hover:text-brand-500 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


