import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import { showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import { fetchEngineerNameOptions } from "../../api/serviceEngineerApi";
import { fetchUserList } from "../../api/userApi";
import { fetchVendorCreationList } from "../../api/vendorCreationApi";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import {
  createVendorBulkAssign,
  fetchVendorAllocationDetail,
  fetchVendorAllocationMeta,
  fetchVendorAllocationPending,
  fetchVendorAllocationProductDetails,
  type VendorAllocationPendingRow,
  type VendorAllocationProductRow,
} from "../../api/vendorAllocationZoneApi";

type EngineerType = "" | "own-engineer" | "outsource-vendor" | "inhouse";
type GstType = "" | "1" | "2";

type Option = {
  unique_id: string;
  label: string;
};

type SelectionRow = {
  id: string;
  sNo: number;
  poNo: string;
  poId: string;
  poDate: string;
  invoiceNo: string;
  invoiceDate: string;
  dcNo: string;
  dcDate: string;
  qty: number;
  partialSts: string;
  department: string;
  consignee: string;
  selected: boolean;
};

type ProductRow = {
  id: string;
  sNo: number;
  poUniqueId: string;
  invoiceNo: string;
  productUniqueId: string;
  itemCode: string;
  product: string;
  qty: number;
  assignedQty: number;
  alreadyAssignQty: number;
  remainingQty: number;
  partialQty: string;
  rate: string;
  gstPercent: number | null;
  taxAmount: string;
  totalAmount: string;
  dcNumbers: string[];
  dcQtyMap: Record<string, number>;
};

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  return value;
}

function splitConsignee(value?: string) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ");
}

function mapRow(row: VendorAllocationPendingRow, selected = false): SelectionRow {
  return {
    id: row.unique_id,
    sNo: toNumber(row.s_no),
    poNo: row.po_num || "--",
    poId: row.form_main_unique_id || "",
    poDate: formatDate(row.po_date),
    invoiceNo: row.inv_no || "--",
    invoiceDate: formatDate(row.invoice_date),
    dcNo: row.dc_number || "--",
    dcDate: formatDate(row.dc_date),
    qty: toNumber(row.invoice_qty),
    partialSts: String(row.partial_sts ?? ""),
    department: row.department_name || "--",
    consignee: splitConsignee(row.cons_details),
    selected,
  };
}

function gstPercentFromType(gstType: GstType) {
  if (gstType === "1") return 18;
  if (gstType === "2") return 0;
  return null;
}

