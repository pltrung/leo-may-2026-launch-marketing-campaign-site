/**
 * Time-of-day states for environmental background.
 * Morning 6:00–11:59; Sunset 17:00–19:59; Night 20:00–5:59.
 * Outside ranges default to morning.
 */
export type TimeState = "time-morning" | "time-sunset" | "time-night";

export function getTimeState(date: Date = new Date()): TimeState {
  const h = date.getHours();
  if (h >= 17 && h < 20) return "time-sunset";
  if (h >= 20 || h < 6) return "time-night";
  return "time-morning";
}

/** Next boundary (6, 12, 17, 20) in ms from now for scheduling updates */
export function getMsUntilNextBoundary(now: Date = new Date()): number {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const currentMs = (h * 3600 + m * 60 + s) * 1000;
  const boundaries = [6, 12, 17, 20].map((hour) => hour * 3600 * 1000);
  const dayMs = 24 * 3600 * 1000;
  let best = dayMs;
  for (const b of boundaries) {
    let delta = b - currentMs;
    if (delta <= 0) delta += dayMs;
    if (delta < best) best = delta;
  }
  return best;
}
