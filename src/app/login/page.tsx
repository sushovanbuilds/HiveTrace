"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { HexOrbit } from "@/components/hex-orbit";
import { DEMO_EMAIL_TO_ROLE, ROLE_HOME } from "@/lib/demo/config";
import { loginDemoUser, setActiveDemoRole } from "@/lib/demo/auth";

type Field = "email" | "password";

const DEMO_ACCOUNTS: Array<{
  email: string;
  node: string;
  role: string;
  icon: string;
}> = [
  { email: "ravi@greenvalley.in", node: "Beekeeper", role: "Farm & harvest", icon: "hive" },
  { email: "arjun@sahyadri.in", node: "Collector", role: "Collections & custody", icon: "inventory_2" },
  { email: "dr.anand@nbb.gov.in", node: "Quality Lab", role: "Lab uploads", icon: "science" },
  { email: "suresh@amrit.in", node: "Processor", role: "Processing & custody", icon: "factory" },
  { email: "meera@honeyline.in", node: "Distributor", role: "Dispatch & custody", icon: "local_shipping" },
  { email: "kavita@fssai.gov.in", node: "Investigator", role: "Risk & incidents", icon: "policy" },
  { email: "admin@hivetrace.gov.in", node: "Admin", role: "Full network", icon: "admin_panel_settings" },
];

/** Emails accepted by the demo layer (existing demo accounts only). */
const KNOWN_DEMO_EMAILS = new Set(DEMO_ACCOUNTS.map((a) => a.email));

export default function LoginPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    email: DEMO_ACCOUNTS[0].email,
    password: "hivetrace-demo",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (error) setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Demo mode: reject unknown emails up front with a single, non-enumerating
    // message. Known accounts fall through to the shared API login below.
    if (!KNOWN_DEMO_EMAILS.has(values.email.trim().toLowerCase())) {
      setError("Demo account not recognized.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Sign-in failed. Please check your details.");
        return;
      }
      // Restore the current demo orientation for this account (if it is one of
      // the four workspace accounts) so the shell's layout picks it up.
      const role = DEMO_EMAIL_TO_ROLE[values.email.trim().toLowerCase()];
      if (role) {
        loginDemoUser(values.email.trim().toLowerCase());
        setActiveDemoRole(role);
        router.push(ROLE_HOME[role]);
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh bg-background text-on-surface">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-surface-container-low p-[48px] lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <HexOrbit />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm">
            <Icon name="hive" fill className="text-[24px]" />
          </span>
          <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
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

          <h2 className="text-[32px] font-bold tracking-tight text-on-surface">Welcome back</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Sign in to the operations console to track batches, quality and risk across the
            network.
          </p>

          <div className="mt-6 rounded-xl border border-primary-container/40 bg-primary-container/10 p-4">
            <p className="mb-3 flex items-center gap-2 text-label-caps font-semibold uppercase tracking-widest text-on-primary-container">
              <Icon name="fingerprint" className="text-[18px]" />
              Node access — demo
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_ACCOUNTS.map((a) => {
                const selected = values.email === a.email;
                return (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => {
                      setValues((v) => ({ ...v, email: a.email, password: "hivetrace-demo" }));
                      setError(null);
                    }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                      selected
                        ? "bg-primary-container text-on-primary-container"
                        : "text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                        selected ? "bg-on-primary-container/10" : "bg-surface-container-low"
                      }`}
                    >
                      <Icon name={a.icon} className="text-[16px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-md font-semibold">{a.node}</span>
                      <span
                        className={`block truncate text-metadata-sm ${selected ? "text-on-primary-container/80" : "text-on-surface-variant/80"}`}
                      >
                        {a.role}
                      </span>
                    </span>
                    <span className="text-metadata-xs text-on-surface-variant/70">{a.email.split("@")[0]}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-metadata-sm text-on-surface-variant">
              One shared password: <span className="font-mono font-semibold text-on-surface">hivetrace-demo</span>
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Email
              </span>
              <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-container/40 transition-all">
                <Icon name="mail" className="text-on-surface-variant" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={values.email}
                  onChange={set("email")}
                  placeholder="you@fpo.in"
                  className="h-12 w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Password
              </span>
              <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-container/40 transition-all">
                <Icon name="lock" className="text-on-surface-variant" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={values.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  className="h-12 w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60"
                />
              </div>
            </label>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-body-md text-on-surface-variant">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  defaultChecked
                />
                Remember me
              </label>
              <a href="#" className="text-body-md font-medium text-primary hover:underline">
                Forgot password?
              </a>
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container" role="alert">
                <Icon name="error" className="text-[20px]" />
                {error}
              </div>
            ) : null}

            <Button type="submit" size="lg" disabled={loading} className="w-full" icon={loading ? undefined : "fingerprint"} iconRight={loading ? "sync" : "arrow_forward"}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-body-md text-on-surface-variant">
            New to the platform?{" "}
            <Link href="/verify" className="font-medium text-primary hover:underline">
              Start by verifying a batch
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}