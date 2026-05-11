import { useState, useRef, useEffect, useCallback } from 'react';
import { blogPosts, type BlogPostData as Article } from '@/data/blogPosts';
import { getPosts } from '@/lib/api';
import { Link } from 'react-router-dom';
/* ─── Inline Styles ─── */
const globalStyles = `
  @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,800,900&display=swap');

  :root {
    --bg: #FFFFFF;
    --bg-subtle: #FAFAFA;
    --bg-elevated: #FFFFFF;
    --text: #0A0A0A;
    --text-mid: #404040;
    --text-soft: #525252;
    --text-faint: #737373;
    --text-ghost: #A3A3A3;
    --border: #E5E5E5;
    --border-soft: #F0F0F0;
    --grid: rgba(0, 194, 122, 0.07);
    --grid-strong: rgba(0, 194, 122, 0.11);
    --card-bg: #FFFFFF;
    --card-shadow: 0 2px 8px rgba(10,10,10,0.03);
    --shadow-hover: 0 12px 32px rgba(10, 10, 10, 0.06);
    --tag-bg: #F5F5F5;
    --input-bg: #FFFFFF;
    --logo-filter: none;
    --cielo-light-display: block;
    --cielo-dark-display: none;
  }
  [data-theme="dark"] {
    --bg: #060606;
    --bg-subtle: #0F0F10;
    --bg-elevated: #15151A;
    --text: #FAFAFA;
    --text-mid: #D4D4D8;
    --text-soft: #A1A1AA;
    --text-faint: #71717A;
    --text-ghost: #52525B;
    --border: #1F1F22;
    --border-soft: #16161A;
    --grid: rgba(0, 255, 136, 0.045);
    --grid-strong: rgba(0, 255, 136, 0.075);
    --card-bg: #101013;
    --card-shadow: 0 2px 8px rgba(0,0,0,0.3);
    --shadow-hover: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,255,136,0.06);
    --tag-bg: #1A1A1F;
    --input-bg: #15151A;
    --logo-filter: brightness(0) invert(1);
    --cielo-light-display: none;
    --cielo-dark-display: block;
  }

  * { box-sizing: border-box; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; min-width: 0; }
  html, body { max-width: 100vw; overflow-x: hidden; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Satoshi', sans-serif;
    background: var(--bg);
    color: var(--text);
    font-feature-settings: "ss01" 1, "cv11" 1;
    transition: background 0.25s ease, color 0.25s ease;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 64px 64px;
    background-position: -1px -1px;
  }
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background-image:
      linear-gradient(var(--grid-strong) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-strong) 1px, transparent 1px);
    background-size: 256px 256px;
    background-position: -1px -1px;
  }

  nav, main, section, footer { position: relative; z-index: 1; }

  h1, h2, h3, h4 {
    font-family: 'Satoshi', sans-serif;
    color: var(--text);
    letter-spacing: -0.04em;
  }

  a { color: inherit; text-decoration: none; }
  .brand-logo { filter: var(--logo-filter); transition: filter 0.25s ease; }

  .grad-text {
    background: linear-gradient(135deg, #00C27A 0%, #00A868 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  [data-theme="dark"] .grad-text {
    background: linear-gradient(135deg, #00FF88 0%, #00C27A 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ── Navbar ── */
  #navbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    background: color-mix(in srgb, var(--bg) 78%, transparent);
    backdrop-filter: blur(20px) saturate(150%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.25s;
  }
  #navbar.scrolled {
    border-bottom-color: hsl(var(--border));
    box-shadow: 0 2px 12px rgba(10,10,10,0.04);
  }

  .nav-item { position: relative; }
  .nav-item::after { content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 4px; }
  .nav-item:hover .dropdown-menu {
    display: block; opacity: 1; pointer-events: all;
    transform: translateX(-50%) translateY(0);
  }
  .nav-item:first-child:hover .dropdown-menu { transform: translateY(0); }

  .dropdown-menu {
    display: none; opacity: 0; pointer-events: none;
    position: absolute; top: calc(100% + 4px); left: 50%;
    transform: translateX(-50%) translateY(-6px);
    background: var(--card-bg); border: 1px solid hsl(var(--border));
    border-radius: 16px;
    box-shadow: 0 24px 60px rgba(10,10,10,0.10), 0 4px 12px rgba(10,10,10,0.04);
    min-width: 240px; z-index: 9999;
    transition: opacity 0.1s ease, transform 0.1s ease;
    padding: 8px;
  }
  [data-theme="dark"] .dropdown-menu {
    box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,136,0.04);
  }
  .dropdown-menu.mega { min-width: 720px; padding: 18px; border-radius: 20px; }
  .mega-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 22px; }
  .mega-col { display: grid; gap: 6px; align-content: start; }
  .mega-title {
    color: #00A868; font-size: 11px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase;
    margin: 4px 0 6px; padding: 0 10px;
  }
  [data-theme="dark"] .mega-title { color: #00FF88; }
  .mega-link {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 10px; border-radius: 12px; text-decoration: none;
    transition: background 0.14s ease;
  }
  .mega-link:hover { background: var(--bg-subtle); }
  .mega-link strong { display: block; color: var(--text); font-size: 13.5px; font-weight: 700; letter-spacing: -0.012em; }
  .mega-link span { display: block; margin-top: 2px; color: var(--text-faint); font-size: 12px; line-height: 1.5; font-weight: 500; }
  .mega-link.simple { padding: 8px 10px; align-items: center; }
  .mega-link.simple strong { font-size: 13px; }
  .mega-footer {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 12px; color: #00A868; font-size: 12.5px; font-weight: 700;
    text-decoration: none; margin-top: 4px;
    border-top: 1px solid var(--border-soft); padding-top: 12px;
  }
  [data-theme="dark"] .mega-footer { color: #00FF88; }
  .dropdown-menu a:not(.mega-link):not(.mega-footer) {
    display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;
    border-radius: 10px; color: var(--text); text-decoration: none;
    font-size: 13.5px; font-weight: 600;
    transition: background 0.12s, color 0.12s;
  }
  .dropdown-menu a:not(.mega-link):not(.mega-footer):hover { background: var(--bg-subtle); color: #00A868; }
  [data-theme="dark"] .dropdown-menu a:not(.mega-link):not(.mega-footer):hover { color: #00FF88; }
  .dropdown-menu .dd-icon {
    width: 32px; height: 32px; border-radius: 9px;
    background: var(--bg-subtle); border: 1px solid hsl(var(--border));
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px; overflow: hidden;
  }
  .dd-icon svg { width: 15px; height: 15px; stroke: #00A868; stroke-width: 1.9; fill: none; stroke-linecap: round; stroke-linejoin: round; }
  [data-theme="dark"] .dd-icon svg:not(.no-invert) { stroke: #00FF88; }
  .dd-icon img { width: 16px; height: 16px; object-fit: contain; }
  .dropdown-menu .dd-text { display: flex; flex-direction: column; }
  .dropdown-menu .dd-text span { font-size: 11.5px; font-weight: 500; color: var(--text-faint); margin-top: 1px; }
  .dropdown-divider { height: 1px; background: var(--border-soft); margin: 6px 4px; }

  .btn-accent {
    display: inline-flex; align-items: center; gap: 8px;
    background: #00C27A; color: #0A0A0A; font-weight: 700;
    padding: 11px 20px; border-radius: 10px; font-size: 14px;
    letter-spacing: -0.012em;
    transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
    border: 1px solid #00C27A; box-shadow: 0 4px 16px rgba(0,194,122,0.20);
  }
  .btn-accent:hover { background: #00E08F; border-color: #00E08F; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,194,122,0.28); }

  .btn-audit {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--card-bg); border: 1px solid var(--text);
    color: var(--text); font-weight: 700; padding: 8px 14px;
    border-radius: 9px; font-size: 13px; letter-spacing: -0.012em;
    transition: background 0.15s, color 0.15s, transform 0.15s;
  }
  .btn-audit:hover { background: var(--text); color: var(--bg); transform: translateY(-1px); }
  .audit-pulse {
    width: 6px; height: 6px; border-radius: 50%; background: #00C27A;
    box-shadow: 0 0 0 0 rgba(0,194,122,0.6);
    animation: auditPulse 2s ease infinite; flex-shrink: 0;
  }
  @keyframes auditPulse {
    0% { box-shadow: 0 0 0 0 rgba(0,194,122,0.6); }
    70% { box-shadow: 0 0 0 8px rgba(0,194,122,0); }
    100% { box-shadow: 0 0 0 0 rgba(0,194,122,0); }
  }

  .theme-toggle {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--card-bg); border: 1px solid hsl(var(--border));
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-soft);
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .theme-toggle:hover { border-color: var(--text-soft); color: var(--text); }
  .theme-toggle svg { width: 16px; height: 16px; }
  .theme-toggle .icon-moon { display: none; }
  [data-theme="dark"] .theme-toggle .icon-sun { display: none; }
  [data-theme="dark"] .theme-toggle .icon-moon { display: block; }

  /* ── Shared components ── */
  .pill {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--card-bg); border: 1px solid hsl(var(--border));
    color: var(--text-mid); border-radius: 999px; padding: 8px 16px;
    font-size: 13.5px; font-weight: 600; letter-spacing: -0.005em;
    box-shadow: var(--card-shadow);
  }
  .pill-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #00C27A; box-shadow: 0 0 10px rgba(0,194,122,0.5);
    animation: pulse 2s ease infinite; flex-shrink: 0;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }

  .card {
    background: var(--card-bg); border: 1px solid hsl(var(--border));
    border-radius: 16px;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s, background 0.25s;
  }
  .card-hover:hover {
    border-color: color-mix(in srgb, var(--text) 18%, transparent);
    box-shadow: var(--shadow-hover); transform: translateY(-2px);
  }

  .tag {
    display: inline-flex; align-items: center; width: fit-content;
    border-radius: 8px; border: 1px solid hsl(var(--border));
    background: var(--tag-bg); color: var(--text-soft);
    padding: 5px 9px; font-size: 11.5px; font-weight: 800;
    letter-spacing: 0.02em; text-transform: uppercase;
  }
  .tag-accent {
    background: rgba(0,194,122,0.09); border-color: rgba(0,194,122,0.26); color: #008451;
  }
  [data-theme="dark"] .tag-accent {
    background: rgba(0,255,136,0.10); border-color: rgba(0,255,136,0.30); color: #00FF88;
  }

  .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .reveal.visible { opacity: 1; transform: translateY(0); }

  /* ── Blog-specific ── */
  .featured-card {
    overflow: hidden; border-color: rgba(0,194,122,0.3);
    box-shadow: 0 0 0 4px rgba(0,194,122,0.06), 0 18px 46px rgba(0,194,122,0.10);
  }
  [data-theme="dark"] .featured-card {
    border-color: rgba(0,255,136,0.28);
    box-shadow: 0 0 0 4px rgba(0,255,136,0.04), 0 22px 55px rgba(0,0,0,0.48);
  }
  .featured-visual {
    min-height: 182px; border-bottom: 1px solid hsl(var(--border));
    background:
      radial-gradient(circle at 72% 22%, rgba(0,194,122,0.20), transparent 27%),
      linear-gradient(135deg, color-mix(in srgb, var(--card-bg) 86%, #00C27A 14%), var(--bg-subtle));
    position: relative; overflow: hidden;
  }
  .featured-visual::before {
    content: ''; position: absolute; inset: 18px;
    border-radius: 18px; border: 1px solid rgba(0,194,122,0.22);
    background-image:
      linear-gradient(rgba(0,194,122,0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,194,122,0.12) 1px, transparent 1px);
    background-size: 28px 28px;
  }
  .signal-line { position: absolute; left: 38px; right: 38px; bottom: 42px; height: 84px; }
  .signal-line svg { width: 100%; height: 100%; overflow: visible; }
  .hero-posts-shell { position: relative; padding-top: 52px; }
  .hero-posts-controls {
    position: absolute; top: 0; right: 0; display: flex; align-items: center; gap: 10px;
    z-index: 3;
  }
  .hero-post-nav {
    width: 42px; height: 42px; border-radius: 999px; border: 1px solid rgba(0,194,122,0.2);
    background: color-mix(in srgb, var(--card-bg) 90%, transparent);
    color: var(--text); display: inline-flex; align-items: center; justify-content: center;
    box-shadow: var(--card-shadow);
    transition: transform 0.16s ease, border-color 0.16s ease, color 0.16s ease, opacity 0.16s ease;
  }
  .hero-post-nav:hover {
    transform: translateY(-1px);
    border-color: rgba(0,194,122,0.38);
    color: #008451;
  }
  .hero-post-nav:disabled {
    opacity: 0.45; cursor: default; transform: none;
  }
  [data-theme="dark"] .hero-post-nav:hover { color: #00FF88; }
  .hero-posts-rail {
    display: flex; gap: 18px; overflow-x: auto; padding: 10px 56px 16px 4px;
    scroll-snap-type: x mandatory; scrollbar-width: none; scroll-behavior: smooth;
  }
  .hero-posts-rail::-webkit-scrollbar { display: none; }
  .hero-post-card {
    min-width: calc(100% - 44px); max-width: calc(100% - 44px);
    scroll-snap-align: start; flex: 0 0 auto;
  }
  .hero-post-card .featured-visual {
    min-height: 138px;
  }
  .hero-post-card h2 {
    font-size: clamp(1.85rem, 2.35vw, 2.7rem);
    line-height: 0.98;
  }
  .hero-post-card .article-arrow {
    width: 32px; height: 32px;
  }
  .hero-post-card .hero-post-summary {
    font-size: 14px; line-height: 1.55; max-width: 28rem;
  }
  .hero-post-card.secondary .featured-visual {
    min-height: 114px;
  }
  .hero-post-card.secondary .signal-line {
    left: 24px; right: 24px; bottom: 28px; height: 60px;
  }
  .hero-post-card.secondary h3 {
    font-size: 1.75rem; line-height: 1.06;
  }
  .hero-post-card.secondary p {
    font-size: 14px;
  }

  .category-tabs {
    display: flex; gap: 8px; overflow-x: auto; padding: 8px;
    border: 1px solid hsl(var(--border));
    background: color-mix(in srgb, var(--card-bg) 88%, transparent);
    border-radius: 16px; box-shadow: var(--card-shadow); scrollbar-width: none;
  }
  .category-tabs::-webkit-scrollbar { display: none; }
  .category-btn {
    flex: 0 0 auto; border: 1px solid transparent; border-radius: 11px;
    padding: 9px 14px; background: transparent; color: var(--text-soft);
    font-size: 13.5px; font-weight: 800;
    transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
  }
  .category-btn:hover { background: var(--bg-subtle); color: var(--text); }
  .category-btn.active {
    background: rgba(0,194,122,0.10); border-color: rgba(0,194,122,0.28); color: #008451;
  }
  [data-theme="dark"] .category-btn.active {
    background: rgba(0,255,136,0.10); border-color: rgba(0,255,136,0.28); color: #00FF88;
  }

  .article-card { display: flex; flex-direction: column; overflow: hidden; padding: 0 !important; }
  .article-card[hidden] { display: none; }
  .article-topline { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; }
  .article-arrow {
    width: 34px; height: 34px; border-radius: 10px; border: 1px solid hsl(var(--border));
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--text-soft); transition: border-color 0.16s, color 0.16s, transform 0.16s;
    flex-shrink: 0;
  }
  .article-card:hover .article-arrow, .featured-card:hover .article-arrow {
    border-color: #00C27A; color: #00A868; transform: translateX(2px);
  }
  [data-theme="dark"] .article-card:hover .article-arrow,
  [data-theme="dark"] .featured-card:hover .article-arrow { color: #00FF88; }

  .article-thumb {
    position: relative; aspect-ratio: 16 / 9; width: 100%;
    border-bottom: 1px solid hsl(var(--border));
    background:
      radial-gradient(circle at 78% 28%, rgba(0,194,122,0.18), transparent 32%),
      linear-gradient(135deg, color-mix(in srgb, var(--card-bg) 88%, #00C27A 12%), var(--bg-subtle));
    overflow: hidden;
  }
  .article-thumb::before {
    content: ''; position: absolute; inset: 14px;
    border-radius: 14px;
    border: 1px solid rgba(0,194,122,0.18);
    background-image:
      linear-gradient(rgba(0,194,122,0.10) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,194,122,0.10) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  .article-thumb .thumb-tag {
    position: absolute; top: 14px; left: 14px; z-index: 3;
  }
  .article-thumb .thumb-icon {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    color: rgba(0,168,104,0.55); z-index: 1;
  }
  [data-theme="dark"] .article-thumb .thumb-icon { color: rgba(0,255,136,0.5); }
  .article-thumb .thumb-icon svg { width: 56px; height: 56px; stroke-width: 1.6; }

  .article-body {
    padding: 22px 22px 20px;
    display: flex; flex-direction: column; flex: 1;
  }
  .article-body h3 {
    font-family: 'Satoshi', sans-serif; font-weight: 900;
    font-size: 1.25rem; line-height: 1.18; margin-bottom: 10px;
    letter-spacing: -0.025em;
  }
  .article-body p {
    font-size: 13.5px; line-height: 1.55; font-weight: 500;
    color: var(--text-soft); margin-bottom: 18px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .article-meta {
    margin-top: auto; display: flex; align-items: center; justify-content: space-between;
    gap: 10px; padding-top: 14px; border-top: 1px solid var(--border-soft);
  }
  .article-author { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .author-avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #00C27A, #00A868);
    color: #052014; font-size: 11px; font-weight: 900;
    display: flex; align-items: center; justify-content: center;
    letter-spacing: -0.01em;
  }
  .author-text { display: flex; flex-direction: column; min-width: 0; }
  .author-name {
    font-size: 12.5px; font-weight: 800; color: var(--text);
    letter-spacing: -0.01em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .article-date {
    font-size: 11.5px; font-weight: 600; color: var(--text-faint);
  }

  .resource-chip {
    display: flex; align-items: center; gap: 12px;
    border: 1px solid hsl(var(--border)); background: var(--card-bg);
    border-radius: 14px; padding: 14px 16px;
    transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  }
  .resource-chip:hover { border-color: rgba(0,194,122,0.42); box-shadow: var(--shadow-hover); transform: translateY(-1px); }
  .resource-icon {
    width: 34px; height: 34px; flex: 0 0 auto; border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(0,194,122,0.10); border: 1px solid rgba(0,194,122,0.24); color: #00A868;
  }
  [data-theme="dark"] .resource-icon { color: #00FF88; }

  .blog-hero-wrap {
    display: grid; grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
    gap: 44px; align-items: start;
  }
  .blog-hero-copy { max-width: 690px; }
  .hero-learn-link {
    display: inline-flex; align-items: center; gap: 8px;
    color: #008451; font-size: 13px; font-weight: 800; letter-spacing: -0.01em;
    margin: -4px 0 22px; transition: color 0.16s ease, transform 0.16s ease;
  }
  .hero-learn-link:hover { color: #00A868; transform: translateY(-1px); }
  [data-theme="dark"] .hero-learn-link { color: #00FF88; }

  .knowledge-search { position: relative; max-width: 720px; }
  .knowledge-search input {
    width: 100%; height: 56px; border-radius: 16px; border: 1px solid hsl(var(--border));
    background: color-mix(in srgb, var(--card-bg) 92%, transparent);
    color: var(--text); padding: 0 156px 0 22px; font-size: 15px; font-weight: 600;
    box-shadow: var(--card-shadow); transition: border-color 0.16s, box-shadow 0.16s, background 0.16s;
    font-family: 'Satoshi', sans-serif;
  }
  .knowledge-search input::placeholder { color: var(--text-ghost); font-size: 0.86em; font-weight: 500; opacity: 0.82; }
  .knowledge-search input:focus { outline: none; border-color: #00C27A; box-shadow: 0 0 0 4px rgba(0,194,122,0.10), var(--card-shadow); }
  .search-kbd {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    height: 40px; display: inline-flex; align-items: center; gap: 8px;
    border-radius: 12px; border: 1px solid rgba(0,194,122,0.22);
    background: linear-gradient(135deg, #00C27A, #00E08F);
    color: #052014; padding: 0 14px; font-size: 12.5px; font-weight: 900;
    letter-spacing: -0.01em; box-shadow: 0 12px 26px rgba(0,194,122,0.18);
    transition: transform 0.16s ease, filter 0.16s ease, box-shadow 0.16s ease;
  }
  .search-kbd:hover {
    transform: translateY(-50%) translateY(-1px);
    filter: brightness(0.98);
    box-shadow: 0 16px 28px rgba(0,194,122,0.22);
  }
  .hero-suggestions {
    display: flex; flex-wrap: wrap; align-items: center;
    gap: 12px; margin-top: 18px;
  }
  .hero-suggestion {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 14px; border-radius: 999px;
    border: 1px solid rgba(0,194,122,0.16);
    background: color-mix(in srgb, var(--card-bg) 90%, transparent);
    color: var(--text-soft); font-size: 13px; font-weight: 700; letter-spacing: -0.01em;
    box-shadow: var(--card-shadow);
    transition: transform 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  }
  .hero-suggestion:hover {
    transform: translateY(-1px);
    border-color: rgba(0,194,122,0.3);
    color: var(--text);
  }
  .empty-state {
    display: none; border: 1px dashed hsl(var(--border)); border-radius: 16px;
    padding: 26px; color: var(--text-soft);
    background: color-mix(in srgb, var(--card-bg) 78%, transparent);
  }
  .empty-state.visible { display: block; }

  input[type="email"] {
    background: var(--input-bg); border: 1px solid hsl(var(--border));
    color: var(--text); font-family: 'Satoshi', sans-serif;
  }
  input[type="email"]::placeholder { color: var(--text-ghost); }
  input[type="email"]:focus { outline: none; border-color: #00C27A; box-shadow: 0 0 0 4px rgba(0,194,122,0.10); }

  /* ── Footer ── */
  .footer-link {
    color: var(--text-soft); font-size: 13.5px; font-weight: 600;
    display: block; margin-bottom: 10px; transition: color 0.15s;
  }
  .footer-link:hover { color: #00A868; }
  [data-theme="dark"] .footer-link:hover { color: #00FF88; }

  .ask-ai-btn {
    display: flex; flex-direction: column; align-items: center; gap: 7px;
    background: none; border: none; padding: 0; cursor: pointer;
    transition: transform 0.2s ease;
  }
  .ask-ai-btn:hover { transform: translateY(-4px); }
  .ask-ai-icon {
    width: 50px; height: 50px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid rgba(255,255,255,0.08);
    transition: box-shadow 0.2s ease, border-color 0.2s ease; flex-shrink: 0;
  }
  .ask-ai-btn:hover .ask-ai-icon {
    box-shadow: 0 0 0 2px rgba(0,194,122,0.25), 0 6px 18px rgba(0,0,0,0.3);
    border-color: rgba(0,194,122,0.5);
  }
  .ask-ai-label {
    font-size: 11px; font-weight: 700; color: var(--text-faint);
    letter-spacing: -0.005em; transition: color 0.15s;
  }
  .ask-ai-btn:hover .ask-ai-label { color: var(--text-soft); }
  .footer-links-band {
    background: #E8FAF2; border-radius: 20px; padding: 36px 40px; margin-bottom: 2rem;
  }
  [data-theme="dark"] .footer-links-band { background: rgba(0,255,136,0.05); }

  .cielo-light { display: var(--cielo-light-display); }
  .cielo-dark { display: var(--cielo-dark-display); }

  /* ── Mobile responsive ── */
  @media (max-width: 1023px) {
    .blog-hero-grid { grid-template-columns: 1fr; }
    .blog-hero-wrap { grid-template-columns: 1fr; gap: 28px; }
    .blog-hero-copy { max-width: 860px; text-align: center; }
    .knowledge-search { margin: 0 auto; }
    .hero-suggestions { justify-content: center; }
    .hero-posts-shell { padding-top: 48px; }
    .hero-posts-controls { right: 0; }
    .hero-posts-rail { padding-left: 0; padding-right: 56px; }
    .hero-post-card { min-width: calc(100% - 44px); max-width: calc(100% - 44px); }
    .dropdown-menu.mega { min-width: min(640px, calc(100vw - 48px)); }
  }

  @media (max-width: 767px) {
    section, footer, nav { max-width: 100vw; }
    img, svg { max-width: 100%; }
    section.px-6, footer.px-6, nav .px-6 { padding-left: 1rem !important; padding-right: 1rem !important; }
    h1 { font-size: 2.15rem !important; letter-spacing: -0.04em !important; line-height: 1.08 !important; }
    h2 { font-size: 1.6rem !important; line-height: 1.12 !important; }
    h3 { font-size: 1.05rem !important; }
    main > section { padding-top: 1.25rem !important; padding-bottom: 1.25rem !important; }
    main > section:first-of-type { padding-top: 5.5rem !important; }
    #newsletter { padding-top: 2.5rem !important; padding-bottom: 2.5rem !important; }
    .pill { padding: 6px 12px !important; font-size: 12px !important; margin-bottom: 14px !important; }
    .blog-hero-wrap { gap: 18px !important; }
    .blog-hero-copy { text-align: left !important; }
    .blog-hero-copy p { font-size: 14.5px !important; margin-bottom: 16px !important; line-height: 1.55 !important; }
    .hero-learn-link { margin: 0 0 14px !important; font-size: 12.5px !important; }
    .knowledge-search { margin: 0 !important; max-width: 100% !important; }
    .knowledge-search input { height: 48px !important; padding-right: 108px !important; padding-left: 16px !important; font-size: 13.5px !important; border-radius: 12px !important; }
    .search-kbd { height: 34px !important; padding: 0 12px !important; font-size: 11.5px !important; right: 7px !important; border-radius: 9px !important; }
    .hero-suggestions { gap: 7px !important; margin-top: 14px !important; justify-content: flex-start !important; }
    .hero-suggestion { padding: 6px 11px !important; font-size: 11.5px !important; }
    .hero-posts-shell { padding-top: 44px !important; }
    .hero-posts-rail { padding: 6px 32px 12px 0 !important; gap: 12px !important; }
    .hero-post-card { min-width: calc(100% - 24px) !important; max-width: calc(100% - 24px) !important; }
    .hero-post-card .featured-visual,
    .hero-post-card.secondary .featured-visual { min-height: 110px !important; }
    .hero-post-card h2 { font-size: 1.45rem !important; }
    .hero-post-card.secondary h3 { font-size: 1.2rem !important; }
    .hero-post-card .p-7, .hero-post-card .p-6 { padding: 18px !important; }
    .hero-post-nav { width: 36px !important; height: 36px !important; }
    .featured-card .p-7, .featured-card .lg\\:p-8 { padding: 18px !important; }
    .featured-visual { min-height: 130px !important; }
    #topics .reveal.mb-8 { margin-bottom: 1.25rem !important; }
    .category-tabs { padding: 6px !important; gap: 6px !important; border-radius: 12px !important; }
    .category-btn { padding: 7px 11px !important; font-size: 12px !important; border-radius: 9px !important; }
    .article-body { padding: 12px 12px 12px !important; }
    .article-body h3 { font-size: 0.95rem !important; line-height: 1.18 !important; margin-bottom: 6px !important; letter-spacing: -0.02em !important; }
    .article-body p { font-size: 11.5px !important; -webkit-line-clamp: 2 !important; margin-bottom: 10px !important; line-height: 1.45 !important; }
    .article-thumb { aspect-ratio: 16 / 10 !important; }
    .article-thumb::before { inset: 8px !important; border-radius: 10px !important; background-size: 18px 18px !important; }
    .article-thumb .thumb-icon svg { width: 36px !important; height: 36px !important; }
    .article-thumb .thumb-tag { top: 8px !important; left: 8px !important; padding: 3px 6px !important; font-size: 9px !important; border-radius: 6px !important; letter-spacing: 0.015em !important; }
    .article-meta { padding-top: 9px !important; gap: 6px !important; }
    .article-meta .article-arrow { width: 26px !important; height: 26px !important; border-radius: 7px !important; }
    .author-avatar { width: 22px !important; height: 22px !important; font-size: 9.5px !important; }
    .author-name { font-size: 11px !important; }
    .article-date { font-size: 10px !important; font-weight: 600 !important; }
    .article-author { gap: 7px !important; }
    .resource-chip { padding: 10px 12px !important; }
    .resource-icon { width: 30px !important; height: 30px !important; }
    #newsletter form { gap: 8px !important; }
    nav .h-16 { height: 3.5rem !important; }
    nav .btn-accent { padding: 8px 12px !important; font-size: 12px !important; gap: 5px !important; }
    nav .btn-accent svg { display: none !important; }
    .theme-toggle { width: 34px !important; height: 34px !important; border-radius: 9px !important; }
    .footer-links-band { padding: 20px 14px !important; border-radius: 14px !important; }
    footer .flex.flex-col.lg\\:flex-row { flex-direction: column !important; align-items: flex-start !important; }
    footer .flex-shrink-0.flex.flex-col.items-end { align-items: flex-start !important; text-align: left !important; }
    footer .flex-shrink-0.flex.flex-col.items-end > p { text-align: left !important; font-size: 18px !important; }
    footer .flex.items-center.gap-3.flex-wrap.justify-end { justify-content: flex-start !important; gap: 10px !important; }
    .ask-ai-icon { width: 40px !important; height: 40px !important; }
    .ask-ai-label { font-size: 10px !important; }
    .ask-ai-btn { gap: 5px !important; }
    .dropdown-menu, .dropdown-menu.mega { display: none !important; }
  }

  @media (max-width: 479px) {
    h1 { font-size: 1.85rem !important; line-height: 1.1 !important; }
    h2 { font-size: 1.4rem !important; }
    .footer-links-band .grid { grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
    .article-body { padding: 10px 10px 10px !important; }
    .article-body h3 { font-size: 0.85rem !important; }
    .article-body p { display: none !important; }
    .article-meta { border-top: none !important; padding-top: 4px !important; }
    .author-text .article-date { display: none !important; }
    .hero-post-card h2 { font-size: 1.25rem !important; }
    .hero-post-card.secondary h3 { font-size: 1.05rem !important; }
    .hero-post-card .p-7, .hero-post-card .p-6 { padding: 14px !important; }
    #newsletter form { flex-direction: column !important; }
    #newsletter form button { width: 100% !important; justify-content: center !important; }
    nav .btn-accent { padding: 7px 10px !important; font-size: 11.5px !important; }
  }

  @media (max-width: 359px) {
    .article-author .author-text { display: none !important; }
    .article-meta { justify-content: space-between !important; }
  }

  @media (max-width: 640px) {
    .btn-accent, .btn-secondary { white-space: nowrap; }
  }
`;

