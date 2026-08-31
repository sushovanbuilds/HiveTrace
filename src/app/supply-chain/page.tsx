import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Card } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STAGES = [
  { icon: "agriculture", label: "Extraction", id: "extraction" },
  { icon: "ac_unit", label: "Cold Chain", id: "coldchain" },
  { icon: "local_shipping", label: "Transit", id: "transit" },
  { icon: "warehouse", label: "Warehouse", id: "warehouse" },
  { icon: "storefront", label: "Retail", id: "retail" },
];

type Handover = {
  id: string;
  fromLabel: string;
  toLabel: string;
  code: string;
  time: string;
  mode: string;
  ok: boolean;
};

const DEMO_HANDOVERS: Handover[] = [
  { id: "c_1", fromLabel: "Purulia Apiary", toLabel: "Cold Chain Express", code: "WB-PUR-2026-001", time: "Yesterday 14:20", mode: "Hand-off · Van CU-112", ok: true },
  { id: "c_2", fromLabel: "Cold Chain Express", toLabel: "Kolkata Hub", code: "WB-PUR-2026-002", time: "Yesterday 18:05", mode: "Pallet transfer", ok: true },
  { id: "c_3", fromLabel: "Kolkata Hub", toLabel: "Metro Warehouse 7", code: "WB-PUR-2026-003", time: "Today 07:40", mode: "Barcode hand-over", ok: true },
  { id: "c_4", fromLabel: "Metro Warehouse 7", toLabel: "Sundarban Retail Co-op", code: "WB-SUN-2026-001", time: "Today 09:15", mode: "POS pick-up", ok: false },
];

async function loadHandovers(): Promise<Handover[] | null> {
  try {
    const transfers = await db.custodyTransfer.findMany({
      orderBy: { timestamp: "desc" },
      take: 20,
      include: { batch: { select: { publicCode: true } } },
    });
    return transfers.map((t) => ({
      id: t.id,
      fromLabel: t.fromCustodianId,
      toLabel: t.toCustodianId,
      code: t.batch?.publicCode ?? "—",
      time: t.timestamp.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      mode: t.location ?? "Transfer",
      ok: true,
    }));
  } catch {
    return null;
  }
}

