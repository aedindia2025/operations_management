import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  HorizontalFieldShell,
  HorizontalFormActions,
  HorizontalFormBody,
  HorizontalFormCard,
  HorizontalFormColumns,
  HorizontalFormRow,
  horizontalInputCls,
  horizontalSelectCls,
} from "../../components/common/HorizontalForm";
import {
  createExecutiveCreation,
  fetchExecutiveCreationById,
  updateExecutiveCreation,
} from "../../api/executiveCreationApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  executive_name: string;
  user_name: string;
  email_id: string;
  mobile_no: string;
  password: string;
  confirm_password: string;
  is_active: number;
}

const INIT: FormData = {
  executive_name: "",
  user_name: "",
  email_id: "",
  mobile_no: "",
  password: "",
  confirm_password: "",
  is_active: 1,
};
const LETTERS_ONLY_REGEX = /^[A-Za-z ]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;

export default function ExecutiveCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchExecutiveCreationById(id)
      .then((data) =>
        setForm((prev) => ({
          ...prev,
          executive_name: data.executive_name ?? "",
          user_name: data.user_name ?? "",
          email_id: data.email_id ?? "",
          mobile_no: data.mobile_no ?? "",
          is_active: Number(data.is_active ?? 1),
        }))
      )
      .catch(() => setError("Failed to load executive."));
  }, [id, isEdit]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      {
        const value = e.target.value;
        let sanitizedValue = value;

        if (field === "executive_name" || field === "user_name") {
          sanitizedValue = value.replace(/[^A-Za-z ]/g, "");
        } else if (field === "mobile_no") {
          sanitizedValue = value.replace(/\D/g, "").slice(0, 10);
        }

        setForm((prev) => ({
          ...prev,
          [field]:
            field === "is_active"
              ? Number(value)
              : sanitizedValue,
        }));

        if (error) setError(null);
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.executive_name.trim() || !form.user_name.trim() || !form.email_id.trim() || !form.mobile_no.trim()) {
      const message = "Please fill all required fields.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!LETTERS_ONLY_REGEX.test(form.executive_name.trim())) {
      const message = "Executive Name allows only alphabets.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!LETTERS_ONLY_REGEX.test(form.user_name.trim())) {
      const message = "User Name allows only alphabets.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!EMAIL_REGEX.test(form.email_id.trim())) {
      const message = "Please enter a valid email address.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!MOBILE_REGEX.test(form.mobile_no.trim())) {
      const message = "Mobile number must be 10 digits and start with 6, 7, 8, or 9.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!isEdit && !form.password.trim()) {
      const message = "Please enter the password.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if ((form.password || form.confirm_password) && form.password !== form.confirm_password) {
      const message = "Password and Confirm Password must match.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    try {
      const password = form.password.trim() || "123456";
      const payload = {
        executive_name: form.executive_name.trim(),
        user_name: form.user_name.trim(),
        email_id: form.email_id.trim(),
        mobile_no: form.mobile_no.trim(),
        password,
        confirm_password: form.confirm_password.trim() || password,
        is_active: form.is_active,
      };

      const res = isEdit && id
        ? await updateExecutiveCreation(id, payload)
        : await createExecutiveCreation(payload);

      if (res.status) {
        await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
        navigate("/settings/executive/list");
      } else {
        const message =
          typeof res.error === "string"
            ? res.error
            : Object.values(res.error ?? {}).flat().join(" ") || "Validation failed.";
        setError(message);
        await showErrorAlert(message);
      }
    } catch {
      const message = "Network error. Please try again.";
      setError(message);
      await showErrorAlert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit Executive" : "Add Executive"}
        breadcrumbs={["Settings", "Executive Creation", isEdit ? "Edit" : "Add"]}
      />

      <HorizontalFormCard className="w-full">
        <form onSubmit={handleSubmit}>
          <HorizontalFormBody>
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

            <HorizontalFormColumns
              left={
                <>
                  <HorizontalFormRow label="Executive Name">
                    <HorizontalFieldShell>
                      <input name="executive_name" type="text" value={form.executive_name} onChange={set("executive_name")} pattern="[A-Za-z ]+" title="Only alphabets are allowed" className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Email ID">
                    <HorizontalFieldShell>
                      <input name="email_id" type="email" value={form.email_id} onChange={set("email_id")} title="Enter a valid email address" className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Password">
                    <HorizontalFieldShell>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={set("password")}
                          className={`${horizontalInputCls} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#5d6748] transition-colors hover:bg-[#eef5e4] hover:text-[#4f7a2b]"
                          title={showPassword ? "Hide password" : "Show password"}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          <i className={`fa ${showPassword ? "fa-eye-slash" : "fa-eye"} text-[13px]`} />
                        </button>
                      </div>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Status">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="is_active" value={form.is_active} onChange={set("is_active")} className={horizontalSelectCls}>
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                </>
              }
              right={
                <>
                  <HorizontalFormRow label="User Name">
                    <HorizontalFieldShell>
                      <input name="user_name" type="text" value={form.user_name} onChange={set("user_name")} pattern="[A-Za-z ]+" title="Only alphabets are allowed" className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Mobile No">
                    <HorizontalFieldShell>
                      <input name="mobile_no" type="text" value={form.mobile_no} onChange={set("mobile_no")} inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" title="Mobile number must be 10 digits and start with 6, 7, 8, or 9" className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Confirm Password">
                    <HorizontalFieldShell>
                      <div className="relative">
                        <input
                          name="confirm_password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirm_password}
                          onChange={set("confirm_password")}
                          className={`${horizontalInputCls} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#5d6748] transition-colors hover:bg-[#eef5e4] hover:text-[#4f7a2b]"
                          title={showConfirmPassword ? "Hide password" : "Show password"}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          <i className={`fa ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"} text-[13px]`} />
                        </button>
                      </div>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                </>
              }
            />
          </HorizontalFormBody>
          <HorizontalFormActions onCancel={() => navigate(-1)} saving={saving} submitLabel={isEdit ? "Update" : "Save"} />
        </form>
      </HorizontalFormCard>
    </div>
  );
}


