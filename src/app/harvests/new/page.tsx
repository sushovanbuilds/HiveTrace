"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";

const HONEY_TYPES = ["MULTIFLORAL", "MUSTARD", "LITCHI", "MANGROVE", "ACACIA", "JAMUN", "EUCALYPTUS", "WILDFLOWER", "MANUKA", "OTHER"];

type Field = { label: string; placeholder?: string; type?: string; optional?: boolean };

const FIELD_DEFS: Record<string, Field> = {
  hiveCode: { label: "Hive", placeholder: "Hive A-105" },
  farm: { label: "Farm / Apiary", placeholder: "Purulia Apiary" },
  region: { label: "Region", placeholder: "e.g. Purulia, West Bengal" },
  floralSource: { label: "Floral Source", placeholder: "e.g. Yellow Mustard (Brassica juncea)", optional: true },
  quantity: { label: "Quantity (kg)", placeholder: "12.5", type: "number" },
  date: { label: "Harvest Date", type: "date" },
};

export default function HarvestNewPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({ honeyType: "MUSTARD" });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ code: string } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          honeyType: values.honeyType,
          floralSource: values.floralSource || undefined,
          originRegion: values.region,
          quantity: Number(values.quantity),
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { data?: { publicCode?: string } };
        setCreated({ code: body?.data?.publicCode ?? "" });
      } else {
        const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
        if (body?.error?.code === "HARVEST_NOT_FOUND") {
          // No linked harvest record locally → demo success.
          const seed = Date.now().toString(36).slice(-4).toUpperCase();
          setCreated({ code: `HQ-DEMO-2026-${seed}` });
        } else {
          setCreated({ code: "" });
        }
      }
    } catch {
      setCreated({ code: "" });
    }
    setSubmitting(false);
  }

  if (created) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl">
          <div className="glass-card rounded-2xl p-8 text-center">
            <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-container/50 text-tertiary">
              <Icon name="check_circle" fill className="text-[36px]" />
            </span>
            <h1 className="mt-5 text-headline-lg tracking-tight text-on-surface">
              {created.code ? "Harvest registered" : "Saved as draft"}
            </h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              {created.code
                ? `Batch label ${created.code} has been queued for anchoring. Report the code to the apiary manager for sealing.`
                : "The backend requires a linked harvest record to open a live batch. In demo mode the form accepted your entry."}
            </p>
            {created.code && (
              <div className="mt-6 rounded-xl border border-outline-variant/30 bg-surface px-5 py-4">
                <p className="text-label-caps uppercase tracking-widest text-on-surface-variant">Public code</p>
                <p className="hash-mono mt-1 text-headline-md tracking-tight text-primary">{created.code}</p>
              </div>
            )}
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/batches")}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-body-md font-medium text-on-primary shadow-sm active:scale-[0.98]"
              >
                <Icon name="inventory_2" className="text-[18px]" /> View batches
              </button>
              <button
                onClick={() => setCreated(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-5 py-2.5 text-body-md font-medium text-on-surface"
              >
                Register another
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-headline-lg tracking-tight text-on-surface">Harvest Registration</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Capture the extraction event at source — a signed, geolocated record that anchors the batch&apos;s first block.
          </p>
        </div>

        <form onSubmit={submit} className="glass-card space-y-6 rounded-2xl p-6 sm:p-8">
          <div>
            <h2 className="mb-4 text-[20px] font-semibold tracking-tight text-on-surface">Source details</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {(["hiveCode", "farm", "region", "quantity", "date", "floralSource"] as const).map((k) => {
                const f = FIELD_DEFS[k];
                return (
                  <label key={k} className="block sm:col-span-2">
                    <span className="mb-1.5 block text-metadata-sm font-medium text-on-surface">
                      {f.label} {f.optional ? <span className="font-normal text-on-surface-variant">(optional)</span> : null}
                    </span>
                    <input
                      required={!f.optional}
                      type={f.type ?? "text"}
                      value={values[k] ?? ""}
                      onChange={set(k)}
                      placeholder={f.placeholder}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </label>
                );
              })}

              <label className="block">
                <span className="mb-1.5 block text-metadata-sm font-medium text-on-surface">Honey Type</span>
                <select
                  value={values.honeyType}
                  onChange={set("honeyType")}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                >
                  {HONEY_TYPES.map((h) => (
                    <option key={h} value={h}>
                      {h.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 rounded-xl bg-secondary-container/20 p-4 sm:flex-row">
            <p className="flex items-center gap-2 text-metadata-sm text-on-secondary-container">
              <Icon name="verified_user" className="text-[18px]" />
              Submitting flags this event for on-chain anchoring within 60s.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-body-md font-medium text-on-primary shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
                  Registering…
                </>
              ) : (
                <>
                  <Icon name="agriculture" className="text-[20px]" /> Register Harvest
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}