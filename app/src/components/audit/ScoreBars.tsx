// Score by category — 5 bars, lowest gets a badge.
const ORDER = ['Performance', 'Accessibility', 'Technical SEO', 'On-page content', 'AI citation readiness'];
const COLORS: Record<string, string> = {
  Performance: '#D9730D', Accessibility: '#0E9AA7', 'Technical SEO': '#2F5FE0',
  'On-page content': '#7A4DE0', 'AI citation readiness': '#00945A',
};

export function ScoreBars({ scores }: { scores: Record<string, number> }) {
  const rows = ORDER.map(k => ({ name: k, score: scores[k] ?? 0 }));
  const min = Math.min(...rows.map(r => r.score));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Score by category</h3>
      {rows.map(r => (
        <div key={r.name}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</span>
            {r.score === min && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#FDECEC', color: '#E5484D' }}>LOWEST</span>}
            <span style={{ flex: 1 }} />
            <strong style={{ fontSize: 15 }}>{r.score}</strong>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: '#E8EEEB', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${r.score}%`, background: COLORS[r.name] || '#00B96B', borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
