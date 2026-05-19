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
  fetchStateOptions,
  fetchDistrictById,
  createDistrict,
  updateDistrict,
  StateOption,
} from "../../api/districtApi";

interface FormData {
  district_name : string;
  state_name    : string;   // state unique_id
  is_active     : number;
}

const INIT: FormData = { district_name: "", state_name: "", is_active: 1 };

export default function DistrictCreationForm() {
  const navigate              = useNavigate();
  const { id }                = useParams<{ id: string }>();
  const isEdit                = Boolean(id);
  const [form, setForm]       = useState<FormData>(INIT);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [states, setStates]   = useState<StateOption[]>([]);

  // ── Load state dropdown options ──────────────────────────────────
  useEffect(() => {
    fetchStateOptions()
      .then(setStates)
      .catch(() => setError("Failed to load states."));
  }, []);

  // ── Load existing record on edit ─────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    fetchDistrictById(id)
      .then(data => setForm({
        district_name : data.district_name,
        state_name    : data.state_name,
        is_active     : data.is_active,
      }))
      .catch(() => setError("Failed to load district details."))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Generic field updater ────────────────────────────────────────
  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({
        ...prev,
        [field]:
          field === "is_active"
            ? Number(e.target.value)
            : field === "district_name"
              ? e.target.value.replace(/[^A-Za-z ]/g, "")
              : e.target.value,
      }));

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.state_name) {
      setError("Please select a state.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        district_name : form.district_name.trim(),
        state_name    : form.state_name,
        is_active     : form.is_active,
      };

      const res = isEdit && id
        ? await updateDistrict(id, payload)
        : await createDistrict(payload);

      if (res.msg === "already") { setError("District name already exists."); return; }
      if (res.status === 1)      { await showSuccessAlert(isEdit ? "Successfully record updated" : "Successfully record saved");navigate(-1); }
      else                       { setError(res.error ?? "Something went wrong."); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-ink-secondary text-sm">
        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500
          rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

return (
  <div className="p-6">
    <PageTopbar
      title={isEdit ? "Edit District" : "Add District"}
      breadcrumbs={["Settings", "District Creation", isEdit ? "Edit" : "Add"]}
    />

    {/* ✅ Full width container */}
    <HorizontalFormCard className="w-full">
      <form onSubmit={handleSubmit}>
        <HorizontalFormBody>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

          <HorizontalFormColumns
            left={
              <>
                <HorizontalFormRow label="State Name">
                  <HorizontalFieldShell select>
                    <SearchableSelectInput name="state_name" value={form.state_name} onChange={set("state_name")} required className={horizontalSelectCls}>
                      <option value="">Select State</option>
                      {states.map((s) => (
                        <option key={s.unique_id} value={s.unique_id}>
                          {s.state_name}
                        </option>
                      ))}
                    </SearchableSelectInput>
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
              <HorizontalFormRow label="District Name">
                <HorizontalFieldShell>
                  <input name="district_name"
                    type="text"
                    value={form.district_name}
                    onChange={set("district_name")}
                    required
                    placeholder="e.g. Chennai"
                    className={horizontalInputCls}
                  />
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


