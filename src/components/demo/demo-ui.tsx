"use client";

import { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/ui";

export function DemoGreeting({
  eyebrow,
  first,
  sub,
}: {
  eyebrow: string;
  first: string;
  sub: string;
}) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="mb-8">
      <div className="mb-1 text-metadata-sm uppercase tracking-[0.08em] text-secondary">
        {eyebrow}
      </div>
      <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
        {greeting}, {first}.
      </h1>
      <p className="mt-1 text-body-lg text-on-surface-variant">{sub}</p>
    </div>
  );
}

const STAT_TONES = {
  primary: "bg-primary-container/40 text-on-primary-container",
  tertiary: "bg-tertiary-container/50 text-on-tertiary-container",
  error: "bg-error-container text-on-error-container",
  surface: "bg-surface-container-highest text-on-surface-variant",
} as const;

export function DemoStat({
  label,
  value,
  sub,
  icon,
  tone = "tertiary",
  alert = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: string;
  tone?: keyof typeof STAT_TONES;
  alert?: boolean;
}) {
  return (
    <div
      className={`metric-card flex h-28 flex-col justify-between p-5 transition-shadow hover:shadow-md ${
        alert ? "border-error/20 bg-error-container/10" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
        {icon ? (
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${STAT_TONES[tone]}`}>
            <Icon name={icon} className="text-[20px]" />
          </span>
        ) : null}
      </div>
      <p className={`font-headline-md text-headline-md tabular-nums tracking-tight ${alert ? "text-error" : "text-on-surface"}`}>
        {value}
      </p>
      {sub ? <p className="text-metadata-sm text-on-surface-variant">{sub}</p> : null}
    </div>
  );
}

export function DemoSection({
  id,
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  id?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-headline-md text-headline-md tracking-tight text-on-surface">
            {icon ? <Icon name={icon} className="text-[24px] text-secondary" /> : null}
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-body-md text-on-surface-variant">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DemoEmpty({
  title,
  body,
  icon = "inventory_2",
}: {
  title: string;
  body?: ReactNode;
  icon?: string;
}) {
  return <EmptyState icon={icon} title={title} body={body} />;
}
