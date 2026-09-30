import { ClientPageLoader } from "@/components/page-loader";
import Link from "next/link";
import { qrToSvg } from "@/lib/qr/svg";
import { Icon } from "@/components/icons";
import { HexOrbit } from "@/components/hex-orbit";
import { Decode } from "@/components/threeui/Decode";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Pill,
  SectionHeading,
} from "@/components/ui";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DEMO_BATCH = "HC-2026-00124";

/* ── Minimal public nav: wordmark · How It Works · HIVEOS · [Scan & Verify] ── */
function PublicNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-bark-950/8 bg-cream/80 backdrop-blur-xl">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-honey text-honey-ink">
              <Icon name="hive" fill className="text-[20px]" />
            </span>
            <span className="text-heading-sm font-bold tracking-tight text-bark-950">
              HIVETRACE
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#how-it-works" className="py-2 text-nav text-bark-700 transition-colors hover:text-bark-950">
              How It Works
            </Link>
            <Link href="/hiveos" className="py-2 text-nav text-bark-700 transition-colors hover:text-bark-950">
              HIVEOS
            </Link>
          </nav>
          <ButtonLink href="/scan" variant="cta" size="sm" icon="qr_code_scanner">
            Scan &amp; Verify
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}

/* ── 1. HERO ─────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-16">
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[560px] w-[560px] rounded-full bg-honey/10 blur-3xl" />
      <Container>
        <div className="grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow icon="verified">Honey traceability, verified</Eyebrow>
            {/* ThreeUI TextAnimationCollection (article-headings variant): one
                restrained decode reveal on the brand statement. DOM text over
                the HexOrbit canvas — no second WebGL scene. */}
            <Decode as="h1" className="text-display text-bark-950 text-balance">
              Know where your honey came from.
            </Decode>
            <p className="max-w-measure text-body-lg text-on-surface-variant">
              From hive to home, every verified batch has a story.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/scan" variant="cta" size="lg" icon="qr_code_scanner">
                Scan &amp; Verify
              </ButtonLink>
              <ButtonLink href="/hiveos" variant="hiveos" size="lg" iconRight="arrow_forward">
                Open HIVEOS
              </ButtonLink>
            </div>
            <p className="text-caption text-on-surface-variant">
              No account needed — point your camera at any HiveTrace QR.
            </p>
          </div>

          {/* Hero visual: honeycomb field + live verification chip */}
          <div className="relative h-[320px] sm:h-[420px] lg:h-[560px]">
            <div className="absolute inset-0">
              <HexOrbit />
            </div>
            <div className="glass-panel absolute right-2 top-8 flex items-center gap-3 rounded-2xl p-4 sm:right-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-leaf/10">
                <Icon name="verified" fill className="text-[22px] text-leaf" />
              </span>
              <div>
                <p className="text-eyebrow uppercase text-on-surface-variant">Batch verified</p>
                <p className="hash-mono text-metadata font-semibold text-bark-950">
                  {DEMO_BATCH}
                </p>
              </div>
            </div>
            <div className="glass-panel absolute bottom-8 left-2 flex items-center gap-3 rounded-2xl p-4 sm:left-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-honey/15">
                <Icon name="science" className="text-[22px] text-honey-deep" />
              </span>
              <div>
                <p className="text-eyebrow uppercase text-on-surface-variant">Laboratory evidence</p>
                <p className="text-metadata font-semibold text-bark-950">
                  12 parameters tested
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── 2. QR VERIFICATION PREVIEW ──────────────────────────────── */
function QrPreview() {
  const verifyUrl = `${SITE_URL}/verify/${DEMO_BATCH}`;
  const qrSvg = qrToSvg(verifyUrl, {
    dark: "#2a1e05",
    light: "#ffffff",
    pixelSize: 208,
    moduleRadius: 0.18,
    title: `Scan to verify batch ${DEMO_BATCH}`,
  });
  const steps = [
    { icon: "qr_code_scanner", title: "Scan the QR", body: "Every jar carries a HiveTrace code." },
    { icon: "verified", title: "See the verdict", body: "Verified, with the evidence behind it." },
    { icon: "route", title: "Follow the journey", body: "Hive to home, step by step." },
  ];
  return (
    <section id="scan" className="bg-cream-deep/60">
      <Container>
        <div className="grid items-center gap-12 py-section lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Try it now"
              title="Scan it. See the story."
              lede="This is a real code. Point your phone camera at it — you'll land on a live verification result for a demo batch."
            />
            <ol className="mt-8 flex flex-col gap-5">
              {steps.map((s, i) => (
                <li key={s.title} className="flex items-start gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bark-950 text-cream">
                    <Icon name={s.icon} className="text-[20px]" />
                  </span>
                  <div>
                    <p className="text-body-md font-semibold text-bark-950">
                      <span className="mr-2 text-caption text-honey-deep">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-body-sm text-on-surface-variant">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8">
              <ButtonLink href="/scan" variant="outline" icon="qr_code_scanner">
                Open the scanner
              </ButtonLink>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="rounded-3xl bg-cream-raised p-8 shadow-lift card-border">
              <div
                className="overflow-hidden rounded-2xl"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                role="img"
                aria-label={`QR code linking to the verification page for batch ${DEMO_BATCH}`}
              />
              <p className="hash-mono mt-4 text-center text-metadata text-on-surface-variant">
                {DEMO_BATCH} · demo
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── 3. TRACEABILITY JOURNEY ─────────────────────────────────── */
const JOURNEY = [
  { icon: "hive", label: "Hive", body: "Registered apiary, known coordinates." },
  { icon: "agriculture", label: "Harvest", body: "Date, keeper, floral source." },
  { icon: "inventory_2", label: "Batch", body: "One identity, sealed at origin." },
  { icon: "science", label: "Laboratory", body: "Independent purity testing." },
  { icon: "factory", label: "Processing", body: "Extraction and packing logged." },
  { icon: "local_shipping", label: "Distribution", body: "Custody, step by step." },
  { icon: "home", label: "Consumer", body: "You — scanning this page." },
];

function Journey() {
  return (
    <section id="how-it-works">
      <Container>
        <div className="py-section">
          <SectionHeading
            align="center"
            eyebrow="How it works"
            title={<Decode as="span">One batch. Seven chapters.</Decode>}
            lede="Every verified jar carries the same journey — recorded once, at the moment it happens, and sealed against tampering."
          />
          {/* 7 chapters in a 2-col (mobile) or 4-col (tablet) grid always leaves
              exactly one empty cell. The final "Consumer — you" chapter spans it
              so the row never ends in a hole; on the 7-col desktop grid it
              returns to a single cell. */}
          <ol className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {JOURNEY.map((s, i) => (
              <li
                key={s.label}
                className="relative flex flex-col items-center gap-3 rounded-2xl bg-cream-raised p-5 text-center card-border last:col-span-2 lg:last:col-span-1"
              >
                <span className="text-eyebrow text-honey-deep">{String(i + 1).padStart(2, "0")}</span>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-honey/15 text-honey-deep">
                  <Icon name={s.icon} className="text-[24px]" />
                </span>
                <p className="text-body-md font-semibold text-bark-950">{s.label}</p>
                <p className="text-caption text-on-surface-variant">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

/* ── 4. BATCH VERIFICATION (demo) ────────────────────────────── */
function BatchVerification() {
  return (
    <section id="batch" className="bg-cream-deep/60">
      <Container>
        <div className="py-section">
          <SectionHeading
            eyebrow="Proof, not promises"
            title="A verification result, up close."
            lede="This is what a consumer sees after scanning — the batch, its hive, and the laboratory evidence behind the verdict."
          />
          <div className="mx-auto mt-10 max-w-2xl rounded-3xl bg-cream-raised p-6 shadow-lift card-border sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf/10">
                  <Icon name="verified" fill className="text-[26px] text-leaf" />
                </span>
                <div>
                  <p className="text-heading-md text-bark-950">Verified batch</p>
                  <p className="text-caption text-on-surface-variant">Mustard honey · Purulia, West Bengal</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Pill tone="surface">Demo data</Pill>
                <Pill tone="tertiary" dot="bg-tertiary">Low risk</Pill>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-bark-950/8 sm:grid-cols-3">
              {[
                { k: "Hive", v: "HIVE-A014" },
                { k: "Batch", v: DEMO_BATCH },
                { k: "Laboratory report", v: "LAB-2026-441" },
              ].map((row) => (
                <div key={row.k} className="bg-cream-raised px-5 py-4">
                  <dt className="text-eyebrow uppercase text-on-surface-variant">{row.k}</dt>
                  <dd className="hash-mono mt-1 text-body-md font-semibold text-bark-950">{row.v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-on-surface-variant">
                Laboratory evidence and the full journey are one tap away.
              </p>
              <ButtonLink href={`/verify/${DEMO_BATCH}`} variant="cta" iconRight="arrow_forward">
                View full verification
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── 5. TRUST / EVIDENCE ─────────────────────────────────────── */
function Trust() {
  return (
    <section id="evidence">
      <Container>
        <div className="py-section">
          <SectionHeading
            align="center"
            eyebrow="Why it can be trusted"
            title="Two kinds of proof."
            lede="Verification rests on two independent pillars. Neither one works alone — and we don't pretend otherwise."
          />
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="rounded-3xl bg-cream-raised p-8 card-border">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-honey/15 text-honey-deep">
                <Icon name="science" className="text-[26px]" />
              </span>
              <h3 className="mt-5 text-heading-lg text-bark-950">Laboratory evidence</h3>
              <p className="mt-3 text-body-md text-on-surface-variant">
                Independent labs test what the honey <em>is</em> — purity, composition,
                floral markers, contaminants. This is the only thing that can speak to
                quality. A certificate is attached to the batch it tested, nothing else.
              </p>
            </div>
            <div className="rounded-3xl bg-cream-raised p-8 card-border">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-bark-950/8 text-bark-800">
                <Icon name="fingerprint" className="text-[26px]" />
              </span>
              <h3 className="mt-5 text-heading-lg text-bark-950">Record integrity</h3>
              <p className="mt-3 text-body-md text-on-surface-variant">
                Every event — harvest, laboratory result, custody transfer — is written once and
                sealed with tamper-evident anchoring. Anyone can detect if the story was
                altered after the fact.
              </p>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-body-md text-on-surface-variant">
            An honest distinction: a tamper-evident record proves the story{" "}
            <strong className="font-semibold text-bark-950">hasn&apos;t changed</strong>.
            It does not prove the honey is pure —{" "}
            <strong className="font-semibold text-bark-950">only the lab can do that</strong>.
          </p>
        </div>
      </Container>
    </section>
  );
}

/* ── 6. HIVEOS — the separate operational system ─────────────── */
const HIVEOS_FLOW = [
  { icon: "sensors", label: "Sensors", body: "Hive weight, temperature, humidity." },
  { icon: "view_in_ar", label: "Digital Twin", body: "A living model of each hive." },
  { icon: "hub", label: "Context", body: "Weather, flora, season, history." },
  { icon: "lightbulb", label: "Recommendation", body: "What to check, and why." },
  { icon: "fact_check", label: "Recheck", body: "Verify the outcome, close the loop." },
];

function HiveOs() {
  return (
    <section id="hiveos" className="bg-bark-950 text-cream">
      <Container>
        <div className="py-section">
          <Eyebrow tone="honey">For producers — a separate system</Eyebrow>
          <h2 className="mt-3 max-w-measure text-heading-xl text-cream text-balance">
            HIVEOS. Intelligence before harvest.
          </h2>
          <p className="mt-4 max-w-measure text-body-lg text-cream/70">
            The operational side of HiveTrace — for beekeepers, analysts, processors and
            distributors. It watches the hives so problems are caught before they reach
            the jar.
          </p>
          {/* 5 cards in a 2-col (mobile) or 3-col (tablet) grid leaves one
              empty cell — same rule as the journey grid above. */}
          <ol className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {HIVEOS_FLOW.map((s, i) => (
              <li key={s.label} className="rounded-2xl border border-cream/10 bg-cream/5 p-5 last:col-span-2 lg:last:col-span-1">
                <span className="text-eyebrow text-honey">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-3 flex h-11 w-11 items-center justify-center rounded-xl bg-honey/15 text-honey">
                  <Icon name={s.icon} className="text-[22px]" />
                </span>
                <p className="mt-3 text-body-md font-semibold text-cream">{s.label}</p>
                <p className="mt-1 text-caption text-cream/60">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <ButtonLink href="/hiveos" variant="cta" size="lg" iconRight="arrow_forward">
              Enter HIVEOS
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── 7. FINAL CTA ────────────────────────────────────────────── */
function FinalCta() {
  return (
    <section>
      <Container>
        <div className="flex flex-col items-center gap-6 py-section text-center">
          <Eyebrow>Start here</Eyebrow>
          <h2 className="max-w-measure text-heading-xl text-bark-950 text-balance">
            Every jar has a story. Read it.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/scan" variant="cta" size="lg" icon="qr_code_scanner">
              Scan & Verify
            </ButtonLink>
            <ButtonLink href="/hiveos" variant="outline" size="lg" iconRight="arrow_forward">
              Enter HIVEOS
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-bark-950/8">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 py-10 md:flex-row md:items-center">
          <div>
            <p className="text-heading-sm font-bold tracking-tight text-bark-950">HIVETRACE</p>
            <p className="mt-1 text-caption text-on-surface-variant">
              From hive to home, verified. © {new Date().getFullYear()} HiveTrace.
            </p>
          </div>
          <nav className="flex gap-6">
            {[
              { label: "How It Works", href: "#how-it-works" },
              { label: "Verify", href: "/scan" },
              { label: "HIVEOS", href: "/hiveos" },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="py-2 text-nav text-bark-700 transition-colors hover:text-bark-950">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <ClientPageLoader>
      <div className="min-h-screen bg-cream text-on-surface">
      <PublicNav />
      <main>
        <Hero />
        <QrPreview />
        <Journey />
        <BatchVerification />
        <Trust />
        <HiveOs />
        <FinalCta />
      </main>
      <Footer />
    </div>
    </ClientPageLoader>
  );
}
