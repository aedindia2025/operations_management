type PageTabItem<T extends string> = {
  value: T;
  label: string;
};

interface PageTabsProps<T extends string> {
  items: ReadonlyArray<PageTabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}

export default function PageTabs<T extends string>({
  items,
  value,
  onChange,
  compact = false,
}: PageTabsProps<T>) {
  return (
    <div className={`flex flex-wrap border-b border-[#ece5ca] px-5 ${compact ? "gap-1 pt-3" : "gap-2 pt-4"}`}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`border text-[13px] font-semibold transition-all ${
              compact ? "rounded-t-[18px] px-5 py-2.5" : "rounded-t-[20px] px-5 py-3"
            } ${
              active
                ? "border-[#6f8d28] bg-[linear-gradient(135deg,#7fa230_0%,#6f9226_60%,#62801f_100%)] text-white shadow-[0_10px_20px_rgba(108,138,38,0.25)]"
                : "border-[#e2ddca] bg-white text-ink-secondary hover:border-[#b8c77f] hover:text-brand-700"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
