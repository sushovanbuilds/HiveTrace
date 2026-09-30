import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { LoopStepper } from "@/components/hiveos/loop-stepper";
import { getHiveOSData } from "@/lib/hiveos/demo";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "HIVEOS — Apiary Intelligence",
  description:
    "HIVEOS is the operator console for HiveTrace: sense the hive, understand its state, and act with the reasons in front of you.",
};

const ROLES = [
  {
    name: "Beekeeper",
    icon: "hive",
    tag: "Mobile-first, simple",
    text: "Hives, harvests and next checks — in your pocket, at the apiary. Big touch targets, plain language, offline-friendly.",
    as: "ravi@greenvalley.in",
  },
  {
    name: "Analyst",
    icon: "science",
    tag: "Evidence-first",
    text: "Laboratory evidence tied to batches with the full trail behind every number. Nothing asserted without its evidence attached.",
    as: "dr.anand@nbb.gov.in",
  },
  {
    name: "Processor",
    icon: "factory",
    tag: "Genealogy & operations",
    text: "Batch genealogy and plant operations. Every parent lot behind a batch, every transformation recorded.",
    as: "suresh@amrit.in",
  },
  {
    name: "Distributor",
    icon: "local_shipping",
    tag: "Custody & logistics",
    text: "Handovers recorded, chain unbroken. See where every consignment is and who held it before you.",
    as: "meera@honeyline.in",
  },
];

function fmtDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#14100a] text-[#f5efe2] antialiased selection:bg-[#ffb800]/40">
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ffb800]">{children}</p>
  );
}

