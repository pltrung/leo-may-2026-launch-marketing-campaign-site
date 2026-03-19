import { formatVnd } from "@/lib/formatVndCompact";

/** VND for analytics cards — compact M/B/K format (consistent with rest of admin). */
export function fmtVnd(n: number | null | undefined, empty = "—"): string {
  return formatVnd(n, empty);
}

export function fmtInt(n: number | null | undefined, empty = "—"): string {
  if (n == null || !Number.isFinite(n)) return empty;
  return String(Math.round(n));
}

/** Clamp 0–100 for display; returns null if denominator 0 */
export function pctRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.min(100, Math.max(0, (numerator / denominator) * 100));
}

export function formatPctRatio(numerator: number, denominator: number, digits = 1): { pct: string; sub: string } {
  const p = pctRatio(numerator, denominator);
  if (p == null) return { pct: "—", sub: `0 / 0` };
  return {
    pct: `${p.toFixed(digits)}%`,
    sub: `${numerator} / ${denominator}`,
  };
}
