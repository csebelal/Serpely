import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ScaleToFitProps {
  children: ReactNode;
  baseWidth?: number;
  padX?: number;
  padY?: number;
  minScale?: number;
  maxScale?: number;
  mobileBreakpoint?: number;
  className?: string;
}

/**
 * Scales a fixed-width dashboard composition proportionally to fit its stage
 * container so the entire hero fits in a single desktop viewport (<=900px
 * collapses height cleanly to allow normal stacked vertical scrolling).
 */
export function ScaleToFit({
  children,
  baseWidth = 900,
  padX = 88,
  padY = 64,
  minScale = 0.3,
  maxScale = 1.24,
  mobileBreakpoint = 900,
  className = '',
}: ScaleToFitProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const fit = fitRef.current;
    if (!stage || !fit) return;

    const recalc = () => {
      const h = fit.offsetHeight || 560;
      const aw = Math.max(0, stage.clientWidth - 28);
      const ah = Math.max(0, stage.clientHeight - 10);

      let s: number;
      if (window.innerWidth <= mobileBreakpoint) {
        s = Math.min(aw / (baseWidth + padX), 1);
        s = Math.max(s, minScale);
        stage.style.height = `${Math.ceil((h + padY) * s)}px`;
      } else {
        stage.style.height = '';
        s = Math.min(aw / (baseWidth + padX), ah / (h + padY), maxScale);
        s = Math.max(s, minScale);
      }

      fit.style.setProperty('--hero-scale', s.toFixed(4));
    };

    recalc();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(recalc) : null;
    ro?.observe(stage);
    ro?.observe(fit);

    window.addEventListener('resize', recalc, { passive: true });
    let active = true;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (active) recalc();
      });
    }

    return () => {
      active = false;
      ro?.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [baseWidth, padX, padY, minScale, maxScale, mobileBreakpoint]);

  return (
    <div ref={stageRef} data-hero-stage className={`hero-stage ${className}`}>
      <div
        ref={fitRef}
        className="hero-fit"
        style={{ width: `${baseWidth}px` }}
      >
        {children}
      </div>
    </div>
  );
}
