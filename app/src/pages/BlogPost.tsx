import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Clock, User, Share2, Twitter, Linkedin, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPost, getPosts, type BlogPostData as ApiPost } from '@/lib/api';

declare global {
  interface Window {
    tailwind: { config: object };
  }
}

function extractHeadings(html: string): { level: 2 | 3; text: string; id: string }[] {
  return Array.from(html.matchAll(/<h([23])[^>]*?>([\s\S]*?)<\/h[23]>/gi)).map(([, level, inner]) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { level: Number(level) as 2 | 3, text, id };
  });
}

function injectHeadingIds(html: string): string {
  return html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h[23]>/gi, (_, level, attrs, inner) => {
    if (/\bid=["']/.test(attrs)) return `<h${level}${attrs}>${inner}</h${level}>`;
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`;
  });
}

function calcReadTime(html: string): string {
  const words = html.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

export function BlogPost() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<ApiPost[]>([]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setData(null);
    setRelatedPosts([]);
    getPost(slug)
      .then(r => {
        setData(r.data);
        getPosts()
          .then(all => setRelatedPosts(all.data.filter(p => p.category === r.data.category && p.slug !== slug).slice(0, 3)))
          .catch(() => {});
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    // Load Tailwind CDN
    const twScript = document.createElement("script");
    twScript.src = "https://cdn.tailwindcss.com";
    twScript.onload = () => {
      if (window.tailwind) {
        window.tailwind.config = {
          theme: {
            extend: {
              fontFamily: {
                display: ["Satoshi", "sans-serif"],
                body: ["Satoshi", "sans-serif"],
                sans: ["Satoshi", "sans-serif"],
              },
              colors: {
                green: {
                  DEFAULT: "#00C27A",
                  light: "#00E08F",
                  soft: "#E6FBF4",
                  mid: "#00A868",
                  dark: "#008451",
                },
              },
            },
          },
        };
      }
    };
    document.head.appendChild(twScript);

    // Load Satoshi font
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,800,900&display=swap";
    document.head.appendChild(fontLink);

    // Theme init
    const root = document.documentElement;
    rootRef.current = root;
    try {
      const saved = localStorage.getItem("serpely-theme");
      if (saved === "dark") root.setAttribute("data-theme", "dark");
    } catch {}

    // Navbar scroll
    const navbar = document.getElementById("navbar");
    const handleScroll = () => {
      if (!navbar) return;
      if (window.scrollY > 8) navbar.classList.add("scrolled");
      else navbar.classList.remove("scrolled");
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Reading progress bar
    const progressBar = document.getElementById("reading-progress");
    const handleProgressScroll = () => {
      const article = document.querySelector("article");
      if (!article || !progressBar) return;
      const rect = article.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const articleHeight = article.offsetHeight;
      const scrolled = window.scrollY - articleTop;
      const pct = Math.min(
        100,
        Math.max(0, (scrolled / (articleHeight - window.innerHeight)) * 100)
      );
      progressBar.style.width = pct + "%";

      // Also update toc progress
      const tocFill = document.getElementById("toc-progress");
      if (tocFill) tocFill.style.width = pct + "%";
    };
    window.addEventListener("scroll", handleProgressScroll, { passive: true });

    // TOC active section highlight
    const tocLinks = document.querySelectorAll<HTMLAnchorElement>(".toc-link");
    const sections: { id: string; el: HTMLElement; link: HTMLAnchorElement }[] = [];
    tocLinks.forEach((link) => {
      const id = link.getAttribute("href")?.replace("#", "") ?? "";
      const el = document.getElementById(id);
      if (el) sections.push({ id, el, link });
    });
    let tocObserver: IntersectionObserver | null = null;
    if (sections.length) {
      tocObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const match = sections.find((s) => s.id === entry.target.id);
            if (match && entry.isIntersecting) {
              tocLinks.forEach((l) => l.classList.remove("active"));
              match.link.classList.add("active");
            }
          });
        },
        { rootMargin: "-10% 0px -80% 0px" }
      );
      sections.forEach((s) => tocObserver!.observe(s.el));
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleProgressScroll);
      if (tocObserver) tocObserver.disconnect();
    };
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.getAttribute("data-theme") === "dark";
    if (isDark) {
      root.removeAttribute("data-theme");
      try { localStorage.setItem("serpely-theme", "light"); } catch {}
    } else {
      root.setAttribute("data-theme", "dark");
      try { localStorage.setItem("serpely-theme", "dark"); } catch {}
    }
  }

  function toggleSummarize() {
    const panel = document.getElementById("summarize-panel");
    const btn = document.querySelector<HTMLElement>(".summarize-btn");
    if (!panel) return;
    const isOpen = panel.style.display === "block";
    panel.style.display = isOpen ? "none" : "block";
    if (btn) btn.setAttribute("aria-expanded", String(!isOpen));
  }

  function askAI(platform: string) {
    const articlePrompt = data
      ? `I just read an article titled "${data.title}" on the Serpely blog. ${data.excerpt} Based on this, can you help me understand the key takeaways and how I can apply them?`
      : 'Tell me about AI-first SEO and generative engine optimization.';
    const encoded = encodeURIComponent(articlePrompt);
    const urls: Record<string, string> = {
      chatgpt: "https://chatgpt.com/?q=" + encoded,
      claude: "https://claude.ai/new?q=" + encoded,
      googleai: "https://gemini.google.com/app?q=" + encoded,
      deepseek: "https://chat.deepseek.com/?q=" + encoded,
      perplexity: "https://www.perplexity.ai/?q=" + encoded,
      grok: "https://grok.com/?q=" + encoded,
      gemini: "https://gemini.google.com/app?q=" + encoded,
      google: "https://gemini.google.com/app?q=" + encoded,
    };
    if (urls[platform]) window.open(urls[platform], "_blank", "noopener,noreferrer");
  }

  function handleNewsletterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('input[type="email"]');
    const btn = form.querySelector<HTMLButtonElement>("button");
    if (btn) {
      btn.textContent = "âœ“ You're in!";
      btn.style.background = "#00a868";
    }
    if (input) input.disabled = true;
    if (btn) btn.disabled = true;
  }

  if (loading) {
    return (
      <div style={{ padding: "120px 24px", textAlign: "center", fontFamily: "Satoshi, sans-serif", color: "#737373" }}>
        Loadingâ€¦
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "120px 24px", textAlign: "center", fontFamily: "Satoshi, sans-serif" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "12px" }}>Post not found</h1>
        <p style={{ color: "#737373", marginBottom: "24px" }}>
          The article you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/blog" style={{ color: "#00C27A", fontWeight: 700, textDecoration: "underline" }}>
          â† Back to Blog
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
          --grid:rgba(0,194,122,0.07);--grid-strong:rgba(0,194,122,0.11);
          --card-bg:#FFFFFF;--card-shadow:0 2px 8px rgba(10,10,10,0.03);
          --tag-bg:#F5F5F5;--input-bg:#FFFFFF;--logo-filter:none;
          --cielo-light-display:block;--cielo-dark-display:none;
        }
        [data-theme="dark"] {
          --bg:#060606;--bg-subtle:#0F0F10;--text:#FAFAFA;--text-mid:#D4D4D8;--text-soft:#A1A1AA;
          --text-faint:#71717A;--text-ghost:#52525B;--border:#1F1F22;--border-soft:#16161A;
          --grid:rgba(0,255,136,0.045);--grid-strong:rgba(0,255,136,0.075);
          --card-bg:#101013;--card-shadow:0 2px 8px rgba(0,0,0,0.3);
          --tag-bg:#1A1A1F;--input-bg:#15151A;--logo-filter:brightness(0) invert(1);
          --cielo-light-display:none;--cielo-dark-display:block;
        }
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased;min-width:0;}
        html,body{max-width:100vw;overflow-x:hidden;scroll-behavior:smooth;}
        body{font-family:'Satoshi',sans-serif;background:var(--bg);color:var(--text);transition:background 0.25s,color 0.25s;}
        body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
          background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
          background-size:64px 64px;background-position:-1px -1px;}
        body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
          background-image:linear-gradient(var(--grid-strong) 1px,transparent 1px),linear-gradient(90deg,var(--grid-strong) 1px,transparent 1px);
          background-size:256px 256px;background-position:-1px -1px;}
        nav,main,section,footer{position:relative;z-index:1;}
        h1,h2,h3,h4{font-family:'Satoshi',sans-serif;color:var(--text);letter-spacing:-0.04em;}
        a{color:inherit;text-decoration:none;}
        .brand-logo{filter:var(--logo-filter);transition:filter 0.25s;}
        .cielo-light{display:var(--cielo-light-display);}.cielo-dark{display:var(--cielo-dark-display);}
        .grad-text{background:linear-gradient(135deg,#00C27A 0%,#00A868 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        [data-theme="dark"] .grad-text{background:linear-gradient(135deg,#00FF88 0%,#00C27A 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}

        #navbar{position:fixed;top:0;left:0;right:0;z-index:1000;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);border-bottom:1px solid transparent;transition:border-color 0.2s,box-shadow 0.2s,background 0.25s;}
        #navbar.scrolled{border-bottom-color:hsl(var(--border));box-shadow:0 2px 12px rgba(10,10,10,0.04);}
        .nav-item{position:relative;}
        .nav-item::after{content:'';position:absolute;bottom:-4px;left:0;right:0;height:4px;}
        .nav-item:hover .dropdown-menu{display:block;opacity:1;pointer-events:all;transform:translateX(-50%) translateY(0);}
        .nav-item:first-child:hover .dropdown-menu{transform:translateY(0);}
        .dropdown-menu{display:none;opacity:0;pointer-events:none;position:absolute;top:calc(100% + 4px);left:50%;transform:translateX(-50%) translateY(-6px);background:var(--card-bg);border:1px solid hsl(var(--border));border-radius:16px;box-shadow:0 24px 60px rgba(10,10,10,0.10),0 4px 12px rgba(10,10,10,0.04);min-width:240px;z-index:9999;padding:8px;transition:opacity 0.1s ease,transform 0.1s ease;}
        [data-theme="dark"] .dropdown-menu{box-shadow:0 24px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(0,255,136,0.04);}
        .dropdown-menu.mega{min-width:640px;padding:18px;border-radius:20px;}
        .mega-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:22px;}
        .mega-col{display:grid;gap:6px;align-content:start;}
        .mega-title{color:#00A868;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin:4px 0 6px;padding:0 10px;}
        [data-theme="dark"] .mega-title{color:#00FF88;}
        .mega-link{display:flex;align-items:flex-start;gap:12px;padding:10px;border-radius:12px;transition:background 0.14s;}
        .mega-link:hover{background:var(--bg-subtle);}
        .mega-link strong{display:block;color:var(--text);font-size:13.5px;font-weight:700;letter-spacing:-0.012em;}
        .mega-link span{display:block;margin-top:2px;color:var(--text-faint);font-size:12px;line-height:1.5;font-weight:500;}
        .mega-link.simple{padding:8px 10px;align-items:center;}.mega-link.simple strong{font-size:13px;}
        .mega-footer{display:inline-flex;align-items:center;gap:6px;padding:10px 12px;color:#00A868;font-size:12.5px;font-weight:700;margin-top:4px;border-top:1px solid var(--border-soft);padding-top:12px;}
        [data-theme="dark"] .mega-footer{color:#00FF88;}
        .dropdown-menu a:not(.mega-link):not(.mega-footer){display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;color:var(--text);font-size:13.5px;font-weight:600;transition:background 0.12s,color 0.12s;}
        .dropdown-menu a:not(.mega-link):not(.mega-footer):hover{background:var(--bg-subtle);color:#00A868;}
        [data-theme="dark"] .dropdown-menu a:not(.mega-link):not(.mega-footer):hover{color:#00FF88;}
        .dropdown-menu .dd-icon{width:32px;height:32px;border-radius:9px;background:var(--bg-subtle);border:1px solid hsl(var(--border));display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;overflow:hidden;}
        .dd-icon svg{width:15px;height:15px;stroke:#00A868;stroke-width:1.9;fill:none;stroke-linecap:round;stroke-linejoin:round;}
        [data-theme="dark"] .dd-icon svg:not(.no-invert){stroke:#00FF88;}
        .dd-icon img{width:16px;height:16px;object-fit:contain;}
        .dropdown-menu .dd-text{display:flex;flex-direction:column;}
        .dropdown-menu .dd-text span{font-size:11.5px;font-weight:500;color:var(--text-faint);margin-top:1px;}
        .dropdown-divider{height:1px;background:var(--border-soft);margin:6px 4px;}
        .btn-accent{display:inline-flex;align-items:center;gap:8px;background:#00C27A;color:#0A0A0A;font-weight:700;padding:11px 20px;border-radius:10px;font-size:14px;letter-spacing:-0.012em;transition:transform 0.15s,background 0.15s,box-shadow 0.15s;border:1px solid #00C27A;box-shadow:0 4px 16px rgba(0,194,122,0.20);}
        .btn-accent:hover{background:#00E08F;border-color:#00E08F;transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,194,122,0.28);}
        .btn-audit{display:inline-flex;align-items:center;gap:7px;background:var(--card-bg);border:1px solid var(--text);color:var(--text);font-weight:700;padding:8px 14px;border-radius:9px;font-size:13px;letter-spacing:-0.012em;transition:background 0.15s,color 0.15s,transform 0.15s;}
        .btn-audit:hover{background:var(--text);color:var(--bg);transform:translateY(-1px);}
        .audit-pulse{width:6px;height:6px;border-radius:50%;background:#00C27A;box-shadow:0 0 0 0 rgba(0,194,122,0.6);animation:auditPulse 2s ease infinite;flex-shrink:0;}
        @keyframes auditPulse{0%{box-shadow:0 0 0 0 rgba(0,194,122,0.6);}70%{box-shadow:0 0 0 8px rgba(0,194,122,0);}100%{box-shadow:0 0 0 0 rgba(0,194,122,0);}}
        .theme-toggle{width:38px;height:38px;border-radius:10px;background:var(--card-bg);border:1px solid hsl(var(--border));display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-soft);transition:border-color 0.15s,background 0.15s,color 0.15s;}
        .theme-toggle:hover{border-color:var(--text-soft);color:var(--text);}
        .theme-toggle svg{width:16px;height:16px;}
        .theme-toggle .icon-moon{display:none;}
        [data-theme="dark"] .theme-toggle .icon-sun{display:none;}
        [data-theme="dark"] .theme-toggle .icon-moon{display:block;}

        .hero-card{background:var(--bg-subtle);border:1px solid hsl(var(--border));border-radius:20px;padding:24px;margin-bottom:32px;}
        .hero-split{display:grid;grid-template-columns:1.15fr 1fr;gap:28px;align-items:center;margin-bottom:20px;}
        .hero-img-wrap{width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;position:relative;
          background:linear-gradient(135deg,#e8faf2 0%,#cdf5e5 60%,#b2ecda 100%);border:1px solid rgba(0,194,122,0.15);}
        [data-theme="dark"] .hero-img-wrap{background:linear-gradient(135deg,#0a1f16 0%,#0d2a1c 60%,#102818 100%);border-color:rgba(0,255,136,0.12);}
        .hero-img-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,194,122,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(0,194,122,0.12) 1px,transparent 1px);background-size:28px 28px;}
        .hero-img-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;}
        .hero-img-badge{background:rgba(255,255,255,0.85);backdrop-filter:blur(8px);border:1px solid rgba(0,194,122,0.25);border-radius:12px;padding:10px 16px;text-align:center;}
        [data-theme="dark"] .hero-img-badge{background:rgba(16,16,19,0.85);}
        .hero-img-badge strong{display:block;font-size:13px;font-weight:900;letter-spacing:-0.03em;color:#00A868;line-height:1.2;}
        [data-theme="dark"] .hero-img-badge strong{color:#00FF88;}
        .hero-img-badge span{font-size:10px;font-weight:600;color:var(--text-faint);}
        .hero-cat-overlay{position:absolute;top:10px;left:10px;background:rgba(0,194,122,0.15);backdrop-filter:blur(6px);border:1px solid rgba(0,194,122,0.3);color:#00A868;font-size:10px;font-weight:700;padding:3px 9px;border-radius:5px;}
        [data-theme="dark"] .hero-cat-overlay{color:#00FF88;}
        .hero-right{display:flex;flex-direction:column;gap:13px;}
        .hero-cats{display:flex;gap:6px;flex-wrap:wrap;}
        .hero-tag{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;background:rgba(0,194,122,0.1);border:1px solid rgba(0,194,122,0.22);color:#00A868;}
        [data-theme="dark"] .hero-tag{color:#00FF88;background:rgba(0,255,136,0.08);border-color:rgba(0,255,136,0.18);}
        .hero-tag-neutral{background:var(--tag-bg);border:1px solid hsl(var(--border));color:var(--text-soft);}
        .hero-title{font-size:clamp(20px,2.5vw,28px);font-weight:900;line-height:1.12;letter-spacing:-0.045em;color:var(--text);margin:0;}
        .hero-excerpt{font-size:13.5px;line-height:1.65;color:var(--text-soft);font-weight:500;margin:0;}
        .hero-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .hero-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#00C27A,#00A868);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;}
        .hero-meta-name{font-size:13px;font-weight:700;color:var(--text);}
        .hero-meta-sep{color:hsl(var(--border));font-size:12px;}
        .hero-meta-date{font-size:12px;color:var(--text-faint);font-weight:500;}
        .hero-meta-read{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:var(--text-soft);background:var(--tag-bg);border:1px solid hsl(var(--border));padding:2px 8px;border-radius:6px;}
        .hero-actions{border-top:1px solid hsl(var(--border));padding-top:18px;}
        .actions-label{font-size:10px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:9px;}
        .actions-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
        .summarize-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:10px;background:rgba(0,194,122,0.1);border:1px solid rgba(0,194,122,0.28);color:#00A868;font-size:12.5px;font-weight:700;cursor:pointer;transition:background 0.15s,transform 0.15s;font-family:'Satoshi',sans-serif;}
        .summarize-btn:hover{background:rgba(0,194,122,0.16);transform:translateY(-1px);}
        [data-theme="dark"] .summarize-btn{color:#00FF88;background:rgba(0,255,136,0.08);border-color:rgba(0,255,136,0.18);}
        .actions-sep{width:1px;height:28px;background:hsl(var(--border));margin:0 3px;}
        .actions-ask-label{font-size:11px;font-weight:600;color:var(--text-faint);white-space:nowrap;}
        .ai-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:9px;border:1px solid hsl(var(--border));background:var(--card-bg);font-size:11.5px;font-weight:600;color:var(--text-soft);cursor:pointer;transition:border-color 0.15s,color 0.15s,transform 0.15s;font-family:'Satoshi',sans-serif;}
        .ai-pill:hover{border-color:var(--text-soft);color:var(--text);transform:translateY(-1px);}
        .ai-dot{width:13px;height:13px;border-radius:50%;flex-shrink:0;}
        .summarize-panel{display:none;margin-top:14px;background:var(--bg-subtle);border:1px solid rgba(0,194,122,0.18);border-radius:12px;padding:16px 18px;}
        .summarize-panel.open{display:block;}
        .sp-label{font-size:10px;font-weight:800;color:#00A868;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
        [data-theme="dark"] .sp-label{color:#00FF88;}
        .sp-text{font-size:13.5px;line-height:1.72;color:var(--text-mid);margin:0;font-weight:450;}

        .breadcrumb{display:flex;align-items:center;gap:6px;margin-bottom:16px;}
        .bc-item{font-size:12.5px;font-weight:600;color:var(--text-soft);}
        .bc-sep{font-size:11px;color:var(--text-ghost);}
        .bc-current{color:var(--text-faint);}

        .blog-layout{display:grid;grid-template-columns:216px minmax(0,1fr) 210px;gap:34px;align-items:start;}

        .toc-wrap{position:sticky;top:82px;max-height:calc(100vh - 94px);overflow-y:auto;scrollbar-width:none;}
        .toc-wrap::-webkit-scrollbar{display:none;}
        .toc-card{background:var(--card-bg);border:1px solid hsl(var(--border));border-radius:14px;padding:16px;}
        .toc-head{font-size:11px;font-weight:800;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;}
        .toc-prog-wrap{height:2px;background:hsl(var(--border));border-radius:2px;margin-bottom:12px;overflow:hidden;}
        .toc-prog-fill{height:100%;background:#00C27A;border-radius:2px;width:0%;transition:width 0.1s linear;}
        .toc-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:1px;}
        .toc-list a{display:flex;align-items:flex-start;gap:7px;padding:5px 7px;border-radius:7px;font-size:11.5px;font-weight:600;color:var(--text-faint);transition:color 0.15s,background 0.15s;line-height:1.4;}
        .toc-list a:hover{color:var(--text);background:var(--bg-subtle);}
        .toc-list a.active{color:#00A868;background:rgba(0,194,122,0.08);}
        [data-theme="dark"] .toc-list a.active{color:#00FF88;background:rgba(0,255,136,0.06);}
        .toc-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;margin-top:5px;opacity:0.45;}
        .toc-list a.active .toc-dot{opacity:1;}
        .toc-sub a{padding-left:18px !important;font-size:11px !important;}

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

        .article-hook{font-size:16px;line-height:1.85;color:var(--text-soft);border-left:3px solid rgba(0,194,122,0.4);padding:4px 0 4px 18px;margin-bottom:28px;font-weight:450;}

        .key-takeaways{background:rgba(0,194,122,0.06);border:1px solid rgba(0,194,122,0.2);border-radius:16px;padding:20px 22px;margin-bottom:32px;}
        [data-theme="dark"] .key-takeaways{background:rgba(0,255,136,0.05);border-color:rgba(0,255,136,0.14);}
        .kt-header{display:flex;align-items:center;gap:9px;margin-bottom:14px;}
        .kt-icon{width:26px;height:26px;border-radius:7px;background:rgba(0,194,122,0.14);border:1px solid rgba(0,194,122,0.24);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        [data-theme="dark"] .kt-icon{background:rgba(0,255,136,0.09);border-color:rgba(0,255,136,0.18);}
        .kt-title{font-size:13px;font-weight:800;color:#00A868;letter-spacing:-0.01em;}
        [data-theme="dark"] .kt-title{color:#00FF88;}
        .kt-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px;}
        .kt-item{display:flex;gap:10px;align-items:flex-start;}
        .kt-check{width:17px;height:17px;border-radius:50%;background:rgba(0,194,122,0.12);border:1.5px solid rgba(0,194,122,0.32);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;}
        [data-theme="dark"] .kt-check{background:rgba(0,255,136,0.08);border-color:rgba(0,255,136,0.22);}
        .kt-check svg{width:8px;height:8px;stroke:#00A868;stroke-width:2.5;fill:none;}
        [data-theme="dark"] .kt-check svg{stroke:#00FF88;}
        .kt-text{font-size:13.5px;line-height:1.6;color:var(--text-mid);font-weight:500;}

        .callout{border-radius:0 12px 12px 0;padding:13px 17px;margin:22px 0;}
        .callout-green{border-left:3px solid #00C27A;background:rgba(0,194,122,0.05);}
        [data-theme="dark"] .callout-green{background:rgba(0,255,136,0.04);border-left-color:#00FF88;}
        .callout p{margin:0;font-size:15px;line-height:1.7;color:var(--text-mid);}
        .callout strong{color:#00A868;}
        [data-theme="dark"] .callout strong{color:#00FF88;}

        .compare-table{width:100%;border-collapse:collapse;margin:18px 0 26px;border-radius:12px;overflow:hidden;border:1px solid hsl(var(--border));}
        .compare-table th{padding:11px 15px;font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid hsl(var(--border));text-align:left;}
        .compare-table th:first-child{background:var(--bg-subtle);color:var(--text-faint);}
        .compare-table th.geo-col{background:rgba(0,194,122,0.08);color:#00A868;border-left:1px solid rgba(0,194,122,0.15);}
        [data-theme="dark"] .compare-table th.geo-col{color:#00FF88;background:rgba(0,255,136,0.05);}
        .compare-table td{padding:10px 15px;font-size:13.5px;font-weight:500;color:var(--text-mid);border-bottom:1px solid var(--border-soft);vertical-align:top;}
        .compare-table td.geo-val{border-left:1px solid var(--border-soft);color:var(--text);font-weight:600;}
        .compare-table tr:last-child td{border-bottom:none;}
        .compare-table tr:hover td{background:var(--bg-subtle);}

        .step-block{border:1px solid hsl(var(--border));border-radius:14px;padding:18px 20px;margin:16px 0;background:var(--card-bg);}
        .step-head{display:flex;align-items:center;gap:12px;margin-bottom:11px;}
        .step-num{width:32px;height:32px;border-radius:9px;background:rgba(0,194,122,0.1);border:1px solid rgba(0,194,122,0.22);color:#00A868;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        [data-theme="dark"] .step-num{background:rgba(0,255,136,0.08);border-color:rgba(0,255,136,0.18);color:#00FF88;}
        .step-title-text{font-size:15.5px;font-weight:800;color:var(--text);letter-spacing:-0.02em;}
        .step-body{font-size:14.5px;line-height:1.75;color:var(--text-mid);font-weight:450;margin:0;}

        .tool-card{border:1px solid hsl(var(--border));border-radius:12px;padding:15px 17px;margin-bottom:10px;background:var(--card-bg);transition:border-color 0.2s,box-shadow 0.2s;}
        .tool-card:hover{border-color:rgba(0,194,122,0.25);box-shadow:0 4px 18px rgba(0,194,122,0.07);}
        .tool-card.featured{border-color:rgba(0,194,122,0.32);background:rgba(0,194,122,0.03);}
        [data-theme="dark"] .tool-card.featured{background:rgba(0,255,136,0.03);border-color:rgba(0,255,136,0.18);}
        .tool-name{font-size:14px;font-weight:800;color:var(--text);margin-bottom:5px;letter-spacing:-0.01em;display:flex;align-items:center;gap:7px;}
        .tool-featured-badge{font-size:10px;font-weight:700;background:rgba(0,194,122,0.12);color:#00A868;padding:2px 7px;border-radius:5px;}
        [data-theme="dark"] .tool-featured-badge{color:#00FF88;background:rgba(0,255,136,0.08);}
        .tool-desc{font-size:13.5px;line-height:1.65;color:var(--text-soft);font-weight:450;margin:0;}

        .bp-card{border:1px solid hsl(var(--border));border-radius:14px;padding:16px 18px;margin-bottom:12px;background:var(--card-bg);}
        .bp-header{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
        .bp-emoji{font-size:18px;}
        .bp-title{font-size:15px;font-weight:800;color:var(--text);letter-spacing:-0.02em;}
        .bp-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;}
        .bp-list li{font-size:13.5px;line-height:1.65;color:var(--text-soft);display:flex;gap:8px;font-weight:450;}
        .bp-list li::before{content:'';width:5px;height:5px;border-radius:50%;background:#00C27A;flex-shrink:0;margin-top:8px;}

        .faq-item{border-bottom:1px solid var(--border-soft);padding:17px 0;}
        .faq-item:last-child{border-bottom:none;}
        .faq-q{font-size:15.5px;font-weight:700;color:var(--text);margin-bottom:7px;letter-spacing:-0.02em;}
        .faq-a{font-size:14.5px;line-height:1.72;color:var(--text-soft);font-weight:450;margin:0;}

        .bottom-line{background:rgba(0,194,122,0.05);border:1px solid rgba(0,194,122,0.18);border-radius:16px;padding:22px 24px;margin:30px 0 0;}
        [data-theme="dark"] .bottom-line{background:rgba(0,255,136,0.04);border-color:rgba(0,255,136,0.11);}
        .bl-label{font-size:10px;font-weight:800;color:#00A868;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:7px;}
        [data-theme="dark"] .bl-label{color:#00FF88;}
        .bottom-line h3{font-size:19px;font-weight:900;letter-spacing:-0.04em;color:var(--text);margin:0 0 9px;}
        .bottom-line p{font-size:15px;line-height:1.75;color:var(--text-soft);margin:0;font-weight:450;}

        .author-card{border:1px solid hsl(var(--border));border-radius:14px;padding:16px 18px;margin:28px 0;display:flex;gap:13px;align-items:center;background:var(--card-bg);}
        .author-avatar{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#00C27A 0%,#00A868 100%);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0;}
        .author-name{font-size:14px;font-weight:800;color:var(--text);margin-bottom:2px;}
        .author-role{font-size:12px;color:var(--text-faint);font-weight:500;margin-bottom:5px;}
        .author-bio-text{font-size:13px;line-height:1.6;color:var(--text-soft);margin:0;font-weight:450;}

        .article-tags-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid hsl(var(--border));padding-top:18px;margin-top:22px;}
        .article-tag{display:inline-block;font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;border:1px solid hsl(var(--border));background:var(--tag-bg);color:var(--text-soft);}
        .article-tag-green{background:rgba(0,194,122,0.08);border-color:rgba(0,194,122,0.2);color:#00A868;}
        [data-theme="dark"] .article-tag-green{color:#00FF88;}
        .share-inline-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:8px;border:1px solid hsl(var(--border));background:var(--card-bg);font-size:12px;font-weight:700;color:var(--text-soft);cursor:pointer;transition:border-color 0.15s,color 0.15s;}
        .share-inline-btn:hover{border-color:var(--text-soft);color:var(--text);}

        .post-nav{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0 0;border-top:1px solid hsl(var(--border));padding-top:18px;}
        .post-nav-item{border:1px solid hsl(var(--border));border-radius:12px;padding:13px 14px;background:var(--card-bg);transition:border-color 0.2s;display:flex;flex-direction:column;gap:4px;}
        .post-nav-item:hover{border-color:rgba(0,194,122,0.28);}
        .post-nav-item.next{text-align:right;}
        .post-nav-dir{font-size:10px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.07em;}
        .post-nav-title{font-size:13px;font-weight:700;color:var(--text-soft);line-height:1.35;}

        .sidebar-wrap{position:sticky;top:82px;max-height:calc(100vh - 94px);overflow-y:auto;scrollbar-width:none;display:flex;flex-direction:column;gap:11px;}
        .sidebar-wrap::-webkit-scrollbar{display:none;}
        .sidebar-card{border:1px solid hsl(var(--border));border-radius:14px;padding:14px;background:var(--card-bg);}
        .sidebar-card-title{font-size:10.5px;font-weight:800;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;}
        .sb-share-btn{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:9px;border:1px solid hsl(var(--border));background:var(--bg-subtle);margin-bottom:5px;font-size:12px;font-weight:600;color:var(--text-soft);cursor:pointer;transition:border-color 0.15s,color 0.15s;}
        .sb-share-btn:hover{border-color:rgba(0,194,122,0.28);color:#00A868;}
        [data-theme="dark"] .sb-share-btn:hover{color:#00FF88;}
        .sb-icon{width:22px;height:22px;border-radius:6px;background:hsl(var(--border));display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .newsletter-card{border:1px solid rgba(0,194,122,0.22);border-radius:14px;padding:14px;background:rgba(0,194,122,0.04);}
        [data-theme="dark"] .newsletter-card{background:rgba(0,255,136,0.03);border-color:rgba(0,255,136,0.13);}
        .nl-title{font-size:13px;font-weight:800;color:var(--text);letter-spacing:-0.02em;margin-bottom:4px;}
        .nl-sub{font-size:11.5px;color:var(--text-soft);line-height:1.55;margin-bottom:11px;font-weight:450;}
        .nl-input{width:100%;height:33px;border-radius:8px;border:1px solid hsl(var(--border));background:var(--input-bg);padding:0 10px;font-size:12px;color:var(--text);font-family:'Satoshi',sans-serif;outline:none;margin-bottom:6px;}
        .nl-input:focus{border-color:rgba(0,194,122,0.38);}
        .nl-btn{width:100%;padding:8px;border-radius:8px;background:#00C27A;border:none;cursor:pointer;color:#0A0A0A;font-size:12px;font-weight:800;font-family:'Satoshi',sans-serif;transition:background 0.15s;}
        .nl-btn:hover{background:#00E08F;}
        .nl-note{font-size:10px;color:var(--text-ghost);text-align:center;margin-top:5px;}
        .sidebar-tags{display:flex;flex-wrap:wrap;gap:5px;}
        .sb-tag{display:inline-block;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:6px;border:1px solid hsl(var(--border));background:var(--tag-bg);color:var(--text-soft);}
        .sb-tag-green{background:rgba(0,194,122,0.08);border-color:rgba(0,194,122,0.18);color:#00A868;}
        [data-theme="dark"] .sb-tag-green{color:#00FF88;}
        .mini-cta{border:1px solid rgba(0,194,122,0.22);border-radius:14px;padding:14px;background:rgba(0,194,122,0.04);}
        [data-theme="dark"] .mini-cta{background:rgba(0,255,136,0.03);border-color:rgba(0,255,136,0.13);}
        .mc-label{font-size:10px;font-weight:800;color:#00A868;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;}
        [data-theme="dark"] .mc-label{color:#00FF88;}
        .mc-title{font-size:13px;font-weight:800;color:var(--text);margin-bottom:4px;letter-spacing:-0.02em;}
        .mc-body{font-size:11.5px;color:var(--text-soft);line-height:1.55;margin-bottom:11px;}
        .mc-btn{display:block;width:100%;padding:8px;border-radius:9px;background:#00C27A;border:none;cursor:pointer;color:#0A0A0A;font-size:12px;font-weight:800;font-family:'Satoshi',sans-serif;text-align:center;transition:background 0.15s;}
        .mc-btn:hover{background:#00E08F;}

        .related-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
        .related-card{border:1px solid hsl(var(--border));border-radius:16px;background:var(--card-bg);overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s,transform 0.2s;}
        .related-card:hover{border-color:rgba(0,194,122,0.22);box-shadow:0 10px 30px rgba(0,0,0,0.05);transform:translateY(-2px);}
        .related-img{width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;overflow:hidden;}
        .related-body{padding:13px 15px;}
        .related-tag{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;background:rgba(0,194,122,0.1);color:#00A868;margin-bottom:7px;display:inline-block;}
        [data-theme="dark"] .related-tag{color:#00FF88;background:rgba(0,255,136,0.08);}
        .related-title-text{font-size:13.5px;font-weight:800;color:var(--text);line-height:1.4;letter-spacing:-0.02em;margin-bottom:9px;}
        .related-meta{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-faint);font-weight:500;}

        .cta-band{background:rgba(0,194,122,0.06);border:1px solid rgba(0,194,122,0.18);border-radius:20px;padding:44px 36px;text-align:center;margin:44px 0 0;}
        [data-theme="dark"] .cta-band{background:rgba(0,255,136,0.04);border-color:rgba(0,255,136,0.11);}
        .cta-label{font-size:11px;font-weight:800;color:#00A868;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:11px;display:flex;align-items:center;justify-content:center;gap:6px;}
        [data-theme="dark"] .cta-label{color:#00FF88;}
        .cta-pulse{width:6px;height:6px;border-radius:50%;background:currentColor;animation:auditPulse 2s ease infinite;}
        .cta-band h2{font-size:clamp(22px,3.5vw,34px);font-weight:900;letter-spacing:-0.05em;margin:0 0 11px;line-height:1.1;}
        .cta-band p{font-size:15.5px;color:var(--text-soft);line-height:1.65;max-width:500px;margin:0 auto 26px;font-weight:450;}
        .cta-btns{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;}
        .cta-btn-sec{display:inline-flex;align-items:center;gap:7px;padding:11px 18px;border-radius:10px;font-size:14px;font-weight:700;border:1px solid hsl(var(--border));background:var(--card-bg);color:var(--text-soft);letter-spacing:-0.012em;transition:border-color 0.15s,color 0.15s;}
        .cta-btn-sec:hover{border-color:var(--text-soft);color:var(--text);}

        .ask-ai-btn{display:flex;flex-direction:column;align-items:center;gap:8px;background:none;border:none;cursor:pointer;padding:4px;transition:transform 0.2s;}
        .ask-ai-btn:hover{transform:translateY(-4px);}
        .ask-ai-icon{width:52px;height:52px;border-radius:14px;border:1.5px solid hsl(var(--border));background:var(--card-bg);display:flex;align-items:center;justify-content:center;transition:border-color 0.2s,box-shadow 0.2s;overflow:hidden;}
        .ask-ai-btn:hover .ask-ai-icon{border-color:rgba(0,194,122,0.4);box-shadow:0 6px 20px rgba(0,194,122,0.15);}
        .ask-ai-label{font-size:11px;font-weight:700;color:var(--text-faint);letter-spacing:-0.01em;}
        .ask-ai-btn:hover .ask-ai-label{color:var(--text-soft);}
        .footer-links-band{background:#E8FAF2;border-radius:18px;padding:26px 26px;margin-bottom:24px;}
        [data-theme="dark"] .footer-links-band{background:rgba(0,255,136,0.05);}
        .footer-link{display:block;font-size:13px;font-weight:600;color:var(--text-soft);margin-bottom:8px;transition:color 0.15s;}
        .footer-link:hover{color:#00C27A;}
        [data-theme="dark"] .footer-link:hover{color:#00FF88;}

        @media(max-width:1100px){
          .blog-layout{grid-template-columns:1fr;}
          .toc-wrap,.sidebar-wrap{position:static;max-height:none;overflow:visible;}
          .toc-wrap{order:-1;}
          .sidebar-wrap{order:3;}
          .toc-card{max-height:none;}
          .related-grid{grid-template-columns:1fr 1fr;}
          .dropdown-menu.mega{min-width:min(640px,calc(100vw - 48px));}
        }
        @media(max-width:767px){
          body{overflow-x:hidden;}
          .hero-split{grid-template-columns:1fr;}
          .related-grid{grid-template-columns:1fr;}
          .post-nav{grid-template-columns:1fr;}
          .cta-band{padding:28px 18px;}
          .actions-row{gap:5px;}
        }
        @media(max-width:479px){
          .footer-links-band .grid{grid-template-columns:1fr 1fr !important;}
        }

        /* Footer-specific + sidebar extra styles */
        .footer-links-band{background:#E8FAF2;border-radius:20px;padding:36px 40px;margin-bottom:2rem;}
        [data-theme="dark"] .footer-links-band{background:rgba(0,255,136,0.05);}
        .footer-link{display:block;font-size:13.5px;font-weight:500;color:var(--text-soft);text-decoration:none;margin-bottom:10px;transition:color 0.15s;}
        .footer-link:hover{color:#00A868;}
        [data-theme="dark"] .footer-link:hover{color:#00FF88;}

        .sidebar-wrap{display:flex;flex-direction:column;gap:16px;}
        .sidebar-card{background:var(--card-bg);border:1px solid hsl(var(--border));border-radius:14px;padding:20px;}
        .sidebar-card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-faint);margin-bottom:14px;}
        .sidebar-share-btns{display:flex;flex-direction:column;gap:8px;}
        .sidebar-share-btn{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;border:1px solid hsl(var(--border));color:var(--text-soft);background:var(--bg);cursor:pointer;transition:all .15s;}
        .sidebar-share-btn:hover{border-color:#00c27a;color:#00c27a;}
        .sidebar-newsletter{background:linear-gradient(135deg,rgba(0,194,122,.07) 0%,rgba(99,102,241,.04) 100%);}
        .sidebar-newsletter-icon{width:40px;height:40px;border-radius:10px;background:rgba(0,194,122,.12);display:flex;align-items:center;justify-content:center;color:#00c27a;margin-bottom:12px;}
        .sidebar-newsletter-heading{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;}
        .sidebar-newsletter-sub{font-size:12.5px;color:var(--text-soft);line-height:1.55;margin-bottom:14px;}
        .sidebar-newsletter-form{display:flex;flex-direction:column;gap:8px;}
        .sidebar-newsletter-form input{padding:9px 12px;border:1px solid hsl(var(--border));border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;outline:none;transition:border-color .15s;}
        .sidebar-newsletter-form input:focus{border-color:#00c27a;}
        .sidebar-newsletter-form button{padding:9px 14px;background:#00c27a;color:#000;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s;}
        .sidebar-newsletter-form button:hover{background:#00a868;}
        .sidebar-newsletter-note{font-size:11px;color:var(--text-faint);margin-top:8px;}
        .sidebar-tags-cloud{display:flex;flex-wrap:wrap;gap:6px;}
        .stag{display:inline-block;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;background:var(--bg);border:1px solid hsl(var(--border));color:var(--text-soft);text-decoration:none;transition:all .15s;}
        .stag:hover{border-color:#00c27a;color:#00c27a;}
        .stag-green{background:rgba(0,194,122,.08);border-color:rgba(0,194,122,.25);color:#00a868;}
        [data-theme="dark"] .stag-green{color:#00c27a;}
        .sidebar-cta-card{background:linear-gradient(135deg,rgba(0,194,122,.1) 0%,rgba(0,168,104,.05) 100%);border-color:rgba(0,194,122,.3);}
        .sidebar-cta-badge{display:inline-block;padding:2px 9px;background:rgba(0,194,122,.15);border:1px solid rgba(0,194,122,.3);border-radius:99px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#00a868;margin-bottom:10px;}
        [data-theme="dark"] .sidebar-cta-badge{color:#00c27a;}
        .sidebar-cta-heading{font-size:14.5px;font-weight:800;color:var(--text);line-height:1.35;margin-bottom:8px;}
        .sidebar-cta-sub{font-size:12.5px;color:var(--text-soft);line-height:1.55;margin-bottom:14px;}
        .sidebar-cta-btn{display:block;padding:10px 14px;background:#00c27a;color:#000;border-radius:8px;text-align:center;font-size:13px;font-weight:700;text-decoration:none;transition:background .15s;}
        .sidebar-cta-btn:hover{background:#00a868;}

        .related-section{padding:72px 0;background:var(--bg);border-top:1px solid hsl(var(--border));}
        .related-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:36px;}
        .related-title{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-.03em;}
        .related-all-link{font-size:13.5px;font-weight:600;color:#00a868;text-decoration:none;}
        .related-all-link:hover{color:#00c27a;}
        .related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
        .related-card{background:var(--card-bg);border:1px solid hsl(var(--border));border-radius:16px;overflow:hidden;transition:border-color .2s,transform .2s;}
        .related-card:hover{border-color:rgba(0,194,122,.4);transform:translateY(-3px);}
        .related-card-img-wrap{display:block;}
        .related-card-img{aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;}
        .related-card-body{padding:20px;}
        .related-card-tag{display:inline-block;padding:2px 9px;border-radius:99px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;background:var(--bg);border:1px solid hsl(var(--border));color:var(--text-soft);margin-bottom:10px;}
        .related-card-tag-green{background:rgba(0,194,122,.08);border-color:rgba(0,194,122,.25);color:#00a868;}
        [data-theme="dark"] .related-card-tag-green{color:#00c27a;}
        .related-card-title{font-size:16px;font-weight:700;line-height:1.4;color:var(--text);margin-bottom:8px;}
        .related-card-title a{color:inherit;text-decoration:none;}
        .related-card-title a:hover{color:#00a868;}
        .related-card-excerpt{font-size:13px;color:var(--text-soft);line-height:1.6;margin-bottom:14px;}
        .related-card-meta{display:flex;gap:6px;font-size:12px;color:var(--text-faint);}

        .cta-band{padding:80px 0;background:linear-gradient(135deg,rgba(0,194,122,.06) 0%,rgba(99,102,241,.04) 100%);border-top:1px solid hsl(var(--border));border-bottom:1px solid hsl(var(--border));}
        .cta-band-inner{text-align:center;max-width:640px;margin:0 auto;}
        .cta-band-eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#00a868;margin-bottom:14px;}
        [data-theme="dark"] .cta-band-eyebrow{color:#00c27a;}
        .cta-band-heading{font-size:36px;font-weight:900;letter-spacing:-.04em;line-height:1.15;color:var(--text);margin-bottom:16px;}
        .cta-band-sub{font-size:16px;color:var(--text-soft);line-height:1.65;margin-bottom:32px;}
        .cta-band-actions{display:flex;gap:12px;justify-content:center;margin-bottom:28px;}
        .btn-primary-lg{padding:14px 28px;background:#00c27a;color:#000;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;transition:background .15s;}
        .btn-primary-lg:hover{background:#00a868;}
        .btn-ghost-lg{padding:14px 28px;background:transparent;color:var(--text-soft);border:1px solid hsl(var(--border));border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;transition:all .15s;}
        .btn-ghost-lg:hover{border-color:#00c27a;color:var(--text);}
        .cta-band-social-proof{display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;color:var(--text-soft);}
        .cta-band-avatars{display:flex;}
        .cta-avatar{width:28px;height:28px;border-radius:50%;border:2px solid var(--bg);margin-right:-8px;font-size:10px;font-weight:700;}
        .cta-band-avatars .cta-avatar:last-child{margin-right:0;}

        @media(max-width:1100px){
          .blog-layout{grid-template-columns:1fr !important;}
          .toc-wrap,.sidebar-wrap{position:static !important;max-height:none !important;}
          .toc-wrap{display:none;}
        }
        @media(max-width:767px){
          .related-grid{grid-template-columns:1fr;}
          .cta-band-heading{font-size:26px;}
          .cta-band-actions{flex-direction:column;align-items:center;}
          .hero-split{grid-template-columns:1fr !important;}
        }
      `}</style>

      {/* â•â•â• NAVBAR â•â•â• */}
      <nav id="navbar">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="serpely-homepage-v4.html" className="flex items-center flex-shrink-0">
            <img src="/Serpely Logo PNG/Serpely - Logo_Logo - Main.png" alt="Serpely" className="h-9 w-auto brand-logo" />
          </a>
          <div className="hidden lg:flex items-center gap-1">
            <div className="nav-item">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
                style={{ color: "var(--text-soft)", letterSpacing: "-0.012em" }}
                onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-soft)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Why Serpely<svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>
              </button>
              <div className="dropdown-menu mega" style={{ left: "0", transform: "none", minWidth: "640px" }}>
                <div className="mega-grid">
                  <div className="mega-col">
                    <div className="mega-title">Explore</div>
                    <a className="mega-link" href="serpely-homepage-v4.html#how-it-works"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><circle cx="12" cy="12" r="3.5"/></svg></div><div className="dd-text"><strong>How It Works</strong><span>Continuous SEO workflow</span></div></a>
                    <a className="mega-link" href="serpely-homepage-v4.html#features"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2z"/><path d="M9 5v12"/><path d="M15 7v12"/></svg></div><div className="dd-text"><strong>Product Roadmap</strong><span>What's coming next</span></div></a>
                    <a className="mega-link" href="serpely-homepage-v4.html#testimonials"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.47L21 9.4l-4.5 4.39L17.54 21 12 18.1 6.46 21l1.04-7.21L3 9.4l6.3-.93z"/></svg></div><div className="dd-text"><strong>Customer Stories</strong><span>Real results from real teams</span></div></a>
                  </div>
                  <div className="mega-col">
                    <div className="mega-title">Compare</div>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg></div><div className="dd-text"><strong>Serpely vs Semrush</strong></div></a>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg></div><div className="dd-text"><strong>Serpely vs Ahrefs</strong></div></a>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg></div><div className="dd-text"><strong>Serpely vs Surfer SEO</strong></div></a>
                    <a className="mega-footer" href="#">See all comparisons<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
                  </div>
                </div>
              </div>
            </div>
            <div className="nav-item">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
                style={{ color: "var(--text-soft)", letterSpacing: "-0.012em" }}
                onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-soft)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Product<svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>
              </button>
              <div className="dropdown-menu mega">
                <div className="mega-grid">
                  <div className="mega-col">
                    <div className="mega-title">Features</div>
                    <a className="mega-link" href="serpely-homepage-v4.html#features"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M7 15V9"/><path d="M12 15V5"/><path d="M17 15v-3"/></svg></div><div className="dd-text"><strong>AI Rank Tracking</strong><span>Track Google, AI Overviews, and LLM visibility.</span></div></a>
                    <a className="mega-link" href="serpely-homepage-v4.html#features"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M12 3a9 9 0 0 1 0 18"/><path d="M12 3a9 9 0 0 0 0 18"/></svg></div><div className="dd-text"><strong>GEO Monitoring</strong><span>See citation visibility across AI search surfaces.</span></div></a>
                    <a className="mega-link" href="serpely-homepage-v4.html#features"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M7 12h10"/><path d="M9 17h6"/></svg></div><div className="dd-text"><strong>Technical Site Audit</strong><span>Monitor crawl issues, vitals, and schema health.</span></div></a>
                    <a className="mega-footer" href="serpely-homepage-v4.html#features">See All Features â†’</a>
                  </div>
                  <div className="mega-col">
                    <div className="mega-title">Integrations</div>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><svg viewBox="0 0 24 24" className="no-invert" fill="none"><path d="M10 4a6 6 0 0 1 6 6h-6V4z" fill="#EA4335"/><path d="M16 10a6 6 0 0 1-6 6v-6h6z" fill="#FBBC04"/><path d="M10 16a6 6 0 0 1-6-6h6v6z" fill="#34A853"/><path d="M4 10a6 6 0 0 1 6-6v6H4z" fill="#4285F4"/><circle cx="10" cy="10" r="2" fill="#FFFFFF"/><path d="M14.5 14.5l5.5 5.5" stroke="#5F6368" strokeWidth="2.2" strokeLinecap="round"/></svg></div><div className="dd-text"><strong>Google Search Console</strong></div></a>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><img src="/Other Logos/Logo_Google_Analytics.svg.png" alt="GA4"/></div><div className="dd-text"><strong>Google Analytics 4</strong></div></a>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><img src="/Other Logos/dataforseo.webp" alt="DataForSEO"/></div><div className="dd-text"><strong>DataForSEO</strong></div></a>
                    <a className="mega-footer" href="#">All Integrations â†’</a>
                  </div>
                </div>
              </div>
            </div>
            <div className="nav-item">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
                style={{ color: "var(--text)", background: "var(--bg-subtle)", letterSpacing: "-0.012em" }}
                onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
              >
                Resources<svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>
              </button>
              <div className="dropdown-menu">
                <a href="serpely-blog.html"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg></div><div className="dd-text">Blog<span>SEO &amp; GEO insights</span></div></a>
                <a href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M8 12l2 2 4-4"/><path d="M4 7h5l2 2h3l2-2h4"/><path d="M4 17h16"/></svg></div><div className="dd-text">Affiliate Program<span>Earn 30% recurring</span></div></a>
                <a href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"/><path d="M12 17h.01"/></svg></div><div className="dd-text">FAQ<span>Common questions answered</span></div></a>
                <a href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg></div><div className="dd-text">Technical Docs<span>API &amp; integration guides</span></div></a>
                <div className="dropdown-divider"></div>
                <a href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div className="dd-text">Feedback<span>Shape the product</span></div></a>
              </div>
            </div>
            <a href="#" className="btn-audit ml-1"><span className="audit-pulse"></span>Free Site Audit</a>
            <a
              href="serpely-homepage-v4.html#pricing"
              className="px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
              style={{ color: "var(--text-soft)", letterSpacing: "-0.012em" }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-soft)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >Pricing</a>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="theme-toggle" id="theme-toggle" aria-label="Toggle theme" onClick={toggleTheme}>
              <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <a href="#" className="hidden sm:block text-[14px] font-semibold transition-colors px-3 py-2" style={{ color: "var(--text-soft)", letterSpacing: "-0.012em" }} onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }} onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-soft)"; }}>Login</a>
            <a href="#" className="btn-accent" style={{ padding: "9px 16px", fontSize: "13.5px" }}>Start Free Trial<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
          </div>
        </div>
      </nav>

      {/* â•â•â• MAIN â•â•â• */}
      <main className="pt-24 pb-0">
        <div className="max-w-7xl mx-auto px-6">

          {/* Breadcrumb */}
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="bc-item"><Link to="/blog">Blog</Link></span>
            <span className="bc-sep">â€º</span>
            <span className="bc-item"><a href="#">{data.tagLabel}</a></span>
            <span className="bc-sep">â€º</span>
            <span className="bc-item bc-current">{data.title}</span>
          </nav>

          {/* Hero Card */}
          <div className="hero-card">
            <div className="hero-split">
              <div className="hero-img-wrap">
                {data.coverImage ? (
                  <img src={data.coverImage} alt={data.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }} />
                ) : (
                  <>
                    <div className="hero-img-grid"></div>
                    <div className="hero-img-center">
                      <div className="hero-img-badge">
                        <strong>{data.title}</strong>
                        <span>{data.tagLabel}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(6px)", borderRadius: "8px", padding: "6px 12px", border: "1px solid rgba(0,194,122,0.2)" }}>
                        <img src="/Serpely Logo PNG/Serpely - Logo_Logo - Main.png" alt="Serpely" style={{ height: "18px", width: "auto", filter: "none" }} />
                      </div>
                    </div>
                  </>
                )}
                <span className="hero-cat-overlay" style={{ zIndex: 2 }}>{data.tagLabel}</span>
              </div>
              <div className="hero-right">
                <div className="hero-cats">
                  <span className={`hero-tag${data.tagAccent ? "" : " hero-tag-neutral"}`}>{data.tagLabel}</span>
                </div>
                <h1 className="hero-title">{data.title}</h1>
                <p className="hero-excerpt">{data.excerpt}</p>
                <div className="hero-meta">
                  <div className="hero-avatar">{data.authorInitials || '??'}</div>
                  <span className="hero-meta-name">{data.author}</span>
                  <span className="hero-meta-sep">Â·</span>
                  <span className="hero-meta-date">{formattedDate}</span>
                  <span className="hero-meta-sep">Â·</span>
                  <span className="hero-meta-read">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {readTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Strip */}
            <div className="hero-actions">
              <div className="actions-label">Quick actions</div>
              <div className="actions-row">
                <button className="summarize-btn" onClick={toggleSummarize}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 10h16M4 14h10"/></svg>
                  Summarize this article
                </button>
                <div className="actions-sep"></div>
                <span className="actions-ask-label">Ask AI</span>
                <button className="ai-pill" onClick={() => askAI("chatgpt")}>
                  <span className="ai-dot" style={{ background: "#10a37f" }}></span>ChatGPT
                </button>
                <button className="ai-pill" onClick={() => askAI("claude")}>
                  <span className="ai-dot" style={{ background: "#c96a35" }}></span>Claude
                </button>
                <button className="ai-pill" onClick={() => askAI("google")}>
                  <span className="ai-dot" style={{ background: "#4285F4" }}></span>Google AI Mode
                </button>
                <button className="ai-pill" onClick={() => askAI("deepseek")}>
                  <span className="ai-dot" style={{ background: "#5ba3d9" }}></span>DeepSeek
                </button>
              </div>
              {/* Summarize expand panel */}
              <div className="summarize-panel" id="summarize-panel">
                <div className="sp-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                  AI Summary
                </div>
                <p className="sp-text">{data.excerpt}</p>
              </div>
            </div>
          </div>

          {/* Three-column reading zone */}
          <div className="blog-layout">

            {/* LEFT: Sticky TOC */}
            <aside className="toc-wrap">
              <div className="toc-card">
                <div className="toc-head">Table of contents</div>
                <div className="toc-prog-wrap"><div className="toc-prog-fill" id="toc-progress"></div></div>
                <ul className="toc-list" id="toc-list">
                  {headings.length > 0 ? headings.map(h => (
                    <li key={h.id} className={h.level === 3 ? 'toc-sub' : ''}>
                      <a href={`#${h.id}`} className="toc-link"><span className="toc-dot"></span>{h.text}</a>
                    </li>
                  )) : (
                    <li style={{ padding: '5px 7px', fontSize: 11.5, color: 'var(--text-ghost)' }}>No sections yet</li>
                  )}
                </ul>
              </div>
            </aside>

            {/* CENTER: Article Body */}
            <article className="article-body" id="article-body">

              {/* Dynamic body from TipTap editor */}
              <div dangerouslySetInnerHTML={{ __html: processedBody }} />

              {/* Author Bio */}
              <div className="author-card">
                <div className="author-avatar">{data.authorInitials || '??'}</div>
                <div>
                  <div className="author-name">{data.author}</div>
                  <div className="author-role">{data.tagLabel}</div>
                </div>
              </div>

              {/* Tags + Share */}
              <div className="article-tags-row">
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <span className="article-tag article-tag-green">{data.tagLabel}</span>
                  {data.category && <span className="article-tag">{data.category}</span>}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="share-inline-btn" onClick={() => window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(data.title) + "&url=" + encodeURIComponent(window.location.href))}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"/></svg>Share on X
                  </button>
                  <button className="share-inline-btn" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Copy link
                  </button>
                </div>
              </div>

            </article>

            {/* RIGHT: Sticky Sidebar */}
            <aside className="sidebar-wrap">

              {/* Share card */}
              <div className="sidebar-card">
                <div className="sidebar-card-title">Share this article</div>
                <div className="sidebar-share-btns">
                  <a className="sidebar-share-btn twitter" href="#" onClick={(e) => { e.preventDefault(); window.open("https://twitter.com/intent/tweet?text=Generative Engine Optimization (GEO): How to Rank in AI Search&url=" + encodeURIComponent(window.location.href)); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"/></svg>
                    Share on X
                  </a>
                  <a className="sidebar-share-btn linkedin" href="#" onClick={(e) => { e.preventDefault(); window.open("https://www.linkedin.com/shareArticle?mini=true&url=" + encodeURIComponent(window.location.href) + "&title=Generative Engine Optimization (GEO)"); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                    LinkedIn
                  </a>
                  <a className="sidebar-share-btn copy" href="#" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(window.location.href); (e.currentTarget as HTMLElement).textContent = "âœ“ Copied!"; setTimeout(() => { (e.currentTarget as HTMLElement).innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy link'; }, 2000); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Copy link
                  </a>
                </div>
              </div>

              {/* Newsletter lead capture */}
              <div className="sidebar-card sidebar-newsletter">
                <div className="sidebar-newsletter-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <div className="sidebar-newsletter-heading">AI Search Weekly</div>
                <p className="sidebar-newsletter-sub">GEO tactics, AI visibility updates, and Serpely tips â€” straight to your inbox.</p>
                <form className="sidebar-newsletter-form" onSubmit={handleNewsletterSubmit}>
                  <input type="email" placeholder="Your email address" required />
                  <button type="submit">Subscribe Free</button>
                </form>
                <p className="sidebar-newsletter-note">No spam. Unsubscribe anytime.</p>
              </div>

              {/* Topics / Tags */}
              <div className="sidebar-card">
                <div className="sidebar-card-title">Topics</div>
                <div className="sidebar-tags-cloud">
                  <a href="#" className="stag stag-green">GEO</a>
                  <a href="#" className="stag stag-green">AI Search</a>
                  <a href="#" className="stag">AEO</a>
                  <a href="#" className="stag">LLM Visibility</a>
                  <a href="#" className="stag">SEO Strategy</a>
                  <a href="#" className="stag">Content Marketing</a>
                  <a href="#" className="stag">Structured Data</a>
                  <a href="#" className="stag">Entity SEO</a>
                </div>
              </div>

              {/* Mini CTA */}
              <div className="sidebar-card sidebar-cta-card">
                <div className="sidebar-cta-badge">Free Tool</div>
                <div className="sidebar-cta-heading">See how visible you are in AI search</div>
                <p className="sidebar-cta-sub">Serpely tracks your brand mentions across ChatGPT, Claude, Gemini, and Perplexity â€” so you know exactly where you stand.</p>
                <a href="#" className="sidebar-cta-btn">Audit Your AI Visibility â†’</a>
              </div>

            </aside>

          </div>{/* /.blog-layout */}
        </div>{/* /.container */}
      </main>

      {relatedPosts.length > 0 && (
      <section className="related-section">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="related-header">
            <h2 className="related-title">Keep Reading</h2>
            <Link to="/blog" className="related-all-link">View all articles &rarr;</Link>
          </div>
          <div className="related-grid">
            {relatedPosts.map(p => (
              <article key={p.slug} className="related-card">
                <Link to={`/blog/${p.slug}`} className="related-card-img-wrap">
                  <div className="related-card-img" style={{ background: 'linear-gradient(135deg,#0a0a0a,#1a1a2e)' }}>
                    {p.coverImage
                      ? <img src={p.coverImage} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#fff', fontSize: 32 }}>&#128203;</div>
                    }
                  </div>
                </Link>
                <div className="related-card-body">
                  <span className="related-card-tag related-card-tag-green">{p.tagLabel}</span>
                  <h3 className="related-card-title"><Link to={`/blog/${p.slug}`}>{p.title}</Link></h3>
                  <p className="related-card-excerpt">{p.excerpt}</p>
                  <div className="related-card-meta">
                    <span>{p.author}</span>
                    <span>&middot;</span>
                    <span>{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* â•â•â• MAIN CTA BAND â•â•â• */}
      <section className="cta-band">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="cta-band-inner">
            <div className="cta-band-eyebrow">Start for free â€” no credit card needed</div>
            <h2 className="cta-band-heading">See exactly where your brand appears in AI search</h2>
            <p className="cta-band-sub">Serpely tracks your visibility across ChatGPT, Claude, Google AI Mode, and Perplexity. Know when you are cited, when you are missing, and how to close the gap.</p>
            <div className="cta-band-actions">
              <a href="#" className="btn-primary-lg">Start Free Audit â†’</a>
              <a href="#" className="btn-ghost-lg">See How It Works</a>
            </div>
            <div className="cta-band-social-proof">
              <div className="cta-band-avatars">
                <div className="cta-avatar" style={{ background: "#00c27a", fontSize: "11px", fontWeight: 700, color: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>RN</div>
                <div className="cta-avatar" style={{ background: "#6366f1", fontSize: "11px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>JK</div>
                <div className="cta-avatar" style={{ background: "#ec4899", fontSize: "11px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>SM</div>
                <div className="cta-avatar" style={{ background: "#f59e0b", fontSize: "11px", fontWeight: 700, color: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>AL</div>
                <div className="cta-avatar" style={{ background: "#3b82f6", fontSize: "11px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>PW</div>
              </div>
              <span>Joined by <strong>2,400+</strong> marketers tracking AI visibility</span>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}

