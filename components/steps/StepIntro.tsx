"use client";

import { motion } from "framer-motion";

/**
 * Entrance: dense fog at bottom rising into soft mist (reference images).
 * No UI — pure atmosphere. Flow: 2s then parent switches to reveal.
 */
export default function StepIntro() {
  return (
    <motion.div
      key="intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-[#e4e9f2] via-[#eef1f7] to-[#f2f5fa]"
      style={{ top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh" }}
    >
      {/* Layer 1: Dense ground fog — white/gray at bottom, dissipating up */}
      <div className="fog-layer fog-dense" />
      {/* Layer 2: Billows — overlapping soft shapes */}
      <div className="fog-layer fog-billows" />
      {/* Layer 3: Wisps + subtle brand tint */}
      <div className="fog-layer fog-wisps" />
      <div className="grain-overlay" />
    </motion.div>
  );
}
