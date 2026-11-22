import React from 'react';
import { motion } from 'framer-motion';

export default function AmbientAuraGlow({ className = "" }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none -z-10 ${className}`}>
      {/* Primary Rose / Purple Glow */}
      <motion.div
        animate={{
          scale: [1, 1.18, 1],
          opacity: [0.35, 0.55, 0.35],
          x: [0, 30, 0],
          y: [0, -25, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[450px] bg-gradient-to-tr from-rose-600/30 via-pink-600/25 to-purple-600/20 rounded-full blur-[130px]"
      />

      {/* Secondary Cyan / Indigo Accent Aura */}
      <motion.div
        animate={{
          scale: [1.1, 0.95, 1.1],
          opacity: [0.2, 0.4, 0.2],
          x: [20, -30, 20],
          y: [-20, 25, -20],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-10 right-1/4 w-[500px] h-[380px] bg-gradient-to-tl from-indigo-600/20 via-cyan-500/15 to-transparent rounded-full blur-[140px]"
      />
    </div>
  );
}
