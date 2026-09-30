import { Icon } from "@/components/icons";
import { GlassCard, Pill } from "@/components/ui";
import type { HealthEvent, HiveInspection, HivePassport } from "@/lib/hiveos/types";
import { SectionTitle } from "./shared";

const EVENT_ICON: Record<HealthEvent["kind"], string> = {
  STATE_CHANGE: "sync",
  ANOMALY: "warning",
  COLONY_LOSS: "error",
  RECOVERY: "healing",
  NOTE: "info",
};

/**
 * HIVE PASSPORT — the hive's identity, location, colony status, inspection
 * history, environmental observations and health events in one place.
 */
export function HivePassportCard({
  passport,
  inspections,
  healthEvents,
  ambientNote,
}: {
  passport: HivePassport;
  inspections: HiveInspection[];
  healthEvents: HealthEvent[];
  ambientNote: string | null;
}) {
  const rows: Array<[string, string]> = [
    ["Hive code", passport.code],
    ["Hive type", passport.type],
    ["Apiary", passport.farm],
    ["Region", passport.region],
    ["Location", passport.location ?? "—"],
    ["Installed", passport.installedAt],
    ["Colony status", passport.status.replace(/_/g, " ")],
    ["Queen", passport.queenStatus],
    ["Harvests", `${passport.harvestCount} · ${passport.totalHarvestedKg} kg total`],
  ];

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle icon="badge">Hive passport</SectionTitle>
        {passport.id.startsWith("hive_") && (
          <Pill tone="surface">Demo record</Pill>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-label-caps uppercase tracking-wider text-on-surface-variant">{k}</dt>
            <dd className="mt-0.5 text-body-md font-medium text-on-surface">{v}</dd>
          </div>
        ))}
      </dl>

      {ambientNote && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-primary-container/15 p-3 text-metadata-sm text-on-surface-variant">
          <Icon name="wb_sunny" className="mt-0.5 shrink-0 text-[18px]" />
          {ambientNote}
        </p>
      )}

      <div className="mt-6">
        <p className="mb-3 text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
          Inspection history
        </p>
        {inspections.length === 0 ? (
          <p className="text-metadata-sm text-on-surface-variant">No inspections recorded.</p>
        ) : (
          <div className="space-y-2.5">
            {inspections.map((i) => (
              <div key={i.id} className="rounded-xl border border-outline-variant/25 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-md font-medium text-on-surface">
                    {new Date(i.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    <span className="ml-2 font-normal text-on-surface-variant">{i.inspector}</span>
                  </p>
                  <div className="flex gap-1.5">
                    <Pill tone={i.broodPattern === "SOLID" ? "tertiary" : i.broodPattern === "PATCHY" ? "honey" : "error"}>
                      {i.broodPattern} brood
                    </Pill>
                    <Pill tone={i.varroaIndex >= 3 ? "error" : i.varroaIndex === 2 ? "honey" : "surface"}>
                      Varroa {i.varroaIndex}/3
                    </Pill>
                    <Pill tone={i.queenSeen ? "tertiary" : "warn"}>
                      {i.queenSeen ? "Queen seen" : "Queen not seen"}
                    </Pill>
                  </div>
                </div>
                <p className="mt-1.5 text-metadata-sm text-on-surface-variant">{i.notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {healthEvents.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
            Health events
          </p>
          <div className="space-y-2">
            {healthEvents.map((e) => (
              <div key={e.id} className="flex items-start gap-2.5 text-metadata-sm">
                <Icon name={EVENT_ICON[e.kind]} className="mt-0.5 shrink-0 text-[18px] text-on-surface-variant" />
                <div>
                  <p className="font-medium text-on-surface">
                    {e.title}
                    <span className="ml-2 font-normal text-on-surface-variant">
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </p>
                  <p className="text-on-surface-variant">{e.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
