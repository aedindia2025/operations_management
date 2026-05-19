import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchPurchaseOrderById, fetchPurchaseOrderProducts } from "../../api/purchaseOrderApi";
import {
  createStockPosition,
  fetchStockPositionDetail,
  updateStockPositionPartNo,
  type StockPositionProductRow,
  type StockPositionSublistRow,
} from "../../api/stockPositionApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";

type EditableRow = {
  id: string;
  item_code: string;
  item_desc: string;
  order_qty: number;
  remaining_qty: number;
  stock_qty: string;
  balance_qty: number;
  part_no: string;
  unit_price: number;
  net_price: number;
  product_tax: number;
  billed_qty: number;
  due_date: string;
};

type SavedStockRow = {
  s_no: number;
  stock_id: string;
  stock_date: string;
  product_unique_id?: string;
  item_code: string;
  item_desc: string;
  order_qty: number;
  remaining_qty: number;
  stock_qty: number;
  balance_qty: number;
  part_no: string;
};

type ViewMode = "create" | "processing";

const emptyCustomer = {
  name: "",
  address: "",
  phone: "",
  email: "",
  po_number: "",
  po_date: "",
  executive: "",
  executive_id: "",
  no_consignee: 0,
  no_items: 0,
  qty: 0,
  value: "0.00",
  department: "",
  po_unique_id: "",
  main_unique_id: "",
  stock_id: "",
};

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateForInput(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function formatDateForApi(value: string) {
  if (!value) return "";
  const [yyyy, mm, dd] = value.split("-");
  if (!yyyy || !mm || !dd) return value;
  return `${dd}-${mm}-${yyyy}`;
}

function formatDateForDisplay(value?: string) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  return value;
}

