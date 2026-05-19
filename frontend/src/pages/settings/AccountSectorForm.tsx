import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
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
  fetchAccountSectorById,
  createAccountSector,
  updateAccountSector,
} from "../../api/accountSectorApi";
import {
  showErrorAlert,
  showSuccessAlert,
} from "../../utils/alerts";

interface FormData {
  sector_name: string;
  is_active: number;
}

const INIT: FormData = { sector_name: "", is_active: 1 };
const LETTERS_ONLY_REGEX = /^[A-Za-z ]+$/;

export default function AccountSectorForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    fetchAccountSectorById(id)
      .then((data) =>
        setForm({
          sector_name: data.sector_name,
          is_active: data.is_active,
        })
      )
      .catch(() => setError("Failed to load record."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;

      if (field === "sector_name") {
        const sanitizedValue = value.replace(/[^A-Za-z ]/g, "");
        setForm((prev) => ({ ...prev, sector_name: sanitizedValue }));
        if (error) setError(null);
        return;
      }

      setForm((prev) => ({
        ...prev,
        [field]: field === "is_active" ? Number(value) : value,
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const trimmedSectorName = form.sector_name.trim();

      if (!trimmedSectorName) {
        const message = "Account Sector is required.";
        setError(message);
        await showErrorAlert(message);
        return;
      }

      if (!LETTERS_ONLY_REGEX.test(trimmedSectorName)) {
        const message = "Account Sector must contain only alphabets.";
        setError(message);
        await showErrorAlert(message);
        return;
      }

      const payload = {
        sector_name: trimmedSectorName,
        is_active: form.is_active,
      };

      const res = isEdit && id
        ? await updateAccountSector(id, payload)
        : await createAccountSector(payload);

      if (res.msg === "already") {
        const message = "Sector name already exists.";
        setError(message);
        await showErrorAlert(message);
        return;
      }

      if (res.status === 1) {
        await showSuccessAlert(
          isEdit ? "Account Sector updated successfully" : "Account Sector created successfully"
        );
        navigate(-1);
      } else {
        const message = res.error ?? "Something went wrong.";
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

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-ink-secondary text-sm">
        <span
          className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500
          rounded-full animate-spin"
        />
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit Account Sector" : "Add Account Sector"}
        breadcrumbs={["Settings", "Account Sector", isEdit ? "Edit" : "Add"]}
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
                <HorizontalFormRow label="Account Sector">
                  <HorizontalFieldShell>
                    <input name="sector_name"
                      type="text"
                      value={form.sector_name}
                      onChange={set("sector_name")}
                      required
                      placeholder="Enter sector name"
                      pattern="[A-Za-z ]+"
                      title="Only alphabets are allowed"
                      className={horizontalInputCls}
                    />
                  </HorizontalFieldShell>
                </HorizontalFormRow>
              }
              right={
                <HorizontalFormRow label="Status">
                  <HorizontalFieldShell select>
                    <SearchableSelectInput name="is_active" value={form.is_active} onChange={set("is_active")} className={horizontalSelectCls}>
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


