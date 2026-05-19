import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  createPincode,
  fetchPincodeById,
  fetchPincodeCityOptions,
  fetchPincodeDistrictOptions,
  fetchPincodeStateOptions,
  updatePincode,
  type CityOption,
  type DistrictOption,
  type StateOption,
} from "../../api/pincodeApi";

interface FormData {
  state_name: string;
  district_name: string;
  city_name: string;
  pincode: string;
  is_active: number;
}

const INIT: FormData = {
  state_name: "",
  district_name: "",
  city_name: "",
  pincode: "",
  is_active: 1,
};
const PINCODE_REGEX = /^\d{6}$/;

export default function PincodeCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const pincodeId = id || searchParams.get("id") || "";
  const isEdit = Boolean(pincodeId);
  const [form, setForm] = useState<FormData>(INIT);
  const [states, setStates] = useState<StateOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchPincodeStateOptions()
      .then(setStates)
      .catch(() => setError("Failed to load states."));
  }, []);

  useEffect(() => {
    if (!isEdit || !pincodeId) return;
    setLoading(true);
    fetchPincodeById(pincodeId)
      .then(async (data) => {
        setForm({
          state_name: data.state_name,
          district_name: data.district_name,
          city_name: data.city_name,
          pincode: data.pincode,
          is_active: data.is_active,
        });

        if (data.state_name) {
          const districtOptions = await fetchPincodeDistrictOptions(data.state_name);
          setDistricts(districtOptions);
        }
        if (data.district_name) {
          const cityOptions = await fetchPincodeCityOptions(data.district_name, data.state_name);
          setCities(cityOptions);
        }
      })
      .catch(() => setError("Failed to load pincode details."))
      .finally(() => setLoading(false));
  }, [isEdit, pincodeId]);

  useEffect(() => {
    if (!form.state_name) {
      setDistricts([]);
      setCities([]);
      setForm((prev) => ({ ...prev, district_name: "", city_name: "" }));
      return;
    }

    fetchPincodeDistrictOptions(form.state_name)
      .then((options) => {
        setDistricts(options);
        setForm((prev) => ({
          ...prev,
          district_name: options.some((item) => item.unique_id === prev.district_name) ? prev.district_name : "",
          city_name: options.some((item) => item.unique_id === prev.district_name) ? prev.city_name : "",
        }));
      })
      .catch(() => setError("Failed to load districts."));
  }, [form.state_name]);

  useEffect(() => {
    if (!form.district_name) {
      setCities([]);
      setForm((prev) => ({ ...prev, city_name: "" }));
      return;
    }

    fetchPincodeCityOptions(form.district_name, form.state_name)
      .then((options) => {
        setCities(options);
        setForm((prev) => ({
          ...prev,
          city_name: options.some((item) => item.unique_id === prev.city_name) ? prev.city_name : "",
        }));
      })
      .catch(() => setError("Failed to load cities."));
  }, [form.district_name]);

  const set = (f: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({
        ...p,
        [f]: f === "is_active" ? Number(e.target.value) : f === "pincode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value,
      }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.state_name) return setError("Please select a state.");
    if (!form.district_name) return setError("Please select a district.");
    if (!form.city_name) return setError("Please select a city.");
    if (!PINCODE_REGEX.test(form.pincode)) return setError("Pincode must be exactly 6 digits.");

    setSaving(true);
    try {
      const payload = {
        state_name: form.state_name,
        district_name: form.district_name,
        city_name: form.city_name,
        pincode: form.pincode,
        is_active: form.is_active,
      };

      const res = isEdit && pincodeId
        ? await updatePincode(pincodeId, payload)
        : await createPincode(payload);

      if (res.status === true || res.status === 1) {
        navigate(-1);
        return;
      }

      const backendError =
        typeof res.error === "string"
          ? res.error
          : res.error?.pincode?.[0] ||
            res.error?.city_name?.[0] ||
            res.error?.district_name?.[0] ||
            res.error?.state_name?.[0];
      setError(backendError ?? "Failed to save pincode.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-ink-secondary text-sm">
        <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit Pincode " : "Add Pincode"}
        breadcrumbs={["Settings", "Pincode Creation", isEdit ? "Edit" : "Add"]}
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
                <>
                  <HorizontalFormRow label="State Name">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="state_name" value={form.state_name} onChange={set("state_name")} className={horizontalSelectCls}>
                        <option value="">Select State</option>
                        {states.map((item) => (
                          <option key={item.unique_id} value={item.unique_id}>
                            {item.state_name}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="City Name">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="city_name" value={form.city_name} onChange={set("city_name")} disabled={!form.district_name} className={horizontalSelectCls}>
                        <option value="">{form.district_name ? "Select City" : "Select District First"}</option>
                        {cities.map((item) => (
                          <option key={item.unique_id} value={item.unique_id}>
                            {item.city_name}
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
                <>
                  <HorizontalFormRow label="District Name">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="district_name" value={form.district_name} onChange={set("district_name")} disabled={!form.state_name} className={horizontalSelectCls}>
                        <option value="">{form.state_name ? "Select District" : "Select State First"}</option>
                        {districts.map((item) => (
                          <option key={item.unique_id} value={item.unique_id}>
                            {item.district_name}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Pincode">
                    <HorizontalFieldShell>
                      <input name="pincode"
                        type="text"
                        value={form.pincode}
                        onChange={set("pincode")}
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        title="Pincode must be exactly 6 digits"
                        placeholder="Enter 6 digit pincode"
                        className={horizontalInputCls}
                      />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                </>
              }
            />
          </HorizontalFormBody>
          <HorizontalFormActions onCancel={() => navigate(-1)} saving={saving} submitLabel={isEdit ? "Update" : "Save"} />
        </form>
      </HorizontalFormCard>
    </div>
  );
}

