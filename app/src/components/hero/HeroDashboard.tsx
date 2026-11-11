import { useEffect, useState } from 'react';
import { CountUp, useMotionPrefs } from '@/components/motion';
import { HERO_DASHBOARD_DATA, type HeroDashboardData } from './heroDashboardData';

export interface HeroDashboardProps {
  data?: HeroDashboardData;
  tabHidden?: boolean;
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 36; // ~226.19

/**
 * Interactive Command Center preview rendered in native HTML/CSS/SVG using
 * the project's light/dark CSS theme variables.
 */
export function HeroDashboard({ data = HERO_DASHBOARD_DATA, tabHidden = false }: HeroDashboardProps) {
  const { reducedMotion } = useMotionPrefs();
  const [activated, setActivated] = useState(false);
  const [fixedCount, setFixedCount] = useState(0);

  // Trigger initial ring fill, engine bar scale, and SVG line draw
  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setTimeout(() => setActivated(true), 850);
    return () => window.clearTimeout(id);
  }, [reducedMotion]);

  // Cycle issue rows to FIXED one by one, then loop (paused when tab hidden)
  useEffect(() => {
    if (reducedMotion) return;
    const total = data.siteHealth.issues.length;
    let intervalId = 0;

    const startTimeout = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        if (document.hidden) return;
        setFixedCount(prev => (prev < total ? prev + 1 : 0));
      }, data.siteHealth.cycleIntervalMs);
    }, data.siteHealth.cycleStartDelayMs);

    return () => {
      window.clearTimeout(startTimeout);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [reducedMotion, data.siteHealth.issues.length, data.siteHealth.cycleIntervalMs, data.siteHealth.cycleStartDelayMs]);

  const targetOffset = RING_CIRCUMFERENCE * (1 - data.siteHealth.score / 100);
  const strokeDashoffset = activated || reducedMotion ? targetOffset : RING_CIRCUMFERENCE;
  const pausedClass = tabHidden ? ' hero-paused' : '';

  return (
    <div
      className={`hero-dash-frame${pausedClass}`}
      role="region"
      aria-label="Serpely Command Center interactive dashboard preview"
    >
      {/* Browser chrome */}
      <div className="hero-dash-titlebar" aria-hidden="true">
        <span className="hero-dash-dot" />
        <span className="hero-dash-dot" />
        <span className="hero-dash-dot" />
        <span className="hero-dash-url">{data.browserHost}</span>
      </div>

      {/* App workspace */}
      <div className="hero-dash-app">
        {/* Sidebar */}
        <aside className="hero-dash-side" aria-hidden="true">
          {data.sidebar.primary.map(item => (
            <div key={item.label} className={item.active ? 'hero-side-item is-active' : 'hero-side-item'}>
              {item.label}
            </div>
          ))}
          {data.sidebar.groups.map(group => (
            <div key={group.heading} className="hero-side-group">
              <h6>{group.heading}</h6>
              {group.items.map(label => (
                <div key={label} className="hero-side-item">
                  {label}
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* Main dashboard content */}
        <div className={`hero-dash-main${activated || reducedMotion ? ' is-go' : ''}`}>
          {/* Live scrolling telemetry ticker */}
          <div className="hero-dash-tick" aria-hidden="true">
            {[0, 1].map(loopIdx => (
              <span key={loopIdx} className="hero-dash-tick-track">
                {data.ticker.map((item, idx) => (
                  <span key={`${loopIdx}-${idx}`} className="hero-dash-tick-seg">
                    {item.prefix ? `${item.prefix} ` : ''}
                    {item.highlight ? <b>{item.text}</b> : item.text}
                  </span>
                ))}
              </span>
            ))}
          </div>

          {/* Dashboard header */}
          <div className="hero-dash-mh">
            <div>
              <h3>{data.header.title}</h3>
              <p>{data.header.subtitle}</p>
            </div>
            <span className="hero-dash-date">{data.header.dateRange}</span>
          </div>

          {/* Top KPI row: Site Health + Citations by Engine */}
          <div className="hero-dash-row1">
            <div className="hero-dash-box">
              <h5>{data.siteHealth.title}</h5>
              <div className="hero-health-wrap">
                <div className="hero-health-ring">
                  <svg viewBox="0 0 80 80" aria-hidden="true">
                    <circle className="hero-ring-track" cx="40" cy="40" r="36" />
                    <circle
                      className="hero-ring-val"
                      cx="40"
                      cy="40"
                      r="36"
                      style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset }}
                    />
                  </svg>
                  <b>
                    <CountUp value={data.siteHealth.score} duration={2100} delayMs={850} />
                  </b>
                </div>

                <div className="hero-acts-list">
                  {data.siteHealth.issues.map((issue, idx) => {
                    const isFixed = idx < fixedCount;
                    return (
                      <div key={issue.id} className={`hero-act-row${isFixed ? ' is-fixed' : ''}`}>
                        <span className="hero-act-label">{issue.label}</span>
                        <em className={issue.severity === 'MEDIUM' && !isFixed ? 'is-med' : ''}>
                          {isFixed ? data.siteHealth.fixedLabel : issue.severity}
                        </em>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="hero-dash-box">
              <h5>{data.citationsByEngine.title}</h5>
              <div className="hero-eng-list">
                {data.citationsByEngine.engines.map(engine => (
                  <div key={engine.name} className="hero-eng-row">
                    <span>{engine.name}</span>
                    <u className="hero-eng-bar-bg">
                      <i
                        className="hero-eng-bar-fill"
                        style={{
                          transform: `scaleX(${activated || reducedMotion ? engine.percent / 100 : 0})`,
                        }}
                      />
                    </u>
                    <small>{engine.percent}%</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row: Organic Performance chart + AI Visibility */}
          <div className="hero-dash-row2">
            <div className="hero-dash-box">
              <h5>{data.organicPerformance.title}</h5>
              <div className="hero-kp-grid">
                <div className="hero-kp-card is-a">
                  <span>{data.organicPerformance.totalClicks.label}</span>
                  <strong>{data.organicPerformance.totalClicks.value}</strong>
                </div>
                <div className="hero-kp-card is-b">
                  <span>{data.organicPerformance.impressions.label}</span>
                  <strong>{data.organicPerformance.impressions.value}</strong>
                </div>
              </div>

              <svg className="hero-ch" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="heroDashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#00C27A" stopOpacity="0.24" />
                    <stop offset="1" stopColor="#00C27A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="hero-ch-ar" d={data.organicPerformance.areaPath} />
                <path className="hero-ch-line" pathLength={1} d={data.organicPerformance.primaryLinePath} stroke="#00C27A" />
                <path
                  className="hero-ch-line"
                  pathLength={1}
                  d={data.organicPerformance.secondaryLinePath}
                  stroke="#4F7CFF"
                  style={{ strokeDasharray: '0.02 0.02', strokeDashoffset: 0, opacity: 0.85 }}
                />
                <path
                  className="hero-ch-line"
                  pathLength={1}
                  d={data.organicPerformance.tertiaryLinePath}
                  stroke="#F2A93B"
                  style={{ opacity: 0.9 }}
                />
              </svg>
            </div>

            <div className="hero-dash-box hero-cit-card">
              <h5>{data.aiVisibility.title}</h5>
              <div>
                <div className="hero-cit-big">
                  <CountUp value={data.aiVisibility.score} duration={2100} delayMs={850} />
                </div>
                <div className="hero-cit-up">{data.aiVisibility.trendText}</div>
              </div>
              <p className="hero-cit-note">{data.aiVisibility.footnote}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
