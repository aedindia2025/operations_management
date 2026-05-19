import { useEffect, useMemo, useState } from "react";
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
  createDepartment,
  createOrUpdateDepartmentSublist,
  deleteDepartmentSublist,
  fetchDepartmentAccountSectorOptions,
  fetchDepartmentById,
  fetchDepartmentSuggestions,
  fetchDepartmentSublist,
  updateDepartment,
  type AccountSectorOption,
  type DepartmentRecord,
  type DepartmentSublistRow,
} from "../../api/departmentApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { getPaginationItems } from "../../utils/pagination";

interface LedgerItem {
  unique_id?: string;
  temp_id: number;
  ledger_name: string;
  ledger_no: string;
}

interface FormData {
  acc_sector: string;
  customer: string;
  description: string;
  ledger_name: string;
  ledger_no: string;
  is_active: number;
}

const INIT: FormData = {
  acc_sector: "",
  customer: "",
  description: "",
  ledger_name: "",
  ledger_no: "",
  is_active: 1,
};

const CUSTOMER_REGEX = /^[A-Za-z ]+$/;
const DESCRIPTION_REGEX = /^[A-Za-z0-9 ]+$/;
const LEDGER_NAME_REGEX = /^[A-Za-z0-9().,&/\\ -]+$/;
const LEDGER_NO_REGEX = /^[A-Za-z0-9]+$/;
const ACCOUNT_SECTOR_CACHE_KEY = "department_account_sector_options";

function normalizeLedgerValue(value?: string | null): string {
  const trimmed = (value ?? "").trim();
  return trimmed === "-" ? "" : trimmed;
}

