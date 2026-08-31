import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

/* ────────────────────────────────────────────────────────────────
   Button
   ──────────────────────────────────────────────────────────────── */
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-[#6b4c00] active:bg-[#5e4200] shadow-sm",
  secondary:
    "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/70",
  outline:
    "border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-low",
  ghost: "text-on-surface-variant hover:bg-surface-container",
  danger: "bg-error-container text-on-error-container hover:bg-error-container/80",
};

const BTN_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-body-md gap-1.5 rounded-lg",
  md: "h-11 px-4 text-body-md gap-2 rounded-xl",
  lg: "h-12 px-6 text-body-lg gap-2 rounded-xl",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  fillIcon?: boolean;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fillIcon,
  children,
  className = "",
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      {...props}
    >
      {icon ? <Icon name={icon} fill={fillIcon} className="text-[20px]" /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} className="text-[18px]" /> : null}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  ...props
}: CommonProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      {...props}
    >
      {icon ? <Icon name={icon} className="text-[20px]" /> : null}
      {children}
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────
   Pills / status badges
   ──────────────────────────────────────────────────────────────── */
export const PILL_TONES = {
  primary: "bg-primary-container/40 text-on-primary-container",
  "primary-solid": "bg-primary text-on-primary",
  honey: "bg-primary-container text-on-primary-container",
  tertiary: "bg-tertiary-container/60 text-on-tertiary-container",
  "tertiary-solid": "bg-tertiary text-on-tertiary",
  error: "bg-error-container text-on-error-container",
  "error-solid": "bg-error text-on-error",
  warn: "bg-primary-container/80 text-on-primary-container",
  surface: "bg-surface-container text-on-surface-variant",
  "surface-high": "bg-surface-container-highest text-on-surface-variant",
  outline: "border border-outline-variant text-on-surface-variant",
  secondary: "bg-secondary-container text-on-secondary-container",
  white: "bg-white/15 text-white backdrop-blur",
} as const;

export type PillTone = keyof typeof PILL_TONES;

