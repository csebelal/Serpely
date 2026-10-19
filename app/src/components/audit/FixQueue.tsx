import { V2, v2Cat, effortLabel } from './v2Theme';
import type { PublicAuditIssue } from '@/lib/api';

export interface QueueItem {
  code: string; title: string; evidence: string; fix: string;
  impact: number; effort: string; category: string; short: string;
}

export function toQueueItem(i: PublicAuditIssue, short: string): QueueItem {
  return {
    code: i.code, title: i.title, evidence: i.evidence, fix: i.fix,
    impact: i.impact, effort: i.effort, category: i.category, short,
  };
}

function Card({
  item, children,
}: {
  item: QueueItem;
  children: React.ReactNode;
}) {
  const st = v2Cat(item.short);
  return (
    <article style={{ background: V2.cardBg, border: '1px solid #E3E9E6', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: st.tint, color: st.text }}>
          {st.name}
        </span>
        <span style={{ fontFamily: V2.fontMono, fontWeight: 500, color: '#006B43' }}>+{item.impact} pts</span>
      </div>
      <h4 style={{ margin: 0, fontFamily: V2.fontDisplay, fontWeight: 600, fontSize: 17, lineHeight: 1.25, color: V2.ink }}>{item.title}</h4>
      <p style={{ margin: 0, color: V2.soft, fontSize: 14 }}>{item.evidence || item.fix}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: V2.soft, fontSize: 13 }}>{effortLabel(item.effort)}</span>
        {children}
      </div>
    </article>
  );
}

const btnGhost: React.CSSProperties = {
  minHeight: 44, padding: '0 14px', borderRadius: 999, border: '1px solid #C9D4CE',
  background: '#FFFFFF', color: V2.ink, font: 'inherit', fontWeight: 600, cursor: 'pointer',
};
const btnSolid: React.CSSProperties = {
  minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0,
  background: V2.green, color: '#04130C', font: 'inherit', fontWeight: 600, cursor: 'pointer',
};

function Column({
  title, count, empty, emptyText, bg, border, children,
}: {
  title: string; count: number; empty: boolean; emptyText: string;
  bg: string; border: string; children: React.ReactNode;
}) {
  return (
    <div style={{ flex: '1 1 300px', minWidth: 0, background: bg, border: `1px solid ${border}`, borderRadius: 24, padding: 16, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 0' }}>
        <h3 style={{ margin: 0, fontFamily: V2.fontDisplay, fontWeight: 700, fontSize: 18, color: V2.ink }}>{title}</h3>
        <span style={{ marginLeft: 'auto', padding: '1px 10px', borderRadius: 999, background: '#FFFFFF', fontWeight: 600, fontSize: 14, color: V2.ink }}>{count}</span>
      </div>
      {empty && (
        <div style={{ padding: '24px 12px', textAlign: 'center', color: V2.soft, border: '1.5px dashed #C9D4CE', borderRadius: 16 }}>{emptyText}</div>
      )}
      {children}
    </div>
  );
}

// Three-column Detected → Priority → Fixed workflow. All actions map to the
// existing plan/fix state in the parent (no new state model).
export function FixQueue({
  detected, priority, fixedItems, search,
  onPrioritize, onFix, onBack, onReopen,
}: {
  detected: QueueItem[];
  priority: QueueItem[];
  fixedItems: QueueItem[];
  search: string;
  onPrioritize: (code: string) => void;
  onFix: (code: string) => void;
  onBack: (code: string) => void;
  onReopen: (code: string) => void;
}) {
  const q = search.trim().toLowerCase();
  const match = (i: QueueItem) => !q || `${i.title} ${i.evidence} ${i.fix} ${i.code}`.toLowerCase().includes(q);
  const det = detected.filter(match);
  const pri = priority.filter(match);
  const fix = fixedItems.filter(match);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      <Column title="Detected" count={detected.length} empty={det.length === 0}
        emptyText="Nothing waiting. Every detected issue has a plan." bg="#EDF2EF" border="#E0E8E4">
        {det.map(i => (
          <Card key={i.code} item={i}>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => onPrioritize(i.code)} style={btnGhost}>Add to Priority</button>
          </Card>
        ))}
      </Column>
      <Column title="Priority" count={priority.length} empty={pri.length === 0}
        emptyText="Pick the fixes you will ship next from Detected." bg="#FFF6E8" border="#F6DDB4">
        {pri.map(i => (
          <Card key={i.code} item={i}>
            <span style={{ display: 'inline-flex', gap: 8 }}>
              <button type="button" onClick={() => onBack(i.code)} style={btnGhost}>Back</button>
              <button type="button" onClick={() => onFix(i.code)} style={btnSolid}>Mark fixed</button>
            </span>
          </Card>
        ))}
      </Column>
      <Column title="Fixed" count={fixedItems.length} empty={fix.length === 0}
        emptyText="Shipped fixes land here, then re-run the audit to verify." bg="#E5F8EF" border="#BFE9D3">
        {fix.map(i => (
          <Card key={i.code} item={i}>
            <span style={{ color: '#0A5A3A', fontSize: 13, fontWeight: 600 }}>Waiting for re-audit</span>
            <button type="button" onClick={() => onReopen(i.code)} style={btnGhost}>Reopen</button>
          </Card>
        ))}
      </Column>
    </div>
  );
}
