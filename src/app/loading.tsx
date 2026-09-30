export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="flex flex-col items-center gap-4">
        {/* Simple spinning loader */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cream-deep border-t-honey-deep"></div>
        <p className="text-body-md text-bark-950 font-semibold animate-pulse">
          Loading HiveTrace...
        </p>
      </div>
    </div>
  );
}