export function Pill({
  children,
  tone = "surface",
  icon,
  dot,
  className = "",
}: {
  children: ReactNode;
  tone?: PillTone;
  icon?: string;
  dot?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label-caps text-label-caps tracking-wider ${PILL_TONES[tone]} ${className}`}
    >
      {icon ? <Icon name={icon} className="text-[16px]" /> : null}
      {dot ? <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> : null}
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   Cards
   ──────────────────────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
  pad = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`metric-card rounded-xl ${pad ? "p-5 sm:p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card rounded-xl ${className}`}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  iconTone = "primary-container",
  action,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  iconTone?: "primary-container" | "tertiary-container" | "error" | "surface" | "dark" | "surface-high";
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon ? (
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconTone === "primary-container" ? "bg-primary-container/30 text-primary" : iconTone === "tertiary-container" ? "bg-tertiary-container/40 text-tertiary" : iconTone === "error" ? "bg-error-container text-on-error-container" : iconTone === "dark" ? "bg-inverse-surface text-inverse-on-surface" : "bg-surface-container text-on-surface-variant"}`}
          >
            <Icon name={icon} />
          </span>
        ) : null}
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
          {subtitle ? (
            <p className="text-body-md text-on-surface-variant">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex items-center gap-2 shrink-0">{action}</div> : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Metric card
   ──────────────────────────────────────────────────────────────── */
export function MetricCard({
  label,
  value,
  sub,
  icon,
  tone = "tertiary",
  trend,
  trendUp,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: string;
  tone?: "tertiary" | "primary" | "error" | "surface" | "dark";
  trend?: string;
  trendUp?: boolean;
  className?: string;
}) {
  const tones = {
    tertiary: "text-tertiary",
    primary: "text-primary",
    error: "text-error",
    surface: "text-on-surface-variant",
    dark: "text-on-surface",
  };
  const iconTones = {
    tertiary: "bg-tertiary-container/50 text-on-tertiary-container",
    primary: "bg-primary-container/40 text-on-primary-container",
    error: "bg-error-container text-on-error-container",
    surface: "bg-surface-container text-on-surface-variant",
    dark: "bg-inverse-surface text-inverse-on-surface",
  };
  return (
    <div className={`metric-card rounded-xl p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-metadata-sm tracking-wider text-on-surface-variant uppercase">{label}</p>
        {icon ? (
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconTones[tone]}`}>
            <Icon name={icon} className="text-[22px]" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-headline-lg text-headline-lg text-on-surface tabular-nums tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {trend ? (
          <Pill tone={trendUp ? "tertiary" : "error"} icon={trendUp ? "trending_up" : "trending_down"}>
            {trend}
          </Pill>
        ) : null}
        {sub ? <span className={`text-body-md ${tones[tone]}`}>{sub}</span> : null}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Page header
   ──────────────────────────────────────────────────────────────── */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  icon,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
      <div className="max-w-2xl">
        {eyebrow ? (
          <div className="mb-2 text-metadata-sm tracking-wider text-secondary uppercase">{eyebrow}</div>
        ) : null}
        <h1 className="flex items-center gap-3 font-headline-lg text-headline-lg[-0.02em] text-on-surface tracking-tight">
          {icon ? <Icon name={icon} className="text-[32px] text-secondary" /> : null}
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-body-lg text-on-surface-variant">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3 shrink-0">{actions}</div> : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Status helpers
   ──────────────────────────────────────────────────────────────── */
export function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    HARVEST: "Harvest",
    COLLECTION: "Collection",
    LAB: "Lab Testing",
    PROCESSING: "Processing",
    PACKAGING: "Packaging",
    DISTRIBUTION: "Distribution",
    RETAIL: "Retail",
  };
  return labels[stage] ?? stage;
}

export function riskPill(state: string) {
  const map: Record<string, { tone: PillTone; label: string; dot: string }> = {
    LOW: { tone: "tertiary", label: "Low Risk", dot: "bg-tertiary" },
    MEDIUM: { tone: "warn", label: "Medium Risk", dot: "bg-primary" },
    HIGH: { tone: "error", label: "High Risk", dot: "bg-error" },
  };
  return map[state] ?? map.LOW;
}

export function qualityPill(status: string) {
  const map: Record<string, { tone: PillTone; label: string }> = {
    PASSED: { tone: "tertiary", label: "Quality Passed" },
    PENDING: { tone: "surface", label: "Awaiting QA" },
    FAILED: { tone: "error", label: "Quality Failed" },
    QUARANTINE: { tone: "error", label: "Quarantined" },
  };
  return map[status] ?? map.PENDING;
}

export function verificationPill(state: string) {
  const map: Record<string, { tone: PillTone; label: string }> = {
    VERIFIED: { tone: "tertiary", label: "Verified" },
    UNVERIFIED: { tone: "surface", label: "Unverified" },
    DISPUTED: { tone: "error", label: "Disputed" },
  };
  return map[state] ?? map.UNVERIFIED;
}

/* ────────────────────────────────────────────────────────────────
   Progress / bars
   ──────────────────────────────────────────────────────────────── */
export function ProgressBar({
  value,
  tone = "primary",
  className = "",
}: {
  value: number;
  tone?: "primary" | "tertiary" | "error";
  className?: string;
}) {
  const tones = {
    primary: "bg-primary-container",
    tertiary: "bg-tertiary",
    error: "bg-error",
  };
  return (
    <div className={`h-2 w-full rounded-full bg-surface-container-highest ${className}`}>
      <div
        className={`h-2 rounded-full ${tones[tone]} transition-all duration-700`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function RiskGauge({ score, size = 64 }: { score: number; size?: number }) {
  const token = Math.max(0, Math.min(1, score));
  const color = token < 0.4 ? "#3b6934" : token < 0.7 ? "#7c5800" : "#ba1a1a";
  const pct = (score * 100).toFixed(0);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" style={{ width: size, height: size }}>
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e2e2" strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r="15.915"
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${token * 100} 100`}
          transform="rotate(-90 18 18)"
          className="transition-all duration-700"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-headline-md font-semibold tabular-nums active-scale"
        style={{ color }}
      >
        {pct}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Segmented control / filter tabs
   ──────────────────────────────────────────────────────────────── */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: Array<{ value: T; label: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg bg-surface-container p-1 ${className}`}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-body-md font-medium transition-all duration-200 ${
            value === opt.value
              ? "bg-white text-on-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Empty state
   ──────────────────────────────────────────────────────────────── */
export function EmptyState({
  icon = "inventory_2",
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant py-16 px-6 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
        <Icon name={icon} className="text-[30px]" />
      </span>
      <h3 className="mt-4 font-headline-md text-headline-md text-on-surface">{title}</h3>
      {body ? <p className="mt-1 max-w-sm text-body-md text-on-surface-variant">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}