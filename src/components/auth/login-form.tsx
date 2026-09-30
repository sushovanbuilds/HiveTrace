"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { DEMO_EMAIL_TO_ROLE, ROLE_HOME } from "@/lib/demo/config";
import { loginDemoUser, setActiveDemoRole } from "@/lib/demo/auth";

type Field = "email" | "password";

export const DEMO_ACCOUNTS: Array<{
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

/**
 * Shared sign-in form used by both the generic login page and the HIVEOS
 * login route. The auth flow is identical — only the surrounding branding
 * differs. `initialEmail` pre-selects a demo account (e.g. from a role card
 * on the HIVEOS entry page); unknown values are ignored.
 */
export function LoginForm({
  title,
  description,
  initialEmail,
}: {
  title: string;
  description: string;
  initialEmail?: string;
}) {
  const router = useRouter();
  const normalized =
    initialEmail?.trim().toLowerCase() && KNOWN_DEMO_EMAILS.has(initialEmail.trim().toLowerCase())
      ? initialEmail.trim().toLowerCase()
      : DEMO_ACCOUNTS[0].email;
  const [values, setValues] = useState<Record<Field, string>>({
    email: normalized,
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
    <>
      <h2 className="text-[32px] font-bold tracking-tight text-on-surface">{title}</h2>
      <p className="mt-2 text-body-md text-on-surface-variant">{description}</p>

      <div id="demo-access" className="mt-6 scroll-mt-6 rounded-xl border border-primary-container/40 bg-primary-container/10 p-4">
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
                    className={`block truncate text-metadata-sm ${selected ? "text-on-primary-container" : "text-on-surface-variant"}`}
                  >
                    {a.role}
                  </span>
                </span>
                {/* Small print still has to clear AA — the old 70%/80% ink
                    tints measured 2.8–4.4:1 on the honey pill. */}
                <span
                  className={`text-metadata-xs ${selected ? "text-on-primary-container" : "text-on-surface-variant/85"}`}
                >
                  {a.email.split("@")[0]}
                </span>
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
          {/* Points at the shared demo credentials above — a `#` would just
              jump the page to the top and do nothing. */}
          <a href="#demo-access" className="py-1.5 text-body-md font-medium text-primary hover:underline">
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
    </>
  );
}
