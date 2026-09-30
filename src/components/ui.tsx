import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

/* ────────────────────────────────────────────────────────────────
   Button
   ──────────────────────────────────────────────────────────────── */
type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "cta"
  | "hiveos";
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
  /* Brand CTAs — the two public actions.
     cta   → "Scan & Verify" (honey amber, deep-bark ink)
     hiveos → "Open HIVEOS" (deep bark, quiet operational signal) */
  cta:
    "bg-honey text-honey-ink hover:bg-honey-bright active:bg-[#f0a500] shadow-soft",
  hiveos:
    "bg-bark-950 text-cream hover:bg-bark-800 active:bg-bark-900 shadow-soft",
};

const BTN_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-body-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-button gap-2 rounded-xl",
  lg: "h-12 px-6 text-button gap-2 rounded-xl",
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
  iconRight,
  fillIcon,
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
      {icon ? <Icon name={icon} fill={fillIcon} className="text-[20px]" /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} fill={fillIcon} className="text-[18px]" /> : null}
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-eyebrow uppercase tracking-wider ${PILL_TONES[tone]} ${className}`}
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
      <h3 className="mt-4 text-heading-lg text-on-surface">{title}</h3>
      {body ? <p className="mt-1 max-w-sm text-body-md text-on-surface-variant">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
/* ────────────────────────────────────────────────────────────────
   Editorial type primitives
   Enforce the hierarchy: eyebrow → display/heading → lede → body.
   Answer "what should the user look at next?" by construction.
   ──────────────────────────────────────────────────────────────── */

/** Hero statement. One per view. */
export function Display({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1 className={`text-display text-bark-950 text-balance ${className}`}>
      {children}
    </h1>
  );
}

/** Editorial kicker above a heading. Always paired, never alone. */
export function Eyebrow({
  children,
  icon,
  tone = "deep",
  className = "",
}: {
  children: ReactNode;
  icon?: string;
  /** `deep` for cream surfaces, `honey` for bark/dark surfaces. */
  tone?: "deep" | "honey";
  className?: string;
}) {
  return (
    <p
      className={`inline-flex items-center gap-2 text-eyebrow uppercase ${tone === "honey" ? "text-honey" : "text-honey-deep"} ${className}`}
    >
      {icon ? <Icon name={icon} className="text-[14px]" /> : null}
      {children}
    </p>
  );
}

/** Canonical section header: eyebrow → heading → optional lede. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const alignCls = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <div className={`flex flex-col gap-3 ${alignCls} ${className}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-heading-xl text-bark-950 text-balance max-w-measure">
        {title}
      </h2>
      {lede ? (
        <p className="text-body-lg text-on-surface-variant max-w-measure">{lede}</p>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Layout primitive
   ──────────────────────────────────────────────────────────────── */

/** Page container: consistent measure, gutters, and max width. */
export function Container({
  children,
  narrow = false,
  className = "",
}: {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full px-5 sm:px-8 ${
        narrow ? "max-w-measure" : "max-w-site"
      } ${className}`}
    >
      {children}
    </div>
  );
}
