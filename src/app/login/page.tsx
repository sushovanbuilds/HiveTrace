import Link from "next/link";
import { Icon } from "@/components/icons";
import { HexOrbit } from "@/components/hex-orbit";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh bg-background text-on-surface">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-surface-container-low p-[48px] lg:flex">
        {/* Ambient honeycomb, bled into the top-right corner and dissolved
            toward the page so it never sits behind the headline block. */}
        <div className="orb-fade pointer-events-none absolute -right-16 -top-12 h-[440px] w-[440px]">
          <HexOrbit />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm">
            <Icon name="hive" fill className="text-[24px]" />
          </span>
          <span className="text-headline-md font-bold tracking-tight text-primary">
            HiveTrace
          </span>
        </div>
        <div className="relative z-10 max-w-sm">
          <p className="text-metadata-sm uppercase tracking-[0.08em] text-on-surface-variant">
            Honey, cryptographically proven
          </p>
          <h1 className="mt-3 text-[40px] font-bold leading-[1.1] tracking-tight text-on-surface">
            Every jar carries its <span className="text-primary">evidence trail</span>.
          </h1>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-white/60 p-4 backdrop-blur-sm">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-container/60 text-tertiary">
              <Icon name="verified" fill className="text-[20px]" />
            </span>
            <div>
              <p className="text-body-md font-semibold text-on-surface">Batch #HC-2026-00124</p>
              <p className="text-metadata-sm text-on-surface-variant">
                Verified origin · Purulia, West Bengal
              </p>
            </div>
          </div>
        </div>
        <p className="relative z-10 text-metadata-sm text-on-surface-variant">
          © {new Date().getFullYear()} HiveTrace India · Governed supply-chain integrity
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm">
              <Icon name="hive" fill className="text-[24px]" />
            </span>
            <span className="text-body-lg font-bold tracking-tight text-primary">HiveTrace</span>
          </div>

          <LoginForm
            title="Welcome back"
            description="Sign in to the operations console to track batches, quality and risk across the network."
          />

          <p className="mt-8 text-center text-body-md text-on-surface-variant">
            New to HiveTrace?{" "}
            <Link href="/scan" className="py-2 font-medium text-primary hover:underline">
              Start by verifying a batch
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
