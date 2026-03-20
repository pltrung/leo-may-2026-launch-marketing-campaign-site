"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getAttributionFromUrl,
  getStoredAttribution,
  setStoredAttribution,
  clearStoredAttribution,
  getOrCreateAnonymousId,
} from "@/lib/attributionCapture";

/**
 * Captures UTM params from URL on landing, stores in localStorage.
 * When user is authenticated, persists attribution to backend and clears storage.
 */
export default function AttributionCapture() {
  const { session, accessToken } = useAuth();
  const persistedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const search = window.location.search;
    const pathname = window.location.pathname;
    const attribution = getAttributionFromUrl(search, pathname);
    if (attribution) setStoredAttribution(attribution);
  }, []);

  useEffect(() => {
    if (!session?.access_token || !accessToken || persistedRef.current) return;
    const stored = getStoredAttribution();
    if (!stored) return;

    let cancelled = false;
    fetch("/api/marketing/track-attribution", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        utm_source: stored.utm_source,
        utm_medium: stored.utm_medium,
        utm_campaign: stored.utm_campaign,
        utm_content: stored.utm_content,
        utm_term: stored.utm_term,
        fbclid: stored.fbclid,
        gclid: stored.gclid,
        ttclid: stored.ttclid,
        landing_path: stored.landing_path,
        landing_url: stored.landing_url,
        anonymous_id: getOrCreateAnonymousId(),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.stored) {
          persistedRef.current = true;
          clearStoredAttribution();
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, accessToken]);

  return null;
}
