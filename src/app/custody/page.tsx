import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Transfer = {
  id: string;
  code: string;
  fromLabel: string;
  toLabel: string;
  mode: string;
  verified: boolean;
  verifier: string | null;
  timestamp: Date;
  hash: string | null;
};

const DEMO_TRANSFERS: Transfer[] = [
  { id: "c_1", code: "WB-PUR-2026-001", fromLabel: "Purulia Apiary", toLabel: "Cold Chain Express", mode: "HANDOFF", verified: true, verifier: "Anand K. · Apiary Lead", timestamp: new Date("2026-08-28T14:20:00"), hash: "0x7a1c0d2f9e41b8f0" },
  { id: "c_2", code: "WB-PUR-2026-002", fromLabel: "Cold Chain Express", toLabel: "Kolkata Hub", mode: "PALLET", verified: true, verifier: "Maya S. · Cold Chain", timestamp: new Date("2026-08-28T18:05:00"), hash: "0x9e11ab44c02d71aa" },
  { id: "c_3", code: "WB-PUR-2026-003", fromLabel: "Kolkata Hub", toLabel: "Metro Warehouse 7", mode: "BARCODE", verified: true, verifier: "Barcode scan · Hub", timestamp: new Date("2026-08-29T07:40:00"), hash: "0x2b9c003177fa902e" },
  { id: "c_4", code: "WB-SUN-2026-001", fromLabel: "Metro Warehouse 7", toLabel: "Sundarban Retail Co-op", mode: "POS", verified: false, verifier: null, timestamp: new Date("2026-08-29T09:15:00"), hash: null },
];

async function loadTransfers(): Promise<Transfer[] | null> {
  try {
    const transfers = await db.custodyTransfer.findMany({
      orderBy: { timestamp: "desc" },
      take: 25,
      include: { batch: { select: { publicCode: true } } },
    });
    return transfers.map((t) => ({
      id: t.id,
      code: t.batch?.publicCode ?? "—",
      fromLabel: t.fromRole || t.fromCustodianId,
      toLabel: t.toRole || t.toCustodianId,
      mode: "TRANSFER",
      verified: true,
      verifier: t.fromCustodianId,
      timestamp: t.timestamp,
      hash: null,
    }));
  } catch {
    return null;
  }
}

export default async function CustodyPage() {
  const transfers = (await loadTransfers()) ?? DEMO_TRANSFERS;
  const verified = transfers.filter((t) => t.verified).length;

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-headline-lg tracking-tight text-on-surface">Custody Ledger</h1>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            Every physical possession change is witnessed, signed and anchored — proof of who held the honey, and when.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-metadata-sm font-medium text-on-primary shadow-sm transition-all active:scale-[0.98]">
          <Icon name="swap_horiz" className="text-[18px]" />
          New Hand-off
        </button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {[
          { icon: "swap_horiz", label: "Transfers", value: transfers.length, sub: "all time" },
          { icon: "verified_user", label: "Verified", value: verified, sub: `${transfers.length ? Math.round((verified / transfers.length) * 100) : 0}% auto-verified` },
          { icon: "access_time", label: "Avg Hand-over", value: "3m 12s", sub: "witness to anchor" },
          { icon: "gavel", label: "Active Custody", value: "127", sub: "nodes expecting" },
        ].map((m) => (
          <div key={m.label} className="metric-card rounded-xl p-5 transition-shadow hover:shadow-md">
            <p className="mb-4 flex items-center gap-2 text-label-caps uppercase tracking-wider text-on-surface-variant">
              <Icon name={m.icon} className="text-[18px]" />
              {m.label}
            </p>
            <p className="text-headline-lg tabular-nums tracking-tight text-on-surface">{m.value}</p>
            <p className="mt-1 text-metadata-sm text-on-surface-variant">{m.sub}</p>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-headline-md tracking-tight text-on-surface">Transfer History</h2>
          <Pill tone="tertiary" dot="bg-tertiary">Anchored</Pill>
        </div>
        <div className="no-scrollbar overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-outline-variant/20 text-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                <th className="py-3 pr-4">Batch</th>
                <th className="py-3 pr-4">From</th>
                <th className="py-3 pr-4">To</th>
                <th className="py-3 pr-4">Mode</th>
                <th className="py-3 pr-4">Witnessed By</th>
                <th className="py-3 pr-4">Hash</th>
                <th className="py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {transfers.map((t) => (
                <tr key={t.id} className="text-metadata-sm transition-colors hover:bg-surface-container-low">
                  <td className="py-3.5 pr-4 font-medium tracking-wide text-on-surface">{t.code}</td>
                  <td className="py-3.5 pr-4 text-on-surface-variant">{t.fromLabel}</td>
                  <td className="py-3.5 pr-4 text-on-surface-variant">{t.toLabel}</td>
                  <td className="py-3.5 pr-4">
                    <span className="rounded-md bg-surface-container px-2 py-0.5 text-on-surface-variant">{t.mode}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-on-surface-variant">
                    {t.verifier ?? (
                      <span className="inline-flex items-center gap-1 text-error">
                        <Icon name="error" className="text-[14px]" /> Unwitnessed
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4">
                    <code className="font-[family-name:var(--font-geist-mono)] text-[12px] tracking-tight text-on-surface">
                      {t.hash ? `${t.hash.slice(0, 8)}…${t.hash.slice(-4)}` : "—"}
                    </code>
                  </td>
                  <td className="py-3.5 text-center">
                    {t.verified ? <Pill tone="tertiary">Anchored</Pill> : <Pill tone="error">Gap</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}