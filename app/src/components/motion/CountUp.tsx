import { useEffect, useMemo, useRef, useState } from 'react';
import { useInViewOnce, useMotionPrefs } from './useMotionPrefs';

export interface CountUpProps {
  /** Numeric target or CMS string such as `"40%"` or `"78"`. */
  value: number | string;
  duration?: number;
  /** Optional delay before counting starts once in view. */
  delayMs?: number;
  /** Optional calm periodic +/-1 live pulse once visible. */
  liveDelta?: number;
  liveIntervalMs?: number;
  className?: string;
}

function parseValue(raw: number | string): { num: number; prefix: string; suffix: string; decimals: number } | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const decimals = String(raw).split('.')[1]?.length ?? 0;
    return { num: raw, prefix: '', suffix: '', decimals };
  }
  const str = String(raw).trim();
  const m = str.match(/^([^0-9.-]*)(-?\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const num = Number(m[2]);
  if (!Number.isFinite(num)) return null;
  const decimals = m[2].split('.')[1]?.length ?? 0;
  return { num, prefix: m[1] || '', suffix: m[3] || '', decimals };
}

/**
 * Scroll-triggered count-up using requestAnimationFrame and tabular numerals.
 */
export function CountUp({
  value,
  duration = 1100,
  delayMs = 0,
  liveDelta = 0,
  liveIntervalMs = 4200,
  className = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { reducedMotion } = useMotionPrefs();
  const inView = useInViewOnce(ref, { threshold: 0.25, rootMargin: '0px' });
  const parsed = useMemo(() => parseValue(value), [value]);
  const [display, setDisplay] = useState<number>(0);
  const [jitterOffset, setJitterOffset] = useState(0);

  useEffect(() => {
    if (!parsed || reducedMotion || !inView) return;
    let raf = 0;
    let timer = 0;
    let elapsed = 0;
    let lastTs = 0;
    const target = parsed.num;

    const tick = (now: number) => {
      if (document.hidden) {
        lastTs = 0;
        return;
      }
      if (!lastTs) lastTs = now;
      elapsed += now - lastTs;
      lastTs = now;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onVisibility = () => {
      if (!document.hidden && elapsed < duration) {
        lastTs = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    const begin = () => {
      document.addEventListener('visibilitychange', onVisibility);
      if (!document.hidden) {
        raf = requestAnimationFrame(tick);
      }
    };

    if (delayMs > 0) {
      timer = window.setTimeout(begin, delayMs);
    } else {
      begin();
    }
    return () => {
      if (timer) window.clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [parsed, duration, delayMs, inView, reducedMotion]);

  useEffect(() => {
    if (!parsed || !liveDelta || reducedMotion || !inView) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setJitterOffset(prev => (prev === 0 ? liveDelta : 0));
    }, liveIntervalMs);
    return () => window.clearInterval(id);
  }, [parsed, liveDelta, liveIntervalMs, reducedMotion, inView]);

  if (!parsed) {
    return <span ref={ref} className={className}>{value}</span>;
  }

  const finalNum = (reducedMotion ? parsed.num : display) + jitterOffset;
  const formatted = parsed.decimals > 0
    ? finalNum.toFixed(parsed.decimals)
    : Math.round(finalNum).toLocaleString();

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {parsed.prefix}{formatted}{parsed.suffix}
    </span>
  );
}
