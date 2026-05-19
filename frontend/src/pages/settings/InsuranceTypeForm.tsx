import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  HorizontalFieldShell,
  HorizontalFormActions,
  HorizontalFormBody,
  HorizontalFormCard,
  HorizontalFormRow,
  horizontalInputCls,
  horizontalSelectCls,
} from "../../components/common/HorizontalForm";
import {
  createInsuranceType,
  fetchInsuranceTypeById,
  updateInsuranceType,
} from "../../api/insuranceTypeApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  insurance_name: string;
  is_active: number;
}

const INIT: FormData = { insurance_name: "", is_active: 1 };
const LETTERS_ONLY_REGEX = /^[A-Za-z ]+$/;

function getApiErrorMessage(data: any) {
  if (!data) return "Network error. Please try again.";

  if (typeof data.error === "string") return data.error;

  const groupedErrors = [
    data.error,
    data.errors,
    data.insurance_name ? { insurance_name: data.insurance_name } : null,
  ]
    .filter(Boolean)
    .map((group) => Object.values(group).flat().join(" "))
    .find(Boolean);

  return groupedErrors || data.message || data.detail || "Network error. Please try again.";
}

export default function InsuranceTypeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchInsuranceTypeById(id)
      .then((data) =>
        setForm({
          insurance_name: data.insurance_name ?? "",
          is_active: Number(data.is_active ?? 1),
        })
      )
      .catch(() => setError("Failed to load insurance type."));
  }, [id, isEdit]);

  const set =
    (f: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;

      if (f === "insurance_name") {
        const sanitizedValue = value.replace(/[^A-Za-z ]/g, "");
        setForm((p) => ({
          ...p,
          insurance_name: sanitizedValue,
        }));
        if (error) setError(null);
        return;
      }

      setForm((p) => ({
        ...p,
        [f]: f === "is_active" ? Number(value) : value,
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedInsuranceName = form.insurance_name.trim();

    if (!trimmedInsuranceName) {
      const message = "Please enter insurance type name.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!LETTERS_ONLY_REGEX.test(trimmedInsuranceName)) {
      const message = "Insurance Type must contain only alphabets.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        insurance_name: trimmedInsuranceName,
        is_active: form.is_active,
      };

      const res = isEdit && id
        ? await updateInsuranceType(id, payload)
        : await createInsuranceType(payload);

      const isSuccess = res.status === true || res.status === 1 || (!("status" in res) && !res.error);
      if (isSuccess) {
        await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
        navigate("/settings/insurance-type/list");
        return;
      }

      const message =
        typeof res.error === "string"
          ? res.error
          : Object.values(res.error ?? {}).flat().join(" ") || res.message || "Validation failed.";
      setError(message);
      await showErrorAlert(message);
    } catch (err: any) {
      const message = getApiErrorMessage(err?.response?.data);
      setError(message);
      await showErrorAlert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit Insurance Type" : "Add Insurance Type"}
        breadcrumbs={["Settings", "Insurance Type", isEdit ? "Edit" : "Add"]}
      />
      <HorizontalFormCard>
        <form onSubmit={handleSubmit}>
          <HorizontalFormBody className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <HorizontalFormRow label="Insurance Type">
                <HorizontalFieldShell>
                  <input name="insurance_name"
                    type="text"
                    value={form.insurance_name}
                    onChange={set("insurance_name")}
                    required
                    placeholder="Enter insurance type"
                    pattern="[A-Za-z ]+"
                    title="Only alphabets are allowed"
                    className={horizontalInputCls}
                  />
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
            </div>
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


