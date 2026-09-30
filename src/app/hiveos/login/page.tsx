import Link from "next/link";
import { Icon } from "@/components/icons";
import { LoginForm } from "@/components/auth/login-form";

/**
 * HIVEOS sign-in. The authentication flow is identical to the generic login —
 * only the branding differs. `?as=<demo email>` pre-selects an account (used
 * by the role cards on /hiveos); unknown values are ignored by the form.
 */
export default async function HiveOSLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>;
}) {
  const { as } = await searchParams;
  const initialEmail = Array.isArray(as) ? as[0] : as;

  return (
    <div className="flex min-h-dvh bg-[#faf6ec] text-[#2a1e05]">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-[#1b1005] p-[48px] text-[#faf6ec] lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,#3a2410_0%,#1b1005_55%,#0d0702_100%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffb800] text-[#2a1e05] shadow-sm">
            <Icon name="hive" fill className="text-[24px]" />
          </span>
          <span className="text-headline-md font-bold tracking-[0.18em] text-white">HIVEOS</span>
        </div>
        <div className="relative z-10 max-w-sm">
          <p className="text-eyebrow tracking-[0.22em] text-[#ffb800]">Apiary intelligence</p>
          <h1 className="mt-3 text-[34px] font-bold leading-[1.12] tracking-tight text-white">
            Intelligence before harvest.
          </h1>
          <p className="mt-4 text-body-md leading-relaxed text-white/70">
            Sense the hive, understand its state, and act with the reasons in
            front of you — the beekeeper always makes the final call.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3b6934]/25 text-[#9dc08b]">
              <Icon name="psychology" className="text-[20px]" />
            </span>
            <p className="text-body-sm leading-relaxed text-white/75">
              Recommendations are advisory. HIVEOS shows its working — you decide.
            </p>
          </div>
        </div>
        <p className="relative z-10 text-metadata-sm text-white/50">
          HIVEOS · the operator console for HiveTrace
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-[#faf6ec] px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffb800] text-[#2a1e05] shadow-sm">
              <Icon name="hive" fill className="text-[24px]" />
            </span>
            <span className="text-body-lg font-bold tracking-[0.18em] text-[#2a1e05]">HIVEOS</span>
          </div>

          <LoginForm
            title="Open HIVEOS"
            description="Sign in to the apiary intelligence console — hives, batches, laboratory evidence and risk, in one place."
            initialEmail={initialEmail}
          />

          <p className="mt-8 text-center text-body-md text-[#5c4a2a]">
            Bought a jar instead?{" "}
            <Link href="/scan" className="py-2 font-medium text-[#8a5b00] hover:underline">
              Verify it here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
