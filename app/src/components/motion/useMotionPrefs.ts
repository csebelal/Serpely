import { useEffect, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';

function subscribeMedia(query: string, cb: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia(query);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function getMediaSnapshot(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

/** Reactive motion & pointer capability preferences. */
export function useMotionPrefs() {
  const reducedMotion = useSyncExternalStore(
    (cb) => subscribeMedia('(prefers-reduced-motion: reduce)', cb),
    () => getMediaSnapshot('(prefers-reduced-motion: reduce)'),
    () => false,
  );
  const isTouch = useSyncExternalStore(
    (cb) => subscribeMedia('(hover: none), (pointer: coarse)', cb),
    () => getMediaSnapshot('(hover: none), (pointer: coarse)'),
    () => false,
  );
  return { reducedMotion, isTouch };
}

/**
 * Reveal-once IntersectionObserver hook.
 * Triggers once on first entry and unobserves immediately (zero scroll-back flicker).
 */
export function useInViewOnce(
  ref: RefObject<Element | null>,
  { threshold = 0.12, rootMargin = '0px 0px -40px 0px' }: { threshold?: number; rootMargin?: string } = {},
): boolean {
  const { reducedMotion } = useMotionPrefs();
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (reducedMotion || seen) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSeen(true);
            io.unobserve(el);
            break;
          }
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, rootMargin, reducedMotion, seen]);

  return reducedMotion || seen;
}
