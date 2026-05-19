import { Fragment, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  createInvoice,
  deleteInvoiceDocRow,
  fetchInvoiceDetail,
  fetchLedgerOptions,
  saveInvoiceSerialNumbers,
  type ApprovalBlock,
  type InvoiceDetail,
  type InvoiceDocRow,
  type InvoiceItemRow,
  type LedgerOption,
  updateInvoiceSerialNumbers,
  updateInvoice,
} from "../../api/invoiceApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

const emptyApproval: ApprovalBlock = {
  status: "rejected",
  status_icon: "rejected",
  label_by: "Reject By",
  label_date: "Rejected Date",
  by: "",
  date: "",
  reason: "",
};

const emptyDetail: InvoiceDetail = {
  unique_id: "",
  source_unique_id: "",
  form_main_unique_id: "",
  po_unique_id: "",
  po_num: "",
  po_date: "",
  stock_id: "",
  stock_date: "",
  department: "",
  department_display: "",
  customer_name: "",
  customer_details: "",
  district_name: "",
  state_name: "",
  customer_location: "",
  executive_name: "",
  executive_display: "",
  team_member: "",
  billing_address: "",
  billing_gst_no: "",
  consignee_name: "",
  consignee_address: "",
  branch: "",
  branch_code: "",
  zone: "",
  pincode: "",
  contact_name: "",
  contact_number: "",
  alternate_contact_name: "",
  alternate_contact_number: "",
  consignee_gst_no: "",
  email: "",
  ledger_name: "",
  ledger_display: "",
  ledger_no: "",
  invoice_auto_id: "",
  no_of_items: 0,
  dc_number: "",
  dc_date: "",
  invoice_no: "",
  invoice_date: "",
  invoice_qty: 0,
  invoice_value: "0",
  invoice_doc_status: "0",
  invoice_doc_status_label: "Pending",
  doc_approval_sts: "0",
  acc_team_status: "0",
  approved_by: "",
  approved_date: "",
  ac_team_approved_by: "",
  ac_approved_date: "",
  reject_reason_elcot: "",
  po_file_url: "",
  dc_file_url: "",
  ir_file_url: "",
  invoice_file_url: "",
  dc_original_name: "",
  ir_original_name: "",
  invoice_original_name: "",
  operation_team: emptyApproval,
  accounts_team: emptyApproval,
  doc_rows: [],
  items: [],
};

const tabs = [
  { key: "stock", label: "Stock Details" },
  { key: "docs", label: "DC & Invoice Details" },
] as const;

type ActiveTab = (typeof tabs)[number]["key"];
type SerialInputMode = "enter" | "upload";

type SerialModalState = {
  open: boolean;
  mode: "create" | "update";
  itemId: string;
  itemCode: string;
  invoiceQty: number;
  specCount: number;
  inputMode: SerialInputMode;
  gridValues: string[][];
  collectedValues: string;
};

const money = (value: string | number) =>
  Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toInputDate = (value: string) => {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length === 3 && parts[0].length === 2) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return value;
};

const createSerialGrid = (invoiceQty: number, specCount: number, values: string[] = []) => {
  const rowCount = Math.max(Number(invoiceQty) || 0, 0);
  const colCount = Math.max(Number(specCount) || 1, 1);
  let index = 0;
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => {
      const value = values[index] ?? "";
      index += 1;
      return value;
    }),
  );
};

const flattenSerialGrid = (grid: string[][]) =>
  grid
    .flat()
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

