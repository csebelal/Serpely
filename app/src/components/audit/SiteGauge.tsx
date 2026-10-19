// Site health gauge — SVG ring with label + delta since last audit.
export function SiteGauge({ score, delta, pages }: { score: number; delta: number | null; pages: number }) {
  const r = 64; const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const label = score >= 80 ? 'Good' : score >= 55 ? 'Fair' : 'Needs work';
  const color = score >= 80 ? '#00B96B' : score >= 55 ? '#D9A400' : '#E5484D';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#E8EEEB" strokeWidth="14" />
          <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 80 80)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <strong style={{ fontSize: 38, lineHeight: 1 }}>{score}</strong>
          <span style={{ fontSize: 12, color: '#55655D' }}>/ 100</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#55655D' }}>Site health</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{label}</div>
        <div style={{ fontSize: 13, color: delta !== null && delta >= 0 ? '#00B96B' : '#E5484D', fontWeight: 700 }}>
          {delta === null ? `${pages} pages crawled` : `${delta >= 0 ? '+' : ''}${delta} points since last audit`}
        </div>
        <div style={{ fontSize: 12, color: '#9DB2A8' }}>{pages} pages crawled</div>
      </div>
    </div>
  );
}
