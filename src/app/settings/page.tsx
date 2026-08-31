import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Card, Pill } from "@/components/ui";

const TEAM = [
  { name: "Arjun Mehta", role: "Compliance Officer", email: "arjun@honeyflow.in", initials: "AM", tone: "primary" },
  { name: "Maya Subramanyan", role: "Cold Chain Lead", email: "maya@honeyflow.in", initials: "MS", tone: "tertiary" },
  { name: "Ravi Teja", role: "Lab Manager", email: "ravi@honeyflow.in", initials: "RT", tone: "surface" },
];

const API_KEYS = [
  { key: "sk_live_9f2a…d18c", scope: "batch:write · verify:read", last: "Used 2m ago", tone: "tertiary" },
  { key: "sk_test_b01c…44aa", scope: "read-only", last: "Used yesterday", tone: "surface" },
];

const TABS = ["Profile", "Organisation", "Team", "Integrations", "Security"];

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-headline-lg tracking-tight text-on-surface">Settings</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">Organisation, team, integrations and API access for the HoneyFlow co-operative.</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <button
            key={t}
            className={`rounded-full px-4 py-1.5 text-metadata-sm font-medium transition-colors ${
              i === 0 ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-headline-md font-bold text-on-primary-container">
              AM
            </span>
            <div>
              <h2 className="text-headline-md tracking-tight text-on-surface">Arjun Mehta</h2>
              <p className="text-metadata-sm text-on-surface-variant">Compliance Officer</p>
            </div>
            <Pill tone="tertiary" className="ml-auto">Verified</Pill>
          </div>
          <div className="mt-5 space-y-2.5 border-t border-outline-variant/15 pt-5 text-metadata-sm text-on-surface-variant">
            <p className="flex items-center gap-2"><Icon name="mail" className="text-[16px]" /> arjun@honeyflow.in</p>
            <p className="flex items-center gap-2"><Icon name="phone" className="text-[16px]" /> +91 98300 44712</p>
            <p className="flex items-center gap-2"><Icon name="verified_user" className="text-[16px]" /> Capabilities: incident:read, batch:write, custody:write</p>
          </div>
        </Card>

        {/* Organisation */}
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container/40 text-primary">
                <Icon name="corporate_fare" className="text-[24px]" />
              </span>
              <div>
                <h2 className="text-headline-md tracking-tight text-on-surface">HoneyFlow Co-operative</h2>
                <p className="text-metadata-sm text-on-surface-variant">org_honeyflow · Member since 2024</p>
              </div>
            </div>
            <Pill tone="warn">Trial · 12 days left</Pill>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: "storefront", label: "Facilities", value: "14" },
              { icon: "hive", label: "Hives", value: "320" },
              { icon: "inventory_2", label: "Active Batches", value: "48" },
              { icon: "group", label: "Staff", value: "36" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface-container px-4 py-3">
                <p className="flex items-center gap-1.5 text-label-caps uppercase tracking-widest text-on-surface-variant">
                  <Icon name={s.icon} className="text-[14px]" /> {s.label}
                </p>
                <p className="mt-1 text-headline-md tabular-nums tracking-tight text-on-surface">{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Team */}
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold tracking-tight text-on-surface">Team Members</h2>
            <button className="inline-flex items-center gap-1 text-metadata-sm font-medium text-primary hover:underline">
              <Icon name="add" className="text-[16px]" /> Invite
            </button>
          </div>
          <div className="divide-y divide-outline-variant/15">
            {TEAM.map((m) => (
              <div key={m.email} className="flex items-center gap-4 py-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  m.tone === "primary" ? "bg-primary-container text-on-primary-container" : m.tone === "tertiary" ? "bg-tertiary-container/60 text-tertiary" : "bg-surface-container text-on-surface-variant"
                }`}>
                  {m.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-md font-medium text-on-surface">{m.name}</p>
                  <p className="truncate text-metadata-sm text-on-surface-variant">{m.role} · {m.email}</p>
                </div>
                <button className="rounded-lg border border-outline-variant/40 px-3 py-1.5 text-metadata-sm text-on-surface-variant transition-colors hover:bg-surface-container">
                  Manage
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* API keys */}
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold tracking-tight text-on-surface">API Keys</h2>
            <button className="inline-flex items-center gap-1 text-metadata-sm font-medium text-primary hover:underline">
              <Icon name="add" className="text-[16px]" /> Create key
            </button>
          </div>
          <div className="space-y-3">
            {API_KEYS.map((k) => (
              <div key={k.key} className="flex items-center justify-between rounded-xl border border-outline-variant/25 bg-surface-container-lowest px-4 py-3.5">
                <div>
                  <p className="hash-mono text-metadata-sm text-on-surface">{k.key}</p>
                  <p className="mt-0.5 text-metadata-sm text-on-surface-variant">{k.scope} · {k.last}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high">
                    <Icon name="content_copy" className="text-[16px]" />
                  </button>
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-error transition-colors hover:bg-error-container">
                    <Icon name="delete" className="text-[16px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-secondary-container/20 p-4">
            <p className="flex items-center gap-2 text-metadata-sm text-on-secondary-container">
              <Icon name="lock" className="text-[16px]" />
              Keys are shown once — store them in your secrets manager.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}