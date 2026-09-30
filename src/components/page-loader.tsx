"use client";

import { useEffect, useState } from "react";

export function ClientPageLoader({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for document fonts to load to prevent FOUC (Material Symbols text showing before icon)
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setLoading(false);
      });
    } else {
      // Fallback if fonts API is not supported
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cream-deep border-t-honey-deep"></div>
          <p className="text-body-md font-semibold text-bark-950 animate-pulse">
            Loading HiveTrace...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
