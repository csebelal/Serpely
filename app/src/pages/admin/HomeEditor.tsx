import { useEffect, useState } from 'react';
import { getSection, updateSection, uploadFile } from '@/lib/api';

// ─── Shared styles (mirrors AboutEditor) ────────────────────────────────────
const s = {
  page: { padding: '32px 40px', maxWidth: 960 } as React.CSSProperties,
  card: { background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' } as React.CSSProperties,
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' } as React.CSSProperties,
  inp: { width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box' as const, fontFamily: 'inherit' } as React.CSSProperties,
  ta: { width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box' as const, fontFamily: 'inherit', resize: 'vertical' as const } as React.CSSProperties,
  sectionHead: { margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em' } as React.CSSProperties,
  btnGreen: { padding: '9px 22px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  btnGhost: { padding: '7px 14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  btnDanger: { padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({ padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: active ? '#00C27A' : '#f1f5f9', color: active ? '#fff' : '#64748b', transition: 'all 0.15s' }),
  subCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', marginBottom: 12 } as React.CSSProperties,
  row: { display: 'flex', gap: 12, marginBottom: 14 } as React.CSSProperties,
};

type TabId = 'hero' | 'problem' | 'hiw' | 'features' | 'audience' | 'cta';

interface StepData { num: string; title: string; desc: string; tags: string[]; }
interface CoreCard { title: string; desc: string; desc2?: string; }
interface AudienceCardData { label: string; title: string; items: string[]; cta: string; ctaHref: string; }

// ─── Per-section save state helper ──────────────────────────────────────────
function useSaveState() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  async function doSave(fn: () => Promise<void>) {
    setSaving(true);
    try { await fn(); } catch { /* ignore */ }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }
  return { saving, saved, doSave };
}

function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving} style={s.btnGreen}>
      {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
    </button>
  );
}

// ─── Hero Tab ───────────────────────────────────────────────────────────────
function HeroTab() {
  const [badge, setBadge] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [headline, setHeadline] = useState<string[]>(['', '', '']);
  const [subheadline, setSubheadline] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [cta1Text, setCta1Text] = useState('');
  const [cta1Href, setCta1Href] = useState('');
  const [cta1Sub, setCta1Sub] = useState('');
  const [cta2Text, setCta2Text] = useState('');
  const [cta2Href, setCta2Href] = useState('');
  const [cta2Sub, setCta2Sub] = useState('');
  const [alert1Title, setAlert1Title] = useState('');
  const [alert1Sub, setAlert1Sub] = useState('');
  const [alert2Title, setAlert2Title] = useState('');
  const [alert2Sub, setAlert2Sub] = useState('');
  const { saving, saved, doSave } = useSaveState();

  useEffect(() => {
    getSection('hero').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.badge === 'string') setBadge(d.badge);
      if (typeof d.heroImage === 'string') setHeroImage(d.heroImage);
      if (Array.isArray(d.headline)) setHeadline(d.headline as string[]);
      if (typeof d.subheadline === 'string') setSubheadline(d.subheadline);
      if (typeof d.announcementText === 'string') setAnnouncementText(d.announcementText);
      if (typeof d.cta1Text === 'string') setCta1Text(d.cta1Text);
      if (typeof d.cta1Href === 'string') setCta1Href(d.cta1Href);
      if (typeof d.cta1Sub === 'string') setCta1Sub(d.cta1Sub);
      if (typeof d.cta2Text === 'string') setCta2Text(d.cta2Text);
      if (typeof d.cta2Href === 'string') setCta2Href(d.cta2Href);
      if (typeof d.cta2Sub === 'string') setCta2Sub(d.cta2Sub);
      if (typeof d.alert1Title === 'string') setAlert1Title(d.alert1Title);
      if (typeof d.alert1Sub === 'string') setAlert1Sub(d.alert1Sub);
      if (typeof d.alert2Title === 'string') setAlert2Title(d.alert2Title);
      if (typeof d.alert2Sub === 'string') setAlert2Sub(d.alert2Sub);
    }).catch(() => {});
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const r = await uploadFile(file); setHeroImage(r.data.url); } finally { setUploading(false); }
  }

  function handleSave() {
    doSave(() => updateSection('hero', {
      badge, heroImage, headline, subheadline, announcementText,
      cta1Text, cta1Href, cta1Sub,
      cta2Text, cta2Href, cta2Sub,
      alert1Title, alert1Sub, alert2Title, alert2Sub,
    }));
  }

  function setHeadlineLine(i: number, val: string) {
    setHeadline(prev => { const next = [...prev]; next[i] = val; return next; });
  }

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.sectionHead}>Hero Right-Side Image</h2>
        {heroImage && (
          <img src={heroImage} alt="Hero preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 10, border: '1px solid #e2e8f0' }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f1f5f9', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            {uploading ? 'Uploading…' : heroImage ? 'Replace Image' : 'Upload Image'}
          </label>
          {heroImage && (
            <button onClick={() => setHeroImage('')} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
          )}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>Replaces the dashboard mockup on the right side of the hero.</p>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>Badge & Announcement</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Badge Text</label>
          <input style={s.inp} value={badge} onChange={e => setBadge(e.target.value)} placeholder="Public Beta Now Available" />
        </div>
        <div>
          <label style={s.label}>Announcement Text</label>
          <input style={s.inp} value={announcementText} onChange={e => setAnnouncementText(e.target.value)} placeholder="Announcement bar text" />
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>Headline & Subheadline</h2>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ marginBottom: 14 }}>
            <label style={s.label}>Headline Line {i + 1}</label>
            <input style={s.inp} value={headline[i] ?? ''} onChange={e => setHeadlineLine(i, e.target.value)} placeholder={`Line ${i + 1}`} />
          </div>
        ))}
        <div>
          <label style={s.label}>Subheadline</label>
          <textarea style={{ ...s.ta, minHeight: 70 }} value={subheadline} onChange={e => setSubheadline(e.target.value)} />
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>CTAs</h2>
        <div style={{ ...s.subCard, marginBottom: 12 }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Primary CTA</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={s.label}>Button Text</label>
              <input style={s.inp} value={cta1Text} onChange={e => setCta1Text(e.target.value)} placeholder="Start Free Trial" />
            </div>
            <div>
              <label style={s.label}>Button Href</label>
              <input style={s.inp} value={cta1Href} onChange={e => setCta1Href(e.target.value)} placeholder="#" />
            </div>
          </div>
          <div>
            <label style={s.label}>Sub-text</label>
            <input style={s.inp} value={cta1Sub} onChange={e => setCta1Sub(e.target.value)} placeholder="No credit card required" />
          </div>
        </div>
        <div style={s.subCard}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Secondary CTA</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={s.label}>Button Text</label>
              <input style={s.inp} value={cta2Text} onChange={e => setCta2Text(e.target.value)} placeholder="Book a Demo" />
            </div>
            <div>
              <label style={s.label}>Button Href</label>
              <input style={s.inp} value={cta2Href} onChange={e => setCta2Href(e.target.value)} placeholder="#" />
            </div>
          </div>
          <div>
            <label style={s.label}>Sub-text</label>
            <input style={s.inp} value={cta2Sub} onChange={e => setCta2Sub(e.target.value)} placeholder="No commitment" />
          </div>
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>Alert Cards</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Alert 1</p>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Title</label>
              <input style={s.inp} value={alert1Title} onChange={e => setAlert1Title(e.target.value)} placeholder="Rank Drop Detected" />
            </div>
            <div>
              <label style={s.label}>Sub-text</label>
              <input style={s.inp} value={alert1Sub} onChange={e => setAlert1Sub(e.target.value)} placeholder="-12 positions" />
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Alert 2</p>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Title</label>
              <input style={s.inp} value={alert2Title} onChange={e => setAlert2Title(e.target.value)} placeholder="GEO Score Updated" />
            </div>
            <div>
              <label style={s.label}>Sub-text</label>
              <input style={s.inp} value={alert2Sub} onChange={e => setAlert2Sub(e.target.value)} placeholder="+8 this week" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Problem Tab ─────────────────────────────────────────────────────────────
function ProblemTab() {
  const [pillText, setPillText] = useState('AI Search Visibility Gap');
  const [headline1, setHeadline1] = useState('Stop Losing Traffic to');
  const [headline2, setHeadline2] = useState('AI Search');
  const [subtext, setSubtext] = useState('Serpely powers Agentic SEO and Generative Engine Optimization so you stay visible across Google and LLM-driven results.');
  const [problemLabel, setProblemLabel] = useState("What's Costing Your Rankings");
  const [problemItems, setProblemItems] = useState<string[]>([
    "Your organic traffic dropped after AI Overviews launched and you still don't know which keywords triggered it or why",
    "Your competitors appear when people ask ChatGPT or Perplexity about your category. Your brand doesn't.",
    "You're publishing content but have no idea if AI crawlers are indexing it or ignoring it entirely",
    "Your last SEO audit is already outdated. You don't know what broke since then",
  ]);
  const [statNum, setStatNum] = useState('40%');
  const [statLabel, setStatLabel] = useState('of searches');
  const [statDesc, setStatDesc] = useState("Now get answered by AI without a click. Traditional SEO tools can't track that.");
  const [solutionLabel, setSolutionLabel] = useState('The Serpely Agentic SEO System');
  const [solutionHeadline, setSolutionHeadline] = useState('Four engines, one\nagentic loop.');
  const [solutionBody, setSolutionBody] = useState('Continuous Agentic SEO workflows built for measurable search growth. From keyword intelligence to LLM-driven visibility, one unified SEO operating system.');
  const [engineTitles, setEngineTitles] = useState<string[]>(['Daily AI Audit', 'AI Citation Monitor', 'GEO Score', 'Content Prioritization']);
  const [engineDescs, setEngineDescs] = useState<string[]>([
    'On-page, off-page, and technical SEO audited every day. Wake up to a prioritized fix list.',
    'Tracks citations across ChatGPT, Perplexity, Gemini, and Google AI Overviews.',
    'Every page scored 0–100 for AI visibility and citation eligibility. Updated continuously.',
    'Identifies pages to refresh first, scored by traffic decay, GEO Score, and keyword movement.',
  ]);
  const { saving, saved, doSave } = useSaveState();

  useEffect(() => {
    getSection('problem-solution').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.pillText === 'string') setPillText(d.pillText);
      if (typeof d.headline1 === 'string') setHeadline1(d.headline1);
      if (typeof d.headline2 === 'string') setHeadline2(d.headline2);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (typeof d.problemLabel === 'string') setProblemLabel(d.problemLabel);
      if (Array.isArray(d.problemItems)) setProblemItems(d.problemItems as string[]);
      if (typeof d.statNum === 'string') setStatNum(d.statNum);
      if (typeof d.statLabel === 'string') setStatLabel(d.statLabel);
      if (typeof d.statDesc === 'string') setStatDesc(d.statDesc);
      if (typeof d.solutionLabel === 'string') setSolutionLabel(d.solutionLabel);
      if (typeof d.solutionHeadline === 'string') setSolutionHeadline(d.solutionHeadline);
      if (typeof d.solutionBody === 'string') setSolutionBody(d.solutionBody);
      if (Array.isArray(d.engineTitles)) setEngineTitles(d.engineTitles as string[]);
      if (Array.isArray(d.engineDescs)) setEngineDescs(d.engineDescs as string[]);
    }).catch(() => {});
  }, []);

  function handleSave() {
    doSave(() => updateSection('problem-solution', {
      pillText, headline1, headline2, subtext,
      problemLabel, problemItems,
      statNum, statLabel, statDesc,
      solutionLabel, solutionHeadline, solutionBody,
      engineTitles, engineDescs,
    }));
  }

  function updateProblemItem(i: number, val: string) {
    setProblemItems(prev => { const next = [...prev]; next[i] = val; return next; });
  }
  function removeProblemItem(i: number) {
    setProblemItems(prev => prev.filter((_, idx) => idx !== i));
  }
  function addProblemItem() {
    setProblemItems(prev => [...prev, '']);
  }

  function updateEngineTitle(i: number, val: string) {
    setEngineTitles(prev => { const next = [...prev]; next[i] = val; return next; });
  }
  function updateEngineDesc(i: number, val: string) {
    setEngineDescs(prev => { const next = [...prev]; next[i] = val; return next; });
  }

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.sectionHead}>Section Header</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Pill Text</label>
          <input style={s.inp} value={pillText} onChange={e => setPillText(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Headline Line 1</label>
            <input style={s.inp} value={headline1} onChange={e => setHeadline1(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Headline Line 2 (gradient)</label>
            <input style={s.inp} value={headline2} onChange={e => setHeadline2(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={s.label}>Subtext</label>
          <textarea style={{ ...s.ta, minHeight: 70 }} value={subtext} onChange={e => setSubtext(e.target.value)} />
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>Problem Side</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Label</label>
          <input style={s.inp} value={problemLabel} onChange={e => setProblemLabel(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Problem Items</label>
          {problemItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <textarea
                style={{ ...s.ta, flex: 1, minHeight: 60 }}
                value={item}
                onChange={e => updateProblemItem(i, e.target.value)}
              />
              <button style={s.btnDanger} onClick={() => removeProblemItem(i)}>Remove</button>
            </div>
          ))}
          <button style={s.btnGhost} onClick={addProblemItem}>+ Add Problem</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Stat Number</label>
            <input style={s.inp} value={statNum} onChange={e => setStatNum(e.target.value)} placeholder="40%" />
          </div>
          <div>
            <label style={s.label}>Stat Label</label>
            <input style={s.inp} value={statLabel} onChange={e => setStatLabel(e.target.value)} placeholder="of searches" />
          </div>
        </div>
        <div>
          <label style={s.label}>Stat Description</label>
          <textarea style={{ ...s.ta, minHeight: 60 }} value={statDesc} onChange={e => setStatDesc(e.target.value)} />
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>Solution Side</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Section Label</label>
          <input style={s.inp} value={solutionLabel} onChange={e => setSolutionLabel(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Headline (use \n for line break)</label>
          <input style={s.inp} value={solutionHeadline} onChange={e => setSolutionHeadline(e.target.value)} />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={s.label}>Body Text</label>
          <textarea style={{ ...s.ta, minHeight: 80 }} value={solutionBody} onChange={e => setSolutionBody(e.target.value)} />
        </div>
        <h2 style={s.sectionHead}>Engines (4 items)</h2>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ ...s.subCard }}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Engine {i + 1}</p>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Title</label>
              <input style={s.inp} value={engineTitles[i] ?? ''} onChange={e => updateEngineTitle(i, e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Description</label>
              <textarea style={{ ...s.ta, minHeight: 60 }} value={engineDescs[i] ?? ''} onChange={e => updateEngineDesc(i, e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── How It Works Tab ────────────────────────────────────────────────────────
function HowItWorksTab() {
  const [pillText, setPillText] = useState('How It Works');
  const [headline, setHeadline] = useState('A Continuous SEO\nWorkflow');
  const [subtext, setSubtext] = useState('Four stages that run automatically, surface the right actions, and help you ship improvements faster.');
  const [loopCardTitle, setLoopCardTitle] = useState('Closed Loop System');
  const [loopCardBody, setLoopCardBody] = useState('After each cycle, the system learns. Outputs from Improve feed back into Monitor, refining what gets prioritized next.');
  const [steps, setSteps] = useState<StepData[]>([
    { num: '1', title: 'Monitor', desc: 'Track keyword rankings, Core Web Vitals, backlinks, and AI citation signals across Google and LLM search engines, all in one dashboard.', tags: ['Rank Tracking', 'GEO Signals'] },
    { num: '2', title: 'Analyze', desc: 'Identify keyword gaps, content decay, technical errors, and competitor movements. Understand exactly why rankings shift before they hurt you.', tags: ['Gap Analysis', 'Insights'] },
    { num: '3', title: 'Prioritize', desc: "AI-powered scoring tells you which pages need attention most. Not a firehose of data — a clear, ranked action queue your team can actually act on.", tags: ['Action Queue', 'AI Scoring'] },
    { num: '4', title: 'Improve', desc: 'Apply AI-suggested fixes, track the impact, and generate reports that prove SEO value. Then the loop restarts, automatically.', tags: ['Auto Reports', 'Loop'] },
  ]);
  const { saving, saved, doSave } = useSaveState();

  useEffect(() => {
    getSection('how-it-works').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.pillText === 'string') setPillText(d.pillText);
      if (typeof d.headline === 'string') setHeadline(d.headline);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (typeof d.loopCardTitle === 'string') setLoopCardTitle(d.loopCardTitle);
      if (typeof d.loopCardBody === 'string') setLoopCardBody(d.loopCardBody);
      if (Array.isArray(d.steps)) setSteps(d.steps as StepData[]);
    }).catch(() => {});
  }, []);

  function handleSave() {
    doSave(() => updateSection('how-it-works', {
      pillText, headline, subtext, loopCardTitle, loopCardBody, steps,
    }));
  }

  function updateStep(i: number, patch: Partial<StepData>) {
    setSteps(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch }; return next; });
  }

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.sectionHead}>Section Header</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Pill Text</label>
          <input style={s.inp} value={pillText} onChange={e => setPillText(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Headline (use \n for line break — last line becomes gradient)</label>
          <input style={s.inp} value={headline} onChange={e => setHeadline(e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Subtext</label>
          <textarea style={{ ...s.ta, minHeight: 70 }} value={subtext} onChange={e => setSubtext(e.target.value)} />
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>Loop Card</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Title</label>
          <input style={s.inp} value={loopCardTitle} onChange={e => setLoopCardTitle(e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Body</label>
          <textarea style={{ ...s.ta, minHeight: 70 }} value={loopCardBody} onChange={e => setLoopCardBody(e.target.value)} />
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>Steps (4 items — last step always uses accent style)</h2>
        {steps.map((step, i) => (
          <div key={i} style={{ ...s.subCard }}>
            <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Step {i + 1}{i === steps.length - 1 ? ' (Accent)' : ''}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={s.label}>Number</label>
                <input style={s.inp} value={step.num} onChange={e => updateStep(i, { num: e.target.value })} placeholder="1" />
              </div>
              <div>
                <label style={s.label}>Title</label>
                <input style={s.inp} value={step.title} onChange={e => updateStep(i, { title: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Description</label>
              <textarea style={{ ...s.ta, minHeight: 70 }} value={step.desc} onChange={e => updateStep(i, { desc: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>Tags (comma-separated)</label>
              <input
                style={s.inp}
                value={step.tags.join(', ')}
                onChange={e => updateStep(i, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                placeholder="Rank Tracking, GEO Signals"
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Core Features Tab ───────────────────────────────────────────────────────
function CoreFeaturesTab() {
  const [pillText, setPillText] = useState('Serpely Features');
  const [headline1, setHeadline1] = useState('Everything You Need.');
  const [headline2, setHeadline2] = useState("Nothing You Don't.");
  const [subtext, setSubtext] = useState('Eight powerful modules for modern SEO. One unified platform that connects monitoring, optimization, and reporting.');
  const [cards, setCards] = useState<CoreCard[]>([
    { title: 'GEO Score + Keyword Intelligence', desc: 'Discover keyword gaps, search intent signals, and competitor ranking opportunities. Build structured topic clusters for scalable SEO and GEO growth.', desc2: 'Every page gets a GEO Score from 0 to 100 showing how likely it is to appear in AI-generated answers.' },
    { title: 'AI Citation Monitor', desc: 'Track whether ChatGPT, Perplexity, Gemini, and Google AI Overviews are citing your content. Get alerted when citation frequency changes.' },
    { title: 'Hallucination Alerts', desc: 'Know when AI engines return inaccurate information about your brand or content. Severity scores and fix recommendations included.' },
    { title: 'Content Prioritization', desc: 'Serpely scans every page daily and ranks which ones need a content refresh for AI optimization. A specific, scored action queue based on traffic decay, GEO Score, and keyword movement.' },
    { title: 'Daily Rank Tracking', desc: 'Track keyword rankings across Google and AI-driven search results including LLM answer engines. Real-time visibility shifts with intelligent alerts.' },
    { title: 'Technical Site Audit', desc: 'Continuously audit Core Web Vitals, crawl issues, indexing gaps, and schema errors. Prioritize fixes that directly impact AI visibility.' },
    { title: 'Backlink Monitoring', desc: 'Track new and lost backlinks with quality and authority scoring. Protect domain strength and uncover link-building opportunities.' },
    { title: 'White-Label Reporting', desc: 'Generate SEO, GEO, and LLM visibility reports instantly. Share client-ready dashboards under your brand.' },
  ]);
  const { saving, saved, doSave } = useSaveState();

  useEffect(() => {
    getSection('core-features').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.pillText === 'string') setPillText(d.pillText);
      if (typeof d.headline1 === 'string') setHeadline1(d.headline1);
      if (typeof d.headline2 === 'string') setHeadline2(d.headline2);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (Array.isArray(d.cards)) setCards(d.cards as CoreCard[]);
    }).catch(() => {});
  }, []);

  function handleSave() {
    doSave(() => updateSection('core-features', { pillText, headline1, headline2, subtext, cards }));
  }

  function updateCard(i: number, patch: Partial<CoreCard>) {
    setCards(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch }; return next; });
  }

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.sectionHead}>Section Header</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Pill Text</label>
          <input style={s.inp} value={pillText} onChange={e => setPillText(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Headline Line 1</label>
            <input style={s.inp} value={headline1} onChange={e => setHeadline1(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Headline Line 2 (gradient)</label>
            <input style={s.inp} value={headline2} onChange={e => setHeadline2(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={s.label}>Subtext</label>
          <textarea style={{ ...s.ta, minHeight: 70 }} value={subtext} onChange={e => setSubtext(e.target.value)} />
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>Feature Cards (8 items)</h2>
        {cards.map((card, i) => (
          <div key={i} style={{ ...s.subCard }}>
            <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Card {i + 1}</p>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Title</label>
              <input style={s.inp} value={card.title} onChange={e => updateCard(i, { title: e.target.value })} />
            </div>
            <div style={{ marginBottom: i === 0 ? 10 : 0 }}>
              <label style={s.label}>Description</label>
              <textarea style={{ ...s.ta, minHeight: 70 }} value={card.desc} onChange={e => updateCard(i, { desc: e.target.value })} />
            </div>
            {i === 0 && (
              <div>
                <label style={s.label}>Description 2 (accent highlight line)</label>
                <textarea style={{ ...s.ta, minHeight: 60 }} value={card.desc2 ?? ''} onChange={e => updateCard(i, { desc2: e.target.value })} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Target Audience Tab ─────────────────────────────────────────────────────
function AudienceTab() {
  const [pillText, setPillText] = useState('Solutions');
  const [rotatingLabel, setRotatingLabel] = useState('Built for your workflow');
  const [words, setWords] = useState('Modern SEO Teams, Growing Agencies, AI-First Startups, Enterprise Brands');
  const [headline1, setHeadline1] = useState('Serpely is built for');
  const [subtext, setSubtext] = useState('Tailored Agentic SEO workflows for agencies, startups, and enterprise teams.');
  const [cards, setCards] = useState<AudienceCardData[]>([
    { label: 'For Agencies', title: 'Scale client SEO\nwithout the overhead.', items: ['Multi-client AI SEO workspaces', 'White-label GEO & LLM reporting', 'Bulk keyword rank tracking', 'AI visibility dashboards per client', 'Automated SEO reporting software'], cta: 'Get started for agencies →', ctaHref: '#' },
    { label: 'For Startups', title: 'Grow SEO like a\nteam 10x your size.', items: ['AI SEO agent for fast growth', 'Automated keyword gap analysis', 'Real-time AI search tracking', 'AI-powered content optimization', 'Scalable SEO automation platform'], cta: 'Get started for startups →', ctaHref: '#' },
    { label: 'For Enterprise', title: 'Enterprise-grade SEO\nat every scale.', items: ['Granular SEO roles and permissions', 'Enterprise AI SEO platform', 'Technical SEO audit & compliance logs', 'Generative Engine Optimization (GEO) tools', 'LLM SEO monitoring & API integration'], cta: 'Talk to enterprise sales →', ctaHref: '#' },
  ]);
  const { saving, saved, doSave } = useSaveState();

  useEffect(() => {
    getSection('target-audience').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.pillText === 'string') setPillText(d.pillText);
      if (typeof d.rotatingLabel === 'string') setRotatingLabel(d.rotatingLabel);
      if (Array.isArray(d.words)) setWords((d.words as string[]).join(', '));
      if (typeof d.headline1 === 'string') setHeadline1(d.headline1);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (Array.isArray(d.cards)) setCards(d.cards as AudienceCardData[]);
    }).catch(() => {});
  }, []);

  function handleSave() {
    const wordsArray = words.split(',').map(w => w.trim()).filter(Boolean);
    doSave(() => updateSection('target-audience', {
      pillText, rotatingLabel, words: wordsArray, headline1, subtext, cards,
    }));
  }

  function updateCard(i: number, patch: Partial<AudienceCardData>) {
    setCards(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch }; return next; });
  }

  function updateCardItem(cardIdx: number, itemIdx: number, val: string) {
    setCards(prev => {
      const next = [...prev];
      const items = [...next[cardIdx].items];
      items[itemIdx] = val;
      next[cardIdx] = { ...next[cardIdx], items };
      return next;
    });
  }
  function removeCardItem(cardIdx: number, itemIdx: number) {
    setCards(prev => {
      const next = [...prev];
      next[cardIdx] = { ...next[cardIdx], items: next[cardIdx].items.filter((_, i) => i !== itemIdx) };
      return next;
    });
  }
  function addCardItem(cardIdx: number) {
    setCards(prev => {
      const next = [...prev];
      next[cardIdx] = { ...next[cardIdx], items: [...next[cardIdx].items, ''] };
      return next;
    });
  }

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.sectionHead}>Section Header</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Pill Text</label>
          <input style={s.inp} value={pillText} onChange={e => setPillText(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Rotating Label (above headline)</label>
          <input style={s.inp} value={rotatingLabel} onChange={e => setRotatingLabel(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Rotating Words (comma-separated)</label>
          <input style={s.inp} value={words} onChange={e => setWords(e.target.value)} placeholder="Modern SEO Teams, Growing Agencies, ..." />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Headline Line 1</label>
          <input style={s.inp} value={headline1} onChange={e => setHeadline1(e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Subtext</label>
          <textarea style={{ ...s.ta, minHeight: 60 }} value={subtext} onChange={e => setSubtext(e.target.value)} />
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionHead}>Audience Cards (3 items — card 2 is accent/popular)</h2>
        {cards.map((card, i) => (
          <div key={i} style={{ ...s.subCard, borderLeft: i === 1 ? '3px solid #00C27A' : undefined }}>
            <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: i === 1 ? '#00C27A' : '#0f172a' }}>Card {i + 1}{i === 1 ? ' (Accent — Most Popular)' : ''}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={s.label}>Label</label>
                <input style={s.inp} value={card.label} onChange={e => updateCard(i, { label: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>CTA Href</label>
                <input style={s.inp} value={card.ctaHref} onChange={e => updateCard(i, { ctaHref: e.target.value })} placeholder="#" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Title (use \n for line break)</label>
              <input style={s.inp} value={card.title} onChange={e => updateCard(i, { title: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>CTA Text</label>
              <input style={s.inp} value={card.cta} onChange={e => updateCard(i, { cta: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>Feature Items</label>
              {card.items.map((item, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input style={{ ...s.inp, flex: 1 }} value={item} onChange={e => updateCardItem(i, j, e.target.value)} />
                  <button style={s.btnDanger} onClick={() => removeCardItem(i, j)}>Remove</button>
                </div>
              ))}
              <button style={s.btnGhost} onClick={() => addCardItem(i)}>+ Add Item</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── CTA & Newsletter Tab ────────────────────────────────────────────────────
function CTANewsletterTab() {
  // CTA
  const [ctaBadge, setCtaBadge] = useState('Public Beta Now Available');
  const [ctaHeadline1, setCtaHeadline1] = useState('The AI search era is');
  const [ctaHeadline2, setCtaHeadline2] = useState('already here.');
  const [ctaHeadline3, setCtaHeadline3] = useState('Is your site ready?');
  const [ctaSubtext, setCtaSubtext] = useState('Start your daily AI audit today.');
  const [ctaCta1Text, setCtaCta1Text] = useState('Start Free Trial');
  const [ctaCta1Href, setCtaCta1Href] = useState('#');
  const [ctaCta2Text, setCtaCta2Text] = useState('Book a Demo');
  const [ctaCta2Href, setCtaCta2Href] = useState('#');
  const [ctaSupportText, setCtaSupportText] = useState('No credit card · 14 days free · Cancel anytime');
  const ctaSave = useSaveState();

  // Newsletter
  const [nlBadge, setNlBadge] = useState('Weekly SEO Intel');
  const [nlHeadline, setNlHeadline] = useState('Stay ahead of AI search.\nWeekly intel from Serpely.');
  const [nlSubtext, setNlSubtext] = useState('Get one practical tip every week on Agentic SEO, GEO optimization, and ranking in the AI-first web. Join 3,000+ marketers already subscribed.');
  const [nlInputPlaceholder, setNlInputPlaceholder] = useState('Enter your work email');
  const [nlButtonText, setNlButtonText] = useState('Get Weekly Insights');
  const [nlSuccessTitle, setNlSuccessTitle] = useState("You're subscribed!");
  const [nlSuccessBody, setNlSuccessBody] = useState('Check your inbox for a welcome email.');
  const [nlPrivacyText, setNlPrivacyText] = useState("We won't spam you. We respect your privacy. Unsubscribe anytime.");
  const nlSave = useSaveState();

  useEffect(() => {
    getSection('cta').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.badge === 'string') setCtaBadge(d.badge);
      if (typeof d.headline1 === 'string') setCtaHeadline1(d.headline1);
      if (typeof d.headline2 === 'string') setCtaHeadline2(d.headline2);
      if (typeof d.headline3 === 'string') setCtaHeadline3(d.headline3);
      if (typeof d.subtext === 'string') setCtaSubtext(d.subtext);
      if (typeof d.cta1Text === 'string') setCtaCta1Text(d.cta1Text);
      if (typeof d.cta1Href === 'string') setCtaCta1Href(d.cta1Href);
      if (typeof d.cta2Text === 'string') setCtaCta2Text(d.cta2Text);
      if (typeof d.cta2Href === 'string') setCtaCta2Href(d.cta2Href);
      if (typeof d.supportText === 'string') setCtaSupportText(d.supportText);
    }).catch(() => {});

    getSection('newsletter').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.badge === 'string') setNlBadge(d.badge);
      if (typeof d.headline === 'string') setNlHeadline(d.headline);
      if (typeof d.subtext === 'string') setNlSubtext(d.subtext);
      if (typeof d.inputPlaceholder === 'string') setNlInputPlaceholder(d.inputPlaceholder);
      if (typeof d.buttonText === 'string') setNlButtonText(d.buttonText);
      if (typeof d.successTitle === 'string') setNlSuccessTitle(d.successTitle);
      if (typeof d.successBody === 'string') setNlSuccessBody(d.successBody);
      if (typeof d.privacyText === 'string') setNlPrivacyText(d.privacyText);
    }).catch(() => {});
  }, []);

  function handleCtaSave() {
    ctaSave.doSave(() => updateSection('cta', {
      badge: ctaBadge, headline1: ctaHeadline1, headline2: ctaHeadline2, headline3: ctaHeadline3,
      subtext: ctaSubtext, cta1Text: ctaCta1Text, cta1Href: ctaCta1Href,
      cta2Text: ctaCta2Text, cta2Href: ctaCta2Href, supportText: ctaSupportText,
    }));
  }

  function handleNlSave() {
    nlSave.doSave(() => updateSection('newsletter', {
      badge: nlBadge, headline: nlHeadline, subtext: nlSubtext,
      inputPlaceholder: nlInputPlaceholder, buttonText: nlButtonText,
      successTitle: nlSuccessTitle, successBody: nlSuccessBody, privacyText: nlPrivacyText,
    }));
  }

  return (
    <div>
      {/* CTA Section */}
      <div style={{ ...s.card, borderTop: '3px solid #00C27A' }}>
        <h2 style={s.sectionHead}>CTA Section</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Badge Text</label>
          <input style={s.inp} value={ctaBadge} onChange={e => setCtaBadge(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Headline Line 1</label>
            <input style={s.inp} value={ctaHeadline1} onChange={e => setCtaHeadline1(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Headline Line 2</label>
            <input style={s.inp} value={ctaHeadline2} onChange={e => setCtaHeadline2(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Headline Line 3 (green)</label>
            <input style={s.inp} value={ctaHeadline3} onChange={e => setCtaHeadline3(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Subtext</label>
          <input style={s.inp} value={ctaSubtext} onChange={e => setCtaSubtext(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Primary Button Text</label>
            <input style={s.inp} value={ctaCta1Text} onChange={e => setCtaCta1Text(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Primary Button Href</label>
            <input style={s.inp} value={ctaCta1Href} onChange={e => setCtaCta1Href(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Secondary Button Text</label>
            <input style={s.inp} value={ctaCta2Text} onChange={e => setCtaCta2Text(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Secondary Button Href</label>
            <input style={s.inp} value={ctaCta2Href} onChange={e => setCtaCta2Href(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={s.label}>Support Text (below buttons)</label>
          <input style={s.inp} value={ctaSupportText} onChange={e => setCtaSupportText(e.target.value)} />
        </div>
        <SaveBtn saving={ctaSave.saving} saved={ctaSave.saved} onClick={handleCtaSave} />
      </div>

      {/* Newsletter Section */}
      <div style={{ ...s.card, borderTop: '3px solid #7c3aed' }}>
        <h2 style={s.sectionHead}>Newsletter Section</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Badge Text</label>
          <input style={s.inp} value={nlBadge} onChange={e => setNlBadge(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Headline (use \n for line breaks)</label>
          <textarea style={{ ...s.ta, minHeight: 70 }} value={nlHeadline} onChange={e => setNlHeadline(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Subtext</label>
          <textarea style={{ ...s.ta, minHeight: 80 }} value={nlSubtext} onChange={e => setNlSubtext(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Input Placeholder</label>
            <input style={s.inp} value={nlInputPlaceholder} onChange={e => setNlInputPlaceholder(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Button Text</label>
            <input style={s.inp} value={nlButtonText} onChange={e => setNlButtonText(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Success Title</label>
            <input style={s.inp} value={nlSuccessTitle} onChange={e => setNlSuccessTitle(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Success Body</label>
            <input style={s.inp} value={nlSuccessBody} onChange={e => setNlSuccessBody(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={s.label}>Privacy Text</label>
          <input style={s.inp} value={nlPrivacyText} onChange={e => setNlPrivacyText(e.target.value)} />
        </div>
        <SaveBtn saving={nlSave.saving} saved={nlSave.saved} onClick={handleNlSave} />
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function HomeEditor() {
  const [tab, setTab] = useState<TabId>('hero');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'hero',     label: 'Hero' },
    { id: 'problem',  label: 'Problem & Solution' },
    { id: 'hiw',      label: 'How It Works' },
    { id: 'features', label: 'Core Features' },
    { id: 'audience', label: 'Target Audience' },
    { id: 'cta',      label: 'CTA & Newsletter' },
  ];

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Home Page Editor</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Edit all sections of the home page</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hero'     && <HeroTab />}
      {tab === 'problem'  && <ProblemTab />}
      {tab === 'hiw'      && <HowItWorksTab />}
      {tab === 'features' && <CoreFeaturesTab />}
      {tab === 'audience' && <AudienceTab />}
      {tab === 'cta'      && <CTANewsletterTab />}
    </div>
  );
}
