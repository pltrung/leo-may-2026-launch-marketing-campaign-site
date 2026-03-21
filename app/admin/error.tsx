"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.error("[AdminError] Route error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-slate-50">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Analytics temporarily unavailable</h2>
        <p className="text-sm text-slate-600 mb-4">
          The admin dashboard encountered an error. Please try again or contact support if the issue persists.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
            }}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
