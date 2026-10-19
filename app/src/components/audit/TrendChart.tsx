import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// 30-day health trend — Recharts area chart from snapshots.
export function TrendChart({ points }: { points: { date: string; overall: number }[] }) {
  const data = (points || []).map(p => ({ date: p.date.slice(5), overall: p.overall }));
  if (data.length < 2) {
    return (
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Health trend</h3>
        <p style={{ fontSize: 13, color: '#9DB2A8' }}>Run daily audits to build your 30-day trend. The first point is saved from this audit.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800 }}>Health trend · 30 days</h3>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="overall" stroke="#00B96B" fill="#00B96B33" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
