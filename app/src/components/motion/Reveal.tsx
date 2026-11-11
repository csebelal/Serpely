import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useInViewOnce, useMotionPrefs } from './useMotionPrefs';

export interface RevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  x?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Scroll-triggered reveal-once container.
 * Animates only `opacity` and `transform` (GPU-composited) and falls back to
 * immediate visibility under `prefers-reduced-motion`.
 */
export function Reveal({
  children,
  delay = 0,
  duration = 560,
  y = 22,
  x = 0,
  className = '',
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useMotionPrefs();
  const visible = useInViewOnce(ref);

  const mergedStyle: CSSProperties = reducedMotion
    ? { ...style }
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0, 0, 0)' : `translate3d(${x}px, ${y}px, 0)`,
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        transitionDelay: `${delay}ms`,
        ...style,
      };

  return (
    <div ref={ref} className={className} style={mergedStyle}>
      {children}
    </div>
  );
}
