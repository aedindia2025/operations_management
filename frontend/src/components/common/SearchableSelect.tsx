import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string;
};

interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

export default function SearchableSelect({
  value,
  options,
  onChange,
  id,
  name,
  placeholder = "Select",
  searchPlaceholder = "Search...",
  disabled = false,
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const generatedId = useId().replace(/:/g, "");
  const controlId = id ?? `searchable-select-${generatedId}`;
  const fieldName = name ?? controlId.replace(/[^a-zA-Z0-9_-]+/g, "_");

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      [option.label, option.value, option.keywords ?? ""].join(" ").toLowerCase().includes(needle)
    );
  }, [options, query]);

  const firstOptionIndex = filteredOptions.length > 0 ? 0 : -1;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightedIndex(-1);
      optionRefs.current = [];
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = filteredOptions.findIndex((option) => option.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : firstOptionIndex);
  }, [open, filteredOptions, value, firstOptionIndex]);

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const moveHighlight = (direction: 1 | -1) => {
    if (!filteredOptions.length) return;
    let nextIndex = highlightedIndex;
    if (nextIndex < 0) {
      setHighlightedIndex(direction > 0 ? 0 : filteredOptions.length - 1);
      return;
    }
    nextIndex += direction;
    if (nextIndex < 0) nextIndex = filteredOptions.length - 1;
    if (nextIndex >= filteredOptions.length) nextIndex = 0;
    setHighlightedIndex(nextIndex);
  };

  const handleButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        const target = highlightedIndex >= 0 ? filteredOptions[highlightedIndex] : null;
        if (target) {
          onChange(target.value);
          setOpen(false);
          return;
        }
      }
      setOpen((prev) => !prev);
    }
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter") {
      const target = highlightedIndex >= 0 ? filteredOptions[highlightedIndex] : null;
      if (target) {
        event.preventDefault();
        onChange(target.value);
        setOpen(false);
      }
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={controlId}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleButtonKeyDown}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-[#d7cfb1] bg-white px-4 py-3 text-left text-[13px] outline-none transition focus:border-[#7b962f] focus:ring-4 focus:ring-[#9fba4d]/15 disabled:cursor-not-allowed disabled:bg-[#f5f5ef] disabled:text-[#98a083] ${buttonClassName}`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <i className={`fa fa-chevron-${open ? "up" : "down"} text-[11px] text-[#85794c]`} />
      </button>

      {open ? (
        <div
          className={`absolute left-0 top-full z-[70] mt-2 w-full overflow-hidden rounded-[20px] border border-[#d9d0ae] bg-white shadow-[0_18px_38px_rgba(78,88,31,0.16)] ${dropdownClassName}`}
        >
          <div className="border-b border-[#eee5c7] p-2.5">
            <input
              id={`${controlId}-search`}
              name={`${fieldName}_search`}
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-[#d7cfb1] bg-[#fffef8] px-3 py-2 text-[13px] outline-none transition focus:border-[#7b962f] focus:ring-4 focus:ring-[#9fba4d]/15"
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-1.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const active = option.value === value;
                const highlighted = highlightedIndex === filteredOptions.indexOf(option);
                return (
                  <button
                    key={`${option.value}-${option.label}`}
                    type="button"
                    ref={(node) => {
                      optionRefs.current[filteredOptions.indexOf(option)] = node;
                    }}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px] transition ${
                      highlighted
                        ? "bg-[#f8f7ef] text-[#384125]"
                        : active
                        ? "bg-[linear-gradient(135deg,#eef5db_0%,#f8f6e8_100%)] font-semibold text-[#4f6f22]"
                        : "text-[#384125] hover:bg-[#f8f7ef]"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {active ? <i className="fa fa-check text-[11px] text-[#6f9226]" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-[13px] text-[#8a9277]">No options found</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
