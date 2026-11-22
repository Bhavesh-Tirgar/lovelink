import React from 'react';
import { motion } from 'framer-motion';
import { luxuryEasing } from './MotionVariants';
import { cn } from '../../utils/cn';

/**
 * SplitText component from React Bits (reactbits.dev)
 * Staggers word and letter entrances for high-impact titles.
 */
export default function SplitText({
  text = "",
  className = "",
  delay = 0.03,
}) {
  const words = text.split(" ");

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: delay, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 14,
        stiffness: 120,
        ease: luxuryEasing,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 14,
        stiffness: 120,
        ease: luxuryEasing,
      },
    },
  };

  return (
    <motion.span
      className={cn("inline-flex flex-wrap gap-x-1.5", className)}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span
          variants={child}
          key={index}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}
