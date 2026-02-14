"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface IpShowcaseSectionProps {
  pose: "front" | "back";
}

const IMAGE_MAP: Record<string, string> = {
  front: "/brand/ip-climbing-on-hold.svg",
  back: "/brand/ip-on-cloud.svg",
};

export default function IpShowcaseSection({ pose }: IpShowcaseSectionProps) {
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  const imgSrc = IMAGE_MAP[pose];

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden py-12 pt-[120px] md:pt-24">
      <motion.div
        className="flex items-center justify-center w-[70%] max-w-[400px] aspect-square pointer-events-none"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.1, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-contain animate-ip-bounce"
          loading="eager"
          fetchPriority="high"
          onError={() => setErrored(true)}
        />
      </motion.div>
      {pose === "front" && (
        <motion.p
          className="font-medium text-center text-white/90 text-lg sm:text-xl md:text-2xl mt-6 md:mt-8 max-w-md mx-auto px-4 leading-relaxed"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        >
          A place where movement feels like breath.
        </motion.p>
      )}
    </section>
  );
}
