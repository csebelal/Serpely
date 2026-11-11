import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useMotionPrefs } from './useMotionPrefs';

export interface GlowCardProps {
  children: ReactNode;
  featured?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Interactive card surface with a cursor-following radial spotlight and optional
 * animated accent border halo (`featured`).
 */
export function GlowCard({
  children,
  featured = false,
  className = '',
  style,
}: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion, isTouch } = useMotionPrefs();
  const trackPointer = !reducedMotion && !isTouch;

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!trackPointer || !el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--glow-x', `${e.clientX - r.left}px`);
    el.style.setProperty('--glow-y', `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onPointerMove={trackPointer ? onPointerMove : undefined}
      className={`glow-card-s ${featured ? 'glow-border-anim' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
