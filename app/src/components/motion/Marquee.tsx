import type { ReactNode } from 'react';
import { useMotionPrefs } from './useMotionPrefs';

export interface MarqueeProps {
  children: ReactNode;
  direction?: 'left' | 'right';
  durationSec?: number;
  gapPx?: number;
  pauseOnHover?: boolean;
  maskClassName?: string;
  className?: string;
}

/**
 * Seamless dual-track horizontal marquee with edge fade masks, hover/focus pause,
 * and a clean static wrapped fallback under `prefers-reduced-motion`.
 */
export function Marquee({
  children,
  direction = 'left',
  durationSec = 36,
  gapPx = 40,
  pauseOnHover = true,
  maskClassName = 'marquee-mask',
  className = '',
}: MarqueeProps) {
  const { reducedMotion } = useMotionPrefs();

  if (reducedMotion) {
    return (
      <div className={`flex flex-wrap items-center justify-center ${className}`} style={{ gap: `${gapPx}px` }}>
        {children}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${maskClassName} ${className}`}>
      <div
        className={`flex w-max items-center ${pauseOnHover ? 'marquee-pausable' : ''}`}
        style={{
          animation: `${direction === 'right' ? 'testimonialScroll' : 'marqueeScroll'} ${durationSec}s linear infinite`,
          willChange: 'transform',
        }}
      >
        <div
          className="flex items-center flex-shrink-0"
          style={{ gap: `${gapPx}px`, paddingRight: `${gapPx}px` }}
        >
          {children}
        </div>
        <div
          className="flex items-center flex-shrink-0"
          style={{ gap: `${gapPx}px`, paddingRight: `${gapPx}px` }}
          aria-hidden="true"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
