"use client";

/**
 * Layer 2: Contrast overlay so white logo and UI stay readable on all sky types.
 * Morning: dark gradient top 20–30%. Sunset: cool neutralizing. Night: minimal.
 */
export default function ContrastOverlay() {
  return <div className="global-contrast-overlay" aria-hidden />;
}
