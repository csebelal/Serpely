import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicAuditIssue } from '@/lib/api';

// Issues list — All / Critical / Warnings / Notices tabs + expandable rows.
type Tab = 'all' | 'critical' | 'warnings' | 'notices';

function tabOf(i: PublicAuditIssue): Tab {
  if (i.severity === 'critical') return 'critical';
  if (i.severity === 'high' || i.severity === 'medium') return 'warnings';
  return 'notices';
}

const SEV_COLOR: Record<string, string> = { critical: '#E5484D', high: '#D9730D', medium: '#D9A400', low: '#0E9AA7' };

export function IssuesList({ issues }: { issues: PublicAuditIssue[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const counts: Record<Tab, number> = {
    all: issues.length,
    critical: issues.filter(i => tabOf(i) === 'critical').length,
    warnings: issues.filter(i => tabOf(i) === 'warnings').length,
    notices: issues.filter(i => tabOf(i) === 'notices').length,
  };
  const list = issues.filter(i => tab === 'all' || tabOf(i) === tab);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {(['all', 'critical', 'warnings', 'notices'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: tab === t ? '1px solid #0B1411' : '1px solid #DCE3DF',
              background: tab === t ? '#0B1411' : '#fff', color: tab === t ? '#fff' : '#0B1411' }}>
            {t[0].toUpperCase() + t.slice(1)} ({counts[t]})
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(i => {
          return (
            <div key={i.code} style={{ border: '1px solid #E3E9E6', borderRadius: 14, background: i.passed ? '#F4FAF6' : '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px 4px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 5, background: i.passed ? '#00B96B' : SEV_COLOR[i.severity] || '#999', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14, display: 'block' }}>{i.passed ? '✓ ' : ''}{i.title}</strong>
                  <span style={{ fontSize: 12, color: '#55655D' }}>{i.category} · {i.evidence?.slice(0, 120)}</span>
                </span>
              </div>
              <div style={{ padding: '8px 16px 16px 36px', fontSize: 13, lineHeight: 1.65 }}>
                {i.why && <p style={{ margin: '0 0 8px' }}><strong>Why it matters: </strong>{i.why}</p>}
                {!!i.affected?.examples?.length && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Affected ({i.affected.count}):</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {i.affected.examples.map(e => <li key={e} style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{e}</li>)}
                    </ul>
                  </div>
                )}
                {!i.passed && (
                  <div style={{ marginTop: 12 }}>
                    <Link
                      to={`/register?fix=${encodeURIComponent(i.code)}`}
                      className="btn-accent-s inline-flex"
                      style={{ fontSize: 12, padding: '8px 16px', textDecoration: 'none' }}
                    >
                      Fix with Serpely agent
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p style={{ fontSize: 13, color: '#9DB2A8' }}>Nothing in this tab.</p>}
      </div>
    </div>
  );
}
