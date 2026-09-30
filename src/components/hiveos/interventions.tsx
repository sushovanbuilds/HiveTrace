/**
 * INTERVENTION MEMORY — client component.
 * Past interventions are shown as historical context; new ones are logged to
 * localStorage (demo persistence, matching the app's demo-data pattern).
 * The stored entries are read via useSyncExternalStore so the component stays
 * consistent without setState-in-effect.
 */
"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { GlassCard, Pill, type PillTone } from "@/components/ui";
import type { Intervention } from "@/lib/hiveos/types";
import { SectionTitle } from "./shared";

const OUTCOME_TONE: Record<Intervention["outcome"], PillTone> = {
  RESOLVED: "tertiary",
  IMPROVED: "honey",
  NO_CHANGE: "surface",
  WORSENED: "error",
  PENDING: "warn",
};

const storeKey = (hiveId: string) => `hiveos:interventions:v1:${hiveId}`;

function parseStored(raw: string): Intervention[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Intervention[]) : [];
  } catch {
    return [];
  }
}

const emptyForm = { detectedProblem: "", recommendedAction: "", actionTaken: "", outcome: "PENDING" as Intervention["outcome"] };

export function InterventionMemory({ hiveId, seed }: { hiveId: string; seed: Intervention[] }) {
  const [, setRev] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const subscribe = useCallback(
    (cb: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === storeKey(hiveId)) cb();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
    [hiveId],
  );
  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(storeKey(hiveId)) ?? "";
    } catch {
      return "";
    }
  }, [hiveId]);
  // Re-read after our own writes (the storage event only fires in other tabs).
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "");

  const items = useMemo(() => {
    const stored = parseStored(snapshot);
    const seen = new Set(stored.map((s) => s.id));
    return [...stored, ...seed.filter((s) => !seen.has(s.id))];
  }, [snapshot, seed]);

  const save = (entry: Intervention) => {
    const stored = parseStored(snapshot);
    try {
      localStorage.setItem(storeKey(hiveId), JSON.stringify([entry, ...stored]));
    } catch {
      // storage full/blocked — the entry still shows for this session via rev
    }
    setRev((r) => r + 1);
  };

  const submit = () => {
    if (!form.detectedProblem.trim() || !form.actionTaken.trim()) return;
    save({
      id: `local-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      detectedProblem: form.detectedProblem.trim(),
      recommendedAction: form.recommendedAction.trim() || "—",
      actionTaken: form.actionTaken.trim(),
      outcome: form.outcome,
    });
    setForm(emptyForm);
    setOpen(false);
  };

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle icon="history">Intervention memory</SectionTitle>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container/40 px-3 py-1.5 text-metadata-sm font-medium text-on-primary-container transition-colors hover:bg-primary-container/60"
        >
          <Icon name="add" className="text-[16px]" />
          Log intervention
        </button>
      </div>

      {open && (
        <div className="mb-5 space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
          <label className="block">
            <span className="mb-1 block text-label-caps uppercase tracking-wider text-on-surface-variant">Detected problem *</span>
            <input value={form.detectedProblem} onChange={(e) => set("detectedProblem", e.target.value)}
              placeholder="e.g. Internal temperature above 37.5°C for 3 days"
              className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-body-md text-on-surface" />
          </label>
          <label className="block">
            <span className="mb-1 block text-label-caps uppercase tracking-wider text-on-surface-variant">Recommended action</span>
            <input value={form.recommendedAction} onChange={(e) => set("recommendedAction", e.target.value)}
              placeholder="e.g. Fit shade board and check water"
              className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-body-md text-on-surface" />
          </label>
          <label className="block">
            <span className="mb-1 block text-label-caps uppercase tracking-wider text-on-surface-variant">Action taken *</span>
            <input value={form.actionTaken} onChange={(e) => set("actionTaken", e.target.value)}
              placeholder="e.g. Shade board fitted; water tray refilled"
              className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-body-md text-on-surface" />
          </label>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2">
              <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">Outcome</span>
              <select value={form.outcome} onChange={(e) => set("outcome", e.target.value)}
                className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-body-md text-on-surface">
                {(["RESOLVED", "IMPROVED", "NO_CHANGE", "WORSENED", "PENDING"] as const).map((o) => (
                  <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-metadata-sm text-on-surface-variant hover:bg-surface-variant">Cancel</button>
              <button onClick={submit}
                disabled={!form.detectedProblem.trim() || !form.actionTaken.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-metadata-sm font-medium text-on-primary disabled:opacity-40">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">No interventions recorded for this hive yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="rounded-xl border border-outline-variant/25 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-metadata-sm text-on-surface-variant">
                  {new Date(i.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <Pill tone={OUTCOME_TONE[i.outcome]}>{i.outcome.replace(/_/g, " ")}</Pill>
              </div>
              <div className="grid gap-2 text-metadata-sm sm:grid-cols-3">
                <div>
                  <p className="text-label-caps uppercase tracking-wider text-on-surface-variant">Detected</p>
                  <p className="mt-0.5 text-on-surface">{i.detectedProblem}</p>
                </div>
                <div>
                  <p className="text-label-caps uppercase tracking-wider text-on-surface-variant">Recommended</p>
                  <p className="mt-0.5 text-on-surface">{i.recommendedAction}</p>
                </div>
                <div>
                  <p className="text-label-caps uppercase tracking-wider text-on-surface-variant">Action taken</p>
                  <p className="mt-0.5 text-on-surface">{i.actionTaken}</p>
                </div>
              </div>
              {i.notes && <p className="mt-2 text-[12px] italic text-on-surface-variant">{i.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
