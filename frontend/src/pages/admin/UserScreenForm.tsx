import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchUserScreenById,
  fetchUserScreenOptions,
  fetchUserScreenSections,
  saveUserScreen,
} from "../../api/userScreenApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

const ACTIONS = ["all", "add", "update", "list", "delete", "view", "cancel"];
const SCREEN_NAME_REGEX = /^[A-Za-z ]+$/;
const FOLDER_NAME_REGEX = /^[A-Za-z0-9_]+$/;
const DESCRIPTION_REGEX = /^[A-Za-z ]+$/;

type FormState = {
  main_screen_unique_id: string;
  screen_section_unique_id: string;
  screen_name: string;
  folder_name: string;
  icon_name: string;
  order_no: number | "";
  is_active: number;
  description: string;
  actions: string[];
};

const INIT: FormState = {
  main_screen_unique_id: "",
  screen_section_unique_id: "",
  screen_name: "",
  folder_name: "",
  icon_name: "",
  order_no: "",
  is_active: 1,
  description: "",
  actions: [],
};

export default function UserScreenForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(INIT);
  const [mainScreens, setMainScreens] = useState<Array<{ unique_id: string; label: string }>>([]);
  const [sections, setSections] = useState<Array<{ unique_id: string; label: string }>>([]);
  const [currentSectionLabel, setCurrentSectionLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUserScreenOptions()
      .then((res) => setMainScreens(res.data?.main_screens ?? []))
      .catch(async () => {
        setError("Failed to load main screen options.");
        await showErrorAlert("Failed to load main screen options.");
      });
  }, []);

  useEffect(() => {
    if (!form.main_screen_unique_id) {
      setSections([]);
      setSectionsLoading(false);
      return;
    }

    setSectionsLoading(true);
    fetchUserScreenSections(form.main_screen_unique_id)
      .then((res) => setSections(res.data ?? []))
      .catch(async () => {
        setError("Failed to load screen sections.");
        await showErrorAlert("Failed to load screen sections.");
      })
      .finally(() => setSectionsLoading(false));
  }, [form.main_screen_unique_id]);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    fetchUserScreenById(id)
      .then((data) => {
        setCurrentSectionLabel(data.screen_section_display ?? data.screen_section_unique_id ?? "");
        setForm({
          main_screen_unique_id: data.main_screen_unique_id,
          screen_section_unique_id: data.screen_section_unique_id ?? "",
          screen_name: data.screen_name,
          folder_name: data.folder_name,
          icon_name: data.icon_name ?? "",
          order_no: data.order_no ?? "",
          is_active: data.is_active,
          description: data.description ?? "",
          actions: data.action_list ?? [],
        });
      })
      .catch(async () => {
        setError("Failed to load record.");
        await showErrorAlert("Failed to load record.");
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const mergedSections = useMemo(() => {
    if (!form.screen_section_unique_id) return sections;
    const exists = sections.some((item) => item.unique_id === form.screen_section_unique_id);
    if (exists) return sections;
    return [
      { unique_id: form.screen_section_unique_id, label: currentSectionLabel || form.screen_section_unique_id },
      ...sections,
    ];
  }, [sections, form.screen_section_unique_id, currentSectionLabel]);

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      let value = e.target.value;

      if (field === "screen_name") value = value.replace(/[^A-Za-z ]/g, "");
      if (field === "folder_name") value = value.replace(/[^A-Za-z0-9_]/g, "");
      if (field === "description") value = value.replace(/[^A-Za-z ]/g, "");

      setForm((prev) => ({
        ...prev,
        [field]:
          field === "is_active"
            ? Number(value)
            : field === "order_no"
              ? (value === "" ? "" : Number(value))
              : value,
      }));
    };

  const handleMainScreenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextMainScreenId = e.target.value;
    setTouched((prev) => ({ ...prev, main_screen_unique_id: true }));
    setCurrentSectionLabel("");
    setSections([]);
    setForm((prev) => ({
      ...prev,
      main_screen_unique_id: nextMainScreenId,
      screen_section_unique_id: "",
    }));
  };

  const markTouched = (field: keyof FormState) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const toggleAction = (action: string) =>
    setForm((prev) => {
      if (action === "all") {
        return { ...prev, actions: prev.actions.includes("all") ? [] : [...ACTIONS] };
      }

      const next = prev.actions.includes(action)
        ? prev.actions.filter((item) => item !== action)
        : [...prev.actions.filter((item) => item !== "all"), action];

      const allChildrenChecked = ACTIONS.filter((item) => item !== "all").every((item) => next.includes(item));
      return {
        ...prev,
        actions: allChildrenChecked ? ["all", ...ACTIONS.filter((item) => item !== "all")] : next,
      };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTouched({
      main_screen_unique_id: true,
      screen_name: true,
      folder_name: true,
      order_no: true,
      icon_name: true,
      description: true,
    });

    if (!form.main_screen_unique_id) {
      setError("Please select the main screen.");
      await showErrorAlert("Please select the main screen.");
      return;
    }
    if (!form.screen_name.trim()) {
      setError("Please enter the screen name.");
      await showErrorAlert("Please enter the screen name.");
      return;
    }
    if (!SCREEN_NAME_REGEX.test(form.screen_name.trim())) {
      setError("Screen Name allows alphabets and spaces only.");
      await showErrorAlert("Screen Name allows alphabets and spaces only.");
      return;
    }
    if (!form.folder_name.trim()) {
      setError("Please enter the folder name.");
      await showErrorAlert("Please enter the folder name.");
      return;
    }
    if (!FOLDER_NAME_REGEX.test(form.folder_name.trim())) {
      setError("Folder Name allows alphabets, numbers, and underscore only.");
      await showErrorAlert("Folder Name allows alphabets, numbers, and underscore only.");
      return;
    }
    if (form.order_no === "") {
      setError("Please enter the order number.");
      await showErrorAlert("Please enter the order number.");
      return;
    }
    if (form.description.trim() && !DESCRIPTION_REGEX.test(form.description.trim())) {
      setError("Description allows alphabets and spaces only.");
      await showErrorAlert("Description allows alphabets and spaces only.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveUserScreen({
        unique_id: id,
        ...form,
        screen_name: form.screen_name.trim(),
        folder_name: form.folder_name.trim(),
        icon_name: form.icon_name.trim(),
        description: form.description.trim(),
        order_no: Number(form.order_no),
        actions: form.actions,
      });

      if (res.status === 1) {
        await showSuccessAlert(isEdit ? "User screen updated successfully." : "User screen created successfully.");
        navigate(-1);
      } else {
        const message = res.error ?? res.message ?? "Failed to save record.";
        setError(message);
        await showErrorAlert(message);
      }
    } catch {
      setError("Failed to save record.");
      await showErrorAlert("Failed to save record.");
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

  const hasMainScreen = Boolean(form.main_screen_unique_id);
  const hasScreenName = Boolean(form.screen_name.trim());
  const hasFolderName = Boolean(form.folder_name.trim());
  const hasOrderNo = form.order_no !== "" && Number(form.order_no) >= 0;
  const hasIconName = Boolean(form.icon_name.trim());
  const hasDescription = Boolean(form.description.trim());
  const isScreenNameValid = !form.screen_name.trim() || SCREEN_NAME_REGEX.test(form.screen_name.trim());
  const isFolderNameValid = !form.folder_name.trim() || FOLDER_NAME_REGEX.test(form.folder_name.trim());
  const isDescriptionValid = !form.description.trim() || DESCRIPTION_REGEX.test(form.description.trim());
  const selectedMainScreen = mainScreens.find((item) => item.unique_id === form.main_screen_unique_id)?.label || "Not selected";
  const selectedSection = mergedSections.find((item) => item.unique_id === form.screen_section_unique_id)?.label || "Not selected";
  const activeActions = form.actions.filter((item) => item !== "all");

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title={isEdit ? "Edit User Screen" : "Add User Screen"}
        breadcrumbs={["Admin", "User Screen", isEdit ? "Edit" : "Add"]}
      />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="border-b border-[#ebefdf] bg-[linear-gradient(135deg,#fcfdf8_0%,#edf4e0_55%,#f9f4e6_100%)] px-7 py-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold text-[#243018]">{isEdit ? "Update User Screen" : "Create User Screen"}</h2>
              <p className="mt-1 text-[13px] text-[#6b7452]">Configure screen metadata, navigation placement, and allowed actions.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[12px]">
              <OverviewChip label="Main Screen" value={selectedMainScreen} />
              <OverviewChip label="Section" value={selectedSection} />
              <OverviewChip label="Actions" value={activeActions.length ? `${activeActions.length} selected` : "None"} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 xl:p-10">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="space-y-6">
              <SectionCard title="Screen Details" subtitle="Choose where this screen belongs and how it should appear.">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <FieldBlock label="Main Screen" required>
                    <FieldShell valid={hasMainScreen} invalid={Boolean(touched.main_screen_unique_id && !hasMainScreen)} select>
                      <SearchableSelectInput name="main_screen_unique_id"
                        value={form.main_screen_unique_id}
                        onChange={handleMainScreenChange}
                        onBlur={() => markTouched("main_screen_unique_id")}
                        className={selectCls}
                      >
                        <option value="">Select the Main Screen</option>
                        {mainScreens.map((item) => (
                          <option key={item.unique_id} value={item.unique_id}>
                            {item.label}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </FieldShell>
                  </FieldBlock>

                  <FieldBlock label="Screen Section">
                    <FieldShell select>
                      <SearchableSelectInput name="screen_section_unique_id"
                        value={form.screen_section_unique_id}
                        onChange={set("screen_section_unique_id")}
                        disabled={!form.main_screen_unique_id || sectionsLoading}
                        className={selectCls}
                      >
                        <option value="">
                          {!form.main_screen_unique_id
                            ? "Select Main Screen First"
                            : sectionsLoading
                              ? "Loading Screen Sections..."
                              : "Select the Screen Section"}
                        </option>
                        {mergedSections.map((item) => (
                          <option key={item.unique_id} value={item.unique_id}>
                            {item.label}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </FieldShell>
                  </FieldBlock>

                  <FieldBlock label="Screen Name" required hint={touched.screen_name && !isScreenNameValid ? "Alphabets and spaces only." : ""}>
                    <FieldShell valid={hasScreenName && isScreenNameValid} invalid={Boolean(touched.screen_name && (!hasScreenName || !isScreenNameValid))}>
                      <input name="screen_name"
                        value={form.screen_name}
                        onChange={set("screen_name")}
                        onBlur={() => markTouched("screen_name")}
                        placeholder="Enter screen name"
                        className={inputBaseCls}
                      />
                    </FieldShell>
                  </FieldBlock>

                  <FieldBlock label="Folder Name" required hint={touched.folder_name && !isFolderNameValid ? "Use letters, numbers, and underscore only." : ""}>
                    <FieldShell valid={hasFolderName && isFolderNameValid} invalid={Boolean(touched.folder_name && (!hasFolderName || !isFolderNameValid))}>
                      <input name="folder_name"
                        value={form.folder_name}
                        onChange={set("folder_name")}
                        onBlur={() => markTouched("folder_name")}
                        placeholder="Enter folder name"
                        className={inputBaseCls}
                      />
                    </FieldShell>
                  </FieldBlock>

                  <FieldBlock label="Icon" hint={hasIconName ? "Icon name saved as typed." : "Optional, for menu and list usage."}>
                    <FieldShell valid={hasIconName}>
                      <input name="icon_name"
                        value={form.icon_name}
                        onChange={set("icon_name")}
                        onBlur={() => markTouched("icon_name")}
                        placeholder="Material Design Icon"
                        className={inputBaseCls}
                      />
                    </FieldShell>
                  </FieldBlock>

                  <FieldBlock label="Order No" required>
                    <FieldShell valid={hasOrderNo} invalid={Boolean(touched.order_no && !hasOrderNo)}>
                      <input name="order_no"
                        type="number"
                        value={form.order_no}
                        onChange={set("order_no")}
                        onBlur={() => markTouched("order_no")}
                        placeholder="Enter order number"
                        className={inputBaseCls}
                      />
                    </FieldShell>
                  </FieldBlock>
                </div>
              </SectionCard>

              <SectionCard title="Description" subtitle="Optional note for internal reference.">
                <FieldBlock label="Description" hint={touched.description && hasDescription && !isDescriptionValid ? "Alphabets and spaces only." : "Keep it short and readable."}>
                  <FieldShell valid={hasDescription && isDescriptionValid} invalid={Boolean(touched.description && hasDescription && !isDescriptionValid)} textarea>
                    <textarea name="description"
                      value={form.description}
                      onChange={set("description")}
                      onBlur={() => markTouched("description")}
                      rows={5}
                      placeholder="Enter description"
                      className={textareaCls}
                    />
                  </FieldShell>
                </FieldBlock>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="Status" subtitle="Control whether this screen is available.">
                <FieldBlock label="Active Status">
                  <FieldShell select>
                    <SearchableSelectInput name="is_active" value={form.is_active} onChange={set("is_active")} className={selectCls}>
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </SearchableSelectInput>
                  </FieldShell>
                </FieldBlock>
              </SectionCard>

              <SectionCard title="Actions" subtitle="Pick which actions belong to this screen.">
                <div className="flex flex-wrap gap-3">
                  {ACTIONS.map((action) => {
                    const checked = form.actions.includes(action);
                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() => toggleAction(action)}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-[13px] font-medium transition-all ${
                          checked
                            ? "border-[#6f9535] bg-[linear-gradient(135deg,#f3f9e7_0%,#e2efc6_100%)] text-[#3f5a12] shadow-sm"
                            : "border-[#d8dec8] bg-white text-[#66724b] hover:border-[#aebb8a] hover:bg-[#f8fbf1]"
                        }`}
                      >
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${checked ? "border-[#6f9535] bg-[#6f9535] text-white" : "border-[#c7cfb4] text-transparent"}`}>
                          <i className="fa fa-check" />
                        </span>
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              <div className="rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] p-5 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
                <h3 className="text-[16px] font-semibold text-[#42551d]">Ready to save?</h3>
                <p className="mt-2 text-[13px] leading-6 text-[#6b7452]">
                  Review the selected main screen, section, and action set before saving this screen configuration.
                </p>
                <div className="mt-5 flex justify-end gap-3">
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
                    {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {saving ? "Saving..." : isEdit ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputBaseCls =
  "w-full rounded-2xl border border-transparent bg-transparent px-4 py-3 text-[14px] text-[#243018] outline-none transition-all placeholder:text-[#8c93a8]";
const selectCls = `${inputBaseCls} appearance-none pr-10`;
const textareaCls = `${inputBaseCls} min-h-[126px] resize-none pr-10`;

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-[#e7ebdb] bg-white p-5 shadow-[0_16px_36px_rgba(47,60,24,0.06)] md:p-6">
      <div className="mb-5">
        <h3 className="text-[18px] font-semibold text-[#243018]">{title}</h3>
        {subtitle ? <p className="mt-1 text-[13px] text-[#7a8167]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FieldBlock({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-2 block text-[13px] font-semibold text-[#566146]">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
      {hint ? <div className="mt-1 text-xs text-[#7f866e]">{hint}</div> : null}
    </div>
  );
}

function FieldShell({
  children,
  valid = false,
  invalid = false,
  textarea = false,
  select = false,
}: {
  children: React.ReactNode;
  valid?: boolean;
  invalid?: boolean;
  textarea?: boolean;
  select?: boolean;
}) {
  const borderClass = invalid
    ? "border-[#ff6d4d]"
    : valid
      ? "border-[#15b8a6]"
      : "border-[#d7dec8]";

  const iconClass = invalid
    ? "fa-circle-exclamation text-[#ff6d4d]"
    : valid
      ? "fa-check text-[#15b8a6]"
      : "";

  return (
    <div className={`relative rounded-2xl border bg-[#fcfdf9] shadow-sm ${borderClass} focus-within:ring-4 ${invalid ? "focus-within:ring-[#ff6d4d]/10" : valid ? "focus-within:ring-[#15b8a6]/10" : "focus-within:ring-brand-500/10"} ${invalid ? "focus-within:border-[#ff6d4d]" : valid ? "focus-within:border-[#15b8a6]" : "focus-within:border-brand-500"}`}>
      {children}
      {iconClass && (
        <span className={`absolute right-4 ${textarea ? "top-4" : "top-1/2 -translate-y-1/2"} text-[15px]`}>
          <i className={`fa ${iconClass}`} />
        </span>
      )}
      {!iconClass && select && (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-[#858585]">
          <i className="fa fa-chevron-down" />
        </span>
      )}
    </div>
  );
}

function OverviewChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#81905b]">{label}</div>
      <div className="mt-1 max-w-[180px] truncate text-[12px] font-semibold text-[#33411f]">{value || "-"}</div>
    </div>
  );
}