export default async function HiveOSEntryPage() {
  const session = await getSession();
  const entryHref = session ? "/dashboard" : "/hiveos/login";
  const entryLabel = session ? "Open console" : "Open HIVEOS";

  // Example twin data — deterministic demo dataset, labelled as such on the page.
  const twin = getHiveOSData("hive_a105");
  const obs = twin.observations;
  const latest = obs[obs.length - 1];
  const inspection = twin.inspections[0];
  const recentAvg = obs.slice(-3).reduce((s, o) => s + (o.tempC ?? 0), 0) / 3;
  const earlierAvg = obs.slice(-10, -7).reduce((s, o) => s + (o.tempC ?? 0), 0) / 3;
  const tempDelta = recentAvg - earlierAvg;
  const warming = tempDelta > 0.3;

  const senseTiles = [
    { icon: "thermostat", label: "Temperature", value: latest.tempC != null ? `${latest.tempC.toFixed(1)}°C` : "—", note: "in-hive sensor" },
    { icon: "water_drop", label: "Humidity", value: latest.humidityPct != null ? `${latest.humidityPct}%` : "—", note: "in-hive sensor" },
    { icon: "scale", label: "Weight", value: latest.weightKg != null ? `${latest.weightKg.toFixed(1)} kg` : "—", note: "hive scale" },
    { icon: "cloud", label: "Weather", value: "39°C highs", note: twin.ambientNote ?? "regional advisory" },
    { icon: "visibility", label: "Field observations", value: inspection ? "Brood solid · queen seen" : "—", note: inspection ? `${inspection.inspector} · ${fmtDate(inspection.date)}` : "" },
  ];

  const whyBullets = [
    twin.evidence[0]?.detail ?? "Sensor readings cross-checked at the last inspection.",
    inspection
      ? `Last inspection (${fmtDate(inspection.date)}): ${inspection.notes}`
      : "No recent inspection on record.",
    twin.ambientNote ?? "No regional weather advisory.",
  ];

  return (
    <Shell>
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#14100a]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/hiveos" className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffb800] text-[#2a1e05]">
              <Icon name="hive" fill className="text-[22px]" />
            </span>
            <span className="text-[15px] font-bold tracking-[0.18em] text-white">HIVEOS</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/scan"
              className="hidden rounded-full px-4 py-2 text-[13px] font-semibold text-white/60 transition-colors hover:text-white sm:inline-block"
            >
              Verify a jar
            </Link>
            <Link
              href={entryHref}
              className="rounded-full bg-[#ffb800] px-4 py-2 text-[13px] font-bold text-[#2a1e05] transition-transform hover:scale-[1.03] active:scale-95"
            >
              {entryLabel}
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,#3a2410_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
          <Eyebrow>HIVEOS · Apiary intelligence</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-balance text-[38px] font-bold leading-[1.05] tracking-tight text-white sm:text-[56px]">
            Intelligence before harvest.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/65">
            HIVEOS is the operator console for HiveTrace. It watches your hives,
            explains what it sees, and recommends the next check — while the
            beekeeper stays in control.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={entryHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffb800] px-6 py-3 text-[15px] font-bold text-[#2a1e05] transition-transform hover:scale-[1.02] active:scale-95"
            >
              {entryLabel}
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
            <a
              href="#loop"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-[15px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              How it works
            </a>
          </div>
          <p className="mt-6 text-[13px] text-white/55">
            Example apiary · 6 demo hives · all data on this page is illustrative
          </p>
        </div>
      </section>

      {/* ── Core loop ───────────────────────────────────── */}
      <section id="loop" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Eyebrow>How HIVEOS works</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[36px]">
            One loop, from signal to memory.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">
            Every hive runs through the same cycle — continuously. Tap a stage
            to see what happens there.
          </p>
          <div className="mt-8">
            <LoopStepper />
          </div>
        </div>
      </section>

      {/* ── Digital twin ────────────────────────────────── */}
      <section className="border-t border-white/10 bg-[#100c07]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Eyebrow>The digital twin</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[36px]">
            A living mirror of every hive.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">
            The twin fuses sensor readings, weather and field notes into one
            model — then walks it through state, reasons, and next checks.
          </p>

          {/* Stage flow */}
          <ol className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Digital twin pipeline">
            {[
              { n: "01", t: "Digital Twin", d: "Sensors + notes fused into one model of the hive." },
              { n: "02", t: "Hive State", d: "The twin's read of colony condition right now." },
              { n: "03", t: "Why Engine", d: "Every conclusion ships with its evidence." },
              { n: "04", t: "Recommended Next Check", d: "Advisory next step — you decide." },
            ].map((s) => (
              <li
                key={s.n}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <p className="font-mono text-[12px] text-[#ffb800]">{s.n}</p>
                <p className="mt-2 text-[15px] font-bold text-white">{s.t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/55">{s.d}</p>
              </li>
            ))}
          </ol>

          {/* Example panel */}
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#171208]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4 sm:px-7">
              <p className="flex items-center gap-2 text-[14px] font-bold text-white">
                <Icon name="hive" className="text-[18px] text-[#ffb800]" />
                Hive A-105 · Purulia Apiary
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
                Example data · demo
              </p>
            </div>

            <div className="grid gap-px bg-white/10 md:grid-cols-[1.2fr_1fr]">
              {/* SENSE */}
              <div className="bg-[#171208] p-5 sm:p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb800]">
                  01 · Digital twin — sense
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-3">
                  {senseTiles.map((t, i) => (
                    <li
                      key={t.label}
                      /* 5 tiles in a 2-col grid: the last one spans both columns
                         so the block doesn't end in an empty half-cell. */
                      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${i === senseTiles.length - 1 ? "col-span-2" : ""}`}
                    >
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-white/65">
                        <Icon name={t.icon} className="text-[15px] text-[#ffb800]/80" />
                        {t.label}
                      </p>
                      <p className="mt-1.5 text-[16px] font-bold leading-snug text-white">{t.value}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-white/60">{t.note}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-px bg-white/10">
                {/* UNDERSTAND */}
                <div className="bg-[#171208] p-5 sm:p-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb800]">
                    02 · Hive state — understand
                  </p>
                  <p className="mt-3 text-[17px] font-semibold leading-snug text-white">
                    Stable colony
                    {warming ? ", temperature mildly elevated over the last few days." : "."}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                    Internal temperature {latest.tempC?.toFixed(1)}°C
                    {warming ? ` — about ${tempDelta.toFixed(1)}°C above the recent baseline` : ", within the recent range"}
                    ; weight {latest.weightKg?.toFixed(1)} kg and climbing; brood pattern solid.
                  </p>
                </div>
                {/* EXPLAIN */}
                <div className="bg-[#171208] p-5 sm:p-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb800]">
                    03 · Why engine — explain
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {whyBullets.map((b, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-white/65">
                        <Icon name="check_circle" className="mt-0.5 shrink-0 text-[16px] text-[#9dc08b]" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* ACT */}
            <div className="border-t border-white/10 bg-[#1d1509] px-5 py-5 sm:px-7 sm:py-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb800]">
                04 · Recommended next check — act
              </p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl">
                  <p className="text-[15px] font-semibold leading-relaxed text-white">
                    Consider watching the temperature trend at the next inspection
                    (due in about a week); if the elevation persists, check ventilation
                    and shade.
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                    Advisory only — HIVEOS suggests, the beekeeper decides and
                    records what was actually done.
                  </p>
                </div>
                <Link
                  href={entryHref}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ffb800]/40 px-5 py-2.5 text-[14px] font-bold text-[#ffb800] transition-colors hover:bg-[#ffb800]/10"
                >
                  See the live twin
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ───────────────────────────────────────── */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Eyebrow>One console, four crafts</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[36px]">
            Each role gets its own experience.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">
            Same intelligence underneath — shaped for the work each person does.
            Sign in with the matching demo account to walk through it.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {ROLES.map((r) => (
              <li key={r.name}>
                <Link
                  href={`/hiveos/login?as=${encodeURIComponent(r.as)}`}
                  className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-[#ffb800]/40 hover:bg-white/[0.05] sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffb800]/12 text-[#ffb800]">
                      <Icon name={r.icon} className="text-[22px]" />
                    </span>
                    <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">
                      {r.tag}
                    </span>
                  </div>
                  <p className="mt-4 text-[19px] font-bold text-white">{r.name}</p>
                  <p className="mt-2 flex-1 text-[14px] leading-relaxed text-white/60">{r.text}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#ffb800]">
                    Enter as {r.name.toLowerCase()}
                    <Icon name="arrow_forward" className="text-[16px] transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Beekeeper in control ────────────────────────── */}
      <section className="border-t border-white/10 bg-[#100c07]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Eyebrow>The human stays in charge</Eyebrow>
              <h2 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-white text-balance sm:text-[36px]">
                The beekeeper remains in control.
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/60">
                HIVEOS is an advisor, not an authority. It never presents a
                recommendation as absolute truth — it shows its working, and the
                person at the hive makes the final call.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                { icon: "psychology", t: "Advisory by design", d: "Every recommendation is labelled as a suggestion with its reasons. Nothing auto-executes." },
                { icon: "visibility", t: "Reasons before conclusions", d: "The Why Engine shows the readings, comparisons and context behind every flag — inspectable by anyone." },
                { icon: "handshake", t: "Decisions stay human", d: "Actions are recorded as taken by a named person. HIVEOS remembers the outcome; people own the choice." },
              ].map((p) => (
                <li key={p.t} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffb800]/12 text-[#ffb800]">
                    <Icon name={p.icon} className="text-[20px]" />
                  </span>
                  <div>
                    <p className="text-[15px] font-bold text-white">{p.t}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/55">{p.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Separation / footer CTA ─────────────────────── */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 sm:py-24">
          <Eyebrow>Two doors, one hive</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-xl text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[36px]">
            Operators enter here. Everyone else, the jar is the door.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-white/60">
            HIVEOS is the working console for beekeepers, analysts, processors
            and distributors. If you bought a jar of honey, you don&rsquo;t need any
            of this — just scan the code.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={entryHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffb800] px-6 py-3 text-[15px] font-bold text-[#2a1e05] transition-transform hover:scale-[1.02] active:scale-95"
            >
              {entryLabel}
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-[15px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              <Icon name="qr_code_scanner" className="text-[18px]" />
              Verify a jar
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-[13px] text-white/55 sm:flex-row sm:px-8">
          <p className="flex items-center gap-2">
            <Icon name="hive" className="text-[16px] text-[#ffb800]/70" />
            HIVEOS · the operator console for HiveTrace
          </p>
          <p>
            <Link href="/" className="py-2 hover:text-white/70">HiveTrace</Link>
            {" · "}
            <Link href="/scan" className="py-2 hover:text-white/70">Consumer verification</Link>
          </p>
        </div>
      </footer>
    </Shell>
  );
}
