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
  horizontalTextareaCls,
} from "../../components/common/HorizontalForm";
import {
  createConsigneeCreation,
  fetchConsigneeCreationById,
  fetchConsigneeDistrictOptions,
  updateConsigneeCreation,
  type DistrictOption,
} from "../../api/consigneeCreationApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  consignee_address: string;
  consignee_district: string;
  consignee_pincode: string;
  consignee_contactnumber: string;
  is_active: number;
}

const INIT: FormData = {
  consignee_address: "",
  consignee_district: "",
  consignee_pincode: "",
  consignee_contactnumber: "",
  is_active: 1,
};
const CONSIGNEE_ADDRESS_REGEX = /^[A-Za-z0-9, ]+$/;
const PINCODE_REGEX = /^\d{6}$/;
const CONTACT_NUMBER_REGEX = /^\d{10}$/;

export default function ConsigneeCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);

  useEffect(() => {
    fetchConsigneeDistrictOptions()
      .then(setDistrictOptions)
      .catch(() => setError("Failed to load district options."));
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;

    fetchConsigneeCreationById(id)
      .then((data) =>
        setForm({
          consignee_address: data.consignee_address ?? "",
          consignee_district: data.consignee_district ?? "",
          consignee_pincode: data.consignee_pincode ?? "",
          consignee_contactnumber: data.consignee_contactnumber ?? "",
          is_active: Number(data.is_active ?? 1),
        })
      )
      .catch(() => setError("Failed to load consignee record."));
  }, [id, isEdit]);

  const set =
    (f: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      {
        const value = e.target.value;

        let sanitizedValue = value;
        if (f === "consignee_address") {
          sanitizedValue = value.replace(/[^A-Za-z0-9, ]/g, "");
        } else if (f === "consignee_pincode") {
          sanitizedValue = value.replace(/\D/g, "").slice(0, 6);
        } else if (f === "consignee_contactnumber") {
          sanitizedValue = value.replace(/\D/g, "").slice(0, 10);
        }

        setForm((p) => ({
          ...p,
          [f]: f === "is_active" ? Number(value) : sanitizedValue,
        }));

        if (error) setError(null);
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.consignee_address.trim()) {
      setError("Please enter the consignee address.");
      await showErrorAlert("Please enter the consignee address.");
      return;
    }

    if (!CONSIGNEE_ADDRESS_REGEX.test(form.consignee_address.trim())) {
      setError("Consignee Address allows only alphabets, numbers, spaces, and commas.");
      await showErrorAlert("Consignee Address allows only alphabets, numbers, spaces, and commas.");
      return;
    }

    if (!form.consignee_district) {
      setError("Please select the consignee district.");
      await showErrorAlert("Please select the consignee district.");
      return;
    }

    if (!PINCODE_REGEX.test(form.consignee_pincode)) {
      setError("Pincode must be exactly 6 digits.");
      await showErrorAlert("Pincode must be exactly 6 digits.");
      return;
    }

    if (!CONTACT_NUMBER_REGEX.test(form.consignee_contactnumber)) {
      setError("Contact number must be exactly 10 digits.");
      await showErrorAlert("Contact number must be exactly 10 digits.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        consignee_address: form.consignee_address.trim(),
        consignee_district: form.consignee_district,
        consignee_pincode: form.consignee_pincode.trim(),
        consignee_contactnumber: form.consignee_contactnumber.trim(),
        is_active: form.is_active,
      };

      const res =
        isEdit && id
          ? await updateConsigneeCreation(id, payload)
          : await createConsigneeCreation(payload);

      if (res.status) {
        await showSuccessAlert(
          isEdit ? "Successfully updated" : "Successfully record saved"
        );
        navigate("/settings/consignee/list");
      } else {
        const errorMessage =
          typeof res.error === "string"
            ? res.error
            : Object.values(res.error ?? {})
                .flat()
                .join(" ") || "Something went wrong.";
        setError(errorMessage);
        await showErrorAlert(errorMessage);
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
        title={isEdit ? "Edit Consignee" : "Add Consignee"}
        breadcrumbs={["Settings", "Consignee Creation", isEdit ? "Edit" : "Add"]}
      />
      <HorizontalFormCard className="w-full w-5xl">
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
                  <HorizontalFormRow label="Consignee Address" alignTop>
                    <HorizontalFieldShell textarea>
                      <textarea name="consignee_address"
                        value={form.consignee_address}
                        onChange={set("consignee_address")}
                        rows={4}
                        placeholder="Enter consignee address"
                        title="Only alphabets, numbers, spaces, and commas are allowed"
                        className={horizontalTextareaCls}
                      />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Consignee Pincode">
                    <HorizontalFieldShell>
                      <input name="consignee_pincode"
                        type="text"
                        value={form.consignee_pincode}
                        onChange={(e) => setForm((prev) => ({ ...prev, consignee_pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                        inputMode="numeric"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        title="Pincode must be exactly 6 digits"
                        placeholder="Enter 6 digit pincode"
                        className={horizontalInputCls}
                      />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                </>
              }
              right={
                <>
                  <HorizontalFormRow label="Consignee District">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="consignee_district" value={form.consignee_district} onChange={set("consignee_district")} className={horizontalSelectCls}>
                        <option value="">Select district</option>
                        {districtOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Consignee Contact Number">
                    <HorizontalFieldShell>
                      <input name="consignee_contactnumber"
                        type="text"
                        value={form.consignee_contactnumber}
                        onChange={(e) => setForm((prev) => ({ ...prev, consignee_contactnumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                        inputMode="numeric"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        title="Contact number must be exactly 10 digits"
                        placeholder="Enter 10 digit contact number"
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


