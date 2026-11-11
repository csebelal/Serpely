import { useEffect, useRef } from 'react';
import { NeuralMesh } from './NeuralMesh';
import { useMotionPrefs } from '../motion/useMotionPrefs';

/**
 * Subtle page-wide background layer for sections below the Hero.
 * HeroSection owns its own dedicated HeroBackground so the two never stack
 * into muddy blobs or produce a mid-page seam.
 */
export function AnimatedBackground() {
  const spotRef = useRef<HTMLDivElement>(null);
  const { reducedMotion, isTouch } = useMotionPrefs();

  useEffect(() => {
    if (reducedMotion || isTouch) return;
    let raf = 0;
    let lx = 50;
    let ly = 20;

    const onMove = (e: PointerEvent) => {
      lx = e.clientX;
      ly = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (spotRef.current) {
          spotRef.current.style.setProperty('--bg-spot-x', `${lx}px`);
          spotRef.current.style.setProperty('--bg-spot-y', `${ly}px`);
        }
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion, isTouch]);

  if (reducedMotion || isTouch) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none select-none absolute inset-0 overflow-hidden z-0">
      <div ref={spotRef} className="fixed inset-0 spotlight-grid-overlay" />
      <div className="fixed inset-0 opacity-45">
        <NeuralMesh density="low" />
      </div>
    </div>
  );
}
