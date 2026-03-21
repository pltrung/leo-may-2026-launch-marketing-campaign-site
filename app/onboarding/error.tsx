"use client";

import { useEffect } from "react";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.error("[OnboardingError] Route error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-slate-900">
      <div className="max-w-md w-full rounded-xl border border-slate-700 bg-slate-800 p-6 text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-300 mb-4">
          The onboarding flow encountered an error. Please try again or continue from where you left off.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-medium hover:bg-slate-100"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/admin";
            }}
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700"
          >
            Back to Admin
          </button>
        </div>
      </div>
    </div>
  );
}