function PdfAttachmentLink({ url }: { url?: string }) {
  if (!url) return <span>-</span>;
  return (
    <a
      href={encodeURI(url)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center w-8 h-8 rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
      title="View PDF"
      aria-label="View PDF"
    >
      <i className="fa fa-file-pdf" />
    </a>
  );
}

export default function InvoiceDcForm() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [params] = useSearchParams();
  const uniqueId = params.get("id") || routeId || "";
  const viewMode = params.get("mode") === "view";
  const [activeTab, setActiveTab] = useState<ActiveTab>("stock");
  const [detail, setDetail] = useState<InvoiceDetail>(emptyDetail);
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [docRows, setDocRows] = useState<InvoiceDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dcFile, setDcFile] = useState<File | null>(null);
  const [irFile, setIrFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [ledgerOptions, setLedgerOptions] = useState<LedgerOption[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>("");
  const [serialModal, setSerialModal] = useState<SerialModalState>({
    open: false,
    mode: "create",
    itemId: "",
    itemCode: "",
    invoiceQty: 0,
    specCount: 1,
    inputMode: "enter",
    gridValues: [],
    collectedValues: "",
  });

  const loadLedgerOptions = async (department: string) => {
    try {
      if (!department) return;
      const res = await fetchLedgerOptions(department);
      if (res.status) {
        setLedgerOptions(res.data);
        return res.data;
      }
    } catch {
      // Handle error if needed
    }
    return [] as LedgerOption[];
  };

  const loadDetail = async () => {
    if (!uniqueId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchInvoiceDetail(uniqueId);
      const next = {
        ...res.data,
        dc_date: toInputDate(res.data.dc_date),
        invoice_date: toInputDate(res.data.invoice_date),
      };
      setDetail(next);
      setItems(next.items || []);
      setDocRows(next.doc_rows || []);

      const options = await loadLedgerOptions(next.department || "");
      if (next.ledger_name || next.ledger_no) {
        const option = options.find(
          (opt) => opt.ledger_name === next.ledger_name || opt.ledger_no === next.ledger_no,
        );
        if (option) setSelectedLedgerId(option.unique_id);
      }
    } catch {
      await showErrorAlert("Failed to load invoice details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [uniqueId]);

  const isCreate = useMemo(() => !detail.invoice_no, [detail.invoice_no]);

  const setField =
    (field: keyof InvoiceDetail) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setDetail((prev) => ({ ...prev, [field]: value }));
    };

  const handleLedgerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setSelectedLedgerId(selectedId);
    const option = ledgerOptions.find(opt => opt.unique_id === selectedId);
    if (option) {
      setDetail((prev) => ({
        ...prev,
        ledger_name: option.ledger_name,
        ledger_no: option.ledger_no,
      }));
    } else {
      setDetail((prev) => ({
        ...prev,
        ledger_name: "",
        ledger_no: "",
      }));
    }
  };

  const updateItem = (unique_id: string, patch: Partial<InvoiceItemRow>) => {
    setItems((prev) => prev.map((item) => (item.unique_id === unique_id ? { ...item, ...patch } : item)));
  };

  const syncItemSerials = (unique_id: string, patch: Partial<InvoiceItemRow>) => {
    updateItem(unique_id, patch);
  };

  const handleDeleteDocRow = async (unique_id: string) => {
    if (viewMode) return;
    const confirmed = await showConfirmAlert("Are you sure you want to delete this document row?");
    if (!confirmed) return;
    try {
      await deleteInvoiceDocRow(unique_id);
      await showSuccessAlert("Document row deleted successfully.");
      await loadDetail();
    } catch (error: any) {
      await showErrorAlert(error?.response?.data?.message || "Failed to delete document row.");
    }
  };

  const validate = (forAddNew = false) => {
    if (!detail.dc_number.trim()) return "Please enter DC number.";
    if (!detail.dc_date) return "Please select DC date.";
    if (!detail.invoice_no.trim()) return "Please enter invoice number.";
    if (!detail.invoice_date) return "Please select invoice date.";
    if (!detail.ledger_name.trim()) return "Please select ledger name.";
    // Removed ledger_no validation as it's auto-populated
    if (forAddNew && !dcFile && !detail.dc_file_url) return "Please choose DC attachment.";
    if (forAddNew && !invoiceFile && !detail.invoice_file_url) return "Please choose Invoice attachment.";
    return "";
  };

  const buildPayload = () => {
    const payload = new FormData();
    payload.append("source_unique_id", detail.source_unique_id || detail.unique_id);
    payload.append("dc_number", detail.dc_number);
    payload.append("dc_date", detail.dc_date);
    payload.append("invoice_no", detail.invoice_no);
    payload.append("invoice_date", detail.invoice_date);
    payload.append("ledger_name", detail.ledger_name);
    payload.append("ledger_no", detail.ledger_no);
    payload.append(
      "items_json",
      JSON.stringify(
        items.map((item) => ({
          unique_id: item.unique_id,
          invoice_bill_qty: item.invoice_bill_qty,
          serial_selection: item.serial_selection,
          serial_numbers: item.serial_numbers,
        })),
      ),
    );
    if (dcFile) payload.append("dc_file", dcFile);
    if (irFile) payload.append("ir_file", irFile);
    if (invoiceFile) payload.append("invoice_file", invoiceFile);
    return payload;
  };

  const persistInvoice = async ({
    successMessage,
    navigateAfterSave,
    forAddNew = false,
  }: {
    successMessage: string;
    navigateAfterSave: boolean;
    forAddNew?: boolean;
  }) => {
    const message = validate(forAddNew);
    if (message) {
      await showErrorAlert(message);
      return false;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isCreate) {
        await createInvoice(payload);
      } else {
        await updateInvoice(detail.unique_id, payload);
      }
      await showSuccessAlert(successMessage);
      setDcFile(null);
      setIrFile(null);
      setInvoiceFile(null);
      if (navigateAfterSave) {
        navigate("/stores/invoice-dc/list");
      } else {
        await loadDetail();
      }
      return true;
    } catch (err: any) {
      await showErrorAlert(err?.response?.data?.message || "Failed to save invoice.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    if (viewMode) return;
    setActiveTab("docs");
    if (docRows.length > 0) {
      await showErrorAlert("Only one attachment sublist row is allowed. Please delete the existing row before adding a new one.");
      return;
    }
    await persistInvoice({
      successMessage: "Invoice attachment row saved successfully.",
      navigateAfterSave: false,
      forAddNew: true,
    });
  };

  const openSerialModal = (item: InvoiceItemRow, mode: "create" | "update") => {
    const specCount = item.spec_serial_count || 1;
    const existingValues = String(item.serial_numbers || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const gridValues = createSerialGrid(item.invoice_bill_qty || 0, specCount, existingValues);
    setSerialModal({
      open: true,
      mode,
      itemId: item.unique_id,
      itemCode: item.item_code || item.name || "",
      invoiceQty: item.invoice_bill_qty || 0,
      specCount,
      inputMode: "enter",
      gridValues,
      collectedValues: existingValues.join(", "),
    });
  };

  const closeSerialModal = () => {
    setSerialModal((prev) => ({ ...prev, open: false }));
  };

  const handleSerialSelectionChange = (item: InvoiceItemRow, value: string) => {
    syncItemSerials(item.unique_id, { serial_selection: value });
    if (value === "With") {
      openSerialModal({ ...item, serial_selection: value }, item.serial_numbers ? "update" : "create");
    } else if (value === "Without") {
      syncItemSerials(item.unique_id, {
        serial_numbers: "",
        mon_serial_numbers: "",
        spec_serial_count: item.spec_serial_count || 1,
      });
    }
  };

  const handleSerialGridChange = (rowIndex: number, colIndex: number, value: string) => {
    setSerialModal((prev) => {
      const nextGrid = prev.gridValues.map((row, idx) =>
        idx === rowIndex ? row.map((cell, cellIdx) => (cellIdx === colIndex ? value : cell)) : row,
      );
      return {
        ...prev,
        gridValues: nextGrid,
        collectedValues: flattenSerialGrid(nextGrid),
      };
    });
  };

  const handleSerialSpecChange = (nextSpec: number) => {
    setSerialModal((prev) => {
      const values = flattenSerialGrid(prev.gridValues)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const nextGrid = createSerialGrid(prev.invoiceQty, nextSpec, values);
      return {
        ...prev,
        specCount: nextSpec,
        gridValues: nextGrid,
        collectedValues: flattenSerialGrid(nextGrid),
      };
    });
  };

  const handleSerialModeChange = (nextMode: SerialInputMode) => {
    setSerialModal((prev) => ({ ...prev, inputMode: nextMode }));
  };

  const handleSerialUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, { header: 1 });
      const values = rows
        .flat()
        .map((cell) => String(cell ?? "").trim())
        .filter(Boolean);
      setSerialModal((prev) => {
        const nextGrid = createSerialGrid(prev.invoiceQty, prev.specCount, values);
        return {
          ...prev,
          inputMode: "upload",
          gridValues: nextGrid,
          collectedValues: flattenSerialGrid(nextGrid),
        };
      });
    } catch {
      await showErrorAlert("Failed to read the uploaded Excel file.");
    }
  };

  const handleSerialSave = async () => {
    const item = items.find((entry) => entry.unique_id === serialModal.itemId);
    if (!item) return;
    const collected = serialModal.collectedValues.trim();
    if (serialModal.mode === "create") {
      if (!detail.dc_number.trim()) {
        await showErrorAlert("Please enter DC number first.");
        return;
      }
      if (!collected) {
        await showErrorAlert("Please enter serial numbers before saving.");
        return;
      }
      setSaving(true);
      try {
        const res = await saveInvoiceSerialNumbers({
          action: "serial_no_update",
          ser_qty: collected,
          mon_ser_qty: collected,
          seril_no_selc: "With",
          spec_srl_no: serialModal.specCount,
          unique_id: item.unique_id,
          dc_number: detail.dc_number,
        });
        if (res.msg === "duplicate") {
          await showErrorAlert(res.error || "Already Exists in Database!.");
          return;
        }
        syncItemSerials(item.unique_id, {
          serial_selection: "With",
          serial_numbers: collected,
          mon_serial_numbers: collected,
          spec_serial_count: serialModal.specCount,
        });
        await showSuccessAlert("Serial number updated successfully.");
        closeSerialModal();
        await loadDetail();
      } catch (err: any) {
        await showErrorAlert(err?.response?.data?.message || "Failed to save serial numbers.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const res = await updateInvoiceSerialNumbers({
        action: "update_serial_no",
        serial_no: collected,
        unique_id: item.unique_id,
      });
      if (res.msg === "duplicate") {
        await showErrorAlert(res.error || "Already Exists in Database!.");
        return;
      }
      syncItemSerials(item.unique_id, {
        serial_selection: "With",
        serial_numbers: collected,
        mon_serial_numbers: collected,
        spec_serial_count: serialModal.specCount,
      });
      await showSuccessAlert("Successfully Updated Serial Number");
      closeSerialModal();
      await loadDetail();
    } catch (err: any) {
      await showErrorAlert(err?.response?.data?.message || "Failed to update serial numbers.");
    } finally {
      setSaving(false);
    }
  };

  const handleRowUpdate = async (item: InvoiceItemRow) => {
    if (viewMode) return;
    if (!item.serial_selection) {
      await showErrorAlert("Please select serial type before updating.");
      return;
    }
    if (item.serial_selection === "With") {
      openSerialModal(item, item.serial_numbers ? "update" : "create");
      return;
    }
    setActiveTab("docs");
    setSaving(true);
    try {
      const res = await saveInvoiceSerialNumbers({
        action: "serial_no_update",
        ser_qty: "",
        mon_ser_qty: "",
        seril_no_selc: "Without",
        spec_srl_no: item.spec_serial_count || 1,
        unique_id: item.unique_id,
        dc_number: detail.dc_number,
      });
      if (res.msg === "duplicate") {
        await showErrorAlert(res.error || "Already Exists in Database!.");
        return;
      }
      syncItemSerials(item.unique_id, { serial_selection: "Without", serial_numbers: "" });
      await showSuccessAlert("Serial number updated successfully.");
      await loadDetail();
    } catch (err: any) {
      await showErrorAlert(err?.response?.data?.message || "Failed to update serial numbers.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAll = async () => {
    if (viewMode) return;
    setActiveTab("docs");
    await persistInvoice({
      successMessage: isCreate ? "Invoice saved successfully." : "Invoice updated successfully.",
      navigateAfterSave: true,
    });
  };

  if (loading) {
    return <div className="p-6 text-sm text-ink-secondary">Loading invoice details...</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4e7_0%,#f3f6ee_32%,#eef2e8_100%)] p-6">
      <PageTopbar
        title="Invoice Form"
        breadcrumbs={["Stores", "DC & Invoice", viewMode ? "View" : isCreate ? "Create" : "Edit"]}
      />

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e4e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.12)]">
        <div className="border-b border-[#e6eadb] bg-[linear-gradient(135deg,#fbfcf7_0%,#f1f5e4_100%)] px-5 pt-5">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-[13px] font-semibold rounded-t ${
                  activeTab === tab.key
                    ? "bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] text-white shadow-[0_12px_24px_rgba(79,122,43,0.22)]"
                    : "bg-white/70 text-ink-secondary hover:text-brand-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,#f7f8f1_0%,#ffffff_20%)] p-6">
          {activeTab === "stock" ? (
            <StockTab detail={detail} items={items} onCancel={() => navigate(-1)} />
          ) : (
            <DocsTab
              detail={detail}
              items={items}
              docRows={docRows}
              dcFile={dcFile}
              irFile={irFile}
              invoiceFile={invoiceFile}
              serialModal={serialModal}
              saving={saving}
              setField={setField}
              setDcFile={setDcFile}
              setIrFile={setIrFile}
              setInvoiceFile={setInvoiceFile}
              ledgerOptions={ledgerOptions}
              selectedLedgerId={selectedLedgerId}
              onLedgerChange={handleLedgerChange}
              onSerialSelectionChange={handleSerialSelectionChange}
              onCloseSerialModal={closeSerialModal}
              onSerialGridChange={handleSerialGridChange}
              onSerialModeChange={handleSerialModeChange}
              onSerialSpecChange={handleSerialSpecChange}
              onSerialUpload={handleSerialUpload}
              onSerialSave={handleSerialSave}
              onAddNew={handleAddNew}
              onRowUpdate={handleRowUpdate}
              onDeleteDocRow={handleDeleteDocRow}
              onCancel={() => navigate(-1)}
              onSubmitAll={handleSubmitAll}
              viewMode={viewMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StockTab({
  detail,
  items,
  onCancel,
}: {
  detail: InvoiceDetail;
  items: InvoiceItemRow[];
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-8">
        <InfoBlock
          title="Customer Details"
          heading={detail.customer_name || "-"}
          lines={[detail.customer_location || "-", detail.contact_number || "-", detail.email || "-"]}
        />
        <InfoBlock
          title="Consignee Details"
          heading={detail.consignee_name || "-"}
          lines={[detail.branch || "-", detail.consignee_address || "-", detail.contact_number || "-", `Billing Address: ${detail.billing_address || "-"}`]}
        />
        <KeyValueBlock
          title="PO Details"
          rows={[
            ["Invoice ID", detail.invoice_auto_id || "-"],
            ["PO Number", detail.po_num || "-"],
            ["PO Date", detail.po_date || "-"],
            ["Executive Name", detail.executive_display || "-"],
            ["GST IN No", detail.billing_gst_no || "-"],
            ["No of Items in PO", String(detail.no_of_items || items.length || 0)],
          ]}
          attachmentUrl={detail.po_file_url}
          attachmentLabel="PO Attachment"
        />
      </div>

      <SimpleTable
        headers={["S.No", "Item Details", "Order QTY", "Bill QTY"]}
        rows={
          items.length
            ? items.map((item) => [
                item.s_no,
                <div key={item.unique_id}>
                  <div className="font-semibold text-ink">{item.name || "-"}</div>
                  <div className="text-[11px] text-ink-muted">{item.part_no || item.item_code || "-"}</div>
                </div>,
                item.order_qty,
                item.bill_qty,
              ])
            : []
        }
        emptyLabel="No item rows found."
      />

      <div className="grid lg:grid-cols-2 gap-8">
        <StatusSection title="Invoice Status" statusLabel={detail.invoice_doc_status_label} />
        <div />
        <ApprovalSection title="Operation Team" block={detail.operation_team} />
        <ApprovalSection title="Accounts Team" block={detail.accounts_team} />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DocsTab({
  detail,
  items,
  docRows,
  dcFile,
  irFile,
  invoiceFile,
  serialModal,
  saving,
  setField,
  setDcFile,
  setIrFile,
  setInvoiceFile,
  ledgerOptions,
  selectedLedgerId,
  onLedgerChange,
  onSerialSelectionChange,
  onCloseSerialModal,
  onSerialGridChange,
  onSerialModeChange,
  onSerialSpecChange,
  onSerialUpload,
  onSerialSave,
  onAddNew,
  onRowUpdate,
  onDeleteDocRow,
  onCancel,
  onSubmitAll,
  viewMode,
}: {
  detail: InvoiceDetail;
  items: InvoiceItemRow[];
  docRows: InvoiceDocRow[];
  dcFile: File | null;
  irFile: File | null;
  invoiceFile: File | null;
  ledgerOptions: LedgerOption[];
  selectedLedgerId: string;
  onLedgerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  serialModal: SerialModalState;
  saving: boolean;
  setField: (field: keyof InvoiceDetail) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  setDcFile: (file: File | null) => void;
  setIrFile: (file: File | null) => void;
  setInvoiceFile: (file: File | null) => void;
  onSerialSelectionChange: (item: InvoiceItemRow, value: string) => void;
  onCloseSerialModal: () => void;
  onSerialGridChange: (rowIndex: number, colIndex: number, value: string) => void;
  onSerialModeChange: (nextMode: SerialInputMode) => void;
  onSerialSpecChange: (nextSpec: number) => void;
  onSerialUpload: (file: File | null) => void;
  onSerialSave: () => void;
  onAddNew: () => void;
  onRowUpdate: (item: InvoiceItemRow) => void;
  onDeleteDocRow: (unique_id: string) => void;
  onCancel: () => void;
  onSubmitAll: () => void;
  viewMode: boolean;
  ledgerOptions: LedgerOption[];
  selectedLedgerId: string;
  onLedgerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-10">
        <InfoBlock
          title="Consignee Details"
          heading={detail.consignee_name || "-"}
          lines={[
            detail.branch || "-",
            detail.consignee_address || "-",
            detail.contact_number || "-",
            `Billing Address: ${detail.billing_address || "-"}`,
          ]}
        />

        <div>
          <div className="text-[12px] uppercase tracking-wide text-[#7a8c3a] font-semibold mb-4">PO Details</div>
          <div className="grid grid-cols-[160px_16px_1fr] gap-y-3 items-center text-[13px]">
            <span className="text-ink-secondary">Invoice ID</span><span>:</span><span>{detail.invoice_auto_id || "-"}</span>
            <span className="text-ink-secondary">DC Number</span><span>:</span><input name="dc_number" value={detail.dc_number} onChange={setField("dc_number")} className={inputCls} readOnly={viewMode} />
            <span className="text-ink-secondary">DC Date</span><span>:</span><input name="dc_date" type="date" value={detail.dc_date} onChange={setField("dc_date")} className={inputCls} disabled={viewMode} />
            <span className="text-ink-secondary">Invoice No</span><span>:</span><input name="invoice_no" value={detail.invoice_no} onChange={setField("invoice_no")} className={inputCls} readOnly={viewMode} />
            <span className="text-ink-secondary">Invoice Date</span><span>:</span><input name="invoice_date" type="date" value={detail.invoice_date} onChange={setField("invoice_date")} className={inputCls} disabled={viewMode} />
            <span className="text-ink-secondary">Ledger Name</span><span>:</span>
            <SearchableSelectInput name="selectedledgerid" value={selectedLedgerId} onChange={onLedgerChange} className={inputCls} disabled={viewMode}>
              <option value="">Select Ledger Name</option>
              {ledgerOptions.map(option => (
                <option key={option.unique_id} value={option.unique_id}>
                  {option.ledger_name}
                </option>
              ))}
            </SearchableSelectInput>
            <span className="text-ink-secondary">Ledger Number</span><span>:</span><input name="ledger_no" value={detail.ledger_no} readOnly className={inputCls} />
            <span className="text-ink-secondary">PO Attachment</span><span>:</span>
            <span><PdfAttachmentLink url={detail.po_file_url} /></span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[13px] font-semibold text-ink mb-3">Attachment - 3 DOCS</div>
        {!viewMode && docRows.length > 0 ? (
          <div className="mb-3 text-[12px] font-medium text-[#c25b2a]">
            Only one sublist row is allowed. Delete the existing row to add a new one.
          </div>
        ) : null}
        {!viewMode ? (
          <div className="grid lg:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
            <UploadField label="Dc" fileName={dcFile?.name || detail.dc_original_name} onChange={setDcFile} />
            <UploadField label="IR" fileName={irFile?.name || detail.ir_original_name} onChange={setIrFile} />
            <UploadField label="Invoice" fileName={invoiceFile?.name || detail.invoice_original_name} onChange={setInvoiceFile} />
            <button
              type="button"
              onClick={onAddNew}
              disabled={saving || docRows.length > 0}
              className="h-[40px] px-4 bg-brand-700 text-white rounded-lg hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Add New
            </button>
          </div>
        ) : null}
      </div>

      <SimpleTable
        headers={["S.No", "Consignee Name", "Ledger Name & No", "Dc No / Date", "Invoice No / Date", "DC Attachment", "IR Attachment", "Inv. Attachment", "Action"]}
        rows={
          docRows.length
            ? docRows.map((row) => [
                row.s_no,
                row.consignee_name || "-",
                row.ledger_display || "-",
                row.dc_display || "-",
                row.invoice_display || "-",
                <AttachmentLink key={`${row.unique_id}-dc`} url={row.dc_file_url} label={row.dc_original_name} />,
                <AttachmentLink key={`${row.unique_id}-ir`} url={row.ir_file_url} label={row.ir_original_name} />,
                <AttachmentLink key={`${row.unique_id}-inv`} url={row.invoice_file_url} label={row.invoice_original_name} />,
                 viewMode ? "-" : <button
                   type="button"
                   onClick={() => onDeleteDocRow(row.unique_id)}
                   className="inline-flex items-center justify-center rounded border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                   title="Delete document row"
                 >
                   <i className="fa fa-trash" aria-hidden="true" />
                 </button>,
              ])
            : []
        }
        emptyLabel="No data available in table"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-surface-2 text-[12px] font-semibold text-ink-secondary uppercase">
              <th className="px-3 py-2.5 border border-line-dark">S.No</th>
              <th className="px-3 py-2.5 border border-line-dark text-left">Item Details</th>
              <th className="px-3 py-2.5 border border-line-dark text-center">Stock QTY</th>
              <th className="px-3 py-2.5 border border-line-dark text-center">Invoice Bill QTY</th>
              <th className="px-3 py-2.5 border border-line-dark text-center">Remaining QTY</th>
              <th className="px-3 py-2.5 border border-line-dark text-left">Serial No</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center border border-line">
                  No item rows found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.unique_id} className="align-top">
                  <td className="px-3 py-4 border border-line text-center">{item.s_no}</td>
                  <td className="px-3 py-4 border border-line">
                    <div className="font-semibold text-ink">{item.name || "-"}</div>
                    <div className="text-[11px] text-ink-muted">{item.part_no || item.item_code || "-"}</div>
                  </td>
                  <td className="px-3 py-4 border border-line text-center">{item.stock_qty}</td>
                  <td className="px-3 py-4 border border-line text-center">{item.invoice_bill_qty}</td>
                  <td className="px-3 py-4 border border-line text-center">{item.remaining_qty}</td>
                  <td className="px-3 py-4 border border-line">
                    <div className="space-y-3">
                      <SearchableSelectInput name="serial_selection"
                        value={item.serial_selection}
                        onChange={(e) => onSerialSelectionChange(item, e.target.value)}
                        className={inputCls}
                        disabled={viewMode}
                      >
                        <option value="">Select Serial No</option>
                        <option value="With">With serial number</option>
                        <option value="Without">Without serial number</option>
                      </SearchableSelectInput>
                      <input name="select_serial_option"
                        value={
                          item.serial_selection === "With"
                            ? item.serial_numbers || "Click update to manage serial numbers"
                            : item.serial_selection === "Without"
                              ? "Without serial number"
                              : ""
                        }
                        readOnly
                        className={inputCls}
                        placeholder="Select serial option"
                      />
                      {!viewMode ? (
                        <button
                          type="button"
                          onClick={() => onRowUpdate(item)}
                          disabled={saving}
                          className="px-4 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-800 disabled:opacity-60"
                        >
                          Update
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
          {viewMode ? "Back" : "Cancel"}
        </button>
        {!viewMode ? (
          <button
            type="button"
            onClick={onSubmitAll}
            disabled={saving}
            className="px-5 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Submit All"}
          </button>
        ) : null}
      </div>

      <SerialNumberModal
        serialModal={serialModal}
        saving={saving}
        onClose={onCloseSerialModal}
        onGridChange={onSerialGridChange}
        onModeChange={onSerialModeChange}
        onSpecChange={onSerialSpecChange}
        onUpload={onSerialUpload}
        onSave={onSerialSave}
      />
    </div>
  );
}

function InfoBlock({ title, heading, lines }: { title: string; heading: string; lines: string[] }) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-wide text-[#7a8c3a] font-semibold mb-3">{title}</div>
      <div className="text-[18px] font-bold text-[#586b1f]">{heading}</div>
      <div className="mt-2 space-y-1 text-[13px] text-ink-secondary">
        {lines.filter(Boolean).map((line, idx) => (
          <div key={`${title}-${idx}`}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function KeyValueBlock({
  title,
  rows,
  attachmentUrl,
  attachmentLabel,
}: {
  title: string;
  rows: [string, string][];
  attachmentUrl?: string;
  attachmentLabel?: string;
}) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-wide text-[#7a8c3a] font-semibold mb-3">{title}</div>
        <div className="grid grid-cols-[140px_16px_1fr] gap-y-2 text-[13px]">
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <span className="text-ink-secondary">{label}</span>
            <span>:</span>
            <span className="text-ink">{value}</span>
          </Fragment>
        ))}
        {attachmentLabel ? <span className="text-ink-secondary">{attachmentLabel}</span> : null}
        {attachmentLabel ? <span>:</span> : null}
        {attachmentLabel ? <span><PdfAttachmentLink url={attachmentUrl} /></span> : null}
      </div>
    </div>
  );
}

function StatusSection({ title, statusLabel }: { title: string; statusLabel: string }) {
  return (
    <div>
      <div className="text-[24px] font-semibold text-ink mb-4">{title}</div>
      <div className="grid grid-cols-[180px_16px_1fr] text-[14px]">
        <span className="text-ink-secondary">Status</span>
        <span>:</span>
        <span>{statusLabel || "-"}</span>
      </div>
    </div>
  );
}

function ApprovalSection({ title, block }: { title: string; block: ApprovalBlock }) {
  const iconClass = block.status_icon === "approved" ? "fa-check-circle text-green-600" : "fa-times-circle text-red-500";
  return (
    <div>
      <div className="text-[24px] font-semibold text-ink mb-4">{title}</div>
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
        <LabelValue label="Status" value={<i className={`fa ${iconClass} text-[20px]`} />} />
        <LabelValue label={block.label_by} value={block.by || "-"} />
        <LabelValue label={block.label_date} value={block.date || "-"} />
        <LabelValue label="Reject Reason" value={block.reason || "-"} />
      </div>
    </div>
  );
}

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_16px_1fr] items-start">
      <span className="text-ink-secondary">{label}</span>
      <span>:</span>
      <span>{value}</span>
    </div>
  );
}

function UploadField({
  label,
  fileName,
  onChange,
}: {
  label: string;
  fileName: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-ink-secondary mb-1">{label}</div>
      <div className="border border-line-dark rounded-lg px-3 py-2 text-[13px] flex items-center justify-between gap-2 min-h-[42px]">
        <span className="truncate text-ink-secondary">{fileName || "No file chosen"}</span>
        <input name="invoicedcform_input_1092" type="file" accept="application/pdf" className="text-[12px] max-w-[150px]" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </div>
    </label>
  );
}

function AttachmentLink({ url, label }: { url: string; label: string }) {
  if (!url) return <span>-</span>;
  return (
    <a
      href={encodeURI(url)}
      target="_blank"
      rel="noreferrer"
      title={label || "View PDF"}
      className="inline-flex items-center justify-center rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
    >
      PDF
    </a>
  );
}

function SimpleTable({
  headers,
  rows,
  emptyLabel,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="bg-surface-2 text-[12px] font-semibold text-ink-secondary uppercase">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2.5 border border-line-dark text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center border border-line">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell, cellIdx) => (
                  <td key={`${idx}-${cellIdx}`} className="px-3 py-2.5 border border-line align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SerialNumberModal({
  serialModal,
  saving,
  onClose,
  onGridChange,
  onModeChange,
  onSpecChange,
  onUpload,
  onSave,
}: {
  serialModal: SerialModalState;
  saving: boolean;
  onClose: () => void;
  onGridChange: (rowIndex: number, colIndex: number, value: string) => void;
  onModeChange: (nextMode: SerialInputMode) => void;
  onSpecChange: (nextSpec: number) => void;
  onUpload: (file: File | null) => void;
  onSave: () => void;
}) {
  if (!serialModal.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="text-[20px] font-semibold text-ink">
            {serialModal.mode === "create" ? "Select Serial Number Option" : "Update Serial Numbers"}
          </h3>
          <button type="button" onClick={onClose} className="text-ink-secondary hover:text-ink">
            <i className="fa fa-times text-[18px]" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 overflow-y-auto max-h-[calc(85vh-128px)]">
          <div>
            <div className="text-[13px] text-ink-secondary mb-1">Invoice Qty:</div>
            <input name="invoiceqty" value={serialModal.invoiceQty} readOnly className={inputCls} />
          </div>

          <div>
            <div className="text-[13px] text-ink-secondary mb-1">Specify no of Serial Number Per Product:</div>
            {serialModal.mode === "create" ? (
              <SearchableSelectInput name="speccount"
                value={serialModal.specCount}
                onChange={(e) => onSpecChange(Number(e.target.value || 1))}
                className={inputCls}
              >
                {Array.from({ length: 10 }, (_, idx) => idx + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </SearchableSelectInput>
            ) : (
              <input name="speccount" value={serialModal.specCount} readOnly className={inputCls} />
            )}
          </div>

          {serialModal.mode === "create" ? (
            <div className="flex items-center gap-5 text-[14px]">
              <label className="flex items-center gap-2">
                <input name="enter"
                  type="radio"
                  checked={serialModal.inputMode === "enter"}
                  onChange={() => onModeChange("enter")}
                />
                Enter
              </label>
              <label className="flex items-center gap-2">
                <input name="upload"
                  type="radio"
                  checked={serialModal.inputMode === "upload"}
                  onChange={() => onModeChange("upload")}
                />
                Upload
              </label>
            </div>
          ) : null}

          {serialModal.mode === "create" && serialModal.inputMode === "upload" ? (
            <div className="space-y-3">
              <div>
                <div className="text-[13px] text-ink-secondary mb-1">Upload File:</div>
                <input name="invoicedcform_input_1241" type="file" accept=".xlsx,.xls" className={inputCls} onChange={(e) => void onUpload(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <tbody>
                  {serialModal.gridValues.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((value, colIndex) => (
                        <td key={`${rowIndex}-${colIndex}`} className="pr-2 pb-2">
                          <div className="mb-1 text-[12px] text-ink-secondary">
                            {rowIndex + 1}{serialModal.specCount > 1 ? `.${colIndex + 1}` : ""}
                          </div>
                          <input name="value"
                            value={value}
                            onChange={(e) => onGridChange(rowIndex, colIndex, e.target.value)}
                            className="w-full rounded-lg border border-line-dark px-3 py-2 text-[13px] outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <div className="text-[13px] text-ink-secondary mb-1">Collected Values:</div>
            <input name="collectedvalues" value={serialModal.collectedValues} readOnly className={inputCls} />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-line px-5 py-3 bg-white">
          <button type="button" onClick={onClose} className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            Close
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : serialModal.mode === "create" ? "Save" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 border border-line-dark rounded-lg text-[13px]";


