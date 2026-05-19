export interface ApprovalStep {
  step: number;
  label: string;
  by?: string | null;
  at?: string | null;
  status?: string | null;
  extra?: string | null;
}

type StepKind = "done" | "rejected" | "pending" | "none";

function classifyStatus(status?: string | null): StepKind {
  const val = (status ?? "").trim().toLowerCase();
  if (val.includes("reject")) return "rejected";
  if (val.includes("approve") || val.includes("paid") || val.includes("created")) return "done";
  if (val && val !== "-") return "pending";
  return "none";
}

const CFG: Record<StepKind, {
  circle: string;
  glow: string;
  connector: string;
  cardBg: string;
  cardBorder: string;
  labelColor: string;
  nameColor: string;
  badge: string;
  badgeDot: string;
  icon: string;
}> = {
  done: {
    circle:      "bg-[#5b8a2a]",
    glow:        "shadow-[0_0_0_4px_rgba(91,138,42,0.15),0_2px_8px_rgba(91,138,42,0.25)]",
    connector:   "bg-[#a8c47a]",
    cardBg:      "bg-[#f2f6e8]",
    cardBorder:  "border-[#c8d9a0]",
    labelColor:  "text-[#4a6e1e]",
    nameColor:   "text-[#3d5a20]",
    badge:       "bg-[#5b8a2a] text-white",
    badgeDot:    "bg-[#a8c47a]",
    icon:        "fa-check",
  },
  rejected: {
    circle:      "bg-[#b94040]",
    glow:        "shadow-[0_0_0_4px_rgba(185,64,64,0.15),0_2px_8px_rgba(185,64,64,0.20)]",
    connector:   "bg-[#dba0a0]",
    cardBg:      "bg-[#fdf2f2]",
    cardBorder:  "border-[#e8b8b8]",
    labelColor:  "text-[#993333]",
    nameColor:   "text-[#7a2a2a]",
    badge:       "bg-[#b94040] text-white",
    badgeDot:    "bg-[#dba0a0]",
    icon:        "fa-xmark",
  },
  pending: {
    circle:      "bg-[#b8922a]",
    glow:        "shadow-[0_0_0_4px_rgba(184,146,42,0.15),0_2px_8px_rgba(184,146,42,0.20)]",
    connector:   "bg-[#e6dfcb]",
    cardBg:      "bg-[#fdf8ed]",
    cardBorder:  "border-[#e0d0a0]",
    labelColor:  "text-[#8a6e20]",
    nameColor:   "text-[#6b5418]",
    badge:       "bg-[#b8922a] text-white",
    badgeDot:    "bg-[#e0c870]",
    icon:        "fa-clock",
  },
  none: {
    circle:      "bg-[#e8e4d8] border-2 border-dashed border-[#c8c0a8]",
    glow:        "",
    connector:   "bg-[#e6dfcb]",
    cardBg:      "bg-[#fafaf6]",
    cardBorder:  "border-[#e6dfcb]",
    labelColor:  "text-[#9a9480]",
    nameColor:   "text-[#b8b090]",
    badge:       "bg-[#ede8d8] text-[#9a9480] border border-[#d8d0b8]",
    badgeDot:    "bg-[#c8c0a8]",
    icon:        "",
  },
};

export default function ApprovalStepsCard({
  steps,
  title = "Approval History",
}: {
  steps: ApprovalStep[];
  title?: string;
}) {
  if (!steps.length) return null;

  const doneCount = steps.filter((s) => classifyStatus(s.status) === "done").length;
  const totalCount = steps.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="rounded-xl overflow-hidden border border-[#d8d0b8] shadow-[0_2px_12px_rgba(91,100,29,0.08)]">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #4a5a14 0%, #6b7c22 60%, #5b6e1a 100%)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white/15">
            <i className="fa fa-list-check text-white text-[11px]" />
          </div>
          <span className="text-[12px] font-bold text-white tracking-widest uppercase">{title}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10.5px] text-white/70 font-semibold">{doneCount}/{totalCount} Done</span>
          <div className="h-1.5 w-16 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/80 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────────────────────── */}
      <div className="bg-[#fcfbf5] px-5 pt-7 pb-5 overflow-x-auto">
        <div className="flex items-start" style={{ minWidth: steps.length * 136 }}>
          {steps.map((step, idx) => {
            const kind = classifyStatus(step.status);
            const c = CFG[kind];
            const hasBy = Boolean((step.by ?? "").trim() && step.by !== "-");
            const hasAt = Boolean((step.at ?? "").trim() && step.at !== "-");
            const isLast = idx === steps.length - 1;
            const prevKind = idx > 0 ? classifyStatus(steps[idx - 1].status) : "none";
            const displayStatus = kind !== "none" ? (step.status ?? "") : "Pending";

            return (
              <div key={step.step} className="flex-1 flex flex-col items-center">

                {/* Circle + connectors */}
                <div className="flex items-center w-full mb-4">
                  {idx > 0 ? (
                    <div className={`flex-1 h-[3px] rounded-full ${CFG[prevKind].connector}`} />
                  ) : (
                    <div className="flex-1" />
                  )}

                  <div className="relative shrink-0">
                    {/* Pulse ring for pending */}
                    {kind === "pending" && (
                      <span className="absolute inset-0 rounded-full animate-ping bg-[#b8922a] opacity-20" />
                    )}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 relative ${c.circle} ${c.glow}`}>
                      {c.icon ? (
                        <i className={`fa ${c.icon} text-white text-[14px]`} />
                      ) : (
                        <span className="text-[12px] font-bold text-[#9a9480]">{step.step}</span>
                      )}
                    </div>
                    {/* Step number pip */}
                    <div
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center z-20 border border-white"
                      style={{ background: "#5b641d" }}
                    >
                      <span className="text-[8px] font-bold text-white leading-none">{step.step}</span>
                    </div>
                  </div>

                  {!isLast ? (
                    <div className={`flex-1 h-[3px] rounded-full ${c.connector}`} />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>

                {/* Info card */}
                <div className={`w-full max-w-[130px] rounded-lg border ${c.cardBorder} ${c.cardBg} px-2.5 py-2.5 flex flex-col items-center gap-1`}>
                  {/* Label */}
                  <p className={`text-[9px] font-extrabold tracking-widest uppercase leading-tight text-center ${c.labelColor}`}>
                    {step.label}
                  </p>

                  {/* Separator */}
                  <div className="w-8 h-px bg-[#e6dfcb]" />

                  {/* Name */}
                  {hasBy ? (
                    <p className={`text-[11px] font-bold leading-tight text-center ${c.nameColor}`}>{step.by}</p>
                  ) : (
                    <p className="text-[11px] text-[#c8c0a8] font-medium">—</p>
                  )}

                  {/* Date */}
                  {hasAt ? (
                    <div className="flex items-center gap-1 text-[10px] text-[#7a7260]">
                      <i className="fa fa-calendar-days text-[9px] text-[#718039]" />
                      <span className="font-medium">{step.at}</span>
                    </div>
                  ) : (
                    <div className="h-[14px]" />
                  )}

                  {/* Extra */}
                  {step.extra && step.extra !== "-" ? (
                    <p className="text-[10px] text-[#7a7260] font-medium">{step.extra}</p>
                  ) : null}

                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${c.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.badgeDot}`} />
                    {displayStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
