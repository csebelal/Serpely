import { useEffect, useState } from 'react';
import { getSection, updateSection, uploadFile } from '@/lib/api';

function normalizeImgUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '/' + url.replace(/\\/g, '/').replace(/^\/+/, '');
}

interface StatItem { value: string; label: string; }
interface SocialLinks { linkedin: string; twitter: string; facebook: string; }
interface TeamMember { initials: string; name: string; role: string; bg: string; image: string; socials: SocialLinks; }
interface TimelineMilestone { year: string; label: string; event: string; color: string; icon: string; }
interface MissionData { headline: string; body: string; }
interface VisionPillarData { title: string; body: string; color: string; }
interface ValueData { title: string; body: string; color: string; }

interface AboutData {
  stats: StatItem[];
  team: TeamMember[];
  storyParagraphs: string[];
  milestones: TimelineMilestone[];
  mission: MissionData;
  visionHeadline: string;
  visionPillars: VisionPillarData[];
  valuesHeadline: string;
  valuesSubtext: string;
  values: ValueData[];
}

const DEFAULT: AboutData = {
  stats: [
    { value: '2,000+', label: 'Active Teams' },
    { value: '50M+',   label: 'Keywords Tracked' },
    { value: '99.9%',  label: 'Uptime SLA' },
    { value: '24/7',   label: 'Support' },
  ],
  team: [
    { initials: 'AK', name: 'Alex Kim',    role: 'CEO & Co-Founder', bg: '#00C27A', image: '', socials: { linkedin: '#', twitter: '#', facebook: '#' } },
    { initials: 'SR', name: 'Sofia Reyes', role: 'CTO & Co-Founder', bg: '#7c3aed', image: '', socials: { linkedin: '#', twitter: '#', facebook: '#' } },
    { initials: 'MB', name: 'Marcus Bell', role: 'Head of Product',  bg: '#0ea5e9', image: '', socials: { linkedin: '#', twitter: '#', facebook: '#' } },
    { initials: 'LP', name: 'Lena Park',   role: 'Head of Growth',   bg: '#f59e0b', image: '', socials: { linkedin: '#', twitter: '#', facebook: '#' } },
  ],
  storyParagraphs: [
    'Serpely began in 2023 when a team of SEO experts and AI engineers came together with a shared frustration: existing tools were built for the old web — too complex, too expensive, requiring constant manual work.',
    'We envisioned a platform that acts as an intelligent partner — monitoring, analyzing, and optimizing automatically. One that tracks brand visibility not just on Google, but across every AI surface reshaping how people search.',
    "Today, Serpely powers 2,000+ teams worldwide, from solo founders to Fortune 500 companies. We're just getting started.",
  ],
  milestones: [
    { year: '2023',    label: 'Founded',        event: 'Founded in San Francisco by SEO experts and AI engineers frustrated that existing tools were built for the old web.', color: '#00C27A', icon: '🚀' },
    { year: 'Q3 2023', label: 'Beta Launch',    event: 'Launched closed beta with 200 early-access customers. First real-world GEO score data collected across ChatGPT and Google AI Overviews.', color: '#7c3aed', icon: '⚡' },
    { year: 'Q1 2024', label: 'GEO Monitoring', event: 'GEO Monitoring went live — the first AI visibility score on the market. Brands could now see exactly where they appear in AI-generated answers.', color: '#0ea5e9', icon: '🤖' },
    { year: 'Q3 2024', label: '1,000 Teams',    event: 'Crossed 1,000 active teams across 40+ countries. Expanded rank tracking to Perplexity, Gemini, and Grok alongside traditional Google Search.', color: '#f59e0b', icon: '🌍' },
    { year: '2025',    label: 'Agentic SEO',    event: 'Launched the Agentic SEO pipeline — autonomous content optimization running 24/7 without manual effort. Now powering 2,000+ teams worldwide.', color: '#ec4899', icon: '✨' },
  ],
  mission: {
    headline: 'Democratize SEO for the AI-first era',
    body: 'We build intelligent tools that help every business thrive in AI-era search — where SEO is automated, accessible, and effective for everyone, not just enterprises with big budgets.',
  },
  visionHeadline: 'A world where every brand thrives in AI-era search',
  visionPillars: [
    { title: 'AI-Native Search Visibility',    body: 'The future of search is AI-generated answers. Serpely is built from day one to measure and optimize your presence across ChatGPT, Perplexity, Gemini, and every AI surface that matters.',                                                                  color: '#00C27A' },
    { title: 'Autonomous, Not Just Automated', body: "Automation runs tasks. Autonomy makes decisions. Serpely's agentic pipeline doesn't just report problems — it identifies, prioritizes, and resolves them 24/7 without manual intervention.",                                                             color: '#7c3aed' },
    { title: 'Democratize Enterprise SEO',     body: "Fortune 500 teams shouldn't be the only ones with access to world-class SEO intelligence. Serpely makes enterprise-grade tooling accessible to every team, from solo founders to global brands.",                                                        color: '#0ea5e9' },
  ],
  valuesHeadline: 'What drives every decision we make',
  valuesSubtext:  'Six principles shaping how we build, hire, and serve customers.',
  values: [
    { title: 'Customer First',    body: "Every product decision, every feature shipped, every line of support — it all starts with what's best for our customers. Their wins are our wins.",   color: '#00C27A' },
    { title: 'Move Fast',         body: 'The AI-search landscape evolves daily. We ship fast, iterate relentlessly, and stay ahead so our customers always have an edge.',                      color: '#7c3aed' },
    { title: 'Radical Clarity',   body: "No black boxes. No vanity metrics. We show you exactly what's working, what's not, and what to do next — in plain language.",                         color: '#0ea5e9' },
    { title: 'Accessibility',     body: "Great SEO intelligence shouldn't require a six-figure budget. We price and design for real-world teams, not just enterprise procurement cycles.",      color: '#f59e0b' },
    { title: 'Own the Outcome',   body: "We don't ship features — we deliver results. We measure ourselves by the growth our customers achieve, not the complexity of our product.",           color: '#ec4899' },
    { title: 'Honest by Default', body: 'We tell you when rankings drop, when GEO score falls, when something breaks. Honest signal in your inbox is worth more than comfortable silence.',   color: '#10b981' },
  ],
};

