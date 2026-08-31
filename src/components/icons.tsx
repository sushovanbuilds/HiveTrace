import type { ReactNode } from "react";

/**
 * Material Symbols Outlined icon. `name` is any Material Symbol name
 * (e.g. "dashboard", "verified"); `fill` renders the FILL=1 variant.
 * `className` controls sizing/color like any text utility.
 */
export function Icon({
  name,
  fill = false,
  className = "",
  ariaLabel,
}: {
  name: string;
  fill?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <span
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      className={`material-symbols-outlined ${fill ? "mso-fill" : ""} ${className}`}
    >
      {name}
    </span>
  );
}

/** Icon name list kept in one place so pages can reference stable names. */
export const SYMBOLS = {
  dashboard: "dashboard",
  hive: "hive",
  inventory: "inventory_2",
  timeline: "timeline",
  accountTree: "account_tree",
  qr: "qr_code_2",
  custody: "handshake",
  verify: "verified",
  science: "science",
  warning: "warning",
  search: "search",
  notifications: "notifications",
  settings: "settings",
  logout: "logout",
  share: "share",
  download: "download",
  add: "add",
  chevronRight: "chevron_right",
  chevronLeft: "chevron_left",
  chevronDown: "expand_more",
  more: "more_horiz",
  copy: "content_copy",
  external: "open_in_new",
  sync: "sync",
} as const;

export function IconTile({
  icon,
  tone = "surface",
  className = "",
  size = "text-[20px]",
}: {
  icon: string;
  tone?: "primary" | "primary-container" | "tertiary" | "tertiary-container" | "error" | "surface" | "surface-high" | "dark";
  className?: string;
  size?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-container/20 text-primary",
    "primary-container": "bg-primary-container text-on-primary-container",
    tertiary: "bg-tertiary-container/30 text-tertiary",
    "tertiary-container": "bg-tertiary-container/90 text-on-tertiary-container",
    error: "bg-error-container text-on-error-container",
    surface: "bg-surface-container text-on-surface-variant",
    "surface-high": "bg-surface-container-highest text-on-surface-variant",
    dark: "bg-inverse-surface text-inverse-on-surface",
  };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg ${tones[tone] ?? tones.surface} ${className}`}
    >
      <Icon name={icon} className={size} />
    </span>
  );
}

export function Dot({ tone = "tertiary", className = "" }: { tone?: string; className?: string }) {
  const map: Record<string, string> = {
    tertiary: "bg-tertiary",
    primary: "bg-primary",
    "primary-container": "bg-primary-container",
    error: "bg-error",
    secondary: "bg-secondary",
    outline: "bg-outline",
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${map[tone] ?? tone} ${className}`} />;
}

/** Collapsible section label used across rails/sidebars. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">
      {children}
    </span>
  );
}