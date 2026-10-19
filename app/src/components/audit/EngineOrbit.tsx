import { V2 } from './v2Theme';

export interface EngineState { name: string; readable: boolean; detail: string }

// "Your site" hub with one card per AI engine. All geometry is proportional
// (percentages of the orbit box), so connector lines always meet their cards
// at any rendered width. Small screens fall back to a stacked list.
export function EngineOrbit({ engines, siteLabel }: { engines: EngineState[]; siteLabel: string }) {
  // Card inner edges in % of a 440×340 box: cards are 39% wide at the corners.
  const anchors = [
    { x: 39, y: 13 },
    { x: 61, y: 13 },
    { x: 39, y: 87 },
    { x: 61, y: 87 },
  ];
  return (
    <>
      {/* Stacked list (small screens) — display comes from classes only so md:hidden can win */}
      <div className="flex flex-col gap-2 md:hidden" style={{ width: '100%' }}>
        {engines.map(e => (
          <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#12241C', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ flex: 1, fontWeight: 600, color: '#FFFFFF' }}>{e.name}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: e.readable ? V2.greenSoft : V2.redSoft, fontSize: 13 }}>
              {e.readable ? '✓' : '✗'} {e.readable ? 'Can read' : 'Blocked'}
            </span>
          </div>
        ))}
      </div>
      {/* Orbit (md and up) */}
      <div className="hidden md:block" style={{ position: 'relative', width: '100%', maxWidth: 440, aspectRatio: '440 / 340' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          {anchors.map((a, i) => {
            const ok = engines[i]?.readable ?? true;
            return (
              <line key={i} x1="50" y1="50" x2={a.x} y2={a.y}
                stroke={ok ? V2.greenBright : V2.redSoft} strokeWidth="2.5"
                strokeDasharray={ok ? '0' : '7 6'} vectorEffect="non-scaling-stroke" />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '24%', maxWidth: 112, minWidth: 88, aspectRatio: '1 / 1', borderRadius: '50%', background: '#0F2A1F', border: `2px solid ${V2.greenBright}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 0 40px rgba(25,217,135,0.35)' }}>
          <span style={{ fontFamily: V2.fontDisplay, fontWeight: 700, fontSize: 15, color: '#FFFFFF', lineHeight: 1.2 }}>Your site</span>
          <span style={{ fontFamily: V2.fontMono, fontSize: 10, color: V2.faint, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siteLabel}</span>
        </div>
        {engines.slice(0, 4).map((e, i) => {
          const left = i % 2 === 0;
          const top = i < 2;
          return (
            <div key={e.name} style={{
              position: 'absolute', width: '39%', boxSizing: 'border-box', padding: '10px 12px',
              borderRadius: 16, background: '#12241C', border: '1px solid rgba(255,255,255,0.14)',
              left: left ? 0 : undefined, right: left ? undefined : 0,
              top: top ? '2%' : undefined, bottom: top ? undefined : '2%',
            }}>
              <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
              <div style={{ fontSize: 12, color: e.readable ? V2.greenSoft : V2.redSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.readable ? 'Can read your site' : e.detail || 'Blocked'}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
