import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  createUserType,
  fetchUserTypeById,
  updateUserType,
} from "../../api/userTypeApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
const USER_TYPE_REGEX = /^[A-Za-z ]+$/;

interface FormData {
  user_type: string;
  under_user_type: string;
  is_active: number;
}

const INIT: FormData = { user_type: "", under_user_type: "", is_active: 1 };

export default function UserTypeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>(INIT);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    fetchUserTypeById(id)
      .then((data) =>
        setForm({
          user_type: data.user_type,
          under_user_type: data.under_user_type ?? "",
          is_active: data.is_active,
        })
      )
      .catch(async () => {
        setError("Failed to load record.");
        await showErrorAlert("Failed to load record.");
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set =
    (f: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let value = e.target.value;
      if (f === "user_type") value = value.replace(/[^A-Za-z ]/g, "");

      setForm((p) => ({
        ...p,
        [f]: f === "is_active" ? Number(value) : value,
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.user_type.trim()) {
      setError("Please enter the User Type.");
      await showErrorAlert("Please enter the User Type.");
      return;
    }
    if (!USER_TYPE_REGEX.test(form.user_type.trim())) {
      setError("User Type allows alphabets and spaces only.");
      await showErrorAlert("User Type allows alphabets and spaces only.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        user_type: form.user_type.trim(),
        under_user_type: form.under_user_type.trim(),
        is_active: form.is_active,
      };

      const res =
        isEdit && id
          ? await updateUserType(id, payload)
          : await createUserType(payload);

      if (res.msg === "already") {
        setError("User Type already exists.");
        await showErrorAlert("User Type already exists.");
        return;
      }

      if (res.status === 1) {
        await showSuccessAlert(isEdit ? "User type updated successfully." : "User type created successfully.");
        navigate(-1);
      } else {
        const message = res.error ?? res.message ?? "Something went wrong.";
        setError(message);
        await showErrorAlert(message);
      }
    } catch {
      setError("Network error. Please try again.");
      await showErrorAlert("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500 text-sm">
        <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title={isEdit ? "Edit User Type" : "Add User Type"}
        breadcrumbs={["Admin", "User Type", isEdit ? "Edit" : "Add"]}
      />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="border-b border-[#ebefdf] bg-[linear-gradient(135deg,#fcfdf8_0%,#edf4e0_55%,#f9f4e6_100%)] px-7 py-6">
          <h2 className="text-[22px] font-semibold text-[#243018]">{isEdit ? "Update User Type" : "Create User Type"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* 2 Column Grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

            {/* User Type */}
            <div className="flex items-center gap-4">
              <span className="w-40 text-[15px] font-medium text-[#566146] pt-1">
                User Type <span className="text-red-500">*</span>
              </span>
              <input name="user_type"
                type="text"
                value={form.user_type}
                onChange={set("user_type")}
                required
                placeholder="Enter user type"
                className="flex-1 rounded-2xl border border-[#d7dec8] bg-[#fcfdf9] px-4 py-3 shadow-sm outline-none transition-all focus:border-[#6f9535] focus:ring-4 focus:ring-[#6f9535]/10"
              />
            </div>

            {/* Under User Type */}
            {/* <div className="flex items-center gap-4">
              <span className="w-40 text-[15px] text-ink-secondary pt-1">
                Under User Type
              </span>
              <input
                name="under_user_type"
                type="text"
                value={form.under_user_type}
                onChange={set("under_user_type")}
                placeholder="Enter under user type"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              />
            </div> */}

            {/* Status */}
            <div className="flex items-center gap-4">
              <span className="w-40 text-[15px] font-medium text-[#566146] pt-1">
                Status
              </span>
              <SearchableSelectInput name="is_active"
                value={form.is_active}
                onChange={set("is_active")}
                className="flex-1 rounded-2xl border border-[#d7dec8] bg-[#fcfdf9] px-4 py-3 shadow-sm outline-none transition-all focus:border-[#6f9535] focus:ring-4 focus:ring-[#6f9535]/10"
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </SearchableSelectInput>
            </div>

          </div>

          <div className="flex justify-end gap-3 border-t border-[#edf1e4] pt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-2xl border border-[#f0b8a8] bg-[#fff3ef] px-6 py-2.5 font-medium text-[#d45b35] transition-colors hover:bg-[#ffe7df]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(79,122,43,0.30)] disabled:opacity-60"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {saving ? "Saving..." : isEdit ? "Update" : "Save"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}


