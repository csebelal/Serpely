import { useEffect, useRef } from 'react';
import { useMotionPrefs } from './useMotionPrefs';

/** Thin GPU-composited scroll progress indicator pinned to the top edge of the viewport. */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useMotionPrefs();

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${pct})`;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[60] pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left"
        style={{
          transform: 'scaleX(0)',
          background: 'linear-gradient(90deg, #00C27A 0%, #00FF88 100%)',
          boxShadow: '0 0 10px rgba(0, 194, 122, 0.45)',
        }}
      />
    </div>
  );
}
