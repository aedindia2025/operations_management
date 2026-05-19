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
  horizontalSelectCls,
} from "../../components/common/HorizontalForm";
import {
  createServiceEngineer,
  fetchEmpIdOptions,
  fetchEngineerNameOptions,
  fetchServiceEngineerById,
  updateServiceEngineer,
  type EngineerOption,
} from "../../api/serviceEngineerApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type FormState = {
  engineer_name: string;
  emp_id: string;
  is_active: number;
};

const INIT: FormState = {
  engineer_name: "",
  emp_id: "",
  is_active: 1,
};

export default function ServiceEngineerForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(INIT);
  const [engineerOptions, setEngineerOptions] = useState<EngineerOption[]>([]);
  const [empIdOptions, setEmpIdOptions] = useState<EngineerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEngineerNameOptions()
      .then(setEngineerOptions)
      .catch(() => setError("Failed to load engineer name options."));
  }, []);

  const loadEmpIdOptions = async (engineerId: string, preserveCurrent = false, currentEmpId = "") => {
    if (!engineerId) {
      setEmpIdOptions([]);
      setForm((prev) => ({ ...prev, emp_id: "" }));
      return;
    }

    try {
      const data = await fetchEmpIdOptions(engineerId);
      setEmpIdOptions(data);
      setForm((prev) => {
        const matchedCurrent = preserveCurrent && data.some((item) => item.unique_id === currentEmpId);
        return {
          ...prev,
          emp_id: matchedCurrent ? currentEmpId : data[0]?.unique_id ?? "",
        };
      });
    } catch {
      setError("Failed to load employee id options.");
    }
  };

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    fetchServiceEngineerById(id)
      .then(async (data) => {
        setForm({
          engineer_name: data.engineer_name,
          emp_id: data.emp_id,
          is_active: data.is_active,
        });
        await loadEmpIdOptions(data.engineer_name, true, data.emp_id);
      })
      .catch(() => setError("Failed to load service engineer record."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleEngineerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const engineerId = e.target.value;
    setForm((prev) => ({
      ...prev,
      engineer_name: engineerId,
      emp_id: "",
    }));
    await loadEmpIdOptions(engineerId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.engineer_name) {
      setError("Please select engineer name.");
      return;
    }

    if (!form.emp_id) {
      setError("Please select employee id.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        engineer_name: form.engineer_name,
        emp_id: form.emp_id,
        is_active: form.is_active,
      };

      const res = isEdit && id
        ? await updateServiceEngineer(id, payload)
        : await createServiceEngineer(payload);

      if (res.msg === "create" || res.msg === "update" || res.status === true) {
        await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
        navigate(-1);
      } else {
        const backendError =
          typeof res.error === "string"
            ? res.error
            : res.error?.engineer_name?.[0] ||
              res.error?.emp_id?.[0] ||
              res.message ||
              "Failed to save service engineer.";
        setError(backendError);
        await showErrorAlert(backendError);
      }
    } catch {
      const message = "Failed to save service engineer.";
      setError(message);
      await showErrorAlert(message);
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
        title={isEdit ? "Edit Service Engineer" : "Add Service Engineer"}
        breadcrumbs={["Settings", "Service Engineer", isEdit ? "Edit" : "Add"]}
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
                  <HorizontalFormRow label="Engineer Name">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="engineer_name" value={form.engineer_name} onChange={handleEngineerChange} className={horizontalSelectCls}>
                        <option value="">Select Eng Name</option>
                        {engineerOptions.map((item) => (
                          <option key={item.unique_id} value={item.unique_id}>
                            {item.staff_name}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Status">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="is_active"
                        value={form.is_active}
                        onChange={(e) => setForm((prev) => ({ ...prev, is_active: Number(e.target.value) }))}
                        className={horizontalSelectCls}
                      >
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                </>
              }
              right={
                <HorizontalFormRow label="Employee ID">
                  <HorizontalFieldShell select>
                    <SearchableSelectInput name="emp_id"
                      value={form.emp_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, emp_id: e.target.value }))}
                      disabled={!form.engineer_name}
                      className={horizontalSelectCls}
                    >
                      <option value="">{form.engineer_name ? "Select EMP ID" : "Select Engineer First"}</option>
                      {empIdOptions.map((item) => (
                        <option key={item.unique_id} value={item.unique_id}>
                          {item.staff_id}
                        </option>
                      ))}
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


