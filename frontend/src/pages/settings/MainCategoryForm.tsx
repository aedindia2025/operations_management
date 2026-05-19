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
  createMainCategory,
  fetchMainCategoryById,
  updateMainCategory,
} from "../../api/mainCategoryApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  main_category: string;
  description: string;
  is_active: number;
}

const INIT: FormData = {
  main_category: "",
  description: "",
  is_active: 1,
};
const LETTERS_ONLY_REGEX = /^[A-Za-z ]+$/;

export default function MainCategoryForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchMainCategoryById(id)
      .then((data) =>
        setForm({
          main_category: data.main_category ?? "",
          description: data.description ?? "",
          is_active: Number(data.is_active ?? 1),
        })
      )
      .catch(() => setError("Failed to load main category."));
  }, [id, isEdit]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      {
        const value = e.target.value;
        let sanitizedValue = value;

        if (field === "main_category" || field === "description") {
          sanitizedValue = value.replace(/[^A-Za-z ]/g, "");
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

    if (!form.main_category.trim()) {
      const message = "Please enter the main category.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!LETTERS_ONLY_REGEX.test(form.main_category.trim())) {
      const message = "Main Category allows only alphabets.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (form.description.trim() && !LETTERS_ONLY_REGEX.test(form.description.trim())) {
      const message = "Description allows only alphabets.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        main_category: form.main_category.trim(),
        description: form.description.trim(),
        is_active: form.is_active,
      };

      const res = isEdit && id
        ? await updateMainCategory(id, payload)
        : await createMainCategory(payload);

      if (res.status) {
        await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
        navigate("/settings/main-category/list");
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
        title={isEdit ? "Edit Main Category" : "Add Main Category"}
        breadcrumbs={["Settings", "Main Category", isEdit ? "Edit" : "Add"]}
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
                  <HorizontalFormRow label="Main Category">
                    <HorizontalFieldShell>
                      <input name="main_category" type="text" value={form.main_category} onChange={set("main_category")} pattern="[A-Za-z ]+" title="Only alphabets are allowed" placeholder="Enter main category" className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Description" alignTop>
                    <HorizontalFieldShell textarea>
                      <textarea name="description" value={form.description} onChange={set("description")} rows={4} title="Only alphabets are allowed" placeholder="Enter description" className={horizontalTextareaCls} />
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


