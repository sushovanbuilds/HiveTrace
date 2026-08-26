import { severityRank, type ThreatReport } from "@/lib/types";

const SEVERITY_STYLES: Record<ThreatReport["severity"], string> = {
  LOW: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  HIGH: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  CRITICAL: "bg-red-500/15 text-red-300 ring-red-500/30",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function ThreatFeed({ reports }: { reports: ThreatReport[] }) {
  if (reports.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No threat reports yet. Attack the honeypot on a local node to generate
        one.
      </p>
    );
  }

  const sorted = [...reports].sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ul className="space-y-3">
      {sorted.map((r) => (
        <li
          key={r.id}
          className="rounded-xl bg-zinc-950/40 p-4 ring-1 ring-zinc-800"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLES[r.severity]}`}
            >
              {r.severity}
            </span>
            <span className="font-mono text-xs text-zinc-500">{r.vector}</span>
          </div>
          <p className="mt-2 text-sm text-zinc-200">{r.summary}</p>
          <p className="mt-1 text-xs text-zinc-500">{formatTime(r.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
