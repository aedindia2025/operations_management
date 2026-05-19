import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
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
  createVendorCreation,
  fetchVendorCreationById,
  fetchVendorDistrictOptions,
  fetchVendorId,
  fetchVendorStateOptions,
  updateVendorCreation,
  type VendorDistrictOption,
  type VendorStateOption,
} from "../../api/vendorCreationApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type ValidationField =
  | "name"
  | "contact_no"
  | "alt_contact_no"
  | "pan_no"
  | "gst_no"
  | "ifsc_code"
  | "account_no"
  | "acc_holder_name"
  | "bank_name"
  | "branch_name"
  | "zone_name";

type ValidationErrors = Partial<Record<ValidationField, string>>;

interface FormData {
  vendor_id: string;
  company_name: string;
  name: string;
  contact_no: string;
  alt_contact_no: string;
  mail_id: string;
  pan_no: string;
  gst_no: string;
  address: string;
  state_name: string;
  district_name: string;
  zone_name: string;
  pincode: string;
  bank_name: string;
  branch_name: string;
  account_no: string;
  ifsc_code: string;
  acc_holder_name: string;
  user_name: string;
  password: string;
  confirm_password: string;
  is_active: number;
  pan_copy: File | null;
  bank_proof: File | null;
}

const INIT: FormData = {
  vendor_id: "",
  company_name: "",
  name: "",
  contact_no: "",
  alt_contact_no: "",
  mail_id: "",
  pan_no: "",
  gst_no: "",
  address: "",
  state_name: "",
  district_name: "",
  zone_name: "",
  pincode: "",
  bank_name: "",
  branch_name: "",
  account_no: "",
  ifsc_code: "",
  acc_holder_name: "",
  user_name: "",
  password: "",
  confirm_password: "",
  is_active: 1,
  pan_copy: null,
  bank_proof: null,
};

const MOBILE_REGEX = /^[6-9]\d{9}$/;

