"use client";

/**
 * Next.js global-error.tsx: catches errors in the root layout.
 * Must define its own <html> and <body> — replaces the entire root layout on error.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Leo Mây | Error</title>
      </head>
      <body className="min-h-screen antialiased" style={{ background: "#0B0B0F", color: "#e5e5e5" }}>
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="space-y-3">
            <h1 className="text-xl font-semibold">Leo Mây</h1>
            <p className="text-sm opacity-80">Something went wrong. Please refresh the page.</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 rounded-full border border-white/40 text-white/90 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
