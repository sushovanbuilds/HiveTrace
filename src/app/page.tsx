"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { HoneypotList } from "@/components/HoneypotList";
import { ThreatFeed } from "@/components/ThreatFeed";
import type { Honeypot, ThreatReport } from "@/lib/types";

const POLL_MS = 15_000;

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-zinc-950/40 p-4 ring-1 ring-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [honeypots, setHoneypots] = useState<Honeypot[]>([]);
  const [reports, setReports] = useState<ThreatReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [hRes, rRes] = await Promise.all([
        fetch("/api/honeypots"),
        fetch("/api/reports?limit=50"),
      ]);
      if (!hRes.ok || !rRes.ok) {
        throw new Error(
          `API error (honeypots ${hRes.status}, reports ${rRes.status})`,
        );
      }
      setHoneypots((await hRes.json()) as Honeypot[]);
      setReports((await rRes.json()) as ThreatReport[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const activeHoneypots = honeypots.filter((h) => h.status === "ACTIVE").length;
  const criticalReports = reports.filter((r) => r.severity === "CRITICAL").length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Honychain</h1>
          <p className="text-sm text-zinc-500">
            AI-powered blockchain honeypots &amp; threat intelligence
          </p>
        </div>
        <span className="text-xs text-zinc-600">auto-refresh · 15s</span>
      </header>

      {error && (
        <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Honeypots" value={honeypots.length} />
        <StatCard label="Active" value={activeHoneypots} />
        <StatCard label="Critical Reports" value={criticalReports} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-zinc-200">Honeypots</h2>
        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-zinc-900/60" />
        ) : (
          <HoneypotList honeypots={honeypots} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-zinc-200">Threat Feed</h2>
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-zinc-900/60" />
        ) : (
          <ThreatFeed reports={reports} />
        )}
      </section>
    </main>
  );
}
