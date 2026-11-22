import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * SpotlightCard from React Bits (reactbits.dev)
 * Creates dynamic radial light tracking cursor on glassmorphic borders and surface.
 */
export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(244, 63, 94, 0.18)",
  borderColor = "rgba(244, 63, 94, 0.35)",
  onClick,
  ...props
}) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setOpacity(1);
  };

  const handleBlur = () => {
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "relative rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl overflow-hidden transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]",
        className
      )}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Radial Background */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      {/* Border Glow Highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 border"
        style={{
          opacity,
          borderColor: borderColor,
        }}
      />
      <div className="relative z-10 w-full h-full">{children}</div>
    </motion.div>
  );
}
