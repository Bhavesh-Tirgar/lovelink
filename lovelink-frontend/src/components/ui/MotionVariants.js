/**
 * Luxury Easing Curves & Framer Motion Blueprints
 * Inspired by MotionSites.ai & React Bits
 */

export const luxuryEasing = [0.16, 1, 0.3, 1];
export const springTransition = { type: "spring", stiffness: 400, damping: 28 };
export const softSpring = { type: "spring", stiffness: 260, damping: 20 };

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.94, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.65, ease: luxuryEasing },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -10,
    transition: { duration: 0.35, ease: luxuryEasing },
  },
};

export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const revealUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: luxuryEasing },
  },
};

export const hoverGlow = {
  rest: { scale: 1, filter: "brightness(1)" },
  hover: { scale: 1.025, filter: "brightness(1.1)", transition: softSpring },
  tap: { scale: 0.97, transition: { duration: 0.1 } },
};
