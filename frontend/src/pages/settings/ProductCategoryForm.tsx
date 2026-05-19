import { useEffect, useState } from "react";
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
  createProductCategory,
  fetchProductCategoryById,
  updateProductCategory,
} from "../../api/productCategoryApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  category_name: string;
  description: string;
  is_active: number;
}

const INIT: FormData = { category_name: "", description: "", is_active: 1 };

const CATEGORY_OPTIONS = ["Pulse", "Electronics", "Gadgets", "Printer"];

export default function ProductCategoryForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchProductCategoryById(id)
      .then((data) =>
        setForm({
          category_name: data.category_name ?? "",
          description: data.description ?? "",
          is_active: Number(data.is_active ?? 1),
        })
      )
      .catch(() => setError("Failed to load product category."));
  }, [id, isEdit]);

  const set = (f: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => {
        const nextValue =
          f === "is_active"
            ? Number(e.target.value)
            : f === "description"
              ? e.target.value.replace(/[^A-Za-z0-9 ]/g, "")
              : e.target.value;

        return {
          ...p,
          [f]: nextValue,
        };
      });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.category_name.trim()) {
      const message = "Please enter product category name.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category_name: form.category_name.trim(),
        description: form.description.trim(),
        is_active: form.is_active,
      };

      const res = isEdit && id
        ? await updateProductCategory(id, payload)
        : await createProductCategory(payload);

      const isSuccess = res.status === true || res.status === 1 || (!('status' in res) && !res.error);
      if (isSuccess) {
        await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
        navigate("/settings/product-category/list");
        return;
      }

      const message =
        typeof res.error === "string"
          ? res.error
          : Object.values(res.error ?? {}).flat().join(" ") || res.message || "Validation failed.";
      setError(message);
      await showErrorAlert(message);
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
        title={isEdit ? "Edit Product Category" : "Add Product Category"}
        breadcrumbs={["Settings", "Product Category", isEdit ? "Edit" : "Add"]}
      />
     <HorizontalFormCard>
  <form onSubmit={handleSubmit}>
    <HorizontalFormBody className="space-y-4">
      {error && (
        <div className="col-span-2 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">

        {/* Left column */}
        {/* Left column */}
        <HorizontalFormRow label="Product Creation">
          <HorizontalFieldShell select>
            <SearchableSelectInput name="category_name"
              value={form.category_name}
              onChange={set("category_name")}
              required
              className={horizontalSelectCls}
            >
              <option value="">Select Product</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </SearchableSelectInput>
          </HorizontalFieldShell>
        </HorizontalFormRow>
        {/* Right column */}
        <HorizontalFormRow label="Status">
          <HorizontalFieldShell select>
            <SearchableSelectInput name="is_active"
              value={form.is_active}
              onChange={set("is_active")}
              className={horizontalSelectCls}
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </SearchableSelectInput>
          </HorizontalFieldShell>
        </HorizontalFormRow>

        {/* Description spans full width */}
        <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-4">
          <HorizontalFormRow label="Description">
            <HorizontalFieldShell>
              <textarea name="description"
                value={form.description}
                onChange={set("description")}
                placeholder="Enter description"
                className={`${horizontalInputCls} min-h-[96px] resize-y`}
              />
            </HorizontalFieldShell>
          </HorizontalFormRow>
        </div>

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


