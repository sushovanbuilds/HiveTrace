import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Card, Pill } from "@/components/ui";

type Node = {
  id: string;
  code: string;
  kind: string;
  region?: string;
};

const ROOT: Node = { id: "root", code: "WB-PUR-2026-001", kind: "Blend Batch", region: "West Bengal" };
const SOURCES: Node[] = [
  { id: "h1", code: "WB-PUR-2026-001-A", kind: "Source Batch", region: "Purulia" },
  { id: "h2", code: "WB-PUR-2026-001-B", kind: "Source Batch", region: "Bankura" },
  { id: "h3", code: "WB-PUR-2026-001-C", kind: "Source Batch", region: "Birbhum" },
];
const UNCERTIFIED: Node[] = [
  { id: "x1", code: "WB-PUR-BULK-09", kind: "Uncertified Bulk" },
  { id: "x2", code: "WB-BAN-BULK-07", kind: "Uncertified Bulk" },
];

export default function GenealogyPage() {
  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-headline-lg tracking-tight text-on-surface">Provenance Genealogy</h1>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            Trace every source, blend and bulk-input that flowed into a finished label — the full family history of a batch.
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3">
          <Icon name="search" className="text-[20px] text-on-surface-variant" />
          <input
            placeholder="Search batch code…"
            className="w-full min-w-0 bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lineage graph */}
        <Card className="lg:col-span-2" pad={false}>
          <div className="p-6 pb-0">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container/50 text-on-secondary-container">
                <Icon name="account_tree" className="text-[22px]" />
              </span>
              <div>
                <h2 className="text-headline-md tracking-tight text-on-surface">Could-have-been Profile</h2>
                <p className="text-metadata-sm text-on-surface-variant">2 or more source recomputations required for real-time trace</p>
              </div>
              <div className="ml-auto flex items-center gap-3 text-metadata-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Actual
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-error" /> Simulated
                </span>
              </div>
            </div>
          </div>

          {/* SVG lineage tree */}
          <div className="relative p-6">
            <svg viewBox="0 0 640 360" className="w-full">
              <defs>
                <marker id="arrowHead" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
                  <path d="M0,0 L8,3.5 L0,7" fill="#7c5800" />
                </marker>
              </defs>

              {/* Sources (left column) */}
              {SOURCES.map((s, i) => {
                const y = 60 + i * 80;
                return (
                  <g key={s.id}>
                    <rect x="10" y={y - 26} width="180" height="52" rx="10" fill="#FFF3DA" stroke="#7c5800" strokeOpacity="0.4" />
                    <text x="100" y={y - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1c1c">
                      {s.code}
                    </text>
                    <text x="100" y={y + 12} textAnchor="middle" fontSize="9" fill="#514532">
                      {s.kind} · {s.region}
                    </text>
                    <circle cx="190" cy={y} r="4" fill="#7c5800" />
                  </g>
                );
              })}

              {/* Uncertified (simulated), red */}
              {UNCERTIFIED.map((u, i) => {
                const y = 60 + i * 80;
                return (
                  <g key={u.id}>
                    <rect x="10" y={y - 26} width="180" height="52" rx="10" fill="#F3DAD8" stroke="#ba1a1a" strokeOpacity="0.5" />
                    <text x="100" y={y - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#ba1a1a">
                      {u.code}
                    </text>
                    <text x="100" y={y + 12} textAnchor="middle" fontSize="9" fill="#8c1d18">
                      {u.kind} · simulated
                    </text>
                    <circle cx="190" cy={y} r="4" fill="#ba1a1a" stroke="#ba1a1a" strokeWidth="1.5">
                      <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </g>
                );
              })}

              {/* Root batch (right column) */}
              <g>
                <rect x="430" y="136" width="200" height="88" rx="14" fill="#FFB800" stroke="#6b4c00" strokeWidth="1.2" />
                <text x="530" y="160" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1a1c1c">
                  WB-PUR-2026-001
                </text>
                <text x="530" y="178" textAnchor="middle" fontSize="10" fill="#514532">
                  Blend Batch · West Bengal
                </text>
                <text x="530" y="200" textAnchor="middle" fontSize="9" fill="#6b4c00" fontWeight="700">
                  CANONICAL LABEL
                </text>
              </g>

              {/* Edges: sources → root */}
              {SOURCES.map((s, i) => {
                const y = 60 + i * 80;
                const edgeY = i === 0 ? 170 : i === 1 ? 190 : 210;
                return (
                  <path key={s.id} d={`M 194 ${y} C 300 ${y} 420 ${edgeY} 428 ${186}`} fill="none" stroke="#7c5800" strokeWidth="1.6" markerEnd="url(#arrowHead)" />
                );
              })}
              {/* Edges: uncertified → root (dashed red) */}
              {UNCERTIFIED.map((u, i) => {
                const y = 60 + i * 80;
                return (
                  <path key={u.id} d={`M 194 ${y} C 310 ${y} 405 ${i === 0 ? 160 : 212} 428 ${i === 0 ? 160 : 205}`} fill="none" stroke="#ba1a1a" strokeWidth="1.4" strokeDasharray="5 4">
                    <animate attributeName="stroke-dashoffset" values="0;-18" dur="1.6s" repeatCount="indefinite" />
                  </path>
                );
              })}

              {/* Legend node showing label */}
              <g transform="translate(230, 300)">
                <rect width="150" height="40" rx="8" fill="#1a1c1c" opacity="0.9" />
                <text x="75" y="19" textAnchor="middle" fontSize="10" fontWeight="700" fill="#FFB800">LINEAGE DEPTH</text>
                <text x="75" y="32" textAnchor="middle" fontSize="11" fill="#FFF8E7">3 source batches</text>
              </g>
            </svg>
          </div>
        </Card>

        {/* Lineage trail list */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="mb-5 text-[20px] font-semibold tracking-tight text-on-surface">Lineage Trail</h2>
          <div className="space-y-4">
            {[
              { code: "WB-PUR-2026-001-B", type: "Source · Bankura", ratio: "62%", date: "12 Jul 2026", tone: "tertiary" as const },
              { code: "WB-PUR-2026-001-A", type: "Source · Purulia", ratio: "24%", date: "09 Jul 2026", tone: "primary" as const },
              { code: "WB-PUR-2026-001-C", type: "Source · Birbhum", ratio: "14%", date: "05 Jul 2026", tone: "primary" as const },
              { code: "WB-PUR-BULK-09", type: "Uncertified bulk · simulated", ratio: "—", date: "Mar 2026", tone: "error" as const },
            ].map((p) => (
              <div key={p.code} className="flex items-start gap-3">
                <span className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                  p.tone === "error" ? "bg-error-container text-on-error-container" : "bg-primary-container/30 text-primary"
                }`}>
                  <Icon name={p.tone === "error" ? "warning" : "water_drop"} className="text-[16px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-body-md font-medium text-on-surface">{p.code}</p>
                    <span className={`text-metadata-sm font-semibold ${p.tone === "error" ? "text-error" : "text-on-surface"}`}>
                      {p.ratio}
                    </span>
                  </div>
                  <p className="text-metadata-sm text-on-surface-variant">{p.type} · {p.date}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-variant">
                    <div
                      className={`h-full ${p.tone === "error" ? "bg-error" : p.tone === "tertiary" ? "bg-tertiary" : "bg-primary-container"}`}
                      style={{ width: p.tone === "error" ? "8%" : p.ratio.replace("%", "") }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-secondary-container/30 p-3.5">
            <p className="flex items-center gap-1.5 text-label-caps uppercase tracking-widest text-on-secondary-container">
              <Icon name="radar" className="text-[16px]" />
              Recomputation
            </p>
            <p className="mt-1 text-metadata-sm text-on-surface-variant">
              Simulating the full source tree on-chain requires 4 recomputes — 1 supplied by an unverified node.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}