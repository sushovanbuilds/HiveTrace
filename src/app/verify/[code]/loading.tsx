/**
 * Loading skeleton for /verify/[code]. Shown during navigation while the
 * certificate is being assembled server-side — never a blocking blank screen.
 */
function Bar({ className }: { className: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-[#2a1e05]/8 ${className}`} />;
}

export default function VerifyCertificateLoading() {
  return (
    <div className="min-h-dvh bg-[#faf6ec] font-sans" aria-busy="true" aria-label="Loading verification certificate">
      <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-4">
        <Bar className="h-11 w-11 !rounded-full" />
        <Bar className="h-4 w-28" />
        <span className="w-11" aria-hidden />
      </nav>
      <main className="mx-auto w-full max-w-2xl px-5 pb-16">
        <div className="flex flex-col items-center pt-4 text-center">
          <div aria-hidden className="h-20 w-20 animate-pulse rounded-full bg-[#2a1e05]/8" />
          <Bar className="mt-5 h-4 w-40" />
          <Bar className="mt-3 h-9 w-64" />
          <Bar className="mt-4 h-4 w-80 max-w-full" />
        </div>
        <div className="mt-8 rounded-3xl border border-[#2a1e05]/10 bg-[#fffdf7] p-6 sm:p-8">
          <Bar className="h-4 w-32" />
          <div className="mt-4 space-y-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-[#2a1e05]/10 py-3 last:border-0">
                <Bar className="h-3.5 w-24" />
                <Bar className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 rounded-3xl border border-[#2a1e05]/10 bg-[#fffdf7] p-6 sm:p-8">
          <Bar className="h-4 w-28" />
          <div className="mt-6 space-y-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div aria-hidden className="h-9 w-9 animate-pulse rounded-full bg-[#2a1e05]/8" />
                <div className="flex-1">
                  <Bar className="h-4 w-32" />
                  <Bar className="mt-2 h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">Loading verification certificate…</span>
      </main>
    </div>
  );
}
