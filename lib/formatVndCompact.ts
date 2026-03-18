/**
 * Compact VND for banners (e.g. 2.5M VND, 120K VND, 1.2B VND).
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

function trimCompact(v: number): string {
  if (v >= 100) return String(Math.round(v));
  if (v >= 10) return String(Math.round(v * 10) / 10).replace(/\.0$/, "");
  const s = (Math.round(v * 100) / 100).toString();
  return s.replace(/\.?0+$/, "") || "0";
}
