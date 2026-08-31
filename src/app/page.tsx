import Link from "next/link";
import { Icon } from "@/components/icons";
import { HexOrbit } from "@/components/hex-orbit";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-on-surface">
      <div className="pointer-events-none absolute -top-72 -right-64 h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle,rgba(255,184,0,0.10)_0%,rgba(255,184,0,0)_60%)]" />

      {/* Top navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-outline-variant/10 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-[24px] py-2 md:px-[64px]">
          <div className="flex items-center gap-8">
            <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
              HiveTrace
            </span>
            <nav className="ml-8 hidden gap-8 md:flex">
              {["Trace", "Platform", "About"].map((l) => (
                <a
                  key={l}
                  href={l === "Trace" ? "/verify" : l === "Platform" ? "/dashboard" : "#about"}
                  className="text-metadata-sm font-medium text-on-surface transition-colors hover:text-primary"
                >
                  {l}
                </a>
              ))}
            </nav>
          </div>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] px-5 py-2 text-metadata-sm text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 hover:-translate-y-px hover:bg-[#2a2a2a]"
          >
            <Icon name="verified" fill className="text-[18px] text-primary-container" />
            Verify Batch
          </Link>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-outline-variant/10 bg-white/60 px-[24px] py-4 backdrop-blur-xl md:hidden">
        <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">HiveTrace</span>
        <Icon name="menu" className="text-on-surface-variant" />
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-[24px] md:px-[64px] pb-[64px] pt-40">
        {/* Hero */}
        <section className="relative z-10 flex min-h-[600px] w-full flex-col items-center gap-8 lg:flex-row">
          <div className="z-20 flex w-full flex-col gap-6 text-left lg:w-1/2">
            <h1 className="text-[40px] font-bold leading-[1.1] tracking-tighter text-on-surface md:text-[72px] md:leading-[1]">
              Sunderbans to&nbsp;Home,{" "}
              <span className="relative inline-block text-primary">
                Verified.
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 400 14"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M3 11C110 3 220 3 397 8"
                    stroke="#FFB800"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="max-w-xl text-body-lg text-on-surface-variant">
              Trace every step of your honey&apos;s journey from the mangrove forests of West
              Bengal with trusted provenance, quality evidence and intelligent supply-chain
              visibility.
            </p>
            <div className="mt-2 flex gap-4">
              <Link
                href="/verify"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] px-6 py-3 text-metadata-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 hover:-translate-y-px hover:bg-[#2a2a2a]"
              >
                <Icon name="verified" fill className="text-primary-container" />
                Verify Batch
              </Link>
              <Link
                href="/dashboard"
                className="hidden rounded-lg border border-black/10 bg-white/50 px-6 py-3 text-metadata-sm font-medium text-on-surface backdrop-blur transition-all duration-200 hover:-translate-y-px hover:bg-white/80 sm:inline-flex sm:items-center sm:gap-2"
              >
                Explore Platform
                <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
          </div>

          {/* Visual / animation area */}
          <div className="relative mt-16 flex h-[420px] w-full items-center justify-center lg:mt-0 lg:h-[600px] lg:w-1/2">
            <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-gradient-to-br from-primary-container/10 to-transparent blur-3xl" />
            <div className="absolute inset-0">
              <HexOrbit />
            </div>

            {/* Floating glass panel: origin */}
            <div className="glass-panel absolute right-2 top-16 flex animate-[floatY_6s_ease-in-out_infinite] items-center gap-3 rounded-xl p-4 lg:right-6 lg:top-20">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-tertiary/20 bg-tertiary/10">
                <Icon name="verified" fill className="text-[16px] text-tertiary" />
              </span>
              <div>
                <p className="text-label-caps uppercase tracking-[0.05em] text-on-surface-variant/80">Origin</p>
                <p className="text-metadata-sm font-semibold tracking-tight text-on-surface">
                  Sundarbans Reserve Forest
                </p>
              </div>
            </div>

            {/* Floating glass panel: anchor */}
            <div className="glass-panel absolute bottom-16 left-2 flex max-w-[280px] animate-[floatY_7s_ease-in-out_infinite_alternate] items-start gap-3 rounded-xl p-4 lg:bottom-20 lg:left-6">
              <Icon name="security" fill className="mt-0.5 text-lg text-primary" />
              <div>
                <p className="text-metadata-sm font-semibold tracking-tight text-on-surface">
                  Cryptographic Anchor
                </p>
                <p className="mt-1 text-body-md text-sm leading-relaxed text-on-surface-variant">
                  Batch #WB-24-908 events cryptographically secured on-chain.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features — bento grid */}
        <section className="mt-16 flex w-full flex-col gap-16 pt-16">
          <div className="mx-auto w-full max-w-2xl text-center">
            <h2 className="text-[32px] font-bold tracking-tight text-on-surface md:text-headline-lg">
              The Standard of Purity
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              Enterprise-grade infrastructure delivering absolute certainty.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Card 1 — End-to-End Traceability */}
            <div className="group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl border border-black/5 bg-white/50 p-8 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] lg:col-span-8">
              <div className="pointer-events-none absolute -mr-20 -mt-20 right-0 top-0 h-64 w-64 rounded-full bg-primary-container/10 blur-3xl transition-colors group-hover:bg-primary-container/20" />
              <div className="relative z-10">
                <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/5 bg-surface shadow-sm">
                  <Icon name="route" className="text-xl text-primary" />
                </div>
                <h3 className="mb-2 font-headline-md text-headline-md tracking-tight text-on-surface">
                  End-to-End Traceability
                </h3>
                <p className="max-w-md text-body-md text-on-surface-variant">
                  From the exact apiary location in Gosaba to the final jar, every movement is
                  tracked and immutable.
                </p>
              </div>
              <div className="relative z-10 mt-8 flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-surface/50 backdrop-blur-md">
                <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-black/10" />
                <div className="absolute top-1/2 flex w-3/4 -translate-y-1/2 justify-between">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,88,0,0.55)]" />
                  <span className="h-2.5 w-2.5 translate-y-2 rounded-full bg-primary shadow-[0_0_8px_rgba(124,88,0,0.55)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,88,0,0.55)]" />
                  <span className="h-2.5 w-2.5 translate-y-1 rounded-full border border-black/20 bg-surface-dim" />
                  <span className="h-2.5 w-2.5 rounded-full border border-black/20 bg-surface-dim" />
                </div>
                {["Harvest", "Collection", "Lab", "Processing", "Shipping", "Retail"].map((s, idx) => (
                  <span
                    key={s}
                    className="absolute bottom-2 text-metadata-sm uppercase tracking-[0.09em] text-on-surface-variant/70"
                    style={{ left: `${10 + idx * 16}%` }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Card 2 — Verified Quality */}
            <div className="col-span-1 flex flex-col justify-between rounded-2xl border border-black/5 bg-white/50 p-8 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] lg:col-span-4">
              <div>
                <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-tertiary/10 bg-tertiary-container/10 shadow-sm">
                  <Icon name="science" className="text-xl text-tertiary" />
                </div>
                <h3 className="mb-2 font-headline-md text-headline-md tracking-tight text-on-surface">
                  Verified Quality
                </h3>
                <p className="text-body-md text-on-surface-variant">
                  FSSAI lab results and floral composition embedded directly into the digital
                  passport.
                </p>
              </div>
              <div className="mt-8 flex gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/20 bg-tertiary/10 px-3 py-1 text-label-caps text-tertiary">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                  Lab Tested
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface px-3 py-1 text-label-caps text-on-surface-variant">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  12 Parameters
                </span>
              </div>
            </div>

            {/* Card 3 — Smart Beekeeping */}
            <div className="col-span-1 flex flex-col justify-between rounded-2xl border border-black/5 bg-white/50 p-8 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] lg:col-span-5">
              <div>
                <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/5 bg-surface shadow-sm">
                  <Icon name="sensors" className="text-xl text-secondary" />
                </div>
                <h3 className="mb-2 font-headline-md text-headline-md tracking-tight text-on-surface">
                  Smart Beekeeping
                </h3>
                <p className="text-body-md text-on-surface-variant">
                  IoT integration monitors hive health, temperature and nectar flow in real time
                  across Bengal apiaries.
                </p>
              </div>
            </div>

            {/* Card 4 — Trusted Provenance */}
            <div className="relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl border border-black/5 bg-white/50 p-8 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] lg:col-span-7">
              <div className="relative z-10">
                <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/5 bg-surface shadow-sm">
                  <Icon name="verified" className="text-xl text-primary" />
                </div>
                <h3 className="mb-2 font-headline-md text-headline-md tracking-tight text-on-surface">
                  Trusted Provenance
                </h3>
                <p className="max-w-md text-body-md text-on-surface-variant">
                  Cryptographic anchoring ensures that claims of origin cannot be tampered with —
                  on-chain integrity for every batch log event, lab result and custody transfer.
                </p>
              </div>
              <div className="pointer-events-none absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 opacity-5">
                <Icon name="fingerprint" className="text-[200px]" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="about" className="mx-auto mt-16 flex w-full max-w-[1200px] flex-col items-start justify-between border-t border-black/5 px-[24px] py-[64px] md:flex-row md:px-[64px]">
        <div className="mb-6 flex flex-col gap-2 md:mb-0">
          <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
            HiveTrace
          </span>
          <p className="max-w-xs text-metadata-sm text-secondary">
            © {new Date().getFullYear()} HiveTrace India. Enterprise-grade traceability for the
            world&apos;s finest honey.
          </p>
        </div>
        <nav className="flex flex-col gap-4 opacity-80 transition-opacity hover:opacity-100 md:flex-row md:gap-8">
          {["Privacy Policy", "Terms of Service", "Supply Chain Transparency", "Contact"].map((l) => (
            <a
              key={l}
              href="#"
              className="text-metadata-sm text-secondary transition-colors hover:text-primary"
            >
              {l}
            </a>
          ))}
        </nav>
      </footer>

      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}