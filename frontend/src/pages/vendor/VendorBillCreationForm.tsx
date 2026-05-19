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
  createVendorBillCreation,
  fetchVendorBillCreationById,
  updateVendorBillCreation,
} from "../../api/vendorBillCreationApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  name: string;
  is_active: number;
}

const INIT: FormData = {
  name: "",
  is_active: 1,
};

export default function VendorBillCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;

    let ignore = false;
    setLoading(true);
    setError(null);

    fetchVendorBillCreationById(id)
      .then((data) => {
        if (ignore) return;
        setForm({
          name: data.name ?? "",
          is_active: Number(data.is_active ?? 1),
        });
      })
      .catch(() => {
        if (!ignore) setError("Failed to load vendor bill creation details.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id, isEdit]);

  const set =
    (field: keyof FormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({
        ...prev,
        [field]: field === "is_active" ? Number(event.target.value) : event.target.value,
      }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();

    if (!name) {
      const message = "Please enter vendor bill name.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = { name, is_active: form.is_active };
      const res = isEdit && id
        ? await updateVendorBillCreation(id, payload)
        : await createVendorBillCreation(payload);

      if (!res.status) {
        const message =
          typeof res.error === "string"
            ? res.error
            : Object.values(res.error ?? {}).flat().join(" ") || "Failed to save vendor bill creation.";
        setError(message);
        await showErrorAlert(message);
        return;
      }

      await showSuccessAlert(isEdit ? "Vendor bill updated successfully." : "Vendor bill created successfully.");
      navigate("/vendor/bill-creation/list");
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
        title={isEdit ? "Edit Vendor Bill Creation" : "Add Vendor Bill Creation"}
        breadcrumbs={["Vendor Payment", "Vendor Bill Creation", isEdit ? "Edit" : "Add"]}
      />

      <HorizontalFormCard className="max-w-4xl">
        <form onSubmit={handleSubmit}>
          <HorizontalFormBody className="space-y-6">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="py-10 text-center text-ink-muted">
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
                  Loading...
                </span>
              </div>
            ) : (
              <>
                <p className="max-w-2xl text-[13px] leading-6 text-ink-secondary">
                  Maintain the vendor bill creation master in the same horizontal form layout used across the refreshed vendor workflow.
                </p>

                <div className="space-y-5">
                  <HorizontalFormRow label="Vendor Bill Name">
                    <HorizontalFieldShell>
                      <input name="name"
                        type="text"
                        value={form.name}
                        onChange={set("name")}
                        placeholder="Enter vendor bill name"
                        className={horizontalInputCls}
                        required
                      />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>

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
                </div>
              </>
            )}
          </HorizontalFormBody>

          <HorizontalFormActions
            onCancel={() => navigate("/vendor/bill-creation/list")}
            saving={saving}
            submitLabel={isEdit ? "Update" : "Save"}
          />
        </form>
      </HorizontalFormCard>
    </div>
  );
}
