"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

export default function CloudFooter() {
  const locale = useLocale();
  const { ethos, location, copyright } = getMessages(locale).footer;
  return (
    <footer className="cloud-footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-ethos">{ethos}</div>
        <div className="footer-location">{location}</div>
        <div className="footer-copyright-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/cloud-copyright.svg" alt="" aria-hidden />
        </div>
        <div className="footer-copyright-text">
          {copyright}
        </div>
      </div>
    </footer>
  );
}
