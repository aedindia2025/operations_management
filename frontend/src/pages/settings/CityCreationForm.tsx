import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  createCity,
  fetchCityById,
  fetchCityDistrictOptions,
  fetchCityStateOptions,
  updateCity,
  type DistrictOption,
  type StateOption,
} from "../../api/cityApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  state_name: string;
  district_name: string;
  city_name: string;
  is_active: number;
}

type FormErrors = Partial<Record<keyof FormData | "submit", string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const INIT_FORM: FormData = {
  state_name: "",
  district_name: "",
  city_name: "",
  is_active: 1,
};

// ─── Sanitizer ────────────────────────────────────────────────────────────────

function sanitizeCityName(value: string): string {
  // Allow letters (including Tamil/Unicode), spaces, hyphens, dots only
  return value.replace(/[^a-zA-Z\u0B80-\u0BFF\s\-\.]/g, "");
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!form.state_name) {
    errors.state_name = "Please select a state.";
  }
  if (!form.district_name) {
    errors.district_name = "Please select a district.";
  }
  if (!form.city_name.trim()) {
    errors.city_name = "Please enter a city name.";
  } else if (form.city_name.trim().length < 2) {
    errors.city_name = "City name must be at least 2 characters.";
  } else if (form.city_name.trim().length > 100) {
    errors.city_name = "City name must not exceed 100 characters.";
  }

  return errors;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CityCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const cityId = id || searchParams.get("id") || "";
  const isEdit = Boolean(cityId);

  const [form, setForm] = useState<FormData>(INIT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<StateOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);

  // ── Load state options on mount ──────────────────────────────────────────

  useEffect(() => {
    fetchCityStateOptions()
      .then(setStates)
      .catch(() =>
        setErrors((prev) => ({ ...prev, submit: "Failed to load states." }))
      );
  }, []);

  // ── Load city details in edit mode ───────────────────────────────────────

  useEffect(() => {
    if (!isEdit || !cityId) return;

    setLoading(true);

    fetchCityById(cityId)
      .then(async (data) => {
        setForm({
          state_name: data.state_name,
          district_name: data.district_name,
          city_name: data.city_name,
          is_active: data.is_active,
        });

        if (data.state_name) {
          const districtOptions = await fetchCityDistrictOptions(data.state_name);
          setDistricts(districtOptions);
        }
      })
      .catch(() =>
        setErrors((prev) => ({ ...prev, submit: "Failed to load city details." }))
      )
      .finally(() => setLoading(false));
  }, [cityId, isEdit]);

  // ── Refresh districts when state changes ─────────────────────────────────

  useEffect(() => {
    if (!form.state_name) {
      setDistricts([]);
      setForm((prev) => ({ ...prev, district_name: "" }));
      return;
    }

    fetchCityDistrictOptions(form.state_name)
      .then((options) => {
        setDistricts(options);
        setForm((prev) => {
          const stillValid = options.some((d) => d.unique_id === prev.district_name);
          return stillValid ? prev : { ...prev, district_name: "" };
        });
      })
      .catch(() =>
        setErrors((prev) => ({ ...prev, submit: "Failed to load districts." }))
      );
  }, [form.state_name]);

  // ── Field change handler ──────────────────────────────────────────────────

  const handleChange =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let value: string | number =
        field === "is_active" ? Number(e.target.value) : e.target.value;

      if (field === "city_name") {
        value = sanitizeCityName(value as string);
      }

      setForm((prev) => ({ ...prev, [field]: value }));

      // Clear field-level error on change
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
        state_name: form.state_name,
        district_name: form.district_name,
        city_name: form.city_name.trim(),
        is_active: form.is_active,
      };

      const res =
        isEdit && cityId
          ? await updateCity(cityId, payload)
          : await createCity(payload);

      if (res.status === true || res.status === 1) {
        await showSuccessAlert(
          isEdit ? "Successfully record updated" : "Successfully record saved"
        );
        navigate(-1);
        return;
      }

      const backendError =
        typeof res.error === "string"
          ? res.error
          : res.error?.city_name?.[0] ||
            res.error?.district_name?.[0] ||
            res.error?.state_name?.[0];

      setErrors({ submit: backendError ?? res.message ?? "Something went wrong." });
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-ink-secondary text-sm">
        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit City" : "Add City"}
        breadcrumbs={["Settings", "City Creation", isEdit ? "Edit" : "Add"]}
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
                <>
                  {/* State */}
                  <HorizontalFormRow label="State Name">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="state_name"
                        value={form.state_name}
                        onChange={handleChange("state_name")}
                        className={horizontalSelectCls}
                      >
                        <option value="">Select State</option>
                        {states.map((state) => (
                          <option key={state.unique_id} value={state.unique_id}>
                            {state.state_name}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                    {errors.state_name && (
                      <p className="mt-1 text-xs text-red-500">{errors.state_name}</p>
                    )}
                  </HorizontalFormRow>

                  {/* City */}
                  <HorizontalFormRow label="City Name">
                    <HorizontalFieldShell>
                      <input name="city_name"
                        type="text"
                        value={form.city_name}
                        onChange={handleChange("city_name")}
                        placeholder="Enter city name"
                        className={horizontalInputCls}
                      />
                    </HorizontalFieldShell>
                    {errors.city_name && (
                      <p className="mt-1 text-xs text-red-500">{errors.city_name}</p>
                    )}
                  </HorizontalFormRow>
                </>
              }
              right={
                <>
                  {/* District */}
                  <HorizontalFormRow label="District Name">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="district_name"
                        value={form.district_name}
                        onChange={handleChange("district_name")}
                        disabled={!form.state_name}
                        className={horizontalSelectCls}
                      >
                        <option value="">
                          {form.state_name ? "Select District" : "Select State First"}
                        </option>
                        {districts.map((district) => (
                          <option key={district.unique_id} value={district.unique_id}>
                            {district.district_name}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                    {errors.district_name && (
                      <p className="mt-1 text-xs text-red-500">{errors.district_name}</p>
                    )}
                  </HorizontalFormRow>

                  {/* Status */}
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
                </>
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

