import { useNavigate } from "react-router-dom";

interface PageTopbarProps {
  title: string;
  breadcrumbs?: string[];
  addLink?: string;
  addLabel?: string;
}

export default function PageTopbar({
  title,
  breadcrumbs = [],
  addLink,
  addLabel = "Add New",
}: PageTopbarProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-[22px] border border-[#e5e8d7] bg-[linear-gradient(135deg,#fcfdf8_0%,#edf4e0_52%,#f9f4e6_100%)] px-5 py-4 shadow-[0_14px_34px_rgba(46,61,24,0.08)] lg:flex-row lg:items-center lg:justify-between">
      <div>
        <nav className="flex flex-wrap items-center gap-1 text-[12px] font-medium text-[#7d8665]">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <i className="fa fa-chevron-right text-[9px] text-[#a4ad8e]"></i>}
              <span className={i === breadcrumbs.length - 1 ? "font-semibold text-[#55612f]" : ""}>{b}</span>
            </span>
          ))}
        </nav>
        <h5 className="mt-2 m-0 text-[22px] font-bold tracking-[-0.03em] text-[#223016] font-head">
          {title}
        </h5>
      </div>

      <div className="flex items-center gap-4">
        {addLink && (
          <button
            onClick={() => navigate(addLink)}
            className="group inline-flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(79,122,43,0.30)]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/30">
              <i className="fa fa-plus text-[11px]"></i>
            </span>
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