export default function VendorCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [stateOptions, setStateOptions] = useState<VendorStateOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<VendorDistrictOption[]>([]);
  const [existingPanCopy, setExistingPanCopy] = useState("");
  const [existingBankProof, setExistingBankProof] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const trimValue = (value: string) => value.trim();

  const normalizeFieldValue = (field: keyof FormData, value: string) => {
    switch (field) {
      case "contact_no":
      case "alt_contact_no":
        return value.replace(/\D/g, "").slice(0, 10);
      case "pincode":
        return value.replace(/\D/g, "").slice(0, 6);
      case "pan_no":
        return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
      case "gst_no":
        return value.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "").slice(0, 15);
      case "ifsc_code":
        return value.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "").slice(0, 11);
      case "account_no":
        return value.replace(/\D/g, "").slice(0, 18);
      case "name":
        return value.replace(/[^A-Za-z., ]/g, "").slice(0, 100);
      case "acc_holder_name":
        return value.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 50);
      case "bank_name":
        return value.replace(/[^A-Za-z.& -]/g, "").slice(0, 100);
      case "branch_name":
        return value.replace(/[^A-Za-z0-9.,/&() -]/g, "").slice(0, 100);
      case "zone_name":
        return value.replace(/[^A-Za-z -]/g, "").slice(0, 50);
      default:
        return value;
    }
  };

  const validateField = (field: ValidationField, rawValue: string): string => {
    const value = trimValue(rawValue);

    switch (field) {
      case "name":
        if (!value) return "Contact Person is required.";
        if (!/^[A-Za-z., ]+$/.test(value)) {
          return "Contact Person allows only alphabets, dots, and commas.";
        }
        return "";
      case "contact_no":
        if (!value) return "Contact No is required.";
        if (!MOBILE_REGEX.test(value)) {
          return "Contact No must be 10 digits and start with 6, 7, 8, or 9.";
        }
        return "";
      case "alt_contact_no":
        if (!value) return "";
        if (!MOBILE_REGEX.test(value)) {
          return "Alt Contact No must be 10 digits and start with 6, 7, 8, or 9.";
        }
        return "";
      case "pan_no":
        if (!value) return "PAN Number is required.";
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) {
          return "PAN Number must be 10 characters in format ABCDE1234F.";
        }
        return "";
      case "gst_no":
        if (!value) return "GST Number is required.";
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(value)) {
          return "GST Number must be 15 characters in valid GST format.";
        }
        return "";
      case "ifsc_code":
        if (!value) return "IFSC Code is required.";
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
          return "IFSC Code must be 11 characters in valid IFSC format.";
        }
        return "";
      case "account_no":
        if (!value) return "Bank Account Number is required.";
        if (!/^\d{9,18}$/.test(value)) {
          return "Bank Account Number must contain 9 to 18 digits only.";
        }
        return "";
      case "acc_holder_name":
        if (!value) return "Account Holder Name is required.";
        if (value.length < 2 || value.length > 50) {
          return "Account Holder Name must be between 2 and 50 characters.";
        }
        if (!/^[A-Za-z0-9 ]+$/.test(value)) {
          return "Account Holder Name allows only alphabets and numbers.";
        }
        return "";
      case "bank_name":
        if (!value) return "Bank Name is required.";
        if (value.length < 2 || value.length > 100) {
          return "Bank Name must be between 2 and 100 characters.";
        }
        if (!/^[A-Za-z.& -]+$/.test(value)) {
          return "Bank Name allows only letters, spaces, dot, ampersand, and hyphen.";
        }
        return "";
      case "branch_name":
        if (!value) return "Branch Name is required.";
        if (value.length < 2 || value.length > 100) {
          return "Branch Name must be between 2 and 100 characters.";
        }
        if (!/^[A-Za-z0-9.,/&() -]+$/.test(value)) {
          return "Branch Name has invalid characters.";
        }
        return "";
      case "zone_name":
        if (!value) return "Zone Name is required.";
        if (value.length < 2 || value.length > 50) {
          return "Zone Name must be between 2 and 50 characters.";
        }
        if (!/^[A-Za-z -]+$/.test(value)) {
          return "Zone Name allows only letters, spaces, and hyphen.";
        }
        return "";
      default:
        return "";
    }
  };

  const validateAllFields = (data: FormData) => {
    const nextErrors: ValidationErrors = {};
    const fields: ValidationField[] = [
      "name",
      "contact_no",
      "alt_contact_no",
      "pan_no",
      "gst_no",
      "ifsc_code",
      "account_no",
      "acc_holder_name",
      "bank_name",
      "branch_name",
      "zone_name",
    ];

    fields.forEach((field) => {
      const message = validateField(field, String(data[field] ?? ""));
      if (message) nextErrors[field] = message;
    });

    return nextErrors;
  };

  useEffect(() => {
    fetchVendorStateOptions()
      .then(setStateOptions)
      .catch(() => setError("Failed to load states."));
  }, []);

  useEffect(() => {
    if (!form.state_name) {
      setDistrictOptions([]);
      return;
    }

    fetchVendorDistrictOptions(form.state_name)
      .then(setDistrictOptions)
      .catch(() => setError("Failed to load districts."));

    if (!isEdit) {
      fetchVendorId(form.state_name)
        .then((vendorId) => setForm((prev) => ({ ...prev, vendor_id: vendorId })))
        .catch(() => setError("Failed to generate vendor ID."));
    }
  }, [form.state_name, isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchVendorCreationById(id)
      .then((data) => {
        setForm({
          vendor_id: data.vendor_id ?? "",
          company_name: data.company_name ?? "",
          name: data.name ?? "",
          contact_no: data.contact_no ?? "",
          alt_contact_no: data.alt_contact_no ?? "",
          mail_id: data.mail_id ?? "",
          pan_no: data.pan_no ?? "",
          gst_no: data.gst_no ?? "",
          address: data.address ?? "",
          state_name: data.state_name ?? "",
          district_name: data.district_name ?? "",
          zone_name: data.zone_name ?? "",
          pincode: data.pincode ?? "",
          bank_name: data.bank_name ?? "",
          branch_name: data.branch_name ?? "",
          account_no: data.account_no ?? "",
          ifsc_code: data.ifsc_code ?? "",
          acc_holder_name: data.acc_holder_name ?? "",
          user_name: data.user_name ?? "",
          password: data.password ?? "",
          confirm_password: data.confirm_password ?? data.password ?? "",
          is_active: Number(data.is_active ?? 1),
          pan_copy: null,
          bank_proof: null,
        });
        setExistingPanCopy(data.pan_attach_file_name || data.pan_attach_file_org_name || "");
        setExistingBankProof(data.bank_proof || data.bank_proof_org_name || "");
      })
      .catch(() => setError("Failed to load vendor."));
  }, [id, isEdit]);

  const set =
    (field: keyof FormData) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => {
        const nextValue =
          field === "is_active"
            ? Number(e.target.value)
            : normalizeFieldValue(field, e.target.value);

        if (
          field === "name" ||
          field === "contact_no" ||
          field === "alt_contact_no" ||
          field === "pan_no" ||
          field === "gst_no" ||
          field === "ifsc_code" ||
          field === "account_no" ||
          field === "acc_holder_name" ||
          field === "bank_name" ||
          field === "branch_name" ||
          field === "zone_name"
        ) {
          setFieldErrors((current) => ({
            ...current,
            [field]: validateField(field, String(nextValue)),
          }));
        }

        return {
          ...prev,
          [field]: nextValue,
          ...(field === "state_name" ? { district_name: "" } : {}),
        };
      });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedForm: FormData = {
      ...form,
      company_name: trimValue(form.company_name),
      name: trimValue(form.name),
      contact_no: trimValue(form.contact_no),
      alt_contact_no: trimValue(form.alt_contact_no),
      mail_id: trimValue(form.mail_id),
      pan_no: trimValue(form.pan_no),
      gst_no: trimValue(form.gst_no),
      address: trimValue(form.address),
      zone_name: trimValue(form.zone_name),
      pincode: trimValue(form.pincode),
      bank_name: trimValue(form.bank_name),
      branch_name: trimValue(form.branch_name),
      account_no: trimValue(form.account_no),
      ifsc_code: trimValue(form.ifsc_code),
      acc_holder_name: trimValue(form.acc_holder_name),
      user_name: trimValue(form.user_name),
      password: trimValue(form.password),
      confirm_password: trimValue(form.confirm_password),
    };

    const nextErrors = validateAllFields(trimmedForm);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const message = "Please correct the highlighted field errors.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!trimmedForm.company_name || !trimmedForm.name || !trimmedForm.contact_no) {
      const message = "Please fill company name, contact person, and contact number.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (trimmedForm.pincode && trimmedForm.pincode.length !== 6) {
      const message = "Pincode must be 6 digits.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!trimmedForm.pan_copy && !existingPanCopy) {
      const message = "Pan Copy Attach is required.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!trimmedForm.bank_proof && !existingBankProof) {
      const message = "Bank Proof Attach is required.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if ((trimmedForm.password || trimmedForm.confirm_password) && trimmedForm.password !== trimmedForm.confirm_password) {
      const message = "Password and Confirm Password must match.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    try {
      const payload = { ...trimmedForm };

      const res = isEdit && id
        ? await updateVendorCreation(id, payload)
        : await createVendorCreation(payload);

      if (res.status) {
        await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
        navigate("/settings/vendor/list");
      } else {
        const message =
          typeof res.error === "string"
            ? res.error
            : Object.values(res.error ?? {}).flat().join(" ") || "Validation failed.";
        setError(message);
        await showErrorAlert(message);
      }
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
        title={isEdit ? "Edit Vendor" : "Add Vendor"}
        breadcrumbs={["Settings", "Vendor Creation", isEdit ? "Edit" : "Add"]}
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
                  
                  <HorizontalFormRow label="Company Name">
                    <HorizontalFieldShell>
                      <input name="company_name" value={form.company_name} onChange={set("company_name")} className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Name">
                    <>
                      <HorizontalFieldShell>
                        <input name="name" value={form.name} onChange={set("name")} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Contact No">
                    <>
                      <HorizontalFieldShell>
                        <input name="contact_no" value={form.contact_no} onChange={set("contact_no")} inputMode="numeric" maxLength={10} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.contact_no && <p className="mt-1 text-sm text-red-600">{fieldErrors.contact_no}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Alt Contact No">
                    <>
                      <HorizontalFieldShell>
                        <input name="alt_contact_no" value={form.alt_contact_no} onChange={set("alt_contact_no")} inputMode="numeric" maxLength={10} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.alt_contact_no && <p className="mt-1 text-sm text-red-600">{fieldErrors.alt_contact_no}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Email ID">
                    <HorizontalFieldShell>
                      <input name="mail_id" type="email" value={form.mail_id} onChange={set("mail_id")} className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="PAN No">
                    <>
                      <HorizontalFieldShell>
                        <input name="pan_no" value={form.pan_no} onChange={set("pan_no")} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.pan_no && <p className="mt-1 text-sm text-red-600">{fieldErrors.pan_no}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="GST No">
                    <>
                      <HorizontalFieldShell>
                        <input name="gst_no" value={form.gst_no} onChange={set("gst_no")} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.gst_no && <p className="mt-1 text-sm text-red-600">{fieldErrors.gst_no}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Address" alignTop>
                    <HorizontalFieldShell textarea>
                      <textarea name="address" value={form.address} onChange={set("address")} rows={4} className={horizontalTextareaCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Bank Name">
                    <>
                      <HorizontalFieldShell>
                        <input name="bank_name" value={form.bank_name} onChange={set("bank_name")} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.bank_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.bank_name}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Branch Name">
                    <>
                      <HorizontalFieldShell>
                        <input name="branch_name" value={form.branch_name} onChange={set("branch_name")} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.branch_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.branch_name}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Pan Copy Attach">
                    <HorizontalFieldShell>
                      <input name="vendorcreationform_input_503"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setForm((prev) => ({ ...prev, pan_copy: e.target.files?.[0] ?? null }))}
                        required={!existingPanCopy}
                        className={horizontalInputCls}
                      />
                    </HorizontalFieldShell>
                    {existingPanCopy ? <p className="mt-1 text-xs text-[#5d6748]">Current file: {existingPanCopy}</p> : null}
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Account No">
                    <>
                      <HorizontalFieldShell>
                        <input name="account_no" value={form.account_no} onChange={set("account_no")} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.account_no && <p className="mt-1 text-sm text-red-600">{fieldErrors.account_no}</p>}
                    </>
                  </HorizontalFormRow>
                </>
              }
              right={
                <>
                  <HorizontalFormRow label="Zone Name">
                    <>
                      <HorizontalFieldShell>
                        <input name="zone_name" value={form.zone_name} onChange={set("zone_name")} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.zone_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.zone_name}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="State">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="state_name" value={form.state_name} onChange={set("state_name")} className={horizontalSelectCls}>
                        <option value="">Select state</option>
                        {stateOptions.map((option) => (
                          <option key={option.unique_id} value={option.unique_id}>
                            {option.state_name}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="District">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="district_name" value={form.district_name} onChange={set("district_name")} className={horizontalSelectCls}>
                        <option value="">Select district</option>
                        {districtOptions.map((option) => (
                          <option key={option.unique_id} value={option.unique_id}>
                            {option.district_name}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Pincode">
                    <HorizontalFieldShell>
                      <input name="pincode" value={form.pincode} onChange={set("pincode")} className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="IFSC Code">
                    <>
                      <HorizontalFieldShell>
                        <input name="ifsc_code" value={form.ifsc_code} onChange={set("ifsc_code")} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.ifsc_code && <p className="mt-1 text-sm text-red-600">{fieldErrors.ifsc_code}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Account Holder Name">
                    <>
                      <HorizontalFieldShell>
                        <input name="acc_holder_name" value={form.acc_holder_name} onChange={set("acc_holder_name")} className={horizontalInputCls} />
                      </HorizontalFieldShell>
                      {fieldErrors.acc_holder_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.acc_holder_name}</p>}
                    </>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Bank Proof Attach">
                  <HorizontalFieldShell>
                    <input name="vendorcreationform_input_578"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setForm((prev) => ({ ...prev, bank_proof: e.target.files?.[0] ?? null }))}
                      required={!existingBankProof}
                      className={horizontalInputCls}
                    />
                  </HorizontalFieldShell>
                  {existingBankProof ? <p className="mt-1 text-xs text-[#5d6748]">Current file: {existingBankProof}</p> : null}
                </HorizontalFormRow>
                  <HorizontalFormRow label="User Name">
                    <HorizontalFieldShell>
                      <input name="user_name" value={form.user_name} onChange={set("user_name")} className={horizontalInputCls} />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Password">
                    <HorizontalFieldShell>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={set("password")}
                          className={`${horizontalInputCls} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#5d6748] transition-colors hover:bg-[#eef5e4] hover:text-[#4f7a2b]"
                          title={showPassword ? "Hide password" : "Show password"}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          <i className={`fa ${showPassword ? "fa-eye-slash" : "fa-eye"} text-[13px]`} />
                        </button>
                      </div>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Confirm Password">
                    <HorizontalFieldShell>
                      <div className="relative">
                        <input
                          name="confirm_password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirm_password}
                          onChange={set("confirm_password")}
                          className={`${horizontalInputCls} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#5d6748] transition-colors hover:bg-[#eef5e4] hover:text-[#4f7a2b]"
                          title={showConfirmPassword ? "Hide password" : "Show password"}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          <i className={`fa ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"} text-[13px]`} />
                        </button>
                      </div>
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


