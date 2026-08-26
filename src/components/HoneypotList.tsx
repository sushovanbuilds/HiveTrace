import type { Honeypot } from "@/lib/types";

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const STATUS_STYLES: Record<Honeypot["status"], string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  COMPROMISED: "bg-red-500/15 text-red-400 ring-red-500/30",
  RETIRED: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
};

export function HoneypotList({ honeypots }: { honeypots: Honeypot[] }) {
  if (honeypots.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No honeypots deployed yet. Use the deployment agent to spin one up on a
        local node.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900 text-zinc-400">
          <tr>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Address</th>
            <th className="px-4 py-2 font-medium">Network</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {honeypots.map((h) => (
            <tr key={h.id} className="bg-zinc-950/40">
              <td className="px-4 py-2 font-medium text-zinc-100">{h.type}</td>
              <td className="px-4 py-2 font-mono text-zinc-400">
                {shortAddress(h.address)}
              </td>
              <td className="px-4 py-2 text-zinc-400">{h.network}</td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[h.status]}`}
                >
                  {h.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
