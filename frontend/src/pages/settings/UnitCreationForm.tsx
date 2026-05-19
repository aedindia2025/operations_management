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
  horizontalTextareaCls,
} from "../../components/common/HorizontalForm";
import {
  createUnitCreation,
  fetchUnitCreationById,
  updateUnitCreation,
} from "../../api/unitCreationApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  unit_name: string;
  description: string;
  is_active: number;
}

const INIT: FormData = {
  unit_name: "",
  description: "",
  is_active: 1,
};
const UNIT_NAME_REGEX = /^[A-Za-z ]+$/;
const DESCRIPTION_REGEX = /^[A-Za-z0-9, ]+$/;

export default function UnitCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchUnitCreationById(id)
      .then((data) =>
        setForm({
          unit_name: data.unit_name ?? "",
          description: data.description ?? "",
          is_active: Number(data.is_active ?? 1),
        })
      )
      .catch(() => setError("Failed to load unit."));
  }, [id, isEdit]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      {
        const value = e.target.value;
        let sanitizedValue = value;

        if (field === "unit_name") {
          sanitizedValue = value.replace(/[^A-Za-z ]/g, "");
        } else if (field === "description") {
          sanitizedValue = value.replace(/[^A-Za-z0-9, ]/g, "");
        }

        setForm((prev) => ({
          ...prev,
          [field]: field === "is_active" ? Number(value) : sanitizedValue,
        }));

        if (error) setError(null);
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.unit_name.trim()) {
      const message = "Please enter the unit name.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!UNIT_NAME_REGEX.test(form.unit_name.trim())) {
      const message = "Unit Name allows only alphabets.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (form.description.trim() && !DESCRIPTION_REGEX.test(form.description.trim())) {
      const message = "Description allows only alphabets, numbers, spaces, and commas.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        unit_name: form.unit_name.trim(),
        description: form.description.trim(),
        is_active: form.is_active,
      };

      const res = isEdit && id
        ? await updateUnitCreation(id, payload)
        : await createUnitCreation(payload);

      if (res.status) {
        await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
        navigate("/settings/unit/list");
      } else {
        const message =
          typeof res.error === "string"
            ? res.error
            : Object.values(res.error ?? {}).flat().join(" ") || "Validation failed.";
        setError(message);
        await showErrorAlert(message);
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Network error. Please try again.";
      setError(message);
      await showErrorAlert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit Unit " : "Add Unit "}
        breadcrumbs={["Settings", "Unit Creation", isEdit ? "Edit" : "Add"]}
      />

      <HorizontalFormCard className="w-4xl">
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
                  <HorizontalFormRow label="Unit Name">
                    <HorizontalFieldShell>
                      <input name="unit_name" type="text" value={form.unit_name} onChange={set("unit_name")} pattern="[A-Za-z ]+" title="Only alphabets are allowed" placeholder="Enter unit name" className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Description" alignTop>
                    <HorizontalFieldShell textarea>
                      <textarea name="description" value={form.description} onChange={set("description")} rows={4} title="Only alphabets, numbers, spaces, and commas are allowed" placeholder="Enter description" className={horizontalTextareaCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                </>
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
          <HorizontalFormActions onCancel={() => navigate(-1)} saving={saving} submitLabel={isEdit ? "Update" : "Save"} />
        </form>
      </HorizontalFormCard>
    </div>
  );
}


