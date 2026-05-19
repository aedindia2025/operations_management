import { useState, useEffect } from "react";
import api from "../api/axios";

interface UseFormOptions<T> {
  getUrl: string;
  saveUrl: string;
  editId?: string;
  initialValues: T;
  requiredFields?: (keyof T)[];
}

export function useForm<T extends Record<string, any>>({
  getUrl,
  saveUrl,
  editId,
  initialValues,
  requiredFields = [],
}: UseFormOptions<T>) {
  const [form,    setForm]    = useState<T>(initialValues);
  const [saving,  setSaving]  = useState<boolean>(false);
  const [error,   setError]   = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    if (editId) {
      api.get(`${getUrl}/${editId}`)
        .then(({ data }) => setForm({ ...initialValues, ...data.data }))
        .catch(() => setError("Failed to load record."));
    }
  }, [editId]);

  const set = (field: keyof T) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const save = async (onSuccess?: (data: any) => void) => {
    setError(""); setSuccess("");
    const missing = requiredFields.filter((f) => !form[f]);
    if (missing.length) return setError(`Required: ${String(missing.join(", "))}`);
    setSaving(true);
    try {
      const res = await api.post(saveUrl, { ...form, unique_id: editId || "" });
      if (res.data.msg === "already") return setError("This record already exists.");
      setSuccess(editId ? "Updated successfully." : "Created successfully.");
      onSuccess?.(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return { form, set, saving, error, success, save, setForm, setError };
}
