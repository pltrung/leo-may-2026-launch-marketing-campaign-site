"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VerificationModal from "./VerificationModal";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { saveUser } from "@/lib/userStorage";
import type { CloudType } from "@/lib/cloudData";

interface KnowYourTeamButtonProps {
  /** Hide on countdown page */
  show?: boolean;
  /** Called when user finds their team — triggers Sky transition then redirect to countdown */
  onFoundTeam?: () => void;
}

export default function KnowYourTeamButton({ show = true, onFoundTeam }: KnowYourTeamButtonProps) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const t = getMessages(locale).knowYourCloud;

  if (!show) return null;

  const handleSuccess = (payload: { mode: "countdown" } | { mode: "lookup"; hasWaitlist: boolean; user?: { name: string; email?: string; phone?: string; team: string; referralCode?: string } }) => {
    if (payload.mode !== "lookup") return;
    setOpen(false);
    if (payload.hasWaitlist && payload.user) {
      saveUser({
        name: payload.user.name,
        email: payload.user.email,
        phone: payload.user.phone,
        team: payload.user.team as CloudType,
        referralCode: payload.user.referralCode,
        timestamp: Date.now(),
      });
      if (onFoundTeam) onFoundTeam();
      else router.push(`/${locale}/countdown`);
    } else {
      router.push(`/${locale}`);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="know-cloud-btn inline-block px-4 py-2 rounded-full border border-white/60 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/80 transition-colors whitespace-nowrap"
        style={{ minWidth: "max-content" }}
        aria-label={t.button}
      >
        {t.button}
      </button>
      {open && (
        <VerificationModal
          locale={locale}
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
