import { V2 } from './v2Theme';

export interface IndexGate { code: string; label: string; passed: boolean; detail: string }
export interface IndexMeta { score: number; gates: IndexGate[] }

export function parseIndexMeta(meta?: Record<string, string>): IndexMeta | null {
  try {
    const raw = meta?.index;
    if (!raw) return null;
    return JSON.parse(raw) as IndexMeta;
  } catch { return null; }
}

function PassIcon() {
  return (
    <svg style={{ flex: 'none', marginTop: 1 }} width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="#006B43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Pass">
      <circle cx="12" cy="12" r="10.5" strokeWidth="2" />
      <path d="M7.5 12.5l3 3 6-6.5" />
    </svg>
  );
}

function FailIcon() {
  return (
    <svg style={{ flex: 'none', marginTop: 1 }} width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="#B42318" strokeWidth="3" strokeLinecap="round" role="img" aria-label="Fail">
      <circle cx="12" cy="12" r="10.5" strokeWidth="2" />
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" />
    </svg>
  );
}

// "Will Google list this page?" — the 8 indexability gates as a checklist.
export function GoogleChecklist({ meta }: { meta?: Record<string, string> }) {
  const im = parseIndexMeta(meta);
  if (!im) return null;
  const ok = im.gates.filter(g => g.passed).length;
  return (
    <section aria-label="Will Google list this page" style={{ flex: '1 1 460px', minWidth: 0, background: V2.cardBg, border: `1px solid ${V2.border}`, borderRadius: 24, padding: 28, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 style={{ margin: 0, fontFamily: V2.fontDisplay, fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', color: V2.ink }}>
          Will Google list this page?
        </h2>
        <p style={{ margin: 0, color: V2.soft }}>{ok} of {im.gates.length} basic checks pass.</p>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {im.gates.map(g => (
          <li key={g.code} title={g.detail} style={{
            flex: '1 1 200px', display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 14,
            background: g.passed ? '#F4FBF7' : '#FDF1EF',
            border: `1px solid ${g.passed ? '#D6EFE2' : '#F4C9C3'}`,
          }}>
            {g.passed ? <PassIcon /> : <FailIcon />}
            <span style={{ fontSize: 14, fontWeight: 500, color: V2.ink }}>{g.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
