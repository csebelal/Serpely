import { ArrowUp, AlertCircle, Check } from 'lucide-react';
import { CountUp } from '@/components/motion';
import { HERO_DASHBOARD_DATA, type FloatingCardConfig } from './heroDashboardData';

export interface FloatingCardsProps {
  alert1Title?: string;
  alert1Sub?: string;
  alert2Title?: string;
  alert2Sub?: string;
  tabHidden?: boolean;
}

function CardIcon({ variant }: { variant: FloatingCardConfig['variant'] }) {
  if (variant === 'up') {
    return (
      <span className="hero-fc-ic is-up" aria-hidden="true">
        <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (variant === 'live') {
    return (
      <span className="hero-fc-ic is-up" aria-hidden="true">
        <span className="hero-fc-live-dot" />
      </span>
    );
  }
  if (variant === 'warn') {
    return (
      <span className="hero-fc-ic is-warn" aria-hidden="true">
        <AlertCircle className="w-4 h-4" strokeWidth={2.3} />
      </span>
    );
  }
  return (
    <span className="hero-fc-ic is-up" aria-hidden="true">
      <Check className="w-4 h-4" strokeWidth={2.6} />
    </span>
  );
}

/**
 * Four translucent glass cards orbiting the scaled HeroDashboard composition,
 * each with independent pop-in timing and float cadence.
 */
export function FloatingCards({
  alert1Title,
  alert1Sub,
  alert2Title,
  alert2Sub,
  tabHidden = false,
}: FloatingCardsProps) {
  const { scoreUp, citations, citationDrop, fixReady } = HERO_DASHBOARD_DATA.floatingCards;
  const pausedClass = tabHidden ? ' hero-paused' : '';

  const c1Title = alert1Title || scoreUp.title;
  const c1Sub = alert1Sub || scoreUp.subtitle;
  const c3Title = alert2Title || citationDrop.title;
  const hasCustomAlert2Sub = Boolean(alert2Sub && alert2Sub !== 'ChatGPT mentions ↑ 83%');

  return (
    <>
      {/* 1. GEO Score Up */}
      <div className={`hero-fc hero-fc-1 hero-glass-chip${pausedClass}`}>
        <CardIcon variant="up" />
        <div>
          <div className="hero-fc-title">{c1Title}</div>
          <small>{c1Sub}</small>
        </div>
      </div>

      {/* 2. AI Citations live count-up */}
      <div className={`hero-fc hero-fc-2 hero-glass-chip${pausedClass}`} aria-hidden="true">
        <CardIcon variant="live" />
        <div>
          <div className="hero-fc-title">
            {citations.title}{' '}
            <span className="accent-text">
              <CountUp value={citations.countTarget ?? 143} duration={2100} delayMs={850} />
            </span>
          </div>
          <small>{citations.subtitle}</small>
        </div>
      </div>

      {/* 3. AI Citation Drop */}
      <div className={`hero-fc hero-fc-3 hero-glass-chip${pausedClass}`}>
        <CardIcon variant="warn" />
        <div>
          <div className="hero-fc-title">{c3Title}</div>
          <small>
            {hasCustomAlert2Sub ? (
              alert2Sub
            ) : (
              <>
                {citationDrop.subtitlePrefix}
                <CountUp value={citationDrop.countTarget ?? 83} duration={2100} delayMs={850} />
                {citationDrop.countSuffix}
              </>
            )}
          </small>
        </div>
      </div>

      {/* 4. Fix ready */}
      <div className={`hero-fc hero-fc-4 hero-glass-chip${pausedClass}`} aria-hidden="true">
        <CardIcon variant="check" />
        <div>
          <div className="hero-fc-title">{fixReady.title}</div>
          <small>{fixReady.subtitle}</small>
        </div>
      </div>
    </>
  );
}