const s = {
  page: { padding: '36px 44px', maxWidth: 900 } as React.CSSProperties,
  card: { background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' } as React.CSSProperties,
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties,
  inp: { width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' } as React.CSSProperties,
  ta: { width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' } as React.CSSProperties,
  row: { display: 'flex', gap: 12, marginBottom: 14 } as React.CSSProperties,
  sectionHead: { margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' } as React.CSSProperties,
  btnGreen: { padding: '9px 20px', background: '#00C27A', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  btnGhost: { padding: '7px 14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  btnDanger: { padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({ padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: active ? '#00C27A' : '#f1f5f9', color: active ? '#fff' : '#64748b', transition: 'all 0.15s' }),
  memberCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', marginBottom: 14 } as React.CSSProperties,
  milestoneCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', marginBottom: 12 } as React.CSSProperties,
};

export function AboutEditor() {
  const [data, setData] = useState<AboutData>(DEFAULT);
  const [tab, setTab] = useState<'team' | 'stats' | 'story' | 'timeline' | 'mvv'>('team');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    getSection('about').then(r => {
      const d = r.data.data as Partial<AboutData>;
      setData({
        stats:            d.stats            ?? DEFAULT.stats,
        team:             d.team             ?? DEFAULT.team,
        storyParagraphs:  d.storyParagraphs  ?? DEFAULT.storyParagraphs,
        milestones:       d.milestones       ?? DEFAULT.milestones,
        mission:          (d.mission         ?? DEFAULT.mission)        as MissionData,
        visionHeadline:   (d.visionHeadline  ?? DEFAULT.visionHeadline) as string,
        visionPillars:    (d.visionPillars   ?? DEFAULT.visionPillars)  as VisionPillarData[],
        valuesHeadline:   (d.valuesHeadline  ?? DEFAULT.valuesHeadline) as string,
        valuesSubtext:    (d.valuesSubtext   ?? DEFAULT.valuesSubtext)  as string,
        values:           (d.values          ?? DEFAULT.values)         as ValueData[],
      });
    }).catch(() => {/* use defaults */});
  }, []);

  async function save() {
    setSaving(true);
    const normalized = {
      ...data,
      team: data.team.map(m => ({ ...m, image: normalizeImgUrl(m.image) })),
    };
    await updateSection('about', normalized as unknown as Record<string, unknown>);
    setData(normalized);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  /* ─── helpers ─── */
  function updateTeam(idx: number, patch: Partial<TeamMember>) {
    setData(d => { const t = [...d.team]; t[idx] = { ...t[idx], ...patch }; return { ...d, team: t }; });
  }
  function updateSocial(idx: number, key: keyof SocialLinks, val: string) {
    setData(d => { const t = [...d.team]; t[idx] = { ...t[idx], socials: { ...t[idx].socials, [key]: val } }; return { ...d, team: t }; });
  }
  function addMember() {
    setData(d => ({ ...d, team: [...d.team, { initials: 'XX', name: '', role: '', bg: '#00C27A', image: '', socials: { linkedin: '#', twitter: '#', facebook: '#' } }] }));
  }
  function removeMember(idx: number) {
    setData(d => ({ ...d, team: d.team.filter((_, i) => i !== idx) }));
  }

  function updateStat(idx: number, key: keyof StatItem, val: string) {
    setData(d => { const s = [...d.stats]; s[idx] = { ...s[idx], [key]: val }; return { ...d, stats: s }; });
  }

  function updateStory(idx: number, val: string) {
    setData(d => { const p = [...d.storyParagraphs]; p[idx] = val; return { ...d, storyParagraphs: p }; });
  }

  function updateMilestone(idx: number, patch: Partial<TimelineMilestone>) {
    setData(d => { const m = [...d.milestones]; m[idx] = { ...m[idx], ...patch }; return { ...d, milestones: m }; });
  }
  function addMilestone() {
    setData(d => ({ ...d, milestones: [...d.milestones, { year: '', label: '', event: '', color: '#00C27A', icon: '🔥' }] }));
  }
  function removeMilestone(idx: number) {
    setData(d => ({ ...d, milestones: d.milestones.filter((_, i) => i !== idx) }));
  }

  function updatePillar(idx: number, patch: Partial<VisionPillarData>) {
    setData(d => { const p = [...d.visionPillars]; p[idx] = { ...p[idx], ...patch }; return { ...d, visionPillars: p }; });
  }
  function addPillar() {
    setData(d => ({ ...d, visionPillars: [...d.visionPillars, { title: '', body: '', color: '#00C27A' }] }));
  }
  function removePillar(idx: number) {
    setData(d => ({ ...d, visionPillars: d.visionPillars.filter((_, i) => i !== idx) }));
  }

  function updateValue(idx: number, patch: Partial<ValueData>) {
    setData(d => { const v = [...d.values]; v[idx] = { ...v[idx], ...patch }; return { ...d, values: v }; });
  }
  function addValue() {
    setData(d => ({ ...d, values: [...d.values, { title: '', body: '', color: '#00C27A' }] }));
  }
  function removeValue(idx: number) {
    setData(d => ({ ...d, values: d.values.filter((_, i) => i !== idx) }));
  }

  async function handleImageUpload(memberIdx: number, file: File) {
    const key = `member-${memberIdx}`;
    setUploading(key);
    try {
      const { data: res } = await uploadFile(file);
      updateTeam(memberIdx, { image: res.url });
    } catch { /* ignore */ }
    setUploading(null);
  }

  return (
    <div style={s.page}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>About Page Editor</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}>Edit team members, stats, story, and timeline shown on the About page</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {(['team', 'stats', 'story', 'timeline', 'mvv'] as const).map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'team' ? '👥 Team' : t === 'stats' ? '📊 Stats' : t === 'story' ? '📖 Story' : t === 'timeline' ? '📅 Timeline' : '🎯 Mission · Vision · Values'}
          </button>
        ))}
      </div>

      {/* ── TEAM ── */}
      {tab === 'team' && (
        <div style={s.card}>
          <h2 style={s.sectionHead}>Leadership / Team Members</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>Name, role, accent color, photo URL, and social links for each team member.</p>

          {data.team.map((m, i) => (
            <div key={i} style={s.memberCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff' }}>
                    {m.initials || '?'}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{m.name || 'New Member'}</span>
                </div>
                <button style={s.btnDanger} onClick={() => removeMember(i)}>Remove</button>
              </div>

              {/* Row 1: Name + Initials + Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={s.label}>Full Name</label>
                  <input style={s.inp} value={m.name} onChange={e => updateTeam(i, { name: e.target.value })} placeholder="Alex Kim" />
                </div>
                <div>
                  <label style={s.label}>Initials</label>
                  <input style={s.inp} value={m.initials} maxLength={2} onChange={e => updateTeam(i, { initials: e.target.value.toUpperCase() })} placeholder="AK" />
                </div>
                <div>
                  <label style={s.label}>Role / Title</label>
                  <input style={s.inp} value={m.role} onChange={e => updateTeam(i, { role: e.target.value })} placeholder="CEO & Co-Founder" />
                </div>
              </div>

              {/* Row 2: Color + Image */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
                <div>
                  <label style={s.label}>Accent Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={m.bg} onChange={e => updateTeam(i, { bg: e.target.value })}
                      style={{ width: 40, height: 36, borderRadius: 8, border: 'none', padding: 2, cursor: 'pointer', background: 'none' }} />
                    <input style={{ ...s.inp, flex: 1 }} value={m.bg} onChange={e => updateTeam(i, { bg: e.target.value })} placeholder="#00C27A" />
                  </div>
                </div>
                <div>
                  <label style={s.label}>Photo URL</label>
                  <input style={s.inp} value={m.image} onChange={e => updateTeam(i, { image: e.target.value })} placeholder="https://... or /uploads/photo.jpg" />
                </div>
                <div>
                  <label style={{ ...s.label, visibility: 'hidden' }}>Upload</label>
                  <label style={{ ...s.btnGhost, display: 'inline-block', cursor: 'pointer' }}>
                    {uploading === `member-${i}` ? 'Uploading…' : '⬆ Upload'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) handleImageUpload(i, e.target.files[0]); }} />
                  </label>
                </div>
              </div>

              {/* Social links */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                <label style={{ ...s.label, marginBottom: 10 }}>Social Links</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ ...s.label, color: '#0077B5' }}>🔗 LinkedIn URL</label>
                    <input style={s.inp} value={m.socials.linkedin} onChange={e => updateSocial(i, 'linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div>
                    <label style={{ ...s.label, color: '#1d9bf0' }}>𝕏 Twitter / X URL</label>
                    <input style={s.inp} value={m.socials.twitter} onChange={e => updateSocial(i, 'twitter', e.target.value)} placeholder="https://x.com/..." />
                  </div>
                  <div>
                    <label style={{ ...s.label, color: '#1877F2' }}>𝒇 Facebook URL</label>
                    <input style={s.inp} value={m.socials.facebook} onChange={e => updateSocial(i, 'facebook', e.target.value)} placeholder="https://facebook.com/..." />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button style={s.btnGhost} onClick={addMember}>+ Add Team Member</button>
        </div>
      )}

      {/* ── STATS ── */}
      {tab === 'stats' && (
        <div style={s.card}>
          <h2 style={s.sectionHead}>Stats Strip</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>The 4 numbers shown below the hero section.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {data.stats.map((st, i) => (
              <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={s.label}>Value</label>
                  <input style={s.inp} value={st.value} onChange={e => updateStat(i, 'value', e.target.value)} placeholder="2,000+" />
                </div>
                <div>
                  <label style={s.label}>Label</label>
                  <input style={s.inp} value={st.label} onChange={e => updateStat(i, 'label', e.target.value)} placeholder="Active Teams" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STORY ── */}
      {tab === 'story' && (
        <div style={s.card}>
          <h2 style={s.sectionHead}>Our Story</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>3 paragraphs shown in the "Why we built Serpely" section.</p>
          {data.storyParagraphs.map((p, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <label style={s.label}>Paragraph {i + 1}</label>
              <textarea style={{ ...s.ta, minHeight: 90 }} value={p} onChange={e => updateStory(i, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {/* ── TIMELINE ── */}
      {tab === 'timeline' && (
        <div style={s.card}>
          <h2 style={s.sectionHead}>Timeline Milestones</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>Events shown in the alternating timeline section.</p>

          {data.milestones.map((m, i) => (
            <div key={i} style={s.milestoneCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: m.color }}>Milestone {i + 1}</span>
                <button style={s.btnDanger} onClick={() => removeMilestone(i)}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 60px 1fr 100px', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={s.label}>Year</label>
                  <input style={s.inp} value={m.year} onChange={e => updateMilestone(i, { year: e.target.value })} placeholder="Q1 2024" />
                </div>
                <div>
                  <label style={s.label}>Icon</label>
                  <input style={s.inp} value={m.icon} onChange={e => updateMilestone(i, { icon: e.target.value })} placeholder="🚀" />
                </div>
                <div>
                  <label style={s.label}>Label</label>
                  <input style={s.inp} value={m.label} onChange={e => updateMilestone(i, { label: e.target.value })} placeholder="Beta Launch" />
                </div>
                <div>
                  <label style={s.label}>Color</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="color" value={m.color} onChange={e => updateMilestone(i, { color: e.target.value })}
                      style={{ width: 36, height: 34, borderRadius: 6, border: 'none', padding: 2, cursor: 'pointer' }} />
                    <input style={{ ...s.inp, flex: 1 }} value={m.color} onChange={e => updateMilestone(i, { color: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <label style={s.label}>Event Description</label>
                <textarea style={{ ...s.ta, minHeight: 70 }} value={m.event} onChange={e => updateMilestone(i, { event: e.target.value })} />
              </div>
            </div>
          ))}

          <button style={s.btnGhost} onClick={addMilestone}>+ Add Milestone</button>
        </div>
      )}

      {/* ── MVV ── */}
      {tab === 'mvv' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Mission */}
          <div style={s.card}>
            <h2 style={s.sectionHead}>Our Mission</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>Headline and body text shown in the dark mission card.</p>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Headline</label>
              <input style={s.inp} value={data.mission.headline}
                onChange={e => setData(d => ({ ...d, mission: { ...d.mission, headline: e.target.value } }))}
                placeholder="Democratize SEO for the AI-first era" />
            </div>
            <div>
              <label style={s.label}>Body</label>
              <textarea style={{ ...s.ta, minHeight: 90 }} value={data.mission.body}
                onChange={e => setData(d => ({ ...d, mission: { ...d.mission, body: e.target.value } }))} />
            </div>
          </div>

          {/* Vision */}
          <div style={s.card}>
            <h2 style={s.sectionHead}>Our Vision</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>Section headline and the 3 pillar cards. Icons are fixed; title, body, and color are editable.</p>
            <div style={{ marginBottom: 18 }}>
              <label style={s.label}>Section Headline</label>
              <input style={s.inp} value={data.visionHeadline}
                onChange={e => setData(d => ({ ...d, visionHeadline: e.target.value }))}
                placeholder="A world where every brand thrives in AI-era search" />
            </div>
            {data.visionPillars.map((p, i) => (
              <div key={i} style={{ ...s.milestoneCard, borderLeft: `3px solid ${p.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: p.color }}>Pillar {String(i + 1).padStart(2, '0')}</span>
                  <button style={s.btnDanger} onClick={() => removePillar(i)}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={s.label}>Title</label>
                    <input style={s.inp} value={p.title} onChange={e => updatePillar(i, { title: e.target.value })} placeholder="AI-Native Search Visibility" />
                  </div>
                  <div>
                    <label style={s.label}>Color</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="color" value={p.color} onChange={e => updatePillar(i, { color: e.target.value })}
                        style={{ width: 36, height: 34, borderRadius: 6, border: 'none', padding: 2, cursor: 'pointer' }} />
                      <input style={{ ...s.inp, flex: 1 }} value={p.color} onChange={e => updatePillar(i, { color: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={s.label}>Body</label>
                  <textarea style={{ ...s.ta, minHeight: 70 }} value={p.body} onChange={e => updatePillar(i, { body: e.target.value })} />
                </div>
              </div>
            ))}
            <button style={s.btnGhost} onClick={addPillar}>+ Add Pillar</button>
          </div>

          {/* Values */}
          <div style={s.card}>
            <h2 style={s.sectionHead}>Our Values</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>Section headline, subtext, and the value cards grid.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={s.label}>Section Headline</label>
                <input style={s.inp} value={data.valuesHeadline}
                  onChange={e => setData(d => ({ ...d, valuesHeadline: e.target.value }))}
                  placeholder="What drives every decision we make" />
              </div>
              <div>
                <label style={s.label}>Section Subtext</label>
                <input style={s.inp} value={data.valuesSubtext}
                  onChange={e => setData(d => ({ ...d, valuesSubtext: e.target.value }))}
                  placeholder="Six principles shaping how we build..." />
              </div>
            </div>
            {data.values.map((v, i) => (
              <div key={i} style={{ ...s.milestoneCard, borderLeft: `3px solid ${v.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: v.color }}>Value {String(i + 1).padStart(2, '0')}</span>
                  <button style={s.btnDanger} onClick={() => removeValue(i)}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={s.label}>Title</label>
                    <input style={s.inp} value={v.title} onChange={e => updateValue(i, { title: e.target.value })} placeholder="Customer First" />
                  </div>
                  <div>
                    <label style={s.label}>Color</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="color" value={v.color} onChange={e => updateValue(i, { color: e.target.value })}
                        style={{ width: 36, height: 34, borderRadius: 6, border: 'none', padding: 2, cursor: 'pointer' }} />
                      <input style={{ ...s.inp, flex: 1 }} value={v.color} onChange={e => updateValue(i, { color: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={s.label}>Body</label>
                  <textarea style={{ ...s.ta, minHeight: 70 }} value={v.body} onChange={e => updateValue(i, { body: e.target.value })} />
                </div>
              </div>
            ))}
            <button style={s.btnGhost} onClick={addValue}>+ Add Value</button>
          </div>

        </div>
      )}

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <button style={s.btnGreen} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : '✓ Save Changes'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#00C27A', fontWeight: 600 }}>Saved!</span>}
      </div>
    </div>
  );
}
