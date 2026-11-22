import React from 'react';
import { cn } from '../../utils/cn';

/**
 * ShinyText from React Bits (reactbits.dev)
 * Shimmering kinetic light beam sweep across text.
 */
export default function ShinyText({
  text,
  disabled = false,
  speed = 3,
  className = "",
  children,
}) {
  const content = text || children;
  const animationDuration = `${speed}s`;

  return (
    <span
      className={cn(
        "inline-block font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-200 to-white",
        !disabled && "animate-shimmer bg-[length:200%_100%]",
        className
      )}
      style={{
        animationDuration,
      }}
    >
      {content}
    </span>
  );
}
