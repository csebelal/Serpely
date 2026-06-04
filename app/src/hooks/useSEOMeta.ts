import { useEffect } from 'react';
import { getSEOByKey } from '@/lib/api';

interface Fallback {
  title?: string;
  description?: string;
}

function setMeta(nameOrProp: string, content: string) {
  const isOg = nameOrProp.startsWith('og:') || nameOrProp.startsWith('twitter:');
  const attr = isOg ? 'property' : 'name';
  const sel = isOg ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
  let el = document.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function useSEOMeta(pageKey: string, fallback?: Fallback) {
  useEffect(() => {
    getSEOByKey(pageKey)
      .then(r => {
        const d = r.data;
        const title = d?.metaTitle || fallback?.title || 'Serpely — Agentic SEO for the AI-First Web';
        const desc = d?.metaDescription || fallback?.description || '';

        document.title = title;
        setMeta('description', desc);
        setMeta('og:title', title);
        setMeta('og:description', desc);
        setMeta('og:type', 'website');
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', title);
        setMeta('twitter:description', desc);

        if (d?.ogImage) {
          setMeta('og:image', d.ogImage);
          setMeta('twitter:image', d.ogImage);
        }

        const canonical = d?.canonicalUrl || (window.location.origin + window.location.pathname);
        setLink('canonical', canonical);
        setMeta('og:url', canonical);

        if (d?.noIndex) {
          setMeta('robots', 'noindex,nofollow');
        } else {
          const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
          if (existing) existing.content = 'index,follow';
        }

        // Inject custom JSON-LD from admin if provided
        const prev = document.getElementById('schema-custom-' + pageKey);
        if (prev) prev.remove();
        if (d?.customSchema?.trim()) {
          try {
            JSON.parse(d.customSchema); // validate before injecting
            const s = document.createElement('script');
            s.id = 'schema-custom-' + pageKey;
            s.type = 'application/ld+json';
            s.textContent = d.customSchema;
            document.head.appendChild(s);
          } catch { /* invalid JSON — skip */ }
        }
      })
      .catch(() => {
        if (fallback?.title) document.title = fallback.title;
        else document.title = 'Serpely — Agentic SEO for the AI-First Web';
      });
  }, [pageKey]);
}
