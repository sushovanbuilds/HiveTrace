import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { CopyField } from "@/components/copy-field";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Anchor = {
  id: string;
  eventType: string;
  txHash: string | null;
  blockNumber: number | null;
  chain: string;
  status: string;
  batchPublicCode: string | null;
  anchoredAt: Date | null;
};

const DEMO_ANCHORS: Anchor[] = [
  { id: "anch_1", eventType: "CUSTODY_TRANSFER", txHash: "0x7a1c0d2f9e41b8f0", blockNumber: 5_241_112, chain: "POLYGON_TESTNET", status: "ANCHORED", batchPublicCode: "WB-PUR-2026-001", anchoredAt: new Date("2026-08-29T08:02:00") },
  { id: "anch_2", eventType: "QUALITY_TEST", txHash: "0x9e11ab44c02d71aa", blockNumber: 5_241_111, chain: "POLYGON_TESTNET", status: "ANCHORED", batchPublicCode: "WB-PUR-2026-001", anchoredAt: new Date("2026-08-29T07:58:00") },
  { id: "anch_3", eventType: "HARVEST", txHash: "0x2b9c003177fa902e", blockNumber: 5_241_110, chain: "POLYGON_TESTNET", status: "ANCHORED", batchPublicCode: "WB-PUR-2026-001", anchoredAt: new Date("2026-08-29T07:44:00") },
  { id: "anch_4", eventType: "SCAN_VERIFY", txHash: "0xc4d81fa e90ab12cd".replace(" ", ""), blockNumber: 5_241_102, chain: "POLYGON_TESTNET", status: "ANCHORED", batchPublicCode: "WB-KUL-2026-004", anchoredAt: new Date("2026-08-28T22:15:00") },
  { id: "anch_5", eventType: "SUPPLIER_CERT", txHash: null, blockNumber: null, chain: "LOCAL_FABRIC", status: "PENDING", batchPublicCode: "HP-KUL-2026-005", anchoredAt: null },
];

async function loadAnchors(): Promise<Anchor[] | null> {
  try {
    const anchors = await db.blockchainAnchor.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 30,
    });
    return anchors.map((a) => ({
      id: a.id,
      eventType: a.eventType,
      txHash: a.txHash,
      blockNumber: a.blockNumber,
      chain: a.chain,
      status: a.status,
      batchPublicCode: a.batchId,
      anchoredAt: a.anchoredAt,
    }));
  } catch {
    return null;
  }
}

const EVENTS: Record<string, string> = {
  HARVEST: "Harvest registered",
  EXTRACTION: "Extraction verified",
  QUALITY_TEST: "Lab result anchored",
  CUSTODY_TRANSFER: "Custody hand-over",
  PACKAGING: "Packaging sealed",
  SCAN_VERIFY: "Consumer verify scan",
  SUPPLIER_CERT: "Supplier certificate",
};

const ChainIcons: Record<string, string> = {
  POLYGON_TESTNET: "polyline",
  LOCAL_FABRIC: "hub",
};

