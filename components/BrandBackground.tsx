"use client";

import { motion } from "framer-motion";
import SafeImg, { isValidImgSrc } from "@/components/SafeImg";

const HOLDS_IMG_SRC = "/brand/holds.svg";

type CloudsEntranceStep = "background" | "holds" | "content";

/** Ease-in: slow start so holds feel like they stick one by one from top to bottom */
const HOLDS_REVEAL_EASE = [0.5, 0, 0.75, 0] as const;
const HOLDS_REVEAL_DURATION = 2.6;

/** Holds overlay only. Background comes from html/body (#0B0B0F). Pick-your-cloud uses hero-style starfield instead — no holds. */
export default function BrandBackground({
  cloudsView,
  cloudsEntranceStep,
}: {
  cloudsView?: boolean;
  cloudsEntranceStep?: CloudsEntranceStep;
}) {
  if (cloudsView) return null;

  const isCloudsEntrance = Boolean(cloudsView && cloudsEntranceStep);
  const holdsOpacity =
    !isCloudsEntrance ? 0.7 : cloudsEntranceStep === "background" ? 0 : 1;
  const holdsScale = !isCloudsEntrance ? 1 : cloudsEntranceStep === "background" ? 0.97 : 1;
  const clipRevealed =
    !isCloudsEntrance || cloudsEntranceStep === "holds" || cloudsEntranceStep === "content";

  return (
    <motion.div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none animate-holds-layer"
      aria-hidden
      initial={false}
      animate={{ opacity: holdsOpacity, scale: holdsScale }}
      transition={{
        duration: isCloudsEntrance && cloudsEntranceStep === "holds" ? 1 : 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ transformOrigin: "50% 50%" }}
    >
      {isValidImgSrc(HOLDS_IMG_SRC) ? (
        <motion.div
          className="absolute inset-0 w-full h-full"
          initial={false}
          animate={{
            clipPath: clipRevealed ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)",
          }}
          transition={{
            duration:
              isCloudsEntrance && cloudsEntranceStep === "holds"
                ? HOLDS_REVEAL_DURATION
                : 0.35,
            ease:
              isCloudsEntrance && cloudsEntranceStep === "holds"
                ? HOLDS_REVEAL_EASE
                : [0.16, 1, 0.3, 1],
          }}
        >
          <SafeImg
            src={HOLDS_IMG_SRC}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </motion.div>
      ) : null}
    </motion.div>
  );
}
