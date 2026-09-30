import { redirect } from "next/navigation";

/**
 * The scanner now lives at /scan. This route is kept as a redirect so older
 * entry points (including /verify?batch=…) keep working: QR labels themselves
 * encode /verify/:code, which is untouched by this redirect.
 */
export default async function VerifyRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string | string[] }>;
}) {
  const { batch } = await searchParams;
  const value = Array.isArray(batch) ? batch[0] : batch;
  redirect(value?.trim() ? `/scan?batch=${encodeURIComponent(value.trim())}` : "/scan");
}
