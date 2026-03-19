"use client";

import React, { useEffect, useState } from "react";
import { getMessages } from "@/lib/messages";
import { useLocale } from "@/components/LocaleProvider";
import { HERO_BG } from "@/lib/heroConstants";
import CorporateGroupModal from "@/components/gym/CorporateGroupModal";

export default function GymFooter() {
  const locale = useLocale();
  const m = getMessages(locale).gym.footer;
  const vi = locale === "vi";
  const [links, setLinks] = useState<{ google_business_url: string | null; google_maps_url: string | null; zalo_oa_url: string | null } | null>(null);
  const [corpOpen, setCorpOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gym/public-settings")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d)
          setLinks({
            google_business_url: d.google_business_url ?? null,
            google_maps_url: d.google_maps_url ?? null,
            zalo_oa_url: d.zalo_oa_url ?? null,
          });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer
      className="relative pt-24 pb-12 md:pt-20 md:pb-12 px-4 md:px-8 text-center text-white/70"
      style={{
        background: HERO_BG,
        fontFamily: "MiSans-Regular, sans-serif",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
      }}
      role="contentinfo"
    >
      <p className="text-sm tracking-wide">{m.location}</p>
      {(links?.google_maps_url || links?.google_business_url || links?.zalo_oa_url) && (
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
          {links.google_maps_url && (
            <a href={links.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">
              Google Maps
            </a>
          )}
          {links.google_business_url && (
            <a href={links.google_business_url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">
              {vi ? "Google Business" : "Google Business"}
            </a>
          )}
          {links.zalo_oa_url && (
            <a href={links.zalo_oa_url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">
              Zalo
            </a>
          )}
        </div>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setCorpOpen(true)}
          className="text-sm text-white/85 underline decoration-white/30 hover:decoration-white/60"
        >
          {vi ? "Doanh nghiệp / nhóm" : "Corporate / group passes"}
        </button>
      </div>
      <p className="mt-2 text-xs text-white/50 tracking-wide">{m.copyright}</p>
      <CorporateGroupModal open={corpOpen} onClose={() => setCorpOpen(false)} />
    </footer>
  );
}
