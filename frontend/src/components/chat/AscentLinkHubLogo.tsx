type AscentLinkHubLogoProps = {
  compact?: boolean;
  subtitle?: string;
};

function IconMark({ compact = false }: { compact?: boolean }) {
  const shellSize = compact ? "h-7 w-7 rounded-[12px]" : "h-14 w-14 rounded-[20px]";
  const iconSize = compact ? "h-4 w-4" : "h-7 w-7";
  const badgeSize = compact ? "h-3.5 w-3.5 text-[7px]" : "h-5.5 w-5.5 text-[9px]";

  return (
    <span
      className={`relative isolate flex ${shellSize} items-center justify-center overflow-hidden border border-white/70 bg-[radial-gradient(circle_at_28%_25%,#a6c563_0%,#6d8b2b_38%,#314716_100%)] shadow-[0_16px_30px_rgba(62,92,24,0.28)]`}
    >
      <span className="absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(145deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.02)_45%,rgba(0,0,0,0.08)_100%)]" />
      <span className="absolute -top-2 right-0 h-5 w-5 rounded-full bg-[#f5de79]/40 blur-md" />
      <span className="absolute -left-1 bottom-1 h-4 w-4 rounded-full bg-white/12 blur-sm" />
      <svg viewBox="0 0 48 48" className={`${iconSize} relative z-[1]`} fill="none" aria-hidden="true">
        <path
          d="M10 31.5C14.5 29.8 17 26.8 19.3 23.9C22 20.6 24.6 17.4 30 15.2C33.1 13.9 36 12.1 39 9.4"
          stroke="white"
          strokeWidth="3.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M30.7 9.4H39V17.6" stroke="white" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="11.5" cy="31.5" r="3.4" fill="white" />
        <circle cx="20.8" cy="22.4" r="2.8" fill="#f4f8e8" />
        <circle cx="30.6" cy="15" r="2.8" fill="#f5de79" />
      </svg>
      <span
        className={`absolute bottom-1 right-1 z-[2] flex ${badgeSize} items-center justify-center rounded-full border border-white/70 bg-white/92 font-black tracking-[0.08em] text-[#577122] shadow-[0_3px_10px_rgba(29,47,12,0.18)]`}
      >
        +
      </span>
    </span>
  );
}

export default function AscentLinkHubLogo({ compact = false, subtitle }: AscentLinkHubLogoProps) {
  if (compact) {
    return (
      <IconMark compact />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-4">
      <IconMark />
      <div className="min-w-0">
        <div className="truncate text-[14px] font-black uppercase tracking-[0.22em] text-[#6d8450]">AscentLink Hub</div>
        {subtitle ? <div className="mt-1 truncate text-[22px] font-black leading-tight text-[#223016]">{subtitle}</div> : null}
      </div>
    </div>
  );
}
