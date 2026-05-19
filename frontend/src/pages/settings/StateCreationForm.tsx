import { useState, useEffect } from "react";
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
import { fetchStateById, createState, updateState } from "../../api/stateApi";
import { showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  state_name: string;
  short_name: string;
  is_active: number;
}

const INIT: FormData = { state_name: "", short_name: "", is_active: 1 };

export default function StateCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchStateById(id)
      .then((data) =>
        setForm({
          state_name: data.state_name,
          short_name: data.short_name ?? "",
          is_active: data.is_active,
        })
      )
      .catch(() => setError("Failed to load state."));
  }, [id, isEdit]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({
        ...prev,
        [field]:
          field === "is_active"
            ? Number(e.target.value)
            : field === "state_name"
              ? e.target.value.replace(/[^A-Za-z ]/g, "")
              : field === "short_name"
                ? e.target.value.replace(/[^A-Za-z]/g, "")
                : e.target.value,
      }));

  const markTouched = (field: keyof FormData) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const hasStateName = Boolean(form.state_name.trim());
  const hasShortName = Boolean(form.short_name.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTouched({
      state_name: true,
      short_name: true,
    });

    if (!form.state_name.trim()) {
      setError("Please enter the state name.");
      return;
    }

    if (!form.short_name.trim()) {
      setError("Please enter the short name.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        state_name: form.state_name.trim(),
        short_name: form.short_name.trim(),
        is_active: form.is_active,
      };

      const res = isEdit && id ? await updateState(id, payload) : await createState(payload);

      if (res.msg === "already") {
        setError("State name already exists.");
        return;
      }

      if (res.status === 1) {
        await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
        navigate(-1);
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit State Creation" : "Add State Creation"}
        breadcrumbs={["Settings", "State Creation", isEdit ? "Edit" : "Add"]}
      />

      <HorizontalFormCard>
        <form onSubmit={handleSubmit}>
          <HorizontalFormBody>
            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <HorizontalFormColumns
              left={
                <>
                  <HorizontalFormRow label="State Name">
                    <HorizontalFieldShell invalid={Boolean(touched.state_name && !hasStateName)}>
                      <input name="state_name"
                        type="text"
                        value={form.state_name}
                        onChange={set("state_name")}
                        onBlur={() => markTouched("state_name")}
                        className={horizontalInputCls}
                      />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Short Name">
                    <HorizontalFieldShell invalid={Boolean(touched.short_name && !hasShortName)}>
                      <input name="short_name"
                        type="text"
                        value={form.short_name}
                        onChange={set("short_name")}
                        onBlur={() => markTouched("short_name")}
                        className={horizontalInputCls}
                      />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                </>
              }
              right={
                <HorizontalFormRow label="Active Status">
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
