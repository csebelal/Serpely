import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api, type BlogPostData as ApiPost } from '@/lib/api';

function extractHeadings(html: string): { level: 2 | 3; text: string; id: string }[] {
  return Array.from(html.matchAll(/<h([23])[^>]*?>([\s\S]*?)<\/h[23]>/gi)).map(([, level, inner]) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { level: Number(level) as 2 | 3, text, id };
  });
}

function BlogFAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item" onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
      <div className="faq-q" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{question}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)', color: open ? '#00C27A' : '#94a3b8' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && <div className="faq-a">{answer}</div>}
    </div>
  );
}

function injectHeadingIds(html: string): string {
  return html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h([23])>/gi, (_, level, attrs, inner, closeLevel) => {
    if (/\bid=["']/.test(attrs)) return `<h${level}${attrs}>${inner}</h${closeLevel}>`;
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `<h${level} id="${id}"${attrs}>${inner}</h${closeLevel}>`;
  });
}

function calcReadTime(html: string): string {
  const words = html.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

export function PreviewBlogPost() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.get(`/api/blog/preview/${token}`)
      .then(r => setData(r.data as ApiPost))
      .catch(() => setExpired(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const root = document.documentElement;
    try {
      const saved = localStorage.getItem('serpely-theme');
      if (saved === 'dark') root.setAttribute('data-theme', 'dark');
    } catch {}
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '120px 24px', textAlign: 'center', fontFamily: 'Satoshi, sans-serif', color: '#737373' }}>
        Loading preview…
      </div>
    );
  }

  if (expired || !data) {
    return (
      <div style={{ padding: '120px 24px', textAlign: 'center', fontFamily: 'Satoshi, sans-serif' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '12px' }}>Preview Expired</h1>
        <p style={{ color: '#737373', marginBottom: '24px' }}>
          This preview link has expired or is invalid. Previews are valid for 30 minutes.
        </p>
        <Link to="/sp-super-admin/blog" style={{ color: '#00C27A', fontWeight: 700, textDecoration: 'underline' }}>
          ← Back to Blog Manager
        </Link>
      </div>
    );
  }

  const formattedDate = data.publishedAt
    ? new Date(data.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const readTime = calcReadTime(data.body || '');
  const headings = extractHeadings(data.body || '');
  const processedBody = injectHeadingIds(data.body || '');

  return (
    <>
      <style>{`
        :root {
          --bg:#FFFFFF;--bg-subtle:#FAFAFA;--text:#0A0A0A;--text-mid:#404040;--text-soft:#525252;
          --text-faint:#737373;--text-ghost:#A3A3A3;--border:#E5E5E5;--border-soft:#F0F0F0;
          --card-bg:#FFFFFF;--tag-bg:#F5F5F5;--logo-filter:none;
          --cielo-light-display:block;--cielo-dark-display:none;
        }
        [data-theme="dark"] {
          --bg:#060606;--bg-subtle:#0F0F10;--text:#FAFAFA;--text-mid:#D4D4D8;--text-soft:#A1A1AA;
          --text-faint:#71717A;--text-ghost:#52525B;--border:#1F1F22;--border-soft:#16161A;
          --card-bg:#101013;--tag-bg:#1A1A1F;--logo-filter:brightness(0) invert(1);
          --cielo-light-display:none;--cielo-dark-display:block;
        }
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased;min-width:0;}
        html,body{max-width:100vw;overflow-x:hidden;}
        body{font-family:'Satoshi',sans-serif;background:var(--bg);color:var(--text);transition:background 0.25s,color 0.25s;}
        a{color:inherit;text-decoration:none;}

        .preview-banner{position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;text-align:center;padding:10px 20px;font-size:13px;font-weight:700;letter-spacing:0.02em;display:flex;align-items:center;justify-content:center;gap:10px;}
        .preview-banner a{color:#fff;text-decoration:underline;font-weight:800;}

        .breadcrumb{display:flex;align-items:center;gap:6px;margin-bottom:16px;padding-top:60px;}
        .bc-item{font-size:12.5px;font-weight:600;color:var(--text-soft);}
        .bc-sep{font-size:11px;color:var(--text-ghost);}
        .bc-current{color:var(--text-faint);}

        .hero-card{background:var(--bg-subtle);border:1px solid var(--border);border-radius:20px;padding:24px;margin-bottom:32px;}
        .hero-split{display:grid;grid-template-columns:1.15fr 1fr;gap:28px;align-items:center;}
        .hero-img-wrap{width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;position:relative;
          background:linear-gradient(135deg,#e8faf2 0%,#cdf5e5 60%,#b2ecda 100%);border:1px solid rgba(0,194,122,0.15);}
        [data-theme="dark"] .hero-img-wrap{background:linear-gradient(135deg,#0a1f16 0%,#0d2a1c 60%,#102818 100%);border-color:rgba(0,255,136,0.12);}
        .hero-right{display:flex;flex-direction:column;gap:13px;}
        .hero-cats{display:flex;gap:6px;flex-wrap:wrap;}
        .hero-tag{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;background:rgba(0,194,122,0.1);border:1px solid rgba(0,194,122,0.22);color:#00A868;}
        [data-theme="dark"] .hero-tag{color:#00FF88;background:rgba(0,255,136,0.08);border-color:rgba(0,255,136,0.18);}
        .hero-tag-neutral{background:var(--tag-bg);border:1px solid var(--border);color:var(--text-soft);}
        .hero-title{font-size:clamp(20px,2.5vw,28px);font-weight:900;line-height:1.12;letter-spacing:-0.045em;color:var(--text);margin:0;}
        .hero-excerpt{font-size:13.5px;line-height:1.65;color:var(--text-soft);font-weight:500;margin:0;}
        .hero-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .hero-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#00C27A,#00A868);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;}
        .hero-meta-name{font-size:13px;font-weight:700;color:var(--text);}
        .hero-meta-sep{color:var(--border);font-size:12px;}
        .hero-meta-date{font-size:12px;color:var(--text-faint);font-weight:500;}
        .hero-meta-read{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:var(--text-soft);background:var(--tag-bg);border:1px solid var(--border);padding:2px 8px;border-radius:6px;}

        .blog-layout{display:grid;grid-template-columns:216px minmax(0,1fr) 210px;gap:34px;align-items:start;}
        .toc-wrap{position:sticky;top:82px;}
        .toc-card{background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:16px;}
        .toc-head{font-size:11px;font-weight:800;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;}
        .toc-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:1px;}
        .toc-list a{display:flex;align-items:flex-start;gap:7px;padding:5px 7px;border-radius:7px;font-size:11.5px;font-weight:600;color:var(--text-faint);transition:color 0.15s;line-height:1.4;}
        .toc-list a:hover{color:var(--text);background:var(--bg-subtle);}
        .toc-list a.active{color:#00A868;background:rgba(0,194,122,0.08);}
        [data-theme="dark"] .toc-list a.active{color:#00FF88;background:rgba(0,255,136,0.06);}
        .toc-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;margin-top:5px;opacity:0.45;}
        .toc-list a.active .toc-dot{opacity:1;}

        .article-body h2{font-size:23px;font-weight:900;letter-spacing:-0.04em;color:var(--text);margin:38px 0 12px;line-height:1.2;scroll-margin-top:92px;}
        .article-body h3{font-size:18px;font-weight:800;letter-spacing:-0.03em;color:var(--text);margin:26px 0 10px;line-height:1.3;scroll-margin-top:92px;}
        .article-body p{font-size:16px;line-height:1.82;color:var(--text-mid);margin:0 0 18px;font-weight:450;}
        .article-body p strong{font-weight:700;color:var(--text);}
        .article-body a{color:#00A868;font-weight:600;}
        [data-theme="dark"] .article-body a{color:#00FF88;}
        .article-body ul,.article-body ol{margin:0 0 20px;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px;}
        .article-body ul li,.article-body ol li{font-size:15.5px;line-height:1.72;color:var(--text-mid);display:flex;gap:10px;align-items:flex-start;font-weight:450;}
        .article-body ul li::before{content:'';width:6px;height:6px;border-radius:50%;background:#00C27A;flex-shrink:0;margin-top:9px;}
        .article-body ol{counter-reset:item;}
        .article-body ol li{counter-increment:item;}
        .article-body ol li::before{content:counter(item);min-width:22px;height:22px;border-radius:6px;background:rgba(0,194,122,0.1);border:1px solid rgba(0,194,122,0.2);color:#00A868;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:3px;}
        [data-theme="dark"] .article-body ol li::before{background:rgba(0,255,136,0.08);border-color:rgba(0,255,136,0.15);color:#00FF88;}
        .article-body img{max-width:100%;border-radius:10px;margin:16px 0;}
        .article-body pre{background:var(--bg-subtle);border:1px solid var(--border);padding:16px;border-radius:10px;overflow-x:auto;margin-bottom:18px;}
        .article-body code{background:var(--bg-subtle);padding:2px 6px;border-radius:4px;font-size:13px;}
        .article-body blockquote{border-left:3px solid rgba(0,194,122,0.4);padding:4px 0 4px 18px;margin:22px 0;color:var(--text-soft);font-weight:450;font-size:16px;line-height:1.85;}
        .article-body table{width:100%;border-collapse:collapse;margin:18px 0 26px;border-radius:12px;overflow:hidden;border:1px solid var(--border);}
        .article-body th{padding:11px 15px;font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--border);text-align:left;background:var(--bg-subtle);color:var(--text-faint);}
        .article-body td{padding:10px 15px;font-size:13.5px;font-weight:500;color:var(--text-mid);border-bottom:1px solid var(--border-soft);vertical-align:top;}

        .author-card{border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin:28px 0;display:flex;gap:13px;align-items:center;background:var(--card-bg);}
        .author-avatar{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#00C27A 0%,#00A868 100%);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0;}
        .author-name{font-size:14px;font-weight:800;color:var(--text);margin-bottom:2px;}
        .author-role{font-size:12px;color:var(--text-faint);font-weight:500;}

        .article-tags-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid var(--border);padding-top:18px;margin-top:22px;}
        .article-tag{display:inline-block;font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;border:1px solid var(--border);background:var(--tag-bg);color:var(--text-soft);}
        .article-tag-green{background:rgba(0,194,122,0.08);border-color:rgba(0,194,122,0.2);color:#00A868;}
        [data-theme="dark"] .article-tag-green{color:#00FF88;}

        .faq-item{border-bottom:1px solid var(--border-soft);padding:17px 0;}
        .faq-item:last-child{border-bottom:none;}
        .faq-q{font-size:15.5px;font-weight:700;color:var(--text);margin-bottom:7px;letter-spacing:-0.02em;}
        .faq-a{font-size:14.5px;line-height:1.72;color:var(--text-soft);font-weight:450;margin:0;}
        .blog-faq-section{margin:32px 0 0;padding-top:24px;border-top:1px solid var(--border-soft);}
        .blog-faq-title{font-size:20px;font-weight:800;color:var(--text);margin-bottom:16px;letter-spacing:-0.03em;}

        @media(max-width:1100px){
          .blog-layout{grid-template-columns:1fr;}
          .toc-wrap{position:static;max-height:none;overflow:visible;}
          .toc-wrap{display:none;}
        }
        @media(max-width:767px){
          .hero-split{grid-template-columns:1fr;}
        }
      `}</style>

      {/* Preview Banner */}
      <div className="preview-banner">
        PREVIEW MODE — This post is not published yet
        <Link to="/sp-super-admin/blog">← Back to Admin</Link>
      </div>

      <main style={{ padding: '24px 6px 60px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="bc-item"><Link to="/blog">Blog</Link></span>
            <span className="bc-sep">›</span>
            <span className="bc-item"><a href="#">{data.tagLabel}</a></span>
            <span className="bc-sep">›</span>
            <span className="bc-item bc-current">{data.title}</span>
          </nav>

          <div className="hero-card">
            <div className="hero-split">
              <div className="hero-img-wrap">
                {data.coverImage ? (
                  <img src={data.coverImage} alt={data.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: '#00C27A' }}>📝</div>
                )}
              </div>
              <div className="hero-right">
                <div className="hero-cats">
                  <span className={`hero-tag${data.tagAccent ? '' : ' hero-tag-neutral'}`}>{data.tagLabel}</span>
                </div>
                <h1 className="hero-title">{data.title}</h1>
                <p className="hero-excerpt">{data.excerpt}</p>
                <div className="hero-meta">
                  <div className="hero-avatar">{data.authorInitials || '??'}</div>
                  <span className="hero-meta-name">{data.author}</span>
                  <span className="hero-meta-sep">·</span>
                  <span className="hero-meta-date">{formattedDate}</span>
                  <span className="hero-meta-sep">·</span>
                  <span className="hero-meta-read">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {readTime}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="blog-layout">
            <aside className="toc-wrap">
              <div className="toc-card">
                <div className="toc-head">Table of contents</div>
                <ul className="toc-list">
                  {headings.length > 0 ? headings.filter(h => h.level === 2).map(h => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="toc-link"><span className="toc-dot"></span>{h.text}</a>
                    </li>
                  )) : (
                    <li style={{ padding: '5px 7px', fontSize: 11.5, color: 'var(--text-ghost)' }}>No sections yet</li>
                  )}
                </ul>
              </div>
            </aside>

            <article className="article-body">
              <div dangerouslySetInnerHTML={{ __html: processedBody }} />

              <div className="author-card">
                <div className="author-avatar">{data.authorInitials || '??'}</div>
                <div>
                  <div className="author-name">{data.author}</div>
                  <div className="author-role">{data.tagLabel}</div>
                </div>
              </div>

              <div className="article-tags-row">
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="article-tag article-tag-green">{data.tagLabel}</span>
                  {data.category && <span className="article-tag">{data.category}</span>}
                </div>
              </div>

              {data.faq && data.faq.length > 0 && (
                <div className="blog-faq-section">
                  <h2 className="blog-faq-title">Frequently Asked Questions</h2>
                  <div className="blog-faq-list">
                    {data.faq.sort((a, b) => a.order - b.order).map((item, i) => (
                      <BlogFAQItem key={i} question={item.question} answer={item.answer} />
                    ))}
                  </div>
                </div>
              )}
            </article>

            <aside></aside>
          </div>

        </div>
      </main>
    </>
  );
}
