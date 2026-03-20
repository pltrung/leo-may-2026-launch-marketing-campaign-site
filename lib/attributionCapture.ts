/**
 * Client-side attribution capture: parse UTMs from URL, store in localStorage,
 * and provide helpers for persisting to the backend when user is identified.
 */

const STORAGE_KEY = "leo_first_touch_attribution";
const COOKIE_NAME = "leo_attribution";

export interface AttributionParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  landing_path?: string;
  landing_url?: string;
  first_touch_at?: string;
}

/** Parse attribution params from URL search string. */
export function getAttributionFromUrl(search: string, pathname: string): AttributionParams | null {
  const params = new URLSearchParams(search);
  const utm_source = params.get("utm_source")?.trim() || undefined;
  const utm_medium = params.get("utm_medium")?.trim() || undefined;
  const utm_campaign = params.get("utm_campaign")?.trim() || undefined;
  const utm_content = params.get("utm_content")?.trim() || undefined;
  const utm_term = params.get("utm_term")?.trim() || undefined;
  const fbclid = params.get("fbclid")?.trim() || undefined;
  const gclid = params.get("gclid")?.trim() || undefined;
  const ttclid = params.get("ttclid")?.trim() || undefined;

  const hasAny = utm_source || utm_medium || utm_campaign || fbclid || gclid || ttclid;
  if (!hasAny) return null;

  return {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid,
    gclid,
    ttclid,
    landing_path: pathname || "/",
    landing_url: typeof window !== "undefined" ? window.location.href : undefined,
    first_touch_at: new Date().toISOString(),
  };
}

/** Get stored attribution from localStorage (first touch, do not overwrite). */
export function getStoredAttribution(): AttributionParams | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttributionParams;
    return parsed && (parsed.utm_source || parsed.utm_campaign || parsed.fbclid || parsed.gclid) ? parsed : null;
  } catch {
    return null;
  }
}

/** Store attribution. Keeps earliest first_touch_at (first-touch rule). */
export function setStoredAttribution(attribution: AttributionParams): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredAttribution();
    const existingAt = existing?.first_touch_at ? new Date(existing.first_touch_at).getTime() : Infinity;
    const newAt = attribution.first_touch_at ? new Date(attribution.first_touch_at).getTime() : Date.now();
    const toStore = existing && existingAt <= newAt ? existing : { ...attribution, first_touch_at: attribution.first_touch_at || new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // ignore
  }
}

export function clearStoredAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Generate a short-lived anonymous ID for unattributed session tracking. */
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  const key = "leo_anon_id";
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}
