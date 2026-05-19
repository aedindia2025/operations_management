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
  createCourier,
  fetchCourierById,
  updateCourier,
} from "../../api/courierCreationApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  courier_name: string;
  is_active: number;
}

const INIT: FormData = { courier_name: "", is_active: 1 };
const LETTERS_ONLY_REGEX = /^[A-Za-z ]+$/;

function getApiErrorMessage(data: any) {
  if (!data) return "Network error. Please try again.";

  if (typeof data.error === "string") return data.error;

  const groupedErrors = [
    data.error,
    data.errors,
    data.courier_name ? { courier_name: data.courier_name } : null,
  ]
    .filter(Boolean)
    .map((group) => Object.values(group).flat().join(" "))
    .find(Boolean);

  return groupedErrors || data.message || data.detail || "Network error. Please try again.";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Network error. Please try again.";
}

export default function CourierCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchCourierById(id)
      .then((data) =>
        setForm({
          courier_name: data.courier_name ?? "",
          is_active: Number(data.is_active ?? 1),
        })
      )
      .catch(() => setError("Failed to load courier."));
  }, [id, isEdit]);

  const set =
    (f: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;

      if (f === "courier_name") {
        const sanitizedValue = value.replace(/[^A-Za-z ]/g, "");
        setForm((p) => ({
          ...p,
          courier_name: sanitizedValue,
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

    const trimmedCourierName = form.courier_name.trim();

    if (!trimmedCourierName) {
      const message = "Please enter courier name.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!LETTERS_ONLY_REGEX.test(trimmedCourierName)) {
      const message = "Courier Name allows only alphabets.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        courier_name: trimmedCourierName,
        is_active: form.is_active,
      };

      const res = isEdit && id ? await updateCourier(id, payload) : await createCourier(payload);

      if (res.status) {
        await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
        navigate("/settings/courier/list");
      } else {
        const message =
          typeof res.error === "string"
            ? res.error
            : Object.values(res.error ?? {}).flat().join(" ") || "Validation failed.";
        setError(message);
        await showErrorAlert(message);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      await showErrorAlert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit Courier" : "Add Courier"}
        breadcrumbs={["Settings", "Courier Creation", isEdit ? "Edit" : "Add"]}
      />
<HorizontalFormCard >
        <form onSubmit={handleSubmit}>
          <HorizontalFormBody className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <HorizontalFormRow label="Courier Name">
                <HorizontalFieldShell>
                  <input name="courier_name"
                    type="text"
                    value={form.courier_name}
                    onChange={set("courier_name")}
                    required
                    placeholder="Enter courier name"
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
          <HorizontalFormActions onCancel={() => navigate(-1)} saving={saving} submitLabel={isEdit ? "Update" : "Save"} />
        </form>
      </HorizontalFormCard>    </div>
  );
}


