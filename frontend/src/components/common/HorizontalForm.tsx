import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

type FieldIdentity = {
  idBase: string;
  nameBase: string;
};

const FieldIdentityContext = createContext<FieldIdentity | null>(null);

function slugifyLabel(label: string) {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "field"
  );
}

export function HorizontalFormCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mt-4 overflow-hidden rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

export function HorizontalFormBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-8 xl:p-10 ${className}`}>{children}</div>;
}

export function HorizontalFormTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={`mb-6 text-[22px] font-bold text-[#42551d] font-head ${className}`}>{children}</h2>;
}

export function HorizontalFormColumns({
  left,
  right,
}: {
  left: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-4 xl:items-start">
      <div className="space-y-4">{left}</div>
      {right ? <div className="space-y-4">{right}</div> : null}
    </div>
  );
}

export function HorizontalFormRow({
  label,
  children,
  alignTop = false,
}: {
  label: string;
  children: ReactNode;
  alignTop?: boolean;
}) {
  const generatedId = useId().replace(/:/g, "");
  const slug = slugifyLabel(label);
  const idBase = `${slug}-${generatedId}`;
  const nameBase = slug.replace(/-/g, "_");

  return (
    <div className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-5">
      <label
        htmlFor={idBase}
        className={`text-[15px] font-medium text-[#566146] ${alignTop ? "pt-1.5" : "pt-2"}`}
      >
        {label}
      </label>
      <FieldIdentityContext.Provider value={{ idBase, nameBase }}>
        <div>{children}</div>
      </FieldIdentityContext.Provider>
    </div>
  );
}

export function HorizontalFormActions({
  onCancel,
  saving,
  submitLabel,
}: {
  onCancel: () => void;
  saving?: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-[#edf1e4] bg-white px-8 py-5">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-2xl border border-[#f0b8a8] bg-[#fff3ef] px-6 py-2.5 font-medium text-[#d45b35] transition-colors hover:bg-[#ffe7df]"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(79,122,43,0.30)] disabled:opacity-60"
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

export function HorizontalFieldShell({
  children,
  select = false,
  textarea = false,
  invalid = false,
}: {
  children: ReactNode;
  select?: boolean;
  textarea?: boolean;
  invalid?: boolean;
}) {
  const fieldIdentity = useContext(FieldIdentityContext);
  const mappedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child) || !fieldIdentity) return child;

    const suffix = index === 0 ? "" : `-${index + 1}`;
    const childId = `${fieldIdentity.idBase}${suffix}`;
    const childName = `${fieldIdentity.nameBase}${suffix ? `_${index + 1}` : ""}`;

    return cloneElement(child as ReactElement, {
      id: child.props.id ?? childId,
      name: child.props.name ?? childName,
    });
  });

  const shellClasses = invalid
    ? "border-[#ff6d4d] bg-white focus-within:border-[#ff6d4d] focus-within:ring-[#ff6d4d]/10"
    : "border-[#d7dec8] bg-[#fcfdf9] focus-within:border-brand-500 focus-within:ring-brand-500/10";

  return (
    <div className={`relative rounded-2xl border shadow-sm focus-within:ring-4 ${shellClasses}`}>
      {mappedChildren}
      {invalid ? (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-[#ff6d4d]">
          <i className="fa fa-circle-exclamation" />
        </span>
      ) : null}
      {select && !invalid ? (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-[#858585]">
          <i className="fa fa-chevron-down" />
        </span>
      ) : null}
      {textarea ? null : null}
    </div>
  );
}

export const horizontalInputCls =
  "w-full rounded-2xl border border-transparent bg-transparent px-4 py-3 text-[14px] outline-none transition-all placeholder:text-[#8c93a8]";

export const horizontalSelectCls = `${horizontalInputCls} appearance-none pr-10`;
export const horizontalTextareaCls = `${horizontalInputCls} min-h-[114px] resize-none`;