/* ─── Helpers ─── */
function askAI(platform: string): void {
  const prompt =
    "Serpely is an agentic SEO platform built for the AI-first web. Website: https://serpely.com — It helps brands get found, cited, and trusted by AI engines like ChatGPT, Perplexity, Gemini, and Google AI Overviews — not just traditional Google Search. Core features include GEO scoring, an autonomous content pipeline, hallucination alerts, and AI citation tracking across all major AI platforms. What makes Serpely unique compared to traditional SEO tools like Semrush or Ahrefs, and which teams would benefit most from using it?";
  const encoded = encodeURIComponent(prompt);
  const urls: Record<string, string> = {
    chatgpt: "https://chatgpt.com/?q=" + encoded,
    claude: "https://claude.ai/new?q=" + encoded,
    perplexity: "https://www.perplexity.ai/?q=" + encoded,
    grok: "https://grok.com/?q=" + encoded,
    gemini: "https://gemini.google.com/app?q=" + encoded,
    deepseek: "https://chat.deepseek.com/?q=" + encoded,
  };
  if (urls[platform]) window.open(urls[platform], "_blank", "noopener,noreferrer");
}

/* ─── Article data (fetched from API, falls back to static) ─── */

/* ─── ArrowSvg ─── */
const ArrowSvg = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

