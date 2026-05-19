import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import { showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
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
  fetchAccountVerticalById,
  createAccountVertical,
  updateAccountVertical,
} from "../../api/accountVerticalApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  account_name: string;
  is_active: number;
}

type FormErrors = Partial<Record<keyof FormData | "submit", string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const INIT_FORM: FormData = {
  account_name: "",
  is_active: 1,
};

// ─── Sanitizer ────────────────────────────────────────────────────────────────

function sanitizeAccountName(value: string): string {
  // Allow letters (including Tamil/Unicode), spaces, hyphens, dots, ampersands only
  return value.replace(/[^a-zA-Z\u0B80-\u0BFF\s\-\.&]/g, "");
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!form.account_name.trim()) {
    errors.account_name = "Please enter an account vertical name.";
  } else if (form.account_name.trim().length < 2) {
    errors.account_name = "Account vertical name must be at least 2 characters.";
  } else if (form.account_name.trim().length > 100) {
    errors.account_name = "Account vertical name must not exceed 100 characters.";
  }

  return errors;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccountVerticalForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>(INIT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Load record in edit mode ──────────────────────────────────────────────

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    fetchAccountVerticalById(id)
      .then((data) =>
        setForm({
          account_name: data.account_name,
          is_active: data.is_active,
        })
      )
      .catch(() =>
        setErrors((prev) => ({ ...prev, submit: "Failed to load record." }))
      )
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // ── Field change handler ──────────────────────────────────────────────────

  const handleChange =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let value: string | number =
        field === "is_active" ? Number(e.target.value) : e.target.value;

      if (field === "account_name") {
        value = sanitizeAccountName(value as string);
      }

      setForm((prev) => ({ ...prev, [field]: value }));

      // Clear field error on change
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate(form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const payload = {
        account_name: form.account_name.trim(),
        is_active: form.is_active,
      };

      const res =
        isEdit && id
          ? await updateAccountVertical(id, payload)
          : await createAccountVertical(payload);

      if (res.msg === "already") {
        setErrors({ account_name: "Account vertical already exists." });
        return;
      }

      if (res.status === 1) {
        await showSuccessAlert(
          isEdit ? "Successfully record updated" : "Successfully record saved"
        );
        navigate(-1);
        return;
      }

      setErrors({ submit: res.error ?? "Something went wrong." });
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-ink-secondary text-sm">
        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit Account Vertical" : "Add Account Vertical"}
        breadcrumbs={["Settings", "Account Vertical", isEdit ? "Edit" : "Add"]}
      />

      <HorizontalFormCard className="w-full">
        <form onSubmit={handleSubmit} noValidate>
          <HorizontalFormBody>

            {/* Submit / network error banner */}
            {errors.submit && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {errors.submit}
              </div>
            )}

            <HorizontalFormColumns
              left={
                <HorizontalFormRow label="Account Vertical">
                  <HorizontalFieldShell>
                    <input name="account_name"
                      type="text"
                      value={form.account_name}
                      onChange={handleChange("account_name")}
                      placeholder="Enter account vertical name"
                      className={horizontalInputCls}
                    />
                  </HorizontalFieldShell>
                  {errors.account_name && (
                    <p className="mt-1 text-xs text-red-500">{errors.account_name}</p>
                  )}
                </HorizontalFormRow>
              }
              right={
                <HorizontalFormRow label="Status">
                  <HorizontalFieldShell select>
                    <SearchableSelectInput name="is_active"
                      value={form.is_active}
                      onChange={handleChange("is_active")}
                      className={horizontalSelectCls}
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </SearchableSelectInput>
                  </HorizontalFieldShell>
                </HorizontalFormRow>
              }
            />

          </HorizontalFormBody>

          <HorizontalFormActions
            onCancel={() => navigate(-1)}
            saving={saving}
            submitLabel={isEdit ? "Update" : "Save"}
          />
        </form>
      </HorizontalFormCard>
    </div>
  );
}


