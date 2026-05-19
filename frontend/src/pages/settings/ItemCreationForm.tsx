import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  createItemCreation,
  createItemSub,
  deleteItemSub,
  fetchItemCreationById,
  fetchItemSubById,
  fetchItemSubList,
  importItemSubExcel,
  updateItemCreation,
  updateItemSub,
  type ItemCreationPayload,
  type ItemSubPayload,
  type ItemSubRecord,
} from "../../api/itemCreationApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import excelTemplate from "./item_creation_excel_format.xlsx";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type Tab = "po" | "item";
type MainForm = { tender_name: string; tender_code: string; tender_no: string; tender_type: number; validity_from: string; validity_to: string; validity_date_extension: string };
type SubForm = { tender_code: string; item_code: string; item_description: string; item_specification: string; brand: string; product_category: string; short_category: string; rc_net_price: string; gst: string; rc_unit_price: string; warranty_in_yrs: string };

const MAIN_INIT: MainForm = { tender_name: "", tender_code: "", tender_no: "", tender_type: 1, validity_from: "", validity_to: "", validity_date_extension: "" };
const SUB_INIT: SubForm = { tender_code: "", item_code: "", item_description: "", item_specification: "", brand: "", product_category: "", short_category: "", rc_net_price: "", gst: "", rc_unit_price: "", warranty_in_yrs: "" };
const inputCls = "w-full px-3 py-2.5 border border-line-dark rounded-md text-sm outline-none bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10";
const readonlyCls = "w-full px-3 py-2.5 border border-line rounded-md text-sm bg-surface-2 text-ink-muted cursor-not-allowed";

const trimDate = (v?: string | null) => (v ? String(v).slice(0, 10) : "");
const calcUnitPrice = (net: string, gst: string) => {
  const n = Number(net), g = Number(gst);
  if (!Number.isFinite(n) || n <= 0) return "";
  return (!Number.isFinite(g) || g <= 0 ? n : n / (1 + g / 100)).toFixed(2);
};
const resultMessage = (r: { error?: string | Record<string, unknown>; message?: string }, fallback: string) => {
  if (typeof r.error === "string") return r.error;
  if (r.error && typeof r.error === "object") {
    const first = Object.values(r.error)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
  }
  return r.message || fallback;
};

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <div><span className="block text-sm font-semibold mb-1.5 text-ink">{label}{required && <span className="text-danger ml-1">*</span>}</span>{children}</div>;
}

function InlineError({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-lg">
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 text-red-500 hover:text-red-700"
        aria-label="Close error message"
      >
        �
      </button>
    </div>
  );
}

