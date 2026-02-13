"use client";

import { motion } from "framer-motion";
import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudIcon from "./CloudIcon";

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudSelector({ onSelect }: CloudSelectorProps) {
  return (
    <section id="clouds" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="font-display text-2xl sm:text-3xl text-storm text-center mb-16 font-light"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          What type of cloud are you?
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {clouds.map((cloud, i) => (
            <motion.button
              key={cloud.id}
              type="button"
              onClick={() => onSelect(cloud)}
              className="flex items-center gap-6 p-6 rounded-2xl bg-white/60 hover:bg-white/90 border border-mist/50 hover:border-sage/30 transition-all duration-300 text-left group"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-storm/5 flex items-center justify-center text-storm/60 group-hover:text-accent transition-colors">
                <CloudIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="font-display text-storm text-lg">
                  {cloud.name}
                </span>
                <span className="block text-mist text-sm mt-0.5">
                  {cloud.mood}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
