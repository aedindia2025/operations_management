import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

type NativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  dropdownPortal?: boolean;
};

type ParsedOption = {
  key: string;
  value: string;
  label: string;
  disabled: boolean;
};

function flattenOptions(children: NativeSelectProps["children"]): ParsedOption[] {
  const options: ParsedOption[] = [];
  let optionIndex = 0;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === "option") {
      const value = child.props.value != null ? String(child.props.value) : String(child.props.children ?? "");
      const label = Children.toArray(child.props.children).join("").trim();
      options.push({
        key: `option-${optionIndex}`,
        value,
        label,
        disabled: Boolean(child.props.disabled),
      });
      optionIndex += 1;
      return;
    }

    if (child.type === "optgroup") {
      Children.forEach(child.props.children, (nestedChild) => {
        if (!isValidElement(nestedChild) || nestedChild.type !== "option") return;
        const value =
          nestedChild.props.value != null
            ? String(nestedChild.props.value)
            : String(nestedChild.props.children ?? "");
        const label = Children.toArray(nestedChild.props.children).join("").trim();
        options.push({
          key: `option-${optionIndex}`,
          value,
          label,
          disabled: Boolean(child.props.disabled || nestedChild.props.disabled),
        });
        optionIndex += 1;
      });
    }
  });

  return options;
}

