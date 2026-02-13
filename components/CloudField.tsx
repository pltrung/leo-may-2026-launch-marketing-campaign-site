"use client";

import { useState } from "react";
import { cloudPersonalities, CloudPersonality } from "@/lib/cloudData";
import CloudShape from "./CloudShape";
import CloudReveal from "./CloudReveal";
import SignupModal from "./SignupModal";

export default function CloudField() {
  const [selected, setSelected] = useState<CloudPersonality | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [signupCloudType, setSignupCloudType] = useState<string | null>(null);

  const handleCloudClick = (p: CloudPersonality) => setSelected(p);
  const handleCloseReveal = () => setSelected(null);
  const handleJoinWaitlist = () => {
    setSignupCloudType(selected?.id ?? null);
    setSelected(null);
    setShowSignup(true);
  };

  return (
    <>
      <section className="relative min-h-[70vh] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-12 text-center text-sm font-light tracking-widest text-[#6b7280]">
            Which cloud are you?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {cloudPersonalities.map((p) => (
              <CloudShape
                key={p.id}
                personality={p}
                isSelected={selected?.id === p.id}
                onClick={() => handleCloudClick(p)}
              />
            ))}
          </div>
        </div>
      </section>

      {selected && (
        <CloudReveal
          personality={selected}
          onClose={handleCloseReveal}
          onJoinWaitlist={handleJoinWaitlist}
        />
      )}

      {showSignup && (
        <SignupModal
          defaultCloudType={signupCloudType}
          onClose={() => {
            setShowSignup(false);
            setSignupCloudType(null);
          }}
        />
      )}
    </>
  );
}
