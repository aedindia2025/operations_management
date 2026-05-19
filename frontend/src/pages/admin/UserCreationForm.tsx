import { useEffect, useMemo, useState } from "react";
import type { ReactNode, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchUserById,
  fetchUserTypeOptions,
  saveUser,
  type UserTypeOption,
} from "../../api/userApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

const INIT = {
  staff_name: "",
  staff_id: "",
  mobile_no: "",
  email_id: "",
  user_type_unique_id: "",
  user_name: "",
  password: "",
  confirm_password: "",
  is_active: 1,
};

const STAFF_NAME_REGEX = /^[A-Za-z ]+$/;
const STAFF_ID_REGEX = /^[A-Za-z0-9]+$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_NAME_REGEX = /^[A-Za-z0-9]+$/;

export default function UserCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(INIT);
  const [options, setOptions] = useState<UserTypeOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffOpen, setStaffOpen] = useState(true);
  const [userDetailsOpen, setUserDetailsOpen] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchUserTypeOptions().then(setOptions).catch(() => setOptions([]));
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    fetchUserById(id)
      .then((data) =>
        setForm({
          staff_name: data.staff_name,
          staff_id: data.staff_id,
          mobile_no: data.mobile_no,
          email_id: data.email_id,
          user_type_unique_id: data.user_type_unique_id,
          user_name: data.user_name,
          password: data.password,
          confirm_password: data.password,
          is_active: data.is_active,
        })
      )
      .catch(() => setError("Failed to load record."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set =
    (field: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let value = e.target.value;

      if (field === "staff_name") value = value.replace(/[^A-Za-z ]/g, "");
      if (field === "staff_id") value = value.replace(/[^A-Za-z0-9]/g, "");
      if (field === "mobile_no") value = value.replace(/\D/g, "").slice(0, 10);
      if (field === "email_id") value = value.trim();
      if (field === "user_name") value = value.replace(/[^A-Za-z0-9]/g, "");

      setForm((prev) => ({
        ...prev,
        [field]: field === "is_active" ? Number(value) : value,
      }));
    };

  const passwordStrong = useMemo(
    () =>
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password),
    [form.password]
  );
  const staffNameValid = useMemo(
    () => STAFF_NAME_REGEX.test(form.staff_name.trim()),
    [form.staff_name]
  );
  const staffIdValid = useMemo(
    () => STAFF_ID_REGEX.test(form.staff_id.trim()),
    [form.staff_id]
  );
  const mobileValid = useMemo(
    () => MOBILE_REGEX.test(form.mobile_no.trim()),
    [form.mobile_no]
  );
  const emailValid = useMemo(
    () => EMAIL_REGEX.test(form.email_id.trim()),
    [form.email_id]
  );
  const userNameValid = useMemo(
    () => USER_NAME_REGEX.test(form.user_name.trim()),
    [form.user_name]
  );

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*()_+.";
    let value = "";
    for (let i = 0; i < 10; i += 1) {
      value += chars[Math.floor(Math.random() * chars.length)];
    }
    setForm((prev) => ({ ...prev, password: value, confirm_password: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!staffNameValid) {
      setError("Staff Name allows alphabets and spaces only.");
      return;
    }
    if (!staffIdValid) {
      setError("Staff Id allows alphabets and numbers only.");
      return;
    }
    if (!mobileValid) {
      setError("Mobile No must be 10 digits and start with 6, 7, 8, or 9.");
      return;
    }
    if (!emailValid) {
      setError("Please enter a valid Email Id.");
      return;
    }
    if (!userNameValid) {
      setError("User Name allows alphabets and numbers only.");
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    if (!passwordStrong) {
      setError(
        "Password must be 8+ chars with uppercase, lowercase, number, and special character."
      );
      return;
    }

    setSaving(true);
    try {
      const res = await saveUser({
        unique_id: id,
        staff_name: form.staff_name.trim(),
        staff_id: form.staff_id.trim(),
        mobile_no: form.mobile_no.trim(),
        email_id: form.email_id.trim(),
        user_type_unique_id: form.user_type_unique_id,
        user_name: form.user_name.trim(),
        password: form.password,
        is_active: form.is_active,
        address: "",
      });

      if (res.msg === "already") {
        setError("User already exists.");
        return;
      }
      if (res?.status === false) {
        setError(res?.error || "Failed to save record.");
        return;
      }

      await showSuccessAlert(isEdit ? "User updated successfully." : "User created successfully.");
      navigate(-1);
    } catch {
      const message = "Failed to save record.";
      setError(message);
      await showErrorAlert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-ink-secondary">Loading...</div>;
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title={isEdit ? "Edit User Creation" : "User Creations Create"}
        breadcrumbs={["Admin", "User Creations"]}
      />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="border-b border-[#ebefdf] bg-[linear-gradient(135deg,#fcfdf8_0%,#edf4e0_55%,#f9f4e6_100%)] px-7 py-6">
          <h2 className="text-[22px] font-semibold text-[#243018]">{isEdit ? "Update User Profile" : "Create User Profile"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <AccordionSection
            title="STAFF PROFILE"
            open={staffOpen}
            onToggle={() => setStaffOpen((prev) => !prev)}
          >
            <div className="space-y-4">
              <Field label="Staff Name">
                <input name="staff_name"
                  value={form.staff_name}
                  onChange={set("staff_name")}
                  required
                  className={inputCls}
                />
                <Hint
                  show={form.staff_name.length > 0 && !staffNameValid}
                  text="Alphabets and spaces only."
                />
              </Field>

              <Field label="Staff Id">
                <input name="staff_id"
                  value={form.staff_id}
                  onChange={set("staff_id")}
                  required
                  className={inputCls}
                />
                <Hint
                  show={form.staff_id.length > 0 && !staffIdValid}
                  text="Use alphabets and numbers only."
                />
              </Field>

              <Field label="Mobile No.">
                <input name="mobile_no"
                  value={form.mobile_no}
                  onChange={set("mobile_no")}
                  required
                  maxLength={10}
                  inputMode="numeric"
                  className={inputCls}
                />
                <Hint
                  show={form.mobile_no.length > 0 && !mobileValid}
                  text="Must be 10 digits and start with 6, 7, 8, or 9."
                />
              </Field>

              <Field label="Email Id">
                <input name="email_id"
                  type="email"
                  value={form.email_id}
                  onChange={set("email_id")}
                  required
                  className={inputCls}
                />
                <Hint
                  show={form.email_id.length > 0 && !emailValid}
                  text="Enter a valid email address."
                />
              </Field>
            </div>
          </AccordionSection>

          <AccordionSection
            title="USER DETAILS"
            open={userDetailsOpen}
            onToggle={() => setUserDetailsOpen((prev) => !prev)}
          >
            <div className="space-y-4">
              <Field label="User Type">
                <SearchableSelectInput name="user_type_unique_id"
                  value={form.user_type_unique_id}
                  onChange={set("user_type_unique_id")}
                  required
                  className={inputCls}
                >
                  <option value="">Select User Type</option>
                  {options.map((item) => (
                    <option key={item.unique_id} value={item.unique_id}>
                      {item.label}
                    </option>
                  ))}
                </SearchableSelectInput>
              </Field>

              <Field label="User Name">
                <input name="user_name"
                  value={form.user_name}
                  onChange={set("user_name")}
                  required
                  className={inputCls}
                />
                <Hint
                  show={form.user_name.length > 0 && !userNameValid}
                  text="Use alphabets and numbers only."
                />
              </Field>

              <Field label="Password">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <input name="password"
                      type="text"
                      value={form.password}
                      onChange={set("password")}
                      required
                      className={inputCls + (passwordStrong ? " border-green-500" : "")}
                    />
                    <div
                      className={`text-xs mt-1 ${
                        passwordStrong ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {passwordStrong
                        ? "Strong password"
                        : "8+ chars, uppercase, lowercase, number, special char"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="h-10 px-4 bg-green-700 text-white rounded-md text-sm hover:bg-green-800"
                  >
                    Generate
                  </button>
                </div>
              </Field>

              <Field label="Confirm Password">
                <div className="relative">
                  <input name="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirm_password}
                    onChange={set("confirm_password")}
                    required
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-[#748062] transition-colors hover:text-[#4f7a2b] focus:outline-none focus:text-[#4f7a2b]"
                    title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    <i className={`fa ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`} />
                  </button>
                </div>
              </Field>

              <Field label="Active Status">
                <SearchableSelectInput name="is_active" value={form.is_active} onChange={set("is_active")} className={inputCls}>
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </SearchableSelectInput>
              </Field>
            </div>
          </AccordionSection>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-2xl border border-[#f0b8a8] bg-[#fff3ef] px-6 py-2.5 font-medium text-[#d45b35] transition-colors hover:bg-[#ffe7df]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(79,122,43,0.30)] disabled:opacity-60"
            >
              {saving ? "Saving..." : isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-[#d7dec8] bg-[#fcfdf9] px-4 py-3 shadow-sm outline-none transition-all focus:border-[#6f9535] focus:ring-4 focus:ring-[#6f9535]/10";

function AccordionSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#ddd7bc] shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between bg-[linear-gradient(135deg,#f7f4e6_0%,#edf3dd_100%)] px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold tracking-[0.14em] text-[#5a6420]">{title}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[16px] font-bold leading-none text-[#6f9535] shadow-sm">{open ? "-" : "+"}</span>
      </button>
      {open && <div className="bg-white p-5">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
      <span className="text-sm font-medium text-[#566146] md:pt-3">{label}</span>
      <div className="md:col-span-2">{children}</div>
    </div>
  );
}

function Hint({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return <div className="text-xs text-red-500 mt-1">{text}</div>;
}


