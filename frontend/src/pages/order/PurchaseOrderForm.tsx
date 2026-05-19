import {
  Children,
  Fragment,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import type { ChangeEvent, ReactElement, ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import { useAuth } from "../../context/AuthContext";
import {
  createPurchaseOrder,
  createPurchaseOrderConsignee,
  createPurchaseOrderAmcSublist,
  createPurchaseOrderProduct,
  deletePurchaseOrderAmcSublist,
  deletePurchaseOrderConsigneeBatch,
  deletePurchaseOrderConsignee,
  deletePurchaseOrderProduct,
  fetchPurchaseOrderAmcSublist,
  fetchPendingVerifyBatches,
  fetchPurchaseOrderAssign,
  fetchPurchaseOrderById,
  fetchPurchaseOrderConsigneeBatches,
  fetchPurchaseOrderConsignees,
  fetchPurchaseOrderOptions,
  fetchPurchaseOrderProducts,
  importPurchaseOrderAssign,
  importPurchaseOrderConsignees,
  savePurchaseOrderAssign,
  updatePurchaseOrder,
  updatePurchaseOrderConsignee,
  updatePurchaseOrderProduct,
  verifyPurchaseOrderBatches,
} from "../../api/purchaseOrderApi";
import { createDepartment } from "../../api/departmentApi";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import * as XLSX from "xlsx";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type TabKey = "po" | "product" | "consignee" | "assign" | "terms";
type Option = {
  unique_id: string;
  label: string;
  tender_code?: string;
  item_code?: string;
  product?: string;
  unit_price?: string;
  net_price?: string;
  tax?: string;
  warranty_duration?: string;
  acc_sector?: string;
  ledger_name?: string;
  ledger_no?: string;
  state_name?: string;
};
type PurchaseOrderResponse = Record<string, any>;
type ProductRow = Record<string, any>;
type ConsigneeRow = Record<string, any>;
type BatchRow = Record<string, any>;

type MainFormState = {
  department: string;
  bill_address: string;
  state_name: string;
  district: string;
  pin: string;
  contact_name: string;
  contact_number: string;
  landline_number: string;
  email: string;
  po_num: string;
  po_date: string;
  po_type: string;
  no_of_po: string;
  gst_option: string;
  gst_value: string;
  acc_sector: string;
  acc_vertical: string;
  executive_name: string;
};

type ProductFormState = {
  tender_code: string;
  item_code: string;
  product: string;
  qty: string;
  unit_price: string;
  net_price: string;
  tax: string;
  total_value: string;
  net_value: string;
  delivery_due_days: string;
  installation_due_days: string;
  ld_type: string;
  ld_per_day: string;
  ld_maximum_val: string;
  document_required: string;
  warranty: string;
  warranty_duration: string;
  warranty_starts: string;
  bg_required: string;
  bg_percen: string;
  bg_month: string;
};

type ConsigneeFormState = {
  consignee_received_date: string;
  billing_address: string;
  billing_gst_no: string;
  con_branch: string;
  con_branch_code: string;
  con_address: string;
  consignee_gst: string;
  cons_email_id: string;
  con_state_name: string;
  con_district: string;
  region: string;
  con_contact_name: string;
  con_contact_number: string;
  alter_contact_name: string;
  alter_number: string;
  con_lan_num: string;
  assign_team_member: string;
  cons_verify_sts: string;
  zone: string;
  zone_code: string;
  con_pincode: string;
};

type TermsState = {
  insurence_required: boolean;
  insurence_types: string[];
  other_insurance_type: string;
  ld_required: boolean;
  ld_date_type: string;
  ld_delivery_due_date: string;
  ld_installation_due_date: string;
  amc_required: boolean;
  start_date: string;
  end_date: string;
  amc_percentae: string;
  amcvalue: string;
  amc_tax: string;
  amc_unit_price: string;
  amc_remarks: string;
};

type AmcSubRow = Record<string, any>;

type AssignConsignee = {
  con_unique_id: string;
  con_name: string;
  con_contact_no: string;
  con_address: string;
  batch_id: string;
  po_num: string;
  po_date: string;
  products: Array<{
    product_unique_id: string;
    item_code: string;
    product: string;
    qty: number;
    assign_qty: number | string;
    unit_price: string;
    assign_unique_id?: string;
  }>;
};

type BatchDetailRow = {
  con_unique_id: string;
  con_address: string;
  order_qty: number;
  assign_qty: number;
};

type CustomerModalState = {
  acc_sector: string;
  customer: string;
  is_active: number;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "po", label: "PO Details" },
  { key: "product", label: "Product Details" },
  { key: "consignee", label: "Consignee Details" },
  { key: "assign", label: "Assign Qty Details" },
  { key: "terms", label: "Terms & Condition" },
];

// ── Shared style tokens ──────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-[13px] outline-none transition-all placeholder:text-[#8c93a8] focus:border-transparent focus:ring-0";
const selectCls =
  "w-full appearance-none rounded-xl border border-transparent bg-transparent px-3 py-2.5 pr-9 text-[13px] outline-none transition-all focus:border-transparent focus:ring-0";
const textareaCls =
  "w-full min-h-[86px] resize-y rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-[13px] outline-none transition-all focus:border-transparent focus:ring-0";
const readonlyCls =
  "w-full rounded-xl border border-[#e4e9d9] bg-[#f5f7ef] px-3 py-2.5 text-[13px] text-[#7b8566] cursor-not-allowed";
const tabCls =
  "flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all";
const labelCls = "pt-2 text-[13px] font-medium leading-snug text-[#566146]";
const PIN_REGEX = /^[0-9]{6}$/;
const CONTACT_NAME_REGEX = /^[A-Za-z ]+$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const LANDLINE_REGEX = /^[0-9]{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const OTHER_INSURANCE_VALUE = "__other__";

type FormFieldIdentity = {
  idBase: string;
  nameBase: string;
};

const FormFieldIdentityContext = createContext<FormFieldIdentity | null>(null);

function slugifyFormLabel(label: string) {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "field"
  );
}

// ── FieldShell — bordered wrapper (mirrors ref code pattern) ─────────────────
function FieldShell({
  children,
  valid = false,
  invalid = false,
  textarea = false,
  select = false,
}: {
  children: ReactNode;
  valid?: boolean;
  invalid?: boolean;
  textarea?: boolean;
  select?: boolean;
}) {
  const fieldIdentity = useContext(FormFieldIdentityContext);
  const borderClass = invalid
    ? "border-red-400"
    : valid
      ? "border-teal-400"
      : "border-line-dark";

  const iconClass = invalid
    ? "fa-circle-exclamation text-red-400"
    : valid
      ? "fa-check text-teal-400"
      : "";

  return (
    <div
      className={`relative rounded-2xl border bg-[#fcfdf9] shadow-sm ${borderClass} focus-within:ring-4 ${
        invalid
          ? "focus-within:ring-red-400/10 focus-within:border-red-400"
          : valid
            ? "focus-within:ring-teal-400/10 focus-within:border-teal-400"
            : "focus-within:ring-brand-500/10 focus-within:border-brand-500"
      }`}
    >
      {Children.map(children, (child, index) => {
        if (!isValidElement(child) || !fieldIdentity) return child;

        const suffix = index === 0 ? "" : `-${index + 1}`;
        const childId = `${fieldIdentity.idBase}${suffix}`;
        const childName = `${fieldIdentity.nameBase}${suffix ? `_${index + 1}` : ""}`;

        return cloneElement(child as ReactElement, {
          id: child.props.id ?? childId,
          name: child.props.name ?? childName,
        });
      })}
      {iconClass && (
        <span
          className={`pointer-events-none absolute right-3 ${
            textarea ? "top-3" : "top-1/2 -translate-y-1/2"
          } text-[14px]`}
        >
          <i className={`fa ${iconClass}`} />
        </span>
      )}
      {!iconClass && select && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
          <i className="fa fa-chevron-down" />
        </span>
      )}
    </div>
  );
}

// ── FormRow — label left (fixed 180px), input right ──────────────────────────
function FormRow({
  label,
  required = false,
  children,
  alignTop = false,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  alignTop?: boolean;
}) {
  const generatedId = useId().replace(/:/g, "");
  const slug = slugifyFormLabel(label);
  const idBase = `${slug}-${generatedId}`;
  const nameBase = slug.replace(/-/g, "_");

  return (
    <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <label htmlFor={idBase} className={`${labelCls} ${alignTop ? "pt-1.5" : ""}`}>
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <FormFieldIdentityContext.Provider value={{ idBase, nameBase }}>
        <div className="min-w-0">{children}</div>
      </FormFieldIdentityContext.Provider>
    </div>
  );
}

// ── Readonly display field ────────────────────────────────────────────────────
function ReadonlyField({ value }: { value: string }) {
  return <input name="value" value={value} className={readonlyCls} readOnly />;
}

// ─────────────────────────────────────────────────────────────────────────────

const MAIN_INIT: MainFormState = {
  department: "",
  bill_address: "",
  state_name: "",
  district: "",
  pin: "",
  contact_name: "",
  contact_number: "",
  landline_number: "",
  email: "",
  po_num: "",
  po_date: "",
  po_type: "Product",
  no_of_po: "",
  gst_option: "Yes",
  gst_value: "",
  acc_sector: "",
  acc_vertical: "",
  executive_name: "",
};

const PRODUCT_INIT: ProductFormState = {
  tender_code: "",
  item_code: "",
  product: "",
  qty: "",
  unit_price: "",
  net_price: "",
  tax: "",
  total_value: "",
  net_value: "",
  delivery_due_days: "",
  installation_due_days: "",
  ld_type: "",
  ld_per_day: "",
  ld_maximum_val: "",
  document_required: "",
  warranty: "No",
  warranty_duration: "",
  warranty_starts: "",
  bg_required: "No",
  bg_percen: "",
  bg_month: "",
};

const CONSIGNEE_INIT: ConsigneeFormState = {
  consignee_received_date: "",
  billing_address: "",
  billing_gst_no: "",
  con_branch: "",
  con_branch_code: "",
  con_address: "",
  consignee_gst: "",
  cons_email_id: "",
  con_state_name: "",
  con_district: "",
  region: "",
  con_contact_name: "",
  con_contact_number: "",
  alter_contact_name: "",
  alter_number: "",
  con_lan_num: "",
  assign_team_member: "",
  cons_verify_sts: "",
  zone: "",
  zone_code: "",
  con_pincode: "",
};

const TERMS_INIT: TermsState = {
  insurence_required: false,
  insurence_types: [],
  other_insurance_type: "",
  ld_required: false,
  ld_date_type: "po_date",
  ld_delivery_due_date: "",
  ld_installation_due_date: "",
  amc_required: false,
  start_date: "",
  end_date: "",
  amc_percentae: "",
  amcvalue: "",
  amc_tax: "",
  amc_unit_price: "",
  amc_remarks: "",
};

const CUSTOMER_MODAL_INIT: CustomerModalState = {
  acc_sector: "",
  customer: "",
  is_active: 1,
};

function uniqBy<T>(rows: T[], getKey: (row: T) => string) {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    const key = getKey(row);
    if (key && !map.has(key)) map.set(key, row);
  });
  return Array.from(map.values());
}

