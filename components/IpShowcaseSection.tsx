"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface IpShowcaseSectionProps {
  pose: "front" | "back";
}

const IMAGE_MAP: Record<string, string> = {
  front: "/brand/ip-climbing-on-hold.svg",
  back: "/brand/ip-on-cloud.svg",
};

export default function IpShowcaseSection({ pose }: IpShowcaseSectionProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.2, once: false });

  if (errored) return null;

  const imgSrc = IMAGE_MAP[pose];

  return (
    <section
      ref={ref}
      className="relative min-h-[70vh] flex items-center justify-center overflow-hidden py-12"
    >
      <motion.div
        className="flex items-center justify-center w-[70%] max-w-[400px] aspect-square pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isInView && loaded ? 1 : 0,
          transition: { duration: 0.6 },
        }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-contain animate-ip-bounce"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      </motion.div>
    </section>
  );
}
