/**
 * Compact VND for display (e.g. 2.5M VND, 120K VND, 1.2B VND).
 * Standard formatter for all VND amounts — use everywhere to avoid inflated numbers.
 */
export function formatVnd(amount: number | null | undefined, empty = "—"): string {
  if (amount == null || !Number.isFinite(amount)) return empty;
  const s = formatVndCompact(amount);
  return s ? `${s} VND` : empty;
}

/**
 * Compact VND value only (no " VND" suffix) — e.g. 2.5M, 120K, 1.2B.
 */
export function formatVndCompact(amount: number): string {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return `${trimCompact(v)}B`;
  }
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${trimCompact(v)}M`;
  }
  if (n >= 10_000) {
    const v = n / 1_000;
    return `${trimCompact(v)}K`;
  }
  return n.toLocaleString("vi-VN");
}

/** For chart axes (value only, no VND suffix). */
export function formatVndAxis(value: number): string {
  const n = Math.abs(value);
  if (n >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(Math.round(value));
}

function trimCompact(v: number): string {
  if (v >= 100) return String(Math.round(v));
  if (v >= 10) return String(Math.round(v * 10) / 10).replace(/\.0$/, "");
  const s = (Math.round(v * 100) / 100).toString();
  return s.replace(/\.?0+$/, "") || "0";
}
