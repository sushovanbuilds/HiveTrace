/**
 * CSS-only honey jar + ribbon visuals used on the consumer verification flow.
 * No external assets; matches the warm-honey editorial look of the Stitch screens.
 */
import { Icon } from "@/components/icons";

export function HoneyJar({
  code,
  honeyType = "Pure Mustard Honey",
  className = "",
}: {
  code: string;
  honeyType?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-outline-variant/40 shadow-[0_20px_50px_-20px_rgba(124,88,0,0.5)] ${className}`}
    >
      {/* Warm studio backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#fdf3d7_0%,#fbf0cd_28%,#f3dd9d_60%,#eac982_100%)]" />
      {/* Honey fill */}
      <div className="absolute right-[9%] left-[9%] top-[16%] h-[46%] rounded-b-[36%/30%] rounded-t-[10px] bg-[linear-gradient(135deg,#f7c948_0%,#eaa220_55%,#c97b05_100%)] shadow-[inset_0_10px_18px_-10px_rgba(120,60,0,0.55)]">
        <div className="absolute inset-x-3 top-2 h-2 rounded-full bg-white/40 blur-[1px]" />
      </div>
      {/* Lid */}
      <div className="absolute left-[8%] top-[7%] h-[9%] w-[84%] rounded-[4px] bg-[linear-gradient(180deg,#8a5a12_0%,#5f3b05_100%)]" />
      {/* Label */}
      <div className="absolute left-[22%] top-[24%] flex w-[56%] flex-col items-center rounded-md border border-[#e0b45e]/70 bg-[#fffdf6] px-2 py-2 shadow-sm">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-[#bd8116] [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]" />
        <p className="mt-0.5 text-center text-[9px] font-bold leading-tight tracking-tight text-[#5f3b05]">
          {honeyType}
        </p>
        <p className="mt-0.5 font-mono text-[7px] tracking-widest text-[#8a5a12]">{code}</p>
      </div>
      {/* Golden sparkle */}
      <div className="absolute right-[24%] top-[48%] h-6 w-6 rounded-full bg-white/35 blur-[6px]" />
    </div>
  );
}

export function VerifiedRibbon({
  tone = "ok",
  message,
  detail,
}: {
  tone: "ok" | "warn" | "bad" | "info";
  message: string;
  detail: string;
}) {
  const map = {
    ok: {
      chip: "border border-tertiary-container/30 bg-tertiary-container/25",
      icon: "check_circle",
      iconCls: "text-tertiary",
      textCls: "text-tertiary",
      strip: "bg-tertiary-container/20 text-on-tertiary-container",
    },
    warn: {
      chip: "border border-primary-container/50 bg-primary-fixed/50",
      icon: "warning",
      iconCls: "text-primary",
      textCls: "text-primary",
      strip: "bg-primary-fixed/40 text-on-primary-container",
    },
    bad: {
      chip: "border border-error-container/60 bg-error-container/40",
      icon: "error",
      iconCls: "text-error",
      textCls: "text-error",
      strip: "bg-error-container/60 text-on-error-container",
    },
    info: {
      chip: "border border-outline-variant/50 bg-surface-container",
      icon: "info",
      iconCls: "text-on-surface-variant",
      textCls: "text-on-surface-variant",
      strip: "bg-surface-container text-on-surface-variant",
    },
  }[tone];

  return (
    <div>
      <div className={`inline-flex items-center gap-2 rounded-full px-6 py-3 shadow-sm ${map.chip}`}>
        <Icon name={map.icon} fill className={`text-[22px] ${map.iconCls}`} />
        <span className={`text-headline-md font-semibold ${map.textCls}`}>{message}</span>
      </div>
      <p className="mx-auto mt-3 max-w-md text-body-md text-on-surface-variant">{detail}</p>
    </div>
  );
}