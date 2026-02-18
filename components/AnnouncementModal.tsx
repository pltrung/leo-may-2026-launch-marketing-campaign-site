"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { SOCIAL_LINKS } from "@/lib/announcementConfig";

/** Fallback when no accent provided (match PowerYourCloudModal / EvolutionCeremonyModal). */
const FALLBACK_ACCENT = "#C9A227";
const BORDER_LIGHT = "rgba(0,0,0,0.08)";
const TEXT_PRIMARY = "#1E2A38";
const TEXT_SECONDARY = "#555";

interface AnnouncementModalProps {
  locale: Locale;
  onClose: () => void;
  /** Optional cloud accent; when provided, modal uses it for border/shadow/primary CTA. */
  accent?: string;
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export default function AnnouncementModal({ locale, onClose, accent }: AnnouncementModalProps) {
  const messages = getMessages(locale);
  const t = messages.countdown.announcementPopup;
  const modalAccent = accent && accent !== "#ffffff" && accent !== "#fff" ? accent : FALLBACK_ACCENT;

  const handlePrimary = () => {
    onClose();
    if (typeof window !== "undefined") window.open(SOCIAL_LINKS.instagram, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-modal
        role="dialog"
        aria-labelledby="announcement-headline"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
        <motion.div
          className="relative w-full max-w-[min(92vw,400px)] rounded-2xl shadow-2xl border overflow-hidden"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            color: TEXT_PRIMARY,
            boxShadow: `0 0 40px ${modalAccent}25, 0 24px 48px rgba(0,0,0,0.12)`,
            borderColor: `${modalAccent}50`,
          }}
        >
          <div className="relative px-6 py-6 flex flex-col items-center text-center">
            <h2
              id="announcement-headline"
              className="font-subheadline text-xl sm:text-2xl font-bold leading-tight"
              style={{ color: TEXT_PRIMARY }}
            >
              {t.headline}
            </h2>
            <p className="font-caption text-sm mt-2" style={{ color: TEXT_SECONDARY }}>
              {t.subtitle}
            </p>
            <p className="font-caption text-sm mt-3 whitespace-pre-line text-left w-full" style={{ color: TEXT_PRIMARY }}>
              {t.body}
            </p>

            <style>{`.announcement-modal-social:hover { border-color: ${modalAccent}80 !important; box-shadow: 0 0 20px ${modalAccent}35 !important; }`}</style>
            <div className="mt-5 flex items-center justify-center gap-4">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="announcement-modal-social flex items-center justify-center w-12 h-12 rounded-full border transition-colors hover:opacity-90"
                style={{ borderColor: BORDER_LIGHT, color: TEXT_PRIMARY, boxShadow: `0 0 0 1px ${BORDER_LIGHT}` }}
                aria-label="Instagram"
              >
                <IconInstagram className="w-6 h-6" />
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="announcement-modal-social flex items-center justify-center w-12 h-12 rounded-full border transition-colors hover:opacity-90"
                style={{ borderColor: BORDER_LIGHT, color: TEXT_PRIMARY, boxShadow: `0 0 0 1px ${BORDER_LIGHT}` }}
                aria-label="Facebook"
              >
                <IconFacebook className="w-6 h-6" />
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="announcement-modal-social flex items-center justify-center w-12 h-12 rounded-full border transition-colors hover:opacity-90"
                style={{ borderColor: BORDER_LIGHT, color: TEXT_PRIMARY, boxShadow: `0 0 0 1px ${BORDER_LIGHT}` }}
                aria-label="TikTok"
              >
                <IconTikTok className="w-6 h-6" />
              </a>
            </div>

            <div className="mt-6 w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePrimary}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-transform hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: modalAccent, color: "#1E2A38" }}
              >
                {t.followTheClimb}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl font-medium text-sm border transition-colors hover:bg-black/5"
                style={{ borderColor: BORDER_LIGHT, color: TEXT_PRIMARY }}
              >
                {t.maybeLater}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