export default function CustomerCreationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>(INIT);
  const [accountSectors, setAccountSectors] = useState<AccountSectorOption[]>(() => {
    try {
      const cached = sessionStorage.getItem(ACCOUNT_SECTOR_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [deletedLedgerIds, setDeletedLedgerIds] = useState<string[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [search, setSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<DepartmentRecord[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerSuggestionLoading, setCustomerSuggestionLoading] = useState(false);

  useEffect(() => {
    fetchDepartmentAccountSectorOptions()
      .then((data) => {
        setAccountSectors(data);
        sessionStorage.setItem(ACCOUNT_SECTOR_CACHE_KEY, JSON.stringify(data));
      })
      .catch(() => setError("Failed to load account sectors."));
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;

    const load = async () => {
      setLoading(true);
      try {
        const [department, sublist] = await Promise.all([
          fetchDepartmentById(id),
          fetchDepartmentSublist(id),
        ]);

        setForm({
          acc_sector: department.acc_sector ?? "",
          customer: department.department ?? "",
          description: department.description ?? "",
          ledger_name: "",
          ledger_no: "",
          is_active: Number(department.is_active ?? 1),
        });

        setLedgers(
          sublist.map((item: DepartmentSublistRow, index) => ({
            temp_id: index + 1,
            unique_id: item.unique_id,
            ledger_name: normalizeLedgerValue(item.ledger_name),
            ledger_no: normalizeLedgerValue(item.ledger_no),
          }))
        );
      } catch {
        setError("Failed to load customer record.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit]);

  useEffect(() => {
    const query = form.customer.trim();
    if (query.length < 2) {
      setCustomerSuggestions([]);
      setCustomerSuggestionLoading(false);
      return;
    }

    let cancelled = false;
    setCustomerSuggestionLoading(true);
    const timer = window.setTimeout(() => {
      fetchDepartmentSuggestions(query)
        .then((rows) => {
          if (cancelled) return;
          setCustomerSuggestions(rows.filter((row) => row.unique_id !== id));
        })
        .catch(() => {
          if (!cancelled) setCustomerSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setCustomerSuggestionLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.customer, id]);

  const set =
    (field: keyof FormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value = e.target.value;

        let sanitizedValue = value;
        if (field === "customer") {
          sanitizedValue = value.replace(/[^A-Za-z ]/g, "");
        } else if (field === "description") {
          sanitizedValue = value.replace(/[^A-Za-z0-9 ]/g, "");
        } else if (field === "ledger_name") {
          sanitizedValue = value.replace(/[^A-Za-z0-9().,&/\\ -]/g, "");
        } else if (field === "ledger_no") {
          sanitizedValue = value.replace(/[^A-Za-z0-9]/g, "");
        }

        setForm((prev) => ({
          ...prev,
          [field]: field === "is_active" ? Number(value) : sanitizedValue,
        }));

        if (error) setError(null);
      };

  const handleAddLedger = async () => {
    const trimmedLedgerName = form.ledger_name.trim();
    const trimmedLedgerNo = form.ledger_no.trim();

    if (!trimmedLedgerName || !trimmedLedgerNo) {
      await showErrorAlert("Fill Ledger Name and Ledger No");
      return;
    }

    if (!LEDGER_NAME_REGEX.test(trimmedLedgerName)) {
      const message = "Ledger Name allows alphabets, numbers, spaces, dot, hyphen, slash, backslash, ampersand, comma, and parentheses.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (!LEDGER_NO_REGEX.test(trimmedLedgerNo)) {
      const message = "Ledger No allows only alphabets and numbers.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (editIndex !== null) {
      setLedgers((prev) =>
        prev.map((item, index) =>
          index !== editIndex
            ? item
            : {
              ...item,
              ledger_name: trimmedLedgerName,
              ledger_no: trimmedLedgerNo,
            }
        )
      );
      setEditIndex(null);
    } else {
      setLedgers((prev) => [
        ...prev,
        {
          temp_id: Date.now(),
          ledger_name: trimmedLedgerName,
          ledger_no: trimmedLedgerNo,
        },
      ]);
    }

    setError(null);
    setForm((prev) => ({ ...prev, ledger_name: "", ledger_no: "" }));
  };

  const handleEditLedger = (index: number) => {
    const item = ledgers[index];
    setForm((prev) => ({
      ...prev,
      ledger_name: item.ledger_name,
      ledger_no: item.ledger_no,
    }));
    setEditIndex(index);
  };

  const handleDeleteLedger = (index: number) => {
    setLedgers((prev) => {
      const item = prev[index];
      if (item?.unique_id) {
        setDeletedLedgerIds((ids) => [...ids, item.unique_id!]);
      }
      return prev.filter((_, i) => i !== index);
    });
    if (editIndex === index) {
      setEditIndex(null);
      setForm((prev) => ({ ...prev, ledger_name: "", ledger_no: "" }));
    }
  };

  const filteredData = useMemo(
    () =>
      ledgers.filter(
        (item) =>
          item.ledger_name.toLowerCase().includes(search.toLowerCase()) ||
          item.ledger_no.toLowerCase().includes(search.toLowerCase())
      ),
    [ledgers, search]
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + rowsPerPage);
  const showingFrom = filteredData.length === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + rowsPerPage, filteredData.length);
  const paginationItems = getPaginationItems(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getLedgerIndex = (item: LedgerItem) =>
    ledgers.findIndex((ledger) =>
      item.unique_id
        ? ledger.unique_id === item.unique_id
        : ledger.temp_id === item.temp_id
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const populatedLedgers = ledgers.filter(
      (item) => item.ledger_name.trim() || item.ledger_no.trim()
    );

    if (form.customer.trim() && !CUSTOMER_REGEX.test(form.customer.trim())) {
      const message = "Customer Name allows only alphabets.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    if (form.description.trim() && !DESCRIPTION_REGEX.test(form.description.trim())) {
      const message = "Description allows only alphabets and numbers.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    const hasInvalidLedger = populatedLedgers.some(
      (item) =>
        !item.ledger_name.trim() ||
        !item.ledger_no.trim() ||
        !LEDGER_NAME_REGEX.test(item.ledger_name.trim()) ||
        !LEDGER_NO_REGEX.test(item.ledger_no.trim())
    );

    if (hasInvalidLedger) {
      const message = "Ledger rows contain invalid values. Please check Ledger Name and Ledger No.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        acc_sector: form.acc_sector,
        department: form.customer.trim(),
        description: form.description.trim(),
        ledger_name: "",
        ledger_no: "",
        is_active: form.is_active,
      };

      const res = isEdit && id ? await updateDepartment(id, payload) : await createDepartment(payload);
      if (!res.status) {
        const message =
          typeof res.error === "string"
            ? res.error
            : Object.values(res.error ?? {}).flat().join(" ") || "Validation failed.";
        setError(message);
        await showErrorAlert(message);
        return;
      }

      const mainUniqueId = res.data?.unique_id || id;

      for (const deletedId of deletedLedgerIds) {
        await deleteDepartmentSublist(deletedId);
      }

      for (const item of populatedLedgers) {
        const sublistRes = await createOrUpdateDepartmentSublist({
          form_main_unique_id: mainUniqueId,
          ledger_name: item.ledger_name,
          ledger_no: item.ledger_no,
          sub_unique_id: item.unique_id,
        });

        if (!sublistRes.status) {
          const message =
            typeof sublistRes.error === "string"
              ? sublistRes.error
              : Object.values(sublistRes.error ?? {}).flat().join(" ") || "Failed to save ledger row.";
          throw new Error(message);
        }
      }

      await showSuccessAlert(isEdit ? "Successfully updated" : "Successfully record saved");
      navigate("/settings/customer/list");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error. Please try again.";
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
        title={isEdit ? "Edit Customer " : "Add Customer "}
        breadcrumbs={["Settings", "Customer Creation", isEdit ? "Edit" : "Add"]}
      />

      <HorizontalFormCard className="w-full">
        <form onSubmit={handleSubmit}>
          <HorizontalFormBody className="space-y-6">
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <HorizontalFormColumns
              left={
                <>
                  <HorizontalFormRow label="Account Sector">
                    <HorizontalFieldShell select>
                      <SearchableSelectInput name="acc_sector" value={form.acc_sector} onChange={set("acc_sector")} className={horizontalSelectCls}>
                        <option value="">Select</option>
                        {accountSectors.map((item) => (
                          <option key={item.unique_id} value={item.unique_id}>
                            {item.acc_sector}
                          </option>
                        ))}
                      </SearchableSelectInput>
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Description" alignTop>
                    <HorizontalFieldShell textarea>
                      <textarea name="description"
                        value={form.description}
                        onChange={set("description")}
                        className={horizontalTextareaCls}
                        placeholder="Enter Description"
                      />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Ledger No">
                    <HorizontalFieldShell>
                      <input name="ledger_no"
                        value={form.ledger_no}
                        onChange={set("ledger_no")}
                        className={horizontalInputCls}
                        pattern="[A-Za-z0-9]+"
                        title="Only alphabets and numbers are allowed"
                      />
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                </>
              }
              right={
                <>
                  <HorizontalFormRow label="Customer">
                    <HorizontalFieldShell>
                      <input name="customer"
                        value={form.customer}
                        onChange={set("customer")}
                        onFocus={() => setShowCustomerSuggestions(true)}
                        onBlur={() => window.setTimeout(() => setShowCustomerSuggestions(false), 150)}
                        autoComplete="off"
                        className={horizontalInputCls}
                        pattern="[A-Za-z ]+"
                        title="Only alphabets are allowed"
                      />
                      {showCustomerSuggestions && form.customer.trim().length >= 2 && (
                        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-xl border border-[#d7dec8] bg-white py-1 shadow-[0_18px_40px_rgba(46,61,24,0.16)]">
                          {customerSuggestionLoading ? (
                            <div className="px-4 py-2 text-[13px] text-[#8c93a8]">Searching...</div>
                          ) : customerSuggestions.length > 0 ? (
                            customerSuggestions.map((item) => (
                              <button
                                key={item.unique_id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    customer: item.department || "",
                                  }));
                                  setShowCustomerSuggestions(false);
                                }}
                                className="block w-full px-4 py-2 text-left text-[13px] text-[#2f3b1f] hover:bg-[#f4f8ec]"
                              >
                                <span className="block font-semibold">{item.department}</span>
                                {item.ledger_name ? (
                                  <span className="block text-[12px] text-[#6b7555]">{item.ledger_name}</span>
                                ) : null}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-[13px] text-[#8c93a8]">No matching customer</div>
                          )}
                        </div>
                      )}
                    </HorizontalFieldShell>
                  </HorizontalFormRow>
                  <HorizontalFormRow label="Ledger Name">
                    <HorizontalFieldShell>
                      <input name="ledger_name"
                        value={form.ledger_name}
                        onChange={set("ledger_name")}
                        className={horizontalInputCls}
                        pattern="[A-Za-z0-9().,&/\\ -]+"
                        title="Only alphabets, numbers, spaces, dot, hyphen, slash, backslash, ampersand, comma, and parentheses are allowed"
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

            <div className="col-span-4 flex justify-end mt-4">
              <button
                type="button"
                onClick={handleAddLedger}
                className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer"
              >
                {editIndex !== null ? "Update Ledger" : "Add New"}
              </button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-3">
              <div>
                Show{" "}
                <SearchableSelectInput name="rowsperpage"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border px-2 py-1 rounded"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </SearchableSelectInput>{" "}
                entries
              </div>

              <input name="search"
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="border px-3 py-1.5 rounded w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-surface-2">
                    {["#", "Ledger Name", "Ledger No", "Action"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-[12px] font-semibold text-ink-secondary tracking-wide border border-line-dark"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((item, index) => (
                    <tr key={item.unique_id || item.temp_id}>
                      <td className="border px-3 py-2">{startIndex + index + 1}</td>
                      <td className="border px-3 py-2">{item.ledger_name || "-"}</td>
                      <td className="border px-3 py-2">{item.ledger_no || "-"}</td>
                      <td className="px-3 py-2 border border-line">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const ledgerIndex = getLedgerIndex(item);
                            if (ledgerIndex >= 0) handleEditLedger(ledgerIndex);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 text-[13px] hover:bg-info hover:text-white transition-colors cursor-pointer"
                        >
                          <i className="fa fa-pen-to-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const ledgerIndex = getLedgerIndex(item);
                            if (ledgerIndex >= 0) handleDeleteLedger(ledgerIndex);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded bg-danger-light text-danger border border-red-200 text-[13px] hover:bg-danger hover:text-white transition-colors cursor-pointer"
                        >
                          <i className="fa fa-trash" />
                        </button>
                      </div>
                    </td>
                    </tr>
                  ))}

                  {currentData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-400">
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="mt-4 text-gray-600">
                Showing {showingFrom} to {showingTo} of {filteredData.length} entries
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 px-3 border rounded bg-white border-line hover:border-brand-500 hover:text-brand-500 disabled:opacity-50"
                >
                  Previous
                </button>
                {paginationItems.map((item, index) =>
                  item === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="flex h-8 min-w-8 items-center justify-center px-2 text-gray-500"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`h-8 min-w-8 px-3 border rounded ${currentPage === item ? "bg-brand-500 text-white border-brand-500"
      : "bg-white border-line hover:border-brand-500 hover:text-brand-500"}`}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  type="button"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 px-3 border rounded bg-white border-line hover:border-brand-500 hover:text-brand-500 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </HorizontalFormBody>

          <HorizontalFormActions onCancel={() => navigate(-1)} saving={saving} submitLabel={isEdit ? "Update" : "Save"} />
        </form>
      </HorizontalFormCard>
    </div>
  );
}


