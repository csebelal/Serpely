import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/* ---------------------------------------------------------------------------
   Spotlight hover for analytics cards.

   One delegated `pointermove` listener writes --spot-x / --spot-y (px from the
   card's top-left) onto whichever descendant has `.analytics-card`, and adds
   `.spotlight-active` so the CSS ::after glow fades in/out. No iframe-style
   wrappers, no per-card listeners, no re-renders — pure CSS vars.

   Usage:
     <SpotlightRegion>          ← once, around a card grid region
       <div className="analytics-card" style={{ ...card, padding: 18 }}>…
   --------------------------------------------------------------------------- */

export function SpotlightRegion({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let active: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.('.analytics-card') as HTMLElement | null;
      if (active && active !== el) {
        active.classList.remove('spotlight-active');
        active = null;
      }
      if (el && host !== el && host.contains(el)) {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
        el.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
        if (active !== el) {
          el.classList.add('spotlight-active');
          active = el;
        }
      }
    };
    const onLeave = () => {
      active?.classList.remove('spotlight-active');
      active = null;
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      onLeave();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
