"use client";

import { motion } from "framer-motion";

const HOLDS_IMG_SRC = "/brand/holds.svg";

type CloudsEntranceStep = "background" | "holds" | "content";

/** Holds overlay only. Background comes from html/body (#0B0B0F). On clouds view, opacity follows entrance sequence. */
export default function BrandBackground({
  cloudsView,
  cloudsEntranceStep,
}: {
  cloudsView?: boolean;
  cloudsEntranceStep?: CloudsEntranceStep;
}) {
  const isCloudsEntrance = Boolean(cloudsView && cloudsEntranceStep);
  const holdsOpacity =
    !isCloudsEntrance ? 0.7 : cloudsEntranceStep === "background" ? 0 : 1;

  return (
    <motion.div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none animate-holds-layer"
      aria-hidden
      initial={false}
      animate={{ opacity: holdsOpacity }}
      transition={{
        duration: isCloudsEntrance && cloudsEntranceStep === "holds" ? 1 : 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {HOLDS_IMG_SRC ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HOLDS_IMG_SRC}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </>
      ) : null}
    </motion.div>
  );
}