function isoDate(value?: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

function defaultConsigneeDate(value?: string | null) {
  return isoDate(value) || isoDate(new Date().toISOString());
}

function buildBatchDetailRows(rows: AssignConsignee[]) {
  return rows.map((row) => ({
    con_unique_id: row.con_unique_id,
    con_address: row.con_address || "-",
    order_qty: row.products.reduce((sum, product) => sum + Number(product.qty || 0), 0),
    assign_qty: row.products.reduce((sum, product) => sum + Number(product.assign_qty || 0), 0),
  }));
}

function toFlag(value: unknown) {
  return ["1", "true", "yes", "y", "on"].includes(String(value ?? "").trim().toLowerCase());
}

function toNumber(value: unknown) {
  const numeric = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function computeProductTotals(qty: string, unitPrice: string, tax: string) {
  const qtyNum = toNumber(qty);
  const unitNum = toNumber(unitPrice);
  const taxNum = toNumber(tax);
  const netValue = qtyNum * unitNum;
  const lineRate = unitNum + unitNum * (taxNum / 100);
  const totalValue = qtyNum * lineRate;
  return {
    net_price: lineRate ? lineRate.toFixed(2) : "",
    net_value: netValue ? netValue.toFixed(2) : "",
    total_value: totalValue ? totalValue.toFixed(2) : "",
  };
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDate(baseDate: string, days: number) {
  if (!baseDate) return "";
  const date = new Date(`${baseDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return formatInputDate(date);
}

function buildConsigneeTemplateCsv() {
  return [
    [
      "Billing Address",
      "Billing GST No",
      "Consignee Name/Branch",
      "Consignee Branch Code",
      "Consignee Address",
      "Consignee GST IN",
      "Consignee Email Id",
      "State",
      "District",
      "Region",
      "Contact Person Name",
      "Contact Number",
      "Alternate Person Name",
      "Alternate Contact Number",
      "Landline Number",
      "Zone",
      "Zone Code",
      "Pincode",
      "Assign Staff ID",
    ].join(","),
  ].join("\n");
}

function normalizeMainField<K extends keyof MainFormState>(field: K, value: MainFormState[K]) {
  if (typeof value !== "string") return value;

  if (field === "pin") return value.replace(/\D/g, "").slice(0, 6) as MainFormState[K];
  if (field === "contact_name") return value.replace(/[^A-Za-z ]/g, "") as MainFormState[K];
  if (field === "contact_number") return value.replace(/\D/g, "").slice(0, 10) as MainFormState[K];
  if (field === "landline_number") return value.replace(/\D/g, "").slice(0, 10) as MainFormState[K];
  if (field === "no_of_po") return value.replace(/\D/g, "") as MainFormState[K];
  if (field === "gst_value") return value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15) as MainFormState[K];
  if (field === "email") return value.trim() as MainFormState[K];

  return value;
}

function normalizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeLdType(value?: string | null) {
  const raw = String(value || "").trim();
  if (raw === "LD Per Day") return "day";
  if (raw === "LD Per Week") return "week";
  if (raw === "LD Per Month") return "month";
  return raw;
}

function normalizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("")}` : whole;
}

function normalizeConsigneeField<K extends keyof ConsigneeFormState>(field: K, value: ConsigneeFormState[K]) {
  if (typeof value !== "string") return value;

  if (["con_branch", "con_contact_name", "alter_contact_name", "region", "zone"].includes(field)) {
    return value.replace(/[^A-Za-z ]/g, "") as ConsigneeFormState[K];
  }
  if (["billing_address", "con_address"].includes(field)) {
    return value.replace(/[^A-Za-z0-9 \-]/g, "") as ConsigneeFormState[K];
  }
  if (["billing_gst_no", "consignee_gst"].includes(field)) {
    return value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15) as ConsigneeFormState[K];
  }
  if (["con_branch_code", "zone_code"].includes(field)) {
    return value.replace(/[^A-Za-z0-9]/g, "") as ConsigneeFormState[K];
  }
  if (field === "cons_email_id") {
    return value.trim() as ConsigneeFormState[K];
  }
  if (["con_contact_number", "alter_number", "con_lan_num"].includes(field)) {
    return value.replace(/\D/g, "").slice(0, 10) as ConsigneeFormState[K];
  }
  if (field === "con_pincode") {
    return value.replace(/\D/g, "").slice(0, 6) as ConsigneeFormState[K];
  }

  return value;
}

export default function PurchaseOrderForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("po");
  const [currentId, setCurrentId] = useState(id || "");
  const [loading, setLoading] = useState(false);
  const [savingMain, setSavingMain] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingConsignee, setSavingConsignee] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [error, setError] = useState("");

  const [mainForm, setMainForm] = useState<MainFormState>(MAIN_INIT);
  const [productForm, setProductForm] = useState<ProductFormState>(PRODUCT_INIT);
  const [consigneeForm, setConsigneeForm] = useState<ConsigneeFormState>({
    ...CONSIGNEE_INIT,
    consignee_received_date: isoDate(new Date().toISOString()),
  });
  const [termsForm, setTermsForm] = useState<TermsState>(TERMS_INIT);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [consignees, setConsignees] = useState<ConsigneeRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [pendingVerify, setPendingVerify] = useState<BatchRow[]>([]);
  const [amcRows, setAmcRows] = useState<AmcSubRow[]>([]);
  const [assignRows, setAssignRows] = useState<AssignConsignee[]>([]);

  const [editProductId, setEditProductId] = useState("");
  const [editConsigneeId, setEditConsigneeId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [consigneeMode, setConsigneeMode] = useState<"entry" | "import">("entry");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showAssignImportModal, setShowAssignImportModal] = useState(false);
  const [showBatchConsigneeModal, setShowBatchConsigneeModal] = useState(false);
  const [showBatchConsigneeForm, setShowBatchConsigneeForm] = useState(false);
  const [activeConsigneeBatchId, setActiveConsigneeBatchId] = useState("");
  const [expandedBatchIds, setExpandedBatchIds] = useState<string[]>([]);
  const [loadingBatchDetailIds, setLoadingBatchDetailIds] = useState<string[]>([]);
  const [batchDetailRows, setBatchDetailRows] = useState<Record<string, BatchDetailRow[]>>({});
  const [selectedVerifyBatchIds, setSelectedVerifyBatchIds] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [assignImportFile, setAssignImportFile] = useState<File | null>(null);
  const [assignImportBatchId, setAssignImportBatchId] = useState("");
  const [poCopyFile, setPoCopyFile] = useState<File | null>(null);
  const [existingPoCopyUrl, setExistingPoCopyUrl] = useState("");
  const [existingPoCopyName, setExistingPoCopyName] = useState("");
  const [amcFile, setAmcFile] = useState<File | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerModal, setCustomerModal] = useState<CustomerModalState>(CUSTOMER_MODAL_INIT);

  const [options, setOptions] = useState<{
    customers: Option[];
    account_verticals: Option[];
    account_sectors: Option[];
    executives: Option[];
    insurance_types: Option[];
    team_members: Option[];
    tenders: Option[];
    items: Option[];
    states: Option[];
    districts: Option[];
    po_types: Array<{ value: string; label: string }>;
    ld_types: Array<{ value: string; label: string }>;
    warranty_starts: Array<{ value: string; label: string }>;
    date_types: Array<{ value: string; label: string }>;
  }>({
    customers: [],
    account_verticals: [],
    account_sectors: [],
    executives: [],
    insurance_types: [],
    team_members: [],
    tenders: [],
    items: [],
    states: [],
    districts: [],
    po_types: [],
    ld_types: [],
    warranty_starts: [],
    date_types: [],
  });

  const customerOptions = useMemo(() => uniqBy(options.customers, (row) => row.unique_id), [options.customers]);
  const sectorOptions = useMemo(() => uniqBy(options.account_sectors, (row) => row.unique_id), [options.account_sectors]);
  const verticalOptions = useMemo(() => uniqBy(options.account_verticals, (row) => row.unique_id), [options.account_verticals]);
  const executiveOptions = useMemo(() => uniqBy(options.executives, (row) => row.unique_id), [options.executives]);
  const teamMemberOptions = useMemo(() => uniqBy(options.team_members, (row) => row.unique_id), [options.team_members]);
  const tenderOptions = useMemo(() => uniqBy(options.tenders, (row) => row.tender_code || row.unique_id), [options.tenders]);
  const itemOptions = useMemo(
    () => uniqBy(options.items, (row) => row.unique_id).filter((row) => !productForm.tender_code || row.tender_code === productForm.tender_code),
    [options.items, productForm.tender_code]
  );
  const stateOptions = useMemo(() => uniqBy(options.states, (row) => row.unique_id), [options.states]);
  const districtOptions = useMemo(
    () => uniqBy(options.districts, (row) => row.unique_id).filter((row) => !consigneeForm.con_state_name || row.state_name === consigneeForm.con_state_name),
    [options.districts, consigneeForm.con_state_name]
  );
  const mainDistrictOptions = useMemo(
    () => uniqBy(options.districts, (row) => row.unique_id).filter((row) => !mainForm.state_name || row.state_name === mainForm.state_name),
    [options.districts, mainForm.state_name]
  );
  const canDeleteBatch = true;
  const activeBatchRow = useMemo(
    () => batches.find((row) => row.batch_id === activeConsigneeBatchId) || null,
    [batches, activeConsigneeBatchId]
  );
  const activeBatchConsignees = useMemo(
    () => consignees.filter((row) => row.batch_id === activeConsigneeBatchId),
    [consignees, activeConsigneeBatchId]
  );
  const consigneeBaseDate = useMemo(
    () => isoDate(activeBatchRow?.consignee_received_date) || isoDate(batches[0]?.consignee_received_date) || isoDate(consigneeForm.consignee_received_date),
    [activeBatchRow?.consignee_received_date, batches, consigneeForm.consignee_received_date]
  );
  const deliveryDueDayValues = useMemo(
    () => products
      .map((row) => String(row.delivery_due_dates ?? row.delivery_due_days ?? "").trim())
      .filter(Boolean),
    [products]
  );
  const installationDueDayValues = useMemo(
    () => products
      .map((row) => String(row.insta_due_days ?? row.installation_due_days ?? "").trim())
      .filter(Boolean),
    [products]
  );
  const maxDeliveryDueDays = useMemo(
    () => deliveryDueDayValues.reduce((max, value) => Math.max(max, toNumber(value)), 0),
    [deliveryDueDayValues]
  );
  const maxInstallationDueDays = useMemo(
    () => installationDueDayValues.reduce((max, value) => Math.max(max, toNumber(value)), 0),
    [installationDueDayValues]
  );
  const insuranceTypeOptions = useMemo(() => {
    const rows = uniqBy(options.insurance_types, (row) => row.unique_id);
    const hasOther = rows.some((row) => ["other", "others"].includes(String(row.label || "").trim().toLowerCase()));
    return hasOther ? rows : [...rows, { unique_id: OTHER_INSURANCE_VALUE, label: "Other" }];
  }, [options.insurance_types]);
  const showOtherInsuranceField = useMemo(
    () => termsForm.insurence_types.includes(OTHER_INSURANCE_VALUE),
    [termsForm.insurence_types]
  );

  function getPersistedInsuranceTypes(values: string[]) {
    return values.filter((value) => value && value !== OTHER_INSURANCE_VALUE).join(",");
  }

  async function loadOptions() {
    try {
      const res = await fetchPurchaseOrderOptions();
      if (res.status) setOptions(res.data);
    } catch {
      setError("Failed to load purchase order options.");
    }
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    if (!id) return;
    setCurrentId(id);
    setLoading(true);
    fetchPurchaseOrderById(id)
      .then((res) => {
        if (!res.status) throw new Error();
        const data = res.data as PurchaseOrderResponse;
        setMainForm({
          department: data.department || "",
          bill_address: data.bill_address || "",
          state_name: data.state_name || "",
          district: data.district || "",
          pin: data.pin || "",
          contact_name: data.contact_name || "",
          contact_number: data.contact_number || "",
          landline_number: data.landline_number || "",
          email: data.email || "",
          po_num: data.po_num || "",
          po_date: isoDate(data.po_date),
          po_type: data.po_type || "Product",
          no_of_po: String(data.no_of_po || ""),
          gst_option: data.gst_option || "Yes",
          gst_value: data.gst_value || "",
          acc_sector: data.acc_sector || "",
          acc_vertical: data.acc_vertical || "",
          executive_name: data.executive_name || "",
        });
        setTermsForm({
          insurence_required: toFlag(data.insurence_required),
          insurence_types: [
            ...String(data.insurence_types || "")
              .split(",")
              .map((value: string) => value.trim())
              .filter(Boolean),
            ...(data.other_insurance_type ? [OTHER_INSURANCE_VALUE] : []),
          ],
          other_insurance_type: data.other_insurance_type || "",
          ld_required: toFlag(data.ld_required),
          ld_date_type: data.ld_date_type === "from_po_date" ? "po_date" : (data.ld_date_type || "po_date"),
          ld_delivery_due_date: data.ld_delivery_due_date || "",
          ld_installation_due_date: data.ld_installation_due_date || "",
          amc_required: toFlag(data.amc_required),
          start_date: isoDate(data.start_date),
          end_date: isoDate(data.end_date),
          amc_percentae: data.amc_percentae || "",
          amcvalue: data.amcvalue || "",
          amc_tax: data.amc_tax || "",
          amc_unit_price: data.amc_unit_price || "",
          amc_remarks: data.amc_remarks || "",
        });
        setExistingPoCopyUrl(data.file_url || "");
        setExistingPoCopyName(data.file_org_name || data.file_name || "");
        setPoCopyFile(null);
        setProducts(Array.isArray(data.products) ? data.products : []);
        setConsignees(Array.isArray(data.consignees) ? data.consignees : []);
        if (id) {
          fetchPurchaseOrderAmcSublist(id)
            .then((res) => setAmcRows(Array.isArray(res.data) ? res.data : []))
            .catch(() => setAmcRows([]));
        }
      })
      .catch(() => setError("Failed to load purchase order record."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!currentId) return;
    const loadChildren = async () => {
      try {
        const [productRes, consigneeRes, batchRes, amcRes] = await Promise.all([
          fetchPurchaseOrderProducts(currentId),
          fetchPurchaseOrderConsignees(currentId),
          fetchPurchaseOrderConsigneeBatches(currentId),
          fetchPurchaseOrderAmcSublist(currentId),
        ]);
        if (productRes.status) setProducts(productRes.data || []);
        if (consigneeRes.status) setConsignees(consigneeRes.data || []);
        if (batchRes.status) setBatches(batchRes.data || []);
        if (amcRes.status) setAmcRows(amcRes.data || []);
      } catch {
        setError("Failed to load linked PO data.");
      }
    };
    void loadChildren();
  }, [currentId]);

  useEffect(() => {
    if (!mainForm.department) return;
    const customer = customerOptions.find((row) => row.unique_id === mainForm.department);
    if (customer?.acc_sector && !mainForm.acc_sector) {
      setMainForm((prev) => ({ ...prev, acc_sector: customer.acc_sector || prev.acc_sector }));
    }
  }, [customerOptions, mainForm.acc_sector, mainForm.department]);

  useEffect(() => {
    if (!termsForm.ld_required) return;
    const baseDate = termsForm.ld_date_type === "po_date" ? mainForm.po_date : consigneeBaseDate;
    const nextDeliveryDueDate = deliveryDueDayValues.length ? addDaysToDate(baseDate, maxDeliveryDueDays) : "";
    const nextInstallationDueDate = installationDueDayValues.length ? addDaysToDate(baseDate, maxInstallationDueDays) : "";
    setTermsForm((prev) => {
      if (prev.ld_delivery_due_date === nextDeliveryDueDate && prev.ld_installation_due_date === nextInstallationDueDate) {
        return prev;
      }
      return {
        ...prev,
        ld_delivery_due_date: nextDeliveryDueDate,
        ld_installation_due_date: nextInstallationDueDate,
      };
    });
  }, [
    termsForm.ld_required,
    termsForm.ld_date_type,
    mainForm.po_date,
    consigneeBaseDate,
    deliveryDueDayValues,
    installationDueDayValues,
    maxDeliveryDueDays,
    maxInstallationDueDays,
  ]);

  function setMainField<K extends keyof MainFormState>(field: K, value: MainFormState[K]) {
    setMainForm((prev) => ({ ...prev, [field]: normalizeMainField(field, value) }));
  }

  function setProductField<K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) {
    setProductForm((prev) => {
      let normalized = value;

      if (typeof value === "string") {
        if (["delivery_due_days", "installation_due_days", "warranty_duration", "bg_month"].includes(field)) {
          normalized = normalizeIntegerInput(value) as ProductFormState[K];
        }
        if (["ld_per_day", "ld_maximum_val", "bg_percen", "tax"].includes(field)) {
          normalized = normalizeDecimalInput(value) as ProductFormState[K];
        }
      }

      const next = { ...prev, [field]: normalized };
      if (field === "bg_required" && normalized === "No") {
        next.bg_percen = "";
        next.bg_month = "";
      }
      if (field === "warranty" && normalized === "No") {
        next.warranty_duration = "";
        next.warranty_starts = "";
      }
      if (["qty", "unit_price", "tax"].includes(field)) return { ...next, ...computeProductTotals(next.qty, next.unit_price, next.tax) };
      return next;
    });
  }

  function setConsigneeField<K extends keyof ConsigneeFormState>(field: K, value: ConsigneeFormState[K]) {
    setConsigneeForm((prev) => ({ ...prev, [field]: normalizeConsigneeField(field, value) }));
  }

  function setTermsField<K extends keyof TermsState>(field: K, value: TermsState[K]) {
    setTermsForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "insurence_required" && !value) {
        next.insurence_types = [];
        next.other_insurance_type = "";
      }
      if (field === "insurence_types") {
        const values = Array.isArray(value) ? value : [];
        const hasOther = values.includes(OTHER_INSURANCE_VALUE);
        if (!hasOther) next.other_insurance_type = "";
      }
      if (field === "ld_required" && !value) {
        next.ld_date_type = "po_date";
        next.ld_delivery_due_date = "";
        next.ld_installation_due_date = "";
      }
      if (field === "amc_required" && !value) {
        next.start_date = "";
        next.end_date = "";
        next.amc_percentae = "";
        next.amcvalue = "";
        next.amc_tax = "";
        next.amc_unit_price = "";
        next.amc_remarks = "";
      }
      const nextAmcValue = field === "amcvalue" ? String(value || "") : String(next.amcvalue || "");
      const nextAmcTax = field === "amc_tax" ? String(value || "") : String(next.amc_tax || "");
      const amcValueNum = Number(nextAmcValue || 0);
      const amcTaxNum = Number(nextAmcTax || 0);
      next.amc_unit_price = nextAmcValue || nextAmcTax
        ? ((amcValueNum || 0) + ((amcValueNum || 0) * (amcTaxNum || 0)) / 100).toFixed(2)
        : "";
      return next;
    });
  }

  function setCustomerModalField<K extends keyof CustomerModalState>(field: K, value: CustomerModalState[K]) {
    setCustomerModal((prev) => ({ ...prev, [field]: value }));
  }

  function closeCustomerModal() {
    setShowCustomerModal(false);
    setCustomerModal(CUSTOMER_MODAL_INIT);
  }

  function resetProductForm() {
    setProductForm(PRODUCT_INIT);
    setEditProductId("");
  }

  function resetConsigneeForm() {
    setConsigneeForm({ ...CONSIGNEE_INIT, consignee_received_date: defaultConsigneeDate(activeBatchRow?.consignee_received_date) });
    setEditConsigneeId("");
  }

  function validateMainForm() {
    if (!mainForm.department) return "Please select customer.";
    if (!mainForm.bill_address.trim()) return "Please enter billing address.";
    if (!mainForm.state_name) return "Please select state.";
    if (!mainForm.district) return "Please select district.";
    if (!mainForm.pin.trim()) return "Please enter pincode.";
    if (!PIN_REGEX.test(mainForm.pin.trim())) return "Pin Code must be exactly 6 digits.";
    if (mainForm.contact_name.trim() && !CONTACT_NAME_REGEX.test(mainForm.contact_name.trim())) return "Contact Name allows alphabets and spaces only.";
    if (mainForm.contact_number.trim() && !MOBILE_REGEX.test(mainForm.contact_number.trim())) return "Contact Number must be 10 digits and start with 6, 7, 8, or 9.";
    if (mainForm.landline_number.trim() && !LANDLINE_REGEX.test(mainForm.landline_number.trim())) return "Landline Number must be exactly 10 digits.";
    if (mainForm.email.trim() && !EMAIL_REGEX.test(mainForm.email.trim())) return "Please enter a valid email address.";
    if (!mainForm.po_num.trim()) return "Please enter PO number.";
    if (!mainForm.no_of_po.trim()) return "Please enter No of Items in PO.";
    if (!/^\d+$/.test(mainForm.no_of_po.trim())) return "No of Items in PO must be a number.";
    if (mainForm.gst_option === "Yes" && mainForm.gst_value.trim() && !GST_REGEX.test(mainForm.gst_value.trim().toUpperCase())) return "Please enter a valid Indian GST number.";
    if (!mainForm.po_date) return "Please select PO date.";
    if (!mainForm.executive_name) return "Please select executive.";
    return "";
  }

  function validateProductForm() {
    if (!currentId) return "Please save PO details first.";
    if (!productForm.tender_code) return "Please select tender code.";
    if (!productForm.item_code) return "Please select item code.";
    if (!productForm.product.trim()) return "Please enter product.";
    if (!productForm.qty.trim()) return "Please enter quantity.";
    if (toNumber(productForm.qty) <= 0) return "Quantity must be greater than zero.";
    return "";
  }

  function validateTermsForm() {
    if (termsForm.insurence_required && showOtherInsuranceField && !termsForm.other_insurance_type.trim()) {
      return "Please enter Other Insurance.";
    }
    if (termsForm.amc_required && amcRows.length === 0) {
      return "Please add at least one AMC sublist row.";
    }
    return "";
  }

  function getExpectedProductCount() {
    return Number(mainForm.no_of_po.trim() || 0);
  }

  function validateProductCountForNextTab() {
    const expectedCount = getExpectedProductCount();
    if (expectedCount <= 0) return "Please enter a valid No of Items in PO.";
    if (products.length !== expectedCount) {
      const expectedLabel = expectedCount === 1 ? "product row" : "product rows";
      const actualLabel = products.length === 1 ? "product row" : "product rows";
      return `Please add ${expectedCount} ${expectedLabel} in Product Details before continuing. Currently ${products.length} ${actualLabel} added.`;
    }
    return "";
  }

  function validateConsigneeForm() {
    if (!currentId) return "Please save PO details first.";
    if (!consigneeForm.consignee_received_date) return "Please select consignee received date.";
    if (!consigneeForm.con_branch.trim()) return "Please enter consignee branch name.";
    if (!CONTACT_NAME_REGEX.test(consigneeForm.con_branch.trim())) return "Branch Name allows alphabets and spaces only.";
    if (consigneeForm.billing_address.trim() && !/^[A-Za-z0-9 \-]+$/.test(consigneeForm.billing_address.trim())) return "Billing Address allows alphabets, numbers, spaces, and hyphen only.";
    if (consigneeForm.billing_gst_no.trim() && !GST_REGEX.test(consigneeForm.billing_gst_no.trim().toUpperCase())) return "Please enter a valid Billing GST No.";
    if (!consigneeForm.con_address.trim()) return "Please enter consignee address.";
    if (!/^[A-Za-z0-9 \-]+$/.test(consigneeForm.con_address.trim())) return "Consignee Address allows alphabets, numbers, spaces, and hyphen only.";
    if (consigneeForm.consignee_gst.trim() && !GST_REGEX.test(consigneeForm.consignee_gst.trim().toUpperCase())) return "Please enter a valid Consignee GST IN.";
    if (consigneeForm.con_branch_code.trim() && !/^[A-Za-z0-9]+$/.test(consigneeForm.con_branch_code.trim())) return "Branch Code allows alphabets and numbers only.";
    if (consigneeForm.cons_email_id.trim() && !EMAIL_REGEX.test(consigneeForm.cons_email_id.trim())) return "Please enter a valid Consignee Email.";
    if (!consigneeForm.con_state_name) return "Please select consignee state.";
    if (!consigneeForm.con_district) return "Please select consignee district.";
    if (consigneeForm.region.trim() && !CONTACT_NAME_REGEX.test(consigneeForm.region.trim())) return "Region allows alphabets and spaces only.";
    if (consigneeForm.con_contact_name.trim() && !CONTACT_NAME_REGEX.test(consigneeForm.con_contact_name.trim())) return "Contact Person allows alphabets and spaces only.";
    if (consigneeForm.con_contact_number.trim() && !MOBILE_REGEX.test(consigneeForm.con_contact_number.trim())) return "Contact Number must be 10 digits and start with 6, 7, 8, or 9.";
    if (consigneeForm.alter_contact_name.trim() && !CONTACT_NAME_REGEX.test(consigneeForm.alter_contact_name.trim())) return "Alternate Person allows alphabets and spaces only.";
    if (consigneeForm.alter_number.trim() && !MOBILE_REGEX.test(consigneeForm.alter_number.trim())) return "Alternate Number must be 10 digits and start with 6, 7, 8, or 9.";
    if (consigneeForm.con_lan_num.trim() && !LANDLINE_REGEX.test(consigneeForm.con_lan_num.trim())) return "Landline Number must be exactly 10 digits.";
    if (consigneeForm.zone.trim() && !CONTACT_NAME_REGEX.test(consigneeForm.zone.trim())) return "Zone allows alphabets and spaces only.";
    if (consigneeForm.zone_code.trim() && !/^[A-Za-z0-9]+$/.test(consigneeForm.zone_code.trim())) return "Zone Code allows alphabets and numbers only.";
    if (!consigneeForm.con_pincode.trim()) return "Please enter pincode.";
    if (!PIN_REGEX.test(consigneeForm.con_pincode.trim())) return "Pincode must be exactly 6 digits.";
    return "";
  }

  async function persistMain(showToast = true) {
    const validation = validateMainForm();
    if (validation) {
      setError(validation);
      if (showToast) await showErrorAlert(validation);
      return "";
    }
    setSavingMain(true);
    try {
      const payload = {
        ...mainForm,
        ld_required: termsForm.ld_required,
        ld_date_type: termsForm.ld_date_type,
        ld_delivery_due_date: termsForm.ld_delivery_due_date,
        ld_installation_due_date: termsForm.ld_installation_due_date,
        insurence_required: termsForm.insurence_required,
        insurence_types: getPersistedInsuranceTypes(termsForm.insurence_types),
        other_insurance_type: termsForm.other_insurance_type.trim(),
        amc_required: termsForm.amc_required,
        start_date: termsForm.start_date || "",
        end_date: termsForm.end_date || "",
        amc_percentae: termsForm.amc_percentae,
        amcvalue: termsForm.amcvalue,
        no_of_po: mainForm.no_of_po.trim(),
      };
      const res = currentId ? await updatePurchaseOrder(currentId, payload) : await createPurchaseOrder(payload);
      if (!res.status) throw new Error();
      const nextId = res.data?.unique_id || currentId;
      if (nextId && nextId !== currentId) {
        setCurrentId(nextId);
        navigate(`/order/purchase-order/form/${nextId}`, { replace: true });
      }
      if (showToast) {
        await showSuccessAlert(currentId ? "Purchase order updated successfully." : "Purchase order saved successfully.");
      }
      return nextId || "";
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to save purchase order.";
      setError(message);
      if (showToast) await showErrorAlert(message);
      return "";
    } finally {
      setSavingMain(false);
    }
  }

  async function handlePoDetailsNext() {
    const savedId = await persistMain(true);
    if (savedId) setActiveTab("product");
  }

  async function handleSaveCustomerModal() {
    if (!customerModal.acc_sector) {
      await showErrorAlert("Please select account sector.");
      return;
    }
    if (!customerModal.customer.trim()) {
      await showErrorAlert("Please enter customer name.");
      return;
    }

    setSavingCustomer(true);
    try {
      const sessionToken = localStorage.getItem("otm_token") || "";
      const res = await createDepartment({
        acc_sector: customerModal.acc_sector,
        department: customerModal.customer.trim(),
        description: "",
        ledger_name: "",
        ledger_no: "",
        is_active: customerModal.is_active,
        session_id: sessionToken,
        sess_user_type: user?.user_type_unique_id || "",
        sess_user_id: user?.unique_id || "",
        sess_company_id: "",
        sess_branch_id: "",
      });

      if (!res?.status) {
        const message =
          typeof res?.error === "string"
            ? res.error
            : Object.values(res?.error ?? {}).flat().join(" ") || "Failed to save customer.";
        await showErrorAlert(message);
        return;
      }

      await loadOptions();
      const newCustomerId = res.data?.unique_id || "";
      if (newCustomerId) {
        setMainField("department", newCustomerId);
      }
      await showSuccessAlert("Customer created successfully.");
      closeCustomerModal();
    } catch {
      await showErrorAlert("Failed to save customer.");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function refreshProducts() {
    if (!currentId) return;
    const res = await fetchPurchaseOrderProducts(currentId);
    if (res.status) setProducts(res.data || []);
  }

  async function refreshConsigneesAndBatches() {
    if (!currentId) return;
    const [consigneeRes, batchRes] = await Promise.all([
      fetchPurchaseOrderConsignees(currentId),
      fetchPurchaseOrderConsigneeBatches(currentId),
    ]);
    if (consigneeRes.status) setConsignees(consigneeRes.data || []);
    if (batchRes.status) setBatches(batchRes.data || []);
  }

  async function handleSaveProduct() {
    const validation = validateProductForm();
    if (validation) { await showErrorAlert(validation); return; }
    const expectedCount = getExpectedProductCount();
    if (!editProductId && expectedCount > 0 && products.length >= expectedCount) {
      await showErrorAlert(`You can add only ${expectedCount} product row${expectedCount === 1 ? "" : "s"} because No of Items in PO is ${expectedCount}.`);
      return;
    }
    setSavingProduct(true);
    try {
      const payload = { ...productForm, no_of_items: String(products.length + (editProductId ? 0 : 1)) };
      const res = editProductId
        ? await updatePurchaseOrderProduct(editProductId, payload)
        : await createPurchaseOrderProduct(currentId, payload);
      if (!res.status) throw new Error();
      await showSuccessAlert(editProductId ? "Product details updated successfully." : "Product details added successfully.");
      resetProductForm();
      await refreshProducts();
    } catch {
      await showErrorAlert("Failed to save product details.");
    } finally {
      setSavingProduct(false);
    }
  }

  function handleEditProduct(row: ProductRow) {
    setEditProductId(row.unique_id || "");
    setProductForm({
      tender_code: row.tender_code || "",
      item_code: row.item_code_display || row.item_code || "",
      product: row.product || "",
      qty: String(row.qty || ""),
      unit_price: String(row.unit_price || ""),
      net_price: String(row.net_price || ""),
      tax: String(row.tax || ""),
      total_value: String(row.total_value || ""),
      net_value: String(row.net_value || ""),
      delivery_due_days: String(row.delivery_due_dates || ""),
      installation_due_days: String(row.insta_due_days || ""),
      ld_type: normalizeLdType(row.ld_type),
      ld_per_day: String(row.ld_per_day || ""),
      ld_maximum_val: String(row.ld_maximum_val || ""),
      document_required: row.document_required || "",
      warranty: row.warranty || "No",
      warranty_duration: String(row.warranty_duration || ""),
      warranty_starts: row.warranty_starts || "",
      bg_required: row.bg_required || "No",
      bg_percen: String(row.bg_percen || ""),
      bg_month: String(row.bg_month || ""),
    });
    setActiveTab("product");
  }

  async function handleDeleteProduct(uniqueId: string) {
    const confirmed = await showConfirmAlert("Delete this product row?");
    if (!confirmed) return;
    try {
      const res = await deletePurchaseOrderProduct(uniqueId);
      if (!res.status) throw new Error();
      await showSuccessAlert("Product details deleted successfully.");
      if (editProductId === uniqueId) resetProductForm();
      await refreshProducts();
    } catch {
      await showErrorAlert("Failed to delete product row.");
    }
  }

  async function handleSaveConsignee() {
    const validation = validateConsigneeForm();
    if (validation) { await showErrorAlert(validation); return; }
    setSavingConsignee(true);
    try {
      const payload = {
        ...consigneeForm,
        ...(activeConsigneeBatchId ? { batch_id: activeConsigneeBatchId } : {}),
        ...(activeBatchRow?.batch_insert_date ? { batch_entry_date: isoDate(activeBatchRow.batch_insert_date) } : {}),
      };
      const res = editConsigneeId
        ? await updatePurchaseOrderConsignee(editConsigneeId, payload)
        : await createPurchaseOrderConsignee(currentId, payload);
      if (!res.status) throw new Error();
      await showSuccessAlert(editConsigneeId ? "Consignee updated successfully." : "Consignee added successfully.");
      if (showBatchConsigneeModal) setShowBatchConsigneeForm(false);
      resetConsigneeForm();
      await refreshConsigneesAndBatches();
    } catch {
      await showErrorAlert("Failed to save consignee details.");
    } finally {
      setSavingConsignee(false);
    }
  }

  function handleEditConsignee(row: ConsigneeRow) {
    setEditConsigneeId(row.unique_id || "");
    setConsigneeForm({
      consignee_received_date: isoDate(row.consignee_received_date),
      billing_address: row.billing_address || "",
      billing_gst_no: row.billing_gst_no || "",
      con_branch: row.con_branch || "",
      con_branch_code: row.con_branch_code || "",
      con_address: row.con_address || "",
      consignee_gst: row.consignee_gst || "",
      cons_email_id: row.cons_email_id || "",
      con_state_name: row.con_state_name || "",
      con_district: row.con_district || "",
      region: row.region || "",
      con_contact_name: row.con_contact_name || "",
      con_contact_number: row.con_contact_number || "",
      alter_contact_name: row.alter_contact_name || "",
      alter_number: row.alter_number || "",
      con_lan_num: row.con_lan_num || "",
      assign_team_member: row.assign_team_member || "",
      cons_verify_sts: String(row.cons_verify_sts ?? ""),
      zone: row.zone || "",
      zone_code: row.zone_code || "",
      con_pincode: row.con_pincode || "",
    });
    setConsigneeMode("entry");
  }

  function openBatchConsigneeModal(batchId: string) {
    if (!currentId || !batchId) return;
    navigate(`/order/purchase-order/consignee-details/${currentId}/${batchId}`);
  }

  function closeBatchConsigneeModal() {
    setShowBatchConsigneeModal(false);
    setShowBatchConsigneeForm(false);
    setActiveConsigneeBatchId("");
    setEditConsigneeId("");
    setConsigneeForm({
      ...CONSIGNEE_INIT,
      consignee_received_date: defaultConsigneeDate(),
    });
  }

  function openBatchConsigneeCreate() {
    resetConsigneeForm();
    setShowBatchConsigneeForm(true);
  }

  function openBatchConsigneeEdit(row: ConsigneeRow) {
    handleEditConsignee(row);
    setShowBatchConsigneeForm(true);
  }

  async function handleToggleBatchDetails(batchId: string) {
    if (expandedBatchIds.includes(batchId)) {
      setExpandedBatchIds((prev) => prev.filter((id) => id !== batchId));
      return;
    }

    setExpandedBatchIds((prev) => [...prev, batchId]);
    if (batchDetailRows[batchId] || !currentId) return;

    setLoadingBatchDetailIds((prev) => [...prev, batchId]);
    try {
      const res = await fetchPurchaseOrderAssign(currentId, batchId);
      if (!res.status) throw new Error();
      setBatchDetailRows((prev) => ({
        ...prev,
        [batchId]: buildBatchDetailRows(res.data || []),
      }));
    } catch {
      setExpandedBatchIds((prev) => prev.filter((id) => id !== batchId));
      await showErrorAlert("Failed to load batch consignee details.");
    } finally {
      setLoadingBatchDetailIds((prev) => prev.filter((id) => id !== batchId));
    }
  }

  async function handleBatchExport(batchId: string) {
    if (!currentId || !batchId) return;
    try {
      const res = await fetchPurchaseOrderAssign(currentId, batchId);
      if (!res.status) throw new Error();
      const rows = (res.data || []).flatMap((consignee: AssignConsignee) =>
        consignee.products.map((product) => ({
          "Consignee Name": consignee.con_name || "",
          "Contact No": consignee.con_contact_no || "",
          "Consignee Address": consignee.con_address || "",
          "Batch Id": consignee.batch_id || batchId,
          "PO Number": consignee.po_num || "",
          "Item Code": product.item_code || "",
          Product: product.product || "",
          Qty: Number(product.qty || 0),
          "Con Unique Id": consignee.con_unique_id || "",
          "Product Unique Id": product.product_unique_id || "",
          "Unit Price": product.unit_price || "",
          "Assign Qty": Number(product.assign_qty || 0),
        }))
      );
      if (rows.length === 0) {
        await showErrorAlert("No batch rows available to export.");
        return;
      }
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, "Consignee Assign");
      XLSX.writeFile(workbook, `consignee_product_details_${batchId}.xlsx`);
    } catch {
      await showErrorAlert("Failed to export batch details.");
    }
  }

  async function handleBatchImport(batchId: string) {
    setAssignImportBatchId(batchId);
    setAssignImportFile(null);
    setShowAssignImportModal(true);
  }

  function closeAssignImportModal() {
    setShowAssignImportModal(false);
    setAssignImportFile(null);
    setAssignImportBatchId("");
  }

  async function handleSubmitAssignImport() {
    if (!currentId) { await showErrorAlert("Please save PO details first."); return; }
    if (!assignImportBatchId) { await showErrorAlert("Batch id is missing."); return; }
    if (!assignImportFile) { await showErrorAlert("Please choose an Excel file to import."); return; }

    setSavingAssign(true);
    try {
      const formData = new FormData();
      formData.append("file", assignImportFile);
      formData.append("batch_id", assignImportBatchId);
      const res = await importPurchaseOrderAssign(currentId, formData);
      if (!res.status) throw new Error(res.message || "Import failed.");
      await showSuccessAlert(`Import successful. Created ${res.created_count || 0} and updated ${res.updated_count || 0} rows.`);
      closeAssignImportModal();
      await refreshConsigneesAndBatches();
      setSelectedBatchId(assignImportBatchId);
      setActiveTab("assign");
      await handleLoadAssign(assignImportBatchId);
    } catch (error: any) {
      await showErrorAlert(error?.response?.data?.message || error?.message || "Failed to import consignee product details.");
    } finally {
      setSavingAssign(false);
    }
  }

  async function handleDeleteBatch(batchId: string) {
    if (!currentId || !batchId) return;
    const confirmed = await showConfirmAlert("Delete this batch?");
    if (!confirmed) return;
    try {
      const res = await deletePurchaseOrderConsigneeBatch(currentId, batchId);
      if (!res.status) throw new Error(res.message || "Failed");
      await showSuccessAlert("Batch deleted successfully.");
      if (activeConsigneeBatchId === batchId) closeBatchConsigneeModal();
      await refreshConsigneesAndBatches();
    } catch (error: any) {
      await showErrorAlert(error?.message || "Failed to delete batch.");
    }
  }

  async function handleDeleteConsignee(uniqueId: string) {
    const confirmed = await showConfirmAlert("Delete this consignee row?");
    if (!confirmed) return;
    try {
      const res = await deletePurchaseOrderConsignee(uniqueId);
      if (!res.status) throw new Error();
      await showSuccessAlert("Consignee deleted successfully.");
      if (editConsigneeId === uniqueId) resetConsigneeForm();
      await refreshConsigneesAndBatches();
    } catch {
      await showErrorAlert("Failed to delete consignee row.");
    }
  }

  async function handleImportConsignees() {
    if (!currentId) { await showErrorAlert("Please save PO details first."); return; }
    if (!importFile) { await showErrorAlert("Please choose a CSV or Excel file."); return; }
    setSavingConsignee(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("consignee_received_date", consigneeForm.consignee_received_date || isoDate(new Date().toISOString()));
      const res = await importPurchaseOrderConsignees(currentId, formData);
      if (!res.status) throw new Error();
      await showSuccessAlert(`Imported ${res.created_count || 0} consignee rows successfully.`);
      setImportFile(null);
      await refreshConsigneesAndBatches();
    } catch (error: any) {
      await showErrorAlert(error?.message || "Failed to import consignee details.");
    } finally {
      setSavingConsignee(false);
    }
  }

  async function openVerifyModal() {
    if (!currentId) { await showErrorAlert("Please save PO details first."); return; }
    try {
      const res = await fetchPendingVerifyBatches(currentId);
      if (!res.status) throw new Error();
      setPendingVerify(res.data || []);
      setSelectedVerifyBatchIds([]);
      setShowVerifyModal(true);
    } catch {
      await showErrorAlert("Failed to load pending verify batches.");
    }
  }

  async function handleVerifyBatches() {
    if (selectedVerifyBatchIds.length === 0) { await showErrorAlert("Please select at least one batch."); return; }
    try {
      const res = await verifyPurchaseOrderBatches(selectedVerifyBatchIds);
      if (!res.status) throw new Error();
      await showSuccessAlert("Selected batches verified successfully.");
      setShowVerifyModal(false);
      await refreshConsigneesAndBatches();
    } catch {
      await showErrorAlert("Failed to verify selected batches.");
    }
  }

  async function handleLoadAssign(batchId: string) {
    setSelectedBatchId(batchId);
    if (!currentId || !batchId) { setAssignRows([]); return; }
    try {
      const res = await fetchPurchaseOrderAssign(currentId, batchId);
      if (!res.status) throw new Error();
      setAssignRows(res.data || []);
    } catch {
      setAssignRows([]);
      await showErrorAlert("Failed to load assign quantity details.");
    }
  }

  async function handleSaveAssign(options?: { silent?: boolean }) {
    if (!currentId || !selectedBatchId) { await showErrorAlert("Please select batch."); return; }
    const rows = assignRows.flatMap((consignee) =>
      consignee.products.map((product) => ({
        con_unique_id: consignee.con_unique_id,
        product_unique_id: product.product_unique_id,
        assign_qty: Number(product.assign_qty || 0),
      }))
    );
    setSavingAssign(true);
    try {
      const res = await savePurchaseOrderAssign(currentId, { batch_id: selectedBatchId, rows });
      if (!res.status) throw new Error(res.message || "Failed");
      if (!options?.silent) {
        await showSuccessAlert("Assign quantity saved successfully.");
      }
      await handleLoadAssign(selectedBatchId);
      return true;
    } catch (error: any) {
      await showErrorAlert(error?.message || "Failed to save assign quantities.");
      return false;
    } finally {
      setSavingAssign(false);
    }
  }

  async function handleSaveTerms() {
    if (!currentId) { await showErrorAlert("Please save PO details first."); return; }
    const validation = validateTermsForm();
    if (validation) { await showErrorAlert(validation); return; }
    setSavingTerms(true);
    try {
      const formData = new FormData();
      Object.entries(mainForm).forEach(([k, v]) => formData.append(k, String(v)));
      formData.append("ld_required", String(termsForm.ld_required));
      formData.append("ld_date_type", termsForm.ld_date_type);
      formData.append("ld_delivery_due_date", termsForm.ld_delivery_due_date);
      formData.append("ld_installation_due_date", termsForm.ld_installation_due_date);
      formData.append("insurence_required", String(termsForm.insurence_required));
      formData.append("insurence_types", getPersistedInsuranceTypes(termsForm.insurence_types));
      formData.append("other_insurance_type", termsForm.other_insurance_type.trim());
      formData.append("amc_required", String(termsForm.amc_required));
      formData.append("start_date", termsForm.start_date);
      formData.append("end_date", termsForm.end_date);
      formData.append("amc_percentae", termsForm.amc_percentae);
      formData.append("amcvalue", termsForm.amcvalue);
      if (poCopyFile) formData.append("po_copy", poCopyFile);
      if (amcFile) formData.append("amc_file", amcFile);
      const res = await updatePurchaseOrder(currentId, formData);
      if (!res.status) throw new Error();
      setExistingPoCopyUrl(res.data?.file_url || existingPoCopyUrl);
      setExistingPoCopyName(res.data?.file_org_name || res.data?.file_name || existingPoCopyName);
      setPoCopyFile(null);
      await showSuccessAlert("Purchase order updated successfully.");
      navigate("/order/purchase-order/list");
    } catch {
      await showErrorAlert("Failed to save terms and attachment details.");
    } finally {
      setSavingTerms(false);
    }
  }

  async function refreshAmcRows(poId = currentId) {
    if (!poId) {
      setAmcRows([]);
      return;
    }
    try {
      const res = await fetchPurchaseOrderAmcSublist(poId);
      setAmcRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAmcRows([]);
    }
  }

  function resetAmcForm() {
    setTermsForm((prev) => ({
      ...prev,
      start_date: "",
      end_date: "",
      amc_percentae: "",
      amcvalue: "",
      amc_tax: "",
      amc_unit_price: "",
      amc_remarks: "",
    }));
    setAmcFile(null);
  }

  async function handleAddAmcSublist() {
    if (!currentId) { await showErrorAlert("Please save PO details first."); return; }
    if (!termsForm.amc_required) { await showErrorAlert("Please enable AMC Required first."); return; }
    if (!termsForm.start_date || !termsForm.end_date || !termsForm.amc_percentae || !termsForm.amcvalue || !termsForm.amc_tax || !termsForm.amc_unit_price) {
      await showErrorAlert("Please fill all AMC sublist fields.");
      return;
    }
    if (!amcFile) {
      await showErrorAlert("Please choose AMC Attach Copy.");
      return;
    }

    setSavingTerms(true);
    try {
      const formData = new FormData();
      formData.append("start_date", termsForm.start_date);
      formData.append("end_date", termsForm.end_date);
      formData.append("amc_percentae", termsForm.amc_percentae);
      formData.append("amcvalue", termsForm.amcvalue);
      formData.append("amc_tax", termsForm.amc_tax);
      formData.append("amc_unit_price", termsForm.amc_unit_price);
      formData.append("amc_remarks", termsForm.amc_remarks);
      formData.append("amc_file", amcFile);
      if (poCopyFile) formData.append("po_copy", poCopyFile);
      const res = await createPurchaseOrderAmcSublist(currentId, formData);
      if (!res.status) throw new Error(res.message || "Failed");
      await showSuccessAlert("AMC sublist added successfully.");
      await refreshAmcRows();
      resetAmcForm();
    } catch (error: any) {
      await showErrorAlert(error?.message || "Failed to add AMC sublist.");
    } finally {
      setSavingTerms(false);
    }
  }

  async function handleDeleteAmcSublist(subId: string) {
    const confirmed = await showConfirmAlert("Delete this AMC sublist row?");
    if (!confirmed) return;
    try {
      const res = await deletePurchaseOrderAmcSublist(subId);
      if (!res.status) throw new Error(res.message || "Failed");
      await showSuccessAlert("AMC sublist deleted successfully.");
      await refreshAmcRows();
    } catch (error: any) {
      await showErrorAlert(error?.message || "Failed to delete AMC sublist.");
    }
  }

  function handleDownloadTemplate() {
    const blob = new Blob([buildConsigneeTemplateCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "consignee-details-format.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleItemSelect(value: string) {
    const item = itemOptions.find((row) => row.item_code === value || row.unique_id === value);
    if (!item) { setProductField("item_code", value); return; }
    setProductForm((prev) => ({
      ...prev,
      item_code: item.item_code || item.tender_code || item.unique_id,
      product: item.product || "",
      unit_price: String(item.unit_price || ""),
      net_price: String(item.net_price || ""),
      tax: String(item.tax || ""),
      warranty_duration: String(item.warranty_duration || ""),
      ...computeProductTotals(prev.qty, String(item.unit_price || ""), String(item.tax || "")),
    }));
  }

  function renderConsigneeEntryForm(inModal = false) {
    return (
      <div className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-6 xl:grid-cols-2">
        <div className="space-y-4">
          <FormRow label="Consignee Received Date" required>
            <FieldShell>
              <input name="consignee_received_date" type="date" value={consigneeForm.consignee_received_date} onChange={(e) => setConsigneeField("consignee_received_date", e.target.value)} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Billing Address" alignTop>
            <FieldShell textarea valid={Boolean(consigneeForm.billing_address)}>
              <textarea name="billing_address" value={consigneeForm.billing_address} onChange={(e) => setConsigneeField("billing_address", e.target.value)} className={textareaCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Billing Gst No">
            <FieldShell valid={Boolean(consigneeForm.billing_gst_no)} invalid={Boolean(consigneeForm.billing_gst_no) && !GST_REGEX.test(consigneeForm.billing_gst_no.trim().toUpperCase())}>
              <input name="billing_gst_no" value={consigneeForm.billing_gst_no} onChange={(e) => setConsigneeField("billing_gst_no", e.target.value)} maxLength={15} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Consignee Name/Branch">
            <FieldShell valid={Boolean(consigneeForm.con_branch)}>
              <input name="con_branch" value={consigneeForm.con_branch} onChange={(e) => setConsigneeField("con_branch", e.target.value)} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Consignee Branch Code">
            <FieldShell valid={Boolean(consigneeForm.con_branch_code)}>
              <input name="con_branch_code" value={consigneeForm.con_branch_code} onChange={(e) => setConsigneeField("con_branch_code", e.target.value)} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Consignee Address" alignTop>
            <FieldShell textarea valid={Boolean(consigneeForm.con_address)}>
              <textarea name="con_address" value={consigneeForm.con_address} onChange={(e) => setConsigneeField("con_address", e.target.value)} className={textareaCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Consignee GST IN">
            <FieldShell valid={Boolean(consigneeForm.consignee_gst)} invalid={Boolean(consigneeForm.consignee_gst) && !GST_REGEX.test(consigneeForm.consignee_gst.trim().toUpperCase())}>
              <input name="consignee_gst" value={consigneeForm.consignee_gst} onChange={(e) => setConsigneeField("consignee_gst", e.target.value)} maxLength={15} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Consignee Email Id">
            <FieldShell valid={Boolean(consigneeForm.cons_email_id)} invalid={Boolean(consigneeForm.cons_email_id) && !EMAIL_REGEX.test(consigneeForm.cons_email_id.trim())}>
              <input name="cons_email_id" type="email" value={consigneeForm.cons_email_id} onChange={(e) => setConsigneeField("cons_email_id", e.target.value)} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="State">
            <FieldShell select>
              <SearchableSelectInput name="con_state_name" value={consigneeForm.con_state_name} onChange={(e) => { setConsigneeField("con_state_name", e.target.value); setConsigneeField("con_district", ""); }} className={selectCls}>
                <option value="">Select Consignee State Name</option>
                {stateOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
              </SearchableSelectInput>
            </FieldShell>
          </FormRow>

          <FormRow label="District">
            <FieldShell select>
              <SearchableSelectInput name="con_district" value={consigneeForm.con_district} onChange={(e) => setConsigneeField("con_district", e.target.value)} className={selectCls}>
                <option value="">Select District</option>
                {districtOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
              </SearchableSelectInput>
            </FieldShell>
          </FormRow>

          <FormRow label="Region">
            <FieldShell valid={Boolean(consigneeForm.region)}>
              <input name="region" value={consigneeForm.region} onChange={(e) => setConsigneeField("region", e.target.value)} className={inputCls} />
            </FieldShell>
          </FormRow>
        </div>

        <div className="space-y-4">
          <FormRow label="Contact Person Name">
            <FieldShell valid={Boolean(consigneeForm.con_contact_name)}>
              <input name="con_contact_name" value={consigneeForm.con_contact_name} onChange={(e) => setConsigneeField("con_contact_name", e.target.value)} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Contact Number">
            <FieldShell valid={Boolean(consigneeForm.con_contact_number)} invalid={Boolean(consigneeForm.con_contact_number) && !MOBILE_REGEX.test(consigneeForm.con_contact_number.trim())}>
              <input name="con_contact_number" value={consigneeForm.con_contact_number} onChange={(e) => setConsigneeField("con_contact_number", e.target.value)} inputMode="numeric" maxLength={10} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Alternate Person Name">
            <FieldShell valid={Boolean(consigneeForm.alter_contact_name)}>
              <input name="alter_contact_name" value={consigneeForm.alter_contact_name} onChange={(e) => setConsigneeField("alter_contact_name", e.target.value)} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Alternate Contact Number">
            <FieldShell valid={Boolean(consigneeForm.alter_number)} invalid={Boolean(consigneeForm.alter_number) && !MOBILE_REGEX.test(consigneeForm.alter_number.trim())}>
              <input name="alter_number" value={consigneeForm.alter_number} onChange={(e) => setConsigneeField("alter_number", e.target.value)} inputMode="numeric" maxLength={10} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Landline Number">
            <FieldShell valid={Boolean(consigneeForm.con_lan_num)} invalid={Boolean(consigneeForm.con_lan_num) && !LANDLINE_REGEX.test(consigneeForm.con_lan_num.trim())}>
              <input name="con_lan_num" value={consigneeForm.con_lan_num} onChange={(e) => setConsigneeField("con_lan_num", e.target.value)} inputMode="numeric" maxLength={10} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Assign Team Member">
            <FieldShell select>
              <SearchableSelectInput name="assign_team_member" value={consigneeForm.assign_team_member} onChange={(e) => setConsigneeField("assign_team_member", e.target.value)} className={selectCls}>
                <option value="">Select Team Member</option>
                {teamMemberOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
              </SearchableSelectInput>
            </FieldShell>
          </FormRow>

          <FormRow label="Address verification">
            <FieldShell select>
              <SearchableSelectInput name="cons_verify_sts" value={consigneeForm.cons_verify_sts} onChange={(e) => setConsigneeField("cons_verify_sts", e.target.value)} className={selectCls}>
                <option value="">Select</option>
                <option value="1">Verified</option>
                <option value="0">Not Verified</option>
              </SearchableSelectInput>
            </FieldShell>
          </FormRow>

          <FormRow label="Zone">
            <FieldShell valid={Boolean(consigneeForm.zone)}>
              <input name="zone" value={consigneeForm.zone} onChange={(e) => setConsigneeField("zone", e.target.value)} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Zone Code">
            <FieldShell valid={Boolean(consigneeForm.zone_code)}>
              <input name="zone_code" value={consigneeForm.zone_code} onChange={(e) => setConsigneeField("zone_code", e.target.value)} className={inputCls} />
            </FieldShell>
          </FormRow>

          <FormRow label="Pincode">
            <FieldShell valid={Boolean(consigneeForm.con_pincode)} invalid={Boolean(consigneeForm.con_pincode) && !PIN_REGEX.test(consigneeForm.con_pincode.trim())}>
              <input name="con_pincode" value={consigneeForm.con_pincode} onChange={(e) => setConsigneeField("con_pincode", e.target.value)} inputMode="numeric" maxLength={6} className={inputCls} />
            </FieldShell>
          </FormRow>

          <div className="flex justify-end gap-3 pt-4">
            {(editConsigneeId || activeConsigneeBatchId) && (
              <button type="button" onClick={resetConsigneeForm} className="px-5 py-2 text-sm font-semibold bg-surface-2 border border-line rounded-md text-ink-secondary hover:bg-surface-3">
                Clear
              </button>
            )}
            <button type="button" onClick={() => void handleSaveConsignee()} disabled={savingConsignee} className="px-5 py-2 text-sm font-semibold bg-success text-white rounded-md hover:bg-success-dark disabled:opacity-60">
              {savingConsignee ? "Saving..." : editConsigneeId ? "Update" : inModal ? "Add New" : "Add New"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function goToTab(next: TabKey) {
    if (next !== "po" && !currentId) { void showErrorAlert("Please save PO details first."); return; }
    const nextIndex = tabs.findIndex((tab) => tab.key === next);
    const productIndex = tabs.findIndex((tab) => tab.key === "product");
    if (nextIndex > productIndex) {
      const validation = validateProductCountForNextTab();
      if (validation) {
        void showErrorAlert(validation);
        return;
      }
    }
    if (activeTab === "assign" && next !== "assign") {
      const saved = await handleSaveAssign({ silent: true });
      if (!saved) return;
    }
    setActiveTab(next);
  }

  async function nextTab() {
    const index = tabs.findIndex((tab) => tab.key === activeTab);
    if (index < tabs.length - 1) await goToTab(tabs[index + 1].key);
  }

  async function prevTab() {
    const index = tabs.findIndex((tab) => tab.key === activeTab);
    if (index > 0) await goToTab(tabs[index - 1].key);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-3 md:p-6">
      <PageTopbar
        title={currentId ? "Edit Purchase Order" : "Add Purchase Order"}
        breadcrumbs={["Forms", "PO Order", currentId ? "Edit" : "Add"]}
      />
      <div className="mt-3 max-w-full overflow-hidden rounded-[22px] border border-[#e5e8d7] bg-white shadow-[0_18px_44px_rgba(46,61,24,0.08)]">
        <div className="space-y-5 p-4 md:p-6">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          {loading ? (
            <div className="py-20 text-center text-ink-muted">Loading purchase order...</div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex flex-wrap gap-2 rounded-[22px] border border-[#e5ead7] bg-[linear-gradient(135deg,#fffdf7_0%,#f4f7ed_100%)] px-3 py-3 shadow-[0_12px_26px_rgba(120,98,24,0.08)]">
                {tabs.map((tab, index) => {
                  const isActive = activeTab === tab.key;
                  const isCompleted = tabs.findIndex((row) => row.key === activeTab) > index || (currentId && index === 0);
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => void goToTab(tab.key)}
                      className={`${tabCls} ${
                        isActive
                          ? "border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)]"
                          : isCompleted
                            ? "border-[#c8ddae] bg-[#eef7df] text-[#4d6b18]"
                            : "border-[#d8dec8] bg-white text-[#6b7651]"
                      }`}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">
                        {isCompleted ? <i className="fa fa-check" /> : index + 1}
                      </span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── PO Details tab ─────────────────────────────────────────── */}
              {activeTab === "po" && (
                <section className="space-y-6">
                  <div className="grid min-w-0 grid-cols-1 gap-x-7 gap-y-5 xl:grid-cols-2">
                    {/* Left column — Customer Details */}
                    <div className="min-w-0 space-y-4">
                      <h3 className="mb-3 text-[18px] font-bold text-[#42551d]">Customer Details</h3>
                      <FormRow label="Customer" required>
                        <div className="flex min-w-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowCustomerModal(true)}
                            className="h-9 w-9 shrink-0 rounded-full bg-brand-700 text-white transition-colors hover:bg-brand-800"
                            title="Add Customer"
                          >
                            <i className="fa fa-plus-circle" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <FieldShell select>
                              <SearchableSelectInput name="department" value={mainForm.department} onChange={(e) => setMainField("department", e.target.value)} className={selectCls}>
                                <option value="">Select Customer</option>
                                {customerOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
                              </SearchableSelectInput>
                            </FieldShell>
                          </div>
                        </div>
                      </FormRow>
                      <FormRow label="Billing Address" required alignTop>
                        <FieldShell textarea>
                          <textarea name="bill_address" value={mainForm.bill_address} onChange={(e) => setMainField("bill_address", e.target.value)} className={textareaCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="State" required>
                        <FieldShell select>
                          <SearchableSelectInput name="state_name"
                            value={mainForm.state_name}
                            onChange={(e) => { setMainField("state_name", e.target.value); setMainField("district", ""); }}
                            className={selectCls}
                          >
                            <option value="">Select State</option>
                            {stateOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="District" required>
                        <FieldShell select>
                          <SearchableSelectInput name="district" value={mainForm.district} onChange={(e) => setMainField("district", e.target.value)} className={selectCls}>
                            <option value="">Select District</option>
                            {mainDistrictOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Pin Code" required>
                        <FieldShell>
                          <input name="pin" value={mainForm.pin} onChange={(e) => setMainField("pin", e.target.value)} inputMode="numeric" maxLength={6} className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Contact Name">
                        <FieldShell>
                          <input name="contact_name" value={mainForm.contact_name} onChange={(e) => setMainField("contact_name", e.target.value)} className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Contact Number">
                        <FieldShell>
                          <input name="contact_number" value={mainForm.contact_number} onChange={(e) => setMainField("contact_number", e.target.value)} inputMode="numeric" maxLength={10} className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Landline Number">
                        <FieldShell>
                          <input name="landline_number" value={mainForm.landline_number} onChange={(e) => setMainField("landline_number", e.target.value)} inputMode="numeric" maxLength={10} className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Email">
                        <FieldShell>
                          <input name="email" type="email" value={mainForm.email} onChange={(e) => setMainField("email", e.target.value)} className={inputCls} />
                        </FieldShell>
                      </FormRow>
                    </div>

                    {/* Right column — Account Details */}
                    <div className="min-w-0 space-y-4">
                      <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-[18px] font-bold text-[#42551d]">Account Details</h3>
                        <div className="max-w-full break-words text-[18px] font-bold leading-tight text-ink sm:max-w-[58%] sm:text-right md:text-[21px]">{mainForm.po_num || "PO Number"}</div>
                      </div>

                      <FormRow label="PO Number" required>
                        <FieldShell valid={Boolean(mainForm.po_num)}>
                          <input name="po_num" value={mainForm.po_num} onChange={(e) => setMainField("po_num", e.target.value)} className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="PO Date" required>
                        <FieldShell valid={Boolean(mainForm.po_date)}>
                          <input name="po_date" type="date" value={mainForm.po_date} onChange={(e) => setMainField("po_date", e.target.value)} className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="PO Type" required>
                        <FieldShell select>
                          <SearchableSelectInput name="po_type" value={mainForm.po_type} onChange={(e) => setMainField("po_type", e.target.value)} className={selectCls}>
                            {options.po_types.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="No of Items in PO">
                        <FieldShell>
                          <input name="no_of_po" value={mainForm.no_of_po} onChange={(e) => setMainField("no_of_po", e.target.value)} inputMode="numeric" className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="GST Option">
                        <FieldShell select>
                          <SearchableSelectInput name="gst_option" value={mainForm.gst_option} onChange={(e) => setMainField("gst_option", e.target.value)} className={selectCls}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Customer GST No.">
                        <FieldShell>
                          <input name="gst_value" value={mainForm.gst_value} onChange={(e) => setMainField("gst_value", e.target.value)} maxLength={15} className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Account Sector" required>
                        <FieldShell select>
                          <SearchableSelectInput name="acc_sector" value={mainForm.acc_sector} onChange={(e) => setMainField("acc_sector", e.target.value)} className={selectCls}>
                            <option value="">Select Account Sector</option>
                            {sectorOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Account Vertical" required>
                        <FieldShell select>
                          <SearchableSelectInput name="acc_vertical" value={mainForm.acc_vertical} onChange={(e) => setMainField("acc_vertical", e.target.value)} className={selectCls}>
                            <option value="">Select Account Vertical</option>
                            {verticalOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Executive Name" required>
                        <FieldShell select>
                          <SearchableSelectInput name="executive_name" value={mainForm.executive_name} onChange={(e) => setMainField("executive_name", e.target.value)} className={selectCls}>
                            <option value="">Select Executive</option>
                            {executiveOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate("/order/purchase-order/list")} className="rounded-2xl border border-[#f0b8a8] bg-[#fff3ef] px-6 py-2.5 text-sm font-medium text-[#d45b35] transition-colors hover:bg-[#ffe7df]">Cancel</button>
                    <button type="button" onClick={() => void handlePoDetailsNext()} disabled={savingMain} className="rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] disabled:opacity-60">
                      {savingMain ? "Saving..." : "Update & continue"}
                    </button>
                  </div>
                </section>
              )}

              {/* ── Product Details tab ────────────────────────────────────── */}
              {activeTab === "product" && (
                <section className="space-y-6">
                  <div className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-6 xl:grid-cols-2">
                    {/* Left column */}
                    <div className="space-y-4">
                      <FormRow label="Tender Code" required>
                        <FieldShell select>
                          <SearchableSelectInput name="tender_code" value={productForm.tender_code} onChange={(e) => setProductField("tender_code", e.target.value)} className={selectCls}>
                            <option value="">Select Tender</option>
                            {tenderOptions.map((row) => <option key={row.tender_code || row.unique_id} value={row.tender_code || row.unique_id}>{row.label}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Item Code" required>
                        <FieldShell select>
                          <SearchableSelectInput name="item_code" value={productForm.item_code} onChange={(e) => handleItemSelect(e.target.value)} className={selectCls}>
                            <option value="">Select Item Code</option>
                            {itemOptions.map((row) => <option key={row.unique_id} value={row.item_code || row.unique_id}>{row.item_code || row.label}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Product" alignTop>
                        <FieldShell textarea>
                          <textarea name="product" value={productForm.product} onChange={(e) => setProductField("product", e.target.value)} className={textareaCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Qty" required>
                        <FieldShell>
                          <input name="qty" value={productForm.qty} onChange={(e) => setProductField("qty", e.target.value)} className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Unit Price">
                        <FieldShell>
                          <input name="unit_price" value={productForm.unit_price} onChange={(e) => setProductField("unit_price", e.target.value)} className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Net Price (with tax)">
                        <ReadonlyField value={productForm.net_price} />
                      </FormRow>

                      <FormRow label="Tax">
                        <FieldShell>
                          <input name="tax" value={productForm.tax} onChange={(e) => setProductField("tax", e.target.value)} inputMode="decimal" className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Total With Tax">
                        <ReadonlyField value={productForm.total_value} />
                      </FormRow>

                      <FormRow label="Total Without Tax">
                        <ReadonlyField value={productForm.net_value} />
                      </FormRow>

                      <FormRow label="BG Required">
                        <FieldShell select>
                          <SearchableSelectInput name="bg_required" value={productForm.bg_required} onChange={(e) => setProductField("bg_required", e.target.value)} className={selectCls}>
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                      <FormRow label="Delivery Due Days">
                        <FieldShell>
                          <input name="delivery_due_days" value={productForm.delivery_due_days} onChange={(e) => setProductField("delivery_due_days", e.target.value)} inputMode="numeric" className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Installation Due Days">
                        <FieldShell>
                          <input name="installation_due_days" value={productForm.installation_due_days} onChange={(e) => setProductField("installation_due_days", e.target.value)} inputMode="numeric" className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="LD Type">
                        <FieldShell select>
                          <SearchableSelectInput name="ld_type" value={productForm.ld_type} onChange={(e) => setProductField("ld_type", e.target.value)} className={selectCls}>
                            <option value="">Select LD Type</option>
                            {options.ld_types.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="LD % Per Day">
                        <FieldShell>
                          <input name="ld_per_day" value={productForm.ld_per_day} onChange={(e) => setProductField("ld_per_day", e.target.value)} inputMode="decimal" className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="LD Maximum %">
                        <FieldShell>
                          <input name="ld_maximum_val" value={productForm.ld_maximum_val} onChange={(e) => setProductField("ld_maximum_val", e.target.value)} inputMode="decimal" className={inputCls} />
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Document Required">
                        <FieldShell select>
                          <SearchableSelectInput name="document_required" value={productForm.document_required} onChange={(e) => setProductField("document_required", e.target.value)} className={selectCls}>
                            <option value="">Select</option>
                            <option value="ir_required">DC & IR Required</option>
                            <option value="dc_required">DC Required</option>
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      <FormRow label="Warranty">
                        <FieldShell select>
                          <SearchableSelectInput name="warranty" value={productForm.warranty} onChange={(e) => setProductField("warranty", e.target.value)} className={selectCls}>
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>

                      {productForm.warranty === "Yes" && (
                        <FormRow label="Warranty (Months)">
                          <FieldShell>
                            <input name="warranty_duration" value={productForm.warranty_duration} onChange={(e) => setProductField("warranty_duration", e.target.value)} inputMode="numeric" className={inputCls} />
                          </FieldShell>
                        </FormRow>
                      )}

                      {productForm.warranty === "Yes" && (
                        <FormRow label="Warranty Starts">
                          <FieldShell select>
                            <SearchableSelectInput name="warranty_starts" value={productForm.warranty_starts} onChange={(e) => setProductField("warranty_starts", e.target.value)} className={selectCls}>
                              <option value="">Select</option>
                              {options.warranty_starts.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
                              <option value="invoice_date">Invoice Date</option>
                            </SearchableSelectInput>
                          </FieldShell>
                        </FormRow>
                      )}

                      {productForm.bg_required === "Yes" && (
                        <FormRow label="BG %">
                          <FieldShell>
                            <input name="bg_percen" value={productForm.bg_percen} onChange={(e) => setProductField("bg_percen", e.target.value)} inputMode="decimal" className={inputCls} />
                          </FieldShell>
                        </FormRow>
                      )}

                      {productForm.bg_required === "Yes" && (
                        <FormRow label="BG Month">
                          <FieldShell>
                            <input name="bg_month" value={productForm.bg_month} onChange={(e) => setProductField("bg_month", e.target.value)} inputMode="numeric" className={inputCls} />
                          </FieldShell>
                        </FormRow>
                      )}

                      <div className="flex justify-end gap-3 pt-4">
                        {editProductId && (
                          <button type="button" onClick={resetProductForm} className="px-4 py-2 text-sm font-semibold border border-line rounded-md text-ink-secondary hover:bg-surface-2">Cancel Edit</button>
                        )}
                        <button type="button" onClick={() => void handleSaveProduct()} disabled={savingProduct} className="px-5 py-2 text-sm font-semibold bg-success text-white rounded-md hover:bg-success-dark disabled:opacity-60">
                          {savingProduct ? "Saving..." : editProductId ? "Update Product" : "Add New"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Products table */}
                  <div className="overflow-x-auto border border-line rounded-xl">
                    <table className="w-full text-[13px] border-collapse">
                      <thead>
                        <tr className="bg-surface-2">
                          {["ID", "Tender Code", "Item Code", "Product", "Qty", "Unit Price", "Total With Tax", "Warranty", "Action"].map((h) => (
                            <th key={h} className="px-3 py-2 border border-line-dark text-left whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.length === 0 ? (
                          <tr><td colSpan={9} className="px-3 py-8 text-center border border-line">No product rows added yet.</td></tr>
                        ) : products.map((row, index) => (
                          <tr key={row.unique_id || index} className="hover:bg-brand-50/40">
                            <td className="px-3 py-2 border border-line">{index + 1}</td>
                            <td className="px-3 py-2 border border-line">{row.tender_code || "-"}</td>
                            <td className="px-3 py-2 border border-line">{row.item_code_display || row.item_code || "-"}</td>
                            <td className="px-3 py-2 border border-line">{row.product || "-"}</td>
                            <td className="px-3 py-2 border border-line text-right">{row.qty || "-"}</td>
                            <td className="px-3 py-2 border border-line text-right">{row.unit_price || "-"}</td>
                            <td className="px-3 py-2 border border-line text-right">{row.total_value || "-"}</td>
                            <td className="px-3 py-2 border border-line">{row.warranty || row.warranty_duration || "-"}</td>
                            <td className="px-3 py-2 border border-line">
                              <div className="flex gap-2">
                                <button type="button" onClick={() => handleEditProduct(row)} className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 hover:bg-info hover:text-white"><i className="fa fa-pen-to-square" /></button>
                                <button type="button" onClick={() => void handleDeleteProduct(row.unique_id)} className="w-7 h-7 flex items-center justify-center rounded bg-danger-light text-danger border border-red-200 hover:bg-danger hover:text-white"><i className="fa fa-trash" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between">
                    <button type="button" onClick={() => void prevTab()} className="rounded-2xl border border-[#d8dec8] bg-white px-6 py-2.5 text-sm font-medium text-[#5f6c42] transition-colors hover:bg-[#f6f8f1]">Back</button>
                    <button type="button" onClick={() => void nextTab()} className="rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)]">Next</button>
                  </div>
                </section>
              )}

              {/* ── Consignee Details tab ──────────────────────────────────── */}
              {activeTab === "consignee" && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-ink">Select Mode:</span>
                      <button type="button" onClick={() => setConsigneeMode("entry")} className={`px-5 py-2 rounded-full text-sm font-semibold border ${consigneeMode === "entry" ? "bg-info text-white border-info" : "bg-white border-line text-ink-secondary"}`}>Entry</button>
                      <button type="button" onClick={() => setConsigneeMode("import")} className={`px-5 py-2 rounded-full text-sm font-semibold border ${consigneeMode === "import" ? "bg-info text-white border-info" : "bg-white border-line text-ink-secondary"}`}>Import</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={handleDownloadTemplate} className="px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-md hover:bg-brand-800"><i className="fa fa-download mr-2" />Download</button>
                      <button type="button" onClick={() => void openVerifyModal()} className="px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-md hover:bg-brand-800">Consignee Verify</button>
                    </div>
                  </div>

                  {consigneeMode === "entry" ? (
                    renderConsigneeEntryForm()
                  ) : (
                    <div className="space-y-4 max-w-xl">
                      <FormRow label="Received Date" required>
                        <FieldShell>
                          <input name="consignee_received_date" type="date" value={consigneeForm.consignee_received_date} onChange={(e) => setConsigneeField("consignee_received_date", e.target.value)} className={inputCls} />
                        </FieldShell>
                      </FormRow>
                      <FormRow label="Excel File">
                        <FieldShell>
                          <input name="purchaseorderform_input_2296" type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className={inputCls} />
                        </FieldShell>
                      </FormRow>
                      <div className="flex justify-end">
                        <button type="button" onClick={() => void handleImportConsignees()} disabled={savingConsignee} className="px-5 py-2 text-sm font-semibold bg-success text-white rounded-md hover:bg-success-dark disabled:opacity-60">
                          {savingConsignee ? "Importing..." : "Import"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Batches table */}
                  <div className="overflow-x-auto border border-line rounded-xl">
                    <table className="w-full text-[13px] border-collapse">
                      <thead>
                        <tr className="bg-surface-2">
                          {["ID", "Batch Id", "Batch Insert Date", "Consignee Received Date", "Total Consignee Count", "Item Count", "Order Qty", "Export", "Import", ...(canDeleteBatch ? ["Action"] : [])].map((h) => (
                            <th key={h} className="px-3 py-2 border border-line-dark text-left whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {batches.length === 0 ? (
                          <tr><td colSpan={canDeleteBatch ? 10 : 9} className="px-3 py-8 text-center border border-line">No consignee batch records found.</td></tr>
                        ) : batches.map((row, index) => {
                          const batchId = row.batch_id || "";
                          const isExpanded = expandedBatchIds.includes(batchId);
                          const isLoading = loadingBatchDetailIds.includes(batchId);
                          const details = batchDetailRows[batchId] || [];
                          const hasAssignRows = Number(row.batch_cnt || 0) > 0;
                          return (
                            <Fragment key={batchId || index}>
                              <tr key={batchId || index} className="hover:bg-brand-50/40">
                                <td className="px-3 py-2 border border-line">{index + 1}</td>
                                <td className="px-3 py-2 border border-line">{batchId || "-"}</td>
                                <td className="px-3 py-2 border border-line">{isoDate(row.batch_insert_date) || "-"}</td>
                                <td className="px-3 py-2 border border-line">{isoDate(row.consignee_received_date) || "-"}</td>
                                <td className="px-3 py-2 border border-line">
                                  <button
                                    type="button"
                                    onClick={() => openBatchConsigneeModal(batchId)}
                                    className="min-w-8 px-2 py-0.5 rounded bg-[#0d6efd] text-white font-semibold hover:bg-[#0b5ed7]"
                                  >
                                    {row.total_consignee_count || 0}
                                  </button>
                                </td>
                                <td className="px-3 py-2 border border-line">
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleBatchDetails(batchId)}
                                    className="min-w-8 px-2 py-0.5 rounded bg-[#0d6efd] text-white font-semibold hover:bg-[#0b5ed7]"
                                  >
                                    {row.item_count || 0}
                                  </button>
                                </td>
                                <td className="px-3 py-2 border border-line">{row.order_qty || 0}</td>
                                <td className="px-3 py-2 border border-line">
                                  {hasAssignRows ? (
                                    "Exported Done"
                                  ) : (
                                    <button type="button" onClick={() => void handleBatchExport(batchId)} className="px-3 py-1.5 text-xs font-semibold bg-success text-white rounded hover:bg-success-dark">
                                      Export
                                    </button>
                                  )}
                                </td>
                                <td className="px-3 py-2 border border-line">
                                  {hasAssignRows ? (
                                    "Imported Done"
                                  ) : (
                                    <button type="button" onClick={() => void handleBatchImport(batchId)} className="px-3 py-1.5 text-xs font-semibold bg-success text-white rounded hover:bg-success-dark">
                                      Import
                                    </button>
                                  )}
                                </td>
                                {canDeleteBatch && (
                                  <td className="px-3 py-2 border border-line">
                                    {hasAssignRows ? (
                                      "-"
                                    ) : (
                                      <button type="button" onClick={() => void handleDeleteBatch(batchId)} className="w-7 h-7 flex items-center justify-center rounded bg-danger-light text-danger border border-red-200 hover:bg-danger hover:text-white">
                                        <i className="fa fa-trash" />
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                              {isExpanded && (
                                <tr key={`${batchId}-details`}>
                                  <td colSpan={canDeleteBatch ? 10 : 9} className="px-0 py-0 border border-line bg-brand-50/20">
                                    {isLoading ? (
                                      <div className="px-4 py-6 text-sm text-ink-muted">Loading batch details...</div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-[13px] border-collapse">
                                          <thead>
                                            <tr className="bg-[#174a8b] text-white">
                                              {["S.No", "Consignee Address", "Order Qty", "Assign Qty"].map((header) => (
                                                <th key={header} className="px-3 py-2 border border-white/20 text-left">{header}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {details.length === 0 ? (
                                              <tr>
                                                <td colSpan={4} className="px-3 py-5 border border-line text-center text-ink-muted">No item-wise consignee details found.</td>
                                              </tr>
                                            ) : details.map((detail, detailIndex) => (
                                              <tr key={`${batchId}-${detail.con_unique_id}-${detailIndex}`} className="bg-[#9fc2ea]">
                                                <td className="px-3 py-2 border border-white/20">{detailIndex + 1}</td>
                                                <td className="px-3 py-2 border border-white/20">{detail.con_address || "-"}</td>
                                                <td className="px-3 py-2 border border-white/20">{detail.order_qty}</td>
                                                <td className="px-3 py-2 border border-white/20">{detail.assign_qty}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between">
                    <button type="button" onClick={() => void prevTab()} className="rounded-2xl border border-[#d8dec8] bg-white px-6 py-2.5 text-sm font-medium text-[#5f6c42] transition-colors hover:bg-[#f6f8f1]">Back</button>
                    <button type="button" onClick={() => void nextTab()} className="px-5 py-2 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800">Next</button>
                  </div>
                </section>
              )}

              {/* ── Assign Qty tab ─────────────────────────────────────────── */}
              {activeTab === "assign" && (
                <section className="space-y-6">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="w-120">
                      <FormRow label="Batch ID">
                        <FieldShell select>
                          <SearchableSelectInput name="selectedbatchid" value={selectedBatchId} onChange={(e) => void handleLoadAssign(e.target.value)} className={selectCls}>
                            <option value="">Select Batch</option>
                            {batches.map((row) => <option key={row.batch_id} value={row.batch_id}>{row.batch_id}</option>)}
                          </SearchableSelectInput>
                        </FieldShell>
                      </FormRow>
                    </div>
                    <div className="flex gap-3 pb-0.5">
                      <button type="button" onClick={() => void handleLoadAssign(selectedBatchId)} className="px-5 py-2.5 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800">Go</button>
                      <button type="button" onClick={() => void handleSaveAssign()} disabled={savingAssign || !selectedBatchId} className="px-5 py-2.5 text-sm font-semibold bg-success text-white rounded-md hover:bg-success-dark disabled:opacity-60">
                        {savingAssign ? "Saving..." : "Save Assign Qty"}
                      </button>
                    </div>
                  </div>

                  {assignRows.length === 0 ? (
                    <div className="px-4 py-10 text-center border border-line rounded-xl text-ink-muted">Select a batch to load assign quantity details.</div>
                  ) : (
                    <div className="space-y-4">
                      {assignRows.map((consignee, consigneeIndex) => (
                        <div key={consignee.con_unique_id} className="border border-line rounded-xl p-4 space-y-4">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <div className="text-lg font-bold text-brand-700">{consignee.con_name || "Consignee Details"}</div>
                              <div className="text-sm text-ink-secondary">{consignee.con_address || "-"}</div>
                              <div className="text-sm text-ink-secondary">Ph.: {consignee.con_contact_no || "-"}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-ink-muted">Batch</div>
                              <div className="text-lg font-bold text-ink">{consignee.batch_id || "-"}</div>
                              <div className="text-sm text-ink-secondary">{isoDate(consignee.po_date) || "-"}</div>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[13px] border-collapse">
                              <thead>
                                <tr className="bg-surface-2">
                                  {["S.No", "Item Code", "Item Name", "Item QTY", "Assign QTY"].map((h) => (
                                    <th key={h} className="px-3 py-2 border border-line-dark text-left">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {consignee.products.map((product, productIndex) => (
                                  <tr key={`${consignee.con_unique_id}-${product.product_unique_id}`}>
                                    <td className="px-3 py-2 border border-line">{productIndex + 1}</td>
                                    <td className="px-3 py-2 border border-line">{product.item_code || "-"}</td>
                                    <td className="px-3 py-2 border border-line">{product.product || "-"}</td>
                                    <td className="px-3 py-2 border border-line">{product.qty || 0}</td>
                                    <td className="px-3 py-2 border border-line">
                                      <input name="purchaseorderform_input_2488"
                                        value={String(product.assign_qty ?? "")}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setAssignRows((prev) =>
                                            prev.map((row, ri) =>
                                              ri !== consigneeIndex ? row : {
                                                ...row,
                                                products: row.products.map((inner, pi) =>
                                                  pi !== productIndex ? inner : { ...inner, assign_qty: value }
                                                ),
                                              }
                                            )
                                          );
                                        }}
                                        className="w-full px-2 py-1.5 border border-line-dark rounded text-sm outline-none focus:border-brand-500"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button type="button" onClick={() => void prevTab()} className="px-5 py-2 text-sm font-semibold bg-surface-2 border border-line rounded-md text-ink-secondary hover:bg-surface-3">Back</button>
                    <button type="button" onClick={() => void nextTab()} className="px-5 py-2 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800">Next</button>
                  </div>
                </section>
              )}

              {/* ── Terms & Condition tab ──────────────────────────────────── */}
              {activeTab === "terms" && (
                <section className="space-y-8">
                  <div className="space-y-4 max-w-xl">
                    <FormRow label="Attach PO Copy">
                      <FieldShell>
                        <input name="purchaseorderform_input_2529" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPoCopyFile(e.target.files?.[0] || null)} className={inputCls} />
                      </FieldShell>
                    </FormRow>
                    {(poCopyFile || existingPoCopyUrl) && (
                      <div className="text-sm text-ink-secondary pl-[180px]">
                        {poCopyFile ? (
                          <span>Selected file: <span className="font-semibold text-ink">{poCopyFile.name}</span></span>
                        ) : existingPoCopyUrl ? (
                          <span className="inline-flex items-center gap-2">
                            <span>Current file:</span>
                            <a href={existingPoCopyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center text-danger hover:text-danger-dark text-lg" aria-label={existingPoCopyName || "Open PO Copy PDF"} title={existingPoCopyName || "Open PO Copy PDF"}>
                              <i className="fa fa-file-pdf" />
                            </a>
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Insurance */}
                  <div className="border-t border-line pt-6 space-y-4">
                    <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                      <input name="insurence_required" type="checkbox" checked={termsForm.insurence_required} onChange={(e) => setTermsField("insurence_required", e.target.checked)} className="w-4 h-4" />
                      Insurance Required
                    </label>
                    {termsForm.insurence_required && (
                      <div className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
                        <div>
                          <span className="block text-sm font-semibold text-ink mb-1.5">Insurance Types</span>
                          <div className="border border-line-dark rounded-md p-3 space-y-2 max-h-52 overflow-y-auto bg-white">
                            {insuranceTypeOptions.map((row) => (
                              <label key={row.unique_id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                                <input name="insurence_types"
                                  type="checkbox"
                                  checked={termsForm.insurence_types.includes(row.unique_id)}
                                  onChange={(e) =>
                                    setTermsField("insurence_types", e.target.checked
                                      ? [...termsForm.insurence_types, row.unique_id]
                                      : termsForm.insurence_types.filter((v) => v !== row.unique_id)
                                    )
                                  }
                                  className="w-4 h-4"
                                />
                                {row.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        {showOtherInsuranceField ? (
                          <div className="space-y-4">
                            <FormRow label="Other Insurance" required>
                              <FieldShell invalid={!termsForm.other_insurance_type.trim()}>
                                <input name="other_insurance_type" value={termsForm.other_insurance_type} onChange={(e) => setTermsField("other_insurance_type", e.target.value)} className={inputCls} />
                              </FieldShell>
                            </FormRow>
                          </div>
                        ) : (
                          <div />
                        )}
                      </div>
                    )}
                  </div>

                  {/* LD Calculation */}
                  <div className="border-t border-line pt-6 space-y-4">
                    <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                      <input name="ld_required" type="checkbox" checked={termsForm.ld_required} onChange={(e) => setTermsField("ld_required", e.target.checked)} className="w-4 h-4" />
                      LD Calculation
                    </label>
                    {termsForm.ld_required && (
                      <div className="grid max-w-4xl min-w-0 grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
                        <FormRow label="Date Type">
                          <FieldShell select>
                            <SearchableSelectInput name="ld_date_type" value={termsForm.ld_date_type} onChange={(e) => setTermsField("ld_date_type", e.target.value)} className={selectCls}>
                              {options.date_types.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
                            </SearchableSelectInput>
                          </FieldShell>
                        </FormRow>
                        <FormRow label="Delivery Due Date">
                          <FieldShell>
                            <input name="ld_delivery_due_date" type="date" value={termsForm.ld_delivery_due_date} readOnly className={inputCls} />
                          </FieldShell>
                        </FormRow>
                        <FormRow label="Installation Due Date">
                          <FieldShell>
                            <input name="ld_installation_due_date" type="date" value={termsForm.ld_installation_due_date} readOnly className={inputCls} />
                          </FieldShell>
                        </FormRow>
                      </div>
                    )}
                  </div>

                  {/* AMC */}
                  <div className="border-t border-line pt-6 space-y-4">
                    <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                      <input name="amc_required" type="checkbox" checked={termsForm.amc_required} onChange={(e) => setTermsField("amc_required", e.target.checked)} className="w-4 h-4" />
                      AMC Required
                    </label>
                    {termsForm.amc_required && (
                      <div className="space-y-5">
                        <div className="grid max-w-6xl min-w-0 grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
                          <div className="space-y-4">
                            <FormRow label="Start Date" required>
                              <FieldShell>
                                <input name="start_date" type="date" value={termsForm.start_date} onChange={(e) => setTermsField("start_date", e.target.value)} className={inputCls} />
                              </FieldShell>
                            </FormRow>
                            <FormRow label="AMC%" required>
                              <FieldShell>
                                <input name="amc_percentae" value={termsForm.amc_percentae} onChange={(e) => setTermsField("amc_percentae", e.target.value)} inputMode="decimal" className={inputCls} />
                              </FieldShell>
                            </FormRow>
                            <FormRow label="AMC Net Value" required>
                              <FieldShell>
                                <input name="amcvalue" value={termsForm.amcvalue} onChange={(e) => setTermsField("amcvalue", e.target.value)} inputMode="decimal" className={inputCls} />
                              </FieldShell>
                            </FormRow>
                            <FormRow label="AMC Attach Copy" required>
                              <FieldShell>
                                <input name="purchaseorderform_input_2648" type="file" accept=".pdf" onChange={(e) => setAmcFile(e.target.files?.[0] || null)} className={inputCls} />
                              </FieldShell>
                            </FormRow>
                          </div>
                          <div className="space-y-4">
                            <FormRow label="End Date" required>
                              <FieldShell>
                                <input name="end_date" type="date" value={termsForm.end_date} onChange={(e) => setTermsField("end_date", e.target.value)} className={inputCls} />
                              </FieldShell>
                            </FormRow>
                            <FormRow label="AMC tax%" required>
                              <FieldShell>
                                <input name="amc_tax" value={termsForm.amc_tax} onChange={(e) => setTermsField("amc_tax", e.target.value)} inputMode="decimal" className={inputCls} />
                              </FieldShell>
                            </FormRow>
                            <FormRow label="AMC Unit Price" required>
                              <ReadonlyField value={termsForm.amc_unit_price} />
                            </FormRow>
                            <FormRow label="Remarks" alignTop>
                              <FieldShell textarea>
                                <textarea name="amc_remarks" value={termsForm.amc_remarks} onChange={(e) => setTermsField("amc_remarks", e.target.value)} className={textareaCls} rows={2} />
                              </FieldShell>
                            </FormRow>
                            <div className="flex justify-end">
                              <button type="button" onClick={() => void handleAddAmcSublist()} disabled={savingTerms} className="px-5 py-2 text-sm font-semibold bg-success text-white rounded-md hover:bg-success-dark disabled:opacity-60">
                                Add New
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto border border-line rounded-xl">
                          <table className="w-full text-[13px] border-collapse">
                            <thead>
                              <tr className="bg-surface-2">
                                {["S.No", "Start Date", "End Date", "AMC%", "AMC Net Values", "AMC Tax Amount", "AMC Unit Price", "Remarks", "Attach AMC PO", "Attach PO Copy", "Action"].map((h) => (
                                  <th key={h} className="px-3 py-2 border border-line-dark text-left whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {amcRows.length === 0 ? (
                                <tr>
                                  <td colSpan={11} className="px-3 py-6 border border-line text-center text-ink-muted">No data available in table</td>
                                </tr>
                              ) : amcRows.map((row, index) => (
                                <tr key={row.unique_id || index}>
                                  <td className="px-3 py-2 border border-line">{index + 1}</td>
                                  <td className="px-3 py-2 border border-line">{isoDate(row.start_date) || "-"}</td>
                                  <td className="px-3 py-2 border border-line">{isoDate(row.end_date) || "-"}</td>
                                  <td className="px-3 py-2 border border-line">{row.amc_percentae || "-"}</td>
                                  <td className="px-3 py-2 border border-line">{row.amcvalue || "-"}</td>
                                  <td className="px-3 py-2 border border-line">{row.amc_tax || "-"}</td>
                                  <td className="px-3 py-2 border border-line">{row.amc_unit_price || "-"}</td>
                                  <td className="px-3 py-2 border border-line">{row.amc_remarks || "-"}</td>
                                  <td className="px-3 py-2 border border-line">
                                    {row.amc_file_url ? <a href={row.amc_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center text-danger hover:text-danger-dark text-lg" aria-label="Open AMC PDF" title="Open AMC PDF"><i className="fa fa-file-pdf" /></a> : "-"}
                                  </td>
                                  <td className="px-3 py-2 border border-line">
                                    {row.po_file_url ? <a href={row.po_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center text-danger hover:text-danger-dark text-lg" aria-label="Open PO Copy PDF" title="Open PO Copy PDF"><i className="fa fa-file-pdf" /></a> : "-"}
                                  </td>
                                  <td className="px-3 py-2 border border-line">
                                    <button type="button" onClick={() => void handleDeleteAmcSublist(row.unique_id)} className="w-7 h-7 flex items-center justify-center rounded bg-danger-light text-danger border border-red-200 hover:bg-danger hover:text-white">
                                      <i className="fa fa-trash" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button type="button" onClick={() => void prevTab()} className="px-5 py-2 text-sm font-semibold bg-surface-2 border border-line rounded-md text-ink-secondary hover:bg-surface-3">Back</button>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => navigate("/order/purchase-order/list")} className="rounded-2xl border border-[#f0b8a8] bg-[#fff3ef] px-6 py-2.5 text-sm font-medium text-[#d45b35] transition-colors hover:bg-[#ffe7df]">Cancel</button>
                      <button type="button" onClick={() => void handleSaveTerms()} disabled={savingTerms} className="rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] disabled:opacity-60">
                        {savingTerms ? "Saving..." : "Update"}
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Verify Modal ───────────────────────────────────────────────────── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-lg font-bold text-ink">Bulk Verify Pending Batches</h3>
              <button type="button" onClick={() => setShowVerifyModal(false)} className="text-ink-muted hover:text-ink text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="overflow-x-auto border border-line rounded-xl">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-surface-2">
                      <th className="px-3 py-2 border border-line-dark text-left">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input name="purchaseorderform_input_2754"
                            type="checkbox"
                            checked={pendingVerify.length > 0 && selectedVerifyBatchIds.length === pendingVerify.length}
                            onChange={(e) => setSelectedVerifyBatchIds(e.target.checked ? pendingVerify.map((row) => row.batch_id) : [])}
                          />
                          Select All
                        </label>
                      </th>
                      <th className="px-3 py-2 border border-line-dark text-left">S.No</th>
                      <th className="px-3 py-2 border border-line-dark text-left">Batch ID</th>
                      <th className="px-3 py-2 border border-line-dark text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVerify.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center border border-line">No data available in table</td></tr>
                    ) : pendingVerify.map((row, index) => (
                      <tr key={row.batch_id || index}>
                        <td className="px-3 py-2 border border-line">
                          <input name="purchaseorderform_input_2773"
                            type="checkbox"
                            checked={selectedVerifyBatchIds.includes(row.batch_id)}
                            onChange={(e) => setSelectedVerifyBatchIds((prev) => e.target.checked ? [...prev, row.batch_id] : prev.filter((v) => v !== row.batch_id))}
                          />
                        </td>
                        <td className="px-3 py-2 border border-line">{row.s_no || index + 1}</td>
                        <td className="px-3 py-2 border border-line">{row.batch_id || "-"}</td>
                        <td className="px-3 py-2 border border-line">{row.status || "Pending"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => void handleVerifyBatches()} className="px-5 py-2 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800">Verified</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignImportModal && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-2xl font-bold text-ink">Consignee Product Details</h3>
              <button
                type="button"
                onClick={closeAssignImportModal}
                className="text-2xl text-ink-muted hover:text-ink leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <span className="block text-sm text-ink-secondary mb-2">Choose Excel File To Import</span>
                <input name="purchaseorderform_input_2812"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setAssignImportFile(e.target.files?.[0] || null)}
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-ink-muted">
                  Batch ID: <span className="font-semibold text-ink">{assignImportBatchId || "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeAssignImportModal}
                    className="px-5 py-2 text-sm font-semibold bg-surface-2 border border-line rounded-md text-ink-secondary hover:bg-surface-3"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmitAssignImport()}
                    disabled={savingAssign}
                    className="px-6 py-2 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800 disabled:opacity-60"
                  >
                    {savingAssign ? "Importing..." : "Import"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchConsigneeModal && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div>
                <h3 className="text-xl font-bold text-ink">Consignee Details</h3>
                <p className="text-sm text-ink-muted mt-1">
                  Batch ID: <span className="font-semibold text-ink">{activeConsigneeBatchId || "-"}</span>
                  {" "} | Received Date: <span className="font-semibold text-ink">{isoDate(activeBatchRow?.consignee_received_date) || "-"}</span>
                </p>
              </div>
              <button type="button" onClick={closeBatchConsigneeModal} className="text-2xl text-ink-muted hover:text-ink leading-none">×</button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="flex justify-between items-center gap-4">
                <div className="text-sm text-ink-secondary">
                  Click a row to edit the batch-wise consignee details just like the PHP consignee page.
                </div>
                <button
                  type="button"
                  onClick={openBatchConsigneeCreate}
                  className="px-4 py-2 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800"
                >
                  Add New In This Batch
                </button>
              </div>

              <div className="overflow-x-auto border border-line rounded-xl">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-surface-2">
                      {["S.No", "Branch", "Consignee Address", "Contact No", "Pincode", "Action"].map((header) => (
                        <th key={header} className="px-3 py-2 border border-line-dark text-left">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeBatchConsignees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 border border-line text-center text-ink-muted">No consignee rows found for this batch.</td>
                      </tr>
                    ) : activeBatchConsignees.map((row, index) => (
                      <tr key={row.unique_id || index}>
                        <td className="px-3 py-2 border border-line">{index + 1}</td>
                        <td className="px-3 py-2 border border-line">{row.con_branch || "-"}</td>
                        <td className="px-3 py-2 border border-line">{row.con_address || "-"}</td>
                        <td className="px-3 py-2 border border-line">{row.con_contact_number || "-"}</td>
                        <td className="px-3 py-2 border border-line">{row.con_pincode || "-"}</td>
                        <td className="px-3 py-2 border border-line">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openBatchConsigneeEdit(row)} className="w-7 h-7 flex items-center justify-center rounded bg-info-light text-info border border-blue-200 hover:bg-info hover:text-white"><i className="fa fa-pen-to-square" /></button>
                            <button type="button" onClick={() => void handleDeleteConsignee(row.unique_id)} className="w-7 h-7 flex items-center justify-center rounded bg-danger-light text-danger border border-red-200 hover:bg-danger hover:text-white"><i className="fa fa-trash" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showBatchConsigneeForm && (
                <div className="border border-line rounded-2xl p-5 bg-surface-1">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-ink">{editConsigneeId ? "Edit Consignee" : "Add Consignee"}</h4>
                      <p className="text-sm text-ink-muted">Changes saved here stay under batch <span className="font-semibold text-ink">{activeConsigneeBatchId || "-"}</span>.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBatchConsigneeForm(false)}
                      className="px-4 py-2 text-sm font-semibold bg-surface-2 border border-line rounded-md text-ink-secondary hover:bg-surface-3"
                    >
                      Close Form
                    </button>
                  </div>
                  {renderConsigneeEntryForm(true)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-2xl font-bold text-ink text-center flex-1">Customer Creation</h3>
              <button
                type="button"
                onClick={closeCustomerModal}
                className="text-2xl text-ink-muted hover:text-ink leading-none ml-4"
              >
                ×
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="block text-sm text-ink-secondary mb-2">Account Sector</span>
                <FieldShell select>
                  <SearchableSelectInput name="acc_sector"
                    value={customerModal.acc_sector}
                    onChange={(e) => setCustomerModalField("acc_sector", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select Account</option>
                    {sectorOptions.map((row) => (
                      <option key={row.unique_id} value={row.unique_id}>
                        {row.label}
                      </option>
                    ))}
                  </SearchableSelectInput>
                </FieldShell>
              </div>

              <div>
                <span className="block text-sm text-ink-secondary mb-2">Customer</span>
                <FieldShell>
                  <input name="customer"
                    value={customerModal.customer}
                    onChange={(e) => setCustomerModalField("customer", e.target.value)}
                    className={inputCls}
                  />
                </FieldShell>
              </div>

              <div>
                <span className="block text-sm text-ink-secondary mb-2">Active Status</span>
                <FieldShell select>
                  <SearchableSelectInput name="is_active"
                    value={customerModal.is_active}
                    onChange={(e) => setCustomerModalField("is_active", Number(e.target.value))}
                    className={selectCls}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </SearchableSelectInput>
                </FieldShell>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-5 border-t border-line bg-surface-2/40">
              <button
                type="button"
                onClick={closeCustomerModal}
                className="px-5 py-2.5 text-sm font-semibold bg-danger text-white rounded-md hover:bg-danger-dark"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleSaveCustomerModal()}
                disabled={savingCustomer}
                className="px-5 py-2.5 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800 disabled:opacity-60"
              >
                {savingCustomer ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