/* ─── Main Component ─── */
export function Blog() {
  const [articles, setArticles] = useState<Article[]>(blogPosts);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    getPosts().then(r => {
      if (r.data.length > 0)
        setArticles(r.data.map(p => ({
          slug: p.slug,
          category: p.category,
          tagLabel: p.tagLabel,
          tagAccent: p.tagAccent,
          thumbIconSvg: '',
          coverImage: p.coverImage || '',
          title: p.title,
          excerpt: p.excerpt,
          initials: p.authorInitials,
          author: p.author,
          date: p.publishedAt
            ? new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '',
        })));
    }).catch(() => {});
  }, []);
  const [scrolled, setScrolled] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const heroRailRef = useRef<HTMLDivElement>(null);
  const [prevDisabled, setPrevDisabled] = useState(true);
  const [nextDisabled, setNextDisabled] = useState(false);

  /* Theme init */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("serpely-theme");
      if (saved === "dark") setIsDark(true);
    } catch (_) {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute("data-theme", "dark");
      try { localStorage.setItem("serpely-theme", "dark"); } catch (_) {}
    } else {
      root.removeAttribute("data-theme");
      try { localStorage.setItem("serpely-theme", "light"); } catch (_) {}
    }
  }, [isDark]);

  /* Scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Reveal observer */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* Hero rail scroll buttons */
  const updateHeroRailButtons = useCallback(() => {
    const rail = heroRailRef.current;
    if (!rail) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setPrevDisabled(rail.scrollLeft <= 8);
    setNextDisabled(rail.scrollLeft >= maxScroll - 8);
  }, []);

  useEffect(() => {
    const rail = heroRailRef.current;
    if (!rail) return;
    rail.addEventListener("scroll", updateHeroRailButtons, { passive: true });
    window.addEventListener("resize", updateHeroRailButtons);
    updateHeroRailButtons();
    return () => {
      rail.removeEventListener("scroll", updateHeroRailButtons);
      window.removeEventListener("resize", updateHeroRailButtons);
    };
  }, [updateHeroRailButtons]);

  const scrollHeroRail = (direction: number) => {
    const rail = heroRailRef.current;
    if (!rail) return;
    const firstCard = rail.querySelector(".hero-post-card") as HTMLElement | null;
    const cardWidth = firstCard
      ? firstCard.getBoundingClientRect().width
      : rail.clientWidth * 0.82;
    rail.scrollBy({ left: direction * (cardWidth + 18), behavior: "smooth" });
  };

  /* Filtered articles */
  const filteredArticles = articles.filter((a) => {
    const filterMatch = activeFilter === "all" || a.category === activeFilter;
    const textMatch =
      !searchQuery ||
      (a.title + a.excerpt + a.author).toLowerCase().includes(searchQuery.toLowerCase());
    return filterMatch && textMatch;
  });

  const categories = [
    { filter: "all", label: "All" },
    { filter: "geo-aeo", label: "GEO & AEO" },
    { filter: "agentic-seo", label: "Agentic SEO" },
    { filter: "ai-seo-tools", label: "AI SEO Tools" },
    { filter: "technical-seo", label: "Technical SEO" },
    { filter: "keyword-strategy", label: "Keyword Strategy" },
    { filter: "llm-seo", label: "LLM SEO" },
    { filter: "reporting", label: "Reporting" },
    { filter: "case-studies", label: "Case Studies" },
    { filter: "product-updates", label: "Product Updates" },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* ═══ NAVBAR ═══ */}
      <nav id="navbar" className={scrolled ? "scrolled" : ""}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="serpely-homepage-v4.html" className="flex items-center flex-shrink-0">
            <img
              src="/Serpely Logo PNG/Serpely - Logo_Logo - Main.png"
              alt="Serpely"
              className="h-9 w-auto brand-logo"
            />
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {/* Why Serpely */}
            <div className="nav-item">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
                style={{ color: "var(--text-soft)", letterSpacing: "-0.012em" }}
                onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-soft)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Why Serpely
                <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4" /></svg>
              </button>
              <div className="dropdown-menu mega" style={{ left: 0, transform: "none" }}>
                <div className="mega-grid">
                  <div className="mega-col">
                    <div className="mega-title">Explore</div>
                    <a className="mega-link" href="serpely-homepage-v4.html#how-it-works">
                      <div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><circle cx="12" cy="12" r="3.5"/></svg></div>
                      <div className="dd-text"><strong>How It Works</strong><span>Continuous SEO workflow</span></div>
                    </a>
                    <a className="mega-link" href="serpely-homepage-v4.html#features">
                      <div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2z"/><path d="M9 5v12"/><path d="M15 7v12"/></svg></div>
                      <div className="dd-text"><strong>Product Roadmap</strong><span>What's coming next</span></div>
                    </a>
                    <a className="mega-link" href="serpely-homepage-v4.html#testimonials">
                      <div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.47L21 9.4l-4.5 4.39L17.54 21 12 18.1 6.46 21l1.04-7.21L3 9.4l6.3-.93z"/></svg></div>
                      <div className="dd-text"><strong>Customer Stories</strong><span>Real results from real teams</span></div>
                    </a>
                  </div>
                  <div className="mega-col">
                    <div className="mega-title">Compare</div>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg></div><div className="dd-text"><strong>Serpely vs Semrush</strong></div></a>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg></div><div className="dd-text"><strong>Serpely vs Ahrefs</strong></div></a>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg></div><div className="dd-text"><strong>Serpely vs Surfer SEO</strong></div></a>
                    <a className="mega-link simple" href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg></div><div className="dd-text"><strong>Serpely vs Clearscope</strong></div></a>
                    <a className="mega-footer" href="#">See all comparisons <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
                  </div>
                </div>
              </div>
            </div>

            {/* Product */}
            <div className="nav-item">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
                style={{ color: "var(--text-soft)", letterSpacing: "-0.012em" }}
                onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-soft)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Product
                <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>
              </button>
              <div className="dropdown-menu mega">
                <div className="mega-grid">
                  <div className="mega-col">
                    <div className="mega-title">Features</div>
                    <a className="mega-link" href="serpely-homepage-v4.html#features">
                      <div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M7 15V9"/><path d="M12 15V5"/><path d="M17 15v-3"/></svg></div>
                      <div className="dd-text"><strong>AI Rank Tracking</strong><span>Track Google, AI Overviews, and LLM visibility from one workspace.</span></div>
                    </a>
                    <a className="mega-link" href="serpely-homepage-v4.html#features">
                      <div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M12 3a9 9 0 0 1 0 18"/><path d="M12 3a9 9 0 0 0 0 18"/></svg></div>
                      <div className="dd-text"><strong>GEO Monitoring</strong><span>See citation visibility and brand presence across AI search surfaces.</span></div>
                    </a>
                    <a className="mega-link" href="serpely-homepage-v4.html#features">
                      <div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M7 12h10"/><path d="M9 17h6"/></svg></div>
                      <div className="dd-text"><strong>Technical Site Audit</strong><span>Continuously monitor crawl issues, vitals, and schema health.</span></div>
                    </a>
                    <a className="mega-link" href="serpely-homepage-v4.html#features">
                      <div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M8 12h8"/><path d="M12 8v8"/><path d="M4.93 19.07a10 10 0 1 1 14.14 0"/></svg></div>
                      <div className="dd-text"><strong>Content Prioritization Queue</strong><span>Know which pages to update first with AI-ranked recommendations.</span></div>
                    </a>
                    <a className="mega-footer" href="serpely-homepage-v4.html#features">See All Features →</a>
                  </div>
                  <div className="mega-col">
                    <div className="mega-title">Integrations</div>
                    <a className="mega-link simple" href="#">
                      <div className="dd-icon">
                        <svg viewBox="0 0 24 24" className="no-invert" fill="none">
                          <path d="M10 4a6 6 0 0 1 6 6h-6V4z" fill="#EA4335"/>
                          <path d="M16 10a6 6 0 0 1-6 6v-6h6z" fill="#FBBC04"/>
                          <path d="M10 16a6 6 0 0 1-6-6h6v6z" fill="#34A853"/>
                          <path d="M4 10a6 6 0 0 1 6-6v6H4z" fill="#4285F4"/>
                          <circle cx="10" cy="10" r="2" fill="#FFFFFF"/>
                          <path d="M14.5 14.5l5.5 5.5" stroke="#5F6368" strokeWidth="2.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="dd-text"><strong>Google Search Console</strong></div>
                    </a>
                    <a className="mega-link simple" href="#">
                      <div className="dd-icon"><img src="/Other Logos/Logo_Google_Analytics.svg.png" alt="GA4" /></div>
                      <div className="dd-text"><strong>Google Analytics 4</strong></div>
                    </a>
                    <a className="mega-link simple" href="#">
                      <div className="dd-icon"><img src="/Other Logos/dataforseo.webp" alt="DataForSEO" /></div>
                      <div className="dd-text"><strong>DataForSEO</strong></div>
                    </a>
                    <a className="mega-link simple" href="#">
                      <div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M8 12h8"/><path d="M12 8v8"/><path d="M4 12a8 8 0 0 1 8-8"/><path d="M20 12a8 8 0 0 1-8 8"/></svg></div>
                      <div className="dd-text"><strong>OpenAI / LLM Connectors</strong></div>
                    </a>
                    <a className="mega-footer" href="#">All Integrations →</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="nav-item">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
                style={{ color: "var(--text)", background: "var(--bg-subtle)", letterSpacing: "-0.012em" }}
                onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
              >
                Resources
                <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>
              </button>
              <div className="dropdown-menu">
                <a href="serpely-blog.html"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg></div><div className="dd-text">Blog<span>SEO & GEO insights</span></div></a>
                <a href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M8 12l2 2 4-4"/><path d="M4 7h5l2 2h3l2-2h4"/><path d="M4 17h16"/></svg></div><div className="dd-text">Affiliate Program<span>Earn 30% recurring</span></div></a>
                <a href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"/><path d="M12 17h.01"/></svg></div><div className="dd-text">FAQ<span>Common questions answered</span></div></a>
                <a href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg></div><div className="dd-text">Technical Docs<span>API & integration guides</span></div></a>
                <a href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div className="dd-text">Feedback<span>Shape the product</span></div></a>
                <div className="dropdown-divider" />
                <a href="#"><div className="dd-icon"><svg viewBox="0 0 24 24"><path d="M9 3h6"/><path d="M9 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"/><path d="M9 14h6"/><path d="M9 10h6"/></svg></div><div className="dd-text">Terms of Service<span>Legal & privacy</span></div></a>
              </div>
            </div>

            <a href="#" className="btn-audit ml-1">
              <span className="audit-pulse" />
              Free Site Audit
            </a>

            <a
              href="serpely-homepage-v4.html#pricing"
              className="px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
              style={{ color: "var(--text-soft)", letterSpacing: "-0.012em" }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-soft)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              className="theme-toggle"
              id="theme-toggle"
              aria-label="Toggle theme"
              onClick={() => setIsDark((d) => !d)}
            >
              <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <a
              href="#"
              className="hidden sm:block text-[14px] font-semibold transition-colors px-3 py-2"
              style={{ color: "var(--text-soft)", letterSpacing: "-0.012em" }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-soft)"; }}
            >
              Login
            </a>
            <a href="#" className="btn-accent" style={{ padding: "9px 16px", fontSize: "13.5px" }}>
              Start Free Trial
              <ArrowSvg />
            </a>
          </div>
        </div>
      </nav>

      {/* ═══ MAIN ═══ */}
      <main>
        {/* ─── BLOG HERO ─── */}
        <section className="pt-28 lg:pt-32 pb-8 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="blog-hero-wrap">
              {/* Copy */}
              <div className="blog-hero-copy reveal">
                <div className="pill mb-6">
                  <span className="pill-dot" />
                  Serpely Knowledge Hub
                </div>
                <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl mb-6" style={{ fontWeight: 900, lineHeight: 0.96, letterSpacing: "-0.055em" }}>
                  Learn <span className="grad-text">agentic SEO</span> and how search is evolving
                </h1>
                <p className="text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto font-medium mb-8" style={{ color: "var(--text-soft)" }}>
                  SEO, AI search, and generative visibility explained with practical frameworks and insights into how agentic SEO systems discover, evaluate, and cite content.
                </p>
                <a href="#topics" className="hero-learn-link">
                  What is agentic SEO?
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </a>
                <div className="knowledge-search mb-6">
                  <input
                    id="knowledge-search"
                    type="search"
                    placeholder="What will you learn today?"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="search-kbd" type="button" aria-label="Explore knowledge topics" onClick={() => document.getElementById("knowledge-search")?.focus()}>
                    Explore
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                  </button>
                </div>
                <div className="hero-suggestions">
                  <a href="#topics" className="hero-suggestion">Agentic SEO basics</a>
                  <a href="#topics" className="hero-suggestion">GEO vs SEO</a>
                  <a href="#topics" className="hero-suggestion">AI search trends</a>
                </div>
              </div>

              {/* Hero posts rail */}
              <div className="hero-posts-shell reveal" style={{ transitionDelay: "0.12s" }}>
                <div className="hero-posts-controls" aria-label="Featured post carousel controls">
                  <button className="hero-post-nav" type="button" data-hero-scroll="prev" aria-label="Show previous post" disabled={prevDisabled} onClick={() => scrollHeroRail(-1)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3 5 8l5 5"/></svg>
                  </button>
                  <button className="hero-post-nav" type="button" data-hero-scroll="next" aria-label="Show next post" disabled={nextDisabled} onClick={() => scrollHeroRail(1)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m6 3 5 5-5 5"/></svg>
                  </button>
                </div>
                <div className="hero-posts-rail" ref={heroRailRef} aria-label="Latest published posts">
                  {articles.slice(0, 3).map((a, idx) => (
                    <Link key={a.slug} to={`/blog/${a.slug}`} className="card featured-card card-hover hero-post-card" aria-label={a.title}>
                      <div className="featured-visual" style={{
                        backgroundImage: a.coverImage ? `url(${a.coverImage})` : 'none',
                        background: a.coverImage ? undefined : 'linear-gradient(135deg, #071a10 0%, #0d3b26 100%)',
                        backgroundSize: 'cover', backgroundPosition: 'center',
                      }}>
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(0,10,6,0.55) 0%, rgba(0,194,122,0.18) 100%)' }} />
                        <div className="absolute top-6 left-6 flex gap-2">
                          {idx === 0 && <span className="tag tag-accent">Featured</span>}
                          {a.tagLabel && <span className="tag">{a.tagLabel}</span>}
                        </div>
                        <div className="signal-line">
                          <svg viewBox="0 0 420 120" fill="none" aria-hidden="true">
                            <path d="M0 82 C42 74 58 36 94 44 C130 52 126 96 168 90 C214 84 224 26 274 34 C318 41 330 74 360 64 C386 56 396 40 420 36" stroke="rgba(0,194,122,0.22)" strokeWidth="14" strokeLinecap="round"/>
                            <path d="M0 82 C42 74 58 36 94 44 C130 52 126 96 168 90 C214 84 224 26 274 34 C318 41 330 74 360 64 C386 56 396 40 420 36" stroke="#00C27A" strokeWidth="4" strokeLinecap="round"/>
                            <circle cx="274" cy="34" r="7" fill="#00C27A"/>
                          </svg>
                        </div>
                      </div>
                      <div className="p-7 lg:p-8">
                        <div className="flex items-start justify-between gap-5 mb-5">
                          <div>
                            <p className="text-[12px] uppercase tracking-[0.12em] font-black mb-3" style={{ color: "var(--text-faint)" }}>
                              {idx === 0 ? 'Latest analysis' : 'Published recently'}
                            </p>
                            <h2 className="font-display text-3xl lg:text-4xl" style={{ fontWeight: 900, lineHeight: 1.04 }}>{a.title}</h2>
                          </div>
                          <span className="article-arrow"><ArrowSvg /></span>
                        </div>
                        {a.excerpt && <p className="hero-post-summary text-[15px] leading-relaxed font-medium mb-6" style={{ color: "var(--text-soft)" }}>{a.excerpt}</p>}
                        <div className="flex flex-wrap gap-3 text-[13px] font-bold" style={{ color: "var(--text-faint)" }}>
                          {a.date && <span>{a.date}</span>}
                          {a.tagLabel && <span>{a.tagLabel}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── ARTICLES ─── */}
        <section id="topics" className="px-6 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="reveal mb-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.14em] font-black mb-3" style={{ color: "var(--text-faint)" }}>Browse by SEO topic</p>
                  <h2 className="font-display text-3xl lg:text-4xl" style={{ fontWeight: 900 }}>Search growth library</h2>
                </div>
              </div>

              <div className="category-tabs" role="tablist" aria-label="Blog categories">
                {categories.map((c) => (
                  <button
                    key={c.filter}
                    className={`category-btn${activeFilter === c.filter ? " active" : ""}`}
                    data-filter={c.filter}
                    type="button"
                    onClick={() => setActiveFilter(c.filter)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {filteredArticles.map((a, i) => (
                <Link
                  key={i}
                  to={`/blog/${a.slug}`}
                  className="card card-hover article-card reveal"
                  data-category={a.category}
                  style={a.delay ? { transitionDelay: a.delay } : {}}
                >
                  <div className="article-thumb">
                    <span className={`tag${a.tagAccent ? " tag-accent" : ""} thumb-tag`}>{a.tagLabel}</span>
                    {a.coverImage ? (
                      <img src={a.coverImage} alt={a.title} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }} />
                    ) : (
                      <span className="thumb-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                          dangerouslySetInnerHTML={{ __html: a.thumbIconSvg }} />
                      </span>
                    )}
                  </div>
                  <div className="article-body">
                    <h3>{a.title}</h3>
                    <p>{a.excerpt}</p>
                    <div className="article-meta">
                      <div className="article-author">
                        <div className="author-avatar">{a.initials}</div>
                        <div className="author-text">
                          <span className="author-name">{a.author}</span>
                          <span className="article-date">{a.date}</span>
                        </div>
                      </div>
                      <span className="article-arrow"><ArrowSvg /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div
              id="empty-state"
              className={`empty-state mt-6 text-center font-bold${filteredArticles.length === 0 ? " visible" : ""}`}
            >
              No matching SEO resources yet. Try GEO, technical SEO, LLM SEO, keyword research, or reporting.
            </div>
          </div>
        </section>

        {/* ─── RESOURCES ─── */}
        <section className="px-6 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="card p-6 lg:p-8 reveal">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.14em] font-black mb-2" style={{ color: "var(--text-faint)" }}>Popular SEO resources</p>
                  <h2 className="font-display text-2xl lg:text-3xl" style={{ fontWeight: 900 }}>Lead magnets for AI search and website growth.</h2>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 lg:min-w-[650px]">
                  <a href="#" className="resource-chip">
                    <span className="resource-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg></span>
                    <span className="text-[14px] font-black">GEO Checklist</span>
                  </a>
                  <a href="#" className="resource-chip">
                    <span className="resource-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
                    <span className="text-[14px] font-black">AEO Content Brief</span>
                  </a>
                  <a href="#" className="resource-chip">
                    <span className="resource-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-7"/></svg></span>
                    <span className="text-[14px] font-black">Technical SEO Audit</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── NEWSLETTER ─── */}
        <section id="newsletter" className="py-20 px-6 border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="max-w-2xl mx-auto text-center reveal">
            <div className="pill mb-5">
              <span className="pill-dot" />
              Weekly SEO Intel
            </div>
            <h2 className="font-display text-3xl lg:text-4xl mb-3" style={{ fontWeight: 900 }}>Stay ahead of AI search.</h2>
            <p className="mb-8 leading-relaxed font-medium" style={{ color: "var(--text-soft)" }}>
              Get one practical insight every week on Agentic SEO, GEO, and AI visibility.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Enter your work email" className="flex-1 px-4 py-3 rounded-xl text-sm transition-all" />
              <button className="btn-accent whitespace-nowrap" type="submit">
                Get Weekly Insights
                <ArrowSvg />
              </button>
            </form>
            <p className="text-[12px] mt-3 font-semibold" style={{ color: "var(--text-faint)" }}>No spam. Unsubscribe anytime.</p>
          </div>
        </section>
      </main>
    </>
  );
}

