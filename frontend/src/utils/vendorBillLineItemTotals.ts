export type NumericLike = number | string | null | undefined;

export type VendorBillLineItemTotals = {
  unitPriceTotal: number;
  basicAmountTotal: number;
  gstAmountTotal: number;
  totalAmountTotal: number;
  gstLabel: string;
};

function toNumber(value: NumericLike) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return 0;

  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

function toGstLabel(value: NumericLike) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  if (normalized === "-" || normalized === "null" || normalized === "undefined" || normalized === "nan") {
    return "";
  }

  return raw.endsWith("%") ? raw : `${raw} %`;
}

export function calculateVendorBillLineItemTotals<T>(
  items: T[],
  selectors: {
    unitPrice: (item: T) => NumericLike;
    basicAmount: (item: T) => NumericLike;
    gst?: (item: T) => NumericLike;
    gstAmount: (item: T) => NumericLike;
    totalAmount: (item: T) => NumericLike;
  },
): VendorBillLineItemTotals {
  const gstValues = Array.from(
    new Set(
      items
        .map((item) => toGstLabel(selectors.gst?.(item)))
        .filter((value) => value !== ""),
    ),
  );

  return items.reduce<VendorBillLineItemTotals>(
    (totals, item) => ({
      unitPriceTotal: totals.unitPriceTotal + toNumber(selectors.unitPrice(item)),
      basicAmountTotal: totals.basicAmountTotal + toNumber(selectors.basicAmount(item)),
      gstAmountTotal: totals.gstAmountTotal + toNumber(selectors.gstAmount(item)),
      totalAmountTotal: totals.totalAmountTotal + toNumber(selectors.totalAmount(item)),
      gstLabel: totals.gstLabel,
    }),
    {
      unitPriceTotal: 0,
      basicAmountTotal: 0,
      gstAmountTotal: 0,
      totalAmountTotal: 0,
      gstLabel: gstValues.join(", ") || "-",
    },
  );
}