import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { createTenantCompany, fetchTenantCompany, updateTenantCompany, type TenantCreateResponse } from "../../api/tenantApi";
import { useAuth } from "../../context/AuthContext";
import { isProductOwnerUser } from "../../utils/authAccess";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";

const INIT = {
  company_code: "",
  company_name: "",
  legal_name: "",
  contact_name: "",
  contact_email: "",
  contact_no: "",
  gst_no: "",
  pan_no: "",
  address: "",
  branch_name: "Main Branch",
  subscription_plan: "standard",
  subscription_status: "active",
  admin_name: "",
  admin_staff_id: "",
  admin_mobile: "",
  admin_email: "",
  admin_username: "admin",
  admin_password: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const COMPANY_CODE_REGEX = /^[A-Za-z0-9-]+$/;

export default function TenantCreationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("id") || "";
  const isEdit = Boolean(tenantId);
  const { user, isAuthReady } = useAuth();
  const [form, setForm] = useState(INIT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<TenantCreateResponse | null>(null);
  const [companyOpen, setCompanyOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  const companyCodeValid = useMemo(() => !form.company_code || COMPANY_CODE_REGEX.test(form.company_code), [form.company_code]);
  const emailValid = useMemo(() => !form.contact_email || EMAIL_REGEX.test(form.contact_email), [form.contact_email]);
  const mobileValid = useMemo(() => !form.contact_no || MOBILE_REGEX.test(form.contact_no), [form.contact_no]);
  const adminEmailValid = useMemo(() => !form.admin_email || EMAIL_REGEX.test(form.admin_email), [form.admin_email]);
  const adminMobileValid = useMemo(() => !form.admin_mobile || MOBILE_REGEX.test(form.admin_mobile), [form.admin_mobile]);

  useEffect(() => {
    if (!isEdit || !isProductOwnerUser(user)) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTenantCompany(tenantId)
      .then((tenant) => {
        if (cancelled) return;
        setForm({
          ...INIT,
          company_code: tenant.company_code || "",
          company_name: tenant.company_name || "",
          legal_name: tenant.legal_name || "",
          contact_name: tenant.contact_name || "",
          contact_email: tenant.contact_email || "",
          contact_no: tenant.contact_no || "",
          gst_no: tenant.gst_no || "",
          pan_no: tenant.pan_no || "",
          address: tenant.address || "",
          subscription_plan: tenant.subscription_plan || "standard",
          subscription_status: tenant.subscription_status || (tenant.is_active === 1 ? "active" : "suspended"),
        });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load tenant.";
        if (!cancelled) setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEdit, tenantId, user]);

  const set =
    (field: keyof typeof INIT) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      let value = e.target.value;
      if (field === "company_code") value = value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
      if (["contact_no", "admin_mobile"].includes(field)) value = value.replace(/\D/g, "").slice(0, 10);
      if (["contact_email", "admin_email"].includes(field)) value = value.trim();
      if (field === "admin_username") value = value.replace(/[^A-Za-z0-9_.-]/g, "");
      setForm((prev) => ({ ...prev, [field]: value }));
      setCreated(null);
    };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*()_+.";
    let value = "";
    for (let i = 0; i < 12; i += 1) value += chars[Math.floor(Math.random() * chars.length)];
    setForm((prev) => ({ ...prev, admin_password: value }));
    setCreated(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreated(null);

    if (!form.company_code.trim() || !form.company_name.trim()) {
      setError("Company code and company name are required.");
      return;
    }
    if (!companyCodeValid) {
      setError("Company code allows letters, numbers, and hyphen only.");
      return;
    }
    if (!emailValid || (!isEdit && !adminEmailValid)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!mobileValid || (!isEdit && !adminMobileValid)) {
      setError("Mobile number must be 10 digits and start with 6, 7, 8, or 9.");
      return;
    }

    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      ) as typeof INIT;
      const res = isEdit
        ? await updateTenantCompany(tenantId, {
            company_code: payload.company_code,
            company_name: payload.company_name,
            legal_name: payload.legal_name,
            contact_name: payload.contact_name,
            contact_email: payload.contact_email,
            contact_no: payload.contact_no,
            gst_no: payload.gst_no,
            pan_no: payload.pan_no,
            address: payload.address,
            subscription_plan: payload.subscription_plan,
            subscription_status: payload.subscription_status,
          })
        : await createTenantCompany(payload);
      setCreated(isEdit ? null : res);
      if (!isEdit) {
        setForm((prev) => ({
          ...INIT,
          admin_username: "admin",
          admin_password: "",
          subscription_plan: prev.subscription_plan,
          subscription_status: "active",
        }));
      }
      await showSuccessAlert(isEdit ? "Tenant updated successfully." : "Tenant created successfully.");
      navigate("/admin/tenant-creation/list");
    } catch (err) {
      const message = err instanceof Error ? err.message : isEdit ? "Failed to update tenant." : "Failed to create tenant.";
      setError(message);
      await showErrorAlert(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthReady) return null;
  if (!isProductOwnerUser(user)) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar title={isEdit ? "Edit Tenant" : "Create Tenant"} breadcrumbs={["Admin", "Tenant Creation"]} />

      {created?.admin_user ? (
        <section className="mb-4 rounded-[24px] border border-[#cdddb0] bg-[linear-gradient(135deg,#f7fbec_0%,#ffffff_100%)] p-5 shadow-[0_18px_42px_rgba(46,61,24,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#6b7b43]">Tenant Created</div>
              <h2 className="mt-1 text-[20px] font-bold text-[#233016]">{created.company?.company_name}</h2>
              <div className="mt-2 text-[13px] text-[#5d6748]">Company code: <span className="font-bold text-[#243018]">{created.company?.company_code}</span></div>
            </div>
            <div className="grid gap-2 rounded-[18px] border border-[#dfe8c9] bg-white px-4 py-3 text-[13px]">
              <div><span className="font-semibold text-[#5d6748]">Admin Username:</span> <span className="font-bold text-[#243018]">{created.admin_user.username}</span></div>
              <div><span className="font-semibold text-[#5d6748]">Admin Password:</span> <span className="font-bold text-[#243018]">{created.admin_user.password}</span></div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="border-b border-[#ebefdf] bg-[linear-gradient(135deg,#fcfdf8_0%,#edf4e0_55%,#f9f4e6_100%)] px-7 py-6">
          <h2 className="text-[22px] font-semibold text-[#243018]">Tenant Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-8">
          {loading ? (
            <div className="rounded-2xl border border-[#d7dec8] bg-[#fcfdf9] px-4 py-3 text-sm text-[#5d6748]">
              Loading tenant details...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 whitespace-pre-line">
              {error}
            </div>
          ) : null}

          <AccordionSection title="COMPANY PROFILE" open={companyOpen} onToggle={() => setCompanyOpen((prev) => !prev)}>
            <div className="space-y-4">
              <Field label="Company Code">
                <input name="company_code" value={form.company_code} onChange={set("company_code")} required className={inputCls} />
                <Hint show={form.company_code.length > 0 && !companyCodeValid} text="Letters, numbers, and hyphen only." />
              </Field>
              <Field label="Company Name">
                <input name="company_name" value={form.company_name} onChange={set("company_name")} required className={inputCls} />
              </Field>
              <Field label="Legal Name">
                <input name="legal_name" value={form.legal_name} onChange={set("legal_name")} className={inputCls} />
              </Field>
              <Field label="Contact Name">
                <input name="contact_name" value={form.contact_name} onChange={set("contact_name")} className={inputCls} />
              </Field>
              <Field label="Contact Email">
                <input name="contact_email" type="email" value={form.contact_email} onChange={set("contact_email")} className={inputCls} />
                <Hint show={form.contact_email.length > 0 && !emailValid} text="Enter a valid email address." />
              </Field>
              <Field label="Contact No.">
                <input name="contact_no" value={form.contact_no} onChange={set("contact_no")} inputMode="numeric" maxLength={10} className={inputCls} />
                <Hint show={form.contact_no.length > 0 && !mobileValid} text="Must be 10 digits and start with 6, 7, 8, or 9." />
              </Field>
              <Field label="GST No.">
                <input name="gst_no" value={form.gst_no} onChange={set("gst_no")} className={inputCls} />
              </Field>
              <Field label="PAN No.">
                <input name="pan_no" value={form.pan_no} onChange={set("pan_no")} className={inputCls} />
              </Field>
              <Field label="Address">
                <textarea name="address" value={form.address} onChange={set("address")} rows={3} className={inputCls} />
              </Field>
              <Field label="Branch Name">
                <input name="branch_name" value={form.branch_name} onChange={set("branch_name")} className={inputCls} />
              </Field>
              <Field label="Plan">
                <SearchableSelectInput name="subscription_plan" value={form.subscription_plan} onChange={set("subscription_plan")} className={inputCls}>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </SearchableSelectInput>
              </Field>
              <Field label="Subscription Status">
                <SearchableSelectInput name="subscription_status" value={form.subscription_status} onChange={set("subscription_status")} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </SearchableSelectInput>
              </Field>
            </div>
          </AccordionSection>

          {!isEdit ? (
            <AccordionSection title="ADMIN USER" open={adminOpen} onToggle={() => setAdminOpen((prev) => !prev)}>
              <div className="space-y-4">
                <Field label="Admin Name">
                  <input name="admin_name" value={form.admin_name} onChange={set("admin_name")} className={inputCls} />
                </Field>
                <Field label="Admin Staff Id">
                  <input name="admin_staff_id" value={form.admin_staff_id} onChange={set("admin_staff_id")} className={inputCls} />
                </Field>
                <Field label="Admin Mobile">
                  <input name="admin_mobile" value={form.admin_mobile} onChange={set("admin_mobile")} inputMode="numeric" maxLength={10} className={inputCls} />
                  <Hint show={form.admin_mobile.length > 0 && !adminMobileValid} text="Must be 10 digits and start with 6, 7, 8, or 9." />
                </Field>
                <Field label="Admin Email">
                  <input name="admin_email" type="email" value={form.admin_email} onChange={set("admin_email")} className={inputCls} />
                  <Hint show={form.admin_email.length > 0 && !adminEmailValid} text="Enter a valid email address." />
                </Field>
                <Field label="Admin Username">
                  <input name="admin_username" value={form.admin_username} onChange={set("admin_username")} className={inputCls} />
                </Field>
                <Field label="Admin Password">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input name="admin_password" type="text" value={form.admin_password} onChange={set("admin_password")} className={inputCls} />
                    <button type="button" onClick={generatePassword} className="h-12 rounded-2xl border border-[#4f7a2b] bg-[#4f7a2b] px-4 text-sm font-semibold text-white hover:bg-[#426926]">
                      Generate
                    </button>
                  </div>
                </Field>
              </div>
            </AccordionSection>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate("/admin/tenant-creation/list")} className="rounded-2xl border border-[#f0b8a8] bg-[#fff3ef] px-6 py-2.5 font-medium text-[#d45b35] transition-colors hover:bg-[#ffe7df]">
              Cancel
            </button>
            <button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(79,122,43,0.30)] disabled:opacity-60">
              {saving ? (isEdit ? "Updating..." : "Creating...") : isEdit ? "Update Tenant" : "Create Tenant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-[#d7dec8] bg-[#fcfdf9] px-4 py-3 shadow-sm outline-none transition-all focus:border-[#6f9535] focus:ring-4 focus:ring-[#6f9535]/10";

function AccordionSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#ddd7bc] shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between bg-[linear-gradient(135deg,#f7f4e6_0%,#edf3dd_100%)] px-5 py-4 text-left">
        <span className="text-sm font-semibold tracking-[0.14em] text-[#5a6420]">{title}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[16px] font-bold leading-none text-[#6f9535] shadow-sm">{open ? "-" : "+"}</span>
      </button>
      {open ? <div className="bg-white p-5">{children}</div> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-4">
      <span className="text-sm font-medium text-[#566146] md:pt-3">{label}</span>
      <div className="md:col-span-2">{children}</div>
    </div>
  );
}

function Hint({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return <div className="mt-1 text-xs text-red-500">{text}</div>;
}
