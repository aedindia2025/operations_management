export type SortDirection = "asc" | "desc" | null;

export function getComparableTableValue(value: unknown) {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();

  const text = String(value ?? "").trim();
  if (!text) return "";

  const numericText = text.replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(numericText)) return Number(numericText);

  const parsedDate = Date.parse(text);
  if (!Number.isNaN(parsedDate) && /[-/]/.test(text)) return parsedDate;

  return text.toLowerCase();
}

export function compareTableValues(left: unknown, right: unknown) {
  const a = getComparableTableValue(left);
  const b = getComparableTableValue(right);

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function getNextSortState<T>(activeKey: T | null, activeDirection: SortDirection, nextKey: T) {
  if (activeKey !== nextKey) {
    return { sortKey: nextKey, sortDir: "asc" as const };
  }

  if (activeDirection === "asc") {
    return { sortKey: nextKey, sortDir: "desc" as const };
  }

  if (activeDirection === "desc") {
    return { sortKey: null, sortDir: null };
  }

  return { sortKey: nextKey, sortDir: "asc" as const };
}

export function getAriaSortValue<T>(activeKey: T | null, activeDirection: SortDirection, key: T) {
  if (activeKey !== key || !activeDirection) return "none" as const;
  return activeDirection === "asc" ? "ascending" as const : "descending" as const;
}

export function sortTableRows<T, TKey>(
  rows: T[],
  sortKey: TKey | null,
  sortDir: SortDirection,
  getValue: (row: T, key: TKey) => unknown
) {
  if (!sortKey || !sortDir) return rows;

  return [...rows].sort((left, right) => {
    const result = compareTableValues(getValue(left, sortKey), getValue(right, sortKey));
    return sortDir === "asc" ? result : -result;
  });
}
