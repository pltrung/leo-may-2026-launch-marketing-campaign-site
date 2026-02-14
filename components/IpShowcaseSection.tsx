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
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden py-12 pt-[120px] md:pt-24">
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
    </section>
  );
}
