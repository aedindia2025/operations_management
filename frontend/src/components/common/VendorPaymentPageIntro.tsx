import type { ReactNode } from "react";

type IntroMetric = {
  label: string;
  value: ReactNode;
};

interface VendorPaymentPageIntroProps {
  title: string;
  description?: string;
  metrics: IntroMetric[];
  showTitle?: boolean;
  showDescription?: boolean;
  showWorkspaceLabel?: boolean;
}

export default function VendorPaymentPageIntro({
  title,
  description,
  metrics,
  showTitle = false,
  showDescription = false,
  showWorkspaceLabel = false,
}: VendorPaymentPageIntroProps) {
  const hasIntroContent = showWorkspaceLabel || showTitle || (showDescription && Boolean(description));

  return (
    <div className="mt-4 overflow-hidden rounded-[30px] border border-[#e8e1c7] bg-[linear-gradient(135deg,#fffdf7_0%,#f8fbef_42%,#ffffff_100%)] shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
      <div className="px-6 py-5 md:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {hasIntroContent ? (
            <div className="max-w-3xl">
              {showWorkspaceLabel ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a8753]">
                  Vendor Payment Workspace
                </p>
              ) : null}
              {showTitle ? (
                <h2 className="mt-2 text-[24px] font-bold text-[#3f5222] md:text-[28px]">
                  {title}
                </h2>
              ) : null}
              {showDescription && description ? (
                <p className={`${showTitle ? "mt-2" : "mt-3"} max-w-2xl text-[13px] leading-6 text-ink-secondary md:text-[14px]`}>
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 xl:ml-auto xl:justify-end">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="min-w-[148px] rounded-[20px] border border-[#ded5b6] bg-white px-4 py-3 shadow-[0_12px_28px_rgba(84,96,28,0.06)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#859168]">
                  {metric.label}
                </p>
                <div className="mt-1 text-[17px] font-bold text-[#405221]">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