export default async function SupplyChainPage() {
  const loaded = await loadHandovers();
  const handovers = loaded && loaded.length ? loaded : DEMO_HANDOVERS;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-headline-lg tracking-tight text-on-surface">Supply Chain</h1>
        <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
          Live movement map of verified nodes — every hand-over, custody transfer and environment reading is anchored on-chain.
        </p>
      </div>

      {/* Map panel */}
      <div className="map-bg relative mb-8 h-[420px] overflow-hidden rounded-2xl">
        <svg viewBox="0 0 800 420" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <g stroke="#3a2f1e" strokeWidth="0.5" fill="none" opacity="0.55">
            {Array.from({ length: 26 }).map((_, i) => (
              <path key={i} d={`M ${i * 33 - 10} 420 L ${i * 33 + 12} 0`} />
            ))}
            {Array.from({ length: 16 }).map((_, i) => (
              <path key={`h${i}`} d={`M 0 ${i * 28 + 8} L 800 ${i * 28 + 8}`} />
            ))}
          </g>

          {STAGES.map((s, i) => {
            const cx = 90 + i * 150;
            const cy = 200;
            const prev = i > 0 ? cx - 150 : cx;
            return (
              <g key={s.id}>
                <path
                  className="route-line"
                  d={
                    i === 0
                      ? `M 60 380 L ${cx - 34} ${cy}`
                      : `M ${prev + 34} ${cy} C ${prev + 70} ${cy} ${prev + 90} ${cy - 60} ${cx - 60} ${cy - 60} L ${cx - 34} ${cy}`
                  }
                  fill="none"
                  stroke={i === handovers.length - 1 ? "#ba1a1a" : "#FBB829"}
                  strokeWidth="2.5"
                  strokeDasharray="7 5"
                />
                <path d={`M ${cx - 34} ${cy} L ${cx + 34} ${cy} L ${cx} ${cy - 30} Z`} fill={i === 4 ? "#9fd292" : "#FFB800"} opacity="0.9" />
                <circle cx={cx} cy={cy - 30} r="3.5" fill="#1a1c1c" />
                <text x={cx} y={cy + 30} textAnchor="middle" fontSize="15" fontWeight="700" fill="#FFF8E7" stroke="#3a2f1e" strokeWidth="0.5">
                  {i + 1}
                </text>
              </g>
            );
          })}

          {handovers.slice(0, 5).map((h, i) => {
            const cx = 90 + i * 150;
            return (
              <g key={h.id}>
                <circle cx={cx} cy={200} r="7" fill={h.ok ? "#9fd292" : "#ba1a1a"}>
                  <animate attributeName="r" values="5;8;5" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <text x={cx + 14} y={195} fontSize="11" fill="#F8F2E3">{h.code}</text>
              </g>
            );
          })}
        </svg>

        <div className="absolute left-5 top-5 rounded-xl bg-inverse-surface/70 px-5 py-3.5 backdrop-blur">
          <p className="text-label-caps uppercase tracking-widest text-primary-container">Live Supply Chain</p>
          <p className="mt-0.5 text-metadata-sm text-inverse-on-surface/90">5 forced hops · network sync 100%</p>
        </div>
        <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl bg-inverse-surface/70 px-4 py-2.5 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-tertiary animate-pulse" />
          <p className="text-metadata-sm text-inverse-on-surface/90">127 active pallets</p>
        </div>
      </div>

      {/* Stage chips + handover ledger */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {STAGES.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-metadata-sm font-medium ${
                  i === 2 ? "bg-primary-container text-on-primary-container" : i === 3 ? "bg-error-container/60 text-on-error-container" : "bg-surface-container text-on-surface-variant"
                }`}>
                  <Icon name={s.icon} className="text-[16px]" />
                  {s.label}
                </span>
                {i < STAGES.length - 1 && <Icon name="chevron_right" className="text-on-surface-variant" />}
              </div>
            ))}
          </div>

          <h2 className="mb-4 text-[20px] font-semibold tracking-tight text-on-surface">Custody Hand-overs</h2>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-outline-variant/20 text-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                  <th className="py-2.5 pr-4">Batch</th>
                  <th className="py-2.5 pr-4">From</th>
                  <th className="py-2.5 pr-4">To</th>
                  <th className="py-2.5 pr-4">Time / Mode</th>
                  <th className="py-2.5 text-center">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {handovers.map((h) => (
                  <tr key={h.id} className="text-metadata-sm">
                    <td className="py-3 pr-4">
                      <span className="font-medium tracking-wide text-on-surface">{h.code}</span>
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">{h.fromLabel}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{h.toLabel}</td>
                    <td className="py-3 pr-4">
                      <p className="tabular-nums text-on-surface">{h.time}</p>
                      <p className="text-on-surface-variant">{h.mode}</p>
                    </td>
                    <td className="py-3 text-center">
                      {h.ok ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 px-2.5 py-1 text-[11px] font-semibold text-tertiary">
                          <Icon name="verified" className="text-[14px]" /> Anchored
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-error-container/60 px-2.5 py-1 text-[11px] font-semibold text-on-error-container">
                          <Icon name="error" className="text-[14px]" /> Exited flow
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <div className="rounded-xl bg-inverse-surface p-6 text-inverse-on-surface shadow-lg">
            <p className="mb-5 text-label-caps uppercase tracking-widest text-primary-container">Environment Watch</p>
            <div className="space-y-5">
              {[
                { icon: "thermostat", label: "Avg Transit Temp", value: "4.2°C", ok: true },
                { icon: "water_drop", label: "Humidity Variance", value: "±3.1%", ok: true },
                { icon: "sensors", label: "Sensor Integrity", value: "99.8%", ok: true },
                { icon: "warning", label: "Cold-chain Alerts", value: "2 open", ok: false },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-metadata-sm text-secondary-fixed-dim">
                    <Icon name={m.icon} className="text-[18px] text-primary-container" />
                    {m.label}
                  </span>
                  <span className={`tabular-nums text-metadata-sm font-semibold ${m.ok ? "text-tertiary-fixed-dim" : "text-error-container"}`}>
                    {m.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-primary-container/30 p-3.5">
              <h4 className="mb-2 flex items-center gap-1.5 text-label-caps uppercase tracking-widest text-primary-container">
                <Icon name="monitor_heart" className="text-[16px]" />
                Node Health
              </h4>
              <div className="flex gap-1.5">
                {[100, 96, 100, 91].map((v, i) => (
                  <div key={i} className="flex-1 space-y-1.5">
                    <div className="h-16 overflow-hidden rounded-md bg-white/5">
                      <div className="rounded-md bg-primary-container" style={{ height: `${v}%` }} />
                    </div>
                    <p className="text-center text-[10px] tabular-nums text-inverse-on-surface/60">N{i + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}