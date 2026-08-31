import { ReactNode } from "react";
import { Icon } from "@/components/icons";

/* ────────────────────────────────────────────────────────────────
   Honey production trend — curved SVG line + area
   ──────────────────────────────────────────────────────────────── */
export function TrendChart({
  labels,
  values,
  height = "h-40",
  tone = "#FFB800",
  format = (v: number) => String(v),
}: {
  labels: string[];
  values: number[];
  height?: string;
  tone?: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(...values, 1);
  const stepX = 100 / (values.length - 1);
  const pts = values.map((v, i) => [i * stepX, 100 - (v / max) * 80 - 6] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${d} L100,100 L0,100 Z`;
  return (
    <div className={`relative w-full ${height}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute bottom-2 left-0 h-[calc(100%-24px)] w-full"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.18" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chartFill)" />
        <path
          d={d}
          fill="none"
          stroke={tone}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="animate-chart-line"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-full border-b border-outline-variant/20" />
        ))}
      </div>
      <div className="absolute bottom-0 flex w-full justify-between px-2 text-[11px] font-medium tracking-widest text-on-surface-variant">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Donut / ring gauge
   ──────────────────────────────────────────────────────────────── */
export function RingGauge({
  value,
  size = 192,
  stroke = 8,
  tone = "#FFB800",
  label,
  sub,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  tone?: string;
  label: ReactNode;
  sub?: ReactNode;
}) {
  const r = 90;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} className="-rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--color-surface-container-highest)" strokeWidth={stroke} />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          style={{ filter: "drop-shadow(0 0 6px rgba(255,184,0,0.35))" }}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[44px] font-bold leading-[1.1] tracking-tight text-on-surface">{label}</span>
        {sub ? <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">{sub}</span> : null}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Sparkline in a pill (small inline trend)
   ──────────────────────────────────────────────────────────────── */
export function Sparkline({ values, tone = "#3b6934", width = 72, height = 24 }: { values: number[]; tone?: string; width?: number; height?: number }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - ((v - min) / Math.max(max - min, 1)) * (height - 4) - 2] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round" />
      <circle cx={pts.at(-1)?.[0]} cy={pts.at(-1)?.[1]} r="2.5" fill={tone} />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────
   Horizontal bar (for risk decomposition etc.)
   ──────────────────────────────────────────────────────────────── */
export function HBar({ label, value, max = 100, tone = "var(--color-primary-container)" }: { label: string; value: number; max?: number; tone?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-metadata-sm">
        <span className="font-medium tracking-wide text-on-surface-variant">{label}</span>
        <span className="font-semibold tabular-nums text-on-surface">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: tone }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Chart card shell
   ──────────────────────────────────────────────────────────────── */
export function ChartCard({
  title,
  action,
  icon,
  children,
  className = "",
  footer,
}: {
  title: string;
  action?: ReactNode;
  icon?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <div className={`glass-card flex flex-col rounded-xl p-6 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[20px] font-semibold leading-[28px] tracking-tight text-on-surface">
          {icon ? <Icon name={icon} className="text-[22px] text-secondary" /> : null}
          {title}
        </h3>
        {action}
      </div>
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  );
}