export default function SearchableSelectInput({
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  className = "",
  dropdownPortal = true,
  id,
  name,
  ...rest
}: NativeSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const generatedId = useId().replace(/:/g, "");
  const options = useMemo(() => flattenOptions(children), [children]);
  const controlId = id ?? `searchable-select-${generatedId}`;
  const fieldName = name ?? controlId.replace(/[^a-zA-Z0-9_-]+/g, "_");

  const selectedValue =
    value != null ? String(value) : defaultValue != null ? String(defaultValue) : "";

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue) ?? null,
    [options, selectedValue]
  );

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  const firstEnabledIndex = useMemo(
    () => filteredOptions.findIndex((option) => !option.disabled),
    [filteredOptions]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDropdownStyle(null);
      setHighlightedIndex(-1);
      optionRefs.current = [];
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updateDropdownPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 12;
      const gap = 8;
      const preferredHeight = 320;
      const minHeight = 120;
      const availableBelow = Math.max(0, window.innerHeight - rect.bottom - viewportPadding - gap);
      const availableAbove = Math.max(0, rect.top - viewportPadding - gap);
      const openAbove = availableBelow < minHeight && availableAbove > availableBelow;
      const maxHeight = Math.max(minHeight, Math.min(preferredHeight, openAbove ? availableAbove : availableBelow));

      setDropdownStyle({
        top: openAbove ? Math.max(viewportPadding, rect.top - gap - maxHeight) : rect.bottom + gap,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    };

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = filteredOptions.findIndex((option) => option.value === selectedValue && !option.disabled);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex);
  }, [open, filteredOptions, selectedValue, firstEnabledIndex]);

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSelect = (nextValue: string) => {
    if (!onChange) {
      setOpen(false);
      return;
    }
    const event = {
      target: { value: nextValue, name: fieldName },
      currentTarget: { value: nextValue, name: fieldName },
    } as ChangeEvent<HTMLSelectElement>;
    onChange(event);
    setOpen(false);
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (!filteredOptions.length) return;
    let nextIndex = highlightedIndex;
    for (let step = 0; step < filteredOptions.length; step += 1) {
      nextIndex = nextIndex < 0 ? (direction > 0 ? 0 : filteredOptions.length - 1) : nextIndex + direction;
      if (nextIndex < 0) nextIndex = filteredOptions.length - 1;
      if (nextIndex >= filteredOptions.length) nextIndex = 0;
      if (!filteredOptions[nextIndex]?.disabled) {
        setHighlightedIndex(nextIndex);
        return;
      }
    }
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
        if (target && !target.disabled) {
          handleSelect(target.value);
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
      if (target && !target.disabled) {
        event.preventDefault();
        handleSelect(target.value);
      }
    }
  };

  const normalizedButtonClassName = className
    .replace(/\bappearance-none\b/g, "")
    .replace(/\bpr-10\b/g, "")
    .trim();

  return (
    <div ref={rootRef} className="relative">
      <button
        id={controlId}
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleButtonKeyDown}
        className={`flex w-full items-center justify-between gap-3 ${normalizedButtonClassName}`}
      >
        <span className="truncate text-left">
          {selectedOption?.label || options.find((option) => option.value === "")?.label || "Select"}
        </span>
        <i className={`fa fa-chevron-${open ? "up" : "down"} text-[11px] text-[#85794c]`} />
      </button>

      {open && (dropdownPortal ? dropdownStyle : true)
        ? dropdownPortal
          ? createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[999] overflow-hidden rounded-[18px] border border-[#d9d0ae] bg-white shadow-[0_18px_38px_rgba(78,88,31,0.16)]"
              style={{
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: dropdownStyle.width,
              }}
            >
              <div className="border-b border-[#eee5c7] p-2.5">
                <label htmlFor={`${controlId}-search`} className="sr-only">
                  Search options
                </label>
                <input
                  id={`${controlId}-search`}
                  name={`${fieldName}_search`}
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search..."
                  className="w-full rounded-xl border border-[#d7cfb1] bg-[#fffef8] px-3 py-2 text-[13px] outline-none transition focus:border-[#7b962f] focus:ring-4 focus:ring-[#9fba4d]/15"
                />
              </div>
              <div className="overflow-y-auto py-1.5" style={{ maxHeight: dropdownStyle.maxHeight }}>
                {filteredOptions.length ? (
                  filteredOptions.map((option, index) => {
                    const active = option.value === selectedValue;
                    const highlighted = highlightedIndex === index;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => handleSelect(option.value)}
                        ref={(node) => {
                          optionRefs.current[index] = node;
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px] transition ${
                          option.disabled
                            ? "cursor-not-allowed text-[#b2b7a7]"
                            : highlighted
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
            </div>,
            document.body
          )
          : (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full z-[999] mt-2 overflow-hidden rounded-[18px] border border-[#d9d0ae] bg-white shadow-[0_18px_38px_rgba(78,88,31,0.16)]"
            >
              <div className="border-b border-[#eee5c7] p-2.5">
                <label htmlFor={`${controlId}-search`} className="sr-only">
                  Search options
                </label>
                <input
                  id={`${controlId}-search`}
                  name={`${fieldName}_search`}
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search..."
                  className="w-full rounded-xl border border-[#d7cfb1] bg-[#fffef8] px-3 py-2 text-[13px] outline-none transition focus:border-[#7b962f] focus:ring-4 focus:ring-[#9fba4d]/15"
                />
              </div>
              <div className="max-h-[320px] overflow-y-auto py-1.5">
                {filteredOptions.length ? (
                  filteredOptions.map((option, index) => {
                    const active = option.value === selectedValue;
                    const highlighted = highlightedIndex === index;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => handleSelect(option.value)}
                        ref={(node) => {
                          optionRefs.current[index] = node;
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px] transition ${
                          option.disabled
                            ? "cursor-not-allowed text-[#b2b7a7]"
                            : highlighted
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
          )
        : null}

      <select
        {...rest}
        id={`${controlId}-native`}
        name={fieldName}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        {Children.map(children, (child, index) => {
          if (!isValidElement(child)) return child;
          if (child.type === "optgroup") {
            return cloneElement(child as ReactElement, {
              key: `optgroup-${index}`,
              children: Children.map(child.props.children, (nestedChild, nestedIndex) => {
                if (!isValidElement(nestedChild)) return nestedChild;
                return cloneElement(nestedChild as ReactElement, {
                  key: `option-${index}-${nestedIndex}`,
                });
              }),
            });
          }

          return cloneElement(child as ReactElement, {
            key: `option-${index}`,
          });
        })}
      </select>
    </div>
  );
}
