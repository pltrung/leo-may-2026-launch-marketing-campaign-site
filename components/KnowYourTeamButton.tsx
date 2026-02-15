"use client";

import { useState } from "react";
import KnowYourTeamModal from "./KnowYourTeamModal";

interface KnowYourTeamButtonProps {
  /** Hide on countdown page */
  show?: boolean;
  /** Called when user finds their team — triggers Sky transition then redirect to countdown */
  onFoundTeam?: () => void;
}

export default function KnowYourTeamButton({ show = true, onFoundTeam }: KnowYourTeamButtonProps) {
  const [open, setOpen] = useState(false);

  if (!show) return null;

  const handleFoundTeam = () => {
    setOpen(false);
    onFoundTeam?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="know-cloud-btn fixed top-6 right-6 md:top-8 md:right-10 z-[60] px-4 py-2 rounded-full border border-white/60 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/80 transition-colors"
        aria-label="Know your cloud?"
      >
        Know your cloud?
      </button>
      {open && (
        <KnowYourTeamModal onClose={() => setOpen(false)} onFoundTeam={onFoundTeam ? handleFoundTeam : undefined} />
      )}
    </>
  );
}
