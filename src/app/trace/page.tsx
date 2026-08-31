"use client";

import { AppShell } from "@/components/app-shell";
import { BatchCard } from "@/components/demo/batch-card";
import { useDemoData } from "@/lib/demo/hooks";

export default function TraceIndex() {
  const data = useDemoData();

  const open = data.batches.filter((b) => b.anomaly === "NONE");
  const flagged = data.batches.filter((b) => b.anomaly !== "NONE");

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
          Traceability
        </h1>
        <p className="mt-1 text-body-lg text-on-surface-variant">
          Open any batch to inspect its full, shared journey across every role.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...open, ...flagged].map((batch) => (
          <BatchCard
            key={batch.id}
            batch={batch}
            detailHref={`/trace/${encodeURIComponent(batch.id)}`}
            actorEmails={[]}
          />
        ))}
      </div>
    </AppShell>
  );
}