function gstTypeFromStored(value?: string) {
  const normalized = String(value || "").trim();
  if (normalized === "18" || normalized === "18.00") return "1";
  if (normalized === "0" || normalized === "0.00") return "2";
  return "";
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function calculateProductRow(row: ProductRow, forcedGstPercent?: number | null) {
  const rate = toNumber(row.rate);
  const qty = toNumber(row.assignedQty || row.qty);
  const gstPercent = forcedGstPercent !== undefined ? forcedGstPercent : row.gstPercent;
  const baseAmount = qty * rate;
  const taxAmount = gstPercent == null ? 0 : (baseAmount * gstPercent) / 100;
  const totalAmount = baseAmount + taxAmount;

  return {
    ...row,
    gstPercent,
    taxAmount: formatMoney(taxAmount),
    totalAmount: formatMoney(totalAmount),
  };
}

function mapProductRow(row: VendorAllocationProductRow): ProductRow {
  return {
    id: row.id,
    sNo: row.s_no,
    poUniqueId: row.po_unique_id,
    invoiceNo: row.invoice_no || "",
    productUniqueId: row.product_unique_id,
    itemCode: row.item_code,
    product: row.product,
    qty: toNumber(row.qty),
    assignedQty: toNumber(row.partial_qty || row.qty),
    alreadyAssignQty: toNumber(row.already_assign_qty),
    remainingQty: toNumber(row.remaining_qty || row.qty),
    partialQty: row.partial_qty == null || row.partial_qty === "" ? "" : String(row.partial_qty),
    rate: row.rate || "",
    gstPercent: row.gst_percent == null ? null : Number(row.gst_percent),
    taxAmount: row.tax_amount || "0.00",
    totalAmount: row.total_amount || "0.00",
    dcNumbers: row.dc_numbers || [],
    dcQtyMap: row.dc_qty_map || {},
  };
}

export default function VendorAllocationForm() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const pageTitle = "Vendor Allocation Zone";
  const listPath = "/operation/vendor-allocation-zone/list";
  const recordId = routeId || searchParams.get("id") || "";

  const [engineerType, setEngineerType] = useState<EngineerType>("");
  const [engineerName, setEngineerName] = useState("");
  const [timeline, setTimeline] = useState("");
  const [assignNo, setAssignNo] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [gstType, setGstType] = useState<GstType>("");
  const [engineerOptions, setEngineerOptions] = useState<Option[]>([]);
  const [vendorOptions, setVendorOptions] = useState<Option[]>([]);
  const [inhouseOptions, setInhouseOptions] = useState<Option[]>([]);
  const [selectedPO, setSelectedPO] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [tableLength, setTableLength] = useState(10);
  const [tableSearch, setTableSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [rows, setRows] = useState<SelectionRow[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [engineers, vendors, users] = await Promise.all([
          fetchEngineerNameOptions(),
          fetchVendorCreationList(),
          fetchUserList({ start: 0, length: 200 }),
        ]);

        const userOptions = (users.data ?? []).map((row) => ({
          unique_id: row.unique_id,
          label: row.staff_name,
        }));

        setEngineerOptions((engineers ?? []).map((row) => ({ unique_id: row.unique_id, label: row.staff_name })));
        setVendorOptions((vendors ?? []).map((row) => ({ unique_id: row.unique_id, label: row.company_name || row.name })));
        setInhouseOptions(userOptions);
      } catch {
        setEngineerOptions([]);
        setVendorOptions([]);
        setInhouseOptions([]);
      }
    };

    loadOptions();
  }, []);

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);
      setError(null);
      try {
        if (recordId) {
          const detail = await fetchVendorAllocationDetail(recordId);
          const detailRows = (detail.data.rows ?? []).map((row) => mapRow(row, true));

          setRows(detailRows);
          setEngineerType((detail.data.bulk_eng_type as EngineerType) || "");
          setEngineerName(detail.data.bulk_eng_name || "");
          setAssignNo(detail.data.ven_assign_no || "");
          setAssignDate(detail.data.ven_assign_date || "");
          setInstallationDate(detail.data.vendor_ins_date || "");
          setTimeline(detail.data.vendor_bulk_timeline || "");
          setGstType(gstTypeFromStored(detail.data.vendor_bulk_gst) as GstType);
          setSelectedPO(detailRows[0]?.poNo || "");
          setSelectedInvoice(detail.data.invoice_no || detailRows[0]?.invoiceNo || "");
        } else {
          const [meta, pending] = await Promise.all([
            fetchVendorAllocationMeta(),
            fetchVendorAllocationPending({ page: 1, length: 1000, search: "", skip_count: 1 }),
          ]);

          setAssignNo(meta.data?.assign_no || "");
          setAssignDate(meta.data?.assign_date || new Date().toISOString().slice(0, 10));
          setRows((pending.data ?? []).map((row) => mapRow(row)));
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to load vendor allocation form.");
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [recordId]);

  useEffect(() => {
    setTablePage(1);
  }, [selectedPO, selectedInvoice]);

  const filteredBySelection = useMemo(() => {
    if (!selectedInvoice) return [];
    return rows.filter((row) => {
      const poOk = selectedPO ? row.poNo === selectedPO : true;
      return poOk && row.invoiceNo === selectedInvoice;
    });
  }, [rows, selectedPO, selectedInvoice]);

  const filteredRows = useMemo(() => {
    const q = tableSearch.toLowerCase();
    return filteredBySelection.filter((row) => (
      row.poNo.toLowerCase().includes(q) ||
      row.invoiceNo.toLowerCase().includes(q) ||
      row.dcNo.toLowerCase().includes(q) ||
      row.consignee.toLowerCase().includes(q)
    ));
  }, [filteredBySelection, tableSearch]);

  const activeSelectedRows = useMemo(
    () => filteredBySelection.filter((row) => row.selected),
    [filteredBySelection],
  );

  const effectiveTableLength = tableLength === -1 ? Math.max(filteredRows.length, 1) : tableLength;
  const totalTablePages = Math.max(1, Math.ceil(filteredRows.length / effectiveTableLength));
  const pagedRows = tableLength === -1 ? filteredRows : filteredRows.slice((tablePage - 1) * tableLength, tablePage * tableLength);

  const poOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.poNo))).filter(Boolean), [rows]);
  const invoiceOptions = useMemo(() => {
    const source = selectedPO ? rows.filter((row) => row.poNo === selectedPO) : rows;
    return Array.from(new Set(source.map((row) => row.invoiceNo))).filter(Boolean);
  }, [rows, selectedPO]);

  const currentEngineerOptions = useMemo(() => {
    if (engineerType === "outsource-vendor") return vendorOptions;
    if (engineerType === "inhouse") return inhouseOptions;
    return engineerOptions;
  }, [engineerOptions, vendorOptions, inhouseOptions, engineerType]);

  const grandTotal = useMemo(
    () => formatMoney(productRows.reduce((sum, row) => sum + toNumber(row.totalAmount), 0)),
    [productRows],
  );
  const isPartialSelection = engineerType === "outsource-vendor" && activeSelectedRows.length === 1;
  const showProductTable = engineerType === "outsource-vendor" && (
    productLoading ||
    productRows.length > 0 ||
    activeSelectedRows.length > 0
  );

  useEffect(() => {
    const loadProductRows = async () => {
      const currentSelectedRows = filteredBySelection.filter((row) => row.selected);
      const currentSelectedDcNumbers = Array.from(
        new Set(currentSelectedRows.map((row) => row.dcNo).filter(Boolean)),
      );

      if (engineerType !== "outsource-vendor") {
        setProductRows([]);
        return;
      }

      if (currentSelectedRows.length === 0) {
        setProductRows([]);
        return;
      }

      const poId = currentSelectedRows[0]?.poId || filteredBySelection[0]?.poId || "";
      if (!poId || currentSelectedDcNumbers.length === 0) {
        setProductRows([]);
        return;
      }

      setProductLoading(true);
      try {
        const response = await fetchVendorAllocationProductDetails({
          po_id: poId,
          invoice_no: selectedInvoice || currentSelectedRows[0]?.invoiceNo || "",
          dc_numbers: currentSelectedDcNumbers,
          gst_type: gstType || undefined,
        });

        const rateMemory = new Map(
          productRows.map((row) => [row.productUniqueId || row.id, row.rate]),
        );
        const forcedGstPercent = gstPercentFromType(gstType);

        const mappedRows = (response.data ?? []).map((row) => {
          const mapped = mapProductRow(row);
          const rememberedRate = rateMemory.get(mapped.productUniqueId || mapped.id);
          const merged = rememberedRate != null && rememberedRate !== ""
            ? { ...mapped, rate: rememberedRate }
            : mapped;
          const qtySource = currentSelectedRows.length === 1 ? (mapped.partialQty || String(mapped.qty)) : String(mapped.qty);
          const mergedWithQty = {
            ...merged,
            partialQty: qtySource,
            assignedQty: toNumber(qtySource || merged.qty),
          };
          return calculateProductRow(mergedWithQty, forcedGstPercent !== null ? forcedGstPercent : merged.gstPercent);
        });

        setProductRows(mappedRows);
      } catch (err: any) {
        setProductRows([]);
        setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to load vendor product details.");
      } finally {
        setProductLoading(false);
      }
    };

    loadProductRows();
  }, [engineerType, filteredBySelection, gstType, selectedInvoice]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRow = (rowId: string) => {
    setError(null);
    setRows((prev) => {
      const target = prev.find((row) => row.id === rowId);
      if (!target) return prev;

      const nextSelected = !target.selected;
      const selectedRows = prev.filter((row) => row.selected && row.id !== rowId);
      const hasExistingPartial = selectedRows.some((row) => row.partialSts === "1");

      if (nextSelected) {
        if ((engineerType === "own-engineer" || engineerType === "inhouse") && target.partialSts === "1") {
          setError("Partial DC rows cannot be assigned to own engineer or inhouse team.");
          return prev;
        }

        if (engineerType === "outsource-vendor" && selectedRows.length > 0 && (hasExistingPartial || target.partialSts === "1")) {
          setError("You cannot select more than one partial DC. Please keep only one partial row selected.");
          return prev;
        }
      }

      return prev.map((row) => row.id === rowId ? { ...row, selected: nextSelected } : row);
    });
  };

  const toggleAll = (checked: boolean) => {
    const ids = new Set(filteredBySelection.map((row) => row.id));
    setError(null);
    setRows((prev) => prev.map((row) => {
      if (!ids.has(row.id)) return row;
      if (!checked) return { ...row, selected: false };
      if ((engineerType === "own-engineer" || engineerType === "inhouse") && row.partialSts === "1") {
        return { ...row, selected: false };
      }
      if (engineerType === "outsource-vendor" && row.partialSts === "1") {
        return { ...row, selected: false };
      }
      return { ...row, selected: true };
    }));
  };

  const handleRateChange = (productUniqueId: string, value: string) => {
    const forcedGstPercent = gstPercentFromType(gstType);
    setProductRows((prev) => prev.map((row) => (
      row.productUniqueId === productUniqueId
        ? calculateProductRow(
            { ...row, rate: value },
            forcedGstPercent !== null ? forcedGstPercent : row.gstPercent,
          )
        : row
    )));
  };

  const handlePartialQtyChange = (productUniqueId: string, value: string) => {
    const forcedGstPercent = gstPercentFromType(gstType);
    setProductRows((prev) => prev.map((row) => {
      if (row.productUniqueId !== productUniqueId) return row;

      const numeric = value === "" ? 0 : toNumber(value);
      const maxQty = toNumber(row.remainingQty || row.qty);
      if (numeric > maxQty) {
        setError(null);
        void showWarningAlert(`Assign qty cannot be greater than remaining qty ${maxQty}.`);
        return calculateProductRow(
          {
            ...row,
            partialQty: String(maxQty),
            assignedQty: maxQty,
          },
          forcedGstPercent !== null ? forcedGstPercent : row.gstPercent,
        );
      }

      return calculateProductRow(
        {
          ...row,
          partialQty: value,
          assignedQty: numeric,
        },
        forcedGstPercent !== null ? forcedGstPercent : row.gstPercent,
      );
    }));
  };

  const allSelected = filteredBySelection.length > 0 && filteredBySelection.every((row) => row.selected);

  const handleSubmit = async () => {
    if (!engineerType) {
      setError("Please select engineer type.");
      return;
    }
    if (!engineerName) {
      setError("Please select engineer or vendor.");
      return;
    }
    if (!installationDate) {
      setError("Please select installation date.");
      return;
    }
    if (!timeline) {
      setError("Please select time line.");
      return;
    }
    if (!selectedPO) {
      setError("Please select PO number.");
      return;
    }
    if (activeSelectedRows.length === 0) {
      setError("Please select at least one invoice row.");
      return;
    }
    if (engineerType === "outsource-vendor" && productRows.length === 0) {
      setError("Invoice product details are required for outsource vendor allocation.");
      return;
    }
    if (isPartialSelection && productRows.some((row) => toNumber(row.assignedQty) <= 0 || toNumber(row.assignedQty) > toNumber(row.remainingQty || row.qty))) {
      const invalidRow = productRows.find((row) => toNumber(row.assignedQty) <= 0 || toNumber(row.assignedQty) > toNumber(row.remainingQty || row.qty));
      const remainingQty = toNumber(invalidRow?.remainingQty || invalidRow?.qty);
      await showWarningAlert(`Please enter a valid assign qty. Maximum allowed qty is ${remainingQty}.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const gstPercent = gstPercentFromType(gstType);
      const res = await createVendorBulkAssign({
        invoice_ids: activeSelectedRows.map((row) => row.id),
        bulk_eng_type: engineerType,
        bulk_eng_name: engineerName,
        vendor_bulk_timeline: timeline,
        ven_assign_date: assignDate || new Date().toISOString().slice(0, 10),
        assign_no: assignNo,
        vendor_ins_date: installationDate,
        rate: String(productRows.reduce((sum, row) => sum + toNumber(row.rate), 0) || ""),
        gst: gstPercent != null ? String(gstPercent) : "",
        total_amount: grandTotal,
        partial_sts: engineerType === "outsource-vendor" ? (isPartialSelection ? "1" : "0") : "2",
        product_rows: productRows.map((row) => ({
          po_unique_id: row.poUniqueId,
          invoice_no: row.invoiceNo,
          product_unique_id: row.productUniqueId,
          item_code: row.itemCode,
          product: row.product,
          qty: row.qty,
          assigned_qty: row.assignedQty,
          partial_qty: isPartialSelection ? row.assignedQty : row.qty,
          remaining_qty: Math.max(toNumber(row.remainingQty || row.qty) - toNumber(row.assignedQty || row.qty), 0),
          already_assign_qty: row.alreadyAssignQty,
          rate: row.rate,
          gst: String(row.gstPercent ?? ""),
          tax_amount: row.taxAmount,
          total_amount: row.totalAmount,
          dc_qty_map: row.dcQtyMap,
        })),
      });

      if (res.status) {
        await showSuccessAlert("Vendor allocation zone saved successfully.");
        navigate(listPath);
      } else {
        setError(res.error || res.message || "Failed to save vendor allocation.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to save vendor allocation.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none bg-white text-ink focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all";
  const selectCls = "w-full px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none bg-white text-ink focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
      <PageTopbar title={pageTitle} breadcrumbs={["Operation", pageTitle, recordId ? "Edit" : "Add"]} />

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}

      <div className="mb-4 overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-0">
            <div className="flex flex-col gap-0">
              <div className="flex items-center gap-0 py-3 border-b border-line/40">
                <span className="text-[13px] text-ink-secondary w-40 shrink-0">Engineer Type</span>
                <span className="text-ink-secondary mr-4">:</span>
                <div className="flex-1">
                  <SearchableSelectInput name="engineertype" value={engineerType} onChange={(e) => { setEngineerType(e.target.value as EngineerType); setEngineerName(""); }} className={selectCls}>
                    <option value="">Select Engineer Type</option>
                    <option value="own-engineer">Own Engineer</option>
                    <option value="outsource-vendor">Outsource Vendor</option>
                    <option value="inhouse">Inhouse Operation Team</option>
                  </SearchableSelectInput>
                </div>
              </div>

              {engineerType === "outsource-vendor" && (
                <div className="flex items-center gap-0 py-3 border-b border-line/40">
                  <span className="text-[13px] text-ink-secondary w-40 shrink-0">GST Type</span>
                  <span className="text-ink-secondary mr-4">:</span>
                  <div className="flex-1">
                    <SearchableSelectInput name="gsttype" value={gstType} onChange={(e) => setGstType(e.target.value as GstType)} className={selectCls}>
                      <option value="">Select GST Type</option>
                      <option value="1">With GST</option>
                      <option value="2">Without GST</option>
                    </SearchableSelectInput>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-0 py-3 border-b border-line/40">
                <span className="text-[13px] text-ink-secondary w-40 shrink-0">Engineer Name</span>
                <span className="text-ink-secondary mr-4">:</span>
                <div className="flex-1">
                  <SearchableSelectInput name="engineername" value={engineerName} onChange={(e) => setEngineerName(e.target.value)} className={selectCls}>
                    <option value="">Select</option>
                    {currentEngineerOptions.map((option) => <option key={option.unique_id} value={option.unique_id}>{option.label}</option>)}
                  </SearchableSelectInput>
                </div>
              </div>

              <div className="flex items-center gap-0 py-3">
                <span className="text-[13px] text-ink-secondary w-40 shrink-0">Installation Date</span>
                <span className="text-ink-secondary mr-4">:</span>
                <div className="flex-1">
                  <input name="installationdate" type="date" value={installationDate} onChange={(e) => setInstallationDate(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-0">
              <div className="flex items-center gap-0 py-3 border-b border-line/40">
                <span className="text-[13px] text-ink-secondary w-36 shrink-0">Assign No</span>
                <span className="text-ink-secondary mr-4">:</span>
                <span className="text-[13px] font-semibold text-ink">{assignNo || "--"}</span>
              </div>

              <div className="flex items-center gap-0 py-3 border-b border-line/40">
                <span className="text-[13px] text-ink-secondary w-36 shrink-0">Assign Date</span>
                <span className="text-ink-secondary mr-4">:</span>
                <span className="text-[13px] text-ink">{formatDate(assignDate) || "--"}</span>
              </div>

              <div className="flex items-center gap-0 py-3">
                <span className="text-[13px] text-ink-secondary w-36 shrink-0">Time Line</span>
                <span className="text-ink-secondary mr-4">:</span>
                <div className="flex-1">
                  <input name="timeline" type="date" value={timeline} onChange={(e) => setTimeline(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 mb-6">
            <div className="flex items-center gap-0">
              <span className="text-[13px] text-ink-secondary w-28 shrink-0 font-semibold">PO NO</span>
              <span className="text-ink-secondary mr-4">:</span>
                <div className="flex-1">
                  <SearchableSelectInput name="selectedpo" value={selectedPO} onChange={(e) => { setSelectedPO(e.target.value); setSelectedInvoice(""); }} className={selectCls} disabled={!engineerType}>
                    <option value="">Select PO Number</option>
                    {poOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </SearchableSelectInput>
              </div>
            </div>

            <div className="flex items-center gap-0">
              <span className="text-[13px] text-ink-secondary w-28 shrink-0 font-semibold">INVOICE NO</span>
              <span className="text-ink-secondary mr-4">:</span>
              <div className="flex-1">
                <SearchableSelectInput name="selectedinvoice" value={selectedInvoice} onChange={(e) => setSelectedInvoice(e.target.value)} className={selectCls}>
                  <option value="">Select Invoice No</option>
                  {invoiceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </SearchableSelectInput>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              Show
              <SearchableSelectInput name="tablelength" value={tableLength} onChange={(e) => { setTableLength(+e.target.value); setTablePage(1); }} className="px-2 py-1 text-[13px] border border-line-dark rounded outline-none focus:border-brand-500" style={{ width: 84 }}>
                {[10, 25, 50, 100, -1].map((n) => <option key={n} value={n}>{n === -1 ? "All" : n}</option>)}
              </SearchableSelectInput>
              entries
            </div>
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
              Search:
              <input name="tablesearch" value={tableSearch} placeholder="Search..." onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }} className="px-2.5 py-1 text-[13px] border border-line-dark rounded outline-none w-40 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
            </div>
          </div>

          <div className="overflow-x-auto mb-1">
            <table className="w-full text-[13px] border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-2">
                  <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark align-middle">
                    <div className="flex flex-col items-center gap-0.5 leading-tight">
                      <span>Selection</span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        (Select All)
                        <input name="allselected" type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} className="accent-brand-600 w-3.5 h-3.5 cursor-pointer" />
                      </span>
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">S.No</th>
                  <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">PO No / Date</th>
                  <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Invoice No / Date</th>
                  <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">DC No / Date</th>
                  <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark w-16">Qty</th>
                  <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Department</th>
                  <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Consignee</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-ink-muted border border-line italic text-[13px]">Loading...</td></tr>
                ) : pagedRows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-ink-muted border border-line italic text-[13px]">No data available in table</td></tr>
                ) : pagedRows.map((row, index) => (
                  <tr key={row.id} className={`border-b border-line/50 transition-colors ${row.selected ? "bg-brand-50/60" : "hover:bg-brand-50/30"}`}>
                        <td className="px-3 py-3 text-center border border-line/50"><input name="selected" type="checkbox" checked={row.selected} onChange={() => toggleRow(row.id)} className="accent-brand-600 w-3.5 h-3.5 cursor-pointer" /></td>
                    <td className="px-3 py-3 text-center border border-line/50 text-ink-muted">{(tablePage - 1) * effectiveTableLength + index + 1}</td>
                    <td className="px-3 py-3 border border-line/50"><div className="font-semibold text-ink text-[13px]">{row.poNo}</div><div className="text-[11px] text-ink-muted">{row.poDate}</div></td>
                    <td className="px-3 py-3 border border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{row.invoiceNo}</div><div className="text-[11px] text-ink-muted">{row.invoiceDate}</div></td>
                    <td className="px-3 py-3 border border-line/50 whitespace-nowrap"><div className="font-semibold text-ink text-[13px]">{row.dcNo}</div><div className="text-[11px] text-ink-muted">{row.dcDate}</div></td>
                    <td className="px-3 py-3 text-center border border-line/50 font-semibold text-ink">{row.qty}</td>
                    <td className="px-3 py-3 border border-line/50 text-[13px]">{row.department}</td>
                    <td className="px-3 py-3 border border-line/50 text-[13px] text-ink-secondary">{row.consignee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-2 text-[13px] text-ink-secondary flex-wrap gap-2">
            <span>Showing {filteredRows.length === 0 ? 0 : (tablePage - 1) * effectiveTableLength + 1} to {Math.min(tablePage * effectiveTableLength, filteredRows.length)} of {filteredRows.length} entries</span>
            <div className="flex gap-1">
              <button disabled={tablePage === 1} onClick={() => setTablePage((p) => p - 1)} className="px-3 h-[28px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Previous</button>
              <button disabled={tablePage >= totalTablePages} onClick={() => setTablePage((p) => p + 1)} className="px-3 h-[28px] text-[13px] bg-white border border-line rounded hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Next</button>
            </div>
          </div>

          {showProductTable && (
            <div className="mt-6 border-t border-line pt-5">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse min-w-[960px]">
                  <thead>
                    <tr className="bg-surface-2">
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">S.No</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark">Product Details</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Qty</th>
                      {isPartialSelection && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Assign Qty</th>}
                      {isPartialSelection && <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Remaining Qty</th>}
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Rate</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">GST</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Tax Amount</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20] border border-line-dark whitespace-nowrap">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productLoading ? (
                      <tr><td colSpan={isPartialSelection ? 9 : 7} className="text-center py-8 text-ink-muted border border-line italic text-[13px]">Loading product details...</td></tr>
                    ) : productRows.length === 0 ? (
                      <tr><td colSpan={isPartialSelection ? 9 : 7} className="text-center py-8 text-ink-muted border border-line italic text-[13px]">No product details available for the selected invoice rows.</td></tr>
                    ) : productRows.map((row) => (
                      <tr key={row.productUniqueId || row.id} className="border-b border-line/50 hover:bg-brand-50/20 transition-colors">
                        <td className="px-3 py-3 text-center border border-line/50 text-ink-muted">{row.sNo}</td>
                        <td className="px-3 py-3 border border-line/50">
                          <div className="font-semibold text-ink text-[13px]">{row.itemCode}</div>
                          <div className="text-[12px] text-ink-secondary">{row.product}</div>
                        </td>
                        <td className="px-3 py-3 text-center border border-line/50 font-semibold text-ink">{row.qty}</td>
                        {isPartialSelection && (
                          <td className="px-3 py-3 text-center border border-line/50">
                            <input name="partialqty"
                              type="number"
                              min="0"
                              max={row.remainingQty}
                              value={row.partialQty}
                              onChange={(e) => handlePartialQtyChange(row.productUniqueId, e.target.value)}
                              className="w-28 px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none bg-white text-ink text-right focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
                            />
                          </td>
                        )}
                        {isPartialSelection && (
                          <td className="px-3 py-3 text-center border border-line/50 font-semibold text-ink">{row.remainingQty}</td>
                        )}
                        <td className="px-3 py-3 text-center border border-line/50">
                          <input name="rate"
                            type="text"
                            value={row.rate}
                            onChange={(e) => handleRateChange(row.productUniqueId, e.target.value)}
                            className="w-32 px-3 py-2 text-[13px] border border-line-dark rounded-lg outline-none bg-white text-ink text-right focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
                          />
                        </td>
                        <td className="px-3 py-3 text-center border border-line/50 font-semibold text-ink">
                          {row.gstPercent == null ? "" : `${row.gstPercent}%`}
                        </td>
                        <td className="px-3 py-3 text-right border border-line/50 font-semibold text-ink">{row.taxAmount}</td>
                        <td className="px-3 py-3 text-right border border-line/50 font-semibold text-ink">{row.totalAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-3">
                <span className="text-[14px] font-extrabold text-ink">Total: {grandTotal}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-line">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors bg-red-500 hover:bg-red-600 text-white border-0">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving || loading || productLoading} className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors bg-brand-700 hover:bg-brand-800 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? "Saving..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


