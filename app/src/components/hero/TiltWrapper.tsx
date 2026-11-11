import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useMotionPrefs } from '@/components/motion';

export interface TiltWrapperProps {
  children: ReactNode;
  baseRotateY?: number;
  baseRotateX?: number;
  maxDeltaX?: number;
  maxDeltaY?: number;
  perspective?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Desktop-only 3D isometric tilt wrapper that tracks pointer movement across
 * the stage area and smoothly returns to the resting angle.
 * Automatically flattens / disables tilt on touch devices and reduced motion.
 */
export function TiltWrapper({
  children,
  baseRotateY = -7,
  baseRotateX = 3,
  maxDeltaY = 10,
  maxDeltaX = 8,
  className = '',
  style,
}: TiltWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const { reducedMotion, isTouch } = useMotionPrefs();
  const disabled = reducedMotion || isTouch;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (disabled) {
      el.style.transform = '';
      return;
    }

    const host = el.closest('[data-hero-stage]') as HTMLElement | null;
    if (!host) return;

    const restTransform = `rotateY(${baseRotateY}deg) rotateX(${baseRotateX}deg)`;
    el.style.transform = restTransform;

    const onMove = (e: PointerEvent) => {
      const clientX = e.clientX;
      const clientY = e.clientY;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        if (!r.width || !r.height || !ref.current) return;
        const nx = (clientX - r.left) / r.width - 0.5;
        const ny = (clientY - r.top) / r.height - 0.5;
        const ry = (baseRotateY + nx * maxDeltaY).toFixed(2);
        const rx = (baseRotateX - ny * maxDeltaX).toFixed(2);
        ref.current.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg)`;
      });
    };

    const onLeave = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ref.current) {
        ref.current.style.transform = restTransform;
      }
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [disabled, baseRotateX, baseRotateY, maxDeltaX, maxDeltaY]);

  return (
    <div
      ref={ref}
      className={`hero-tilt ${className}`}
      style={{
        transform: disabled ? 'none' : `rotateY(${baseRotateY}deg) rotateX(${baseRotateX}deg)`,
        transformStyle: disabled ? undefined : 'preserve-3d',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
