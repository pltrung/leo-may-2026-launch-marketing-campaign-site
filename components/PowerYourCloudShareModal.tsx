"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CloudPersonality } from "@/lib/cloudData";
import CloudIconByType from "@/components/CloudIcons";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { generateSharePoster, type PosterPreset } from "@/lib/generateSharePoster";

interface PowerYourCloudShareModalProps {
  locale: Locale;
  cloud: CloudPersonality;
  referralUrl: string;
  shareMessage: string;
  referralCount: number;
  onClose: () => void;
  onShareClick?: () => void;
}

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as [number, number, number, number];

function IconZalo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z" />
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

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconThreads({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.186 24h-.007c-3.381-.024-6.353-.93-8.648-2.648C1.25 19.676 0 16.656 0 13.28V12.5C0 5.597 5.349 0 12 0s12 5.597 12 12.5v.78c0 3.376-1.25 6.396-3.541 8.052-2.295 1.718-5.267 2.624-8.648 2.648h-.625zM12 1.5C6.201 1.5 1.5 6.424 1.5 12.5v.78c0 2.855 1.062 5.424 3.025 6.882 1.962 1.458 4.523 2.228 7.475 2.228h.625c2.952 0 5.513-.77 7.475-2.228 1.963-1.458 3.025-4.027 3.025-6.882v-.78C22.5 6.424 17.799 1.5 12 1.5zM6 7.5v6c0 3.314 2.686 6 6 6s6-2.686 6-6v-3c0-1.24-.805-2.317-2-2.691V10.5c0 2.485-2.015 4.5-4.5 4.5S9.5 12.985 9.5 10.5V7.5H6zm3 0v3c0 1.654 1.346 3 3 3s3-1.346 3-3V7.5h-6z" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function PowerYourCloudShareModal({
  locale,
  cloud,
  referralUrl,
  shareMessage,
  referralCount,
  onClose,
  onShareClick,
}: PowerYourCloudShareModalProps) {
  const messages = getMessages(locale);
  const t = messages.countdown.shareModal;
  const c = messages.countdown;
  const accent = cloud.accentHex;
  const cloudName = locale === "vi" ? cloud.name : cloud.nameEn;
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied" | "instagram">("idle");
  type ImageState = "idle" | "generating" | "preview";
  const [imageState, setImageState] = useState<ImageState>("idle");
  const [posterPreset, setPosterPreset] = useState<PosterPreset>("square");
  const [generatedImageDataURL, setGeneratedImageDataURL] = useState<string | null>(null);
  const [generatedImageBlob, setGeneratedImageBlob] = useState<Blob | null>(null);
  const [generatedPreset, setGeneratedPreset] = useState<PosterPreset | null>(null);
  const [previewImageFeedback, setPreviewImageFeedback] = useState<"idle" | "copied" | "instagram">("idle");

  const doCopy = useCallback(() => {
    navigator.clipboard?.writeText(shareMessage).then(() => {
      setCopyFeedback("copied");
      setTimeout(() => setCopyFeedback("idle"), 2000);
    });
  }, [shareMessage]);

  const handleCopy = () => {
    doCopy();
  };

  const handleInstagram = () => {
    doCopy();
    setCopyFeedback("instagram");
    setTimeout(() => setCopyFeedback("idle"), 2500);
  };

  const encodedUrl = encodeURIComponent(referralUrl);
  const encodedMessage = encodeURIComponent(shareMessage);
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const threadsUrl = `https://www.threads.net/intent/post?text=${encodedMessage}`;
  const zaloUrl = `https://zalo.me/share?url=${encodedUrl}`;

  const copyLabel = copyFeedback === "copied" ? t.copied : copyFeedback === "instagram" ? t.copiedInstagram : (locale === "vi" ? "Sao chép" : "Copy");

  const generatePosterForPreset = useCallback(
    async (preset: PosterPreset) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setImageState("generating");
      const minDurationMs = 800;
      const start = Date.now();
      try {
        const blob = await generateSharePoster({
          preset,
          cloud,
          shareUrl: referralUrl,
          origin,
          locale,
        });
        const elapsed = Date.now() - start;
        const wait = Math.max(0, minDurationMs - elapsed);
        await new Promise((r) => setTimeout(r, wait));
        const dataURL = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        setGeneratedImageBlob(blob);
        setGeneratedImageDataURL(dataURL);
        setGeneratedPreset(preset);
        setPosterPreset(preset);
        setImageState("preview");
      } catch {
        setImageState("idle");
      }
    },
    [locale, cloud, referralUrl]
  );

  const handleShareAsImage = useCallback(() => {
    generatePosterForPreset(posterPreset);
  }, [posterPreset, generatePosterForPreset]);

  const handlePresetChange = useCallback(
    (preset: PosterPreset) => {
      if (preset === generatedPreset) return;
      setPosterPreset(preset);
      generatePosterForPreset(preset);
    },
    [generatedPreset, generatePosterForPreset]
  );

  const handlePreviewDownload = useCallback(() => {
    if (!generatedImageBlob) return;
    const url = URL.createObjectURL(generatedImageBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generatedPreset === "story" ? "leo-may-cloud-story.png" : "leo-may-cloud-identity.png";
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedImageBlob, generatedPreset]);

  const handlePreviewInstagram = useCallback(async () => {
    if (!generatedImageBlob) return;
    try {
      const file = new File([generatedImageBlob], "leo-may-cloud-identity.png", { type: "image/png" });
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": file })]);
      }
      setPreviewImageFeedback("instagram");
      setTimeout(() => setPreviewImageFeedback("idle"), 2500);
    } catch {
      setPreviewImageFeedback("instagram");
      setTimeout(() => setPreviewImageFeedback("idle"), 2500);
    }
  }, [generatedImageBlob]);

  const handlePreviewShare = useCallback(
    async (target: "facebook" | "threads" | "zalo") => {
      if (!generatedImageBlob) return;
      const file = new File([generatedImageBlob], "leo-may-cloud-identity.png", { type: "image/png" });
      if (typeof navigator !== "undefined" && navigator.share && (navigator.canShare?.({ files: [file] }) ?? true)) {
        try {
          await navigator.share({ files: [file], title: "Leo Mây" });
          return;
        } catch {
          // User cancelled or failed
        }
      }
      if (target === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`, "_blank");
      if (target === "threads") window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(shareMessage)}`, "_blank");
      if (target === "zalo") window.open(`https://zalo.me/share?url=${encodeURIComponent(referralUrl)}`, "_blank");
    },
    [generatedImageBlob, referralUrl, shareMessage]
  );

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE_PREMIUM }}
      role="dialog"
      aria-modal="true"
      aria-label={locale === "vi" ? "Chia sẻ mây của bạn" : "Share your cloud"}
    >
      <motion.div
        className="relative w-full max-w-[420px] rounded-[24px] p-6 flex flex-col gap-5 shadow-2xl border backdrop-blur-xl overflow-hidden"
        style={{
          backgroundColor: "rgba(255,255,255,0.98)",
          borderColor: `${accent}40`,
          boxShadow: `0 0 40px ${accent}30, 0 24px 48px rgba(0,0,0,0.15)`,
        }}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.35, ease: EASE_PREMIUM }}
        layout
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full text-[#666] hover:bg-black/10 transition-colors"
          aria-label={locale === "vi" ? "Đóng" : "Close"}
        >
          <IconClose className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {imageState === "idle" && (
            <motion.div
              key="idle"
              className="flex flex-col gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              layout
            >
              <motion.div
                className="flex justify-center"
                style={{ color: accent }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <CloudIconByType cloudId={cloud.id} className="w-16 h-16" />
              </motion.div>
              <h2 className="font-subheadline text-center text-lg text-[#1a1a1a]">
                {t.shareHeader}
              </h2>
              <p className="font-headline text-center text-xl sm:text-2xl" style={{ color: accent }}>
                {cloudName}
              </p>
              <div
                className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line border bg-black/[0.04] text-[#333] max-h-[140px] overflow-y-auto"
                style={{ borderColor: "rgba(0,0,0,0.08)" }}
              >
                {shareMessage}
              </div>
              <div
                className="rounded-[14px] border"
                style={{
                  background: "rgba(0,0,0,0.07)",
                  borderColor: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(8px)",
                  padding: "12px 14px",
                  marginTop: 12,
                }}
              >
                <p
                  className="text-[15px] font-semibold leading-snug"
                  style={{ color: "rgba(255,255,255,0.95)" }}
                >
                  {c.inviteBlock1}
                </p>
                <p
                  className="text-[13px] font-normal leading-snug mt-1"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {c.inviteBlock2}
                </p>
                <p
                  className="text-[13px] font-normal leading-snug mt-0.5"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {c.inviteBlock3}
                </p>
                <p className="text-[13px] font-normal leading-snug mt-2" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {c.youHaveAwakened}{" "}
                  <span style={{ color: accent, fontWeight: 600 }}>{referralCount}</span>
                  {" "}{referralCount === 1 ? c.climber : c.climbers}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onShareClick?.();
                  handleShareAsImage();
                }}
                className="w-full py-3.5 rounded-xl font-subheadline text-sm font-medium border-2 transition-all hover:opacity-90"
                style={{
                  borderColor: accent,
                  color: accent,
                  backgroundColor: `${accent}12`,
                }}
              >
                {t.shareAsImage}
              </button>
              <div className="flex items-center justify-center gap-4">
                <a
                  href={zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onShareClick?.()}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-[#0068FF] text-white hover:opacity-90 transition-opacity"
                  aria-label="Zalo"
                >
                  <IconZalo className="w-5 h-5" />
                </a>
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onShareClick?.()}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90 transition-opacity"
                  aria-label="Facebook"
                >
                  <IconFacebook className="w-5 h-5" />
                </a>
                <a
                  href={threadsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onShareClick?.()}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-[#000] text-white hover:opacity-90 transition-opacity"
                  aria-label="Threads"
                >
                  <IconThreads className="w-5 h-5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onShareClick?.();
                    handleInstagram();
                  }}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white hover:opacity-90 transition-opacity"
                  aria-label="Instagram"
                  title={t.copiedInstagram}
                >
                  <IconInstagram className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onShareClick?.();
                    handleCopy();
                  }}
                  className="w-11 h-11 flex items-center justify-center rounded-full border-2 text-[#444] hover:bg-black/5 transition-colors"
                  style={{ borderColor: accent }}
                  aria-label={locale === "vi" ? "Sao chép" : "Copy"}
                  title={copyLabel}
                >
                  <IconCopy className="w-5 h-5" />
                </button>
              </div>
              <AnimatePresence mode="wait">
                {(copyFeedback === "copied" || copyFeedback === "instagram") && (
                  <motion.p
                    className="text-center text-sm font-medium min-h-[1.25rem]"
                    style={{ color: accent }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {copyFeedback === "copied" ? t.copied : t.copiedInstagram}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {imageState === "generating" && (
            <motion.div
              key="generating"
              className="flex flex-col items-center justify-center gap-6 py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              layout
            >
              <div className="relative flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${accent}40 0%, transparent 70%)`,
                    width: 180,
                    height: 180,
                    left: "50%",
                    top: "50%",
                    marginLeft: -90,
                    marginTop: -90,
                  }}
                  animate={{ opacity: [0.15, 0.35, 0.15] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="relative flex items-center justify-center"
                  animate={{ scale: [0.92, 1.08, 1] }}
                  transition={{ duration: 1, ease: EASE_PREMIUM }}
                >
                  <img
                    src="/brand/ip-count-down.svg"
                    alt=""
                    className="w-32 h-28 object-contain object-center"
                  />
                </motion.div>
              </div>
              <p className="font-body text-center text-sm text-[#555]" style={{ maxWidth: 260 }}>
                {t.forming}
              </p>
            </motion.div>
          )}

          {imageState === "preview" && generatedImageDataURL && generatedPreset && (
            <motion.div
              key="preview"
              className="flex flex-col gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              layout
            >
              <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-black/5">
                <button
                  type="button"
                  onClick={() => handlePresetChange("story")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    generatedPreset === "story"
                      ? "bg-white text-[#1a1a1a] shadow-sm"
                      : "text-[#666] hover:bg-white/50"
                  }`}
                >
                  {t.story}
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange("square")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    generatedPreset === "square"
                      ? "bg-white text-[#1a1a1a] shadow-sm"
                      : "text-[#666] hover:bg-white/50"
                  }`}
                >
                  {t.square}
                </button>
              </div>
              <motion.div
                className="w-full overflow-hidden rounded-2xl relative"
                style={{
                  boxShadow: `0 0 24px ${accent}35, 0 8px 24px rgba(0,0,0,0.12)`,
                  border: `1px solid ${accent}30`,
                  aspectRatio: generatedPreset === "story" ? "9/16" : "1",
                }}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: EASE_PREMIUM }}
              >
                <img
                  src={generatedImageDataURL}
                  alt=""
                  className="w-full h-full object-contain block"
                />
                <div
                  className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
                  aria-hidden
                >
                  <div
                    className="absolute left-0 right-0 bottom-0 opacity-30"
                    style={{ height: "30%" }}
                  >
                    <div
                      className="absolute inset-0 w-[80%] max-w-[320px] left-1/2 -translate-x-1/2 rounded-2xl"
                      style={{
                        background:
                          "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 55%, transparent 100%)",
                        backgroundSize: "200% 100%",
                        animation: "qr-shimmer 3.5s ease-in-out infinite",
                        mixBlendMode: "soft-light",
                      }}
                    />
                  </div>
                </div>
              </motion.div>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handlePreviewInstagram}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white hover:opacity-90 transition-opacity"
                  aria-label="Instagram"
                  title={t.copiedInstagram}
                >
                  <IconInstagram className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePreviewShare("facebook")}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90 transition-opacity"
                  aria-label="Facebook"
                >
                  <IconFacebook className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePreviewShare("threads")}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-[#000] text-white hover:opacity-90 transition-opacity"
                  aria-label="Threads"
                >
                  <IconThreads className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePreviewShare("zalo")}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-[#0068FF] text-white hover:opacity-90 transition-opacity"
                  aria-label="Zalo"
                >
                  <IconZalo className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handlePreviewDownload}
                  className="w-11 h-11 flex items-center justify-center rounded-full border-2 text-[#444] hover:bg-black/5 transition-colors"
                  style={{ borderColor: accent }}
                  aria-label={locale === "vi" ? "Tải xuống" : "Download"}
                >
                  <IconDownload className="w-5 h-5" />
                </button>
              </div>
              <AnimatePresence mode="wait">
                {previewImageFeedback === "instagram" && (
                  <motion.p
                    className="text-center text-sm font-medium min-h-[1.25rem]"
                    style={{ color: accent }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {t.copiedInstagram}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/** Build Version B viral share message for Power Your Cloud. */
export function buildShareMessage(
  locale: Locale,
  cloud: CloudPersonality,
  referralUrl: string
): string {
  const cloudName = locale === "vi" ? cloud.name : cloud.nameEn;
  if (locale === "vi") {
    return `Tôi vừa tìm thấy mây của mình: ${cloudName} ☁️

Cùng đếm ngược tới ngày Leo Mây ra đời, Sài Gòn 2026.

Tìm mây của bạn:
${referralUrl}`;
  }
  return `I found my cloud: ${cloudName} ☁️

We're all gathering for the Leo Mây launch countdown in Saigon, 2026.

Find yours:
${referralUrl}`;
}
