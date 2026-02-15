"use client";

import { motion } from "framer-motion";

export default function CloudWithEyesSection() {
  return (
    <section className="hero-section hero-cloud-section relative min-h-[60vh] flex flex-col items-center justify-center py-12 overflow-hidden pt-[120px] md:pt-24">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/cloud-singing.svg"
        className="hero-ip-cloud-singing"
        alt="Singing Cloud"
      />
      <motion.h2
        className="hero-text font-headline text-xl sm:text-2xl md:text-3xl text-white tracking-headline text-center max-w-lg mx-auto px-4"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
      >
        Every cloud moves <span className="emphasis">DIFFERENTLY</span>.
        <br />
        So should <span className="emphasis">YOU</span>.
      </motion.h2>
    </section>
  );
}
