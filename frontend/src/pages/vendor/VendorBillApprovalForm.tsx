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
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

interface FormData {
  name: string;
  status: number;
}

const INIT: FormData = { name: "", status: 1 };

export default function VendorBillApprovalForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isEdit) {
      // TODO: fetch record by id and call setForm(data)
    }
  }, [id, isEdit]);

  const set = (field: keyof FormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({
        ...prev,
        [field]: field === "status" ? Number(event.target.value) : event.target.value,
      }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    // TODO: call API to save/update
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    navigate(-1);
  };

  return (
    <div className="p-6">
      <PageTopbar
        title={isEdit ? "Edit Vendor Bill Approval" : "Add Vendor Bill Approval"}
        breadcrumbs={["Vendor Payment", "Vendor Bill Approval", isEdit ? "Edit" : "Add"]}
      />

      <HorizontalFormCard className="max-w-4xl">
        <form onSubmit={handleSubmit}>
          <HorizontalFormBody className="space-y-6">
            <p className="max-w-2xl text-[13px] leading-6 text-ink-secondary">
              Maintain vendor bill approval setup details in the same cleaner form shell used across the refreshed vendor workflow.
            </p>

            <div className="space-y-5">
              <HorizontalFormRow label="Name">
                <HorizontalFieldShell>
                  <input name="name"
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Enter name"
                    className={horizontalInputCls}
                    required
                  />
                </HorizontalFieldShell>
              </HorizontalFormRow>

              <HorizontalFormRow label="Status">
                <HorizontalFieldShell select>
                  <SearchableSelectInput name="status"
                    value={form.status}
                    onChange={set("status")}
                    className={horizontalSelectCls}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </SearchableSelectInput>
                </HorizontalFieldShell>
              </HorizontalFormRow>
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
