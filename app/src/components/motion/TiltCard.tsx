import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useMotionPrefs } from './useMotionPrefs';

export interface TiltCardProps {
  children: ReactNode;
  maxTilt?: number;
  perspective?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Lightweight pointer-driven 3D tilt container.
 * Automatically disabled on touch devices and under `prefers-reduced-motion`.
 */
export function TiltCard({
  children,
  maxTilt = 5,
  perspective = 1100,
  className = '',
  style,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const { reducedMotion, isTouch } = useMotionPrefs();
  const disabled = reducedMotion || isTouch;

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !ref.current) return;
    const el = ref.current;
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const nx = (clientX - r.left) / r.width - 0.5;
      const ny = (clientY - r.top) / r.height - 0.5;
      const rx = (-ny * maxTilt * 2).toFixed(2);
      const ry = (nx * maxTilt * 2).toFixed(2);
      el.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  };

  const onPointerLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (ref.current) {
      ref.current.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`;
    }
  };

  return (
    <div
      ref={ref}
      onPointerMove={disabled ? undefined : onPointerMove}
      onPointerLeave={disabled ? undefined : onPointerLeave}
      className={className}
      style={{
        transition: disabled ? undefined : 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        transformStyle: disabled ? undefined : 'preserve-3d',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