function addDays(baseDate?: string, days?: string | number) {
  const normalizedBase = formatDateForInput(baseDate);
  const date = new Date(`${normalizedBase}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + toNumber(days));
  return date.toISOString().slice(0, 10);
}

function dueDaysFromToday(value?: string) {
  if (!value) return "-";
  const date = new Date(`${formatDateForInput(value)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getErrorMessage(err: any, fallback: string) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

function getProductKey(itemCode?: string, itemDesc?: string) {
  return `${String(itemCode || "").trim()}__${String(itemDesc || "").trim()}`;
}

function buildProductDisplayMaps(poProducts: any[] = [], existingProducts: StockPositionProductRow[] = []) {
  const codeByProductId = new Map<string, string>();
  const descByProductId = new Map<string, string>();
  const codeByRawItemCode = new Map<string, string>();
  const descByRawItemCode = new Map<string, string>();

  poProducts.forEach((row: any) => {
    const productId = String(row.product_unique_id || row.unique_id || "").trim();
    const rawItemCode = String(row.item_code || "").trim();
    const displayCode = String(row.item_code_display || row.item_code || "").trim();
    const displayDesc = String(row.product || row.item_description || "").trim();

    if (productId) {
      if (displayCode) codeByProductId.set(productId, displayCode);
      if (displayDesc) descByProductId.set(productId, displayDesc);
    }
    if (rawItemCode) {
      if (displayCode) codeByRawItemCode.set(rawItemCode, displayCode);
      if (displayDesc) descByRawItemCode.set(rawItemCode, displayDesc);
    }
  });

  existingProducts.forEach((row) => {
    const productId = String(row.product_unique_id || row.unique_id || "").trim();
    const rawItemCode = String(row.item_code || "").trim();
    const displayDesc = String(row.product || "").trim();
    if (productId && displayDesc && !descByProductId.has(productId)) descByProductId.set(productId, displayDesc);
    if (rawItemCode && displayDesc && !descByRawItemCode.has(rawItemCode)) descByRawItemCode.set(rawItemCode, displayDesc);
  });

  return { codeByProductId, descByProductId, codeByRawItemCode, descByRawItemCode };
}

function resolveDisplayItemCode(
  productUniqueId: string | undefined,
  rawItemCode: string | undefined,
  maps: ReturnType<typeof buildProductDisplayMaps>
) {
  const productId = String(productUniqueId || "").trim();
  const itemCode = String(rawItemCode || "").trim();
  return (
    (productId ? maps.codeByProductId.get(productId) : "") ||
    (itemCode ? maps.codeByRawItemCode.get(itemCode) : "") ||
    itemCode
  );
}

function resolveDisplayItemDesc(
  productUniqueId: string | undefined,
  rawItemCode: string | undefined,
  rawDesc: string | undefined,
  maps: ReturnType<typeof buildProductDisplayMaps>
) {
  const productId = String(productUniqueId || "").trim();
  const itemCode = String(rawItemCode || "").trim();
  return (
    (productId ? maps.descByProductId.get(productId) : "") ||
    (itemCode ? maps.descByRawItemCode.get(itemCode) : "") ||
    String(rawDesc || "").trim()
  );
}

function buildProductwiseItems(
  poProducts: any[],
  poDate?: string,
  savedStockRows: SavedStockRow[] = [],
  existingProducts: StockPositionProductRow[] = []
): EditableRow[] {
  const displayMaps = buildProductDisplayMaps(poProducts, existingProducts);
  const savedQtyByProduct = new Map<string, number>();
  const latestPartNoByProduct = new Map<string, string>();

  savedStockRows.forEach((row) => {
    const key = getProductKey(row.item_code, row.item_desc);
    savedQtyByProduct.set(key, (savedQtyByProduct.get(key) || 0) + toNumber(row.stock_qty));
  });

  existingProducts.forEach((row) => {
    const itemCode = row.item_code || "";
    const itemDesc = row.product || "";
    const key = getProductKey(itemCode, itemDesc);
    const partNo = String(row.part_no || "").trim();
    if (partNo) latestPartNoByProduct.set(key, partNo);
  });

  const grouped = new Map<string, EditableRow>();

  poProducts.forEach((row: any, index: number) => {
    const productUniqueId = String(row.product_unique_id || row.unique_id || "").trim();
    const itemCode = resolveDisplayItemCode(productUniqueId, row.item_code, displayMaps);
    const itemDesc = resolveDisplayItemDesc(productUniqueId, row.item_code, row.product || row.item_description, displayMaps);
    const key = getProductKey(itemCode, itemDesc);
    const orderQty = toNumber(row.qty ?? row.item_qty);
    const billedQty = toNumber(row.billed_qty);
    const dueDate = row.due_date || addDays(poDate, row.delivery_due_dates);
    const existing = grouped.get(key);

    if (existing) {
      existing.order_qty += orderQty;
      existing.billed_qty += billedQty;
      if (!existing.due_date && dueDate) existing.due_date = dueDate;
      if (!existing.part_no) existing.part_no = latestPartNoByProduct.get(key) || "";
      return;
    }

    grouped.set(key, {
      id: String(productUniqueId || row.unique_id || key || index),
      item_code: itemCode,
      item_desc: itemDesc,
      order_qty: orderQty,
      remaining_qty: 0,
      stock_qty: "",
      balance_qty: 0,
      part_no: latestPartNoByProduct.get(key) || row.part_no || "",
      unit_price: toNumber(row.unit_price),
      net_price: toNumber(row.net_price),
      product_tax: toNumber(row.tax ?? row.product_tax),
      billed_qty: billedQty,
      due_date: dueDate,
    });
  });

  return Array.from(grouped.values())
    .map((row) => {
      const savedQty = savedQtyByProduct.get(getProductKey(row.item_code, row.item_desc)) || 0;
      const remainingQty = Math.max(row.order_qty - savedQty, 0);
      return {
        ...row,
        remaining_qty: remainingQty,
        balance_qty: remainingQty,
      };
    });
}

export default function StockPositionForm() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const recordId = routeId || searchParams.get("id") || "";

  const [viewMode, setViewMode] = useState<ViewMode>("create");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [items, setItems] = useState<EditableRow[]>([]);
  const [stockDate, setStockDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRows, setSavedRows] = useState<SavedStockRow[]>([]);
  const [updatingPartRow, setUpdatingPartRow] = useState<string>("");

  const loadForm = async (showLoader = true) => {
    if (!recordId) return;

    if (showLoader) setLoading(true);
    setError(null);

    try {
      const stockRes = await fetchStockPositionDetail(recordId).catch(() => null);

      if (stockRes?.status) {
        const main = stockRes.data;
        const products: StockPositionProductRow[] = stockRes.products ?? [];
        const sublist: StockPositionSublistRow[] = stockRes.sublist ?? [];
        const [poRes, poProductRes] = await Promise.all([
          fetchPurchaseOrderById(recordId).catch(() => null),
          fetchPurchaseOrderProducts(recordId).catch(() => null),
        ]);
        const po = poRes?.data;
        const poProducts = poProductRes?.data ?? [];
        const customerAddress = [po?.bill_address, po?.district_name_display, po?.state_name_display, po?.pin]
          .filter(Boolean)
          .join("\n");
        const normalizedSavedRows = sublist.map((row, index) => ({
          s_no: index + 1,
          stock_id: row.stock_id || "",
          stock_date: row.stock_date || "",
          product_unique_id: (row as any).product_unique_id || "",
          item_code: "",
          item_desc: "",
          order_qty: toNumber(row.item_qty),
          remaining_qty: toNumber(row.remqty),
          stock_qty: toNumber(row.stock_qty),
          balance_qty: toNumber(row.remaining_qty),
          part_no: row.part_no || "",
        }));
        const savedDisplayMaps = buildProductDisplayMaps(poProducts, products);
        normalizedSavedRows.forEach((row, index) => {
          const sublistRow = sublist[index] as any;
          row.item_code = resolveDisplayItemCode(row.product_unique_id || sublistRow?.product_unique_id, sublistRow?.item_code, savedDisplayMaps);
          row.item_desc = resolveDisplayItemDesc(row.product_unique_id || sublistRow?.product_unique_id, sublistRow?.item_code, sublistRow?.product, savedDisplayMaps);
        });
        const groupedItems = buildProductwiseItems(poProducts, po?.po_date || main.po_date || "", normalizedSavedRows, products);
        const totalQty = groupedItems.reduce((sum, row) => sum + row.order_qty, 0) + normalizedSavedRows.reduce((sum, row) => sum + row.stock_qty, 0);

        setViewMode("create");
        setCustomer({
          name: po?.department_display || main.department_display || main.department || "",
          address: customerAddress || main.department_display || main.department || "",
          phone: po?.contact_number || "",
          email: po?.email || "",
          po_number: po?.po_num || main.po_num || "",
          po_date: po?.po_date || main.po_date || "",
          executive: po?.executive_name_display || main.executive_display || main.executive_name || "",
          executive_id: po?.executive_name || main.executive_name || "",
          no_consignee: toNumber(po?.no_of_consignee || main.no_of_con),
          no_items: groupedItems.length || toNumber(po?.no_of_po || main.no_of_item),
          qty: totalQty || toNumber(po?.total_qty || main.stock_qty),
          value: String(po?.po_value || po?.total_amount || products[0]?.net_value || main.stock_value || 0),
          department: po?.department || main.department || "",
          po_unique_id: po?.po_unique_id || main.po_unique_id || "",
          main_unique_id: main.form_main_unique_id || recordId,
          stock_id: main.stock_id || "",
        });
        setStockDate(formatDateForInput(main.stock_date));
        setSavedRows(normalizedSavedRows);
        setItems(groupedItems);
        return;
      }

      const [poRes, productRes] = await Promise.all([
        fetchPurchaseOrderById(recordId),
        fetchPurchaseOrderProducts(recordId),
      ]);

      const po = poRes.data;
      const products = productRes.data ?? [];
      const customerAddress = [po.bill_address, po.district_name_display, po.state_name_display, po.pin]
        .filter(Boolean)
        .join("\n");
      const groupedItems = buildProductwiseItems(products, po.po_date || "", []);
      const totalQty = groupedItems.reduce((sum, row) => sum + row.order_qty, 0);

      setViewMode("create");
      setCustomer({
        name: po.department_display || po.department || "",
        address: customerAddress,
        phone: po.contact_number || "",
        email: po.email || "",
        po_number: po.po_num || "",
        po_date: po.po_date || "",
        executive: po.executive_name_display || po.executive_name || "",
        executive_id: po.executive_name || "",
        no_consignee: toNumber(po.no_of_consignee),
        no_items: groupedItems.length || toNumber(po.no_of_po),
        qty: totalQty || toNumber(po.total_qty),
        value: String(po.po_value || po.total_amount || 0),
        department: po.department || "",
        po_unique_id: po.po_unique_id || "",
        main_unique_id: po.unique_id || recordId,
        stock_id: "",
      });
      setStockDate(new Date().toISOString().slice(0, 10));
      setSavedRows([]);
      setItems(groupedItems);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load stock position details."));
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (!recordId) return;
    loadForm();
  }, [recordId]);

  const totalStockQty = useMemo(
    () => items.reduce((sum, row) => sum + toNumber(row.stock_qty), 0),
    [items]
  );
  const totalOrderQty = useMemo(
    () => items.reduce((sum, row) => sum + toNumber(row.order_qty), 0),
    [items]
  );
  const totalRemainingQty = useMemo(
    () => items.reduce((sum, row) => sum + toNumber(row.remaining_qty), 0),
    [items]
  );
  const totalStockValue = useMemo(
    () => items.reduce((sum, row) => sum + toNumber(row.stock_qty) * toNumber(row.net_price || row.unit_price), 0),
    [items]
  );

  const setItemField = (rowId: string, field: keyof EditableRow, value: string) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (field === "stock_qty") {
          const nextQty = Math.min(Math.max(toNumber(value), 0), row.remaining_qty || row.order_qty);
          return {
            ...row,
            stock_qty: value === "" ? "" : String(nextQty),
            balance_qty: Math.max((row.remaining_qty || row.order_qty) - nextQty, 0),
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const savedRowKey = (row: SavedStockRow) =>
    [row.stock_id, row.product_unique_id || "", row.item_code, row.item_desc].join("__");

  const setSavedPartNo = (rowKey: string, value: string) => {
    setSavedRows((prev) => prev.map((row) => (savedRowKey(row) === rowKey ? { ...row, part_no: value } : row)));
  };

  const handleUpdatePartNo = async (row: SavedStockRow) => {
    const rowKey = savedRowKey(row);
    const partNo = String(row.part_no || "").trim();
    if (!partNo) {
      await showErrorAlert("Please enter part number.");
      return;
    }

    setUpdatingPartRow(rowKey);
    try {
      const res = await updateStockPositionPartNo(customer.main_unique_id || recordId, {
        stock_id: row.stock_id,
        product_unique_id: row.product_unique_id || "",
        item_code: row.item_code,
        product: row.item_desc,
        part_no: partNo,
      });
      if (!res.status) throw new Error(res.message || res.error || "Failed to update part number.");
      await showSuccessAlert("Part number updated successfully.");
      await loadForm(false);
    } catch (err: any) {
      await showErrorAlert(getErrorMessage(err, "Failed to update part number."));
    } finally {
      setUpdatingPartRow("");
    }
  };

  const handleSave = async () => {
    setError(null);
    const activeProducts = items.filter((row) => toNumber(row.stock_qty) > 0);

    if (!customer.main_unique_id) {
      const message = "Missing purchase order reference.";
      setError(message);
      await showErrorAlert(message);
      return;
    }
    if (!stockDate) {
      const message = "Please select stock date.";
      setError(message);
      await showErrorAlert(message);
      return;
    }
    if (activeProducts.length === 0) {
      const message = "Enter stock quantity for at least one item.";
      setError(message);
      await showErrorAlert(message);
      return;
    }
    if (activeProducts.some((row) => toNumber(row.stock_qty) <= 0)) {
      const message = "Stock quantity must be greater than zero.";
      setError(message);
      await showErrorAlert(message);
      return;
    }
    if (activeProducts.some((row) => !String(row.part_no || "").trim())) {
      const message = "Please enter part number for each selected stock item.";
      setError(message);
      await showErrorAlert(message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        main_unique_id: customer.main_unique_id,
        po_unique_id: customer.po_unique_id,
        po_num: customer.po_number,
        po_date: formatDateForApi(formatDateForInput(customer.po_date)),
        stock_date: formatDateForApi(stockDate),
        no_of_con: customer.no_consignee,
        no_of_items: customer.no_items,
        exe_name: customer.executive_id || customer.executive,
        department: customer.department,
        total_qty: customer.qty,
        net_value: toNumber(customer.value),
        totals: {
          total_stock_qty: totalStockQty,
          total_stock_value: totalStockValue,
        },
        products: activeProducts.map((row) => {
          const stockQty = toNumber(row.stock_qty);
          const rate = row.net_price || row.unit_price;
          return {
            product_unique_id: row.id,
            item_code: row.item_code,
            product: row.item_desc,
            unit_price: row.unit_price,
            net_price: row.net_price,
            product_tax: row.product_tax,
            billed_qty: row.billed_qty,
            item_qty: row.order_qty,
            stock_qty: stockQty,
            remaining_qty: Math.max((row.remaining_qty || row.order_qty) - stockQty, 0),
            remqtyVal: row.remaining_qty || row.order_qty,
            update_stock_qty: stockQty,
            update_stock_value: stockQty * toNumber(rate),
            stock_value: stockQty * toNumber(rate),
            part_no: row.part_no,
          };
        }),
      };

      const res = await createStockPosition(payload);
      if (res.status) {
        await showSuccessAlert("Successfully record saved");
        await loadForm(false);
      } else {
        const message = res.message || res.error || "Failed to save stock position.";
        setError(message);
        await showErrorAlert(message);
      }
    } catch (err: any) {
      const message = getErrorMessage(err, "Failed to save stock position.");
      setError(message);
      await showErrorAlert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h5 className="text-[17px] font-bold text-ink font-head m-0">
          {viewMode === "processing" ? "Stock Position - Processing" : "Stock Position"}
        </h5>
        <nav className="flex items-center gap-1 text-[12.5px] text-ink-muted">
          <span>Purchase</span>
          <i className="fa fa-chevron-right text-[9px] text-line-dark mx-1" />
          <span className="text-ink-secondary font-medium">Stock Position</span>
        </nav>
      </div>

      <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)] p-8">
        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              Loading stock position...
            </span>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-8 rounded-[26px] border border-[#e6ebd8] bg-[linear-gradient(135deg,#fffdf7_0%,#f4f7ed_100%)] p-6 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
              <div className="min-w-[280px] flex-1">
                <p className="text-[11px] font-semibold text-ink-muted tracking-widest uppercase mb-1">
                  Customer Details
                </p>
                <h2 className="mb-2 text-[24px] font-head font-bold leading-snug text-[#42551d]">
                  {customer.name || "-"}
                </h2>
                <p className="text-[12.5px] text-ink-secondary whitespace-pre-line leading-relaxed mb-3">
                  {customer.address || "-"}
                </p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
                    <i className="fa fa-phone text-[11px] text-ink-muted w-4" />
                    {customer.phone || "-"}
                  </div>
                  <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
                    <i className="fa fa-envelope text-[11px] text-ink-muted w-4" />
                    {customer.email || "-"}
                  </div>
                </div>
              </div>

              <div className="min-w-[320px]">
                {[
                  ...(viewMode === "processing" ? [{ label: "Stock Id", value: customer.stock_id || "-" }] : []),
                  { label: "PO Number", value: customer.po_number || "-" },
                  { label: "PO Date", value: formatDateForDisplay(customer.po_date) },
                  { label: "Executive Name", value: customer.executive || "-" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-2 mb-2.5">
                    <span className="text-[12.5px] text-ink-secondary w-36 flex-shrink-0">{label}</span>
                    <span className="text-[12.5px] text-ink-muted mr-3">:</span>
                    <span className="text-[12.5px] text-ink font-medium">{value}</span>
                  </div>
                ))}

                {viewMode === "create" && (
                  <div className="mt-4">
                    <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#66724b]">
                      Stock Date
                    </span>
                    <input name="stockdate"
                      type="date"
                      value={stockDate}
                      onChange={(e) => setStockDate(e.target.value)}
                      className="h-11 w-48 rounded-2xl border border-[#d9ddcf] bg-white px-4 text-[13px] outline-none shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>
                )}
              </div>
            </div>

            {viewMode === "create" && (
              <div className="mb-5 flex flex-wrap gap-10 rounded-[24px] border border-[#ebe3cc] bg-[linear-gradient(135deg,#fffdf6_0%,#f7f2e2_100%)] px-5 py-4 shadow-[0_18px_35px_rgba(120,98,24,0.08)]">
                {[
                  { label: "No.Of Consignee", value: customer.no_consignee },
                  { label: "No.Of Items", value: customer.no_items },
                  { label: "QTY", value: totalOrderQty || customer.qty },
                  { label: "Value", value: customer.value },
                  { label: "Remaining Qty", value: Math.max(totalRemainingQty - totalStockQty, 0) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[12px] text-ink-muted mb-1">{label}</p>
                    <p className="text-[15px] font-bold text-ink">{value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-5 overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
              <table className="w-full text-[12.5px] border-collapse">
                <thead>
                  <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                    {["S.No", "Item Details", "Order QTY", "Remaining QTY", "Stock QTY", "Balance QTY", "Part No.", "Due Date", "Due Days"].map((heading, index) => (
                      <th
                        key={index}
                        className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643] whitespace-nowrap"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-10 text-ink-muted border border-line"
                      >
                        No items available
                      </td>
                    </tr>
                  ) : (
                    items.map((row, index) => (
                      <tr key={row.id} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] transition-colors hover:bg-[#f1f7e6]">
                        <td className="w-10 px-4 py-4 text-center text-[#7a7f69]">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-ink text-[12.5px]">{row.item_code}</div>
                          <div className="text-[11.5px] text-ink-secondary">{row.item_desc}</div>
                        </td>
                        <td className="px-4 py-4 text-center">{row.order_qty}</td>
                        <td className="px-4 py-4 text-center">{row.remaining_qty}</td>
                        <td className="w-36 px-3 py-3">
                          {row.remaining_qty > 0 ? (
                            <input name="stock_qty"
                              type="number"
                              min={0}
                              max={row.remaining_qty || row.order_qty}
                              value={row.stock_qty}
                              onChange={(e) => setItemField(row.id, "stock_qty", e.target.value)}
                              className="w-full rounded-2xl border border-[#e6b1b1] bg-white px-3 py-2 text-center text-[12.5px] text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                            />
                          ) : (
                            <div className="px-2 py-1.5 text-center text-ink-muted">-</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">{row.balance_qty}</td>
                        <td className="w-36 px-3 py-3">
                          <input name="part_no"
                            type="text"
                            value={row.part_no}
                            onChange={(e) => setItemField(row.id, "part_no", e.target.value)}
                            className="w-full rounded-2xl border border-[#c9d9aa] bg-white px-3 py-2 text-center text-[12.5px] text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                          />
                        </td>
                        <td className="px-4 py-4 text-center text-danger font-semibold whitespace-nowrap">
                          {formatDateForDisplay(row.due_date)}
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">{dueDaysFromToday(row.due_date)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mb-4 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {saving ? "Adding..." : "Add Stock"}
              </button>
            </div>

            <div className="mb-5 overflow-x-auto rounded-[26px] border border-[#ebe6d4] bg-white shadow-[0_24px_44px_rgba(47,60,24,0.08)]">
              <table className="w-full text-[12.5px] border-collapse">
                <thead>
                  <tr className="bg-[linear-gradient(135deg,#fcfbf6_0%,#eef3e3_100%)]">
                    {["S.No", "Stock Id", "Stock Date", "Item Details", "Order QTY", "Remaining QTY", "Stock QTY", "Balance QTY", "Part No.", "Action"].map((heading, index) => (
                      <th
                        key={index}
                        className="border-b border-r border-[#d8dec8] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643] whitespace-nowrap"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {savedRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-ink-muted border border-line">
                        No stock entries added yet
                      </td>
                    </tr>
                  ) : (
                    savedRows.map((row) => (
                      <tr key={`${row.stock_id}-${row.s_no}-${row.item_code}`} className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5]">
                        <td className="px-4 py-4 text-center">{row.s_no}</td>
                        <td className="px-4 py-4">{row.stock_id}</td>
                        <td className="px-4 py-4 text-center">{formatDateForDisplay(row.stock_date)}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-ink text-[12.5px]">{row.item_code}</div>
                          <div className="text-[11.5px] text-ink-secondary">{row.item_desc}</div>
                        </td>
                        <td className="px-4 py-4 text-right">{row.order_qty}</td>
                        <td className="px-4 py-4 text-right">{row.remaining_qty}</td>
                        <td className="px-4 py-4 text-right">{row.stock_qty}</td>
                        <td className="px-4 py-4 text-right">{row.balance_qty}</td>
                        <td className="w-40 px-3 py-3">
                          <input
                            name="saved_part_no"
                            type="text"
                            value={row.part_no}
                            onChange={(e) => setSavedPartNo(savedRowKey(row), e.target.value)}
                            className="w-full rounded-2xl border border-[#c9d9aa] bg-white px-3 py-2 text-center text-[12.5px] text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => void handleUpdatePartNo(row)}
                            disabled={updatingPartRow === savedRowKey(row)}
                            className="rounded-2xl border border-[#4f7a2b] bg-[#f4f8ed] px-4 py-2 text-[12px] font-semibold text-[#4f7a2b] transition-colors hover:bg-[#4f7a2b] hover:text-white disabled:opacity-60"
                          >
                            {updatingPartRow === savedRowKey(row) ? "Updating..." : "Update"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#edf1e4] pt-5">
              <button
                onClick={() => navigate("/purchase/stock-position/list")}
                className="rounded-2xl border border-[#f0b8a8] bg-[#fff3ef] px-6 py-2.5 text-[13px] font-medium text-[#d45b35] transition-colors hover:bg-[#ffe7df]"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
