import { useEffect } from 'react';
import { getSEOByKey } from '@/lib/api';

interface Fallback {
  title?: string;
  description?: string;
  noIndex?: boolean;
  canonicalPath?: string;
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

function overrideIconLinks(rel: string, href: string) {
  const existing = document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`);
  existing.forEach((el, idx) => {
    if (idx === 0) {
      el.removeAttribute('sizes');
      el.removeAttribute('type');
      el.href = href;
    } else {
      el.remove();
    }
  });
  if (existing.length === 0) {
    setLink(rel, href);
  }
}

export function useSEOMeta(pageKey: string, fallback?: Fallback) {
  useEffect(() => {
    let cancelled = false;
    const applyFallback = () => {
      const title = fallback?.title || 'Serpely — Agentic SEO for the AI-First Web';
      const desc = fallback?.description || '';
      const canonical = fallback?.canonicalPath
        ? (window.location.origin + fallback.canonicalPath)
        : (window.location.origin + window.location.pathname);

      document.title = title;
      setMeta('description', desc);
      setMeta('og:title', title);
      setMeta('og:description', desc);
      setMeta('og:type', 'website');
      setMeta('og:url', canonical);
      setMeta('twitter:card', 'summary_large_image');
      setMeta('twitter:title', title);
      setMeta('twitter:description', desc);
      setLink('canonical', canonical);
      setMeta('robots', fallback?.noIndex ? 'noindex,nofollow' : 'index,follow');
    };

    applyFallback();

    getSEOByKey(pageKey)
      .then(r => {
        if (cancelled) return;
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

        if (d?.siteName) setMeta('og:site_name', d.siteName);

        if (d?.faviconUrl) {
          overrideIconLinks('icon', d.faviconUrl);
          overrideIconLinks('shortcut icon', d.faviconUrl);
          overrideIconLinks('apple-touch-icon', d.faviconUrl);
        }

        const canonical = d?.canonicalUrl || (fallback?.canonicalPath ? window.location.origin + fallback.canonicalPath : window.location.origin + window.location.pathname);
        setLink('canonical', canonical);
        setMeta('og:url', canonical);

        if (d?.noIndex || fallback?.noIndex) {
          setMeta('robots', 'noindex,nofollow');
        } else {
          setMeta('robots', 'index,follow');
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
        if (!cancelled) applyFallback();
      });

    return () => {
      cancelled = true;
    };
  }, [pageKey, fallback?.title, fallback?.description, fallback?.noIndex, fallback?.canonicalPath]);
}