export default function ItemCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const isEdit = Boolean(id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>(params.get("tab") === "item" ? "item" : "po");
  const [mainForm, setMainForm] = useState<MainForm>(MAIN_INIT);
  const [subForm, setSubForm] = useState<SubForm>(SUB_INIT);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SubForm>(SUB_INIT);
  const [rows, setRows] = useState<ItemSubRecord[]>([]);
  const [search, setSearch] = useState("");
  const [length, setLength] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [savingMain, setSavingMain] = useState(false);
  const [savingSub, setSavingSub] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => setTab(params.get("tab") === "item" ? "item" : "po"), [params]);
  useEffect(() => setPage(1), [search, length, mainForm.tender_code]);
  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 2000);
    return () => window.clearTimeout(timer);
  }, [error]);
  useEffect(() => {
    if (!subError) return;
    const timer = window.setTimeout(() => setSubError(null), 2000);
    return () => window.clearTimeout(timer);
  }, [subError]);

  useEffect(() => {
    if (!isEdit || !id) {
      setSubForm((s) => ({ ...s, tender_code: mainForm.tender_code }));
      return;
    }
    const run = async () => {
      setLoadingMain(true);
      try {
        const data = await fetchItemCreationById(id);
        const next = {
          tender_name: data.tender_name || "",
          tender_code: data.tender_code || "",
          tender_no: data.tender_no || "",
          tender_type: Number(data.tender_type || 1),
          validity_from: trimDate(data.validity_from),
          validity_to: trimDate(data.validity_to),
          validity_date_extension: trimDate(data.validity_date_extension),
        };
        setMainForm(next);
        setSubForm((s) => ({ ...s, tender_code: next.tender_code }));
      } catch {
        setError("Failed to load item creation record.");
      } finally {
        setLoadingMain(false);
      }
    };
    run();
  }, [id, isEdit]);

  const loadRows = useCallback(async () => {
    if (!mainForm.tender_code) return void (setRows([]), setTotal(0));
    setLoadingRows(true);
    try {
      const res = await fetchItemSubList({ tender_code: mainForm.tender_code, search, start: (page - 1) * length, length });
      setRows(res.data || []);
      setTotal(res.recordsFiltered || 0);
    } finally {
      setLoadingRows(false);
    }
  }, [length, mainForm.tender_code, page, search]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const setMain = (k: keyof MainForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = k === "tender_type" ? Number(e.target.value) : e.target.value;
    setMainForm((p) => ({ ...p, [k]: value }));
    if (k === "tender_code") setSubForm((p) => ({ ...p, tender_code: String(value) }));
  };
  const setSub = (setter: Dispatch<SetStateAction<SubForm>>, k: keyof SubForm) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setter((p) => {
      const next = { ...p, [k]: value };
      if (k === "rc_net_price" || k === "gst") next.rc_unit_price = calcUnitPrice(k === "rc_net_price" ? value : p.rc_net_price, k === "gst" ? value : p.gst);
      return next;
    });
  };

  const validateMain = () => {
    if (!mainForm.tender_name.trim()) return "Please enter tender name.";
    if (!mainForm.tender_code.trim()) return "Please enter tender code.";
    if (!mainForm.tender_no.trim()) return "Please enter tender no.";
    if (!mainForm.validity_from) return "Please select validity from date.";
    if (!mainForm.validity_to) return "Please select validity to date.";
    if (new Date(mainForm.validity_from) > new Date(mainForm.validity_to)) return "Validity From date cannot be after Validity To date.";
    return "";
  };
  const validateSub = (f: SubForm) => {
    if (!f.tender_code.trim()) return "Please save PO details first.";
    if (!f.item_code.trim()) return "Please enter item code.";
    if (!f.item_description.trim()) return "Please enter item description.";
    if (!f.item_specification.trim()) return "Please enter item specification.";
    if (!f.brand.trim()) return "Please enter brand.";
    if (!f.product_category.trim()) return "Please enter product category.";
    if (!f.short_category.trim()) return "Please enter short category.";
    if (!f.rc_net_price.trim()) return "Please enter RC net price.";
    if (!f.gst.trim()) return "Please enter GST percentage.";
    if (!f.warranty_in_yrs.trim()) return "Please enter warranty.";
    return "";
  };
  const subPayload = (f: SubForm): ItemSubPayload => ({ ...f });

  const openItemTab = async () => {
    if (!mainForm.tender_code.trim()) {
      await showErrorAlert("Please save PO details first.");
      return;
    }
    setParams({ tab: "item" });
  };

  const handleMainSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const msg = validateMain();
    if (msg) {
      setError(msg);
      await showErrorAlert(msg);
      return;
    }
    setSavingMain(true);
    const payload: ItemCreationPayload = {
      ...mainForm,
      validity_date_extension: mainForm.validity_date_extension || null,
    };
    const res = isEdit && id ? await updateItemCreation(id, payload) : await createItemCreation(payload);
    setSavingMain(false);
    if (!res.status) {
      const message = resultMessage(res, "Failed to save item creation.");
      setError(message);
      await showErrorAlert(message);
      return;
    }
    await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
    const nextId = res.data?.unique_id || id;
    if (nextId) navigate(`/settings/item/form/${nextId}?tab=item`, { replace: true });
    else setParams({ tab: "item" });
  };

  const handleSubCreate = async (e: FormEvent) => {
    e.preventDefault();
    const msg = validateSub(subForm);
    if (msg) {
      setSubError(msg);
      await showErrorAlert(msg);
      return;
    }
    setSavingSub(true);
    const res = await createItemSub(subPayload(subForm));
    setSavingSub(false);
    if (!res.status) {
      const message = resultMessage(res, "Failed to save item details.");
      setSubError(message);
      await showErrorAlert(message);
      return;
    }
    await showSuccessAlert("Item details saved successfully");
    setSubForm({ ...SUB_INIT, tender_code: mainForm.tender_code });
    setPage(1);
    await loadRows();
  };

  const handleEdit = async (uniqueId: string) => {
    try {
      const data = await fetchItemSubById(uniqueId);
      setEditId(uniqueId);
      setEditForm({
        tender_code: data.tender_code || mainForm.tender_code,
        item_code: data.item_code || "",
        item_description: data.item_description || "",
        item_specification: data.item_specification || "",
        brand: data.brand || "",
        product_category: data.product_category || "",
        short_category: data.short_category || "",
        rc_net_price: data.rc_net_price || "",
        gst: data.gst || "",
        rc_unit_price: data.rc_unit_price || "",
        warranty_in_yrs: data.warranty_in_yrs || "",
      });
    } catch {
      await showErrorAlert("Failed to load item details.");
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    const msg = validateSub(editForm);
    if (msg) {
      setSubError(msg);
      await showErrorAlert(msg);
      return;
    }
    setSavingEdit(true);
    const res = await updateItemSub(editId, subPayload(editForm));
    setSavingEdit(false);
    if (!res.status) {
      await showErrorAlert(resultMessage(res, "Failed to update item details."));
      return;
    }
    await showSuccessAlert("Item details updated successfully");
    setEditId(null);
    setEditForm(SUB_INIT);
    await loadRows();
  };

  const handleDelete = async (uniqueId: string) => {
    if (!(await showConfirmAlert("Are you sure you want to delete this item detail?"))) return;
    const res = await deleteItemSub(uniqueId);
    if (!res.status) {
      await showErrorAlert(resultMessage(res, "Failed to delete item details."));
      return;
    }
    await showSuccessAlert("Successfully record deleted");
    if (editId === uniqueId) setEditId(null);
    await loadRows();
  };

  const handleImport = async () => {
    if (!importFile) {
      await showErrorAlert("Please choose an Excel file.");
      return;
    }
    setImporting(true);
    const res = await importItemSubExcel(importFile);
    setImporting(false);
    if (!res.status) {
      await showErrorAlert(res.message || "Failed to import item details.");
      return;
    }
    await showSuccessAlert(res.message || "Import completed successfully");
    setShowImport(false);
    setImportFile(null);
    if (fileRef.current) fileRef.current.value = "";
    await loadRows();
  };

  const pages = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(total / length));
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const vals: number[] = [];
    for (let i = start; i <= Math.min(start + 4, totalPages); i += 1) vals.push(i);
    return { totalPages, vals };
  }, [length, page, total]);
  const startEntry = total === 0 ? 0 : (page - 1) * length + 1;
  const endEntry = Math.min(page * length, total);

  return (
    <div className="p-6">
      <PageTopbar title={isEdit ? "Edit Item Creation" : "Add Item"} breadcrumbs={["Settings", "Item Creation", isEdit ? "Edit" : "Add"]} />
      <div className="bg-white border border-line rounded-xl shadow-card"><div className="p-5 space-y-6">
        {error && <InlineError message={error} onClose={() => setError(null)} />}
        <div className="flex gap-2 border-b border-line pb-0">
          <button type="button" onClick={() => setParams({ tab: "po" })} className={`px-4 py-2 text-sm font-semibold rounded-t-lg border ${tab === "po" ? "bg-brand-500 text-white border-brand-500" : "bg-surface-2 text-ink-secondary border-line"}`}>PO Details</button>
          <button type="button" onClick={openItemTab} className={`px-4 py-2 text-sm font-semibold rounded-t-lg border ${tab === "item" ? "bg-brand-500 text-white border-brand-500" : "bg-surface-2 text-ink-secondary border-line"}`}>Item Details Upload</button>
        </div>

        {tab === "po" && (
          <form onSubmit={handleMainSubmit} className="space-y-5">
            {loadingMain ? <div className="py-16 text-center text-ink-muted">Loading...</div> : <>
              <div className="grid grid-cols-2 gap-x-10 gap-y-5">
                <div className="flex items-center gap-4">
  <span className="w-48 text-sm font-semibold text-ink shrink-0">Tender Name <span className="text-danger">*</span></span>
  <input name="tender_name" value={mainForm.tender_name} onChange={setMain("tender_name")} className={inputCls} />
</div>

<div className="flex items-center gap-4">
  <span className="w-48 text-sm font-semibold text-ink shrink-0">Tender Code <span className="text-danger">*</span></span>
  <input name="tender_code" value={mainForm.tender_code} onChange={setMain("tender_code")} className={inputCls} />
</div>

<div className="flex items-center gap-4">
  <span className="w-48 text-sm font-semibold text-ink shrink-0">Tender No <span className="text-danger">*</span></span>
  <input name="tender_no" value={mainForm.tender_no} onChange={setMain("tender_no")} className={inputCls} />
</div>

<div className="flex items-center gap-4">
  <span className="w-48 text-sm font-semibold text-ink shrink-0">Tender Type <span className="text-danger">*</span></span>
  <SearchableSelectInput name="tender_type" value={mainForm.tender_type} onChange={setMain("tender_type")} className={inputCls}>
    <option value={1}>Open Tender</option>
    <option value={2}>Limited Tender</option>
  </SearchableSelectInput>
</div>

<div className="flex items-center gap-4">
  <span className="w-48 text-sm font-semibold text-ink shrink-0">Validity From <span className="text-danger">*</span></span>
  <input name="validity_from" type="date" value={mainForm.validity_from} onChange={setMain("validity_from")} className={inputCls} />
</div>

<div className="flex items-center gap-4">
  <span className="w-48 text-sm font-semibold text-ink shrink-0">Validity To <span className="text-danger">*</span></span>
  <input name="validity_to" type="date" value={mainForm.validity_to} onChange={setMain("validity_to")} className={inputCls} />
</div>

<div className="flex items-center gap-4">
  <span className="w-48 text-sm font-semibold text-ink shrink-0">Validity Date Extension</span>
  <input name="validity_date_extension" type="date" value={mainForm.validity_date_extension} onChange={setMain("validity_date_extension")} className={inputCls} />
</div>
              </div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => navigate(-1)} className="px-5 py-2 text-sm font-semibold border border-line rounded-md text-ink-secondary hover:bg-surface-2">Cancel</button><button type="submit" disabled={savingMain} className="px-5 py-2 text-sm font-semibold bg-success text-white rounded-md hover:bg-success-dark disabled:opacity-60">{savingMain ? "Saving..." : isEdit ? "Update" : "Save"}</button></div>
            </>}
          </form>
        )}

        {tab === "item" && (
          <div className="space-y-6">
            {subError && <InlineError message={subError} onClose={() => setSubError(null)} />}
            <form onSubmit={handleSubCreate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Tender Code" required><input name="tender_code" value={mainForm.tender_code} className={readonlyCls} readOnly /></Field><div />
                <Field label="Item Code" required><input name="item_code" value={subForm.item_code} onChange={setSub(setSubForm, "item_code")} className={inputCls} /></Field>
                <Field label="Item Description" required><input name="item_description" value={subForm.item_description} onChange={setSub(setSubForm, "item_description")} className={inputCls} /></Field>
                <Field label="Item Specification" required><input name="item_specification" value={subForm.item_specification} onChange={setSub(setSubForm, "item_specification")} className={inputCls} /></Field>
                <Field label="Brand" required><input name="brand" value={subForm.brand} onChange={setSub(setSubForm, "brand")} className={inputCls} /></Field>
                <Field label="Product Category" required><input name="product_category" value={subForm.product_category} onChange={setSub(setSubForm, "product_category")} className={inputCls} /></Field>
                <Field label="Short Category" required><input name="short_category" value={subForm.short_category} onChange={setSub(setSubForm, "short_category")} className={inputCls} /></Field>
                <Field label="RC Net Price" required><input name="rc_net_price" value={subForm.rc_net_price} onChange={setSub(setSubForm, "rc_net_price")} className={inputCls} /></Field>
                <Field label="GST %" required><input name="gst" value={subForm.gst} onChange={setSub(setSubForm, "gst")} className={inputCls} /></Field>
                <Field label="RC Unit Price"><input name="rc_unit_price" value={subForm.rc_unit_price} className={readonlyCls} readOnly /></Field>
                <Field label="Warranty" required><input name="warranty_in_yrs" value={subForm.warranty_in_yrs} onChange={setSub(setSubForm, "warranty_in_yrs")} className={inputCls} /></Field>
              </div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setSubForm({ ...SUB_INIT, tender_code: mainForm.tender_code })} className="px-5 py-2 text-sm font-semibold border border-line rounded-md text-ink-secondary hover:bg-surface-2">Reset</button><button type="submit" disabled={savingSub} className="px-5 py-2 text-sm font-semibold bg-success text-white rounded-md hover:bg-success-dark disabled:opacity-60">{savingSub ? "Saving..." : "Save Item"}</button></div>
            </form>

            {editId && <form onSubmit={handleEditSubmit} className="space-y-5 border border-brand-200 rounded-xl p-5 bg-brand-50/40">
              <div className="flex items-center justify-between"><h3 className="text-base font-semibold text-ink">Edit Item Details</h3><button type="button" onClick={() => setEditId(null)} className="text-sm font-semibold text-ink-secondary hover:text-ink">Close</button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Tender Code"><input name="tender_code" value={editForm.tender_code} className={readonlyCls} readOnly /></Field>
                <Field label="Item Code" required><input name="item_code" value={editForm.item_code} onChange={setSub(setEditForm, "item_code")} className={inputCls} /></Field>
                <Field label="Item Description" required><input name="item_description" value={editForm.item_description} onChange={setSub(setEditForm, "item_description")} className={inputCls} /></Field>
                <Field label="Item Specification" required><input name="item_specification" value={editForm.item_specification} onChange={setSub(setEditForm, "item_specification")} className={inputCls} /></Field>
                <Field label="Brand" required><input name="brand" value={editForm.brand} onChange={setSub(setEditForm, "brand")} className={inputCls} /></Field>
                <Field label="Product Category" required><input name="product_category" value={editForm.product_category} onChange={setSub(setEditForm, "product_category")} className={inputCls} /></Field>
                <Field label="Short Category" required><input name="short_category" value={editForm.short_category} onChange={setSub(setEditForm, "short_category")} className={inputCls} /></Field>
                <Field label="RC Net Price" required><input name="rc_net_price" value={editForm.rc_net_price} onChange={setSub(setEditForm, "rc_net_price")} className={inputCls} /></Field>
                <Field label="GST %" required><input name="gst" value={editForm.gst} onChange={setSub(setEditForm, "gst")} className={inputCls} /></Field>
                <Field label="RC Unit Price"><input name="rc_unit_price" value={editForm.rc_unit_price} className={readonlyCls} readOnly /></Field>
                <Field label="Warranty" required><input name="warranty_in_yrs" value={editForm.warranty_in_yrs} onChange={setSub(setEditForm, "warranty_in_yrs")} className={inputCls} /></Field>
              </div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditId(null)} className="px-5 py-2 text-sm font-semibold border border-line rounded-md text-ink-secondary hover:bg-surface-2">Cancel</button><button type="submit" disabled={savingEdit} className="px-5 py-2 text-sm font-semibold bg-info text-white rounded-md hover:bg-info-dark disabled:opacity-60">{savingEdit ? "Updating..." : "Update Item"}</button></div>
            </form>}

            <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 bg-success text-white text-sm font-semibold rounded-md hover:bg-success-dark"><i className="ri-file-excel-2-fill" />Import</button><a href={excelTemplate} download="item_creation_excel_format.xlsx" className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-md hover:bg-brand-600"><i className="fa fa-download" />Download Excel Format</a></div>

            <div className="border border-line rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-3 bg-surface-2 border-b border-line flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-ink-secondary">Show<SearchableSelectInput name="length" value={length} onChange={(e) => setLength(Number(e.target.value))} className="px-2 py-1 text-xs border border-line-dark rounded outline-none focus:border-brand-500" style={{ width: 64 }}>{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}</SearchableSelectInput>entries</div>
                <div className="flex items-center gap-2 text-xs text-ink-secondary">Search:<input name="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item details..." className="px-2.5 py-1 text-xs border border-line-dark rounded outline-none w-52 focus:border-brand-500" /></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-[13px] border-collapse"><thead><tr className="bg-surface-2">{["#", "Item Code", "Item Description", "Item Specification", "Brand", "Product Category", "Short Category", "RC Unit Price", "GST %", "RC Net Price", "Warranty", "Action"].map((h) => <th key={h} className="px-3 py-2 text-left text-[12px] font-semibold text-ink-secondary tracking-wide border border-line-dark">{h}</th>)}</tr></thead><tbody>
                {loadingRows ? <tr><td colSpan={12} className="text-center py-10 text-ink-muted border border-line">Loading...</td></tr> : rows.length === 0 ? <tr><td colSpan={12} className="text-center py-10 text-ink-muted border border-line">No records found</td></tr> : rows.map((r, i) => <tr key={r.unique_id} className="hover:bg-brand-50 transition-colors"><td className="px-3 py-2 border border-line text-ink-muted">{startEntry + i}</td><td className="px-3 py-2 border border-line">{r.item_code || "-"}</td><td className="px-3 py-2 border border-line">{r.item_description || "-"}</td><td className="px-3 py-2 border border-line">{r.item_specification || "-"}</td><td className="px-3 py-2 border border-line">{r.brand || "-"}</td><td className="px-3 py-2 border border-line">{r.product_category || "-"}</td><td className="px-3 py-2 border border-line">{r.short_category || "-"}</td><td className="px-3 py-2 border border-line text-right">{r.rc_unit_price || "-"}</td><td className="px-3 py-2 border border-line text-right">{r.gst || "-"}</td><td className="px-3 py-2 border border-line text-right">{r.rc_net_price || "-"}</td><td className="px-3 py-2 border border-line">{r.warranty_in_yrs || "-"}</td><td className="px-3 py-2 border border-line"><div className="flex gap-1"><button type="button" onClick={() => handleEdit(r.unique_id)} className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white"><i className="fa fa-pen-to-square" /></button><button type="button" onClick={() => handleDelete(r.unique_id)} className="w-7 h-7 flex items-center justify-center rounded bg-danger-light text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white"><i className="fa fa-trash" /></button></div></td></tr>)}
              </tbody></table></div>
              <div className="flex items-center justify-between px-3 py-3 text-[13px] text-ink-secondary flex-wrap gap-2"><span>Showing {startEntry} to {endEntry} of {total} entries</span><div className="flex gap-1"><button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40">Previous</button>{pages.vals.map((n) => <button type="button" key={n} onClick={() => setPage(n)} className={`w-[30px] h-[30px] text-[13px] border rounded ${n === page ? "bg-brand-500 text-white border-brand-500" : "bg-white border-line hover:border-brand-500 hover:text-brand-500"}`}>{n}</button>)}<button type="button" disabled={page >= pages.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 h-[30px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40">Next</button></div></div>
            </div>
            <div className="flex justify-end"><button type="button" onClick={() => navigate(-1)} className="px-5 py-2 bg-danger text-white text-sm font-semibold rounded-md hover:bg-danger-dark">Cancel</button></div>
          </div>
        )}
      </div></div>

      {showImport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"><div className="flex justify-between items-center"><h3 className="text-base font-bold text-ink">Item Creation Import</h3><button type="button" onClick={() => { setShowImport(false); setImportFile(null); }} className="text-ink-muted hover:text-ink text-2xl leading-none">�</button></div><p className="text-xs text-ink-secondary">Choose Excel file to import item details.</p><div className="border-2 border-dashed border-line-dark rounded-xl p-8 text-center cursor-pointer hover:border-brand-500" onClick={() => fileRef.current?.click()}><i className="ri-file-excel-2-fill text-4xl text-ink-muted mb-2 block" />{importFile ? <p className="text-sm font-medium text-success">{importFile.name}</p> : <p className="text-sm text-ink-muted">Click to browse Excel file</p>}</div><input name="itemcreationform_input_445" ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} /><div className="flex justify-end gap-3"><button type="button" onClick={() => { setShowImport(false); setImportFile(null); }} className="px-4 py-2 text-sm font-semibold border border-line rounded-md text-ink-secondary hover:bg-surface-2">Close</button><button type="button" onClick={handleImport} disabled={importing} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-success text-white rounded-md hover:bg-success-dark disabled:opacity-60">{importing ? "Importing..." : "Import"}</button></div></div></div>}
    </div>
  );
}