export default async function BlockchainPage() {
  const anchors = (await loadAnchors()) ?? DEMO_ANCHORS;
  const anchored = anchors.filter((a) => a.status === "ANCHORED").length;
  const pending = anchors.filter((a) => a.status === "PENDING").length;
  const root = "0x8f3d" + "ab7c21e94d50f0812c6b3a97d4e5c" + "0fa9e22174b8cd03a6f9ba57d2c148e6630a";

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-headline-lg tracking-tight text-on-surface">Blockchain Proofs</h1>
        <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
          Every trusted event is bundle-hashed and anchored to a public chain — anyone can verify the record with the batch label.
        </p>
      </div>

      {/* Integrity stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {[
          { icon: "link", label: "Total Anchors", value: anchors.length, cls: "" },
          { icon: "verified_user", label: "Anchored", value: anchored, cls: "text-tertiary" },
          { icon: "hourglass_top", label: "Pending", value: pending, cls: "text-primary" },
          { icon: "memory", label: "Anchor SLA", value: "150ms", cls: "" },
        ].map((m) => (
          <div key={m.label} className="metric-card rounded-xl p-5 transition-shadow hover:shadow-md">
            <p className="mb-4 flex items-center gap-2 text-label-caps uppercase tracking-wider text-on-surface-variant">
              <Icon name={m.icon} className="text-[18px]" />
              {m.label}
            </p>
            <p className={`text-headline-lg tabular-nums tracking-tight text-on-surface ${m.cls}`}>
              {typeof m.value === "number" && m.value > 1_000_000 ? m.value.toLocaleString() : m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chain status */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-outline-variant/25 bg-surface-container-lowest px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container/40 text-primary">
              <Icon name="polyline" className="text-[22px]" />
            </span>
            <div>
              <p className="text-body-md font-semibold text-on-surface">POLYGON_TESTNET</p>
              <p className="text-metadata-sm text-on-surface-variant">Block 5,241,114 · 2.1s finality</p>
            </div>
          </div>
          <Pill tone="tertiary" dot="bg-tertiary">Synced</Pill>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-outline-variant/25 bg-surface-container-lowest px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container/50 text-on-secondary-container">
              <Icon name="hub" className="text-[22px]" />
            </span>
            <div>
              <p className="text-body-md font-semibold text-on-surface">LOCAL_FABRIC</p>
              <p className="text-metadata-sm text-on-surface-variant">Channel hivetrace-supply · 12 orgs</p>
            </div>
          </div>
          <Pill tone="warn" dot="bg-primary">Degraded</Pill>
        </div>
      </div>

      {/* Merkle root hero */}
      <div className="map-bg relative mb-8 overflow-hidden rounded-2xl p-8">
        <div className="absolute right-0 top-0 h-40 w-40 opacity-10">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <path d="M0 50 L100 50 M50 0 L50 100 M25 25 L75 75 M75 25 L25 75" stroke="#66ffcc" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="18" fill="none" stroke="#66ffcc" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary-container">
            <Icon name="identity_platform" className="text-[16px]" />
            Current Merkle Root
          </p>
          <div className="mt-3">
            <CopyField value={root} />
          </div>
          <p className="mt-3 text-metadata-sm text-inverse-on-surface/80">
            Recomputes on every anchored event · SHA-256 over bundle hashes
          </p>
        </div>
      </div>

      {/* Anchor ledger */}
      <Card className="overflow-hidden">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-headline-md tracking-tight text-on-surface">Anchor Ledger</h2>
          <span className="inline-flex items-center gap-2 text-metadata-sm text-on-surface-variant">
            <Icon name="sync" className="text-[16px]" /> live
          </span>
        </div>
        <div className="no-scrollbar overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-outline-variant/20 text-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                <th className="py-3 pr-4">Event</th>
                <th className="py-3 pr-4">Batch</th>
                <th className="py-3 pr-4">Chain / Block</th>
                <th className="py-3 pr-4">Transaction Hash</th>
                <th className="py-3 pr-4">Time</th>
                <th className="py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {anchors.map((a) => (
                <tr key={a.id} className="text-metadata-sm transition-colors hover:bg-surface-container-low">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container/25 text-primary">
                        <Icon name={a.status === "PENDING" ? "hourglass_top" : "verified"} className="text-[16px]" />
                      </span>
                      <span className="font-medium text-on-surface">{EVENTS[a.eventType] ?? a.eventType}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-medium tracking-wide text-on-surface">{a.batchPublicCode ?? "—"}</td>
                  <td className="py-3.5 pr-4 text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">
                      <Icon name={ChainIcons[a.chain] ?? "polyline"} className="text-[14px]" />
                      {a.chain.replace("_", " ")}
                    </span>
                    {a.blockNumber ? <span className="ml-1 tabular-nums text-on-surface-variant">#{a.blockNumber.toLocaleString()}</span> : null}
                  </td>
                  <td className="py-3.5 pr-4">
                    <code className="font-[family-name:var(--font-geist-mono)] text-[12px] tracking-tight text-on-surface">
                      {a.txHash ? `${a.txHash.slice(0, 10)}…${a.txHash.slice(-6)}` : "—"}
                    </code>
                  </td>
                  <td className="py-3.5 pr-4 text-on-surface-variant">
                    {a.anchoredAt ? (
                      <span className="tabular-nums">
                        {a.anchoredAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-3.5 text-center">
                    {a.status === "ANCHORED" ? (
                      <Pill tone="tertiary">Anchored</Pill>
                    ) : a.status === "PENDING" ? (
                      <Pill tone="warn">Pending</Pill>
                    ) : (
                      <Pill tone="error">Failed</Pill>
                    )}
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