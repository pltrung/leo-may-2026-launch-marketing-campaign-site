"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  show: boolean;
}

export default function Toast({ show }: ToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl bg-storm text-cloud shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
        >
          <p className="font-subheadline text-lg">You&apos;re in the Founding Circle.</p>
          <p className="font-caption text-cloud/80 text-sm mt-1">
            We&apos;ll reach out when it&apos;s time to climb.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
