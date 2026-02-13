"use client";

import { motion } from "framer-motion";
import FogBackground from "@/components/FogBackground";

/**
 * Entrance: atmospheric fog only. 2s then parent switches to reveal.
 */
export default function StepIntro() {
  return (
    <motion.div
      key="intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ width: "100vw", height: "100vh", background: "#2a2e36" }}
    >
      <FogBackground variant="soft" />
    </motion.div>
  );
}
