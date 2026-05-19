import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchSecurityDepositFormData,
  saveSecurityDeposit,
  type SecurityDepositFormData,
} from "../../api/securityDepositApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type FormState = {
  claim_amount: string;
};

const INIT: FormState = { claim_amount: "" };

export default function SecurityDepositForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const invoiceNo = searchParams.get("invoice_no") ?? "";
  const [form, setForm] = useState<FormState>(INIT);
  const [details, setDetails] = useState<SecurityDepositFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(details?.existing_unique_id);
  const invoiceValue = useMemo(
    () => Number(String(details?.invoice_value ?? "0").replace(/,/g, "")) || 0,
    [details?.invoice_value]
  );

  useEffect(() => {
    let active = true;

    if (!id || !invoiceNo) {
      setLoading(false);
      showErrorAlert("Security deposit source details are missing.");
      return;
    }

    setLoading(true);
    fetchSecurityDepositFormData({ unique_id: id, invoice_no: invoiceNo })
      .then((data) => {
        if (!active) return;
        setDetails(data);
        setForm({
          claim_amount: String(data.existing_claim_amount || data.claim_amount_options[0]?.id || ""),
        });
      })
      .catch(async (error) => {
        if (!active) return;
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load security deposit form.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, invoiceNo]);

  const set = (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !details) return;

    setSaving(true);
    try {
      const res = await saveSecurityDeposit({
        bill_form_main_unique_id: id,
        po_num: details.po_num,
        po_date: details.po_date,
        invoice_no: details.invoice_no,
        invoice_date: details.invoice_date,
        invoice_value: invoiceValue,
        invoice_qty: details.invoice_qty,
        claim_amount: form.claim_amount,
        unique_id: details.existing_unique_id,
      });

      if (!res.status) {
        throw new Error(typeof res.error === "string" ? res.error : "Unable to save security deposit.");
      }

      await showSuccessAlert(res.msg === "update" ? "Security deposit updated successfully." : "Security deposit created successfully.");
      navigate("/accounts/security-deposit/list");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Unable to save security deposit.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageTopbar
          title="Security Deposit Form"
          breadcrumbs={["Accounts", "Security Deposit", "Form"]}
        />
        <div className="bg-white border border-line rounded-xl shadow-card max-w-5xl p-6 text-[13px] text-ink-secondary">
          Loading...
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-6">
        <PageTopbar
          title="Security Deposit Form"
          breadcrumbs={["Accounts", "Security Deposit", "Form"]}
        />
        <div className="bg-white border border-line rounded-xl shadow-card max-w-5xl p-6 text-[13px] text-danger">
          Unable to load security deposit details.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageTopbar
        title="Security Deposit Form"
        breadcrumbs={["Accounts", "Security Deposit", isEdit ? "Edit" : "Create"]}
      />
      <div className="bg-white border border-line rounded-xl shadow-card max-w-5xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <section>
              <h2 className="text-[14px] font-bold text-ink uppercase tracking-wide mb-3">Customer Details</h2>
              <div className="space-y-1 text-[13px] text-ink-secondary">
                <div className="text-[20px] font-semibold text-brand-700">{details.department || "--"}</div>
                <div>{details.customer_address || "--"}</div>
                <div>{details.customer_district || "--"}</div>
                <div>{details.customer_state || "--"} {details.customer_pincode || ""}</div>
                <div className="pt-2">{details.customer_contact || "--"}</div>
                <div>{details.customer_email || "--"}</div>
              </div>
            </section>

            <section>
              <h2 className="text-[14px] font-bold text-ink uppercase tracking-wide mb-3">PO & Invoice Details</h2>
              <div className="space-y-2 text-[13px]">
                <DetailRow label="PO Number" value={details.po_num} />
                <DetailRow label="PO Date" value={details.po_date} />
                <DetailRow label="Invoice No" value={details.invoice_no} />
                <DetailRow label="Invoice Date" value={details.invoice_date} />
                <DetailRow label="Invoice Value" value={details.invoice_value} strong />
              </div>
            </section>

            <section>
              <h2 className="text-[14px] font-bold text-ink uppercase tracking-wide mb-3">Bill Details</h2>
              <div className="space-y-2 text-[13px]">
                <DetailRow label="Bill No" value={details.bill_no} />
                <DetailRow label="Bill Date" value={details.bill_submission_date} />
                <DetailRow label="BG" value={details.bg || "--"} />
                <DetailRow label="E No" value={details.e_no || "--"} />
              </div>
            </section>
          </div>

          <div className="max-w-sm">
            <span className="block text-[12.5px] font-semibold text-ink-secondary mb-1.5">
              Claim Amount <span className="text-danger">*</span>
            </span>
            <SearchableSelectInput name="claim_amount"
              value={form.claim_amount}
              onChange={set("claim_amount")}
              required
              className="w-full px-3.5 py-2.5 text-[13px] border border-line-dark rounded-lg
                outline-none bg-surface-2 text-ink
                focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15
                transition-all"
            >
              <option value="">Select claim amount</option>
              {details.claim_amount_options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.value}
                </option>
              ))}
            </SearchableSelectInput>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-line">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-[13px]
                font-semibold rounded-lg transition-colors disabled:opacity-60
                disabled:cursor-not-allowed cursor-pointer border-0 flex items-center gap-2"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? "Saving..." : isEdit ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/accounts/security-deposit/list")}
              className="px-6 py-2.5 bg-white border border-line-dark text-ink-secondary
                text-[13px] font-semibold rounded-lg hover:border-brand-500 hover:text-brand-500
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

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_12px_1fr] gap-2">
      <div className="text-ink-secondary">{label}</div>
      <div className="text-ink-secondary">:</div>
      <div className={strong ? "font-semibold text-ink" : "text-ink"}>{value || "--"}</div>
    </div>
  );
}


